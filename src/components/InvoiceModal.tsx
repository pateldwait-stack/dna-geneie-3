import React from 'react';
import { Printer, X } from 'lucide-react';
import type { Order } from '../types';
import { formatINR } from '../lib/api';
import { OFFICIAL_EMAIL, OFFICIAL_PHONE_DISPLAY } from '../lib/contact';
import { BrandLogo } from './BrandLogo';

interface InvoiceModalProps {
  order: Order | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const invoiceNo = order.invoice_number || `INV-${order.order_number}`;

  const handleDownloadInvoice = () => {
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${invoiceNo} — DNA GENEIE Invoice</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; padding: 36px; max-width: 780px; margin: 0 auto; }
  h1 { color: #0B2246; margin: 0; font-size: 22px; }
  .muted { color: #64748b; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th, td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 14px; }
  .num { text-align: right; font-family: monospace; }
  .total { font-weight: 700; font-size: 16px; color: #0B2246; }
</style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0B2246;padding-bottom:16px;">
    <div>
      <h1>DNA GENEIE</h1>
      <div class="muted">Wellness from within · Clinical Genomics India</div>
      <div class="muted">${OFFICIAL_EMAIL} · ${OFFICIAL_PHONE_DISPLAY}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-weight:700;">TAX INVOICE</div>
      <div class="muted">Invoice #: ${invoiceNo}</div>
      <div class="muted">Order #: ${order.order_number}</div>
      <div class="muted">Date: ${order.created_at.slice(0, 10)}</div>
    </div>
  </div>
  <div style="margin-top:20px;">
    <div style="font-weight:600;">Billed & Shipped To:</div>
    <div>${order.customer_name}</div>
    <div class="muted">${order.shipping_address}, ${order.city}, ${order.state} - ${order.pincode}</div>
    <div class="muted">${order.customer_email} · ${order.customer_phone}</div>
  </div>
  <table>
    <thead><tr><th>DNA Panel / Bundle</th><th class="num">Qty</th><th class="num">Unit Price</th><th class="num">Line Total</th></tr></thead>
    <tbody>
      ${order.items
        .map(
          (i) =>
            `<tr><td>${i.name}</td><td class="num">${i.quantity}</td><td class="num">${formatINR(i.unitPriceInr)}</td><td class="num">${formatINR(i.lineTotalInr)}</td></tr>`
        )
        .join('')}
      <tr><td colspan="3" class="num">Subtotal</td><td class="num">${formatINR(order.subtotal_inr)}</td></tr>
      ${order.discount_inr > 0 ? `<tr><td colspan="3" class="num">Discount / Bundle Savings</td><td class="num">-${formatINR(order.discount_inr)}</td></tr>` : ''}
      <tr><td colspan="3" class="num total">Total Paid (INR)</td><td class="num total">${formatINR(order.total_inr)}</td></tr>
    </tbody>
  </table>
  <p class="muted" style="margin-top:24px;">Payment Method: ${order.payment_method} · Reference: ${order.payment_reference} · Status: ${order.payment_status.toUpperCase()}</p>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoiceNo}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#0D9488]">Tax Invoice</p>
            <h2 className="text-lg font-display font-bold text-[#0B2246]">{invoiceNo}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadInvoice}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg dna-gradient-bg text-white text-xs font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Download Invoice</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              aria-label="Close invoice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 text-sm">
          <div className="flex flex-wrap justify-between gap-4 pb-4 border-b border-slate-200">
            <BrandLogo showTagline size="sm" />
            <div className="text-right text-xs text-slate-500 space-y-0.5 font-mono">
              <p>Order: {order.order_number}</p>
              <p>Tracking: {order.tracking_code}</p>
              <p>Date: {order.created_at.slice(0, 10)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-semibold text-slate-500">Customer & Delivery Address</p>
              <p className="font-bold text-[#0B2246] text-sm mt-1">{order.customer_name}</p>
              <p className="text-slate-600 mt-0.5">
                {order.shipping_address}, {order.city}, {order.state} - {order.pincode}
              </p>
              <p className="text-slate-600 mt-0.5">
                {order.customer_email} · {order.customer_phone}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="font-semibold text-slate-500">Payment Summary</p>
              <p className="font-semibold text-[#0B2246] mt-1">{order.payment_method}</p>
              <p className="font-mono text-slate-600 mt-0.5">Ref: {order.payment_reference}</p>
              <p className="capitalize font-semibold text-[#0D9488] mt-0.5">Status: {order.payment_status}</p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Item</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Qty</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Price</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-4 font-medium text-[#0B2246]">{item.name}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{item.quantity}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">{formatINR(item.unitPriceInr)}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold">
                      {formatINR(item.lineTotalInr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1.5 text-sm max-w-xs ml-auto">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">{formatINR(order.subtotal_inr)}</span>
            </div>
            {order.discount_inr > 0 && (
              <div className="flex justify-between text-teal-700 font-medium">
                <span>Savings {order.promo_code ? `(${order.promo_code})` : ''}</span>
                <span className="font-mono tabular-nums">-{formatINR(order.discount_inr)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-[#0B2246] pt-2 border-t border-slate-200">
              <span>Total Paid (INR)</span>
              <span className="font-mono tabular-nums">{formatINR(order.total_inr)}</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 pt-3 border-t border-slate-100 text-center">
            DNA GENEIE Support: {OFFICIAL_EMAIL} · {OFFICIAL_PHONE_DISPLAY}
          </p>
        </div>
      </div>
    </div>
  );
};
