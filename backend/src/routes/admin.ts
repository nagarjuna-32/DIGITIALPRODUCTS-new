import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { authenticate, requireAdmin } from '../middleware/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only-change-this';

// Setup R2 Client specifically for Admin uploads
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'digital-vault-assets';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Helper to convert SQLite string arrays back to actual arrays for the frontend client
const mapProductArrays = (p: any) => {
  if (!p) return null;
  return {
    ...p,
    tags: typeof p.tags === 'string' ? p.tags.split(',').filter(Boolean) : p.tags || [],
    contentsIncluded: typeof p.contentsIncluded === 'string' ? p.contentsIncluded.split('||').filter(Boolean) : p.contentsIncluded || [],
    previewImages: typeof p.previewImages === 'string' ? p.previewImages.split(',').filter(Boolean) : p.previewImages || []
  };
};

/**
 * @route   GET /admin/setup-init
 * @desc    Check if admin setup is required (no admin exists in system)
 */
router.get('/setup-init', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' }
    });

    res.json({ setupRequired: adminCount === 0 });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /admin/setup-create
 * @desc    Create the initial admin user securely
 */
router.post('/setup-create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' }
    });

    if (adminCount > 0) {
      return res.status(400).json({ message: 'Setup has already been completed. Admin user already exists.' });
    }

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Admin password must be at least 8 characters' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const initialAdmin = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: 'ADMIN',
      }
    });

    // Track setup
    await prisma.auditLog.create({
      data: {
        action: 'SYSTEM_SETUP',
        userId: initialAdmin.id,
        ipAddress: req.ip || 'unknown',
        details: 'Initial system administrator account established.',
      }
    });

    const token = jwt.sign(
      { id: initialAdmin.id, email: initialAdmin.email, role: initialAdmin.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: initialAdmin.id,
        name: initialAdmin.name,
        email: initialAdmin.email,
        role: initialAdmin.role,
      }
    });
  } catch (error) {
    next(error);
  }
});

// Apply Auth guards for all admin routes below
router.use(authenticate);
router.use(requireAdmin);

/**
 * @route   GET /admin/stats
 * @desc    Fetch telemetry stats and analytics graphs
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Core aggregates
    const [userCount, productCount, orderCount, downloadCount] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.download.count(),
    ]);

    // 2. Revenue sum
    const completedOrders = await prisma.order.findMany({
      where: { status: 'COMPLETED' },
      select: { amount: true }
    });
    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.amount, 0);

    // 3. Sales graph (past 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const ordersPast30Days = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: thirtyDaysAgo }
      },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    // Group sales by day
    const salesMap: { [date: string]: number } = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      salesMap[d.toISOString().split('T')[0]] = 0;
    }

    ordersPast30Days.forEach(order => {
      const dateStr = order.createdAt.toISOString().split('T')[0];
      if (salesMap[dateStr] !== undefined) {
        salesMap[dateStr] += order.amount;
      }
    });

    const salesGraph = Object.keys(salesMap).map(date => ({
      date,
      revenue: salesMap[date]
    })).reverse();

    // 4. Top products by downloads
    const topProducts = await prisma.product.findMany({
      take: 5,
      orderBy: { downloadCount: 'desc' },
      select: { id: true, title: true, downloadCount: true }
    });

    // 5. Top categories by count
    const topCategories = await prisma.category.findMany({
      take: 5,
      orderBy: { productCount: 'desc' },
      select: { id: true, name: true, productCount: true }
    });

    res.json({
      aggregates: {
        totalRevenue,
        totalUsers: userCount,
        totalProducts: productCount,
        totalOrders: orderCount,
        totalDownloads: downloadCount,
        storageUsageGB: Math.round((productCount * 180) / 1024 * 10) / 10,
      },
      salesGraph,
      topProducts,
      topCategories
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /admin/generate-upload-url
 * @desc    Generate a presigned PUT URL for browser uploads directly to Cloudflare R2
 */
router.post('/generate-upload-url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileName, fileType } = req.body;
    if (!fileName || !fileType) {
      return res.status(400).json({ message: 'fileName and fileType parameters are required' });
    }

    const fileExtension = fileName.split('.').pop();
    const uniqueKey = `products/${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: uniqueKey,
      ContentType: fileType,
    });

    // Generate link valid for 1 hour
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    res.json({
      uploadUrl,
      key: uniqueKey,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /admin/products
 * @desc    Create a product
 */
router.post('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, fileSize, fileUrl, categoryId, tags, contentsIncluded, previewImages } = req.body;

    if (!title || !description || !fileSize || !fileUrl || !categoryId) {
      return res.status(400).json({ message: 'Title, description, fileSize, fileUrl and categoryId are required' });
    }

    // Slug formatting
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.floor(Math.random() * 1000);

    const product = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.create({
        data: {
          title,
          slug,
          description,
          fileSize,
          fileUrl,
          categoryId,
          // Serialize arrays as strings for SQLite compatibility
          tags: Array.isArray(tags) ? tags.join(',') : '',
          contentsIncluded: Array.isArray(contentsIncluded) ? contentsIncluded.join('||') : '',
          previewImages: Array.isArray(previewImages) ? previewImages.join(',') : '',
        }
      });

      // Increment category product counter
      await tx.category.update({
        where: { id: categoryId },
        data: { productCount: { increment: 1 } }
      });

      return prod;
    });

    res.status(201).json({ product: mapProductArrays(product) });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /admin/products/:id
 * @desc    Edit product metadata
 */
router.put('/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, description, fileSize, fileUrl, categoryId, tags, contentsIncluded, previewImages } = req.body;

    const currentProduct = await prisma.product.findUnique({ where: { id } });
    if (!currentProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.update({
        where: { id },
        data: {
          title,
          description,
          fileSize,
          fileUrl,
          categoryId,
          // Serialize arrays
          tags: Array.isArray(tags) ? tags.join(',') : '',
          contentsIncluded: Array.isArray(contentsIncluded) ? contentsIncluded.join('||') : '',
          previewImages: Array.isArray(previewImages) ? previewImages.join(',') : '',
        }
      });

      // If category changed, update counters
      if (categoryId && categoryId !== currentProduct.categoryId) {
        await tx.category.update({
          where: { id: currentProduct.categoryId },
          data: { productCount: { decrement: 1 } }
        });
        await tx.category.update({
          where: { id: categoryId },
          data: { productCount: { increment: 1 } }
        });
      }

      return prod;
    });

    res.json({ product: mapProductArrays(updatedProduct) });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /admin/products/:id
 * @desc    Remove product and decrement category count
 */
router.delete('/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await prisma.$transaction([
      prisma.product.delete({ where: { id } }),
      prisma.category.update({
        where: { id: product.categoryId },
        data: { productCount: { decrement: Math.max(0, 1) } }
      })
    ]);

    res.json({ message: 'Product removed successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /admin/categories
 * @desc    Create a category
 */
router.post('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, imageUrl, description } = req.body;
    if (!name || !imageUrl || !description) {
      return res.status(400).json({ message: 'Name, imageUrl, and description are required' });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const category = await prisma.category.create({
      data: { name, slug, imageUrl, description }
    });

    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /admin/categories/:id
 * @desc    Edit a category
 */
router.put('/categories/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, imageUrl, description } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: { name, imageUrl, description }
    });

    res.json({ category });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /admin/categories/:id
 * @desc    Remove a category (only if empty to prevent cascade complications)
 */
router.delete('/categories/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const count = await prisma.product.count({ where: { categoryId: id } });
    if (count > 0) {
      return res.status(400).json({ message: 'Cannot delete category containing active products. Relocate products first.' });
    }

    await prisma.category.delete({ where: { id } });
    res.json({ message: 'Category removed successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /admin/users
 * @desc    Get all users list
 */
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /admin/users/:id/suspend
 * @desc    Toggle user suspension status
 */
router.post('/users/:id/suspend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const targetUser = await prisma.user.findUnique({ where: { id } });

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (targetUser.role === 'ADMIN') {
      return res.status(400).json({ message: 'Administrative roles cannot be suspended' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isSuspended: !targetUser.isSuspended }
    });

    await prisma.auditLog.create({
      data: {
        action: updatedUser.isSuspended ? 'USER_SUSPENDED' : 'USER_UNSUSPENDED',
        userId: req.user?.id,
        ipAddress: req.ip || 'unknown',
        details: `${updatedUser.isSuspended ? 'Suspended' : 'Unsuspended'} user account: ${targetUser.email}`,
      }
    });

    res.json({ user: updatedUser });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /admin/orders
 * @desc    View all checkout orders list
 */
router.get('/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: { select: { name: true, email: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /admin/coupons
 * @desc    Create a discount coupon
 */
router.post('/coupons', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, discountType, discountValue, expiresAt } = req.body;
    if (!code || !discountType || discountValue === undefined) {
      return res.status(400).json({ message: 'Code, discountType, and discountValue are required' });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        discountType,
        discountValue: parseFloat(discountValue),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      }
    });

    res.status(201).json({ coupon });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /admin/coupons
 * @desc    List all coupons
 */
router.get('/coupons', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ coupons });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /admin/audit-logs
 * @desc    View security audit log
 */
router.get('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' }
    });
    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

export default router;
