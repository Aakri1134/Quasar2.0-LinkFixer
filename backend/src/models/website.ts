import mongoose from "mongoose"
import { required } from "zod/mini"

const WebsiteSchema = new mongoose.Schema(
  {
    ownerID : {
      type : mongoose.Schema.Types.ObjectId,
      ref : "User"
    },
    userID: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: `User`
    }],
    mail_subscribers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    robots_txt_url : {
      type : String
    },
    domain: {
      type: String,
      required: true,
      unique: true
    },
    sitemap_links: {
      type: Array,
      default: [],
    },
    mail_subscription: {
      type: Boolean,
      default: false,
    },
    agree_to_terms: {
      type: [
        new mongoose.Schema(
          {
            agreement: Boolean,
            userId: {
              type: mongoose.Schema.Types.ObjectId,
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
          { timestamps: true, _id: false },
        ),
      ],
      default: [],
    },
    checks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Check",
      },
    ],
    options: {
      authentication: {
        type: new mongoose.Schema(
          {
            cookies: {
              type: [
                new mongoose.Schema({
                  key: String,
                  value: String,
                }),
              ],
              default: [],
            },
            headers: {
              type: [
                new mongoose.Schema({
                  key: String,
                  value: String,
                }),
              ],
              default: [],
            },
          },
          { _id: false },
        ),
      },
    },
    estimatedTime: {
      priority_low: { type: Number, default: -1 },
      priority_mid: { type: Number, default: -1 },
      priority_high: { type: Number, default: -1 },
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
  { timestamps: true, versionKey: false },
)

export const Website = mongoose.model("Website", WebsiteSchema)
