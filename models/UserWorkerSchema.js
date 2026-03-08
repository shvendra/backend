import mongoose from "mongoose";

const { Schema } = mongoose;

const UserWorkerRemarkSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    workerId: {
      type: Schema.Types.ObjectId,
      ref: "User", // or "Worker" if you have a separate model
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "not_picked",
        "switched_off",
        "not_interested",
        "wrong_number",
        "call_later",
        "relevant",
      ],
      required: true,
    },

    lastContactedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // 👈 auto adds createdAt & updatedAt
  }
);

/**
 * IMPORTANT:
 * Ensures ONE remark per (user + worker)
 */
UserWorkerRemarkSchema.index(
  { userId: 1, workerId: 1 },
  { unique: true }
);

export default mongoose.model(
  "UserWorkerRemark",
  UserWorkerRemarkSchema
);
