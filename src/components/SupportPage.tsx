import React, { useState } from 'react';
import { ArrowLeft, Mail, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import type { ActiveRoute } from '../types';
import { apiFetch } from '../lib/api';
import {
  BRAND_NAME,
  BRAND_TAGLINE,
  OFFICIAL_EMAIL,
  OFFICIAL_MAILTO,
  OFFICIAL_PHONE_DISPLAY,
  OFFICIAL_PHONE_HREF,
  OFFICIAL_WHATSAPP_URL,
} from '../lib/contact';

interface SupportPageProps {
  onNavigate: (route: ActiveRoute) => void;
}

export const SupportPage: React.FC<SupportPageProps> = ({ onNavigate }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    interestProduct: 'Customer Support & Order Assistance',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiFetch<{ message: string }>('/api/enquiries', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setNotice(res.message);
      setForm({
        name: '',
        email: '',
        phone: '',
        subject: '',
        interestProduct: 'Customer Support & Order Assistance',
        message: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit support enquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bg-slate-50 py-12 min-h-[78vh]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <button
          type="button"
          onClick={() => onNavigate({ page: 'home' })}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#0B2246] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Storefront</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-6">
            <div>
              <p className="text-xs font-semibold text-[#0D9488]">Contact Us · Customer Care &amp; Privacy</p>
              <h1 className="text-3xl font-display font-bold text-[#0B2246] mt-1">
                Contact {BRAND_NAME} &amp; DPDP Privacy Notice
              </h1>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                Reach our clinical genomics advisors, track order fulfillment, or manage your data privacy rights under India&apos;s Digital Personal Data Protection (DPDP) Act.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-[#081933] to-[#0B2246] text-white p-6 space-y-5 shadow-sm">
              <div className="border-b border-white/10 pb-4">
                <p className="text-xl font-display font-extrabold tracking-tight">{BRAND_NAME}</p>
                <p className="text-xs font-medium text-teal-300 mt-0.5">{BRAND_TAGLINE}</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-teal-300 shrink-0 mt-1" />
                  <div>
                    <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Email</p>
                    <a
                      href={OFFICIAL_MAILTO}
                      className="text-white font-semibold hover:text-teal-300 transition-colors break-all"
                    >
                      {OFFICIAL_EMAIL}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-teal-300 shrink-0 mt-1" />
                  <div>
                    <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Phone</p>
                    <a
                      href={OFFICIAL_PHONE_HREF}
                      className="text-white font-mono font-semibold hover:text-teal-300 transition-colors"
                    >
                      {OFFICIAL_PHONE_DISPLAY}
                    </a>
                    <p className="text-xs text-slate-300 mt-0.5">Monday – Saturday, 9:30 AM – 6:30 PM IST</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <a
                  href={OFFICIAL_MAILTO}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white text-[#0B2246] hover:bg-slate-100 text-xs font-bold transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>Email Us</span>
                </a>
                <a
                  href={OFFICIAL_PHONE_HREF}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0f766e] text-white text-xs font-bold transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Now</span>
                </a>
                <a
                  href={OFFICIAL_WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#128C7E] hover:bg-[#0E7266] text-white text-xs font-bold transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Us</span>
                </a>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0B2246]">
                <ShieldCheck className="w-5 h-5 text-[#0D9488]" />
                <span>DPDP Act Data Collection &amp; Rights Notice</span>
              </div>
              <p>
                We collect only personal and delivery data strictly necessary for kit dispatch, laboratory sample linkage, clinical report delivery, and statutory invoicing.
              </p>
              <p>
                Sensitive genomic report summaries are encrypted at rest (AES-256-GCM) and accessible solely to you and authorized personnel under explicit consent.
              </p>
              <p>
                Registered members can manage granular consents, download a complete personal data export, or request data erasure directly from their Member Dashboard, or contact our Data Protection Desk at{' '}
                <a href={OFFICIAL_MAILTO} className="font-semibold text-[#0B2246] underline">
                  {OFFICIAL_EMAIL}
                </a>{' '}
                or{' '}
                <a href={OFFICIAL_PHONE_HREF} className="font-semibold text-[#0B2246] underline font-mono">
                  {OFFICIAL_PHONE_DISPLAY}
                </a>
                .
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
            <h2 className="text-xl font-display font-bold text-[#0B2246]">Customer Enquiry Form</h2>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Enquiries are securely routed to <span className="font-semibold text-[#0B2246]">{OFFICIAL_EMAIL}</span>.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sup-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Customer Name
                  </label>
                  <input
                    id="sup-name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Aarav Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label htmlFor="sup-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="sup-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sup-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    id="sup-phone"
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+91 90232 94189"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label htmlFor="sup-subject" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Subject
                  </label>
                  <input
                    id="sup-subject"
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        subject: e.target.value,
                        interestProduct: e.target.value || 'Customer Support & Order Assistance',
                      }))
                    }
                    placeholder="e.g. Order Support, NutriG/FitG Enquiry, DPDP Request"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="sup-message" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Message
                </label>
                <textarea
                  id="sup-message"
                  rows={5}
                  required
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="How can our DNA GENEIE support team help you?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                />
              </div>

              {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">{error}</p>}
              {notice && <p className="text-sm text-teal-800 bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">{notice}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-xl dna-gradient-bg text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60 cursor-pointer"
              >
                {submitting ? 'Sending Message...' : 'Send Support Enquiry'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
};
