import mongoose, { Schema } from "mongoose"

const ChecksSchema = new mongoose.Schema(
  {
    website: {
      type: Schema.Types.ObjectId,
      ref: "Website",
      default: null,
      index: true,
    },
    checkedLinks: {
      type: Array,
      default: [],
    },
    manager : String,
    aiReport: String,
    duration: Number,
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
)

export const Checks = mongoose.model("Check", ChecksSchema)
