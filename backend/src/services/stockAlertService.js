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

function formatTabletDetail(item) {
  const name = item.medicineName;
  return item.strength ? `${name} (${item.strength})` : name;
}

function formatDosageSchedule(item) {
  const parts = [];
  if (item.morning) parts.push(`${item.morning} morning`);
  if (item.afternoon) parts.push(`${item.afternoon} afternoon`);
  if (item.night) parts.push(`${item.night} night`);
  return parts.length ? parts.join(', ') : null;
}

function isCaregiverContext(user, patient) {
  return user?.role === 'caregiver' || (patient.relationship && !['self', 'caregiver'].includes(patient.relationship));
}

function buildLowStockAlert(patient, item, user) {
  const tablet = formatTabletDetail(item);
  const left = daysLeft(item);
  const qty = item.availableQuantity ?? 0;
  const schedule = formatDosageSchedule(item);
  const caregiverCtx = isCaregiverContext(user, patient);

  const detail = schedule
    ? `${tablet} — ${qty} tablets left, ~${left} day(s) remaining. Dosage: ${schedule}.`
    : `${tablet} — ${qty} tablets left, ~${left} day(s) remaining.`;

  const message = caregiverCtx
    ? `${patient.name}: ${detail} Please purchase a refill.`
    : `${detail} Please purchase a refill.`;

  const smsBody = caregiverCtx
    ? `DoseWise Alert — Patient: ${patient.name}\nMedicine: ${tablet}\nStock: ${qty} tablets (~${left} day(s) left)\n${schedule ? `Dosage: ${schedule}\n` : ''}Please refill soon.`
    : `DoseWise Alert: ${tablet} — ${qty} tablets (~${left} day(s) left). Please refill soon.`;

  return {
    title: caregiverCtx ? `Low Stock — ${patient.name}` : 'Low Stock Alert',
    message,
    smsBody,
    metadata: {
      inventoryId: item._id,
      patientName: patient.name,
      medicineName: item.medicineName,
      strength: item.strength,
      availableQuantity: qty,
      daysLeft: left,
      schedule,
    },
  };
}

function buildOutOfStockAlert(patient, item, user) {
  const tablet = formatTabletDetail(item);
  const schedule = formatDosageSchedule(item);
  const caregiverCtx = isCaregiverContext(user, patient);

  const detail = schedule
    ? `${tablet} is OUT OF STOCK (0 tablets). Dosage: ${schedule}.`
    : `${tablet} is OUT OF STOCK (0 tablets).`;

  const message = caregiverCtx
    ? `${patient.name}: ${detail} Please refill immediately.`
    : `${detail} Please refill immediately.`;

  const smsBody = caregiverCtx
    ? `DoseWise URGENT — Patient: ${patient.name}\nMedicine: ${tablet}\nStatus: OUT OF STOCK (0 tablets)\n${schedule ? `Dosage: ${schedule}\n` : ''}Please refill immediately.`
    : `DoseWise URGENT: ${tablet} is OUT OF STOCK. Please refill immediately.`;

  return {
    title: caregiverCtx ? `Out of Stock — ${patient.name}` : 'Out of Stock',
    message,
    smsBody,
    metadata: {
      inventoryId: item._id,
      patientName: patient.name,
      medicineName: item.medicineName,
      strength: item.strength,
      availableQuantity: 0,
      schedule,
    },
  };
}

function formatReportLine(patient, item, user) {
  const tablet = formatTabletDetail(item);
  const caregiverCtx = isCaregiverContext(user, patient);
  const prefix = caregiverCtx ? `${patient.name} — ` : '';

  if (item.status === 'out_of_stock') {
    return `${prefix}${tablet}: OUT OF STOCK (0 tablets)`;
  }
  return `${prefix}${tablet}: ${item.availableQuantity} tablets, ~${daysLeft(item)} day(s) left`;
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

  if (item.status === 'low_stock' && prevStatus !== 'low_stock') {
    const alert = buildLowStockAlert(patient, item, user);
    await createAndEmitAlert({
      userId: patient.userId,
      patientId: item.patientId,
      type: 'low_stock',
      title: alert.title,
      message: alert.message,
      metadata: { ...alert.metadata, smsPhone: phone },
      io,
      phone,
      smsBody: alert.smsBody,
    });
  }

  if (item.status === 'out_of_stock' && prevStatus !== 'out_of_stock') {
    const alert = buildOutOfStockAlert(patient, item, user);
    await createAndEmitAlert({
      userId: patient.userId,
      patientId: item.patientId,
      type: 'out_of_stock',
      title: alert.title,
      message: alert.message,
      metadata: { ...alert.metadata, smsPhone: phone },
      io,
      phone,
      smsBody: alert.smsBody,
    });
  }
}

export async function runDailyStockReport(io) {
  const patients = await Patient.find({});

  for (const patient of patients) {
    const items = await Inventory.find({
      patientId: patient._id,
      status: { $in: ['low_stock', 'out_of_stock'] },
    }).sort({ status: -1, medicineName: 1 });

    if (!items.length) continue;

    const user = await User.findById(patient.userId);
    const phone = resolveNotificationPhone(user, patient);
    const caregiverCtx = isCaregiverContext(user, patient);

    const outOfStock = items.filter((i) => i.status === 'out_of_stock');
    const lowStock = items.filter((i) => i.status === 'low_stock');

    const lines = items.map((i) => formatReportLine(patient, i, user));
    const reportMessage = lines.join('; ');

    let smsBody = caregiverCtx
      ? `DoseWise Stock Alert — ${patient.name}\n`
      : `DoseWise Stock Report:\n`;

    if (outOfStock.length) {
      smsBody += `OUT OF STOCK:\n${outOfStock.map((i) => `• ${formatTabletDetail(i)} (0 tablets)`).join('\n')}\n`;
    }
    if (lowStock.length) {
      smsBody += `LOW STOCK:\n${lowStock.map((i) => `• ${formatTabletDetail(i)} — ${i.availableQuantity} tablets, ~${daysLeft(i)} day(s)`).join('\n')}\n`;
    }
    smsBody += 'Please refill soon.';

    await createAndEmitAlert({
      userId: patient.userId,
      patientId: patient._id,
      type: 'stock_report',
      title: caregiverCtx ? `Stock Alert — ${patient.name}` : 'Daily Stock Report',
      message: reportMessage,
      metadata: {
        patientName: patient.name,
        itemCount: items.length,
        outOfStock: outOfStock.map((i) => ({
          medicineName: i.medicineName,
          strength: i.strength,
          availableQuantity: i.availableQuantity,
        })),
        lowStock: lowStock.map((i) => ({
          medicineName: i.medicineName,
          strength: i.strength,
          availableQuantity: i.availableQuantity,
          daysLeft: daysLeft(i),
        })),
        items: items.map((i) => i._id),
        smsPhone: phone,
      },
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

  const user = patient ? await User.findById(patient.userId).select('phone name role') : null;
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
