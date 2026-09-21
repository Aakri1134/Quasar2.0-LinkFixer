import mongoose, { Schema } from "mongoose"
import { MANAGER_TASKS } from "../workers/managers/Manager.types.js"

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
    task: {
      type: String,
      enum: MANAGER_TASKS,
      required: true,
    },
    manager: String,
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

// Scan history is always read newest-first for one website.
ChecksSchema.index({ website: 1, createdAt: -1 })

export const Checks = mongoose.model("Check", ChecksSchema)
