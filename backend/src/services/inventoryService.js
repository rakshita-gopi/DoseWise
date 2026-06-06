import Inventory from '../models/Inventory.js';
import Notification from '../models/Notification.js';
import DoseLog from '../models/DoseLog.js';
import Patient from '../models/Patient.js';
import { predictRefill } from './aiService.js';

export function calcDailyUsage(morning = 0, afternoon = 0, night = 0) {
  return morning + afternoon + night;
}

export function calcExhaustionDate(quantity, dailyUsage) {
  if (!dailyUsage || dailyUsage <= 0) return null;
  const days = Math.floor(quantity / dailyUsage);
  return new Date(Date.now() + days * 86400000);
}

export function getInventoryStatus(quantity, dailyUsage, expiryDate, thresholdDays = 7) {
  if (expiryDate && new Date(expiryDate) < new Date()) return 'expired';
  if (quantity <= 0) return 'out_of_stock';
  if (dailyUsage > 0) {
    const daysLeft = quantity / dailyUsage;
    if (daysLeft <= thresholdDays) return 'low_stock';
  }
  return 'active';
}

export async function syncInventoryFromPrescription(patientId, prescription) {
  const results = [];

  for (const med of prescription.medicines) {
    const dailyUsage = calcDailyUsage(med.morning, med.afternoon, med.night);

    let item = await Inventory.findOne({
      patientId,
      medicineName: new RegExp(`^${med.medicineName}$`, 'i'),
    });

    if (item) {
      item.morning = med.morning;
      item.afternoon = med.afternoon;
      item.night = med.night;
      item.dailyUsage = dailyUsage;
      item.foodType = med.foodType;
      item.strength = med.strength;
      item.prescriptionId = prescription._id;
      item.exhaustionDate = calcExhaustionDate(item.availableQuantity, dailyUsage);
      item.status = getInventoryStatus(item.availableQuantity, dailyUsage, item.expiryDate);
    } else {
      item = await Inventory.create({
        patientId,
        prescriptionId: prescription._id,
        medicineName: med.medicineName,
        strength: med.strength,
        morning: med.morning,
        afternoon: med.afternoon,
        night: med.night,
        dailyUsage,
        foodType: med.foodType,
        availableQuantity: 0,
        exhaustionDate: null,
        status: 'out_of_stock',
      });
      item.afternoon = med.afternoon;
      await item.save();
    }

    results.push(item);
  }

  return results;
}

export async function updateInventoryFromPurchase(patientId, purchase) {
  const results = [];

  for (const purchaseItem of purchase.items) {
    let item = await Inventory.findOne({
      patientId,
      medicineName: new RegExp(`^${purchaseItem.medicineName}$`, 'i'),
    });

    if (item) {
      item.availableQuantity += purchaseItem.quantity;
      if (purchaseItem.expiryDate) item.expiryDate = purchaseItem.expiryDate;
      if (purchaseItem.batchNumber) item.batchNumber = purchaseItem.batchNumber;
      if (purchaseItem.strength) item.strength = purchaseItem.strength;
    } else {
      item = await Inventory.create({
        patientId,
        medicineName: purchaseItem.medicineName,
        strength: purchaseItem.strength,
        availableQuantity: purchaseItem.quantity,
        dailyUsage: 0,
        batchNumber: purchaseItem.batchNumber,
        expiryDate: purchaseItem.expiryDate,
        status: 'active',
      });
    }

    item.exhaustionDate = calcExhaustionDate(item.availableQuantity, item.dailyUsage);
    item.status = getInventoryStatus(
      item.availableQuantity,
      item.dailyUsage,
      item.expiryDate,
      item.lowStockThreshold
    );
    await item.save();
    results.push(item);
  }

  return results;
}

export async function runDailyConsumption(io) {
  const items = await Inventory.find({ dailyUsage: { $gt: 0 }, availableQuantity: { $gt: 0 } });

  for (const item of items) {
    item.availableQuantity = Math.max(0, item.availableQuantity - item.dailyUsage);
    item.exhaustionDate = calcExhaustionDate(item.availableQuantity, item.dailyUsage);
    const prevStatus = item.status;
    item.status = getInventoryStatus(
      item.availableQuantity,
      item.dailyUsage,
      item.expiryDate,
      item.lowStockThreshold
    );
    await item.save();

    const patient = await Patient.findById(item.patientId);
    if (!patient) continue;

    const userId = patient.userId;
    const daysLeft = item.dailyUsage > 0 ? Math.floor(item.availableQuantity / item.dailyUsage) : 0;

    if (item.status === 'low_stock' && prevStatus !== 'low_stock') {
      const notification = await Notification.create({
        userId,
        patientId: item.patientId,
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `Your ${item.medicineName} stock will last only ${daysLeft} more days. Please purchase a refill.`,
        metadata: { inventoryId: item._id, daysLeft },
      });

      io?.to(String(userId)).emit('notification', notification);
    }

    if (item.availableQuantity === 0 && prevStatus !== 'out_of_stock') {
      const notification = await Notification.create({
        userId,
        patientId: item.patientId,
        type: 'refill_reminder',
        title: 'Out of Stock',
        message: `${item.medicineName} is out of stock. Please refill immediately.`,
        metadata: { inventoryId: item._id },
      });

      io?.to(String(userId)).emit('notification', notification);
    }

    io?.to(String(userId)).emit('inventory:update', item);
  }
}

export async function getAdherenceStats(patientId, days = 30) {
  const since = new Date(Date.now() - days * 86400000);
  const logs = await DoseLog.find({ patientId, scheduledAt: { $gte: since } });

  const total = logs.length;
  const taken = logs.filter((l) => l.status === 'taken').length;
  const missed = logs.filter((l) => l.status === 'missed').length;
  const skipped = logs.filter((l) => l.status === 'skipped').length;

  return {
    total,
    taken,
    missed,
    skipped,
    adherenceRate: total > 0 ? Math.round((taken / total) * 100) : 100,
  };
}

export async function getDashboardData(patientId) {
  const [inventory, adherence, patient] = await Promise.all([
    Inventory.find({ patientId }).sort({ status: 1 }),
    getAdherenceStats(patientId),
    Patient.findById(patientId),
  ]);

  const lowStock = inventory.filter((i) => i.status === 'low_stock' || i.status === 'out_of_stock');
  const predictions = await Promise.all(inventory.map((i) => predictRefill(i)));

  return {
    patient,
    inventory,
    lowStock,
    adherence,
    predictions: inventory.map((item, idx) => ({
      medicineName: item.medicineName,
      ...predictions[idx],
    })),
    summary: {
      totalMedicines: inventory.length,
      activeMedicines: inventory.filter((i) => i.status === 'active').length,
      lowStockCount: lowStock.length,
      adherenceRate: adherence.adherenceRate,
    },
  };
}

export async function createDoseRemindersForToday(patientId) {
  const items = await Inventory.find({ patientId, dailyUsage: { $gt: 0 } });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const slots = [];

  for (const item of items) {
    const times = [
      { slot: 'morning', count: item.morning },
      { slot: 'afternoon', count: item.afternoon },
      { slot: 'night', count: item.night },
    ];

    for (const { slot, count } of times) {
      for (let i = 0; i < count; i++) {
        const existing = await DoseLog.findOne({
          patientId,
          inventoryId: item._id,
          scheduledTime: slot,
          scheduledAt: { $gte: today, $lt: new Date(today.getTime() + 86400000) },
        });

        if (!existing) {
          slots.push({
            patientId,
            inventoryId: item._id,
            medicineName: item.medicineName,
            scheduledTime: slot,
            scheduledAt: today,
            status: 'pending',
          });
        }
      }
    }
  }

  if (slots.length) {
    await DoseLog.insertMany(slots);
  }

  return DoseLog.find({
    patientId,
    scheduledAt: { $gte: today },
    status: 'pending',
  }).populate('inventoryId');
}
