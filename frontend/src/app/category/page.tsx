'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Download, Eye, Grid, ListFilter, ArrowLeftRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  fileSize: string;
  downloadCount: number;
  previewImages: string[];
  category: { name: string; slug: string };
}

function CategoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // Load Filters from URL
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    setSelectedCategory(searchParams.get('category') || '');
    setSortBy(searchParams.get('sortBy') || 'newest');
    setPage(parseInt(searchParams.get('page') || '1', 10));
  }, [searchParams]);

  // Load Categories on mount
  useEffect(() => {
    fetch(`${API_URL}/products/categories`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setCategories(data.categories);
      })
      .catch(err => console.error(err));
  }, [API_URL]);

  // Fetch Products whenever filters change
  useEffect(() => {
    const fetchFilteredProducts = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams();
        if (search) queryParams.set('search', search);
        if (selectedCategory) queryParams.set('category', selectedCategory);
        if (sortBy) queryParams.set('sortBy', sortBy);
        queryParams.set('page', page.toString());
        queryParams.set('limit', '9'); // 9 items per page

        const res = await fetch(`${API_URL}/products?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products);
          setTotalItems(data.pagination.totalItems);
          setTotalPages(data.pagination.totalPages);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredProducts();
  }, [API_URL, search, selectedCategory, sortBy, page]);

  // Update URL on changes
  const updateUrlFilters = (newFilters: { search?: string; category?: string; sortBy?: string; page?: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (newFilters.search !== undefined) {
      if (newFilters.search) params.set('search', newFilters.search);
      else params.delete('search');
    }
    
    if (newFilters.category !== undefined) {
      if (newFilters.category) params.set('category', newFilters.category);
      else params.delete('category');
    }

    if (newFilters.sortBy !== undefined) {
      params.set('sortBy', newFilters.sortBy);
    }

    if (newFilters.page !== undefined) {
      params.set('page', newFilters.page.toString());
    } else {
      params.set('page', '1'); // Reset to page 1 on filter changes
    }

    router.push(`/category?${params.toString()}`);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      updateUrlFilters({ search });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex-grow flex flex-col">
      <div className="flex flex-col lg:flex-row gap-8 flex-grow">
        
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 shrink-0 space-y-6">
          <div className="p-6 rounded-2xl border border-white/5 bg-[#09090b]/30 space-y-6">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
              <ListFilter className="h-4.5 w-4.5 text-brand-purple" /> Filter Products
            </h2>

            {/* Search filter input */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-zinc-400">Search Keyword:</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter text..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyPress}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand-purple"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              </div>
            </div>

            {/* Category selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-zinc-400">Select Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => updateUrlFilters({ category: e.target.value })}
                className="w-full h-9 px-2 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-200 focus:outline-none focus:border-brand-purple"
              >
                <option value="" className="bg-brand-dark">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug} className="bg-brand-dark">
                    {cat.name} ({cat.productCount})
                  </option>
                ))}
              </select>
            </div>

            {/* Sort selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-zinc-400">Sort By:</label>
              <select
                value={sortBy}
                onChange={(e) => updateUrlFilters({ sortBy: e.target.value })}
                className="w-full h-9 px-2 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-200 focus:outline-none focus:border-brand-purple"
              >
                <option value="newest" className="bg-brand-dark">New Releases</option>
                <option value="downloads" className="bg-brand-dark">Most Downloaded</option>
              </select>
            </div>

            {/* Reset Filters button */}
            <button
              onClick={() => router.push('/category')}
              className="w-full py-2 rounded-lg border border-white/5 hover:border-red-500/20 bg-white/5 hover:bg-red-500/10 text-xs font-semibold text-zinc-300 hover:text-red-300 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </aside>

        {/* Product Grid Area */}
        <main className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 mb-6 text-xs text-zinc-500">
              <p className="flex items-center gap-1">
                <Grid className="h-3.5 w-3.5 text-brand-cyan" /> Showing {products.length} of {totalItems} digital files
              </p>
              {search && <span className="px-2.5 py-0.5 rounded bg-brand-purple/10 text-brand-purple border border-brand-purple/20">Search: &quot;{search}&quot;</span>}
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-24">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-brand-purple" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-24 rounded-2xl border border-white/5 bg-[#09090b]/10">
                <p className="text-sm font-bold text-zinc-400">No products match your filters</p>
                <p className="text-xs text-zinc-600 mt-1">Try expanding your search query or choosing another category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product.id} className="group rounded-2xl border border-white/5 bg-[#09090b]/30 hover:border-brand-purple/20 overflow-hidden flex flex-col justify-between transition-all duration-300">
                    <div>
                      <div className="h-44 w-full relative overflow-hidden bg-zinc-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.previewImages[0] || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'}
                          alt={product.title}
                          className="h-full w-full object-cover group-hover:scale-102 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 via-transparent to-transparent" />
                        <span className="absolute top-3 left-3 bg-zinc-900/80 backdrop-blur-sm border border-white/10 px-2.5 py-0.5 rounded-full text-[10px] text-zinc-300">
                          {product.category.name}
                        </span>
                      </div>

                      <div className="p-5">
                        <h3 className="text-xs font-bold text-white line-clamp-1 mb-2 hover:text-brand-purple transition-colors">
                          <Link href={`/product/${product.slug}`}>{product.title}</Link>
                        </h3>
                        <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      <div className="flex items-center justify-between border-t border-white/5 pt-4 text-[10px] text-zinc-500 mb-4">
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3 text-brand-cyan" /> {product.downloadCount} DLs
                        </span>
                        <span>Size: {product.fileSize}</span>
                      </div>
                      
                      <Link
                        href={`/product/${product.slug}`}
                        className="w-full text-center py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" /> View Product
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 border-t border-white/5 pt-10 mt-10">
              <button
                onClick={() => updateUrlFilters({ page: Math.max(1, page - 1) })}
                disabled={page === 1}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-white/10 hover:border-brand-purple bg-white/5 text-zinc-300 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                Previous
              </button>
              <span className="text-xs text-zinc-400 font-semibold">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => updateUrlFilters({ page: Math.min(totalPages, page + 1) })}
                disabled={page === totalPages}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-white/10 hover:border-brand-purple bg-white/5 text-zinc-300 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </main>

      </div>
    </div>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-brand-purple" />
      </div>
    }>
      <CategoryContent />
    </Suspense>
  );
}
