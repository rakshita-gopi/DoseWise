import express from 'express';
import Patient from '../models/Patient.js';
import { auth } from '../middleware/auth.js';
import { getAccessiblePatients, verifyPatientAccess } from '../utils/patientAccess.js';

const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const patients = await getAccessiblePatients(req.user._id, req.user.role);
    res.json(patients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const isCaregiver = req.user.role === 'caregiver';
    const patient = await Patient.create({
      ...req.body,
      userId: req.user._id,
      ownerId: isCaregiver || (req.body.relationship && req.body.relationship !== 'self') ? req.user._id : undefined,
      isPrimary: false,
    });
    res.status(201).json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.id, req.user.role);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.id, req.user.role);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    Object.assign(patient, req.body);
    await patient.save();
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.id, req.user.role);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    if (patient.isPrimary) return res.status(400).json({ message: 'Cannot delete primary profile' });

    await patient.deleteOne();
    res.json({ message: 'Profile deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
