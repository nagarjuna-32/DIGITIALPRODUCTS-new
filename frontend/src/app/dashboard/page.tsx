'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { 
  Database, User as UserIcon, Shield, Download, LifeBuoy, Settings, CheckCircle, 
  HelpCircle, ChevronRight, MessageSquare, AlertCircle, ArrowRight, Loader2
} from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'CLOSED' | 'IN_PROGRESS';
  createdAt: string;
  replies: string | any[];
}

export default function UserDashboard() {
  const router = useRouter();
  const { user, token, isAuthenticated, initialize, logout, fetchProfile } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'purchases' | 'downloads' | 'support' | 'profile'>('purchases');
  const [loading, setLoading] = useState(true);

  // Tickets State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Downloads state
  const [downloads, setDownloads] = useState<any[]>([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const authCheck = async () => {
      await initialize();
      if (!useAuthStore.getState().isAuthenticated) {
        router.push('/auth/login?redirect=/dashboard');
      } else {
        setLoading(false);
        loadDashboardData();
      }
    };
    authCheck();
  }, [initialize, router]);

  const loadDashboardData = async () => {
    try {
      const activeToken = useAuthStore.getState().token;
      if (!activeToken) return;

      // Fetch support tickets
      const tickRes = await fetch(`${API_URL}/tickets`, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });
      if (tickRes.ok) {
        const tickData = await tickRes.json();
        setTickets(tickData.tickets);
      }

      // Fetch mock downloads history
      setDownloads([
        { id: 'dl_1', title: 'Editing Assets Premium Bundle Pack v1.0', downloadedAt: new Date(Date.now() - 3600000 * 24).toISOString(), size: '35 MB' },
        { id: 'dl_2', title: 'Graphics Assets Premium Bundle Pack v2.0', downloadedAt: new Date(Date.now() - 3600000 * 48).toISOString(), size: '60 MB' },
      ]);

    } catch (e) {
      console.error(e);
    }
  };

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

      const data = await res.json();
      if (res.ok) {
        setTickets([data.ticket, ...tickets]);
        setTicketSubject('');
        setTicketMessage('');
        setNewTicketOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

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

      const data = await res.json();
      if (res.ok) {
        setActiveTicket(data.ticket);
        setReplyText('');
        setTickets(tickets.map(t => t.id === data.ticket.id ? data.ticket : t));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const parseReplies = (ticket: Ticket) => {
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
      <div className="flex justify-center items-center py-44 flex-grow bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-white" />
      </div>
    );
  }

  if (!user) return null;

  const hasFullAccess = user.role === 'ADMIN' || user.accessList?.some(a => a.accessType === 'FULL_VAULT');
  const unlockedCategoriesCount = user.accessList?.filter(a => a.accessType === 'SINGLE_CATEGORY').length || 0;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 flex-grow bg-black">
      
      {/* Dashboard Top Hero */}
      <div className="p-8 rounded-xl border border-white/5 bg-[#09090b]/60 backdrop-blur-md mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-[200px] w-[200px] bg-white/2 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-white text-black flex items-center justify-center text-xl font-bold uppercase shadow-md shadow-white/5">
            {user.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-1.5">
              Hello, {user.name}! 
              {user.role === 'ADMIN' && <span className="text-[10px] bg-white/10 text-white border border-white/20 px-2 py-0.5 rounded">ADMIN</span>}
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">Joined Vault on {new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Access Metrics */}
        <div className="flex gap-4">
          <div className="px-5 py-3 rounded-lg border border-white/5 bg-white/5">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold">Vault Tier</span>
            <p className="text-sm font-bold text-white mt-0.5">
              {hasFullAccess ? 'Full Vault Access' : unlockedCategoriesCount > 0 ? 'Single Category Access' : 'No Active Access'}
            </p>
          </div>
          {!hasFullAccess && (
            <Link
              href="/#pricing"
              className="px-5 py-3 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer self-center"
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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${activeTab === 'purchases' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
          >
            <CheckCircle className="h-4 w-4" /> Active Purchases
          </button>
          <button
            onClick={() => setActiveTab('downloads')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${activeTab === 'downloads' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Download className="h-4 w-4" /> Downloads History
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${activeTab === 'support' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
          >
            <LifeBuoy className="h-4 w-4" /> Support Tickets
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${activeTab === 'profile' ? 'bg-white text-black shadow-md' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
          >
            <Settings className="h-4 w-4" /> Settings & Profile
          </button>

          <button
            onClick={() => { logout(); router.push('/'); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer"
          >
            <Shield className="h-4 w-4" /> Sign Out
          </button>
        </aside>

        {/* Tab Detail Pane */}
        <main className="lg:col-span-9 p-8 rounded-xl border border-white/5 bg-[#09090b]/40 min-h-[420px]">
          
          {/* TAB 1: PURCHASES */}
          {activeTab === 'purchases' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-white">Active Product Access</h2>
              
              {hasFullAccess ? (
                /* Full Vault Unlocked Banner */
                <div className="p-6 rounded-xl border border-white/10 bg-white/5 space-y-3">
                  <p className="text-sm font-bold text-white flex items-center gap-1.5">
                    <CheckCircle className="h-5 w-5 text-white" /> Full Vault Lifetime Access Unlocked!
                  </p>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    You have complete download rights to all digital elements across every category listed on our site. No recurring subscriptions. Explore anything and download ZIP source files directly.
                  </p>
                  <Link
                    href="/category"
                    className="inline-flex items-center gap-1 text-xs font-bold text-white hover:underline pt-2 cursor-pointer"
                  >
                    Go browse elements catalog <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : unlockedCategoriesCount > 0 ? (
                /* Single Category unlocked grid */
                <div className="space-y-4">
                  <p className="text-xs text-zinc-400">You have active purchase permissions in the following categories:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {user.accessList?.filter(a => a.accessType === 'SINGLE_CATEGORY').map((access, idx) => (
                      <div key={idx} className="p-4 rounded-lg border border-white/5 bg-white/5 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-white">Single Category Permit</p>
                          <span className="text-[10px] text-zinc-500 font-semibold block mt-1">Expiry: Lifetime</span>
                        </div>
                        <Link
                          href="/category"
                          className="px-3 py-1.5 rounded-lg border border-white bg-transparent hover:bg-white hover:text-black text-[10px] text-white transition-all cursor-pointer font-bold"
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
                  <p className="text-sm font-bold text-zinc-400">You haven&apos;t unlocked any digital categories yet</p>
                  <p className="text-xs text-zinc-600 max-w-sm mx-auto">Standard category access starts at ₹99 one-time. Complete archive vault is ₹499 one-time.</p>
                  <Link
                    href="/#pricing"
                    className="inline-flex items-center gap-1 text-xs font-bold text-white hover:underline pt-2"
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
              <h2 className="text-lg font-bold text-white">Downloads History</h2>
              
              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/5 text-zinc-400 font-semibold uppercase">
                      <th className="p-4">Resource Filename</th>
                      <th className="p-4">Downloaded At</th>
                      <th className="p-4 text-right">File Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {downloads.map((dl) => (
                      <tr key={dl.id} className="hover:bg-white/5">
                        <td className="p-4 font-bold text-white flex items-center gap-2">
                          <Download className="h-3.5 w-3.5 text-zinc-400 shrink-0" /> {dl.title}
                        </td>
                        <td className="p-4 text-zinc-500">{new Date(dl.downloadedAt).toLocaleString()}</td>
                        <td className="p-4 text-right font-medium text-zinc-400">{dl.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SUPPORT TICKETS */}
          {activeTab === 'support' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                <h2 className="text-lg font-bold text-white">Support Tickets</h2>
                <button
                  onClick={() => { setNewTicketOpen(true); setActiveTicket(null); }}
                  className="px-4 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  Create New Ticket
                </button>
              </div>

              {newTicketOpen ? (
                /* Ticket creation form */
                <form onSubmit={handleCreateTicket} className="space-y-4 p-6 rounded-xl border border-white/5 bg-[#09090b]/60">
                  <h3 className="text-sm font-bold text-white">Open Support Query</h3>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-400 font-semibold">Subject / Title:</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Broken link inside Editing Assets"
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-200 focus:outline-none focus:border-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-400 font-semibold">Detailed Message:</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Describe your issue in detail..."
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      className="w-full p-3 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-200 focus:outline-none focus:border-white resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 font-bold text-xs cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading ? 'Submitting...' : 'Submit Ticket'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTicketOpen(false)}
                      className="px-4 py-2 rounded-lg border border-white/10 text-xs font-semibold text-zinc-300 hover:bg-white/5 cursor-pointer"
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
                    className="text-xs font-bold text-zinc-500 hover:text-white"
                  >
                    &larr; Back to Ticket List
                  </button>

                  <div className="p-5 rounded-xl border border-white/5 bg-[#09090b]/40 space-y-3">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <div>
                        <span className="text-[9px] text-zinc-500 uppercase font-semibold">Ticket ID: {activeTicket.id}</span>
                        <h3 className="text-sm font-bold text-white mt-0.5">{activeTicket.subject}</h3>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase ${activeTicket.status === 'OPEN' ? 'bg-white/10 text-white border border-white/20' : activeTicket.status === 'IN_PROGRESS' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-900 text-zinc-500'}`}>
                        {activeTicket.status}
                      </span>
                    </div>
                    
                    {/* User's Original Message */}
                    <div className="p-3.5 rounded-lg bg-white/5 space-y-1">
                      <p className="text-[10px] font-bold text-zinc-400">{user.name} (Owner)</p>
                      <p className="text-xs text-zinc-300 leading-relaxed">{activeTicket.message}</p>
                      <p className="text-[8px] text-zinc-600 mt-1">{new Date(activeTicket.createdAt).toLocaleString()}</p>
                    </div>

                    {/* Replies Map */}
                    <div className="space-y-3.5 pt-2">
                      {parseReplies(activeTicket).map((rep: any) => (
                        <div 
                          key={rep.id} 
                          className={`p-3.5 rounded-lg space-y-1 ${rep.role === 'ADMIN' ? 'bg-white/10 border-l-2 border-white ml-6' : 'bg-white/5 mr-6'}`}
                        >
                          <p className="text-[10px] font-bold text-zinc-400">{rep.name} ({rep.role})</p>
                          <p className="text-xs text-zinc-300 leading-relaxed">{rep.message}</p>
                          <p className="text-[8px] text-zinc-600 mt-1">{new Date(rep.createdAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>

                    {/* Chat Form Reply */}
                    {activeTicket.status !== 'CLOSED' && (
                      <form onSubmit={handleSendReply} className="pt-4 border-t border-white/5 flex gap-2">
                        <input
                          type="text"
                          required
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type your reply message..."
                          className="flex-grow h-10 px-3 rounded-lg border border-white/10 bg-white/5 text-xs text-zinc-200 focus:outline-none focus:border-white"
                        />
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="px-4 rounded-lg bg-white text-black hover:bg-zinc-200 font-bold text-xs cursor-pointer disabled:opacity-50"
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
                  <div className="text-center py-12 text-zinc-500 italic">No support tickets created.</div>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTicket(t)}
                        className="w-full text-left p-4 rounded-lg border border-white/5 bg-[#09090b]/15 hover:border-white/20 transition-all flex items-center justify-between gap-4 cursor-pointer"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-white line-clamp-1">{t.subject}</p>
                          <span className="text-[10px] text-zinc-500 block">Created: {new Date(t.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase ${t.status === 'OPEN' ? 'bg-white/10 text-white' : t.status === 'IN_PROGRESS' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-900 text-zinc-500'}`}>
                            {t.status}
                          </span>
                          <ChevronRight className="h-4 w-4 text-zinc-600" />
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
              <h2 className="text-lg font-bold text-white">Settings & Profile</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Profile Details card */}
                <div className="p-6 rounded-lg border border-white/5 bg-[#09090b]/40 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">User details</h3>
                  <table className="w-full text-left text-xs space-y-3">
                    <tbody>
                      <tr>
                        <td className="py-2 text-zinc-500">Name:</td>
                        <td className="py-2 font-bold text-white">{user.name}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-zinc-500">Email Address:</td>
                        <td className="py-2 font-bold text-white">{user.email}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-zinc-500">System Role:</td>
                        <td className="py-2 font-bold text-zinc-400 capitalize">{user.role}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-zinc-500">Joined Date:</td>
                        <td className="py-2 font-bold text-white">{new Date(user.createdAt).toLocaleDateString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Password reset simulation */}
                <div className="p-6 rounded-lg border border-white/5 bg-[#09090b]/40 space-y-4">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Security Password</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    To modify your login credential security controls or enable multi-factor Google integration, contact network audit teams.
                  </p>
                  <button
                    onClick={() => alert('Password reset links have been simulated to email!')}
                    className="w-full py-2.5 rounded-lg border border-white/10 hover:border-white bg-transparent text-xs font-bold text-white transition-colors cursor-pointer"
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
