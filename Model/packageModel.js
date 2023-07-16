const mongoose = require("mongoose");

const priceSchema = mongoose.Schema(
  {
    plan: { type: String, trim: true },
    price: { type: Number, trim: true, required: true, unique: true },
    estimatedGeneration: {
      type: Number,
      trim: true,
      required: true,
    },
    validity: { type: Number, trim: true, required: true },
    profit: {type: Number , trim: true, default: 0},
  },
  {
    timestamps: true,
  }
);

const Package = mongoose.model("Package", priceSchema);

module.exports = Package;
