import cron from 'node-cron';
import Prescription from '../models/Prescription.js';
import Notification from '../models/Notification.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import { runDailyConsumption } from './inventoryService.js';
import { runDailyStockReport, migrateLowStockThresholds } from './stockAlertService.js';

export async function startCronJobs(io) {
  try {
    await migrateLowStockThresholds();
  } catch (err) {
    console.error('[Cron] Low stock threshold migration failed:', err.message);
  }

  // Daily consumption at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Running daily consumption engine...');
    try {
      await runDailyConsumption(io);
    } catch (err) {
      console.error('[Cron] Daily consumption failed:', err.message);
    }
  });

  // Daily stock report + SMS at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('[Cron] Running daily stock report...');
    try {
      await runDailyStockReport(io);
    } catch (err) {
      console.error('[Cron] Daily stock report failed:', err.message);
    }
  });

  // Prescription expiry check at 9:30 AM
  cron.schedule('30 9 * * *', async () => {
    console.log('[Cron] Checking prescription expiry...');
    try {
      const fiveDaysFromNow = new Date(Date.now() + 5 * 86400000);
      const expiring = await Prescription.find({
        nextReviewDate: { $lte: fiveDaysFromNow, $gte: new Date() },
        status: 'processed',
      });

      for (const rx of expiring) {
        const patient = await Patient.findById(rx.patientId);
        if (!patient) continue;

        const daysLeft = Math.ceil((rx.nextReviewDate - Date.now()) / 86400000);
        const notification = await Notification.create({
          userId: patient.userId,
          patientId: rx.patientId,
          type: 'prescription_expiry',
          title: 'Prescription Expiring Soon',
          message: `Prescription from Dr. ${rx.doctorName || 'your doctor'} expires in ${daysLeft} days. Visit doctor for renewal.`,
          metadata: { prescriptionId: rx._id },
        });

        io?.to(String(patient.userId)).emit('notification', notification);
      }
    } catch (err) {
      console.error('[Cron] Prescription expiry check failed:', err.message);
    }
  });

  // Dose reminders at 8 AM, 2 PM, 8 PM
  const reminderHours = [8, 14, 20];
  for (const hour of reminderHours) {
    cron.schedule(`0 ${hour} * * *`, async () => {
      const slot = hour === 8 ? 'morning' : hour === 14 ? 'afternoon' : 'night';
      console.log(`[Cron] Sending ${slot} dose reminders...`);

      try {
        const caregiverIds = new Set(
          (await User.find({ role: 'caregiver' }).select('_id')).map((u) => String(u._id))
        );
        const patients = await Patient.find({});
        for (const patient of patients) {
          if (caregiverIds.has(String(patient.userId)) || patient.relationship === 'caregiver') continue;

          const notification = await Notification.create({
            userId: patient.userId,
            patientId: patient._id,
            type: 'dose_reminder',
            title: 'Medicine Reminder',
            message: `Time for your ${slot} medicines. Open DoseWise to mark doses.`,
            metadata: { slot },
          });
          io?.to(String(patient.userId)).emit('notification', notification);
          io?.to(String(patient.userId)).emit('dose:reminder', { slot, patientId: patient._id });
        }
      } catch (err) {
        console.error(`[Cron] ${slot} reminders failed:`, err.message);
      }
    });
  }

  console.log('[Cron] Scheduled jobs started');
}
