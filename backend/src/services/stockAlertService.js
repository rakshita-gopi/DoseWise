import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Notification from '../models/Notification.js';
import Inventory from '../models/Inventory.js';
import { sendSms, resolveNotificationPhone } from './smsService.js';
import { getInventoryStatus, calcExhaustionDate } from './inventoryCalc.js';
import { LOW_STOCK_DAYS_THRESHOLD } from '../config/constants.js';

function daysLeft(item) {
  return item.dailyUsage > 0 ? Math.floor(item.availableQuantity / item.dailyUsage) : 0;
}

async function createAndEmitAlert({ userId, patientId, type, title, message, metadata, io, phone, smsBody }) {
  const notification = await Notification.create({
    userId,
    patientId,
    type,
    title,
    message,
    metadata,
  });

  io?.to(String(userId)).emit('notification', notification);

  if (phone && smsBody) {
    await sendSms(phone, smsBody);
  }

  return notification;
}

export async function handleStockStatusChange(item, prevStatus, io) {
  const patient = await Patient.findById(item.patientId);
  if (!patient) return;

  const user = await User.findById(patient.userId);
  const phone = resolveNotificationPhone(user, patient);
  const left = daysLeft(item);

  if (item.status === 'low_stock' && prevStatus !== 'low_stock') {
    const smsBody = `DoseWise Alert: ${patient.name}'s ${item.medicineName} will last only ${left} day(s). Please purchase a refill.`;
    await createAndEmitAlert({
      userId: patient.userId,
      patientId: item.patientId,
      type: 'low_stock',
      title: 'Low Stock Alert',
      message: `${item.medicineName} stock will last only ${left} more day(s). Please purchase a refill.`,
      metadata: { inventoryId: item._id, daysLeft: left, smsPhone: phone },
      io,
      phone,
      smsBody,
    });
  }

  if (item.status === 'out_of_stock' && prevStatus !== 'out_of_stock') {
    const smsBody = `DoseWise URGENT: ${patient.name}'s ${item.medicineName} is OUT OF STOCK. Please refill immediately.`;
    await createAndEmitAlert({
      userId: patient.userId,
      patientId: item.patientId,
      type: 'out_of_stock',
      title: 'Out of Stock',
      message: `${item.medicineName} is out of stock. Please refill immediately.`,
      metadata: { inventoryId: item._id, smsPhone: phone },
      io,
      phone,
      smsBody,
    });
  }
}

export async function runDailyStockReport(io) {
  const patients = await Patient.find({});

  for (const patient of patients) {
    const items = await Inventory.find({
      patientId: patient._id,
      status: { $in: ['low_stock', 'out_of_stock'] },
    }).sort({ medicineName: 1 });

    if (!items.length) continue;

    const user = await User.findById(patient.userId);
    const phone = resolveNotificationPhone(user, patient);

    const lines = items.map((i) => {
      if (i.status === 'out_of_stock') return `${i.medicineName}: OUT OF STOCK`;
      return `${i.medicineName}: ${daysLeft(i)} day(s) left`;
    });

    const reportMessage = lines.join('; ');
    const smsBody = `DoseWise Stock Report for ${patient.name}:\n${lines.join('\n')}\nPlease refill soon.`;

    await createAndEmitAlert({
      userId: patient.userId,
      patientId: patient._id,
      type: 'stock_report',
      title: 'Daily Stock Report',
      message: reportMessage,
      metadata: { itemCount: items.length, items: items.map((i) => i._id), smsPhone: phone },
      io,
      phone,
      smsBody,
    });
  }
}

export async function migrateLowStockThresholds() {
  const items = await Inventory.find({
    $or: [{ lowStockThreshold: 7 }, { lowStockThreshold: { $exists: false } }],
  });

  for (const item of items) {
    item.lowStockThreshold = LOW_STOCK_DAYS_THRESHOLD;
    item.exhaustionDate = calcExhaustionDate(item.availableQuantity, item.dailyUsage);
    item.status = getInventoryStatus(
      item.availableQuantity,
      item.dailyUsage,
      item.expiryDate,
      item.lowStockThreshold
    );
    await item.save();
  }

  if (items.length) {
    console.log(`[Inventory] Migrated ${items.length} items to ${LOW_STOCK_DAYS_THRESHOLD}-day low stock threshold`);
  }
}

export async function getStockReport(patientId) {
  const [patient, inventory, alertHistory] = await Promise.all([
    Patient.findById(patientId),
    Inventory.find({ patientId }).sort({ status: 1, medicineName: 1 }),
    Notification.find({
      patientId,
      type: { $in: ['low_stock', 'out_of_stock', 'refill_reminder', 'stock_report'] },
    })
      .sort({ createdAt: -1 })
      .limit(30),
  ]);

  const user = patient ? await User.findById(patient.userId).select('phone name') : null;
  const notifyPhone = resolveNotificationPhone(user, patient);

  const withDays = inventory.map((item) => ({
    ...item.toObject(),
    daysRemaining: daysLeft(item),
  }));

  return {
    generatedAt: new Date().toISOString(),
    patient: patient ? { _id: patient._id, name: patient.name } : null,
    notifyPhone,
    summary: {
      total: inventory.length,
      lowStock: inventory.filter((i) => i.status === 'low_stock').length,
      outOfStock: inventory.filter((i) => i.status === 'out_of_stock').length,
      active: inventory.filter((i) => i.status === 'active').length,
      expired: inventory.filter((i) => i.status === 'expired').length,
    },
    lowStock: withDays.filter((i) => i.status === 'low_stock'),
    outOfStock: withDays.filter((i) => i.status === 'out_of_stock'),
    allItems: withDays,
    alertHistory,
  };
}
