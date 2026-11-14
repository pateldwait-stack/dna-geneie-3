import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Dna,
  Download,
  FileText,
  Heart,
  KeyRound,
  MapPin,
  Package,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import type {
  ActiveRoute,
  AuthUser,
  DnaKit,
  GeneticReport,
  Order,
  PaymentRecord,
  Product,
  RefundRequest,
  SavedAddress,
} from '../types';
import { apiFetch, formatINR } from '../lib/api';
import { getProductImage } from '../lib/assets';
import { InvoiceModal } from './InvoiceModal';

interface MemberDashboardProps {
  user: AuthUser;
  products: Product[];
  wishlistSlugs: string[];
  onToggleWishlist: (slug: string) => void;
  onAddToCart: (item: { itemType: 'product' | 'bundle'; slug: string; name: string; unitPriceInr: number }) => void;
  onUserUpdated: (user: AuthUser) => void;
  onNavigate: (route: ActiveRoute) => void;
  onLogout: () => void;
}

const ORDER_STEPS = [
  { key: 'placed', label: 'Order Placed' },
  { key: 'kit_dispatched', label: 'Kit Dispatched' },
  { key: 'sample_received', label: 'Sample Received' },
  { key: 'lab_processing', label: 'Lab Processing' },
  { key: 'report_ready', label: 'Report Ready' },
];

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  user,
  products,
  wishlistSlugs,
  onToggleWishlist,
  onAddToCart,
  onUserUpdated,
  onNavigate,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'orders' | 'addresses' | 'wishlist' | 'kits' | 'reports' | 'payments' | 'privacy' | 'security'
  >('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [kits, setKits] = useState<DnaKit[]>([]);
  const [reports, setReports] = useState<GeneticReport[]>([]);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [advisor, setAdvisor] = useState<{ full_name: string; email: string; phone: string; specialization: string } | null>(
    null
  );

  const [profileForm, setProfileForm] = useState({ fullName: user.full_name, phone: user.phone || '' });
  const [kitForm, setKitForm] = useState({
    kitBarcode: '',
    productSlug: 'nutrig',
    recipientName: user.full_name,
    orderId: '',
  });
  const [addressForm, setAddressForm] = useState({
    label: 'Home',
    fullName: user.full_name,
    phone: user.phone || '',
    addressLine: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: true,
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [selectedReport, setSelectedReport] = useState<GeneticReport | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  // Order cancellation / refund inline prompts
  const [actionOrder, setActionOrder] = useState<{ id: number; type: 'cancel' | 'refund'; orderNumber: string } | null>(
    null
  );
  const [actionReason, setActionReason] = useState('');

  // DPDP Privacy state
  const [consentGenomic, setConsentGenomic] = useState(user.consent_genomic !== 0);
  const [consentMarketing, setConsentMarketing] = useState(user.consent_marketing === 1);
  const [deleteReason, setDeleteReason] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/member/dashboard');
      setOrders(data.orders || []);
      setPayments(data.payments || []);
      setKits(data.kits || []);
      setReports(data.reports || []);
      setAddresses(data.addresses || []);
      setRefunds(data.refunds || []);
      setAdvisor(data.advisor || null);
      if (data.profile) {
        onUserUpdated(data.profile);
        setConsentGenomic(data.profile.consent_genomic !== 0);
        setConsentMarketing(data.profile.consent_marketing === 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load member dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch<{ user: AuthUser }>('/api/member/profile', {
        method: 'PUT',
        body: JSON.stringify(profileForm),
      });
      onUserUpdated(res.user);
      setNotice('Profile information updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await apiFetch('/api/member/addresses', {
        method: 'POST',
        body: JSON.stringify(addressForm),
      });
      setNotice('Delivery address saved.');
      setAddressForm((f) => ({
        ...f,
        addressLine: '',
        city: '',
        state: '',
        pincode: '',
        isDefault: false,
      }));
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save address.');
    }
  };

  const handleDeleteAddress = async (id: number) => {
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/member/addresses/${id}`, { method: 'DELETE' });
      setNotice('Delivery address removed.');
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove address.');
    }
  };

  const handleOrderActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionOrder) return;
    setError(null);
    setNotice(null);
    try {
      const endpoint =
        actionOrder.type === 'cancel'
          ? `/api/member/orders/${actionOrder.id}/cancel`
          : `/api/member/orders/${actionOrder.id}/refund`;
      const res = await apiFetch<{ message: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ reason: actionReason }),
      });
      setNotice(res.message);
      setActionOrder(null);
      setActionReason('');
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order action failed.');
    }
  };

  const handleRegisterKit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch<{ message: string }>('/api/member/kits/register', {
        method: 'POST',
        body: JSON.stringify({
          ...kitForm,
          orderId: kitForm.orderId ? Number(kitForm.orderId) : undefined,
        }),
      });
      setNotice(res.message);
      setKitForm((f) => ({ ...f, kitBarcode: '' }));
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register kit.');
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

  const handleResendVerify = async () => {
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/resend-verification', { method: 'POST' });
      setNotice(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend verification email.');
    }
  };

  const handleUpdateConsents = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch<{ user: AuthUser; message: string }>('/api/member/privacy/consent', {
        method: 'PUT',
        body: JSON.stringify({ consentGenomic, consentMarketing }),
      });
      onUserUpdated(res.user);
      setNotice(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update privacy consents.');
    }
  };

  const handleExportMyData = async () => {
    setError(null);
    setNotice(null);
    try {
      const payload = await apiFetch('/api/member/privacy/export');
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dnageneie-personal-data-${user.username || user.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setNotice('Personal data export downloaded (DPDP Act compliance).');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to export personal data.');
    }
  };

  const handleRequestDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch<{ message: string }>('/api/member/privacy/delete-request', {
        method: 'POST',
        body: JSON.stringify({ reason: deleteReason }),
      });
      setNotice(res.message);
      setDeleteReason('');
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit deletion request.');
    }
  };

  const wishlistProducts = products.filter((p) => wishlistSlugs.includes(p.slug));

  return (
    <main className="bg-slate-50 min-h-[82vh] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#0D9488]">Member Portal · DNA GENEIE</p>
            <h1 className="text-2xl font-display font-bold text-[#0B2246] mt-0.5">
              Welcome, {user.full_name}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              @{user.username} · {user.email} ·{' '}
              <span className={user.email_verified ? 'text-teal-700 font-semibold' : 'text-amber-700 font-semibold'}>
                {user.email_verified ? 'Email Verified' : 'Email Unverified'}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!user.email_verified && (
              <button
                type="button"
                onClick={handleResendVerify}
                className="px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold cursor-pointer"
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

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200">
          {[
            { id: 'overview', label: 'Profile', icon: User },
            { id: 'orders', label: `Orders (${orders.length})`, icon: Package },
            { id: 'addresses', label: `Addresses (${addresses.length})`, icon: MapPin },
            { id: 'wishlist', label: `Wishlist (${wishlistProducts.length})`, icon: Heart },
            { id: 'kits', label: `DNA Kits (${kits.length})`, icon: Dna },
            { id: 'reports', label: `Reports (${reports.length})`, icon: FileText },
            { id: 'payments', label: `Payments (${payments.length})`, icon: CreditCard },
            { id: 'privacy', label: 'Privacy & DPDP', icon: Shield },
            { id: 'security', label: 'Security', icon: KeyRound },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#0B2246] text-white'
                    : 'text-slate-600 hover:text-[#0B2246] hover:bg-slate-50'
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
            Loading your encrypted member records...
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={handleProfileSave}
                  className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
                >
                  <h2 className="text-lg font-display font-bold text-[#0B2246]">Personal Information</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={profileForm.fullName}
                        onChange={(e) => setProfileForm((f) => ({ ...f, fullName: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Username</label>
                      <input
                        type="text"
                        disabled
                        value={user.username || ''}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                      <input
                        type="email"
                        disabled
                        value={user.email}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl dna-gradient-bg text-white text-sm font-semibold cursor-pointer"
                  >
                    Save Profile
                  </button>
                </form>

                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                  <h2 className="text-lg font-display font-bold text-[#0B2246]">Account & Advisor Summary</h2>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-xs text-slate-500">Purchased Orders</p>
                      <p className="text-2xl font-mono tabular-nums font-bold text-[#0B2246] mt-1">{orders.length}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-xs text-slate-500">Available Reports</p>
                      <p className="text-2xl font-mono tabular-nums font-bold text-[#0D9488] mt-1">{reports.length}</p>
                    </div>
                  </div>
                  {advisor ? (
                    <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 space-y-1 text-sm">
                      <p className="text-xs font-semibold text-[#0D9488]">Assigned DNA GENEIE Advisor</p>
                      <p className="font-bold text-[#0B2246]">{advisor.full_name}</p>
                      <p className="text-xs text-slate-600">{advisor.specialization}</p>
                      <p className="text-xs text-slate-600">{advisor.email} · {advisor.phone}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      An advisor will be assigned once your DNA kit or consultation is active.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-4">
                {actionOrder && (
                  <form
                    onSubmit={handleOrderActionSubmit}
                    className="bg-white rounded-2xl border border-[#0B2246] p-5 space-y-3 shadow-sm"
                  >
                    <h3 className="text-sm font-bold text-[#0B2246]">
                      {actionOrder.type === 'cancel'
                        ? `Cancel Order ${actionOrder.orderNumber}`
                        : `Request Refund for Order ${actionOrder.orderNumber}`}
                    </h3>
                    <input
                      type="text"
                      required
                      placeholder="Please share your reason (e.g. incorrect address, duplicate order)"
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#0B2246] text-white text-xs font-semibold cursor-pointer"
                      >
                        {actionOrder.type === 'cancel' ? 'Confirm Cancellation' : 'Submit Refund Request'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActionOrder(null);
                          setActionReason('');
                        }}
                        className="px-3 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </form>
                )}

                {orders.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
                    No DNA test orders found on your account yet.
                  </div>
                ) : (
                  orders.map((order) => {
                    const isCancelled = order.order_status === 'cancelled';
                    const stepIndex = ORDER_STEPS.findIndex((s) => s.key === order.order_status);
                    const canCancel = !isCancelled && !['lab_processing', 'report_ready'].includes(order.order_status);
                    const openRefund = refunds.find((r) => r.order_id === order.id);
                    const canRequestRefund = order.payment_status === 'verified' && !openRefund;

                    return (
                      <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-xs text-slate-500 font-mono">
                              Order {order.order_number} · Invoice {order.invoice_number || `INV-${order.order_number}`} ·
                              Tracking {order.tracking_code}
                            </p>
                            <h3 className="text-base font-bold text-[#0B2246] mt-0.5">
                              {order.items.map((i) => `${i.name} (×${i.quantity})`).join(', ')}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                              Ship to: {order.shipping_address}, {order.city}, {order.state} - {order.pincode}
                            </p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-lg font-mono tabular-nums font-bold text-[#0B2246]">
                              {formatINR(order.total_inr)}
                            </p>
                            <p className="text-xs text-slate-500 capitalize">
                              Payment: {order.payment_status} · {order.payment_method}
                            </p>
                          </div>
                        </div>

                        {isCancelled ? (
                          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                            <XCircle className="w-4 h-4 shrink-0" />
                            <span>
                              Order Cancelled{order.cancellation_reason ? ` — ${order.cancellation_reason}` : ''}
                            </span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                            {ORDER_STEPS.map((step, idx) => {
                              const reached = idx <= stepIndex;
                              return (
                                <div
                                  key={step.key}
                                  className={`p-3 rounded-xl border text-xs ${
                                    reached
                                      ? 'border-teal-300 bg-teal-50/70 text-[#0B2246] font-semibold'
                                      : 'border-slate-200 bg-slate-50 text-slate-400'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <CheckCircle2
                                      className={`w-3.5 h-3.5 ${reached ? 'text-[#0D9488]' : 'text-slate-300'}`}
                                    />
                                    <span>{step.label}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setInvoiceOrder(order)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-[#0B2246] hover:bg-slate-50 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Tax Invoice</span>
                            </button>
                            {canCancel && (
                              <button
                                type="button"
                                onClick={() =>
                                  setActionOrder({ id: order.id, type: 'cancel', orderNumber: order.order_number })
                                }
                                className="px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                              >
                                Cancel Order
                              </button>
                            )}
                            {canRequestRefund && (
                              <button
                                type="button"
                                onClick={() =>
                                  setActionOrder({ id: order.id, type: 'refund', orderNumber: order.order_number })
                                }
                                className="px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-semibold text-amber-800 hover:bg-amber-50 cursor-pointer"
                              >
                                Request Refund
                              </button>
                            )}
                          </div>
                          {openRefund && (
                            <span className="text-xs font-semibold text-[#0B2246] capitalize">
                              Refund Status: {openRefund.status}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={handleSaveAddress}
                  className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 h-fit"
                >
                  <h2 className="text-lg font-display font-bold text-[#0B2246]">Add Delivery Address</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Label</label>
                      <input
                        type="text"
                        required
                        value={addressForm.label}
                        onChange={(e) => setAddressForm((f) => ({ ...f, label: e.target.value }))}
                        placeholder="Home / Clinic"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Recipient Name</label>
                      <input
                        type="text"
                        required
                        value={addressForm.fullName}
                        onChange={(e) => setAddressForm((f) => ({ ...f, fullName: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={addressForm.phone}
                      onChange={(e) => setAddressForm((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
                    <textarea
                      rows={2}
                      required
                      value={addressForm.addressLine}
                      onChange={(e) => setAddressForm((f) => ({ ...f, addressLine: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                      <input
                        type="text"
                        required
                        value={addressForm.city}
                        onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                      <input
                        type="text"
                        required
                        value={addressForm.state}
                        onChange={(e) => setAddressForm((f) => ({ ...f, state: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code</label>
                      <input
                        type="text"
                        required
                        value={addressForm.pincode}
                        onChange={(e) => setAddressForm((f) => ({ ...f, pincode: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addressForm.isDefault}
                      onChange={(e) => setAddressForm((f) => ({ ...f, isDefault: e.target.checked }))}
                      className="rounded border-slate-300 text-[#0D9488]"
                    />
                    <span>Set as default delivery address</span>
                  </label>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl dna-gradient-bg text-white text-sm font-semibold cursor-pointer"
                  >
                    Save Delivery Address
                  </button>
                </form>

                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                  <h2 className="text-lg font-display font-bold text-[#0B2246]">Saved Delivery Addresses</h2>
                  {addresses.length === 0 ? (
                    <p className="text-sm text-slate-500 py-6">No saved delivery addresses yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {addresses.map((addr) => (
                        <div key={addr.id} className="p-4 rounded-xl border border-slate-200 space-y-2 relative">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#0D9488] uppercase">
                              {addr.label} {addr.is_default ? '· Default' : ''}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer"
                              aria-label="Delete address"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-sm font-bold text-[#0B2246]">{addr.full_name}</p>
                          <p className="text-xs text-slate-600">
                            {addr.address_line}, {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                          <p className="text-xs text-slate-500">{addr.phone}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'wishlist' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
                <h2 className="text-lg font-display font-bold text-[#0B2246]">Saved DNA Panels Wishlist</h2>
                {wishlistProducts.length === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center">
                    Your wishlist is empty. Save NutriG, FitG, or DermaG from the storefront to track them here.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {wishlistProducts.map((prod) => (
                      <div key={prod.slug} className="rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
                        <div className="aspect-[16/10] bg-slate-100 overflow-hidden">
                          <img
                            src={getProductImage(prod.slug, prod.image_url)}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-[#0D9488]">{prod.category}</p>
                            <h3 className="text-base font-bold text-[#0B2246]">{prod.name}</h3>
                            <p className="text-sm font-mono tabular-nums font-bold text-[#0B2246] mt-1">
                              {prod.status === 'coming_soon' ? 'Coming Soon' : formatINR(prod.price_inr)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {prod.status === 'available' && prod.price_inr ? (
                              <button
                                type="button"
                                onClick={() =>
                                  onAddToCart({
                                    itemType: 'product',
                                    slug: prod.slug,
                                    name: prod.name,
                                    unitPriceInr: prod.price_inr!,
                                  })
                                }
                                className="flex-1 py-2 px-3 rounded-xl dna-gradient-bg text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <ShoppingBag className="w-3.5 h-3.5" />
                                <span>Add to Cart</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onNavigate({ page: 'product', slug: prod.slug })}
                                className="flex-1 py-2 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-[#0B2246] cursor-pointer"
                              >
                                View Panel
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onToggleWishlist(prod.slug)}
                              className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 cursor-pointer"
                              aria-label="Remove from wishlist"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'kits' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={handleRegisterKit}
                  className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 h-fit"
                >
                  <h2 className="text-lg font-display font-bold text-[#0B2246]">Register a DNA Test Kit</h2>
                  <p className="text-xs text-slate-600">
                    Enter the unique barcode printed on your sample collection tube before mailing it to our laboratory.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Kit Barcode</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. DG-NUTRI-84920"
                      value={kitForm.kitBarcode}
                      onChange={(e) => setKitForm((f) => ({ ...f, kitBarcode: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">DNA Test Panel</label>
                    <select
                      value={kitForm.productSlug}
                      onChange={(e) => setKitForm((f) => ({ ...f, productSlug: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                    >
                      <option value="nutrig">NutriG — Nutrition & Nutrigenomics</option>
                      <option value="fitg">FitG — Fitness & Athletic Performance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Sample Recipient Name</label>
                    <input
                      type="text"
                      required
                      value={kitForm.recipientName}
                      onChange={(e) => setKitForm((f) => ({ ...f, recipientName: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  {orders.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Link to Order (Optional)</label>
                      <select
                        value={kitForm.orderId}
                        onChange={(e) => setKitForm((f) => ({ ...f, orderId: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                      >
                        <option value="">Select Order</option>
                        {orders.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.order_number} ({formatINR(o.total_inr)})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl dna-gradient-bg text-white text-sm font-semibold cursor-pointer"
                  >
                    Register DNA Kit
                  </button>
                </form>

                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                  <h2 className="text-lg font-display font-bold text-[#0B2246]">Registered Kits</h2>
                  {kits.length === 0 ? (
                    <p className="text-sm text-slate-500 py-6">No DNA kits registered yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {kits.map((kit) => (
                        <div
                          key={kit.id}
                          className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4"
                        >
                          <div>
                            <p className="font-mono text-sm font-bold text-[#0B2246]">{kit.kit_barcode}</p>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {kit.product_name} · Recipient: {kit.recipient_name}
                            </p>
                          </div>
                          <span className="text-xs font-semibold capitalize px-3 py-1 rounded-md bg-slate-100 text-[#0B2246]">
                            {kit.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="space-y-4">
                {reports.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
                    <ClipboardList className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-base font-semibold text-[#0B2246]">No verified DNA reports available yet</p>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                      Once your registered DNA kit completes laboratory processing and clinical verification, your personalized AES-256 encrypted report will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-5 space-y-3">
                      {reports.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setSelectedReport(r)}
                          className={`w-full text-left p-5 rounded-2xl border transition-colors cursor-pointer ${
                            (selectedReport?.id || reports[0]?.id) === r.id
                              ? 'border-[#0D9488] bg-teal-50/40'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <p className="text-xs font-semibold text-[#0D9488]">{r.product_name}</p>
                          <h3 className="text-base font-bold text-[#0B2246] mt-1">{r.report_title}</h3>
                          <p className="text-xs text-slate-500 mt-1 font-mono">
                            {r.markers_analyzed} markers · Verified {r.published_at.slice(0, 10)}
                          </p>
                        </button>
                      ))}
                    </div>

                    <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
                      {(() => {
                        const rep = selectedReport || reports[0];
                        if (!rep) return null;
                        return (
                          <div className="space-y-5">
                            <div className="border-b border-slate-200 pb-4">
                              <p className="text-xs font-semibold text-[#0D9488]">{rep.product_name} Verified Report</p>
                              <h2 className="text-2xl font-display font-bold text-[#0B2246] mt-1">{rep.report_title}</h2>
                              <p className="text-xs text-slate-500 mt-1">
                                Verified by {rep.verified_by} · {rep.markers_analyzed} markers analyzed
                              </p>
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-[#0B2246] mb-2">Clinical Summary</h3>
                              <p className="text-sm text-slate-600 leading-relaxed">{rep.summary}</p>
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-[#0B2246] mb-2">Personalized Recommendations</h3>
                              <ul className="space-y-2 text-sm text-slate-700">
                                {rep.recommendations.map((rec, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <ShieldCheck className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-display font-bold text-[#0B2246]">Payment History (INR)</h2>
                </div>
                {payments.length === 0 ? (
                  <p className="p-8 text-sm text-slate-500">No payment transactions recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Order</th>
                          <th className="py-3 px-4 font-semibold">Transaction Ref</th>
                          <th className="py-3 px-4 font-semibold">Method</th>
                          <th className="py-3 px-4 font-semibold">Status</th>
                          <th className="py-3 px-4 font-semibold text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payments.map((p) => (
                          <tr key={p.id}>
                            <td className="py-3 px-4 font-mono text-xs">{p.order_number}</td>
                            <td className="py-3 px-4 font-mono text-xs">{p.transaction_ref}</td>
                            <td className="py-3 px-4">{p.gateway}</td>
                            <td className="py-3 px-4 capitalize font-semibold text-[#0D9488]">{p.status}</td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums font-bold">
                              {formatINR(p.amount_inr)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={handleUpdateConsents}
                  className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
                >
                  <h2 className="text-lg font-display font-bold text-[#0B2246]">DPDP Act Consent Preferences</h2>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Under India’s Digital Personal Data Protection (DPDP) Act, you control how your personal and genomic data is used.
                  </p>
                  <label className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentGenomic}
                      onChange={(e) => setConsentGenomic(e.target.checked)}
                      className="mt-1 rounded border-slate-300 text-[#0D9488]"
                    />
                    <span>Consent to AES-256 encrypted DNA kit processing & clinical wellness reporting</span>
                  </label>
                  <label className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentMarketing}
                      onChange={(e) => setConsentMarketing(e.target.checked)}
                      className="mt-1 rounded border-slate-300 text-[#0D9488]"
                    />
                    <span>Receive panel launch updates (e.g. DermaG) and clinical wellness offers</span>
                  </label>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl dna-gradient-bg text-white text-sm font-semibold cursor-pointer"
                  >
                    Update Privacy Consents
                  </button>
                </form>

                <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-lg font-display font-bold text-[#0B2246]">Data Portability & Erasure</h2>
                    <p className="text-xs text-slate-600">
                      Download a complete JSON copy of your profile, saved addresses, orders, DNA kits, and decrypted reports.
                    </p>
                    <button
                      type="button"
                      onClick={handleExportMyData}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#0B2246] text-[#0B2246] text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download My Personal Data (JSON)</span>
                    </button>
                  </div>

                  <form onSubmit={handleRequestDeletion} className="pt-5 border-t border-slate-200 space-y-3">
                    <h3 className="text-sm font-bold text-rose-700">Right to Erasure / Account Deletion Request</h3>
                    {user.deletion_requested_at ? (
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                        Deletion request logged on {user.deletion_requested_at.slice(0, 10)}. Our compliance team is processing it.
                      </p>
                    ) : (
                      <>
                        <input
                          type="text"
                          required
                          placeholder="Reason for data deletion request"
                          value={deleteReason}
                          onChange={(e) => setDeleteReason(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 cursor-pointer"
                        >
                          Submit Erasure Request
                        </button>
                      </>
                    )}
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <form
                onSubmit={handleChangePassword}
                className="max-w-lg bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
              >
                <h2 className="text-lg font-display font-bold text-[#0B2246]">Change Password</h2>
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

      <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
    </main>
  );
};
