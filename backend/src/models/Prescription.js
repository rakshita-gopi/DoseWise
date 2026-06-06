import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema({
  medicineName: { type: String, required: true, trim: true },
  strength: String,
  morning: { type: Number, default: 0 },
  afternoon: { type: Number, default: 0 },
  night: { type: Number, default: 0 },
  foodType: { type: String, enum: ['before_food', 'after_food', 'with_food', 'any', ''], default: 'any' },
  duration: String,
  instructions: String,
});

const prescriptionSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorName: String,
    hospital: String,
    prescribedDate: Date,
    nextReviewDate: Date,
    uploadedFile: String,
    rawText: String,
    medicines: [medicineSchema],
    status: {
      type: String,
      enum: ['pending', 'processed', 'expired'],
      default: 'pending',
    },
    aiExtracted: { type: Boolean, default: false },
    expiresAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Prescription', prescriptionSchema);
