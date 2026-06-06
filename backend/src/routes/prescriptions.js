import express from 'express';
import Prescription from '../models/Prescription.js';
import Inventory from '../models/Inventory.js';
import { auth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { verifyPatientAccess } from '../utils/patientAccess.js';
import { parsePrescriptionInput, checkDrugInteractions } from '../services/aiService.js';
import { resolveUploadInput } from '../services/fileExtractionService.js';
import { syncInventoryFromPrescription } from '../services/inventoryService.js';
import Notification from '../models/Notification.js';

const router = express.Router();
router.use(auth);

async function verifyPrescriptionAccess(userId, prescriptionId, role) {
  const prescription = await Prescription.findById(prescriptionId);
  if (!prescription) return null;
  const patient = await verifyPatientAccess(userId, prescription.patientId, role);
  if (!patient) return null;
  return prescription;
}

router.get('/patient/:patientId', async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.patientId, req.user.role);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const prescriptions = await Prescription.find({ patientId: req.params.patientId }).sort({ createdAt: -1 });
    res.json(prescriptions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/parse', upload.single('file'), async (req, res) => {
  try {
    const { patientId, rawText, manualEntry } = req.body;

    const patient = await verifyPatientAccess(req.user._id, patientId, req.user.role);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const input = await resolveUploadInput({ rawText, manualEntry, file: req.file });
    const extracted = await parsePrescriptionInput(input);

    const existingMeds = await Inventory.find({ patientId }).distinct('medicineName');
    const newMeds = extracted.medicines.map((m) => m.medicineName);
    const interactions = await checkDrugInteractions(existingMeds, newMeds);

    res.json({
      extracted,
      interactions,
      uploadedFile: req.file ? `/uploads/${req.file.filename}` : undefined,
      source: input.source,
    });
  } catch (err) {
    res.status(422).json({ message: `AI parsing failed: ${err.message}` });
  }
});

router.post('/save', async (req, res) => {
  try {
    const {
      patientId,
      title,
      doctorName,
      hospital,
      prescribedDate,
      nextReviewDate,
      uploadedFile,
      rawText,
      medicines,
      aiExtracted,
      syncInventory,
    } = req.body;

    const patient = await verifyPatientAccess(req.user._id, patientId, req.user.role);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    if (!title?.trim()) return res.status(400).json({ message: 'Prescription name is required' });
    if (!medicines?.length) return res.status(400).json({ message: 'At least one medicine is required' });

    const existingMeds = await Inventory.find({ patientId }).distinct('medicineName');
    const newMeds = medicines.map((m) => m.medicineName);
    const interactions = await checkDrugInteractions(existingMeds, newMeds);

    if (interactions?.hasInteractions) {
      await Notification.create({
        userId: req.user._id,
        patientId,
        type: 'drug_interaction',
        title: 'Drug Interaction Warning',
        message: interactions.summary,
        metadata: interactions,
      });
    }

    const prescription = await Prescription.create({
      patientId,
      title: title.trim(),
      doctorName,
      hospital,
      prescribedDate: prescribedDate ? new Date(prescribedDate) : new Date(),
      nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : undefined,
      uploadedFile,
      rawText,
      medicines,
      status: 'processed',
      aiExtracted: !!aiExtracted,
      expiresAt: nextReviewDate ? new Date(nextReviewDate) : undefined,
    });

    if (syncInventory !== false) {
      await syncInventoryFromPrescription(patientId, prescription);
    }

    const io = req.app.get('io');
    io?.to(String(req.user._id)).emit('prescription:processed', prescription);

    res.status(201).json({ prescription, interactions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { patientId, rawText, manualEntry, title } = req.body;

    const patient = await verifyPatientAccess(req.user._id, patientId, req.user.role);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const input = await resolveUploadInput({ rawText, manualEntry, file: req.file });
    const extracted = await parsePrescriptionInput(input);
    const textInput = input.text || `[Extracted from ${input.source || 'uploaded file'}]`;

    const existingMeds = await Inventory.find({ patientId }).distinct('medicineName');
    const newMeds = extracted.medicines.map((m) => m.medicineName);
    const interactions = await checkDrugInteractions(existingMeds, newMeds);

    if (interactions?.hasInteractions) {
      await Notification.create({
        userId: req.user._id,
        patientId,
        type: 'drug_interaction',
        title: 'Drug Interaction Warning',
        message: interactions.summary,
        metadata: interactions,
      });
    }

    const prescription = await Prescription.create({
      patientId,
      title: title?.trim() || `Prescription — ${new Date().toLocaleDateString('en-IN')}`,
      doctorName: extracted.doctorName,
      hospital: extracted.hospital,
      prescribedDate: extracted.prescribedDate ? new Date(extracted.prescribedDate) : new Date(),
      nextReviewDate: extracted.nextReviewDate ? new Date(extracted.nextReviewDate) : undefined,
      uploadedFile: req.file ? `/uploads/${req.file.filename}` : undefined,
      rawText: textInput,
      medicines: extracted.medicines,
      status: 'processed',
      aiExtracted: true,
      expiresAt: extracted.nextReviewDate ? new Date(extracted.nextReviewDate) : undefined,
    });

    await syncInventoryFromPrescription(patientId, prescription);

    const io = req.app.get('io');
    io?.to(String(req.user._id)).emit('prescription:processed', prescription);

    res.status(201).json({ prescription, interactions });
  } catch (err) {
    res.status(422).json({ message: err.message?.includes('AI parsing') ? err.message : `AI parsing failed: ${err.message}` });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const prescription = await verifyPrescriptionAccess(req.user._id, req.params.id, req.user.role);
    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });

    const { title, doctorName, hospital, prescribedDate, nextReviewDate, medicines, syncInventory } = req.body;

    if (title !== undefined) prescription.title = title;
    if (doctorName !== undefined) prescription.doctorName = doctorName;
    if (hospital !== undefined) prescription.hospital = hospital;
    if (prescribedDate !== undefined) prescription.prescribedDate = prescribedDate ? new Date(prescribedDate) : undefined;
    if (nextReviewDate !== undefined) {
      prescription.nextReviewDate = nextReviewDate ? new Date(nextReviewDate) : undefined;
      prescription.expiresAt = nextReviewDate ? new Date(nextReviewDate) : undefined;
    }
    if (medicines !== undefined) prescription.medicines = medicines;

    await prescription.save();

    if (syncInventory !== false && medicines?.length) {
      await syncInventoryFromPrescription(prescription.patientId, prescription);
    }

    res.json(prescription);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const prescription = await verifyPrescriptionAccess(req.user._id, req.params.id, req.user.role);
    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });

    await prescription.deleteOne();
    res.json({ message: 'Prescription deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const prescription = await verifyPrescriptionAccess(req.user._id, req.params.id, req.user.role);
    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });

    res.json(prescription);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
