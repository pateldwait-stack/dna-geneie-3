import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, FileText, Lock, Mail, MapPin, MessageCircle, Minus, Phone, Plus, ShieldCheck, Tag, Trash2 } from 'lucide-react';
import type { ActiveRoute, AuthUser, Bundle, CartItem, Order, SavedAddress } from '../types';
import { apiFetch, formatINR } from '../lib/api';
import {
  OFFICIAL_EMAIL,
  OFFICIAL_MAILTO,
  OFFICIAL_PHONE_DISPLAY,
  OFFICIAL_PHONE_HREF,
  OFFICIAL_WHATSAPP_URL,
} from '../lib/contact';
import { GeneticTestingDisclaimer } from './GeneticTestingDisclaimer';
import { InvoiceModal } from './InvoiceModal';

interface CheckoutPageProps {
  user: AuthUser | null;
  items: CartItem[];
  bundles: Bundle[];
  onClearCart: () => void;
  onUpdateQty: (itemType: 'product' | 'bundle', slug: string, qty: number) => void;
  onRemoveItem: (itemType: 'product' | 'bundle', slug: string) => void;
  onNavigate: (route: ActiveRoute) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  user,
  items,
  bundles,
  onClearCart,
  onUpdateQty,
  onRemoveItem,
  onNavigate,
}) => {
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [shipping, setShipping] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    saveAddress: false,
    addressLabel: 'Home',
  });
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; title: string; discountInr: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [disclaimerError, setDisclaimerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<any | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (user?.role === 'member') {
      apiFetch<{ addresses: SavedAddress[] }>('/api/member/dashboard')
        .then((res) => {
          const list = res.addresses || [];
          setSavedAddresses(list);
          const def = list.find((a) => a.is_default === 1) || list[0];
          if (def) {
            setShipping((s) => ({
              ...s,
              fullName: def.full_name,
              phone: def.phone,
              address: def.address_line,
              city: def.city,
              state: def.state,
              pincode: def.pincode,
            }));
          }
        })
        .catch(() => {});
    }
  }, [user?.id]);

  const subtotal = items.reduce((sum, item) => sum + item.unitPriceInr * item.quantity, 0);
  const nutrigItem = items.find((i) => i.itemType === 'product' && i.slug === 'nutrig');
  const fitgItem = items.find((i) => i.itemType === 'product' && i.slug === 'fitg');
  const bundle2 = bundles.find((b) => b.slug === 'bundle-2' && b.status === 'available');
  const pairSavings =
    nutrigItem && fitgItem && bundle2
      ? bundle2.savings_inr * Math.min(nutrigItem.quantity, fitgItem.quantity)
      : 0;
  const promoDiscount = appliedPromo ? appliedPromo.discountInr : 0;
  const estimatedTotal = Math.max(0, subtotal - pairSavings - promoDiscount);

  const handleApplyPromo = async () => {
    setPromoError(null);
    try {
      const res = await apiFetch<{ promo: { code: string; title: string; discountInr: number } }>(
        '/api/public/promo/validate',
        {
          method: 'POST',
          body: JSON.stringify({ code: promoInput, subtotalInr: subtotal }),
        }
      );
      setAppliedPromo(res.promo);
    } catch (err) {
      setAppliedPromo(null);
      setPromoError(err instanceof Error ? err.message : 'Invalid promo code.');
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disclaimerAccepted) {
      setDisclaimerError('Please acknowledge the genetic testing disclaimer before placing your order.');
      return;
    }
    setDisclaimerError(null);
    setSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch<{ order: any }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: items.map((i) => ({
            itemType: i.itemType,
            slug: i.slug,
            quantity: i.quantity,
          })),
          shipping,
          promoCode: appliedPromo?.code || '',
        }),
      });
      setConfirmedOrder(res.order);
      onClearCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedOrder) {
    const mappedForInvoice: Order = {
      id: confirmedOrder.id,
      order_number: confirmedOrder.orderNumber,
      invoice_number: confirmedOrder.invoiceNumber,
      user_id: user?.id ?? null,
      customer_name: confirmedOrder.customerName,
      customer_email: confirmedOrder.customerEmail,
      customer_phone: confirmedOrder.customerPhone,
      shipping_address: shipping.address,
      city: shipping.city,
      state: shipping.state,
      pincode: shipping.pincode,
      items: confirmedOrder.items,
      subtotal_inr: confirmedOrder.subtotalInr,
      discount_inr: confirmedOrder.discountInr,
      promo_code: confirmedOrder.promoCode,
      total_inr: confirmedOrder.totalInr,
      payment_method: confirmedOrder.paymentMethod,
      payment_status: confirmedOrder.paymentStatus,
      payment_reference: confirmedOrder.paymentReference,
      order_status: confirmedOrder.orderStatus,
      tracking_code: confirmedOrder.trackingCode,
      advisor_id: null,
      created_at: confirmedOrder.createdAt || new Date().toISOString(),
    };

    return (
      <main className="bg-slate-50 py-14 min-h-[70vh]">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-[#0B2246]">Order Confirmed</h1>
              <p className="text-sm text-slate-600 mt-1">
                Your DNA GENEIE order has been verified and recorded with server-calculated INR pricing.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Order Number</p>
                <p className="font-mono font-bold text-[#0B2246]">{confirmedOrder.orderNumber}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Tracking Code</p>
                <p className="font-mono font-bold text-[#0D9488]">{confirmedOrder.trackingCode}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Invoice Number</p>
                <p className="font-mono font-semibold text-[#0B2246]">{confirmedOrder.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Amount Paid</p>
                <p className="font-mono tabular-nums font-bold text-[#0B2246]">
                  {formatINR(confirmedOrder.totalInr)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => setInvoiceOrder(mappedForInvoice)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-300 text-[#0B2246] text-sm font-semibold hover:bg-slate-50 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#0D9488]" />
                <span>View & Download Invoice</span>
              </button>
              {user?.role === 'member' ? (
                <button
                  type="button"
                  onClick={() => onNavigate({ page: 'member-dashboard' })}
                  className="px-6 py-3 rounded-xl dna-gradient-bg text-white text-sm font-semibold cursor-pointer"
                >
                  Track Order in Member Dashboard
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate({ page: 'member-auth' })}
                  className="px-6 py-3 rounded-xl dna-gradient-bg text-white text-sm font-semibold cursor-pointer"
                >
                  Member Login / Register
                </button>
              )}
            </div>
            <div className="pt-4 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="font-semibold text-[#0B2246]">Order Support:</span>
              <a href={OFFICIAL_MAILTO} className="inline-flex items-center gap-1 hover:text-[#0D9488]">
                <Mail className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>{OFFICIAL_EMAIL}</span>
              </a>
              <a href={OFFICIAL_PHONE_HREF} className="inline-flex items-center gap-1 font-mono hover:text-[#0D9488]">
                <Phone className="w-3.5 h-3.5 text-[#0D9488]" />
                <span>{OFFICIAL_PHONE_DISPLAY}</span>
              </a>
              <a
                href={OFFICIAL_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[#128C7E] hover:underline"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Support</span>
              </a>
            </div>
          </div>
        </div>
        <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
      </main>
    );
  }

  return (
    <main className="bg-slate-50 py-12 min-h-[75vh]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => onNavigate({ page: 'home' })}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#0B2246] mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Continue Shopping</span>
        </button>

        <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#0B2246] mb-8">
          Secure DNA Kit Checkout
        </h1>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-4">
            <p className="text-lg font-semibold text-[#0B2246]">Your cart is currently empty.</p>
            <button
              type="button"
              onClick={() => onNavigate({ page: 'home' })}
              className="px-6 py-3 rounded-xl dna-gradient-bg text-white text-sm font-semibold cursor-pointer"
            >
              Browse Available DNA Tests
            </button>
          </div>
        ) : (
          <form onSubmit={handleCheckoutSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-display font-bold text-[#0B2246]">1. Kit Delivery Address</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {user ? `Signed in as ${user.email}` : 'Checkout as guest or sign in to link this order to your Member Dashboard.'}
                </p>
              </div>

              {savedAddresses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0D9488]" />
                    <span>Saved Delivery Addresses</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() =>
                          setShipping((s) => ({
                            ...s,
                            fullName: addr.full_name,
                            phone: addr.phone,
                            address: addr.address_line,
                            city: addr.city,
                            state: addr.state,
                            pincode: addr.pincode,
                          }))
                        }
                        className="p-3 rounded-xl border border-slate-200 hover:border-[#0D9488] text-left text-xs cursor-pointer"
                      >
                        <p className="font-bold text-[#0B2246]">{addr.label} · {addr.full_name}</p>
                        <p className="text-slate-500 truncate mt-0.5">
                          {addr.address_line}, {addr.city} - {addr.pincode}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={shipping.fullName}
                    onChange={(e) => setShipping((s) => ({ ...s, fullName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={shipping.email}
                    onChange={(e) => setShipping((s) => ({ ...s, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={shipping.phone}
                    onChange={(e) => setShipping((s) => ({ ...s, phone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">PIN Code</label>
                  <input
                    type="text"
                    required
                    value={shipping.pincode}
                    onChange={(e) => setShipping((s) => ({ ...s, pincode: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Street Address</label>
                <input
                  type="text"
                  required
                  value={shipping.address}
                  onChange={(e) => setShipping((s) => ({ ...s, address: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">City</label>
                  <input
                    type="text"
                    required
                    value={shipping.city}
                    onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">State</label>
                  <input
                    type="text"
                    required
                    value={shipping.state}
                    onChange={(e) => setShipping((s) => ({ ...s, state: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              {user?.role === 'member' && (
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shipping.saveAddress}
                    onChange={(e) => setShipping((s) => ({ ...s, saveAddress: e.target.checked }))}
                  />
                  <span>Save this delivery address to my Member profile</span>
                </label>
              )}

              <div className="pt-4 border-t border-slate-200">
                <GeneticTestingDisclaimer
                  checked={disclaimerAccepted}
                  onCheckedChange={(checked) => {
                    setDisclaimerAccepted(checked);
                    if (checked) setDisclaimerError(null);
                  }}
                  onInvalid={() =>
                    setDisclaimerError('Please acknowledge the genetic testing disclaimer before placing your order.')
                  }
                  error={disclaimerError}
                />
              </div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-5">
              <h2 className="text-lg font-display font-bold text-[#0B2246]">Order Summary</h2>
              <div className="space-y-3 text-sm">
                {items.map((item) => (
                  <div
                    key={`${item.itemType}-${item.slug}`}
                    className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0B2246]">{item.name}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.itemType, item.slug, item.quantity - 1)}
                          aria-label={`Decrease ${item.name} quantity`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-7 text-center font-mono tabular-nums text-sm font-semibold text-[#0B2246]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.itemType, item.slug, item.quantity + 1)}
                          aria-label={`Increase ${item.name} quantity`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-xs text-slate-500">Qty</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.itemType, item.slug)}
                        aria-label={`Remove ${item.name} from cart`}
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                      <span className="font-mono tabular-nums text-sm font-semibold text-slate-800">
                        {formatINR(item.unitPriceInr * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code Box */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <label className="block text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>Promo Code (Try WELLNESS2000)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Enter code"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-[#0B2246] hover:bg-slate-50 cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {promoError && <p className="text-xs text-rose-600">{promoError}</p>}
                {appliedPromo && (
                  <p className="text-xs text-teal-700 font-semibold">
                    Applied {appliedPromo.code}: -{formatINR(appliedPromo.discountInr)}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">{formatINR(subtotal)}</span>
                </div>
                {pairSavings > 0 && (
                  <div className="flex justify-between text-teal-700 font-medium">
                    <span>Bundle of 2 Savings</span>
                    <span className="font-mono tabular-nums">-{formatINR(pairSavings)}</span>
                  </div>
                )}
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-teal-700 font-medium">
                    <span>Promo ({appliedPromo?.code})</span>
                    <span className="font-mono tabular-nums">-{formatINR(promoDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-[#0B2246] pt-2 border-t border-slate-200">
                  <span>Total Payable (INR)</span>
                  <span className="font-mono tabular-nums">{formatINR(estimatedTotal)}</span>
                </div>
              </div>

              {error && (
                <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3.5 py-2.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-6 rounded-xl dna-gradient-bg text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-60 transition-opacity cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>{submitting ? 'Verifying & Placing Order...' : `Pay ${formatINR(estimatedTotal)} & Place Order`}</span>
              </button>

              <p className="text-xs text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0D9488] shrink-0" />
                <span>Final prices and promo discounts are verified strictly on the server.</span>
              </p>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                <p className="font-semibold text-[#0B2246]">Order &amp; Payment Assistance</p>
                <div className="flex flex-wrap items-center gap-3">
                  <a href={OFFICIAL_MAILTO} className="inline-flex items-center gap-1 hover:text-[#0D9488]">
                    <Mail className="w-3.5 h-3.5 text-[#0D9488]" />
                    <span>{OFFICIAL_EMAIL}</span>
                  </a>
                  <a href={OFFICIAL_PHONE_HREF} className="inline-flex items-center gap-1 font-mono hover:text-[#0D9488]">
                    <Phone className="w-3.5 h-3.5 text-[#0D9488]" />
                    <span>{OFFICIAL_PHONE_DISPLAY}</span>
                  </a>
                  <a
                    href={OFFICIAL_WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-[#128C7E] hover:underline"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </main>
  );
};
