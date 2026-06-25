import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-change-this';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string; // Changed from Role to string
  };
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };

    // Fetch user from DB to verify they still exist and are not suspended
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, isSuspended: true }
    });

    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ message: 'Your account has been suspended' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') { // Changed check to string comparison
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
  next();
};
