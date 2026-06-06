import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ['prescription', 'lab_report', 'xray', 'ct_scan', 'insurance', 'other'],
      default: 'other',
    },
    filePath: { type: String, required: true },
    fileType: String,
    fileSize: Number,
    version: { type: Number, default: 1 },
    notes: String,
  },
  { timestamps: true }
);

export default mongoose.model('Document', documentSchema);
