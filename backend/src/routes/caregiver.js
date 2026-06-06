import express from 'express';
import Patient from '../models/Patient.js';
import Inventory from '../models/Inventory.js';
import DoseLog from '../models/DoseLog.js';
import Prescription from '../models/Prescription.js';
import { auth, authorize } from '../middleware/auth.js';
import { getAdherenceStats } from '../services/inventoryService.js';

const router = express.Router();
router.use(auth);
router.use(authorize('caregiver', 'doctor', 'admin'));

router.get('/patients', async (req, res) => {
  try {
    const patients = await Patient.find({
      $or: [{ ownerId: req.user._id }, { userId: req.user._id }],
    }).populate('userId', 'name email phone');

    const enriched = await Promise.all(
      patients.map(async (p) => {
        const [inventory, adherence, recentDoses] = await Promise.all([
          Inventory.find({ patientId: p._id }),
          getAdherenceStats(p._id),
          DoseLog.find({ patientId: p._id }).sort({ updatedAt: -1 }).limit(5),
        ]);

        return {
          ...p.toObject(),
          inventorySummary: {
            total: inventory.length,
            lowStock: inventory.filter((i) => i.status === 'low_stock' || i.status === 'out_of_stock').length,
          },
          adherence,
          recentDoses,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/patient/:patientId', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patientId);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const [inventory, adherence, prescriptions, doses] = await Promise.all([
      Inventory.find({ patientId: patient._id }),
      getAdherenceStats(patient._id),
      Prescription.find({ patientId: patient._id }).sort({ createdAt: -1 }).limit(5),
      DoseLog.find({ patientId: patient._id }).sort({ scheduledAt: -1 }).limit(20),
    ]);

    res.json({ patient, inventory, adherence, prescriptions, doses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
