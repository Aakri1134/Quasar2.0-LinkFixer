import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from 'uuid';
import { env } from "../config/env.js";

// Plain field shape
export interface IUser {
  username: string;
  email: string;
  password: string;
  emailVerified: boolean;
  verificationToken?: string | null;
  verificationTokenExpires?: Date | null;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
  websites: mongoose.Types.ObjectId[];
}

// Instance methods
export interface IUserMethods {
  generateAuthToken(): string;
  comparePassword(password: string): Promise<boolean>;
  generateVerificationToken(): string;
}

// Combine into the full document type
export type UserDocument = mongoose.HydratedDocument<IUser, IUserMethods>;

// Model type (needed if you add any statics later; harmless otherwise)
export type UserModel = mongoose.Model<IUser, {}, IUserMethods>;

const UserSchema = new mongoose.Schema<IUser, UserModel, IUserMethods>({
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
  // Bumped on logout and on password change so already-issued JWTs stop validating.
  tokenVersion: {
    type: Number,
    default: 0,
  },
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

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

UserSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      emailVerified: this.emailVerified,
      tokenVersion: this.tokenVersion ?? 0,
    },
    env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

UserSchema.methods.comparePassword = async function (password : string) {
  return await bcrypt.compare(password, this.password);
};

UserSchema.methods.generateVerificationToken = function () {
  const jti = uuidv4();
  const verificationToken = jwt.sign(
    { id: this._id, email: this.email, iss: "link-fixer", jti },
    env.EMAIL_SECRET,
    { expiresIn: "24h" }
  );

  this.verificationToken = verificationToken;
  this.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  return verificationToken;
};



export const User = mongoose.model<IUser, UserModel>("User", UserSchema);
