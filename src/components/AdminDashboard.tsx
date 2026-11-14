import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  CreditCard,
  DatabaseBackup,
  Dna,
  Download,
  FilePlus2,
  Globe,
  KeyRound,
  Mail,
  MessageSquare,
  Package,
  Phone,
  PlusCircle,
  Search,
  ShieldAlert,
  Tag,
  Trash2,
  Users,
} from 'lucide-react';
import type {
  AuthUser,
  Bundle,
  DnaKit,
  Enquiry,
  GeneticReport,
  Order,
  PaymentRecord,
  Product,
  PromoOffer,
  RefundRequest,
} from '../types';
import { apiFetch, formatINR, getStoredToken } from '../lib/api';
import { UsaFlagIcon } from './BrandLogo';

interface AdminDashboardProps {
  user: AuthUser;
  onCatalogUpdated: () => void;
  onLogout: () => void;
}

type AdminTab =
  | 'overview'
  | 'members'
  | 'advisors'
  | 'orders'
  | 'payments'
  | 'catalog'
  | 'kits'
  | 'enquiries'
  | 'security'
  | 'compliance';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  onCatalogUpdated,
  onLogout,
}) => {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);

  // Filters
  const [customerSearch, setCustomerSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  // Compliance gate
  const [usaConfirmed, setUsaConfirmed] = useState(false);

  // Report draft
  const [reportDraft, setReportDraft] = useState({
    kitId: '',
    reportTitle: '',
    summary: '',
    recommendations: '',
    markersAnalyzed: '140',
    verifiedBy: 'DNA GENEIE Clinical Review Board',
  });

  // New Product draft
  const [newProduct, setNewProduct] = useState({
    name: '',
    slug: '',
    category: 'Precision Genomics',
    tagline: '',
    description: '',
    priceInr: '40000',
    status: 'available' as 'available' | 'coming_soon',
    stockCount: '100',
    offerLabel: '',
  });

  // New Promo draft
  const [newPromo, setNewPromo] = useState({
    code: '',
    title: '',
    description: '',
    discountType: 'flat' as 'flat' | 'percent',
    discountValue: '2000',
    minOrderInr: '40000',
  });

  // 2FA setup state
  const [totpSetup, setTotpSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [totpVerifyCode, setTotpVerifyCode] = useState('');

  // Contact settings state
  const [contactSettings, setContactSettings] = useState({
    contactEmail: 'support@dnageneie.com',
    contactPhone: '+91 90232 94189',
    contactWhatsapp: '919023294189',
    supportHours: 'Monday – Saturday, 9:30 AM – 6:30 PM IST',
  });

  const loadAdmin = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/dashboard');
      setData(res);
      setUsaConfirmed(Boolean(res.siteSettings?.usaLabSectionPublished));
      if (res.siteSettings?.contactPhone) {
        setContactSettings({
          contactEmail: res.siteSettings.contactEmail || 'support@dnageneie.com',
          contactPhone: res.siteSettings.contactPhone || '+91 90232 94189',
          contactWhatsapp: res.siteSettings.contactWhatsapp || '919023294189',
          supportHours: res.siteSettings.supportHours || 'Monday – Saturday, 9:30 AM – 6:30 PM IST',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load administrator console.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmin();
  }, []);

  const handleDownloadBinary = async (endpoint: string, filename: string) => {
    setError(null);
    setNotice(null);
    try {
      const token = getStoredToken();
      const headers = new Headers();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const res = await fetch(endpoint, { headers, credentials: 'include' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Download failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setNotice(`Downloaded ${filename} securely.`);
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.');
    }
  };

  const handleAdvisorApproval = async (advisorId: number, action: 'approve' | 'reject' | 'suspend') => {
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/advisors/${advisorId}/approval`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      setNotice(`Advisor account ${action === 'approve' ? 'approved' : action} successfully.`);
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update advisor status.');
    }
  };

  const handleAssignMemberAdvisor = async (memberId: number, advisorId: string) => {
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/members/${memberId}/assign-advisor`, {
        method: 'PATCH',
        body: JSON.stringify({ advisorId: advisorId ? Number(advisorId) : null }),
      });
      setNotice('Customer advisor assignment updated.');
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed.');
    }
  };

  const handleUpdateOrder = async (orderId: number, payload: { orderStatus?: string; paymentStatus?: string }) => {
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setNotice('Order status updated.');
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order update failed.');
    }
  };

  const handleUpdateRefund = async (refundId: number, status: string, adminNote?: string) => {
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/refunds/${refundId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminNote }),
      });
      setNotice(`Refund request marked as ${status}.`);
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refund update failed.');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await apiFetch('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          ...newProduct,
          priceInr: newProduct.priceInr ? Number(newProduct.priceInr) : null,
          stockCount: Number(newProduct.stockCount) || 100,
        }),
      });
      setNotice(`Product "${newProduct.name}" added to catalog.`);
      setNewProduct({
        name: '',
        slug: '',
        category: 'Precision Genomics',
        tagline: '',
        description: '',
        priceInr: '40000',
        status: 'available',
        stockCount: '100',
        offerLabel: '',
      });
      onCatalogUpdated();
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product.');
    }
  };

  const handleUpdateProduct = async (
    product: Product,
    payload: { priceInr: number | null; status: 'available' | 'coming_soon'; isActive: boolean; stockCount: number; offerLabel: string }
  ) => {
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setNotice(`${product.name} updated.`);
      onCatalogUpdated();
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Product update failed.');
    }
  };

  const handleUpdateBundle = async (
    bundle: Bundle,
    priceInr: number,
    status: 'available' | 'coming_soon',
    isActive: boolean
  ) => {
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/bundles/${bundle.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ priceInr, status, isActive }),
      });
      setNotice(`${bundle.name} updated.`);
      onCatalogUpdated();
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bundle update failed.');
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await apiFetch('/api/admin/promos', {
        method: 'POST',
        body: JSON.stringify({
          ...newPromo,
          discountValue: Number(newPromo.discountValue),
          minOrderInr: Number(newPromo.minOrderInr),
        }),
      });
      setNotice(`Promo code ${newPromo.code.toUpperCase()} created.`);
      setNewPromo({
        code: '',
        title: '',
        description: '',
        discountType: 'flat',
        discountValue: '2000',
        minOrderInr: '40000',
      });
      onCatalogUpdated();
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create promo code.');
    }
  };

  const handleTogglePromo = async (promo: PromoOffer) => {
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/promos/${promo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: promo.is_active !== 1 }),
      });
      setNotice(`Promo ${promo.code} ${promo.is_active === 1 ? 'disabled' : 'enabled'}.`);
      onCatalogUpdated();
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update promo.');
    }
  };

  const handleUpdateEnquiry = async (
    enquiryId: number,
    payload: { assignedAdvisorId?: number | null; status?: string }
  ) => {
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/enquiries/${enquiryId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setNotice('Enquiry assignment/status updated.');
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enquiry update failed.');
    }
  };

  const handleUpdateKitStatus = async (kitId: number, status: string) => {
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/kits/${kitId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setNotice('Kit laboratory stage updated.');
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kit update failed.');
    }
  };

  const handlePublishReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await apiFetch('/api/admin/reports', {
        method: 'POST',
        body: JSON.stringify({
          ...reportDraft,
          kitId: Number(reportDraft.kitId),
          markersAnalyzed: Number(reportDraft.markersAnalyzed),
        }),
      });
      setNotice('AES-256 encrypted DNA report published to Member Dashboard.');
      setReportDraft({
        kitId: '',
        reportTitle: '',
        summary: '',
        recommendations: '',
        markersAnalyzed: '140',
        verifiedBy: 'DNA GENEIE Clinical Review Board',
      });
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish report.');
    }
  };

  const handleToggleReportAvailability = async (report: GeneticReport) => {
    setError(null);
    setNotice(null);
    try {
      const nextStatus = report.status === 'available' ? 'processing' : 'available';
      await apiFetch(`/api/admin/reports/${report.id}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setNotice(`Report availability set to "${nextStatus}".`);
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update report visibility.');
    }
  };

  const handleToggleUsaSection = async (publish: boolean) => {
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch<{ usaLabSectionPublished: boolean }>('/api/admin/settings/usa-lab', {
        method: 'PATCH',
        body: JSON.stringify({ published: publish, ownerConfirmed: usaConfirmed }),
      });
      setNotice(
        res.usaLabSectionPublished
          ? 'USA Laboratory Standards section is now published on the homepage.'
          : 'USA Laboratory Standards section is now unpublished.'
      );
      onCatalogUpdated();
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update USA Lab section setting.');
    }
  };

  const handleStart2faSetup = async () => {
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch<{ secret: string; otpauthUrl: string }>('/api/admin/security/2fa/setup', {
        method: 'POST',
      });
      setTotpSetup(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to initiate 2FA setup.');
    }
  };

  const handleEnable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await apiFetch('/api/admin/security/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ code: totpVerifyCode }),
      });
      setTotpSetup(null);
      setTotpVerifyCode('');
      setNotice('Two-Factor Authentication (TOTP) is now ENABLED on support@dnageneie.com.');
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify 2FA code.');
    }
  };

  const handleDisable2fa = async () => {
    setError(null);
    setNotice(null);
    try {
      await apiFetch('/api/admin/security/2fa/disable', { method: 'POST' });
      setTotpSetup(null);
      setNotice('Two-Factor Authentication has been disabled.');
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to disable 2FA.');
    }
  };

  const handleSaveContactSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await apiFetch('/api/admin/settings/contact', {
        method: 'PATCH',
        body: JSON.stringify(contactSettings),
      });
      setNotice('Official business contact settings saved.');
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update contact settings.');
    }
  };

  const handleRevokeSession = async (sessionId: number) => {
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/sessions/${sessionId}`, { method: 'DELETE' });
      setNotice('Session revoked immediately.');
      await loadAdmin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke session.');
    }
  };

  const activeAdvisors = (data?.advisors || []).filter((a: any) => a.status === 'active');

  const filteredMembers = useMemo(() => {
    if (!data?.members) return [];
    const q = customerSearch.trim().toLowerCase();
    if (!q) return data.members;
    return data.members.filter(
      (m: any) =>
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.phone?.toLowerCase().includes(q) ||
        m.username?.toLowerCase().includes(q)
    );
  }, [data?.members, customerSearch]);

  const filteredOrders = useMemo(() => {
    if (!data?.orders) return [];
    const q = orderSearch.trim().toLowerCase();
    if (!q) return data.orders;
    return data.orders.filter(
      (o: Order) =>
        o.order_number?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_email?.toLowerCase().includes(q) ||
        o.tracking_code?.toLowerCase().includes(q)
    );
  }, [data?.orders, orderSearch]);

  return (
    <main className="bg-slate-50 min-h-[84vh] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#0D9488]">DNA GENEIE Private Owner Console</p>
            <h1 className="text-2xl font-display font-bold text-[#0B2246]">Owner & Business Administration</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Authorized Owner: <span className="font-semibold text-[#0B2246]">{user.email}</span> ·{' '}
              {data?.ownerTotpEnabled ? '2FA Active' : '2FA Inactive'}
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer self-start sm:self-auto"
          >
            Secure Logout
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200">
          {[
            { id: 'overview', label: 'Analytics', icon: BarChart3 },
            { id: 'members', label: 'Customers', icon: Users },
            { id: 'advisors', label: `Advisors (${data?.summary?.pendingAdvisorApprovals || 0})`, icon: Users },
            { id: 'orders', label: 'Orders & Refunds', icon: Package },
            { id: 'payments', label: 'Payments', icon: CreditCard },
            { id: 'catalog', label: 'Products & Promos', icon: Tag },
            { id: 'kits', label: 'DNA Kits & Reports', icon: Dna },
            { id: 'enquiries', label: 'Enquiries', icon: MessageSquare },
            { id: 'security', label: 'Security & Audit', icon: ShieldAlert },
            { id: 'compliance', label: 'USA Lab Gate', icon: Globe },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as AdminTab)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  tab === item.id ? 'bg-[#0B2246] text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {error && <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>}
        {notice && <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-sm text-teal-800">{notice}</div>}

        {loading || !data ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
            Loading owner administration console...
          </div>
        ) : (
          <>
            {/* 1. ANALYTICS & OVERVIEW */}
            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <p className="text-xs text-slate-500">Total Customers</p>
                    <p className="text-2xl font-mono tabular-nums font-bold text-[#0B2246] mt-1">
                      {data.summary.totalMembers}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <p className="text-xs text-slate-500">Active Advisors ({data.summary.pendingAdvisorApprovals} pending)</p>
                    <p className="text-2xl font-mono tabular-nums font-bold text-[#0B2246] mt-1">
                      {data.summary.totalAdvisors}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <p className="text-xs text-slate-500">Total Orders · Conversion</p>
                    <p className="text-2xl font-mono tabular-nums font-bold text-[#0B2246] mt-1">
                      {data.summary.totalOrders}{' '}
                      <span className="text-sm text-[#0D9488]">({data.summary.conversionRate}%)</span>
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 p-5">
                    <p className="text-xs text-slate-500">Verified Revenue (Total / Month)</p>
                    <p className="text-xl font-mono tabular-nums font-bold text-[#0D9488] mt-1">
                      {formatINR(data.summary.verifiedRevenueInr)}
                    </p>
                    <p className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                      This month: {formatINR(data.summary.monthlyRevenueInr)} · Refunded:{' '}
                      {formatINR(data.summary.totalRefundedInr)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                    <h2 className="text-base font-display font-bold text-[#0B2246]">Most Purchased Panels</h2>
                    {data.summary.mostPurchasedProducts?.length === 0 ? (
                      <p className="text-sm text-slate-500">No product orders recorded yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {data.summary.mostPurchasedProducts.map((item: { name: string; units: number }) => (
                          <div key={item.name} className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold text-[#0B2246]">
                              <span>{item.name}</span>
                              <span className="font-mono">{item.units} units</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full dna-gradient-bg rounded-full"
                                style={{
                                  width: `${Math.min(100, Math.max(15, item.units * 20))}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                    <h2 className="text-base font-display font-bold text-[#0B2246]">Recent Registrations</h2>
                    {data.recentRegistrations.length === 0 ? (
                      <p className="text-sm text-slate-500">No member or advisor registrations yet.</p>
                    ) : (
                      <div className="divide-y divide-slate-100 text-sm">
                        {data.recentRegistrations.slice(0, 6).map((u: any) => (
                          <div key={u.id} className="py-2.5 flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-[#0B2246]">{u.full_name}</p>
                              <p className="text-xs text-slate-500">
                                {u.role.toUpperCase()} · {u.email}
                              </p>
                            </div>
                            <span className="text-xs font-semibold capitalize text-slate-600">
                              {u.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                    <h2 className="text-base font-display font-bold text-[#0B2246]">Recent Login Activity</h2>
                    {data.loginActivity.length === 0 ? (
                      <p className="text-sm text-slate-500">No login activity recorded yet.</p>
                    ) : (
                      <div className="divide-y divide-slate-100 text-xs">
                        {data.loginActivity.slice(0, 6).map((log: any) => (
                          <div key={log.id} className="py-2.5 flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-[#0B2246]">
                                {log.account_type} · {log.event_type.replace(/_/g, ' ')}
                              </p>
                              <p className="text-slate-500">
                                {log.email} · {log.ip_address}
                              </p>
                            </div>
                            <span className={`font-semibold ${log.success ? 'text-teal-700' : 'text-rose-600'}`}>
                              {log.success ? 'Success' : 'Alert/Fail'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. CUSTOMER MANAGEMENT */}
            {tab === 'members' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-display font-bold text-[#0B2246]">
                      Customer Management ({filteredMembers.length})
                    </h2>
                    <p className="text-xs text-slate-500">Search customers, review DPDP consents, and assign advisors.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="search"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search name, email, phone..."
                        className="pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs w-60"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadBinary('/api/admin/export/customers', 'dnageneie-customers.csv')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B2246] text-white text-xs font-semibold cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {filteredMembers.length === 0 ? (
                  <p className="p-8 text-sm text-slate-500">No matching customer accounts found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Customer</th>
                          <th className="py-3 px-4 font-semibold">Username</th>
                          <th className="py-3 px-4 font-semibold">Registered</th>
                          <th className="py-3 px-4 font-semibold">Verification / DPDP</th>
                          <th className="py-3 px-4 font-semibold">Assigned Advisor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredMembers.map((m: any) => (
                          <tr key={m.id}>
                            <td className="py-3 px-4">
                              <p className="font-semibold text-[#0B2246]">{m.full_name}</p>
                              <p className="text-xs text-slate-500">
                                {m.email} · {m.phone}
                              </p>
                            </td>
                            <td className="py-3 px-4 font-mono text-xs">@{m.username}</td>
                            <td className="py-3 px-4 text-xs font-mono text-slate-500">
                              {String(m.created_at).slice(0, 10)}
                            </td>
                            <td className="py-3 px-4 text-xs">
                              <p className={m.email_verified ? 'text-teal-700 font-semibold' : 'text-amber-700'}>
                                {m.email_verified ? 'Email Verified' : 'Unverified'}
                              </p>
                              {m.deletion_requested_at && (
                                <p className="text-rose-600 font-semibold">Erasure Requested</p>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={m.assigned_advisor_id || ''}
                                onChange={(e) => handleAssignMemberAdvisor(m.id, e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                              >
                                <option value="">Unassigned</option>
                                {activeAdvisors.map((adv: any) => (
                                  <option key={adv.id} value={adv.id}>
                                    {adv.full_name}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 3. ADVISOR MANAGEMENT */}
            {tab === 'advisors' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-display font-bold text-[#0B2246]">Advisor Management & Approvals</h2>
                </div>
                {data.advisors.length === 0 ? (
                  <p className="p-8 text-sm text-slate-500">No advisor registrations yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Advisor</th>
                          <th className="py-3 px-4 font-semibold">Specialization</th>
                          <th className="py-3 px-4 font-semibold">Activity</th>
                          <th className="py-3 px-4 font-semibold">Status</th>
                          <th className="py-3 px-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.advisors.map((adv: any) => (
                          <tr key={adv.id}>
                            <td className="py-3 px-4">
                              <p className="font-semibold text-[#0B2246]">{adv.full_name}</p>
                              <p className="text-xs text-slate-500">
                                {adv.email} · {adv.phone}
                              </p>
                            </td>
                            <td className="py-3 px-4 text-xs">{adv.specialization}</td>
                            <td className="py-3 px-4 text-xs text-slate-600">
                              {adv.assigned_clients_count || 0} clients · {adv.assigned_enquiries_count || 0} enquiries
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-xs font-semibold capitalize ${
                                  adv.status === 'active'
                                    ? 'text-teal-700'
                                    : adv.status === 'pending_approval'
                                      ? 'text-amber-700'
                                      : 'text-rose-700'
                                }`}
                              >
                                {adv.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              {adv.status !== 'active' && (
                                <button
                                  type="button"
                                  onClick={() => handleAdvisorApproval(adv.id, 'approve')}
                                  className="px-3 py-1.5 rounded-lg bg-[#0D9488] text-white text-xs font-semibold cursor-pointer"
                                >
                                  Approve
                                </button>
                              )}
                              {adv.status === 'pending_approval' && (
                                <button
                                  type="button"
                                  onClick={() => handleAdvisorApproval(adv.id, 'reject')}
                                  className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-xs font-semibold cursor-pointer"
                                >
                                  Reject
                                </button>
                              )}
                              {adv.status === 'active' && (
                                <button
                                  type="button"
                                  onClick={() => handleAdvisorApproval(adv.id, 'suspend')}
                                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
                                >
                                  Suspend
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 4. ORDER & REFUND MANAGEMENT */}
            {tab === 'orders' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-display font-bold text-[#0B2246]">
                      Order Management ({filteredOrders.length})
                    </h2>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="search"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        placeholder="Search order #, customer, tracking..."
                        className="pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs w-64"
                      />
                    </div>
                  </div>
                  {filteredOrders.length === 0 ? (
                    <p className="p-8 text-sm text-slate-500">No matching orders found.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4 font-semibold">Order & Items</th>
                            <th className="py-3 px-4 font-semibold">Customer & Address</th>
                            <th className="py-3 px-4 font-semibold">Total</th>
                            <th className="py-3 px-4 font-semibold">Payment Status</th>
                            <th className="py-3 px-4 font-semibold">Fulfillment Stage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredOrders.map((o: Order) => (
                            <tr key={o.id}>
                              <td className="py-3 px-4">
                                <p className="font-mono text-xs font-bold text-[#0B2246]">{o.order_number}</p>
                                <p className="text-xs text-slate-600">{o.items.map((i) => `${i.name}×${i.quantity}`).join(', ')}</p>
                                <p className="text-[11px] font-mono text-slate-400">Track: {o.tracking_code}</p>
                              </td>
                              <td className="py-3 px-4 text-xs">
                                <p className="font-semibold">{o.customer_name}</p>
                                <p className="text-slate-500">{o.customer_email} · {o.customer_phone}</p>
                                <p className="text-slate-400">{o.city}, {o.state} - {o.pincode}</p>
                              </td>
                              <td className="py-3 px-4 font-mono tabular-nums font-bold">{formatINR(o.total_inr)}</td>
                              <td className="py-3 px-4">
                                <select
                                  value={o.payment_status}
                                  onChange={(e) => handleUpdateOrder(o.id, { paymentStatus: e.target.value })}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="verified">Verified</option>
                                  <option value="failed">Failed</option>
                                  <option value="refunded">Refunded</option>
                                </select>
                              </td>
                              <td className="py-3 px-4">
                                <select
                                  value={o.order_status}
                                  onChange={(e) => handleUpdateOrder(o.id, { orderStatus: e.target.value })}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                                >
                                  <option value="placed">Order Placed</option>
                                  <option value="kit_dispatched">Kit Dispatched</option>
                                  <option value="sample_received">Sample Received</option>
                                  <option value="lab_processing">Lab Processing</option>
                                  <option value="report_ready">Report Ready</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Refund Requests */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-200">
                    <h2 className="text-lg font-display font-bold text-[#0B2246]">
                      Refund Requests ({(data.refunds || []).length})
                    </h2>
                  </div>
                  {(data.refunds || []).length === 0 ? (
                    <p className="p-8 text-sm text-slate-500">No refund requests submitted.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="py-3 px-4 font-semibold">Order #</th>
                            <th className="py-3 px-4 font-semibold">Customer</th>
                            <th className="py-3 px-4 font-semibold">Reason</th>
                            <th className="py-3 px-4 font-semibold">Amount</th>
                            <th className="py-3 px-4 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.refunds.map((r: RefundRequest) => (
                            <tr key={r.id}>
                              <td className="py-3 px-4 font-mono text-xs font-bold">{r.order_number}</td>
                              <td className="py-3 px-4 text-xs">
                                <p className="font-semibold">{r.customer_name}</p>
                                <p className="text-slate-500">{r.customer_email}</p>
                              </td>
                              <td className="py-3 px-4 text-xs text-slate-600">{r.reason}</td>
                              <td className="py-3 px-4 font-mono tabular-nums font-bold">{formatINR(r.amount_inr)}</td>
                              <td className="py-3 px-4">
                                <select
                                  value={r.status}
                                  onChange={(e) => handleUpdateRefund(r.id, e.target.value)}
                                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                                >
                                  <option value="requested">Requested</option>
                                  <option value="approved">Approved</option>
                                  <option value="processed">Processed (Mark Refunded)</option>
                                  <option value="rejected">Rejected</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. PAYMENT MANAGEMENT */}
            {tab === 'payments' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-display font-bold text-[#0B2246]">Payment Ledger & Verified Revenue</h2>
                    <p className="text-xs text-slate-500">
                      Total Verified: {formatINR(data.summary.verifiedRevenueInr)} · Refunded:{' '}
                      {formatINR(data.summary.totalRefundedInr)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadBinary('/api/admin/export/payments', 'dnageneie-payments.csv')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B2246] text-white text-xs font-semibold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Payment Report (CSV)</span>
                  </button>
                </div>
                {data.payments.length === 0 ? (
                  <p className="p-8 text-sm text-slate-500">No payment transactions recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Date</th>
                          <th className="py-3 px-4 font-semibold">Order #</th>
                          <th className="py-3 px-4 font-semibold">Customer</th>
                          <th className="py-3 px-4 font-semibold">Gateway / Ref</th>
                          <th className="py-3 px-4 font-semibold">Status</th>
                          <th className="py-3 px-4 font-semibold text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.payments.map((p: PaymentRecord) => (
                          <tr key={p.id}>
                            <td className="py-3 px-4 font-mono text-xs text-slate-500">{p.created_at.slice(0, 10)}</td>
                            <td className="py-3 px-4 font-mono text-xs font-bold">{p.order_number}</td>
                            <td className="py-3 px-4 text-xs">
                              <p className="font-semibold">{p.customer_name}</p>
                              <p className="text-slate-500">{p.customer_email}</p>
                            </td>
                            <td className="py-3 px-4 text-xs">
                              <p>{p.gateway}</p>
                              <p className="font-mono text-slate-500">{p.transaction_ref}</p>
                            </td>
                            <td className="py-3 px-4 capitalize text-xs font-semibold text-[#0D9488]">{p.status}</td>
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

            {/* 6. PRODUCT, INVENTORY, BUNDLE & PROMO MANAGEMENT */}
            {tab === 'catalog' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                  <h2 className="text-lg font-display font-bold text-[#0B2246]">Individual DNA Panels & Inventory</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {data.products.map((prod: Product) => (
                      <ProductPriceEditor key={prod.id} product={prod} onSave={handleUpdateProduct} />
                    ))}
                  </div>
                </div>

                {/* Add New Product */}
                <form
                  onSubmit={handleCreateProduct}
                  className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-[#0D9488]" />
                    <h2 className="text-lg font-display font-bold text-[#0B2246]">Add New DNA Panel / Product</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Product Name (e.g. CardioG)"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                    <input
                      type="text"
                      required
                      placeholder="URL Slug (e.g. cardiog)"
                      value={newProduct.slug}
                      onChange={(e) => setNewProduct((p) => ({ ...p, slug: e.target.value }))}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Category"
                      value={newProduct.category}
                      onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Price INR (40000)"
                      value={newProduct.priceInr}
                      onChange={(e) => setNewProduct((p) => ({ ...p, priceInr: e.target.value }))}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Tagline"
                      value={newProduct.tagline}
                      onChange={(e) => setNewProduct((p) => ({ ...p, tagline: e.target.value }))}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Initial Stock"
                      value={newProduct.stockCount}
                      onChange={(e) => setNewProduct((p) => ({ ...p, stockCount: e.target.value }))}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                    />
                    <select
                      value={newProduct.status}
                      onChange={(e) => setNewProduct((p) => ({ ...p, status: e.target.value as any }))}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    >
                      <option value="available">Available Now</option>
                      <option value="coming_soon">Coming Soon</option>
                    </select>
                  </div>
                  <textarea
                    rows={2}
                    required
                    placeholder="Clinical description..."
                    value={newProduct.description}
                    onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl dna-gradient-bg text-white text-xs font-semibold cursor-pointer"
                  >
                    Add Product to Catalog
                  </button>
                </form>

                {/* Bundles */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                  <h2 className="text-lg font-display font-bold text-[#0B2246]">Bundle Packages</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.bundles.map((b: Bundle) => (
                      <BundlePriceEditor key={b.id} bundle={b} onSave={handleUpdateBundle} />
                    ))}
                  </div>
                </div>

                {/* Promotional Offers */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
                  <h2 className="text-lg font-display font-bold text-[#0B2246]">Promotional Offer Codes</h2>
                  <form onSubmit={handleCreatePromo} className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="CODE (e.g. DNA5000)"
                      value={newPromo.code}
                      onChange={(e) => setNewPromo((p) => ({ ...p, code: e.target.value }))}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono uppercase"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Offer Title"
                      value={newPromo.title}
                      onChange={(e) => setNewPromo((p) => ({ ...p, title: e.target.value }))}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-xs sm:col-span-2"
                    />
                    <select
                      value={newPromo.discountType}
                      onChange={(e) => setNewPromo((p) => ({ ...p, discountType: e.target.value as any }))}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    >
                      <option value="flat">Flat (INR)</option>
                      <option value="percent">Percent (%)</option>
                    </select>
                    <input
                      type="number"
                      required
                      placeholder="Value"
                      value={newPromo.discountValue}
                      onChange={(e) => setNewPromo((p) => ({ ...p, discountValue: e.target.value }))}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#0B2246] text-white text-xs font-semibold cursor-pointer"
                    >
                      Create Promo
                    </button>
                  </form>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(data.promos || []).map((pr: PromoOffer) => (
                      <div key={pr.id} className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <p className="font-mono text-sm font-bold text-[#0B2246]">{pr.code}</p>
                          <p className="text-xs text-slate-600">
                            {pr.title} ·{' '}
                            {pr.discount_type === 'percent' ? `${pr.discount_value}% off` : formatINR(pr.discount_value)} (Min{' '}
                            {formatINR(pr.min_order_inr)})
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTogglePromo(pr)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                            pr.is_active === 1
                              ? 'bg-teal-50 text-teal-800 border border-teal-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {pr.is_active === 1 ? 'Active (Disable)' : 'Inactive (Enable)'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 7. DNA TESTING & REPORTS MANAGEMENT */}
            {tab === 'kits' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                  <h2 className="text-lg font-display font-bold text-[#0B2246]">DNA Kit Registrations & Lab Processing</h2>
                  {data.kits.length === 0 ? (
                    <p className="text-sm text-slate-500">No DNA kits registered by members yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.kits.map((kit: DnaKit) => (
                        <div
                          key={kit.id}
                          className="p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3"
                        >
                          <div>
                            <p className="font-mono text-sm font-bold text-[#0B2246]">{kit.kit_barcode}</p>
                            <p className="text-xs text-slate-500">
                              {kit.product_name} · {kit.member_name} ({kit.member_email})
                            </p>
                          </div>
                          <select
                            value={kit.status}
                            onChange={(e) => handleUpdateKitStatus(kit.id, e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
                          >
                            <option value="registered">Registered</option>
                            <option value="sample_shipped">Sample Shipped</option>
                            <option value="lab_received">Lab Received</option>
                            <option value="sequencing">Sequencing</option>
                            <option value="verified_complete">Verified Complete</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form
                  onSubmit={handlePublishReport}
                  className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 h-fit"
                >
                  <div className="flex items-center gap-2">
                    <FilePlus2 className="w-5 h-5 text-[#0D9488]" />
                    <h2 className="text-lg font-display font-bold text-[#0B2246]">Upload Verified Report (AES-256)</h2>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Kit</label>
                    <select
                      required
                      value={reportDraft.kitId}
                      onChange={(e) => setReportDraft((r) => ({ ...r, kitId: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    >
                      <option value="">Select Member DNA Kit</option>
                      {data.kits.map((k: DnaKit) => (
                        <option key={k.id} value={k.id}>
                          {k.kit_barcode} — {k.product_name} ({k.member_name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Report Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Personalized NutriG Metabolic Profile"
                      value={reportDraft.reportTitle}
                      onChange={(e) => setReportDraft((r) => ({ ...r, reportTitle: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Summary (Encrypted at Rest)</label>
                    <textarea
                      rows={3}
                      required
                      value={reportDraft.summary}
                      onChange={(e) => setReportDraft((r) => ({ ...r, summary: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Recommendations (one per line)</label>
                    <textarea
                      rows={3}
                      required
                      value={reportDraft.recommendations}
                      onChange={(e) => setReportDraft((r) => ({ ...r, recommendations: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl dna-gradient-bg text-white text-sm font-semibold cursor-pointer"
                  >
                    Encrypt & Publish Report
                  </button>
                </form>

                {data.reports.length > 0 && (
                  <div className="lg:col-span-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
                    <h3 className="text-base font-bold text-[#0B2246]">
                      Published Genetic Reports & Visibility Control ({data.reports.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {data.reports.map((r: GeneticReport) => (
                        <div key={r.id} className="p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-mono font-bold text-[#0D9488]">{r.kit_barcode}</p>
                            <button
                              type="button"
                              onClick={() => handleToggleReportAvailability(r)}
                              className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                                r.status === 'available'
                                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {r.status === 'available' ? 'Visible to Member' : 'Hidden (Processing)'}
                            </button>
                          </div>
                          <p className="font-semibold text-[#0B2246]">{r.report_title}</p>
                          <p className="text-slate-500">
                            {r.member_name} ({r.member_email}) · {r.published_at.slice(0, 10)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ENQUIRIES */}
            {tab === 'enquiries' && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-display font-bold text-[#0B2246]">Customer Enquiries & Advisor Assignment</h2>
                </div>
                {data.enquiries.length === 0 ? (
                  <p className="p-8 text-sm text-slate-500">No enquiries submitted yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Customer</th>
                          <th className="py-3 px-4 font-semibold">Interest</th>
                          <th className="py-3 px-4 font-semibold">Assign Advisor</th>
                          <th className="py-3 px-4 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.enquiries.map((e: Enquiry) => (
                          <tr key={e.id}>
                            <td className="py-3 px-4">
                              <p className="font-semibold text-[#0B2246]">{e.name}</p>
                              <p className="text-xs text-slate-500">
                                {e.email} · {e.phone}
                              </p>
                              {e.subject && (
                                <p className="text-xs font-semibold text-[#0D9488] mt-1">Subject: {e.subject}</p>
                              )}
                              <p className="text-xs text-slate-600 mt-1 max-w-md">{e.message}</p>
                            </td>
                            <td className="py-3 px-4 text-xs">{e.interest_product}</td>
                            <td className="py-3 px-4">
                              <select
                                value={e.assigned_advisor_id || ''}
                                onChange={(ev) =>
                                  handleUpdateEnquiry(e.id, {
                                    assignedAdvisorId: ev.target.value ? Number(ev.target.value) : null,
                                  })
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                              >
                                <option value="">Unassigned</option>
                                {activeAdvisors.map((adv: any) => (
                                  <option key={adv.id} value={adv.id}>
                                    {adv.full_name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={e.status}
                                onChange={(ev) => handleUpdateEnquiry(e.id, { status: ev.target.value })}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                              >
                                <option value="new">New</option>
                                <option value="contacted">Contacted</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 8. SECURITY, 2FA, SESSIONS, AUDIT LOGS & BACKUP */}
            {tab === 'security' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Owner 2FA Control */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-[#0D9488]" />
                        <h2 className="text-base font-display font-bold text-[#0B2246]">Owner Two-Factor Auth (2FA)</h2>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded ${
                          data.ownerTotpEnabled ? 'bg-teal-50 text-teal-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {data.ownerTotpEnabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span>
                        Protect <strong className="text-[#0B2246]">support@dnageneie.com</strong> with RFC 6238 TOTP authenticator codes (Google Authenticator / 1Password / Authy).
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold text-[11px]">
                        Email Ownership Verified
                      </span>
                    </div>

                    {!data.ownerTotpEnabled && !totpSetup && (
                      <button
                        type="button"
                        onClick={handleStart2faSetup}
                        className="px-4 py-2 rounded-xl dna-gradient-bg text-white text-xs font-semibold cursor-pointer"
                      >
                        Configure 2FA Authenticator
                      </button>
                    )}

                    {totpSetup && (
                      <form onSubmit={handleEnable2fa} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                        <p className="text-xs font-semibold text-[#0B2246]">1. Add this Secret Key to your Authenticator App:</p>
                        <p className="font-mono text-xs bg-white p-2 rounded border border-slate-200 break-all select-all">
                          {totpSetup.secret}
                        </p>
                        <p className="text-[11px] text-slate-500 break-all">OTPAuth URI: {totpSetup.otpauthUrl}</p>
                        <p className="text-xs font-semibold text-[#0B2246]">2. Enter generated 6-digit code to activate:</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            required
                            value={totpVerifyCode}
                            onChange={(e) => setTotpVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="123456"
                            className="px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm w-36"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-[#0B2246] text-white text-xs font-semibold cursor-pointer"
                          >
                            Verify & Enable
                          </button>
                        </div>
                      </form>
                    )}

                    {data.ownerTotpEnabled && (
                      <button
                        type="button"
                        onClick={handleDisable2fa}
                        className="px-4 py-2 rounded-xl border border-rose-200 text-rose-700 text-xs font-semibold cursor-pointer"
                      >
                        Disable 2FA
                      </button>
                    )}
                  </div>

                  {/* Database Backup & Email Service */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <Mail className="w-5 h-5 text-[#0D9488] shrink-0 mt-0.5" />
                        <div>
                          <h2 className="text-base font-display font-bold text-[#0B2246]">
                            Owner Notifications → {data.mailerStatus.ownerNotificationEmail}
                          </h2>
                          <p className="text-xs text-slate-600 mt-1">
                            {data.mailerStatus.configured
                              ? `Active provider: ${data.mailerStatus.provider.toUpperCase()}`
                              : 'Set RESEND_API_KEY or SMTP credentials in server secrets for live email delivery.'}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded text-[11px] font-bold whitespace-nowrap ${
                          data.mailerStatus.configured ? 'bg-teal-50 text-teal-800' : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {data.mailerStatus.configured ? 'ACTIVE' : 'SECRETS NEEDED'}
                      </span>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-[#0B2246]">Encrypted SQLite Database Backup</p>
                        <p className="text-xs text-slate-500">Download a consistent point-in-time SQLite database snapshot.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadBinary('/api/admin/backup/download', 'dnageneie-backup.db')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B2246] text-white text-xs font-semibold cursor-pointer shrink-0"
                      >
                        <DatabaseBackup className="w-4 h-4" />
                        <span>Download Backup</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Official Business Contact Settings */}
                <form onSubmit={handleSaveContactSettings} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-[#0D9488]" />
                    <div>
                      <h2 className="text-base font-display font-bold text-[#0B2246]">Official Business Contact Settings</h2>
                      <p className="text-xs text-slate-500">
                        Verified support &amp; enquiry contact channels used across DNA GENEIE.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email (Locked)</label>
                      <input
                        type="email"
                        readOnly
                        value={contactSettings.contactEmail}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Official Phone</label>
                      <input
                        type="tel"
                        required
                        value={contactSettings.contactPhone}
                        onChange={(e) => setContactSettings((c) => ({ ...c, contactPhone: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp International Digits</label>
                      <input
                        type="text"
                        required
                        value={contactSettings.contactWhatsapp}
                        onChange={(e) => setContactSettings((c) => ({ ...c, contactWhatsapp: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Advisory Hours</label>
                      <input
                        type="text"
                        required
                        value={contactSettings.supportHours}
                        onChange={(e) => setContactSettings((c) => ({ ...c, supportHours: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#0B2246] text-white text-xs font-semibold hover:bg-[#133366] cursor-pointer"
                  >
                    Save Contact Settings
                  </button>
                </form>

                {/* Active Sessions */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-200">
                    <h2 className="text-lg font-display font-bold text-[#0B2246]">
                      Active Authenticated Sessions ({(data.activeSessions || []).length})
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 font-semibold">User</th>
                          <th className="py-3 px-4 font-semibold">Role</th>
                          <th className="py-3 px-4 font-semibold">IP & Device</th>
                          <th className="py-3 px-4 font-semibold">Expires</th>
                          <th className="py-3 px-4 font-semibold text-right">Revoke</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(data.activeSessions || []).map((s: any) => (
                          <tr key={s.id}>
                            <td className="py-3 px-4">
                              <p className="font-semibold text-[#0B2246]">{s.full_name}</p>
                              <p className="text-slate-500">{s.email}</p>
                            </td>
                            <td className="py-3 px-4 uppercase font-semibold">{s.role}</td>
                            <td className="py-3 px-4 max-w-xs truncate text-slate-500">
                              {s.ip_address} · {s.user_agent}
                            </td>
                            <td className="py-3 px-4 font-mono">{String(s.expires_at).slice(0, 10)}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleRevokeSession(s.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-rose-200 text-rose-700 font-semibold hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Revoke</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Admin Audit Logs */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-200">
                    <h2 className="text-lg font-display font-bold text-[#0B2246]">Owner Admin Audit Trail</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Timestamp</th>
                          <th className="py-3 px-4 font-semibold">Action</th>
                          <th className="py-3 px-4 font-semibold">Target</th>
                          <th className="py-3 px-4 font-semibold">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(data.adminAuditLogs || []).map((a: any) => (
                          <tr key={a.id}>
                            <td className="py-3 px-4 font-mono">{a.created_at}</td>
                            <td className="py-3 px-4 font-mono font-bold text-[#0B2246]">{a.action}</td>
                            <td className="py-3 px-4">{a.target_type} #{a.target_id}</td>
                            <td className="py-3 px-4 text-slate-600">{a.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Login Activity */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-200">
                    <h2 className="text-lg font-display font-bold text-[#0B2246]">Login Activity & Failed Attempt Audit Log</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Timestamp</th>
                          <th className="py-3 px-4 font-semibold">Account Type</th>
                          <th className="py-3 px-4 font-semibold">Email</th>
                          <th className="py-3 px-4 font-semibold">Event</th>
                          <th className="py-3 px-4 font-semibold">IP & Device</th>
                          <th className="py-3 px-4 font-semibold">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.loginActivity.map((log: any) => (
                          <tr key={log.id}>
                            <td className="py-3 px-4 font-mono">{log.created_at}</td>
                            <td className="py-3 px-4 font-semibold">{log.account_type}</td>
                            <td className="py-3 px-4">{log.email}</td>
                            <td className="py-3 px-4">{log.event_type.replace(/_/g, ' ')}</td>
                            <td className="py-3 px-4 max-w-xs truncate text-slate-500">
                              {log.ip_address} · {log.user_agent}
                            </td>
                            <td className="py-3 px-4 font-semibold">
                              <span className={log.success ? 'text-teal-700' : 'text-rose-600'}>
                                {log.success ? 'Success' : 'Failed / Alert'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Owner Email Notifications */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-200">
                    <h2 className="text-lg font-display font-bold text-[#0B2246]">
                      Owner Email Notification Dispatch Log ({data.mailerStatus.ownerNotificationEmail})
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 font-semibold">Timestamp</th>
                          <th className="py-3 px-4 font-semibold">Event</th>
                          <th className="py-3 px-4 font-semibold">Account</th>
                          <th className="py-3 px-4 font-semibold">Provider</th>
                          <th className="py-3 px-4 font-semibold">Delivery Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.emailNotifications.map((n: any) => (
                          <tr key={n.id}>
                            <td className="py-3 px-4 font-mono">{n.created_at}</td>
                            <td className="py-3 px-4 font-semibold">{n.event_type}</td>
                            <td className="py-3 px-4">
                              {n.account_type}: {n.full_name} ({n.account_email})
                            </td>
                            <td className="py-3 px-4 uppercase">{n.provider}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`font-semibold ${
                                  n.delivery_status === 'sent'
                                    ? 'text-teal-700'
                                    : n.delivery_status === 'not_configured'
                                      ? 'text-amber-700'
                                      : 'text-rose-700'
                                }`}
                              >
                                {n.delivery_status}
                              </span>
                              {n.error_message && <p className="text-[11px] text-slate-500 mt-0.5">{n.error_message}</p>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* USA LAB COMPLIANCE GATE */}
            {tab === 'compliance' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 max-w-3xl">
                <div className="flex items-center gap-3">
                  <UsaFlagIcon className="w-8 h-5" />
                  <div>
                    <h2 className="text-lg font-display font-bold text-[#0B2246]">
                      USA Laboratory Testing Section Compliance Gate
                    </h2>
                    <p className="text-xs text-slate-500">
                      This homepage section remains unpublished until you verify that your laboratory arrangement genuinely processes samples in the United States.
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <p className="text-xs font-semibold text-[#0D9488]">Prepared Homepage Copy Preview</p>
                  <p className="text-lg font-display font-bold text-[#0B2246]">International DNA Testing Standards</p>
                  <p className="text-sm text-slate-600">
                    &ldquo;Your DNA sample is processed through our designated laboratory testing workflow in the United States.&rdquo;
                  </p>
                </div>

                <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usaConfirmed}
                    onChange={(e) => setUsaConfirmed(e.target.checked)}
                    className="mt-1 rounded border-slate-300 text-[#0D9488]"
                  />
                  <span>
                    I confirm as the business owner that our laboratory and testing arrangement genuinely processes DNA samples in the United States.
                  </span>
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={!usaConfirmed}
                    onClick={() => handleToggleUsaSection(true)}
                    className="px-5 py-2.5 rounded-xl dna-gradient-bg text-white text-sm font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    Publish Section on Homepage
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleUsaSection(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold cursor-pointer"
                  >
                    Keep Unpublished
                  </button>
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <CheckCircle2
                      className={`w-4 h-4 ${data.siteSettings.usaLabSectionPublished ? 'text-[#0D9488]' : 'text-slate-300'}`}
                    />
                    {data.siteSettings.usaLabSectionPublished ? 'Currently Published' : 'Currently Unpublished'}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

const ProductPriceEditor: React.FC<{
  product: Product;
  onSave: (
    p: Product,
    payload: { priceInr: number | null; status: 'available' | 'coming_soon'; isActive: boolean; stockCount: number; offerLabel: string }
  ) => void;
}> = ({ product, onSave }) => {
  const [price, setPrice] = useState(product.price_inr ? String(product.price_inr) : '');
  const [status, setStatus] = useState<'available' | 'coming_soon'>(product.status);
  const [isActive, setIsActive] = useState(product.is_active !== 0);
  const [stockCount, setStockCount] = useState(String(product.stock_count ?? 100));
  const [offerLabel, setOfferLabel] = useState(product.offer_label || '');

  return (
    <div className="p-4 rounded-xl border border-slate-200 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[#0B2246]">{product.name}</h3>
        <span className="text-xs font-mono text-slate-500">{product.slug}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Price (INR)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="40000"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Stock</label>
          <input
            type="number"
            value={stockCount}
            onChange={(e) => setStockCount(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Availability</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as 'available' | 'coming_soon')}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
        >
          <option value="available">Available</option>
          <option value="coming_soon">Coming Soon</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Offer Tag (Optional)</label>
        <input
          type="text"
          value={offerLabel}
          onChange={(e) => setOfferLabel(e.target.value)}
          placeholder="e.g. Save ₹5,000 in Bundle"
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded border-slate-300 text-[#0D9488]"
        />
        <span>Enabled in public catalog</span>
      </label>
      <button
        type="button"
        onClick={() =>
          onSave(product, {
            priceInr: price ? Number(price) : null,
            status,
            isActive,
            stockCount: Number(stockCount) || 0,
            offerLabel,
          })
        }
        className="w-full py-2 rounded-lg bg-[#0B2246] text-white text-xs font-semibold cursor-pointer"
      >
        Save {product.name}
      </button>
    </div>
  );
};

const BundlePriceEditor: React.FC<{
  bundle: Bundle;
  onSave: (b: Bundle, price: number, status: 'available' | 'coming_soon', isActive: boolean) => void;
}> = ({ bundle, onSave }) => {
  const [price, setPrice] = useState(String(bundle.price_inr));
  const [status, setStatus] = useState<'available' | 'coming_soon'>(bundle.status);
  const [isActive, setIsActive] = useState(bundle.is_active !== 0);

  return (
    <div className="p-4 rounded-xl border border-slate-200 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[#0B2246]">{bundle.name}</h3>
        <span className="text-xs font-mono text-slate-500">{bundle.slug}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Bundle Price (INR)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Availability</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'available' | 'coming_soon')}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          >
            <option value="available">Available</option>
            <option value="coming_soon">Coming Soon</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded border-slate-300 text-[#0D9488]"
        />
        <span>Enabled in public catalog</span>
      </label>
      <button
        type="button"
        onClick={() => onSave(bundle, Number(price) || bundle.price_inr, status, isActive)}
        className="w-full py-2 rounded-lg bg-[#0B2246] text-white text-xs font-semibold cursor-pointer"
      >
        Save Bundle Settings
      </button>
    </div>
  );
};
