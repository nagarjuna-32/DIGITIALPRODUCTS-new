import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

interface Reply {
  id: string;
  name: string;
  role: string;
  message: string;
  createdAt: string;
}

/**
 * @route   POST /tickets
 * @desc    Create a new support ticket
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: userId!,
        subject,
        message,
        status: 'OPEN',
      }
    });

    res.status(201).json({ ticket });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /tickets
 * @desc    Get user's tickets (or all tickets if Admin)
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN';

    const tickets = await prisma.supportTicket.findMany({
      where: isAdmin ? {} : { userId },
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ tickets });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /tickets/:id
 * @desc    Get details of a specific ticket
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN';

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Verify ownership
    if (ticket.userId !== userId && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden: Access denied' });
    }

    res.json({ ticket });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /tickets/:id/reply
 * @desc    Reply to a support ticket (user or admin)
 */
router.post('/:id/reply', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { message, status } = req.body; // status option is for admin to mark CLOSED / IN_PROGRESS

    if (!message) {
      return res.status(400).json({ message: 'Reply message cannot be empty' });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Verify authorization
    if (ticket.userId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Access denied' });
    }

    // Parse current replies
    let replies: Reply[] = [];
    try {
      replies = typeof ticket.replies === 'string' 
        ? JSON.parse(ticket.replies) 
        : (ticket.replies as any as Reply[]) || [];
    } catch (e) {
      replies = [];
    }

    // Append new reply
    const newReply: Reply = {
      id: `reply_${Date.now()}`,
      name: userRole === 'ADMIN' ? 'Digital Vault Support' : ticket.user.name,
      role: userRole || 'USER',
      message,
      createdAt: new Date().toISOString(),
    };
    replies.push(newReply);

    // Update status
    let nextStatus = ticket.status;
    if (userRole === 'ADMIN') {
      nextStatus = status || 'IN_PROGRESS';
    } else {
      nextStatus = 'OPEN'; // user replied, needs review
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: {
        replies: JSON.stringify(replies),
        status: nextStatus,
      },
      include: {
        user: { select: { name: true, email: true } }
      }
    });

    res.json({ ticket: updatedTicket });
  } catch (error) {
    next(error);
  }
});

export default router;
