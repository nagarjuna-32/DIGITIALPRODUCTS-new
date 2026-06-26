'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { 
  Download, Eye, Loader2, ArrowRight, CheckCircle, LifeBuoy, Settings, Shield, ChevronRight
} from 'lucide-react';

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: string;
  replies: string;
  createdAt: string;
}

interface DownloadRecord {
  id: string;
  title: string;
  downloadedAt: string;
  size: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, initialize, logout } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'purchases' | 'downloads' | 'support' | 'profile'>('purchases');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Ticket creation states
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  
  // Ticket replying states
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  
  const [actionLoading, setActionLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  const loadDashboardData = async () => {
    const activeToken = useAuthStore.getState().token || token;
    if (!activeToken) return;
    try {
      setLoading(true);
      const [ticketRes, dlRes] = await Promise.all([
        fetch(`${API_URL}/tickets`, { headers: { 'Authorization': `Bearer ${activeToken}` } }),
        fetch(`${API_URL}/downloads/history`, { headers: { 'Authorization': `Bearer ${activeToken}` } })
      ]);

      if (ticketRes.ok) {
        const ticketData = await ticketRes.json();
        setTickets(ticketData.tickets);
      }
      if (dlRes.ok) {
        const dlData = await dlRes.json();
        setDownloads(dlData.history);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const runAuthCheck = async () => {
      await initialize();
      const current = useAuthStore.getState();
      if (!current.isAuthenticated) {
        router.push('/auth/login?redirect=/dashboard');
      } else {
        await loadDashboardData();
      }
    };
    runAuthCheck();
  }, [initialize, router]);

  // Create support ticket handler
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim() || !token) return;

    try {
      setActionLoading(true);
      const res = await fetch(`${API_URL}/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subject: ticketSubject, message: ticketMessage })
      });

      if (res.ok) {
        setTicketSubject('');
        setTicketMessage('');
        setNewTicketOpen(false);
        await loadDashboardData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Send reply support chat handler
  const handleSendReply = async (e: React.FormEvent) => {
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
        body: JSON.stringify({ message: replyText })
      });

      if (res.ok) {
        const data = await res.json();
        setActiveTicket(data.ticket);
        setReplyText('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper parsing json support replies safe
  const parseReplies = (ticket: SupportTicket): any[] => {
    try {
      return typeof ticket.replies === 'string' 
        ? JSON.parse(ticket.replies) 
        : (ticket.replies as any[]) || [];
    } catch (e) {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-44 flex-grow bg-transparent">
        <Loader2 className="h-10 w-10 animate-spin text-brand-indigo" />
      </div>
    );
  }

  if (!user) return null;

  const hasFullAccess = user.role === 'ADMIN' || user.accessList?.some(a => a.accessType === 'FULL_VAULT');
  const unlockedCategoriesCount = user.accessList?.filter(a => a.accessType === 'SINGLE_CATEGORY').length || 0;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 flex-grow bg-transparent">
      
      {/* Dashboard Top Hero */}
      <div className="p-8 rounded-3xl glass-panel shadow-sm mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl font-bold uppercase shadow-sm">
            {user.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-1.5">
              Hello, {user.name}! 
              {user.role === 'ADMIN' && <span className="text-[9px] bg-brand-indigo/10 text-brand-indigo border border-brand-indigo/20 px-2 py-0.5 rounded-full font-bold uppercase">ADMIN</span>}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-bold">Joined Vault on {new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Access Metrics */}
        <div className="flex flex-wrap gap-4">
          <div className="px-5 py-3 rounded-2xl border border-slate-200 bg-white/40">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Vault Tier</span>
            <p className="text-sm font-bold text-slate-800 mt-0.5">
              {hasFullAccess ? 'Full Vault Access' : unlockedCategoriesCount > 0 ? 'Single Category Access' : 'No Active Access'}
            </p>
          </div>
          {!hasFullAccess && (
            <Link
              href="/#pricing"
              className="px-5 py-3 rounded-full btn-navy text-xs font-bold flex items-center gap-1.5 cursor-pointer self-center"
            >
              Upgrade Vault Access <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-3 space-y-1.5">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-xs font-bold transition-all cursor-pointer ${activeTab === 'purchases' ? 'bg-brand-indigo text-white shadow-sm shadow-brand-indigo/15' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
          >
            <CheckCircle className="h-4 w-4" /> Active Purchases
          </button>
          <button
            onClick={() => setActiveTab('downloads')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-xs font-bold transition-all cursor-pointer ${activeTab === 'downloads' ? 'bg-brand-indigo text-white shadow-sm shadow-brand-indigo/15' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
          >
            <Download className="h-4 w-4" /> Downloads History
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-xs font-bold transition-all cursor-pointer ${activeTab === 'support' ? 'bg-brand-indigo text-white shadow-sm shadow-brand-indigo/15' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
          >
            <LifeBuoy className="h-4 w-4" /> Support Tickets
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-xs font-bold transition-all cursor-pointer ${activeTab === 'profile' ? 'bg-brand-indigo text-white shadow-sm shadow-brand-indigo/15' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
          >
            <Settings className="h-4 w-4" /> Settings & Profile
          </button>

          <button
            onClick={() => { logout(); router.push('/'); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
          >
            <Shield className="h-4 w-4" /> Sign Out
          </button>
        </aside>

        {/* Tab Detail Pane */}
        <main className="lg:col-span-9 p-8 rounded-3xl glass-panel shadow-sm min-h-[420px]">
          
          {/* TAB 1: PURCHASES */}
          {activeTab === 'purchases' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-800">Active Product Access</h2>
              
              {hasFullAccess ? (
                /* Full Vault Unlocked Banner */
                <div className="p-6 rounded-2xl border border-slate-200 bg-white/50 space-y-3 shadow-sm">
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle className="h-5 w-5 text-brand-indigo" /> Full Vault Lifetime Access Unlocked!
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    You have complete download rights to all digital elements across every category listed on our site. No recurring subscriptions. Explore anything and download ZIP source files directly.
                  </p>
                  <Link
                    href="/category"
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-indigo hover:underline pt-2 cursor-pointer"
                  >
                    Go browse elements catalog <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : unlockedCategoriesCount > 0 ? (
                /* Single Category unlocked grid */
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 font-bold">You have active purchase permissions in the following categories:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {user.accessList?.filter(a => a.accessType === 'SINGLE_CATEGORY').map((access, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white/50 flex justify-between items-center shadow-sm">
                        <div>
                          <p className="text-xs font-bold text-slate-800">Single Category Permit</p>
                          <span className="text-[10px] text-slate-450 font-bold block mt-1">Expiry: Lifetime</span>
                        </div>
                        <Link
                          href="/category"
                          className="px-4 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-[10px] text-slate-700 transition-all cursor-pointer font-bold"
                        >
                          Explore Elements
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* No access yet */
                <div className="text-center py-16 space-y-4">
                  <p className="text-sm font-bold text-slate-500">You haven&apos;t unlocked any digital categories yet</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">Standard category access starts at ₹99 one-time. Complete archive vault is ₹499 one-time.</p>
                  <Link
                    href="/#pricing"
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-indigo hover:underline pt-2"
                  >
                    View Pricing Plans <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DOWNLOADS */}
          {activeTab === 'downloads' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-800">Downloads History</h2>
              
              {downloads.length === 0 ? (
                <div className="text-center py-16 text-slate-450 italic font-medium">You haven&apos;t downloaded any files yet.</div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/40">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="p-4">Resource Filename</th>
                        <th className="p-4">Downloaded At</th>
                        <th className="p-4 text-right">File Size</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                      {downloads.map((dl) => (
                        <tr key={dl.id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                            <Download className="h-3.5 w-3.5 text-brand-indigo shrink-0" /> {dl.title}
                          </td>
                          <td className="p-4 text-slate-400">{new Date(dl.downloadedAt).toLocaleString()}</td>
                          <td className="p-4 text-right font-bold text-slate-500">{dl.size}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SUPPORT TICKETS */}
          {activeTab === 'support' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                <h2 className="text-lg font-bold text-slate-800">Support Tickets</h2>
                <button
                  onClick={() => { setNewTicketOpen(true); setActiveTicket(null); }}
                  className="px-4 py-2 rounded-full btn-navy font-bold text-xs cursor-pointer"
                >
                  Create New Ticket
                </button>
              </div>

              {newTicketOpen ? (
                /* Ticket creation form */
                <form onSubmit={handleCreateTicket} className="space-y-4 p-6 rounded-2xl border border-slate-200 bg-white/60 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800">Open Support Query</h3>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Subject / Title:</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Broken link inside Editing Assets"
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-brand-indigo"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Detailed Message:</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Describe your issue in detail..."
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      className="w-full p-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-brand-indigo resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-full btn-navy font-bold text-xs cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading ? 'Submitting...' : 'Submit Ticket'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTicketOpen(false)}
                      className="px-4 py-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-650 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : activeTicket ? (
                /* Ticket Chat Panel */
                <div className="space-y-4">
                  <button
                    onClick={() => { setActiveTicket(null); loadDashboardData(); }}
                    className="text-xs font-bold text-slate-450 hover:text-slate-700 cursor-pointer"
                  >
                    &larr; Back to Ticket List
                  </button>

                  <div className="p-5 rounded-2xl border border-slate-200 bg-white/60 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[9px] text-slate-450 uppercase font-bold tracking-wider">Ticket ID: {activeTicket.id}</span>
                        <h3 className="text-sm font-bold text-slate-800 mt-0.5">{activeTicket.subject}</h3>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase ${activeTicket.status === 'OPEN' ? 'bg-brand-indigo/10 text-brand-indigo border border-brand-indigo/20' : activeTicket.status === 'IN_PROGRESS' ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-400'}`}>
                        {activeTicket.status}
                      </span>
                    </div>
                    
                    {/* User's Original Message */}
                    <div className="p-3.5 rounded-xl bg-slate-50 space-y-1">
                      <p className="text-[10px] font-bold text-slate-500">{user.name} (Owner)</p>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">{activeTicket.message}</p>
                      <p className="text-[8px] text-slate-400 font-bold mt-1">{new Date(activeTicket.createdAt).toLocaleString()}</p>
                    </div>

                    {/* Replies Map */}
                    <div className="space-y-3.5 pt-2">
                      {parseReplies(activeTicket).map((rep: any) => (
                        <div 
                          key={rep.id} 
                          className={`p-3.5 rounded-xl space-y-1 ${rep.role === 'ADMIN' ? 'bg-brand-indigo/5 border-l-2 border-brand-indigo ml-6' : 'bg-slate-50 mr-6'}`}
                        >
                          <p className="text-[10px] font-bold text-slate-500">{rep.name} ({rep.role})</p>
                          <p className="text-xs text-slate-700 leading-relaxed font-medium">{rep.message}</p>
                          <p className="text-[8px] text-slate-400 font-bold mt-1">{new Date(rep.createdAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>

                    {/* Chat Form Reply */}
                    {activeTicket.status !== 'CLOSED' && (
                      <form onSubmit={handleSendReply} className="pt-4 border-t border-slate-100 flex gap-2">
                        <input
                          type="text"
                          required
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type your reply message..."
                          className="flex-grow h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-brand-indigo"
                        />
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="px-4 rounded-lg btn-navy font-bold text-xs cursor-pointer disabled:opacity-50"
                        >
                          {actionLoading ? 'Sending...' : 'Send'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ) : (
                /* Ticket List */
                tickets.length === 0 ? (
                  <div className="text-center py-12 text-slate-450 italic font-medium">No support tickets created.</div>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTicket(t)}
                        className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white/60 hover:bg-white transition-all flex items-center justify-between gap-4 cursor-pointer shadow-sm"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-850 line-clamp-1">{t.subject}</p>
                          <span className="text-[10px] text-slate-450 block font-semibold">Created: {new Date(t.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase ${t.status === 'OPEN' ? 'bg-brand-indigo/10 text-brand-indigo' : t.status === 'IN_PROGRESS' ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-400'}`}>
                            {t.status}
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB 4: SETTINGS & PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-800">Settings & Profile</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Profile Details card */}
                <div className="p-6 rounded-2xl border border-slate-200 bg-white/50 space-y-4 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-455 uppercase tracking-wider">User details</h3>
                  <table className="w-full text-left text-xs space-y-3 font-semibold">
                    <tbody>
                      <tr>
                        <td className="py-2 text-slate-500">Name:</td>
                        <td className="py-2 font-bold text-slate-800">{user.name}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-slate-500">Email Address:</td>
                        <td className="py-2 font-bold text-slate-800">{user.email}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-slate-500">System Role:</td>
                        <td className="py-2 font-bold text-slate-450 capitalize">{user.role}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-slate-500">Joined Date:</td>
                        <td className="py-2 font-bold text-slate-800">{new Date(user.createdAt).toLocaleDateString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Password reset simulation */}
                <div className="p-6 rounded-2xl border border-slate-200 bg-white/50 space-y-4 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-455 uppercase tracking-wider">Security Password</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    To modify your login credential security controls or enable multi-factor Google integration, contact network audit teams.
                  </p>
                  <button
                    onClick={() => alert('Password reset links have been simulated to email!')}
                    className="w-full py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                  >
                    Request Password Reset
                  </button>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}
