import mongoose, { Schema } from "mongoose";

const WebsiteSchema = new mongoose.Schema({
  userID: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: `User`
  }],
  ownerID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: `User`
  },
  verifiedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: `User`
  }],
  domain: {
    type: String,
    required: true,
  },
  sitemapLinks: {
    type: Array,
    default: []
  },
  checks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Check",
    default: []
  }],
  options: {
    authentication: {
      type: new mongoose.Schema({
        cookies: {
          type: Map,
          of: String,
          default: {}
        },
        token: {
          type: [String],
          default: []
        }
      }, { _id: false })
    }
  },
  estimatedTime: {
    priority_low: { type: Number, default: -1 },
    priority_mid: { type: Number, default: -1 },
    priority_high: { type: Number, default: -1 }
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

export const Website = mongoose.model("Website", WebsiteSchema);