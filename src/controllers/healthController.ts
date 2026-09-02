import type { Request, Response } from 'express';

export const getApiHealth = (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Ecommerce API is running',
    timestamp: new Date().toISOString(),
  });
};
