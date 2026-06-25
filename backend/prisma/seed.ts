import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding database...');

  // 1. Seed Categories
  const categoriesList = [
    {
      name: 'Editing Assets',
      description: 'Luts, Transitions, Sound Effects, and Video Editing Templates.',
      imageUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Graphics Assets',
      description: 'Vector Graphics, Vector Elements, Illustrations, and Textures.',
      imageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'T-Shirt Designs',
      description: 'Ready-to-print vector designs, street-wear illustrations, and typography.',
      imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Social Media Templates',
      description: 'Instagram Posts, Carousel Sets, and Pinterest Pin layouts.',
      imageUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Canva Templates',
      description: 'Highly customizable Canva links for presentations, posters, and resumes.',
      imageUrl: 'https://images.unsplash.com/photo-1622737133809-d95047b9e673?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Business Resources',
      description: 'Proposal Contracts, Invoice Templates, and Project Trackers.',
      imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'AI Resources',
      description: 'Midjourney Prompts, ChatGPT Cheat Sheets, and Stable Diffusion Models.',
      imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Courses',
      description: 'Video-based premium courses covering Web Dev, UI/UX, and Marketing.',
      imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Ebooks',
      description: 'Comprehensive guides on startup scaling, design theory, and copywriting.',
      imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Software Resources',
      description: 'Plugins, scripts, HTML themes, and code repositories.',
      imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Mockups',
      description: 'Sleek Device Mockups, Apparel Displays, and Packaging Previews.',
      imageUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Fonts',
      description: 'Serif, Sans Serif, Calligraphy, and display fonts for designers.',
      imageUrl: 'https://images.unsplash.com/photo-1561070791-26c113006238?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Stock Resources',
      description: 'Royalty-free high-res stock backgrounds, elements, and presets.',
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
    },
  ];

  console.log('Seeding categories...');
  const seededCategories = [];
  for (const cat of categoriesList) {
    const slug = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const c = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: {
        name: cat.name,
        slug,
        description: cat.description,
        imageUrl: cat.imageUrl,
        productCount: 3,
      },
    });
    seededCategories.push(c);
  }

  // 2. Seed Mock Products for each Category
  console.log('Seeding products...');
  for (const category of seededCategories) {
    for (let i = 1; i <= 3; i++) {
      const title = `${category.name} Premium Bundle Pack v${i}.0`;
      const slug = `${category.slug}-premium-pack-v${i}-${Math.floor(Math.random() * 100)}`;
      
      const tags = [category.slug, 'premium', 'popular', `version-${i}`].join(',');
      const contentsIncluded = [
        `High Resolution Source Files (.AI, .PSD, or .AE)`,
        `Step-by-step PDF Setup Documentation`,
        `Free Lifetime Updates & Support Tickets Access`,
        `Royalty-Free Commercial License`
      ].join('||');
      const previewImages = [
        category.imageUrl,
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=600&q=80'
      ].join(',');

      await prisma.product.upsert({
        where: { slug },
        update: {},
        create: {
          title,
          slug,
          description: `This is a highly curated, premium resource pack containing state-of-the-art ${category.name}. Perfect for creative designers, agencies, and developers seeking to level up their production workflow. Unrestricted lifetime usage and access included.`,
          fileSize: `${(25 * i + 10)} MB`,
          fileUrl: `products/mock-zip-file-${category.slug}.zip`,
          categoryId: category.id,
          tags,
          contentsIncluded,
          downloadCount: Math.floor(Math.random() * 500) + 50,
          previewImages,
        }
      });
    }
  }

  // 3. Seed Coupons
  console.log('Seeding coupons...');
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      discountType: 'PERCENTAGE',
      discountValue: 10.0,
      active: true,
    }
  });

  await prisma.coupon.upsert({
    where: { code: 'VAULT50' },
    update: {},
    create: {
      code: 'VAULT50',
      discountType: 'PERCENTAGE',
      discountValue: 50.0,
      active: true,
    }
  });

  await prisma.coupon.upsert({
    where: { code: 'FLAT50' },
    update: {},
    create: {
      code: 'FLAT50',
      discountType: 'FIXED',
      discountValue: 50.0,
      active: true,
    }
  });

  console.log('Seeding database completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
