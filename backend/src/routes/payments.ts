import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { authenticate } from '../middleware/auth';
import { createRazorpayOrder, verifyPaymentSignature } from '../services/payments';
import { sendOrderReceiptEmail } from '../services/email';

const router = Router();

/**
 * @route   POST /payments/create-order
 * @desc    Initiate payment order for Single Category (₹99) or Full Vault (₹499)
 */
router.post('/create-order', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { accessType, categoryId, couponCode } = req.body;

    if (!accessType || !['SINGLE_CATEGORY', 'FULL_VAULT'].includes(accessType)) {
      return res.status(400).json({ message: 'Invalid access type' });
    }

    if (accessType === 'SINGLE_CATEGORY' && !categoryId) {
      return res.status(400).json({ message: 'Category ID is required for single category access' });
    }

    // Determine category details if single category access is selected
    let categoryName = '';
    if (accessType === 'SINGLE_CATEGORY') {
      const category = await prisma.category.findUnique({
        where: { id: categoryId }
      });
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }
      categoryName = category.name;
    }

    // Base pricing
    let amount = accessType === 'FULL_VAULT' ? 499 : 99;

    // Apply Coupon if exists
    let appliedCoupon = null;
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase() }
      });

      if (coupon && coupon.active && (!coupon.expiresAt || coupon.expiresAt > new Date())) {
        appliedCoupon = coupon;
        if (coupon.discountType === 'PERCENTAGE') {
          amount = amount - (amount * coupon.discountValue) / 100;
        } else if (coupon.discountType === 'FIXED') {
          amount = Math.max(0, amount - coupon.discountValue);
        }
      }
    }

    // Check if user already has access to this category or full vault
    const existingAccess = await prisma.userAccess.findFirst({
      where: {
        userId,
        OR: [
          { accessType: 'FULL_VAULT' },
          { categoryId: accessType === 'SINGLE_CATEGORY' ? categoryId : undefined }
        ]
      }
    });

    if (existingAccess) {
      return res.status(400).json({ message: 'You already have active access to this tier' });
    }

    // Generate receipt and create Razorpay order
    const dbOrderId = `db_ord_${Date.now()}`;
    const rzpOrder = await createRazorpayOrder(amount, dbOrderId);

    // Save PENDING order in our local database
    const localOrder = await prisma.order.create({
      data: {
        id: dbOrderId,
        userId: userId!,
        amount,
        accessType, // Saved as string
        categoryId: accessType === 'SINGLE_CATEGORY' ? categoryId : null,
        razorpayOrderId: rzpOrder.id,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        status: 'PENDING', // Saved as string
      }
    });

    res.status(201).json({
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      dbOrderId: localOrder.id,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkeyid123',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /payments/verify
 * @desc    Verify signature and activate digital products access
 */
router.post('/verify', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ message: 'Missing payment signature verification tokens' });
    }

    // Cryptographic signature check
    const isSignatureValid = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isSignatureValid) {
      // Find the local order and update to FAILED
      await prisma.order.updateMany({
        where: { razorpayOrderId, userId },
        data: { status: 'FAILED' }
      });
      return res.status(400).json({ message: 'Payment signature validation failed' });
    }

    // Find the corresponding local order
    const order = await prisma.order.findFirst({
      where: { razorpayOrderId, userId },
      include: {
        category: true,
        user: { select: { name: true, email: true } }
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Associated transaction record not found' });
    }

    if (order.status === 'COMPLETED') {
      return res.json({ message: 'Access has already been activated for this transaction' });
    }

    // Run order completion in a transaction
    await prisma.$transaction([
      // 1. Update order status to COMPLETED
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          razorpayPaymentId,
        }
      }),

      // 2. Create UserAccess record
      prisma.userAccess.create({
        data: {
          userId: userId!,
          accessType: order.accessType,
          categoryId: order.categoryId,
          orderId: order.id,
        }
      })
    ]);

    // Track purchase in AuditLog
    await prisma.auditLog.create({
      data: {
        action: 'PAYMENT_VERIFIED',
        userId: userId!,
        ipAddress: req.ip || 'unknown',
        details: `Access activated for type: ${order.accessType} (Category ID: ${order.categoryId || 'All'})`,
      }
    });

    // Send email confirmation (non-blocking)
    sendOrderReceiptEmail(
      order.user.email,
      order.user.name,
      order.id,
      order.amount,
      order.accessType,
      order.category?.name
    ).catch(err => console.error('Error sending order receipt email:', err));

    res.json({
      success: true,
      message: 'Payment completed successfully. Digital access is now unlocked!',
      orderId: order.id,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /payments/verify-coupon
 * @desc    Check validity of discount coupons
 */
router.post('/verify-coupon', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Coupon code required' });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!coupon || !coupon.active || (coupon.expiresAt && coupon.expiresAt < new Date())) {
      return res.status(400).json({ message: 'Invalid or expired coupon code' });
    }

    res.json({
      valid: true,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
