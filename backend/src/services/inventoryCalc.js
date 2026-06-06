import { LOW_STOCK_DAYS_THRESHOLD } from '../config/constants.js';

export function calcDailyUsage(morning = 0, afternoon = 0, night = 0) {
  return morning + afternoon + night;
}

export function calcExhaustionDate(quantity, dailyUsage) {
  if (!dailyUsage || dailyUsage <= 0) return null;
  const days = Math.floor(quantity / dailyUsage);
  return new Date(Date.now() + days * 86400000);
}

export function getInventoryStatus(quantity, dailyUsage, expiryDate, thresholdDays = LOW_STOCK_DAYS_THRESHOLD) {
  if (expiryDate && new Date(expiryDate) < new Date()) return 'expired';
  if (quantity <= 0) return 'out_of_stock';
  if (dailyUsage > 0) {
    const daysLeft = quantity / dailyUsage;
    if (daysLeft <= thresholdDays) return 'low_stock';
  }
  return 'active';
}
