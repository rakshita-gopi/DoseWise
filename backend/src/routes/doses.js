import express from 'express';
import DoseLog from '../models/DoseLog.js';
import Inventory from '../models/Inventory.js';
import { auth } from '../middleware/auth.js';
import { verifyPatientAccess } from '../utils/patientAccess.js';
import { getAdherenceStats } from '../services/inventoryService.js';

const router = express.Router();
router.use(auth);

router.get('/patient/:patientId', async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.patientId, req.user.role);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const logs = await DoseLog.find({ patientId: req.params.patientId })
      .sort({ scheduledAt: -1 })
      .limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/patient/:patientId/adherence', async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.patientId, req.user.role);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const stats = await getAdherenceStats(req.params.patientId, Number(req.query.days) || 30);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const log = await DoseLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Dose log not found' });

    const patient = await verifyPatientAccess(req.user._id, log.patientId, req.user.role);
    if (!patient) return res.status(403).json({ message: 'Access denied' });

    log.status = status;
    if (status === 'taken') {
      log.takenAt = new Date();
      const inventory = await Inventory.findById(log.inventoryId);
      if (inventory && inventory.availableQuantity > 0) {
        inventory.availableQuantity -= 1;
        await inventory.save();
        const io = req.app.get('io');
        io?.to(String(req.user._id)).emit('inventory:update', inventory);
      }
    }

    await log.save();

    const io = req.app.get('io');
    io?.to(String(req.user._id)).emit('dose:updated', log);

    res.json(log);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
