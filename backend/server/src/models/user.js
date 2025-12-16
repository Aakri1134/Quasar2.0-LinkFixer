import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from 'uuid';

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
  verificationTokenExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  websites: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: `Website`
    }
  ],
});

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
    checkedLinks: {
      type: Array,
      default: [],
    },
    aiReport: String,
    duration: Number,
    checkedAt: {
      type: Date,
      default: Date.now
    }
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

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

UserSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email, emailVerified: this.emailVerified },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

UserSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

UserSchema.methods.generateVerificationToken = function () {
  const jti = uuidv4();
  const verificationToken = jwt.sign(
    { id: this._id, email: this.email, iss: "link-fixer", jti },
    process.env.EMAIL_SECRET
  );

  this.verificationToken = verificationToken;
  this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  return verificationToken;
};



export const User = mongoose.model("User", UserSchema);
export const Website = mongoose.model("Website", WebsiteSchema);
