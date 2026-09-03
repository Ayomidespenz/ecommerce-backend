import { Request, Response } from 'express';
import AuthService from '../services/AuthService';

class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, phone, password, password_confirmation } = req.body;

      if (!name || !email || !phone || !password || !password_confirmation) {
        res.status(400).json({ message: 'name, email, phone, password, and password_confirmation are required' });
        return;
      }

      if (password !== password_confirmation) {
        res.status(400).json({ message: 'Password confirmation does not match' });
        return;
      }

      if (password.length < 8) {
        res.status(400).json({ message: 'Password must be at least 8 characters long' });
        return;
      }

      const result = await AuthService.register({ name, email, phone, password, password_confirmation });
      res.status(201).json({ message: 'Registration successful', ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      const status = message.includes('already registered') ? 409 : 500;
      res.status(status).json({ message });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ message: 'email and password are required' });
        return;
      }

      const result = await AuthService.login({ email, password });
      res.status(200).json({ message: 'Login successful', ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      const status = message === 'Invalid email or password' ? 401 : 500;
      res.status(status).json({ message });
    }
  }
}

export default new AuthController();