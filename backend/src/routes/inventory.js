import express from 'express';
import Inventory from '../models/Inventory.js';
import { auth } from '../middleware/auth.js';
import { verifyPatientAccess } from '../utils/patientAccess.js';
import {
  getDashboardData,
  createDoseRemindersForToday,
  calcDailyUsage,
  calcExhaustionDate,
  getInventoryStatus,
} from '../services/inventoryService.js';
import { predictRefill } from '../services/aiService.js';
import { LOW_STOCK_DAYS_THRESHOLD } from '../config/constants.js';
import { handleStockStatusChange } from '../services/stockAlertService.js';

const router = express.Router();
router.use(auth);

router.get('/patient/:patientId', async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.patientId, req.user.role);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const inventory = await Inventory.find({ patientId: req.params.patientId }).sort({ medicineName: 1 });
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/patient/:patientId/dashboard', async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.patientId, req.user.role);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const data = await getDashboardData(req.params.patientId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      patientId,
      medicineName,
      strength,
      availableQuantity,
      morning,
      afternoon,
      night,
      foodType,
      batchNumber,
      expiryDate,
      lowStockThreshold,
    } = req.body;

    const patient = await verifyPatientAccess(req.user._id, patientId, req.user.role);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    if (!medicineName?.trim()) return res.status(400).json({ message: 'Medicine name is required' });

    const dailyUsage = calcDailyUsage(morning ?? 0, afternoon ?? 0, night ?? 0);
    const qty = availableQuantity ?? 0;

    const item = await Inventory.create({
      patientId,
      medicineName: medicineName.trim(),
      strength,
      availableQuantity: qty,
      morning: morning ?? 0,
      afternoon: afternoon ?? 0,
      night: night ?? 0,
      dailyUsage,
      foodType: foodType || 'any',
      batchNumber,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      lowStockThreshold: lowStockThreshold ?? LOW_STOCK_DAYS_THRESHOLD,
      exhaustionDate: calcExhaustionDate(qty, dailyUsage),
      status: getInventoryStatus(qty, dailyUsage, expiryDate, lowStockThreshold ?? LOW_STOCK_DAYS_THRESHOLD),
    });

    const io = req.app.get('io');
    await handleStockStatusChange(item, 'active', io);
    io?.to(String(req.user._id)).emit('inventory:update', item);

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/refill-prediction', async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Inventory item not found' });

    const patient = await verifyPatientAccess(req.user._id, item.patientId, req.user.role);
    if (!patient) return res.status(403).json({ message: 'Access denied' });

    const prediction = await predictRefill(item);
    res.json(prediction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Inventory item not found' });

    const patient = await verifyPatientAccess(req.user._id, item.patientId, req.user.role);
    if (!patient) return res.status(403).json({ message: 'Access denied' });

    const allowed = [
      'medicineName', 'strength', 'availableQuantity', 'morning', 'afternoon', 'night',
      'foodType', 'batchNumber', 'expiryDate', 'lowStockThreshold',
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) item[key] = req.body[key];
    }

    const prevStatus = item.status;

    item.dailyUsage = calcDailyUsage(item.morning, item.afternoon, item.night);
    item.exhaustionDate = calcExhaustionDate(item.availableQuantity, item.dailyUsage);
    item.status = getInventoryStatus(
      item.availableQuantity,
      item.dailyUsage,
      item.expiryDate,
      item.lowStockThreshold ?? LOW_STOCK_DAYS_THRESHOLD
    );

    await item.save();

    const io = req.app.get('io');
    await handleStockStatusChange(item, prevStatus, io);
    io?.to(String(req.user._id)).emit('inventory:update', item);

    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Inventory item not found' });

    const patient = await verifyPatientAccess(req.user._id, item.patientId, req.user.role);
    if (!patient) return res.status(403).json({ message: 'Access denied' });

    await item.deleteOne();

    const io = req.app.get('io');
    io?.to(String(req.user._id)).emit('inventory:deleted', { id: req.params.id });

    res.json({ message: 'Medicine removed from inventory' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/patient/:patientId/reminders', async (req, res) => {
  try {
    const patient = await verifyPatientAccess(req.user._id, req.params.patientId, req.user.role);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const reminders = await createDoseRemindersForToday(req.params.patientId);
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
