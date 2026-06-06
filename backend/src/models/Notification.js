import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    type: {
      type: String,
      enum: [
        'low_stock',
        'out_of_stock',
        'refill_reminder',
        'stock_report',
        'dose_reminder',
        'prescription_expiry',
        'drug_interaction',
        'general',
      ],
      default: 'general',
    },
    title: String,
    message: { type: String, required: true },
    status: { type: String, enum: ['unread', 'read'], default: 'unread' },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
