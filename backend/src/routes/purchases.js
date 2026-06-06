import express from 'express';
import Purchase from '../models/Purchase.js';
import { auth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { verifyPatientAccess } from '../utils/patientAccess.js';
import { parseBillInput } from '../services/aiService.js';
import { resolveUploadInput } from '../services/fileExtractionService.js';
import { updateInventoryFromPurchase } from '../services/inventoryService.js';

const router = express.Router();
router.use(auth);

router.get('/patient/:patientId', async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.patientId, req.user.role);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const purchases = await Purchase.find({ patientId: req.params.patientId }).sort({ purchaseDate: -1 });
    res.json(purchases);
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
    let input;

    try {
      input = await resolveUploadInput({ rawText, manualEntry, file: req.file });
      extracted = await parseBillInput(input);
    } catch (aiErr) {
      return res.status(422).json({ message: `AI parsing failed: ${aiErr.message}` });
    }

    const purchase = await Purchase.create({
      patientId,
      billFile: req.file ? `/uploads/${req.file.filename}` : undefined,
      pharmacy: extracted.pharmacy,
      purchaseDate: extracted.purchaseDate ? new Date(extracted.purchaseDate) : new Date(),
      items: extracted.items,
      totalAmount: extracted.totalAmount,
      aiExtracted: true,
    });

    const io = req.app.get('io');
    const inventory = await updateInventoryFromPurchase(patientId, purchase, io);
    io?.to(String(req.user._id)).emit('purchase:processed', { purchase, inventory });

    res.status(201).json({ purchase, inventory });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });

    const patient = await verifyPatientAccess(req.user._id, purchase.patientId, req.user.role);
    if (!patient) return res.status(403).json({ message: 'Access denied' });

    await purchase.deleteOne();
    res.json({ message: 'Purchase record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
