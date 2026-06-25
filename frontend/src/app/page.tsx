'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { 
  ShieldCheck, Zap, Sparkles, Star, ChevronDown, Check, ArrowRight,
  Download, Eye
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  description: string;
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

export default function HomePage() {
  const router = useRouter();
  const { user, token, isAuthenticated } = useAuthStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'trending' | 'newest' | 'top'>('trending');
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedCategoryForPlan, setSelectedCategoryForPlan] = useState('');

  // FAQ collapse state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    // Load categories and products
    const loadInitialData = async () => {
      try {
        const [catRes, prodRes] = await Promise.all([
          fetch(`${API_URL}/products/categories`),
          fetch(`${API_URL}/products?limit=6`)
        ]);

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.categories);
          if (catData.categories.length > 0) {
            setSelectedCategoryForPlan(catData.categories[0].id);
          }
        }
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setFeaturedProducts(prodData.products);
        }
      } catch (err) {
        console.error('Error loading homepage resources:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [API_URL]);

  const loadFeaturedBySort = async (sort: 'trending' | 'newest' | 'top') => {
    try {
      setLoading(true);
      let queryParam = 'sortBy=newest';
      if (sort === 'trending') queryParam = 'sortBy=downloads';
      else if (sort === 'top') queryParam = 'sortBy=downloads';

      const res = await fetch(`${API_URL}/products?limit=6&${queryParam}`);
      if (res.ok) {
        const data = await res.json();
        setFeaturedProducts(data.products);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'trending' | 'newest' | 'top') => {
    setActiveTab(tab);
    loadFeaturedBySort(tab);
  };

  // Razorpay payment checkout integration
  const handlePurchase = async (accessType: 'SINGLE_CATEGORY' | 'FULL_VAULT') => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/#pricing`);
      return;
    }

    try {
      setCheckoutLoading(true);

      const body: any = { accessType };
      if (accessType === 'SINGLE_CATEGORY') {
        if (!selectedCategoryForPlan) {
          alert('Please select a category first.');
          setCheckoutLoading(false);
          return;
        }
        body.categoryId = selectedCategoryForPlan;
      }

      // 1. Create order in backend
      const res = await fetch(`${API_URL}/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.message || 'Failed to initialize payment');
      }

      // 2. Load Razorpay script
      const loadScript = () => {
        return new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const scriptLoaded = await loadScript();
      if (!scriptLoaded) {
        alert('Failed to load Razorpay payment SDK. Check connection.');
        setCheckoutLoading(false);
        return;
      }

      // 3. Fire Razorpay Checkout Options
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Digital Vault',
        description: accessType === 'FULL_VAULT' ? 'Full Vault Lifetime Access' : 'Single Category Access',
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            // 4. Verify transaction
            const verifyRes = await fetch(`${API_URL}/payments/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              router.push('/dashboard?payment=success');
            } else {
              alert(verifyData.message || 'Payment verification failed.');
            }
          } catch (err: any) {
            alert('Verification Error: ' + err.message);
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: '#4f46e5',
        },
      };

      // Open checkout
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert(err.message || 'An error occurred during checkout process.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const mockTestimonials = [
    {
      name: "Rohan Sharma",
      role: "Freelance Graphic Designer",
      rating: 5,
      comment: "Absolutely mind-blowing quality. The T-Shirt Designs bundle alone saved me weeks of client revision. Highly recommend the Full Vault plan!"
    },
    {
      name: "Elena Rostova",
      role: "Agency Creative Director",
      rating: 5,
      comment: "Finding premium Mockups and Canva Templates in one unified marketplace is a game-changer. The downloads are lightning fast."
    },
    {
      name: "Amit Patel",
      role: "Motion Editor",
      rating: 5,
      comment: "The Editing Assets category has some of the cleanest LUTs and presets I've used. Access is instant, and customer support was super helpful."
    }
  ];

  const faqs = [
    {
      q: "What is included in the Full Vault plan?",
      a: "The Full Vault Access (₹499) gives you immediate, lifetime download rights to all 13 categories on our site—including Editing Assets, Graphics, Canva Templates, T-Shirt Designs, Mockups, Fonts, and all future updates. No recurring fees!"
    },
    {
      q: "How does the Single Category plan work?",
      a: "For just ₹99, you can pick any single category (for example, Canva Templates). You unlock lifetime access to download all existing and future products listed under that specific category page."
    },
    {
      q: "How are the zip files securely downloaded?",
      a: "When you click download, our backend dynamically checks your credentials and issues a secure, high-speed presigned URL from Cloudflare R2. This URL automatically expires in 15 minutes to prevent hotlinking and ensure top-tier security."
    },
    {
      q: "Can I use these assets for client projects?",
      a: "Yes! All digital resources purchased on Digital Vault come with a commercial royalty-free license, allowing you to use them in personal as well as commercial client deliverables."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 border-b border-slate-200/50">
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-indigo/10 bg-brand-indigo/5 px-3.5 py-1.5 text-xs font-bold text-brand-indigo animate-pulse-slow mb-6">
            <Sparkles className="h-3.5 w-3.5 text-brand-indigo" />
            <span>UNLEASH INFINITE CREATIVITY</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight max-w-4xl mx-auto">
            Access Thousands of <span className="bg-gradient-to-r from-brand-indigo via-brand-purple to-brand-cyan bg-clip-text text-transparent">Premium Digital Assets</span> Instantly
          </h1>
          
          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Stop starting from scratch. Instantly download production-ready templates, graphics, presets, mockups, fonts, and t-shirt designs. Trusted by 10,000+ developers and designers worldwide.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="#pricing"
              className="w-full sm:w-auto text-center rounded-full btn-navy px-8 py-3.5 text-base font-bold cursor-pointer"
            >
              Get Full Vault Access (₹499)
            </Link>
            <Link
              href="#categories"
              className="w-full sm:w-auto text-center rounded-full border border-slate-200 bg-white/60 hover:bg-white px-8 py-3.5 text-base font-bold text-slate-700 transition-all cursor-pointer"
            >
              Browse Categories (₹99)
            </Link>
          </div>

          {/* Big Statistics Counter */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto p-6 rounded-3xl glass-panel shadow-sm">
            <div className="text-center p-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">3,000+</p>
              <p className="text-xs sm:text-sm text-slate-500 font-bold">Digital Products</p>
            </div>
            <div className="text-center p-3 border-l border-slate-200/50">
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">100,000+</p>
              <p className="text-xs sm:text-sm text-slate-500 font-bold">T-Shirt Designs</p>
            </div>
            <div className="text-center p-3 border-l border-slate-200/50">
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">900GB+</p>
              <p className="text-xs sm:text-sm text-slate-500 font-bold">Graphics Assets</p>
            </div>
            <div className="text-center p-3 border-l border-slate-200/50">
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">24/7</p>
              <p className="text-xs sm:text-sm text-slate-500 font-bold">Support Channels</p>
            </div>
          </div>

        </div>
      </section>

      {/* 2. Category Cards Section */}
      <section id="categories" className="py-20 border-b border-slate-200/50 bg-transparent">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Explore Our Premium <span className="text-brand-indigo">Vault Categories</span>
            </h2>
            <p className="text-slate-500 mt-3 text-sm sm:text-base font-medium">
              Get access to any individual category of your choice for just ₹99. Real-time updates and direct CDN download logs included.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-indigo" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {categories.map((cat) => (
                <div 
                  key={cat.id} 
                  className="group rounded-2xl overflow-hidden glass-panel glass-panel-hover flex flex-col justify-between"
                >
                  <div>
                    {/* Category Image */}
                    <div className="h-44 w-full relative overflow-hidden bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={cat.imageUrl} 
                        alt={cat.name} 
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                      <span className="absolute bottom-3 right-3 text-xs font-bold bg-slate-900 text-white px-2.5 py-1 rounded-md shadow-sm">
                        {cat.productCount} Files
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="p-5">
                      <h3 className="text-base font-bold text-slate-800 mb-2 group-hover:text-brand-indigo transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 font-medium">
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  {/* Button */}
                  <div className="p-5 pt-0">
                    <Link
                      href={`/category?category=${cat.slug}`}
                      className="w-full text-center py-2 px-4 rounded-full border border-slate-200 bg-white/80 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      View Category Assets <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* 3. Featured Products Section */}
      <section className="py-20 border-b border-slate-200/50 bg-transparent">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Featured Creative <span className="bg-gradient-to-r from-slate-900 to-slate-500 bg-clip-text text-transparent">Digital Assets</span>
              </h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">Explore some of our top-rated elements in the vault.</p>
            </div>
            
            {/* Tab Controllers */}
            <div className="flex rounded-full bg-slate-100 p-1 border border-slate-200/60">
              <button
                onClick={() => handleTabChange('trending')}
                className={`px-5 py-1.5 text-xs font-bold transition-all cursor-pointer ${activeTab === 'trending' ? 'bg-white text-slate-800 shadow-sm rounded-full' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Trending
              </button>
              <button
                onClick={() => handleTabChange('newest')}
                className={`px-5 py-1.5 text-xs font-bold transition-all cursor-pointer ${activeTab === 'newest' ? 'bg-white text-slate-800 shadow-sm rounded-full' : 'text-slate-500 hover:text-slate-800'}`}
              >
                New Releases
              </button>
              <button
                onClick={() => handleTabChange('top')}
                className={`px-5 py-1.5 text-xs font-bold transition-all cursor-pointer ${activeTab === 'top' ? 'bg-white text-slate-800 shadow-sm rounded-full' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Top Downloads
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-indigo" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map((product) => (
                <div key={product.id} className="group rounded-2xl glass-panel glass-panel-hover overflow-hidden flex flex-col justify-between">
                  
                  {/* Image Gallery Mockup */}
                  <div className="h-52 w-full relative overflow-hidden bg-slate-100">
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

                  {/* Text Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 line-clamp-1 mb-2 hover:text-brand-indigo transition-colors">
                        <Link href={`/product/${product.slug}`}>{product.title}</Link>
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4 font-medium">
                        {product.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/50 pt-4 text-[11px] text-slate-500 font-semibold">
                      <span className="flex items-center gap-1">
                        <Download className="h-3 w-3 text-slate-400" /> {product.downloadCount} Downloads
                      </span>
                      <span>Size: {product.fileSize}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-5 pt-0">
                    <Link
                      href={`/product/${product.slug}`}
                      className="w-full text-center py-2 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" /> View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* 4. Pricing Plans Section */}
      <section id="pricing" className="py-24 relative overflow-hidden bg-transparent border-b border-slate-200/50">

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Simple, Honest <span className="bg-gradient-to-r from-slate-900 to-slate-500 bg-clip-text text-transparent">Pricing Models</span>
            </h2>
            <p className="text-slate-500 mt-3 text-sm sm:text-base font-medium">
              No subscriptions or automatic recurring bills. Secure a plan and get instant, lifetime download access.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
            
            {/* Standard Single Category */}
            <div className="rounded-3xl glass-panel bg-white/60 p-8 shadow-sm flex flex-col justify-between hover:border-brand-indigo/35 transition-all">
              <div>
                <span className="text-[10px] font-bold text-brand-purple tracking-widest uppercase">SINGLE ACCESS</span>
                <h3 className="text-2xl font-bold text-slate-950 mt-1">Single Category</h3>
                <p className="text-slate-500 text-xs mt-2 font-medium">Perfect if you need a specific type of resource pack.</p>
                
                {/* Price */}
                <div className="my-6">
                  <span className="text-4xl font-extrabold text-slate-900">₹99</span>
                  <span className="text-slate-500 text-sm font-semibold"> / one-time</span>
                </div>

                {/* Select Category */}
                <div className="mb-6 space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Choose your Category:</label>
                  <select
                    value={selectedCategoryForPlan}
                    onChange={(e) => setSelectedCategoryForPlan(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:border-brand-indigo"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id} className="bg-white text-slate-800">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Features */}
                <ul className="space-y-3.5 mb-8">
                  <li className="flex items-center gap-2.5 text-sm text-slate-600 font-medium">
                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-brand-indigo/10 text-brand-indigo">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    One Chosen Category Access
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-slate-600 font-medium">
                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-brand-indigo/10 text-brand-indigo">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    Download All Category Files
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-slate-600 font-medium">
                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-brand-indigo/10 text-brand-indigo">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    Instant High-Speed R2 Link
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-slate-600 font-medium">
                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-brand-indigo/10 text-brand-indigo">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    Lifetime Access & Updates
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handlePurchase('SINGLE_CATEGORY')}
                disabled={checkoutLoading}
                className="w-full text-center py-3.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 font-bold text-sm text-slate-800 transition-all cursor-pointer"
              >
                {checkoutLoading ? 'Processing...' : 'Buy Category Access'}
              </button>
            </div>

            {/* Premium Full Vault Access */}
            <div className="rounded-3xl border-2 border-brand-indigo bg-[#0f172a] text-white p-8 flex flex-col justify-between shadow-lg relative transform scale-102">
              <span className="absolute -top-3 right-6 bg-brand-indigo text-white text-[10px] font-extrabold px-3 py-1 rounded-md tracking-wider uppercase shadow-md">
                RECOMMENDED
              </span>

              <div>
                <span className="text-[10px] font-bold text-brand-cyan tracking-widest uppercase">COMPLETE ARCHIVE</span>
                <h3 className="text-2xl font-bold text-white mt-1">Full Vault Access</h3>
                <p className="text-slate-300 text-xs mt-2">Unlock our entire catalogue of 3,000+ mockups, templates & scripts.</p>
                
                {/* Price */}
                <div className="my-6">
                  <span className="text-4xl font-extrabold text-white">₹499</span>
                  <span className="text-slate-400 text-sm font-semibold"> / one-time</span>
                </div>

                {/* Features */}
                <ul className="space-y-3.5 mb-8 mt-12">
                  <li className="flex items-center gap-2.5 text-sm text-slate-200">
                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-white/10 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <strong>All 13 Categories Unlocked</strong>
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-slate-200">
                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-white/10 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    Unlimited Secure ZIP Downloads
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-slate-200">
                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-white/10 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    Instant CDN Signed links
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-slate-200">
                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-white/10 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    24/7 Premium Priority Support
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-slate-200">
                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-white/10 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    Access to Future uploads
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handlePurchase('FULL_VAULT')}
                disabled={checkoutLoading}
                className="w-full text-center py-3.5 rounded-full bg-white hover:bg-slate-100 font-bold text-sm text-slate-900 transition-all cursor-pointer shadow-md"
              >
                {checkoutLoading ? 'Processing...' : 'Unlock Entire Vault'}
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* 5. Testimonials Section */}
      <section className="py-20 border-b border-slate-200/50 bg-transparent">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Loved by Creative Professionals
            </h2>
            <p className="text-slate-500 mt-2 text-sm font-medium">See what our premium vault holders are saying about our assets.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mockTestimonials.map((t, idx) => (
              <div key={idx} className="p-6 rounded-2xl glass-panel flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex gap-1 mb-4 text-brand-purple">
                    {[...Array(t.rating)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current text-brand-purple" />)}
                  </div>
                  <p className="text-sm text-slate-600 italic leading-relaxed mb-6 font-medium">
                    &ldquo;{t.comment}&rdquo;
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{t.name}</p>
                  <p className="text-xs text-slate-500 font-semibold">{t.role}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 6. FAQ Section */}
      <section id="faq" className="py-20 border-b border-slate-200/50 bg-transparent">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Frequently Asked Questions</h2>
            <p className="text-slate-500 mt-2 text-sm font-medium">Find answers to common questions about payments, downloads, and licenses.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="rounded-2xl glass-panel bg-white/50 hover:bg-white/80 transition-all overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-slate-800 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transform transition-transform duration-200 ${openFaq === idx ? 'rotate-180 text-slate-800' : ''}`} />
                </button>

                {openFaq === idx && (
                  <div className="px-5 pb-5 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 mt-1 font-medium">
                    <p className="mt-3">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 7. Blog Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Latest Insights & Guides
              </h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">Design tips, marketing advice, and software updates.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl glass-panel glass-panel-hover overflow-hidden group">
              <div className="h-48 overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80" 
                  alt="Blog Article 1" 
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-5">
                <span className="text-[10px] font-bold text-brand-indigo tracking-wider uppercase">DESIGN WORKFLOW</span>
                <h3 className="text-sm font-bold text-slate-800 mt-1.5 line-clamp-1 group-hover:text-brand-indigo transition-colors">
                  Top 10 T-Shirt Designing Trends for 2026
                </h3>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed font-medium">
                  Discover the trending layouts, typography choices, and street-wear motifs that are flying off the shelves this season.
                </p>
              </div>
            </div>

            <div className="rounded-2xl glass-panel glass-panel-hover overflow-hidden group">
              <div className="h-48 overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80" 
                  alt="Blog Article 2" 
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-5">
                <span className="text-[10px] font-bold text-brand-indigo tracking-wider uppercase">RESOURCES EXPLAINED</span>
                <h3 className="text-sm font-bold text-slate-800 mt-1.5 line-clamp-1 group-hover:text-brand-indigo transition-colors">
                  How to Build Sleek Brand Mockups in Canva
                </h3>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed font-medium">
                  A beginner friendly guide to integrating custom PSD smart layer mockups into your standard Canva browser design canvases.
                </p>
              </div>
            </div>

            <div className="rounded-2xl glass-panel glass-panel-hover overflow-hidden group">
              <div className="h-48 overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=600&q=80" 
                  alt="Blog Article 3" 
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-5">
                <span className="text-[10px] font-bold text-brand-indigo tracking-wider uppercase">AI DESIGNING</span>
                <h3 className="text-sm font-bold text-slate-800 mt-1.5 line-clamp-1 group-hover:text-brand-indigo transition-colors">
                  Midjourney Prompt Engineering Secrets
                </h3>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed font-medium">
                  Learn parameters, style seeds, and descriptive tokens to render hyper-realistic graphics for posters and stock elements.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
