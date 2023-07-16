const mongoose = require("mongoose");

const aiSchema = mongoose.Schema(
  {
    initBalance: { type: Number, trim: true, required: true, default: 0 },
    initDuration: { type: Number, trim: true, required: true, default: 0 },
    outPrice: { type: Number, trim: true, required: true, default: 0.002 },
    inPrice: { type: Number, trim: true, required: true, default: 0.0015 },
  },
  {
    timestamps: true,
  }
);

const Ai = mongoose.model("Ai", aiSchema);

module.exports = Ai;
