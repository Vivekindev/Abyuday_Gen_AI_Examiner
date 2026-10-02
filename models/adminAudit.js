import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "usersData",
      required: true,
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "usersData",
      required: true,
    },
    action: { type: String, enum: ["granted", "revoked"], required: true },
  },
  { timestamps: true },
);
export default mongoose.model("AdminAudit", schema);
