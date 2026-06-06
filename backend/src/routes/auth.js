import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      password: hashed,
      role: role || 'patient',
    });

    const patient = await Patient.create({
      userId: user._id,
      name,
      isPrimary: true,
      relationship: (role || 'patient') === 'caregiver' ? 'caregiver' : 'self',
    });

    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
      primaryPatientId: patient._id,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const primaryPatient = await Patient.findOne({ userId: user._id, isPrimary: true });
    const token = signToken(user);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
      primaryPatientId: primaryPatient?._id,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/profile', auth, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (name?.trim()) req.user.name = name.trim();
    if (phone !== undefined) req.user.phone = phone?.trim() || undefined;
    await req.user.save();

    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const primaryPatient = await Patient.findOne({ userId: req.user._id, isPrimary: true });
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
      },
      primaryPatientId: primaryPatient?._id,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
