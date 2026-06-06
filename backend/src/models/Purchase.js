import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema({
  medicineName: { type: String, required: true },
  strength: String,
  quantity: { type: Number, required: true },
  batchNumber: String,
  expiryDate: Date,
  unitPrice: Number,
});

const purchaseSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    billFile: String,
    pharmacy: String,
    purchaseDate: { type: Date, default: Date.now },
    items: [purchaseItemSchema],
    totalAmount: Number,
    aiExtracted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Purchase', purchaseSchema);
