const mongoose = require("mongoose");
const sessionSchema = mongoose.Schema(
  {
    sessionId: { type: String, trim: true, required: true, unique: true },
    sessionTitle: { type: String, trim: true },
    subjectSelection: { type: String, trim: true },
    additionalInstruction: { type: String, trim: true },
    assistanceLevel: { type: String, trim: true },
    uid: { type: String, trim: true, required: true },
    isBookmarked: { type: Boolean, trim: true, default: false },
    sessionCost: { type: Number, trim: true, default: 0 },
    messages: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;
