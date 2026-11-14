import React, { useEffect, useState } from 'react';
import { BriefcaseMedical, KeyRound, MessageSquare, Package, User, Users } from 'lucide-react';
import type { AuthUser, Enquiry, Order } from '../types';
import { apiFetch, formatINR } from '../lib/api';

interface AdvisorDashboardProps {
  user: AuthUser;
  onUserUpdated: (user: AuthUser) => void;
  onLogout: () => void;
}

export const AdvisorDashboard: React.FC<AdvisorDashboardProps> = ({
  user,
  onUserUpdated,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'enquiries' | 'clients' | 'orders' | 'profile' | 'security'>('enquiries');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [clients, setClients] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [profileForm, setProfileForm] = useState({
    fullName: user.full_name,
    phone: user.phone || '',
    specialization: user.specialization || '',
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [enquiryDrafts, setEnquiryDrafts] = useState<Record<number, { status: string; advisorNotes: string }>>({});

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/advisor/dashboard');
      setClients(data.assignedClients || []);
      setEnquiries(data.assignedEnquiries || []);
      setOrders(data.assignedOrders || []);
      const drafts: Record<number, { status: string; advisorNotes: string }> = {};
      for (const e of data.assignedEnquiries || []) {
        drafts[e.id] = { status: e.status, advisorNotes: e.advisor_notes || '' };
      }
      setEnquiryDrafts(drafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load advisor dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleSaveEnquiry = async (enquiryId: number) => {
    setError(null);
    setNotice(null);
    const draft = enquiryDrafts[enquiryId];
    if (!draft) return;
    try {
      await apiFetch(`/api/advisor/enquiries/${enquiryId}`, {
        method: 'PATCH',
        body: JSON.stringify(draft),
      });
      setNotice('Customer enquiry updated.');
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update enquiry.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch<{ user: AuthUser }>('/api/advisor/profile', {
        method: 'PUT',
        body: JSON.stringify(profileForm),
      });
      onUserUpdated(res.user);
      setNotice('Advisor profile updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profile update failed.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(passwordForm),
      });
      setNotice(res.message);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed.');
    }
  };

  const handleResendVerification = async () => {
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/resend-verification', { method: 'POST' });
      setNotice(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send verification email.');
    }
  };

  return (
    <main className="bg-slate-50 min-h-[82vh] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#0B2246] text-teal-300 flex items-center justify-center shrink-0">
              <BriefcaseMedical className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#0D9488]">Advisor Portal · DNA GENEIE</p>
              <h1 className="text-2xl font-display font-bold text-[#0B2246]">{user.full_name}</h1>
              <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                <span>
                  {user.specialization || 'Clinical Wellness Advisor'} · {user.email}
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-semibold ${
                    user.email_verified ? 'bg-teal-50 text-teal-800' : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {user.email_verified ? 'Email Verified' : 'Email Unverified'}
                </span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {!user.email_verified && (
              <button
                type="button"
                onClick={handleResendVerification}
                className="px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold hover:bg-amber-100 cursor-pointer"
              >
                Resend Verification Email
              </button>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Secure Logout
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500">Assigned Customer Enquiries</p>
            <p className="text-2xl font-mono font-bold text-[#0B2246] mt-1">{enquiries.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500">Assigned Customers</p>
            <p className="text-2xl font-mono font-bold text-[#0D9488] mt-1">{clients.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs text-slate-500">Assigned Customer Orders</p>
            <p className="text-2xl font-mono font-bold text-[#0B2246] mt-1">{orders.length}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl border border-slate-200">
          {[
            { id: 'enquiries', label: `Assigned Enquiries (${enquiries.length})`, icon: MessageSquare },
            { id: 'clients', label: `Assigned Clients (${clients.length})`, icon: Users },
            { id: 'orders', label: `Client Orders (${orders.length})`, icon: Package },
            { id: 'profile', label: 'Advisor Profile', icon: User },
            { id: 'security', label: 'Security', icon: KeyRound },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === tab.id ? 'bg-[#0B2246] text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {error && <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>}
        {notice && <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-sm text-teal-800">{notice}</div>}

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
            Loading assigned advisor workspace...
          </div>
        ) : (
          <>
            {activeTab === 'enquiries' && (
              <div className="space-y-4">
                {enquiries.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
                    No customer enquiries are currently assigned to your advisor account.
                  </div>
                ) : (
                  enquiries.map((enq) => {
                    const draft = enquiryDrafts[enq.id] || { status: enq.status, advisorNotes: enq.advisor_notes || '' };
                    return (
                      <div key={enq.id} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold text-[#0D9488]">{enq.subject || enq.interest_product}</p>
                            <h3 className="text-lg font-bold text-[#0B2246] mt-0.5">{enq.name}</h3>
                            <p className="text-xs text-slate-500">
                              {enq.email} · {enq.phone} · Submitted {enq.created_at.slice(0, 10)}
                            </p>
                          </div>
                          <select
                            value={draft.status}
                            onChange={(e) =>
                              setEnquiryDrafts((d) => ({
                                ...d,
                                [enq.id]: { ...draft, status: e.target.value },
                              }))
                            }
                            className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        </div>

                        <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                          {enq.message}
                        </p>

                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-slate-600">Advisor Consultation Notes</label>
                          <textarea
                            rows={2}
                            value={draft.advisorNotes}
                            onChange={(e) =>
                              setEnquiryDrafts((d) => ({
                                ...d,
                                [enq.id]: { ...draft, advisorNotes: e.target.value },
                              }))
                            }
                            placeholder="Record follow-up notes..."
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSaveEnquiry(enq.id)}
                          className="px-4 py-2 rounded-xl bg-[#0B2246] text-white text-xs font-semibold cursor-pointer"
                        >
                          Save Enquiry Update
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'clients' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-display font-bold text-[#0B2246]">Assigned Customer Registrations</h2>
                </div>
                {clients.length === 0 ? (
                  <p className="p-8 text-sm text-slate-500">No customers are assigned to you yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Full Name</th>
                          <th className="py-3 px-4 font-semibold">Username</th>
                          <th className="py-3 px-4 font-semibold">Email</th>
                          <th className="py-3 px-4 font-semibold">Phone</th>
                          <th className="py-3 px-4 font-semibold">Registered</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {clients.map((c) => (
                          <tr key={c.id}>
                            <td className="py-3 px-4 font-semibold text-[#0B2246]">{c.full_name}</td>
                            <td className="py-3 px-4 font-mono text-xs">@{c.username}</td>
                            <td className="py-3 px-4">{c.email}</td>
                            <td className="py-3 px-4">{c.phone}</td>
                            <td className="py-3 px-4 font-mono text-xs">{c.created_at.slice(0, 10)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-display font-bold text-[#0B2246]">Assigned Customer Orders</h2>
                </div>
                {orders.length === 0 ? (
                  <p className="p-8 text-sm text-slate-500">No assigned customer orders yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Order #</th>
                          <th className="py-3 px-4 font-semibold">Customer</th>
                          <th className="py-3 px-4 font-semibold">Tests</th>
                          <th className="py-3 px-4 font-semibold">Order Status</th>
                          <th className="py-3 px-4 font-semibold text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {orders.map((o) => (
                          <tr key={o.id}>
                            <td className="py-3 px-4 font-mono text-xs font-semibold">{o.order_number}</td>
                            <td className="py-3 px-4">{o.customer_name}</td>
                            <td className="py-3 px-4 text-xs">{o.items.map((i) => i.name).join(', ')}</td>
                            <td className="py-3 px-4 capitalize text-xs font-semibold text-[#0D9488]">
                              {o.order_status.replace(/_/g, ' ')}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums font-bold">
                              {formatINR(o.total_inr)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="max-w-lg bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <h2 className="text-lg font-display font-bold text-[#0B2246]">Advisor Profile Information</h2>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Specialization</label>
                  <input
                    type="text"
                    value={profileForm.specialization}
                    onChange={(e) => setProfileForm((f) => ({ ...f, specialization: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0B2246] text-white text-sm font-semibold cursor-pointer"
                >
                  Save Profile
                </button>
              </form>
            )}

            {activeTab === 'security' && (
              <form onSubmit={handleChangePassword} className="max-w-lg bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <h2 className="text-lg font-display font-bold text-[#0B2246]">Update Advisor Password</h2>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((s) => ({ ...s, currentPassword: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (8+ chars)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((s) => ({ ...s, newPassword: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((s) => ({ ...s, confirmPassword: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0B2246] text-white text-sm font-semibold cursor-pointer"
                >
                  Update Password
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
};
