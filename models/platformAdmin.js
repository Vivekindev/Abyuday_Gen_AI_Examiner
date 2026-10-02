import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "usersData",
      required: true,
      unique: true,
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "usersData",
      required: true,
    },
  },
  { timestamps: true },
);
export default mongoose.model("PlatformAdmin", schema);
