const mongoose = require("mongoose");

const paymentSchema = mongoose.Schema(
  {
    uid: { type: String, trim: true, required: true },
    packageID: { type: String, trim: true },
    paymentID: { type: String, trim: true, required: true, unique: true },
    plan: { type: String, trim: true },
    price: { type: Number, trim: true, required: true },
    estimatedGeneration: { type: Number, trim: true },
    validity: { type: Number, trim: true },
    status: { type: String, trim: true, default: "pending" },
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
