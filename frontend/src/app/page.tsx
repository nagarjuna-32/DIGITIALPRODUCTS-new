'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { 
  Database, ShieldCheck, Zap, Sparkles, Star, ChevronDown, Check, ArrowRight,
  Download, FileText, Image as ImageIcon, Flame, ShoppingBag, Eye, Heart
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
          color: '#ffffff',
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
    <div className="flex flex-col min-h-screen bg-black">
      
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 border-b border-white/5 grid-dots">
        {/* Subtle monochrome light halos */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[350px] w-[500px] bg-white/3 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white animate-pulse-slow mb-6">
            <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
            <span>UNLEASH INFINITE CREATIVITY</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight max-w-4xl mx-auto">
            Access Thousands of <span className="bg-gradient-to-r from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">Premium Digital Assets</span> Instantly
          </h1>
          
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop starting from scratch. Instantly download production-ready templates, graphics, presets, mockups, fonts, and t-shirt designs. Trusted by 10,000+ developers and designers worldwide.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="#pricing"
              className="w-full sm:w-auto text-center rounded-lg bg-white text-black hover:bg-zinc-200 px-8 py-3.5 text-base font-bold transition-all transform hover:-translate-y-0.5 cursor-pointer shadow-md shadow-white/5"
            >
              Get Full Vault Access (₹499)
            </Link>
            <Link
              href="#categories"
              className="w-full sm:w-auto text-center rounded-lg border border-white/15 bg-transparent hover:bg-white/5 px-8 py-3.5 text-base font-semibold text-white transition-all cursor-pointer"
            >
              Browse Categories (₹99)
            </Link>
          </div>

          {/* Big Statistics Counter */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto p-6 rounded-xl border border-white/5 bg-[#09090b]/80 backdrop-blur-md">
            <div className="text-center p-3">
              <p className="text-2xl sm:text-3xl font-extrabold text-white">3,000+</p>
              <p className="text-xs sm:text-sm text-zinc-500 font-medium">Digital Products</p>
            </div>
            <div className="text-center p-3 border-l border-white/5">
              <p className="text-2xl sm:text-3xl font-extrabold text-white">100,000+</p>
              <p className="text-xs sm:text-sm text-zinc-500 font-medium">T-Shirt Designs</p>
            </div>
            <div className="text-center p-3 border-l border-white/5">
              <p className="text-2xl sm:text-3xl font-extrabold text-white">900GB+</p>
              <p className="text-xs sm:text-sm text-zinc-500 font-medium">Graphics Assets</p>
            </div>
            <div className="text-center p-3 border-l border-white/5">
              <p className="text-2xl sm:text-3xl font-extrabold text-white">24/7</p>
              <p className="text-xs sm:text-sm text-zinc-500 font-medium">Support Channels</p>
            </div>
          </div>

        </div>
      </section>

      {/* 2. Category Cards Section */}
      <section id="categories" className="py-20 border-b border-white/5 bg-black">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Explore Our Premium <span className="text-zinc-300">Vault Categories</span>
            </h2>
            <p className="text-zinc-400 mt-3 text-sm sm:text-base">
              Get access to any individual category of your choice for just ₹99. Real-time updates and direct CDN download logs included.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-800 border-t-white" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {categories.map((cat) => (
                <div 
                  key={cat.id} 
                  className="group rounded-xl overflow-hidden glass-panel glass-panel-hover flex flex-col justify-between"
                >
                  <div>
                    {/* Category Image */}
                    <div className="h-44 w-full relative overflow-hidden bg-zinc-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={cat.imageUrl} 
                        alt={cat.name} 
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 grayscale hover:grayscale-0 duration-300" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                      <span className="absolute bottom-3 right-3 text-xs font-bold bg-white text-black px-2.5 py-1 rounded-md shadow-md">
                        {cat.productCount} Files
                      </span>
                    </div>

                    {/* Metadata */}
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-zinc-300 transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  {/* Button */}
                  <div className="p-5 pt-0">
                    <Link
                      href={`/category?category=${cat.slug}`}
                      className="w-full text-center py-2 px-4 rounded-lg border border-white/10 hover:border-white bg-transparent hover:bg-white/5 text-xs font-semibold text-zinc-200 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      View Category Assets <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* 3. Featured Products Section */}
      <section className="py-20 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Featured Creative <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Digital Assets</span>
              </h2>
              <p className="text-sm text-zinc-500 mt-1">Explore some of our top-rated elements in the vault.</p>
            </div>
            
            {/* Tab Controllers */}
            <div className="flex rounded-lg bg-zinc-900 p-1 border border-white/5">
              <button
                onClick={() => handleTabChange('trending')}
                className={`rounded-md px-5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${activeTab === 'trending' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'}`}
              >
                Trending
              </button>
              <button
                onClick={() => handleTabChange('newest')}
                className={`rounded-md px-5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${activeTab === 'newest' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'}`}
              >
                New Releases
              </button>
              <button
                onClick={() => handleTabChange('top')}
                className={`rounded-md px-5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${activeTab === 'top' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:text-white'}`}
              >
                Top Downloads
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-white" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map((product) => (
                <div key={product.id} className="group rounded-xl border border-white/5 bg-[#09090b]/40 hover:border-white/20 overflow-hidden flex flex-col justify-between transition-all duration-300">
                  
                  {/* Image Gallery Mockup */}
                  <div className="h-52 w-full relative overflow-hidden bg-zinc-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={product.previewImages[0] || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'} 
                      alt={product.title} 
                      className="h-full w-full object-cover group-hover:scale-102 transition-transform duration-300 grayscale group-hover:grayscale-0 duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <span className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm border border-white/10 px-2.5 py-0.5 rounded text-[10px] text-zinc-300">
                      {product.category.name}
                    </span>
                  </div>

                  {/* Text Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white line-clamp-1 mb-2 hover:text-zinc-300 transition-colors">
                        <Link href={`/product/${product.slug}`}>{product.title}</Link>
                      </h3>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                        {product.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-4 text-[11px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Download className="h-3 w-3 text-zinc-400" /> {product.downloadCount} Downloads
                      </span>
                      <span>Size: {product.fileSize}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-5 pt-0">
                    <Link
                      href={`/product/${product.slug}`}
                      className="w-full text-center py-2 px-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
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
      <section id="pricing" className="py-24 relative overflow-hidden bg-black border-b border-white/5">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[500px] bg-white/2 rounded-full blur-[100px] pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Simple, Honest <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Pricing Models</span>
            </h2>
            <p className="text-zinc-400 mt-3 text-sm sm:text-base">
              No subscriptions or automatic recurring bills. Secure a plan and get instant, lifetime download access.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
            
            {/* Standard Single Category */}
            <div className="rounded-2xl border border-white/10 bg-[#09090b]/60 backdrop-blur-md p-8 flex flex-col justify-between hover:border-white/20 transition-colors">
              <div>
                <span className="text-xs font-bold text-zinc-400 tracking-widest uppercase">SINGLE ACCESS</span>
                <h3 className="text-2xl font-bold text-white mt-1">Single Category</h3>
                <p className="text-zinc-400 text-xs mt-2">Perfect if you need a specific type of resource pack.</p>
                
                {/* Price */}
                <div className="my-6">
                  <span className="text-4xl font-extrabold text-white">₹99</span>
                  <span className="text-zinc-500 text-sm font-medium"> / one-time</span>
                </div>

                {/* Select Category */}
                <div className="mb-6 space-y-2">
                  <label className="text-xs font-semibold text-zinc-400">Choose your Category:</label>
                  <select
                    value={selectedCategoryForPlan}
                    onChange={(e) => setSelectedCategoryForPlan(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-white/10 bg-white/5 text-sm text-zinc-200 focus:outline-none focus:border-white"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id} className="bg-black text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Features */}
                <ul className="space-y-3.5 mb-8">
                  <li className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-white/10 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    One Chosen Category Access
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-white/10 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    Download All Category Files
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-white/10 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    Instant High-Speed R2 Link
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-white/10 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    Lifetime Access & Updates
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handlePurchase('SINGLE_CATEGORY')}
                disabled={checkoutLoading}
                className="w-full text-center py-3.5 rounded-lg border border-white/10 hover:border-white bg-transparent hover:bg-white/5 font-bold text-sm text-white transition-all cursor-pointer"
              >
                {checkoutLoading ? 'Processing...' : 'Buy Category Access'}
              </button>
            </div>

            {/* Premium Full Vault Access */}
            <div className="rounded-2xl border border-white bg-[#0e0e11] p-8 flex flex-col justify-between hover:border-zinc-400 transition-all relative">
              <span className="absolute -top-3 right-6 bg-white text-black text-[10px] font-extrabold px-3 py-1 rounded-md tracking-wider uppercase shadow-md">
                RECOMMENDED
              </span>

              <div>
                <span className="text-xs font-bold text-zinc-400 tracking-widest uppercase">COMPLETE ARCHIVE</span>
                <h3 className="text-2xl font-bold text-white mt-1">Full Vault Access</h3>
                <p className="text-zinc-400 text-xs mt-2">Unlock our entire catalogue of 3,000+ mockups, templates & scripts.</p>
                
                {/* Price */}
                <div className="my-6">
                  <span className="text-4xl font-extrabold text-white">₹499</span>
                  <span className="text-zinc-400 text-sm font-medium"> / one-time</span>
                </div>

                {/* Features */}
                <ul className="space-y-3.5 mb-8 mt-12">
                  <li className="flex items-center gap-2.5 text-sm text-zinc-200">
                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-white/20 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <strong>All 13 Categories Unlocked</strong>
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-zinc-200">
                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-white/20 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    Unlimited Secure ZIP Downloads
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-zinc-200">
                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-white/20 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    Instant CDN Signed links
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-zinc-200">
                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-white/20 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    24/7 Premium Priority Support
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-zinc-200">
                    <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-white/20 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    Access to Future uploads
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handlePurchase('FULL_VAULT')}
                disabled={checkoutLoading}
                className="w-full text-center py-3.5 rounded-lg bg-white text-black hover:bg-zinc-200 font-bold text-sm transition-all transform hover:-translate-y-0.5 cursor-pointer shadow-lg shadow-white/10"
              >
                {checkoutLoading ? 'Processing...' : 'Unlock Entire Vault'}
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* 5. Testimonials Section */}
      <section className="py-20 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Loved by Creative Professionals
            </h2>
            <p className="text-zinc-500 mt-2 text-sm">See what our premium vault holders are saying about our assets.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mockTestimonials.map((t, idx) => (
              <div key={idx} className="p-6 rounded-xl border border-white/5 bg-[#09090b]/40 flex flex-col justify-between">
                <div>
                  <div className="flex gap-1 mb-4 text-white">
                    {[...Array(t.rating)].map((_, i) => <Star key={i} className="h-4.5 w-4.5 fill-current" />)}
                  </div>
                  <p className="text-sm text-zinc-300 italic leading-relaxed mb-6">
                    &ldquo;{t.comment}&rdquo;
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{t.name}</p>
                  <p className="text-xs text-zinc-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 6. FAQ Section */}
      <section id="faq" className="py-20 border-b border-white/5 bg-black">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Frequently Asked Questions</h2>
            <p className="text-zinc-500 mt-2 text-sm">Find answers to common questions about payments, downloads, and licenses.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="rounded-xl border border-white/5 bg-[#09090b]/30 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-white hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 text-zinc-500 transform transition-transform duration-200 ${openFaq === idx ? 'rotate-180 text-white' : ''}`} />
                </button>

                {openFaq === idx && (
                  <div className="px-5 pb-5 pt-0 text-xs text-zinc-400 leading-relaxed border-t border-white/5 mt-1">
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
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Latest Insights & Guides
              </h2>
              <p className="text-sm text-zinc-500 mt-1">Design tips, marketing advice, and software updates.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-xl overflow-hidden border border-white/5 bg-[#09090b]/30 hover:border-zinc-700 transition-all group">
              <div className="h-48 overflow-hidden bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80" 
                  alt="Blog Article 1" 
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300 grayscale group-hover:grayscale-0"
                />
              </div>
              <div className="p-5">
                <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">DESIGN WORKFLOW</span>
                <h3 className="text-sm font-bold text-white mt-1.5 line-clamp-1 group-hover:text-zinc-300 transition-colors">
                  Top 10 T-Shirt Designing Trends for 2026
                </h3>
                <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                  Discover the trending layouts, typography choices, and street-wear motifs that are flying off the shelves this season.
                </p>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border border-white/5 bg-[#09090b]/30 hover:border-zinc-700 transition-all group">
              <div className="h-48 overflow-hidden bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=600&q=80" 
                  alt="Blog Article 2" 
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300 grayscale group-hover:grayscale-0"
                />
              </div>
              <div className="p-5">
                <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">RESOURCES EXPLAINED</span>
                <h3 className="text-sm font-bold text-white mt-1.5 line-clamp-1 group-hover:text-zinc-300 transition-colors">
                  How to Build Sleek Brand Mockups in Canva
                </h3>
                <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                  A beginner friendly guide to integrating custom PSD smart layer mockups into your standard Canva browser design canvases.
                </p>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border border-white/5 bg-[#09090b]/30 hover:border-zinc-700 transition-all group">
              <div className="h-48 overflow-hidden bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=600&q=80" 
                  alt="Blog Article 3" 
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300 grayscale group-hover:grayscale-0"
                />
              </div>
              <div className="p-5">
                <span className="text-[10px] font-bold text-zinc-500 tracking-wider uppercase">AI DESIGNING</span>
                <h3 className="text-sm font-bold text-white mt-1.5 line-clamp-1 group-hover:text-zinc-300 transition-colors">
                  Midjourney Prompt Engineering Secrets
                </h3>
                <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
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
