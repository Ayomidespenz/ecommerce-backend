import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { UserDocument } from '../models/User';

interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  token: string;
}

class AuthService {
  async register(input: RegisterInput): Promise<AuthResult> {
    if (input.password !== input.password_confirmation) {
      throw new Error('Password confirmation does not match');
    }

    const email = input.email.toLowerCase().trim();
    const phone = input.phone.trim();
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });

    if (existingUser) {
      throw new Error(existingUser.email === email ? 'Email is already registered' : 'Phone is already registered');
    }

    const password = await bcrypt.hash(input.password, Number(process.env.BCRYPT_SALT_ROUNDS) || 12);
    const user = await User.create({ name: input.name.trim(), email, phone, password });

    return this.createAuthResult(user);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await User.findOne({ email: input.email.toLowerCase().trim() }).select('+password');

    if (!user || !(await bcrypt.compare(input.password, user.password))) {
      throw new Error('Invalid email or password');
    }

    return this.createAuthResult(user);
  }

  private createAuthResult(user: UserDocument): AuthResult {
    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET environment variable is not set');
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      secret,
      { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' } as jwt.SignOptions
    );

    return {
      user: { id: user._id.toString(), name: user.name, email: user.email, phone: user.phone },
      token,
    };
  }
}

export default new AuthService();