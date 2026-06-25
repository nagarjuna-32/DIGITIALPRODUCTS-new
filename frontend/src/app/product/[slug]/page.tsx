'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { 
  Download, Eye, Loader2, ArrowLeft, CheckCircle, ShieldAlert, Archive, MessageSquare, Star, User
} from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: { name: string };
}

interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  fileSize: string;
  downloadCount: number;
  previewImages: string[];
  tags: string[];
  contentsIncluded: string[];
  categoryId: string;
  category: { name: string; slug: string };
  reviews: Review[];
}

export default function ProductDetailPage() {
  const router = useRouter();
  const { slug } = useParams();
  const { user, token, isAuthenticated } = useAuthStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [activeImage, setActiveImage] = useState('');
  
  // Auth state access checker
  const [hasAccess, setHasAccess] = useState(false);
  
  // Submit review states
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (!slug) return;

    const fetchProductData = async () => {
      try {
        setLoading(true);
        // Load main product
        const res = await fetch(`${API_URL}/products/${slug}`);
        if (!res.ok) {
          router.push('/category');
          return;
        }

        const data = await res.json();
        setProduct(data.product);
        setActiveImage(data.product.previewImages[0] || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80');

        // Load related products
        const relRes = await fetch(`${API_URL}/products?category=${data.product.category.slug}&limit=4`);
        if (relRes.ok) {
          const relData = await relRes.json();
          // Exclude current product from list
          setRelatedProducts(relData.products.filter((p: Product) => p.id !== data.product.id));
        }

        // Check if user has active download access
        if (token && isAuthenticated) {
          const accessRes = await fetch(`${API_URL}/downloads/request/${data.product.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (accessRes.ok) {
            setHasAccess(true);
          }
        }
      } catch (err) {
        console.error('Error fetching product detail data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [slug, token, isAuthenticated, API_URL, router]);

  // Request R2 dynamic presigned secure URL
  const handleDownload = async () => {
    if (!product || !token) return;

    try {
      setDownloadLoading(true);
      const res = await fetch(`${API_URL}/downloads/request/${product.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Unauthorized download request');
      }

      // Open CDN direct redirect link
      window.location.href = data.downloadUrl;
    } catch (err: any) {
      alert(err.message || 'Failed to initialize secure CDN download.');
    } finally {
      setDownloadLoading(false);
    }
  };

  // Checkout order process (Single Category vs Full Vault Access)
  const handleCheckout = async (type: 'SINGLE_CATEGORY' | 'FULL_VAULT') => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/product/${slug}`);
      return;
    }

    try {
      setDownloadLoading(true);

      const body: any = { accessType: type };
      if (type === 'SINGLE_CATEGORY' && product) {
        body.categoryId = product.categoryId;
      }

      // 1. Create Checkout order
      const orderRes = await fetch(`${API_URL}/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.message || 'Failed to create payment order');
      }

      // 2. Open Razorpay Widget overlay
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Digital Vault',
        description: type === 'FULL_VAULT' ? 'Full Vault Lifetime Access' : `${product?.category.name} Access`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            // Verify payment
            const verifyRes = await fetch(`${API_URL}/payments/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              setHasAccess(true);
              router.push(`/product/${slug}?payment=success`);
            } else {
              alert('Verification failed.');
            }
          } catch (err: any) {
            alert('Verification Error: ' + err.message);
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email
        },
        theme: { color: '#4f46e5' }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert(err.message || 'Checkout failed.');
    } finally {
      setDownloadLoading(false);
    }
  };

  // Submit Review Comment
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !product || !token) return;

    try {
      setReviewLoading(true);
      setReviewError('');
      
      const res = await fetch(`${API_URL}/products/${product.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating, comment })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit review');
      }

      setProduct(prev => prev ? {
        ...prev,
        reviews: [data.review, ...prev.reviews]
      } : null);
      setComment('');
      setRating(5);
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review');
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-44 flex-grow bg-transparent">
        <Loader2 className="h-10 w-10 animate-spin text-brand-indigo" />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex-grow bg-transparent">
      
      {/* Back button */}
      <Link href="/category" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-8 group transition-colors">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform text-slate-400" /> Back to Catalog
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16">
        
        {/* Gallery Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl overflow-hidden glass-panel h-[380px] sm:h-[480px] relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={activeImage} 
              alt={product.title} 
              className="h-full w-full object-cover transition-opacity duration-300"
            />
          </div>
          
          {/* Thumbnails */}
          {product.previewImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.previewImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`h-20 w-28 rounded-xl overflow-hidden border shrink-0 transition-colors cursor-pointer ${activeImage === img ? 'border-brand-indigo ring-2 ring-brand-indigo/15' : 'border-slate-200 hover:border-slate-350'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="thumbnail" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Purchase Options Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="space-y-3">
            <span className="px-2.5 py-0.5 rounded-full bg-brand-indigo/10 text-brand-indigo border border-brand-indigo/20 text-[10px] font-bold tracking-wider uppercase">
              {product.category.name}
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              {product.title}
            </h1>
            <div className="flex items-center gap-4 text-xs text-slate-500 font-bold">
              <span className="flex items-center gap-1"><Download className="h-3.5 w-3.5 text-brand-indigo" /> {product.downloadCount} downloads</span>
              <span>Size: {product.fileSize}</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed bg-white/50 border border-slate-200/60 p-4 rounded-2xl shadow-sm font-medium">
            {product.description}
          </p>

          {/* Pricing Action Box */}
          <div className="p-6 rounded-2xl glass-panel shadow-sm space-y-4">
            
            {hasAccess ? (
              /* User unlocked category - show direct secure download */
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <CheckCircle className="h-5 w-5 text-brand-indigo" /> Authorized: Unlocked under Category Access
                </div>
                <button
                  onClick={handleDownload}
                  disabled={downloadLoading}
                  className="w-full py-3.5 rounded-full btn-navy font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {downloadLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Fetching secure token...
                    </>
                  ) : (
                    <>
                      <Download className="h-4.5 w-4.5" /> Download ZIP Pack Now
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Unauthorized - Show pay buttons */
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <ShieldAlert className="h-4 w-4 text-brand-purple" /> Locked resource: Checkout required to download
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <button
                    onClick={() => handleCheckout('SINGLE_CATEGORY')}
                    disabled={downloadLoading}
                    className="py-3 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-all cursor-pointer"
                  >
                    Unlock Category <span className="block text-brand-indigo font-extrabold mt-0.5">₹99 Only</span>
                  </button>
                  
                  <button
                    onClick={() => handleCheckout('FULL_VAULT')}
                    disabled={downloadLoading}
                    className="py-3 px-4 rounded-full btn-navy text-xs font-bold transition-all cursor-pointer"
                  >
                    Unlock All Vault <span className="block text-slate-300 font-bold mt-0.5">₹499 Only</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Package Details Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Archive className="h-4 w-4 text-slate-400" /> Package Contents Included
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 font-bold">
              {product.contentsIncluded.map((c, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-indigo shrink-0" /> {c}
                </li>
              ))}
            </ul>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/50">
            {product.tags.map((tag, idx) => (
              <Link 
                key={idx}
                href={`/category?tag=${tag}`}
                className="px-2.5 py-0.5 rounded-full border border-slate-200 bg-white text-[10px] text-slate-500 hover:text-brand-indigo hover:border-brand-indigo transition-all font-bold"
              >
                #{tag}
              </Link>
            ))}
          </div>

        </div>
      </div>

      {/* Reviews Section */}
      <section className="border-t border-slate-200/50 pt-12 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Reviews List */}
          <div className="lg:col-span-7 space-y-6">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-slate-400" /> User Reviews ({product.reviews.length})
            </h2>

            {product.reviews.length === 0 ? (
              <p className="text-xs text-slate-450 italic font-medium">No reviews have been written yet for this product. Be the first to review!</p>
            ) : (
              <div className="space-y-4">
                {product.reviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-2xl glass-panel space-y-2 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" /> {rev.user.name}
                      </p>
                      <div className="flex gap-0.5 text-brand-purple">
                        {[...Array(rev.rating)].map((_, i) => <Star key={i} className="h-3 w-3 fill-current text-brand-purple" />)}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{rev.comment}</p>
                    <p className="text-[9px] text-slate-450 font-bold">{new Date(rev.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leave Review Form */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-2xl glass-panel space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800">Write a Review</h3>
              
              {!isAuthenticated ? (
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Please <Link href="/auth/login" className="text-brand-indigo underline font-bold">login</Link> to write a product rating review.
                </p>
              ) : !hasAccess ? (
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  You must unlock this category before leaving a review.
                </p>
              ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  {reviewError && <p className="text-xs text-red-500 font-semibold">{reviewError}</p>}
                  
                  {/* Rating Stars Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rating Stars:</label>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="text-slate-400 hover:scale-110 hover:text-brand-purple transition-all cursor-pointer"
                        >
                          <Star className={`h-5.5 w-5.5 ${rating >= star ? 'fill-current text-brand-purple' : 'text-slate-350'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comment */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Review Message:</label>
                    <textarea
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share your thoughts on the bundle..."
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white/50 text-xs text-slate-800 focus:outline-none focus:border-brand-indigo resize-none font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={reviewLoading}
                    className="w-full py-2.5 rounded-full btn-navy font-bold text-xs cursor-pointer disabled:opacity-50"
                  >
                    {reviewLoading ? 'Submitting...' : 'Post Review Rating'}
                  </button>
                </form>
              )}

            </div>
          </div>

        </div>
      </section>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="border-t border-slate-200/50 pt-12">
          <h2 className="text-base font-bold text-slate-800 mb-6">More from this Category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <div key={p.id} className="group rounded-2xl glass-panel glass-panel-hover overflow-hidden flex flex-col justify-between">
                <div className="h-32 bg-slate-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.previewImages[0]} alt={p.title} className="h-full w-full object-cover group-hover:scale-102 transition-transform duration-300" />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <h3 className="text-xs font-bold text-slate-800 line-clamp-1 mb-3 hover:text-brand-indigo transition-colors">
                    <Link href={`/product/${p.slug}`}>{p.title}</Link>
                  </h3>
                  <Link
                    href={`/product/${p.slug}`}
                    className="w-full text-center py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-700 transition-colors cursor-pointer"
                  >
                    View Element
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
