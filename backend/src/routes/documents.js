import express from 'express';
import Document from '../models/Document.js';
import { auth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { verifyPatientAccess } from '../utils/patientAccess.js';

const router = express.Router();
router.use(auth);

router.get('/patient/:patientId', async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.patientId, req.user.role);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const documents = await Document.find({ patientId: req.params.patientId }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { patientId, title, category, notes } = req.body;
    if (!req.file) return res.status(400).json({ message: 'File is required' });

    const patient = await verifyPatientAccess(req.user._id, patientId, req.user.role);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const doc = await Document.create({
      patientId,
      title: title || req.file.originalname,
      category: category || 'other',
      filePath: `/uploads/${req.file.filename}`,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      notes,
    });

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const patient = await verifyPatientAccess(req.user._id, doc.patientId, req.user.role);
    if (!patient) return res.status(403).json({ message: 'Access denied' });

    await doc.deleteOne();
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
