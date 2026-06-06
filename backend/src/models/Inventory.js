import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
    medicineName: { type: String, required: true, trim: true },
    strength: String,
    availableQuantity: { type: Number, default: 0 },
    dailyUsage: { type: Number, default: 0 },
    morning: { type: Number, default: 0 },
    afternoon: { type: Number, default: 0 },
    night: { type: Number, default: 0 },
    foodType: String,
    batchNumber: String,
    expiryDate: Date,
    lowStockThreshold: { type: Number, default: 2 },
    exhaustionDate: Date,
    status: {
      type: String,
      enum: ['active', 'low_stock', 'out_of_stock', 'expired'],
      default: 'active',
    },
  },
  { timestamps: true }
);

inventorySchema.index({ patientId: 1, medicineName: 1 });

export default mongoose.model('Inventory', inventorySchema);
