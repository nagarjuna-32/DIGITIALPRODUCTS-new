import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';

  // Core static routes
  const routes = [
    '',
    '/category',
    '/auth/login',
    '/auth/register',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  // Fetch dynamic categories to index (fallback to static list if api fails during build)
  let categoryRoutes: any[] = [];
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/products/categories`);
    if (res.ok) {
      const data = await res.json();
      categoryRoutes = data.categories.map((c: any) => ({
        url: `${baseUrl}/category?category=${c.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch (e) {
    // Suppress error and fallback to core routes
  }

  return [...routes, ...categoryRoutes];
}
