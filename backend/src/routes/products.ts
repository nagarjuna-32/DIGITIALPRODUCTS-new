import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

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
 * @route   GET /products/categories
 * @desc    Get all categories with active product counts
 */
router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /products
 * @desc    Query products list with pagination, search, categories, and tags
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '12', 10);
    const skip = (page - 1) * limit;

    const search = req.query.search as string || '';
    const categorySlug = req.query.category as string || '';
    const tag = req.query.tag as string || '';
    const sortBy = req.query.sortBy as string || 'newest'; // newest, downloads

    // Build Prisma query filters
    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search } }, // Case-insensitive contains is standard for SQLite inside Prisma (mode: 'insensitive' is postgreSQL specific, so we omit for SQLite compatibility)
        { description: { contains: search } },
        { tags: { contains: search } }
      ];
    }

    if (categorySlug) {
      where.category = {
        slug: categorySlug,
      };
    }

    if (tag) {
      where.tags = {
        contains: tag,
      };
    }

    // Build sorting
    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'downloads') {
      orderBy = { downloadCount: 'desc' };
    } else if (sortBy === 'newest') {
      orderBy = { createdAt: 'desc' };
    }

    // Query DB
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: {
            select: { name: true, slug: true }
          }
        }
      }),
      prisma.product.count({ where }),
    ]);

    // Parse array strings
    const mappedProducts = products.map(mapProductArrays);

    res.json({
      products: mappedProducts,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /products/:slug
 * @desc    Get detailed info of a single product
 */
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: {
          select: { id: true, name: true, slug: true }
        },
        reviews: {
          include: {
            user: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Fetch related products (same category, excluding current)
    const relatedProducts = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        NOT: { id: product.id }
      },
      take: 4,
      orderBy: { downloadCount: 'desc' }
    });

    res.json({ 
      product: mapProductArrays(product), 
      relatedProducts: relatedProducts.map(mapProductArrays) 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /products/:id/review
 * @desc    Leave a rating/review on a product (requires user to have access to product's category)
 */
router.post('/:id/review', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productId = req.params.id;
    const userId = req.user?.id;
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5 || !comment) {
      return res.status(400).json({ message: 'Please provide a rating (1-5) and comment' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Verify if user has access to this category
    const hasAccess = await prisma.userAccess.findFirst({
      where: {
        userId,
        OR: [
          { categoryId: product.categoryId },
          { accessType: 'FULL_VAULT' }
        ]
      }
    });

    if (!hasAccess && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'You must purchase access to this product category to write a review' });
    }

    // Check if review already exists
    const existingReview = await prisma.review.findFirst({
      where: { userId, productId }
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    const newReview = await prisma.review.create({
      data: {
        userId: userId!,
        productId,
        rating: parseInt(rating, 10),
        comment,
      },
      include: {
        user: { select: { name: true } }
      }
    });

    res.status(201).json({ review: newReview });
  } catch (error) {
    next(error);
  }
});

export default router;
