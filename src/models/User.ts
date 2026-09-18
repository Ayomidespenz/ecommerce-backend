import mongoose, { Document, Schema } from "mongoose";

export type UserRole = "buyer" | "seller" | "admin";
export type UserStatus = "pending" | "active" | "suspended" | "banned";

export interface UserDocument extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  registrationId: string;
  status: UserStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  avatar?: string;
  avatarPublicId?: string;
  referralCode?: string;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<UserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
      validate: {
        validator: function (value: string) {
          return /[A-Za-z]/.test(value) && /[0-9]/.test(value);
        },
        message: "Password must contain at least one letter and one number.",
      },
    },
    role: {
      type: String,
      enum: ["buyer", "seller", "admin"],
      required: true,
      default: "buyer",
      index: true,
    },
    registrationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "suspended", "banned"],
      default: "active",
      index: true,
    },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date },
    phoneVerifiedAt: { type: Date },
    avatar: { type: String },
    avatarPublicId: { type: String },
    referralCode: { type: String, trim: true, uppercase: true, sparse: true, unique: true, index: true },
    lastLoginAt: { type: Date },
    passwordChangedAt: { type: Date },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", function (next) {
  if (this.isModified("registrationId")) {
    this.registrationId = this.registrationId.trim().toLowerCase();
  }
  next();
});

userSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model<UserDocument>("User", userSchema);
