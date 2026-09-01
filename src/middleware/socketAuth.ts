import type { Socket } from 'socket.io';

export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): void {
  try {
    // This project does not yet enforce Socket.IO auth beyond a basic pass-through.
    // You can later validate JWT token and attach user/session details here.
    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error(String(error)));
  }
}

export default socketAuthMiddleware;
