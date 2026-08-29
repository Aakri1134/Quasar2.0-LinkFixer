import mongoose, { Schema } from "mongoose"

const AlertsSchema = new mongoose.Schema(
  {
    website: {
      type: Schema.Types.ObjectId,
      ref: "Website",
      required: true,
      index: true,
    },
    check: [
      {
        type: Schema.Types.ObjectId,
        ref: "Check",
        required: true,
        index: true,
      },
    ],
    link: {
      type: String,
      required: true,
      index: true,
    },
    error_code: {
      type: String,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    manager: String,
    assignment: {
      type: [
        new mongoose.Schema(
          {
            assignedTo: {
              type: mongoose.Schema.ObjectId,
              ref: "User",
            },
            assignedBy: {
              type: mongoose.Schema.ObjectId,
              ref: "User",
            },
            updatedAt: {
              type: Date,
              default: Date.now,
            },
            createdAt: {
              type: Date,
              default: Date.now,
            },
          },
          { versionKey: false, timestamps: true },
        ),
      ],
    },
    solved: Boolean,
    solvedAt: {
      type: Date,
      default: null,
    },
    solvedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
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

AlertsSchema.index({ website: 1, check: 1 })
AlertsSchema.index({ website: 1, link: 1 })
AlertsSchema.index({ website: 1, link: 1, error_code: 1 })

export const Alert = mongoose.model("Alert", AlertsSchema)
