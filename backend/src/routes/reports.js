import express from 'express';
import { auth } from '../middleware/auth.js';
import { verifyPatientAccess } from '../utils/patientAccess.js';
import { getStockReport } from '../services/stockAlertService.js';

const router = express.Router();
router.use(auth);

router.get('/stock/:patientId', async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.patientId, req.user.role);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const report = await getStockReport(req.params.patientId);
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
