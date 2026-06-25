import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-change-this';

/**
 * @route   POST /auth/register
 * @desc    Register a new user
 */
router.post('/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user (role defaults to "USER")
    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
      },
    });

    // Sign JWT
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Track registration in AuditLog
    await prisma.auditLog.create({
      data: {
        action: 'USER_REGISTER',
        userId: newUser.id,
        ipAddress: req.ip || 'unknown',
        details: `Registered email: ${newUser.email}`,
      },
    });

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /auth/login
 * @desc    Login user (Email + Password)
 */
router.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ message: 'This account has been suspended' });
    }

    // Match password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // AuditLog
    await prisma.auditLog.create({
      data: {
        action: 'USER_LOGIN',
        userId: user.id,
        ipAddress: req.ip || 'unknown',
        details: `Logged in standard user: ${user.email}`,
      },
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /auth/google
 * @desc    Google OAuth JWT Authenticator
 */
router.post('/google', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { googleToken } = req.body;

    if (!googleToken) {
      return res.status(400).json({ message: 'Google Auth token required' });
    }

    let payload: any = null;

    if (googleToken.startsWith('mock_')) {
      // In development, handle mock google login easily
      const mockEmail = googleToken.substring(5) + '@gmail.com';
      payload = {
        sub: `google_mock_${googleToken}`,
        email: mockEmail,
        name: googleToken.substring(5).charAt(0).toUpperCase() + googleToken.substring(6),
        picture: '',
      };
    } else {
      // Fetch details from Google Token API
      try {
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${googleToken}`);
        if (!response.ok) {
          return res.status(400).json({ message: 'Invalid Google OAuth Token' });
        }
        payload = await response.json();
      } catch (err) {
        return res.status(400).json({ message: 'Failed to verify Google token with servers' });
      }
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ message: 'Failed to parse user details from Google OAuth' });
    }

    const { sub: googleId, email, name } = payload;

    // Check if user already exists
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email: email.toLowerCase() }
        ]
      }
    });

    if (user) {
      // Link Google Account if not linked already
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId },
        });
      }
    } else {
      // Create user
      user = await prisma.user.create({
        data: {
          name: name || 'Google User',
          email: email.toLowerCase(),
          googleId,
        },
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({ message: 'This account has been suspended' });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // AuditLog
    await prisma.auditLog.create({
      data: {
        action: 'USER_GOOGLE_LOGIN',
        userId: user.id,
        ipAddress: req.ip || 'unknown',
        details: `Logged in via Google Auth: ${user.email}`,
      },
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /auth/me
 * @desc    Get authenticated user info
 */
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        accessList: {
          select: {
            accessType: true,
            categoryId: true,
            expiresAt: true,
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

export default router;
