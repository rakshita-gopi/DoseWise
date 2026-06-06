import express from 'express';
import Prescription from '../models/Prescription.js';
import Inventory from '../models/Inventory.js';
import { auth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { verifyPatientAccess } from '../utils/patientAccess.js';
import { parsePrescription, checkDrugInteractions } from '../services/aiService.js';
import { syncInventoryFromPrescription } from '../services/inventoryService.js';
import Notification from '../models/Notification.js';

const router = express.Router();
router.use(auth);

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

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { patientId, rawText, manualEntry } = req.body;

    const patient = await verifyPatientAccess(req.user._id, patientId, req.user.role);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    let extracted;
    const textInput = rawText || manualEntry || 'Sample prescription with medicines listed';

    try {
      extracted = await parsePrescription(textInput);
    } catch (aiErr) {
      return res.status(422).json({ message: `AI parsing failed: ${aiErr.message}` });
    }

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
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return res.status(404).json({ message: 'Prescription not found' });

    const patient = await verifyPatientAccess(req.user._id, prescription.patientId, req.user.role);
    if (!patient) return res.status(403).json({ message: 'Access denied' });

    res.json(prescription);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
