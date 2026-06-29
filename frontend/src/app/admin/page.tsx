'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { 
  Database, Shield, Users, ShoppingBag, Download, ArrowRight, Loader2, Plus, 
  Trash2, Edit, CheckCircle, Ticket, AlertCircle, RefreshCw, Upload, Lock
} from 'lucide-react';

interface Stats {
  aggregates: {
    totalRevenue: number;
    totalUsers: number;
    totalProducts: number;
    totalOrders: number;
    totalDownloads: number;
    storageUsageGB: number;
  };
  salesGraph: Array<{ date: string; revenue: number }>;
  topProducts: Array<{ id: string; title: string; downloadCount: number }>;
  topCategories: Array<{ id: string; name: string; productCount: number }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, token, isAuthenticated, initialize } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeTab, setActiveTab] = useState<'analytics' | 'products' | 'categories' | 'users' | 'orders' | 'tickets'>('analytics');
  
  // Data lists
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [ticketsList, setTicketsList] = useState<any[]>([]);

  // CRUD Product Form States
  const [prodFormOpen, setProdFormOpen] = useState(false);
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [prodTitle, setProdTitle] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodSize, setProdSize] = useState('');
  const [prodKey, setProdKey] = useState(''); // R2 key
  const [prodCategory, setProdCategory] = useState('');
  const [prodTags, setProdTags] = useState('');
  const [prodContents, setProdContents] = useState('');
  const [prodPreview, setProdPreview] = useState('');
  const [previewKeys, setPreviewKeys] = useState<string[]>([]);
  const [previewUploading, setPreviewUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<'idle' | 'signing' | 'uploading' | 'completed' | 'failed'>('idle');

  // CRUD Category Form States
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catImage, setCatImage] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Support Reply State
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const runAuthCheck = async () => {
      await initialize();
      const current = useAuthStore.getState();
      if (!current.isAuthenticated || current.user?.role !== 'ADMIN') {
        router.push('/');
      } else {
        setLoading(false);
        loadAdminTelemetry();
      }
    };
    runAuthCheck();
  }, [initialize, router]);

  const loadAdminTelemetry = async () => {
    const activeToken = useAuthStore.getState().token;
    if (!activeToken) return;

    try {
      // 1. Load Stats
      const statRes = await fetch(`${API_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (statRes.ok) {
        const statData = await statRes.json();
        setStats(statData);
      }

      // 2. Load Products Catalog list
      const prodRes = await fetch(`${API_URL}/products?limit=100`);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products);
      }

      // 3. Load Categories list
      const catRes = await fetch(`${API_URL}/products/categories`);
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories);
      }

      // 4. Load Users list
      const userRes = await fetch(`${API_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUsersList(userData.users);
      }

      // 5. Load Orders list
      const ordRes = await fetch(`${API_URL}/admin/orders`, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrdersList(ordData.orders);
      }

      // 6. Load Tickets list
      const tickRes = await fetch(`${API_URL}/tickets`, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (tickRes.ok) {
        const tickData = await tickRes.json();
        setTicketsList(tickData.tickets);
      }

    } catch (err) {
      console.error(err);
    }
  };

  // Direct to R2 File Upload handler
  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    try {
      setUploadProgress('signing');
      // 1. Get Presigned PUT upload link
      const res = await fetch(`${API_URL}/admin/generate-upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fileName: file.name, fileType: file.type })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Presigned URL generation failed');

      setUploadProgress('uploading');
      // 2. Perform direct binary upload directly to Cloudflare
      const uploadRes = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });

      if (!uploadRes.ok) throw new Error('Binary R2 upload failed');

      setProdKey(data.key);
      setProdSize(`${Math.round(file.size / 1024 / 1024 * 10) / 10} MB`);
      setUploadProgress('completed');
    } catch (err) {
      console.error(err);
      setUploadProgress('failed');
    }
  };

  // Direct to R2 Preview Image Upload handler (supports multiple files)
  const handlePreviewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !token) return;

    try {
      setPreviewUploading(true);
      const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';
      const uploadedKeys: string[] = [...previewKeys];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 1. Get presigned PUT upload URL for this image
        const res = await fetch(`${API_URL}/admin/generate-upload-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ fileName: file.name, fileType: file.type })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Presigned URL generation failed');

        // 2. Upload binary to R2
        const uploadRes = await fetch(data.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file
        });

        if (!uploadRes.ok) throw new Error(`Image upload failed for ${file.name}`);

        // Store the full public URL or key
        const imageUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${data.key}` : data.key;
        uploadedKeys.push(imageUrl);
      }

      setPreviewKeys(uploadedKeys);
      setProdPreview(uploadedKeys.join(','));
    } catch (err) {
      console.error('Preview image upload error:', err);
    } finally {
      setPreviewUploading(false);
      // Reset the input so the same files can be re-selected
      e.target.value = '';
    }
  };

  const handleRemovePreviewImage = (index: number) => {
    const updated = previewKeys.filter((_, i) => i !== index);
    setPreviewKeys(updated);
    setProdPreview(updated.join(','));
  };

  // CRUD: Create or Edit Product Details
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodTitle || !prodDesc || !prodKey || !prodCategory || !token) return;

    try {
      setActionLoading(true);
      const url = editingProdId ? `${API_URL}/admin/products/${editingProdId}` : `${API_URL}/admin/products`;
      const method = editingProdId ? 'PUT' : 'POST';

      const payload = {
        title: prodTitle,
        description: prodDesc,
        fileSize: prodSize,
        fileUrl: prodKey,
        categoryId: prodCategory,
        tags: prodTags.split(',').map(t => t.trim()).filter(Boolean),
        contentsIncluded: prodContents.split(',').map(t => t.trim()).filter(Boolean),
        previewImages: prodPreview.split(',').map(t => t.trim()).filter(Boolean)
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setProdFormOpen(false);
        setEditingProdId(null);
        resetProductForm();
        loadAdminTelemetry();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditProductClick = (p: any) => {
    setEditingProdId(p.id);
    setProdTitle(p.title);
    setProdDesc(p.description);
    setProdSize(p.fileSize);
    setProdKey(p.fileUrl);
    setProdCategory(p.categoryId);
    setProdTags(p.tags.join(', '));
    setProdContents(p.contentsIncluded.join(', '));
    setProdPreview(p.previewImages.join(','));
    setPreviewKeys(p.previewImages || []);
    setUploadProgress('completed');
    setProdFormOpen(true);
  };

  const resetProductForm = () => {
    setProdTitle('');
    setProdDesc('');
    setProdSize('');
    setProdKey('');
    setProdTags('');
    setProdContents('');
    setProdPreview('');
    setPreviewKeys([]);
    setPreviewUploading(false);
    setUploadProgress('idle');
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const res = await fetch(`${API_URL}/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) loadAdminTelemetry();
    } catch (err) {
      console.error(err);
    }
  };

  // CRUD: Create Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName || !catImage || !catDesc || !token) return;

    try {
      setActionLoading(true);
      const res = await fetch(`${API_URL}/admin/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: catName, imageUrl: catImage, description: catDesc })
      });

      if (res.ok) {
        setCatFormOpen(false);
        setCatName('');
        setCatImage('');
        setCatDesc('');
        loadAdminTelemetry();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Suspend User Toggle
  const handleToggleSuspend = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${id}/suspend`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) loadAdminTelemetry();
    } catch (err) {
      console.error(err);
    }
  };

  // Send Admin Support Reply
  const handleAdminSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket || !token) return;

    try {
      setActionLoading(true);
      const res = await fetch(`${API_URL}/tickets/${activeTicket.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: replyText, status: 'IN_PROGRESS' })
      });

      const data = await res.json();
      if (res.ok) {
        setActiveTicket(data.ticket);
        setReplyText('');
        setTicketsList(ticketsList.map(t => t.id === data.ticket.id ? data.ticket : t));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseTicket = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/tickets/${id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: 'Support ticket marked CLOSED by administrator.', status: 'CLOSED' })
      });

      const data = await res.json();
      if (res.ok) {
        setActiveTicket(null);
        loadAdminTelemetry();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-44 flex-grow bg-transparent">
        <Loader2 className="h-10 w-10 animate-spin text-brand-indigo" />
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 flex-grow bg-transparent text-slate-900">
      
      {/* Header */}
      <div className="flex justify-between items-center gap-4 mb-10 pb-6 border-b border-slate-200/50">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Shield className="h-6 w-6 text-brand-indigo" /> Admin Control Panel
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-bold">Manage products archive, categories, user permissions, order lists, and support tickets.</p>
        </div>
        <button
          onClick={loadAdminTelemetry}
          className="p-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Aggregate stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10 text-slate-800">
          <div className="p-4 rounded-2xl border border-slate-200 bg-white/45 text-center shadow-sm">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Revenue</span>
            <p className="text-lg font-bold text-slate-900 mt-1">₹{stats.aggregates.totalRevenue.toFixed(0)}</p>
          </div>
          <div className="p-4 rounded-2xl border border-slate-200 bg-white/45 text-center shadow-sm">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Vault Users</span>
            <p className="text-lg font-bold text-slate-900 mt-1">{stats.aggregates.totalUsers}</p>
          </div>
          <div className="p-4 rounded-2xl border border-slate-200 bg-white/45 text-center shadow-sm">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Live Elements</span>
            <p className="text-lg font-bold text-slate-900 mt-1">{stats.aggregates.totalProducts}</p>
          </div>
          <div className="p-4 rounded-2xl border border-slate-200 bg-white/45 text-center shadow-sm">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Downloads</span>
            <p className="text-lg font-bold text-slate-800 mt-1">{stats.aggregates.totalDownloads}</p>
          </div>
          <div className="p-4 rounded-2xl border border-slate-200 bg-white/45 text-center shadow-sm">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">R2 Storage Size</span>
            <p className="text-lg font-bold text-slate-800 mt-1">{stats.aggregates.storageUsageGB} GB</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-3 space-y-1.5">
          <button
            onClick={() => { setActiveTab('analytics'); setActiveTicket(null); }}
            className={`w-full text-left px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'analytics' ? 'bg-brand-indigo text-white shadow-sm shadow-brand-indigo/15' : 'text-slate-650 hover:bg-slate-100 hover:text-slate-900'}`}
          >
            Dashboard Analytics
          </button>
          <button
            onClick={() => { setActiveTab('products'); setActiveTicket(null); }}
            className={`w-full text-left px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'products' ? 'bg-brand-indigo text-white shadow-sm shadow-brand-indigo/15' : 'text-slate-650 hover:bg-slate-100 hover:text-slate-900'}`}
          >
            Product Archives
          </button>
          <button
            onClick={() => { setActiveTab('categories'); setActiveTicket(null); }}
            className={`w-full text-left px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'categories' ? 'bg-brand-indigo text-white shadow-sm shadow-brand-indigo/15' : 'text-slate-650 hover:bg-slate-100 hover:text-slate-900'}`}
          >
            Vault Categories
          </button>
          <button
            onClick={() => { setActiveTab('users'); setActiveTicket(null); }}
            className={`w-full text-left px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'users' ? 'bg-brand-indigo text-white shadow-sm shadow-brand-indigo/15' : 'text-slate-650 hover:bg-slate-100 hover:text-slate-900'}`}
          >
            User Suspensions
          </button>
          <button
            onClick={() => { setActiveTab('orders'); setActiveTicket(null); }}
            className={`w-full text-left px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'orders' ? 'bg-brand-indigo text-white shadow-sm shadow-brand-indigo/15' : 'text-slate-650 hover:bg-slate-100 hover:text-slate-900'}`}
          >
            Order Payments
          </button>
          <button
            onClick={() => { setActiveTab('tickets'); setActiveTicket(null); }}
            className={`w-full text-left px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'tickets' ? 'bg-brand-indigo text-white shadow-sm shadow-brand-indigo/15' : 'text-slate-650 hover:bg-slate-100 hover:text-slate-900'}`}
          >
            Support Tickets
          </button>
        </aside>

        {/* Admin Detail Pane */}
        <main className="lg:col-span-9 p-8 rounded-3xl bg-[#0f172a] border border-slate-850 shadow-xl min-h-[450px] text-white">
          
          {/* TAB 1: ANALYTICS */}
          {activeTab === 'analytics' && stats && (
            <div className="space-y-8">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Marketplace telemetry</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Top downloads list */}
                <div className="p-5 rounded-xl border border-white/5 bg-[#09090b]/30 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Top Downloaded Elements</h3>
                  <ul className="divide-y divide-white/5 text-xs text-zinc-300">
                    {stats.topProducts.map((p, idx) => (
                      <li key={p.id} className="py-2.5 flex justify-between gap-4">
                        <span className="font-bold text-white truncate max-w-[200px]">{idx + 1}. {p.title}</span>
                        <span className="text-zinc-300 shrink-0 font-medium">{p.downloadCount} DLs</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Top categories count */}
                <div className="p-5 rounded-xl border border-white/5 bg-[#09090b]/30 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Category Distribution</h3>
                  <ul className="divide-y divide-white/5 text-xs text-zinc-300">
                    {stats.topCategories.map((c, idx) => (
                      <li key={c.id} className="py-2.5 flex justify-between gap-4">
                        <span className="font-bold text-white">{idx + 1}. {c.name}</span>
                        <span className="text-zinc-300 shrink-0 font-medium">{c.productCount} files</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Monthly sales chart listing */}
              <div className="p-5 rounded-xl border border-white/5 bg-[#09090b]/30 space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Sales & Revenue Growth Log (Past 30 Days)</h3>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-white/5">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/5 font-semibold text-zinc-400">
                        <th className="p-3">Audit Date</th>
                        <th className="p-3 text-right">Sum of Earnings (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-zinc-300">
                      {stats.salesGraph.filter(s => s.revenue > 0).map((s, idx) => (
                        <tr key={idx} className="hover:bg-white/5">
                          <td className="p-3">{s.date}</td>
                          <td className="p-3 text-right text-white font-bold">₹{s.revenue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS CRUD */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Product Catalog</h2>
                <button
                  onClick={() => { setEditingProdId(null); resetProductForm(); setProdFormOpen(true); }}
                  className="px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" /> Add Product
                </button>
              </div>

              {prodFormOpen ? (
                /* CRUD Product Form */
                <form onSubmit={handleSaveProduct} className="p-6 rounded-xl border border-white/5 bg-[#09090b]/30 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase">{editingProdId ? 'Modify Product Details' : 'Create Product Entry'}</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-400 font-semibold">Title:</label>
                      <input
                        type="text"
                        required
                        placeholder="Premium Photoshop Mockups"
                        value={prodTitle}
                        onChange={(e) => setProdTitle(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-200 focus:outline-none focus:border-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-400 font-semibold">Category:</label>
                      <select
                        required
                        value={prodCategory}
                        onChange={(e) => setProdCategory(e.target.value)}
                        className="w-full h-9 px-2 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-200 focus:outline-none focus:border-white"
                      >
                        <option value="" className="bg-black text-white">Select Category</option>
                        {categories.map(c => <option key={c.id} value={c.id} className="bg-black text-white">{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-400 font-semibold">Description:</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Product description and outline details..."
                      value={prodDesc}
                      onChange={(e) => setProdDesc(e.target.value)}
                      className="w-full p-3 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-200 focus:outline-none focus:border-white resize-none"
                    />
                  </div>

                  {/* Direct-to-R2 Zip Uploader */}
                  <div className="p-4 rounded-lg border border-dashed border-white/10 bg-white/5 space-y-3">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase block">R2 Storage Zip File Uploader</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white text-xs font-semibold text-zinc-200 cursor-pointer transition-colors">
                        <Upload className="h-4 w-4 text-white" /> Select ZIP Archive
                        <input
                          type="file"
                          accept=".zip"
                          onChange={handleZipUpload}
                          className="hidden"
                        />
                      </label>
                      
                      <span className="text-[10px] text-zinc-500 font-semibold">
                        {uploadProgress === 'signing' && 'Requesting R2 presigned upload key...'}
                        {uploadProgress === 'uploading' && 'Transferring binary payload directly to Cloudflare...'}
                        {uploadProgress === 'completed' && 'Object uploaded successfully!'}
                        {uploadProgress === 'failed' && 'Upload error occurred.'}
                        {uploadProgress === 'idle' && 'No file selected (Max 1GB)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-zinc-500 font-bold">R2 Storage Key Path:</label>
                        <input
                          type="text"
                          required
                          readOnly
                          placeholder="products/unique-hash.zip"
                          value={prodKey}
                          className="w-full h-8 px-2 rounded-lg border border-white/5 bg-white/5 text-[10px] text-zinc-400 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] text-zinc-500 font-bold">Computed File Size:</label>
                        <input
                          type="text"
                          required
                          readOnly
                          placeholder="e.g. 45 MB"
                          value={prodSize}
                          className="w-full h-8 px-2 rounded-lg border border-white/5 bg-white/5 text-[10px] text-zinc-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-400 font-semibold">Tags (comma separated):</label>
                      <input
                        type="text"
                        placeholder="luts, editing, premium"
                        value={prodTags}
                        onChange={(e) => setProdTags(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-400 font-semibold">Contents (comma separated):</label>
                      <input
                        type="text"
                        placeholder="10 LUTs, PDF Guide"
                        value={prodContents}
                        onChange={(e) => setProdContents(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-3">
                      <label className="text-[10px] text-zinc-400 font-semibold">Preview Images (upload to R2):</label>
                      <div className="p-3 rounded-lg border border-dashed border-white/10 bg-white/5 space-y-3">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white text-xs font-semibold text-zinc-200 cursor-pointer transition-colors">
                            <Upload className="h-3.5 w-3.5 text-white" /> Select Images
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handlePreviewImageUpload}
                              className="hidden"
                            />
                          </label>
                          <span className="text-[10px] text-zinc-500 font-semibold">
                            {previewUploading ? 'Uploading images to R2...' : `${previewKeys.length} image(s) uploaded`}
                          </span>
                        </div>
                        {previewKeys.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {previewKeys.map((key, idx) => (
                              <div key={idx} className="relative group">
                                <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                  <img
                                    src={key.startsWith('http') ? key : `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL || ''}/${key}`}
                                    alt={`Preview ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePreviewImage(idx)}
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={actionLoading || uploadProgress === 'uploading' || uploadProgress === 'signing'}
                      className="px-4 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 font-bold text-xs cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading ? 'Saving...' : 'Save Product'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProdFormOpen(false)}
                      className="px-4 py-2 rounded-lg border border-white/10 text-xs font-semibold text-zinc-300 hover:bg-white/5 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                /* Products Table */
                <div className="overflow-x-auto rounded-xl border border-white/5">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/5 font-semibold text-zinc-400">
                        <th className="p-3">Title</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Downloads</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-zinc-300">
                      {products.map((p) => (
                        <tr key={p.id} className="hover:bg-white/5">
                          <td className="p-3 font-bold text-white">{p.title}</td>
                          <td className="p-3 text-zinc-500">{p.category?.name}</td>
                          <td className="p-3 text-right text-white font-semibold">{p.downloadCount}</td>
                          <td className="p-3 text-right flex justify-end gap-2">
                            <button
                              onClick={() => handleEditProductClick(p)}
                              className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="p-1 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CATEGORIES CRUD */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Vault Categories</h2>
                <button
                  onClick={() => setCatFormOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" /> Add Category
                </button>
              </div>

              {catFormOpen && (
                /* CRUD Category Form */
                <form onSubmit={handleSaveCategory} className="p-6 rounded-xl border border-white/5 bg-[#09090b]/30 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase">Define Category</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-400 font-semibold">Name:</label>
                      <input
                        type="text"
                        required
                        placeholder="Canva Templates"
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-200 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-zinc-400 font-semibold">Cover Image URL:</label>
                      <input
                        type="text"
                        required
                        placeholder="https://unsplash.com/image.jpg"
                        value={catImage}
                        onChange={(e) => setCatImage(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-200 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-400 font-semibold">Description:</label>
                    <input
                      type="text"
                      required
                      placeholder="Category short description..."
                      value={catDesc}
                      onChange={(e) => setCatDesc(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-200 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 font-bold text-xs cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading ? 'Saving...' : 'Create Category'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatFormOpen(false)}
                      className="px-4 py-2 rounded-lg border border-white/10 text-xs font-semibold text-zinc-300 hover:bg-white/5 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Categories list table */}
              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/5 font-semibold text-zinc-400">
                      <th className="p-3">Name</th>
                      <th className="p-3">Slug</th>
                      <th className="p-3 text-right">Items count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {categories.map((c) => (
                      <tr key={c.id} className="hover:bg-white/5">
                        <td className="p-3 font-bold text-white">{c.name}</td>
                        <td className="p-3 text-zinc-500">{c.slug}</td>
                        <td className="p-3 text-right text-zinc-300 font-semibold">{c.productCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: USERS LIST */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">User Account Suspensions</h2>
              
              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/5 font-semibold text-zinc-400">
                      <th className="p-3">User Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">System Role</th>
                      <th className="p-3 text-right">Actions Permit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5">
                        <td className="p-3 font-bold text-white">{u.name}</td>
                        <td className="p-3 text-zinc-400">{u.email}</td>
                        <td className="p-3 text-zinc-500 uppercase">{u.role}</td>
                        <td className="p-3 text-right">
                          {u.role !== 'ADMIN' && (
                            <button
                              onClick={() => handleToggleSuspend(u.id)}
                              className={`px-3 py-1 rounded font-bold text-[10px] cursor-pointer transition-all ${u.isSuspended ? 'bg-white text-black hover:bg-zinc-200' : 'bg-transparent text-white border border-white/20 hover:bg-white/5'}`}
                            >
                              {u.isSuspended ? 'UNSUSPEND' : 'SUSPEND'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Payments Logs</h2>
              
              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/5 font-semibold text-zinc-400">
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Customer Email</th>
                      <th className="p-3">Tier</th>
                      <th className="p-3">Amount (INR)</th>
                      <th className="p-3 text-right">Payment status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {ordersList.map((o) => (
                      <tr key={o.id} className="hover:bg-white/5">
                        <td className="p-3 font-mono text-zinc-400">{o.id}</td>
                        <td className="p-3 font-bold text-white">{o.user?.email}</td>
                        <td className="p-3 text-zinc-500 uppercase">{o.accessType}</td>
                        <td className="p-3 text-white font-semibold">₹{o.amount}</td>
                        <td className="p-3 text-right">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${o.status === 'COMPLETED' ? 'bg-white/10 text-white' : o.status === 'PENDING' ? 'bg-zinc-850 text-zinc-400' : 'bg-zinc-950 text-zinc-600'}`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: SUPPORT TICKETS MANAGER */}
          {activeTab === 'tickets' && (
            <div className="space-y-6">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">User Support Tickets Manager</h2>

              {activeTicket ? (
                /* Ticket Chat reply panel */
                <div className="space-y-4">
                  <button
                    onClick={() => { setActiveTicket(null); loadAdminTelemetry(); }}
                    className="text-xs font-bold text-zinc-500 hover:text-white"
                  >
                    &larr; Back to Ticket Manager
                  </button>

                  <div className="p-5 rounded-xl border border-white/5 bg-[#09090b]/30 space-y-3">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <div>
                        <span className="text-[9px] text-zinc-500">Ticket ID: {activeTicket.id}</span>
                        <h3 className="text-sm font-bold text-white mt-0.5">{activeTicket.subject}</h3>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCloseTicket(activeTicket.id)}
                          className="px-2.5 py-1 rounded bg-transparent border border-white/10 hover:bg-red-500 hover:border-red-500 text-white text-[9px] font-bold uppercase cursor-pointer transition-colors"
                        >
                          Mark CLOSED
                        </button>
                        <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase ${activeTicket.status === 'OPEN' ? 'bg-white/15 text-white' : activeTicket.status === 'IN_PROGRESS' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-900 text-zinc-500'}`}>
                          {activeTicket.status}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-white/5 space-y-1">
                      <p className="text-[10px] font-bold text-zinc-400">Customer: {activeTicket.user?.name} ({activeTicket.user?.email})</p>
                      <p className="text-xs text-zinc-300">{activeTicket.message}</p>
                    </div>

                    {/* Replies Map */}
                    <div className="space-y-3 pt-2">
                      {(typeof activeTicket.replies === 'string' ? JSON.parse(activeTicket.replies) : activeTicket.replies || []).map((rep: any) => (
                        <div 
                          key={rep.id} 
                          className={`p-3.5 rounded-lg space-y-1 ${rep.role === 'ADMIN' ? 'bg-white/10 border-l-2 border-white ml-6' : 'bg-white/5 mr-6'}`}
                        >
                          <p className="text-[10px] font-bold text-zinc-400">{rep.name} ({rep.role})</p>
                          <p className="text-xs text-zinc-300">{rep.message}</p>
                        </div>
                      ))}
                    </div>

                    {activeTicket.status !== 'CLOSED' && (
                      <form onSubmit={handleAdminSendReply} className="pt-4 border-t border-white/5 flex gap-2">
                        <input
                          type="text"
                          required
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type administrative response reply..."
                          className="flex-grow h-10 px-3 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-200 focus:outline-none focus:border-white"
                        />
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="px-4 rounded-lg bg-white text-black hover:bg-zinc-200 font-bold text-xs cursor-pointer disabled:opacity-50"
                        >
                          {actionLoading ? 'Replying...' : 'Send'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ) : (
                /* Tickets List */
                ticketsList.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 italic">No tickets found in the system database.</div>
                ) : (
                  <div className="space-y-3">
                    {ticketsList.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTicket(t)}
                        className="w-full text-left p-4 rounded-lg border border-white/5 bg-[#09090b]/15 hover:border-white/20 transition-all flex items-center justify-between gap-4 cursor-pointer"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-white">{t.subject}</p>
                          <span className="text-[10px] text-zinc-500 block">Customer: {t.user?.email}</span>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase ${t.status === 'OPEN' ? 'bg-white/15 text-white' : t.status === 'IN_PROGRESS' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-900 text-zinc-500'}`}>
                          {t.status}
                        </span>
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
