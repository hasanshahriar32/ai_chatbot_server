const mongoose = require("mongoose");

const transactionSchema = mongoose.Schema(
  {
    uid: { type: String, trim: true, required: true, unique: true },
    transactions: {
      type: Array,
      trim: true,
      required: true,
      default: [],
    },
    currentBalance: { type: Number, trim: true, required: true, default: 0 },
    validity: { type: Date, trim: true, required: true, default: Date.now() },
    dailyUsed: { type: Array, trim: true, required: true, default: [] },
  },
  {
    timestamps: true,
  }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
