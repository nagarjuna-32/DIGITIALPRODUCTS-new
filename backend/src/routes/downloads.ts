import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { authenticate } from '../middleware/auth';
import { getPresignedDownloadUrl } from '../services/r2';
import { downloadLimiter } from '../middleware/rateLimit';

const router = Router();

/**
 * @route   GET /downloads/history
 * @desc    Return the authenticated user's download history
 */
router.get('/history', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    const downloads = await prisma.download.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            fileSize: true,
            category: { select: { name: true } }
          }
        }
      },
      orderBy: { downloadedAt: 'desc' },
      take: 50
    });

    const history = downloads.map(d => ({
      id: d.id,
      productId: d.productId,
      productTitle: d.product.title,
      productSlug: d.product.slug,
      fileSize: d.product.fileSize,
      categoryName: d.product.category?.name || 'Unknown',
      downloadedAt: d.downloadedAt,
    }));

    res.json({ history });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /downloads/request/:productId
 * @desc    Verify purchase authorization and return a secure presigned Cloudflare R2 download URL
 */
router.get('/request/:productId', authenticate, downloadLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = req.params.productId;
    const userId = req.user?.id;

    // Fetch product details
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user has access to this product's category (or full vault)
    let isAuthorized = false;

    if (req.user?.role === 'ADMIN') {
      isAuthorized = true;
    } else {
      const activeAccess = await prisma.userAccess.findFirst({
        where: {
          userId,
          OR: [
            { accessType: 'FULL_VAULT' },
            { categoryId: product.categoryId }
          ]
        }
      });
      if (activeAccess) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        message: 'Forbidden: You do not have download rights for this category. Upgrade your vault plan to download.'
      });
    }

    // Format safe download filename from product slug
    const filename = `${product.slug}.zip`;

    // Retrieve signed URL from Cloudflare R2 (expires in 15 minutes)
    const downloadUrl = await getPresignedDownloadUrl(product.fileUrl, filename);

    // Track the download in Database
    await prisma.$transaction([
      // 1. Log the download activity
      prisma.download.create({
        data: {
          userId: userId!,
          productId: product.id,
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
        }
      }),
      // 2. Increment download count for this product
      prisma.product.update({
        where: { id: product.id },
        data: { downloadCount: { increment: 1 } }
      })
    ]);

    // Track in AuditLog
    await prisma.auditLog.create({
      data: {
        action: 'FILE_DOWNLOADED',
        userId: userId!,
        ipAddress: req.ip || 'unknown',
        details: `Downloaded product: ${product.title} (ID: ${product.id})`,
      }
    });

    res.json({
      downloadUrl,
      filename,
      message: 'Download URL generated successfully. Valid for 15 minutes.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
