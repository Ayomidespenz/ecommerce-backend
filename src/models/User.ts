import mongoose, { Document, Schema } from "mongoose";

export interface UserDocument extends Document {
  name: string;
  email: string;
  phone: string;
  password: string;
}

const userSchema = new Schema<UserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true, unique: true, trim: true },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
      validate: {
        validator: function (value: string) {
          // Requires at least one letter and at least one number
          return /[A-Za-z]/.test(value) && /[0-9]/.test(value);
        },
        message: "Password must contain at least one letter and one number.",
      },
    },
  },
  { timestamps: true },
);

export default mongoose.model<UserDocument>("User", userSchema);
