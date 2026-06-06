import express from 'express';
import ChatMessage from '../models/ChatMessage.js';
import Inventory from '../models/Inventory.js';
import { auth } from '../middleware/auth.js';
import { verifyPatientAccess } from '../utils/patientAccess.js';
import { healthAssistantChat } from '../services/aiService.js';
import { getAdherenceStats } from '../services/inventoryService.js';

const router = express.Router();
router.use(auth);

router.get('/history', async (req, res) => {
  try {
    const messages = await ChatMessage.find({ userId: req.user._id })
      .sort({ createdAt: 1 })
      .limit(50);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/message', async (req, res) => {
  try {
    const { message, patientId } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });

    let patient = null;
    let context = {};

    if (patientId) {
      patient = await verifyPatientAccess(req.user._id, patientId, req.user.role);
      if (!patient) return res.status(404).json({ message: 'Patient not found' });

      const [inventory, adherence] = await Promise.all([
        Inventory.find({ patientId }),
        getAdherenceStats(patientId),
      ]);

      context = {
        patientName: patient.name,
        medicalConditions: patient.medicalConditions,
        allergies: patient.allergies,
        medicines: inventory.map((i) => ({
          name: i.medicineName,
          strength: i.strength,
          schedule: { morning: i.morning, afternoon: i.afternoon, night: i.night },
          foodType: i.foodType,
        })),
        inventory: inventory.map((i) => ({
          name: i.medicineName,
          quantity: i.availableQuantity,
          daysLeft: i.dailyUsage > 0 ? Math.floor(i.availableQuantity / i.dailyUsage) : null,
        })),
        adherenceRate: adherence.adherenceRate,
      };
    }

    await ChatMessage.create({
      userId: req.user._id,
      patientId,
      role: 'user',
      content: message,
    });

    const reply = await healthAssistantChat(message, context);

    const assistantMsg = await ChatMessage.create({
      userId: req.user._id,
      patientId,
      role: 'assistant',
      content: reply,
    });

    res.json({ reply: assistantMsg });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
