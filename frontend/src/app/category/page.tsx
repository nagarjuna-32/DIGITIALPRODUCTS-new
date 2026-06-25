'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, ListFilter, Grid, Download, Eye, Loader2
} from 'lucide-react';

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

function CategoryCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL States
  const activeCategory = searchParams.get('category') || '';
  const initialSearch = searchParams.get('search') || '';
  const initialSort = searchParams.get('sortBy') || 'newest';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Filter states
  const [search, setSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(activeCategory);
  const [sortBy, setSortBy] = useState(initialSort);
  const [page, setPage] = useState(initialPage);
  
  // Meta states
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // Synchronize filter states with URL changes
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    setSelectedCategory(searchParams.get('category') || '');
    setSortBy(searchParams.get('sortBy') || 'newest');
    setPage(parseInt(searchParams.get('page') || '1', 10));
  }, [searchParams]);

  // Load Categories list
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_URL}/products/categories`);
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, [API_URL]);

  // Fetch Products based on filter state
  useEffect(() => {
    const fetchFilteredProducts = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams();
        if (selectedCategory) queryParams.append('category', selectedCategory);
        if (search) queryParams.append('search', search);
        
        let sortQuery = 'sortBy=newest';
        if (sortBy === 'downloads') sortQuery = 'sortBy=downloads';
        queryParams.append('sortBy', sortBy === 'downloads' ? 'downloads' : 'newest');
        
        queryParams.append('page', page.toString());
        queryParams.append('limit', '9'); // 9 items per page grid

        const res = await fetch(`${API_URL}/products?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products);
          setTotalItems(data.totalProducts);
          setTotalPages(data.totalPages);
        }
      } catch (err) {
        console.error('Error loading products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFilteredProducts();
  }, [API_URL, selectedCategory, search, sortBy, page]);

  // Helper to push update filter params to query url
  const updateUrlFilters = (updates: { category?: string; search?: string; sortBy?: string; page?: number }) => {
    const params = new URLSearchParams();
    
    // category
    const cat = updates.category !== undefined ? updates.category : selectedCategory;
    if (cat) params.append('category', cat);
    
    // search
    const q = updates.search !== undefined ? updates.search : search;
    if (q) params.append('search', q);
    
    // sort
    const sort = updates.sortBy !== undefined ? updates.sortBy : sortBy;
    if (sort) params.append('sortBy', sort);
    
    // page
    const p = updates.page !== undefined ? updates.page : 1; // Default back to page 1 on filter tweak
    if (p > 1) params.append('page', p.toString());

    router.push(`/category?${params.toString()}`);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      updateUrlFilters({ search });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex-grow flex flex-col">
      <div className="flex flex-col lg:flex-row gap-8 flex-grow">
        
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 shrink-0 space-y-6">
          <div className="p-6 rounded-2xl glass-panel space-y-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <ListFilter className="h-4.5 w-4.5 text-brand-indigo" /> Filter Products
            </h2>

            {/* Search filter input */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Keyword:</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter text..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyPress}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white/50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-indigo"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Category selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => updateUrlFilters({ category: e.target.value })}
                className="w-full h-9 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-brand-indigo"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name} ({cat.productCount})
                  </option>
                ))}
              </select>
            </div>

            {/* Sort selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sort By:</label>
              <select
                value={sortBy}
                onChange={(e) => updateUrlFilters({ sortBy: e.target.value })}
                className="w-full h-9 px-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-brand-indigo"
              >
                <option value="newest">New Releases</option>
                <option value="downloads">Most Downloaded</option>
              </select>
            </div>

            {/* Reset Filters button */}
            <button
              onClick={() => router.push('/category')}
              className="w-full py-2 rounded-full border border-slate-200 hover:border-red-200 bg-white hover:bg-red-50 text-xs font-bold text-slate-600 hover:text-red-600 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </aside>

        {/* Product Grid Area */}
        <main className="flex-grow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 mb-6 text-xs text-slate-500 font-bold">
              <p className="flex items-center gap-1">
                <Grid className="h-3.5 w-3.5 text-brand-indigo" /> Showing {products.length} of {totalItems} digital files
              </p>
              {search && <span className="px-2.5 py-0.5 rounded-full bg-brand-indigo/10 text-brand-indigo border border-brand-indigo/20">Search: &quot;{search}&quot;</span>}
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-brand-indigo" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-24 rounded-2xl glass-panel bg-white/30">
                <p className="text-sm font-bold text-slate-500">No products match your filters</p>
                <p className="text-xs text-slate-400 mt-1">Try expanding your search query or choosing another category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product.id} className="group rounded-2xl glass-panel glass-panel-hover overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="h-44 w-full relative overflow-hidden bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.previewImages[0] || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'}
                          alt={product.title}
                          className="h-full w-full object-cover group-hover:scale-102 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                        <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm border border-slate-700/20 px-2.5 py-0.5 rounded-full text-[10px] text-white">
                          {product.category.name}
                        </span>
                      </div>

                      <div className="p-5">
                        <h3 className="text-sm font-bold text-slate-800 line-clamp-1 mb-2 hover:text-brand-indigo transition-colors">
                          <Link href={`/product/${product.slug}`}>{product.title}</Link>
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
                          {product.description}
                        </p>
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      <div className="flex items-center justify-between border-t border-slate-200/40 pt-4 text-[10px] text-slate-500 font-semibold mb-4">
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3 text-brand-indigo" /> {product.downloadCount} DLs
                        </span>
                        <span>Size: {product.fileSize}</span>
                      </div>
                      
                      <Link
                        href={`/product/${product.slug}`}
                        className="w-full text-center py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
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
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 border-t border-slate-200/50 pt-8 mt-10">
              <button
                disabled={page <= 1}
                onClick={() => updateUrlFilters({ page: page - 1 })}
                className="px-4 py-2 text-xs font-bold rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                Previous
              </button>
              
              <span className="text-xs font-bold text-slate-500">
                Page {page} of {totalPages}
              </span>
              
              <button
                disabled={page >= totalPages}
                onClick={() => updateUrlFilters({ page: page + 1 })}
                className="px-4 py-2 text-xs font-bold rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer"
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
      <div className="flex justify-grow justify-center items-center py-44 flex-grow bg-transparent">
        <Loader2 className="h-10 w-10 animate-spin text-brand-indigo" />
      </div>
    }>
      <CategoryCatalog />
    </Suspense>
  );
}
