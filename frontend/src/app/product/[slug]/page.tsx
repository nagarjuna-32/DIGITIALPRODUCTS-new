'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { 
  Download, ShieldAlert, CheckCircle, Tag, Archive, MessageSquare, 
  Star, ShoppingCart, HelpCircle, User, ArrowLeft, Loader2
} from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: { name: string };
}

interface ProductDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  fileSize: string;
  categoryId: string;
  tags: string[];
  contentsIncluded: string[];
  downloadCount: number;
  previewImages: string[];
  createdAt: string;
  category: { name: string; slug: string };
  reviews: Review[];
}

export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const { slug } = use(params);
  const { user, token, isAuthenticated } = useAuthStore();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  // Gallery Active Image
  const [activeImage, setActiveImage] = useState('');

  // Review Form States
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const loadProductData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/products/${slug}`);
        if (!res.ok) {
          router.push('/category');
          return;
        }

        const data = await res.json();
        setProduct(data.product);
        setRelatedProducts(data.relatedProducts);
        if (data.product.previewImages.length > 0) {
          setActiveImage(data.product.previewImages[0]);
        }

        // Verify if user has access
        if (isAuthenticated && user) {
          if (user.role === 'ADMIN') {
            setHasAccess(true);
          } else {
            const hasCatAccess = user.accessList?.some(
              access => access.accessType === 'FULL_VAULT' || access.categoryId === data.product.categoryId
            );
            setHasAccess(!!hasCatAccess);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadProductData();
  }, [API_URL, slug, isAuthenticated, user, router]);

  // Handle Download Request
  const handleDownload = async () => {
    if (!product || !token) return;

    try {
      setDownloadLoading(true);
      const res = await fetch(`${API_URL}/downloads/request/${product.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to download file');
      }

      // Trigger file download in browser
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.setAttribute('download', data.filename || `${product.slug}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Update local download count indicator
      setProduct(prev => prev ? { ...prev, downloadCount: prev.downloadCount + 1 } : null);
    } catch (err: any) {
      alert(err.message || 'Error occurred while generating download link.');
    } finally {
      setDownloadLoading(false);
    }
  };

  // Checkout Initiation for This Category or Full Vault
  const handleCheckout = async (accessType: 'SINGLE_CATEGORY' | 'FULL_VAULT') => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/product/${slug}`);
      return;
    }

    try {
      setDownloadLoading(true);
      const body: any = { accessType };
      if (accessType === 'SINGLE_CATEGORY') {
        body.categoryId = product?.categoryId;
      }

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
        throw new Error(orderData.message || 'Failed to create payment order');
      }

      // Init Razorpay SDK
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Digital Vault',
        description: accessType === 'FULL_VAULT' ? 'Full Vault Lifetime Access' : `Unlocked Category: ${product?.category.name}`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
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
              setHasAccess(true);
              window.location.reload();
            } else {
              alert(verifyData.message || 'Payment signature verify error');
            }
          } catch (err: any) {
            alert('Verification Error: ' + err.message);
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: { color: '#ffffff' },
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
      <div className="flex justify-center items-center py-44 flex-grow bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-white" />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex-grow bg-black">
      
      {/* Back button */}
      <Link href="/category" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white mb-8 group transition-colors">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Catalog
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16">
        
        {/* Gallery Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl overflow-hidden border border-white/5 bg-[#09090b]/40 h-[380px] sm:h-[480px] relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={activeImage} 
              alt={product.title} 
              className="h-full w-full object-cover transition-opacity duration-300 grayscale hover:grayscale-0 duration-300"
            />
          </div>
          
          {/* Thumbnails */}
          {product.previewImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.previewImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`h-20 w-28 rounded-lg overflow-hidden border shrink-0 transition-colors cursor-pointer ${activeImage === img ? 'border-white' : 'border-white/5 hover:border-white/20'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="thumbnail" className="h-full w-full object-cover grayscale" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Purchase Options Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="space-y-3">
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/20 text-[10px] font-bold tracking-wider uppercase">
              {product.category.name}
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
              {product.title}
            </h1>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1"><Download className="h-3.5 w-3.5" /> {product.downloadCount} downloads</span>
              <span>Size: {product.fileSize}</span>
            </div>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed bg-[#09090b]/40 border border-white/5 p-4 rounded-lg">
            {product.description}
          </p>

          {/* Pricing Action Box */}
          <div className="p-6 rounded-xl border border-white/5 bg-[#09090b]/60 backdrop-blur-md space-y-4">
            
            {hasAccess ? (
              /* User unlocked category - show direct secure download */
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <CheckCircle className="h-5 w-5 text-white" /> Authorized: Unlocked under Category Access
                </div>
                <button
                  onClick={handleDownload}
                  disabled={downloadLoading}
                  className="w-full py-3.5 rounded-lg bg-white text-black hover:bg-zinc-200 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
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
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
                  <ShieldAlert className="h-4 w-4" /> Locked resource: Checkout required to download
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <button
                    onClick={() => handleCheckout('SINGLE_CATEGORY')}
                    disabled={downloadLoading}
                    className="py-3 px-4 rounded-lg border border-white/10 hover:border-white bg-transparent text-xs font-bold text-white transition-all cursor-pointer"
                  >
                    Unlock Category <span className="block text-zinc-400 font-extrabold mt-0.5">₹99 Only</span>
                  </button>
                  
                  <button
                    onClick={() => handleCheckout('FULL_VAULT')}
                    disabled={downloadLoading}
                    className="py-3 px-4 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    Unlock All Vault <span className="block text-zinc-600 font-extrabold mt-0.5">₹499 Only</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Package Details Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1">
              <Archive className="h-4 w-4 text-zinc-400" /> Package Contents Included
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-400">
              {product.contentsIncluded.map((c, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white shrink-0" /> {c}
                </li>
              ))}
            </ul>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
            {product.tags.map((tag, idx) => (
              <Link 
                key={idx}
                href={`/category?tag=${tag}`}
                className="px-2.5 py-0.5 rounded-md border border-white/5 bg-white/5 text-[10px] text-zinc-500 hover:text-white hover:border-white transition-all"
              >
                #{tag}
              </Link>
            ))}
          </div>

        </div>
      </div>

      {/* Reviews Section */}
      <section className="border-t border-white/5 pt-12 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Reviews List */}
          <div className="lg:col-span-7 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-white" /> User Reviews ({product.reviews.length})
            </h2>

            {product.reviews.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No reviews have been written yet for this product. Be the first to review!</p>
            ) : (
              <div className="space-y-4">
                {product.reviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-xl border border-white/5 bg-[#09090b]/40 space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        <User className="h-3 w-3 text-zinc-400" /> {rev.user.name}
                      </p>
                      <div className="flex gap-0.5 text-white">
                        {[...Array(rev.rating)].map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{rev.comment}</p>
                    <p className="text-[9px] text-zinc-600">{new Date(rev.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leave Review Form */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-xl border border-white/5 bg-[#09090b]/40 space-y-4">
              <h3 className="text-sm font-bold text-white">Write a Review</h3>
              
              {!isAuthenticated ? (
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Please <Link href="/auth/login" className="text-white underline font-semibold">login</Link> to write a product rating review.
                </p>
              ) : !hasAccess ? (
                <p className="text-xs text-zinc-500 leading-relaxed">
                  You must unlock this category before leaving a review.
                </p>
              ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  {reviewError && <p className="text-xs text-red-400 font-semibold">{reviewError}</p>}
                  
                  {/* Rating Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-zinc-400">Rating Stars:</label>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="text-white hover:scale-105 transition-transform cursor-pointer"
                        >
                          <Star className={`h-5.5 w-5.5 ${rating >= star ? 'fill-current' : ''}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comment */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-zinc-400">Review Message:</label>
                    <textarea
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share your thoughts on the bundle..."
                      className="w-full p-3 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-200 focus:outline-none focus:border-white resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={reviewLoading}
                    className="w-full py-2.5 rounded-lg bg-white text-black hover:bg-zinc-200 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
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
        <section className="border-t border-white/5 pt-12">
          <h2 className="text-lg font-bold text-white mb-6">More from this Category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <div key={p.id} className="group rounded-lg border border-white/5 bg-[#09090b]/40 hover:border-white/20 overflow-hidden flex flex-col justify-between transition-colors">
                <div className="h-32 bg-zinc-900 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.previewImages[0]} alt={p.title} className="h-full w-full object-cover group-hover:scale-102 transition-transform duration-300 grayscale group-hover:grayscale-0" />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <h3 className="text-xs font-bold text-white line-clamp-1 mb-3 hover:text-zinc-300 transition-colors">
                    <Link href={`/product/${p.slug}`}>{p.title}</Link>
                  </h3>
                  <Link
                    href={`/product/${p.slug}`}
                    className="w-full text-center py-1.5 rounded-lg border border-white/10 text-[10px] font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
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
