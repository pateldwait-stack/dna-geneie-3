import React from 'react';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import type { ActiveRoute } from '../types';
import {
  OFFICIAL_EMAIL,
  OFFICIAL_MAILTO,
  OFFICIAL_PHONE_DISPLAY,
  OFFICIAL_PHONE_HREF,
  OFFICIAL_WHATSAPP_URL,
} from '../lib/contact';
import { BrandLogo } from './BrandLogo';

interface FooterProps {
  onNavigate: (route: ActiveRoute, sectionId?: string) => void;
  readOnlyCatalog: boolean;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, readOnlyCatalog }) => {
  return (
    <footer className="bg-[#081933] text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className={`grid grid-cols-1 gap-10 ${readOnlyCatalog ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
          <div className="md:col-span-1 space-y-4">
            <BrandLogo showTagline inverted size="md" />
            <p className="text-sm text-slate-400 leading-relaxed">
              Precision DNA testing panels across nutrition, fitness, and skin biology, delivered through verified clinical workflows.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">DNA Testing Panels</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate({ page: 'product', slug: 'nutrig' })}
                  className="hover:text-teal-300 transition-colors cursor-pointer"
                >
                  NutriG — Nutrition DNA
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate({ page: 'product', slug: 'fitg' })}
                  className="hover:text-teal-300 transition-colors cursor-pointer"
                >
                  FitG — Fitness DNA
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate({ page: 'product', slug: 'dermag' })}
                  className="hover:text-teal-300 transition-colors cursor-pointer"
                >
                  DermaG — Skin Health (Coming Soon)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate({ page: 'home' }, 'bundles')}
                  className="hover:text-teal-300 transition-colors cursor-pointer"
                >
                  Bundle Packages
                </button>
              </li>
            </ul>
          </div>

          {!readOnlyCatalog && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Account Portals</h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate({ page: 'member-auth' })}
                    className="hover:text-teal-300 transition-colors cursor-pointer"
                  >
                    Member Login & Registration
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate({ page: 'advisor-auth' })}
                    className="hover:text-teal-300 transition-colors cursor-pointer"
                  >
                    Advisor Portal
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate({ page: 'admin-auth' })}
                    className="hover:text-teal-300 transition-colors cursor-pointer"
                  >
                    Administrator Console
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onNavigate({ page: 'checkout' })}
                    className="hover:text-teal-300 transition-colors cursor-pointer"
                  >
                    Checkout
                  </button>
                </li>
              </ul>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Contact & Support</h3>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li>
                <a
                  href={OFFICIAL_MAILTO}
                  className="inline-flex items-center gap-2 hover:text-teal-300 transition-colors"
                >
                  <Mail className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>{OFFICIAL_EMAIL}</span>
                </a>
              </li>
              <li>
                <a
                  href={OFFICIAL_PHONE_HREF}
                  className="inline-flex items-center gap-2 hover:text-teal-300 transition-colors font-mono"
                >
                  <Phone className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>{OFFICIAL_PHONE_DISPLAY}</span>
                </a>
              </li>
              <li>
                <a
                  href={OFFICIAL_WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-teal-300 hover:text-teal-200 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>WhatsApp Us</span>
                </a>
              </li>
              <li className="text-slate-400">Mumbai &amp; Pan-India Kit Delivery</li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate({ page: 'home' }, 'enquiry')}
                  className="text-teal-300 hover:underline cursor-pointer"
                >
                  {readOnlyCatalog ? 'Contact Us' : 'Contact Us / Consultation Form'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate({ page: 'support' })}
                  className="hover:text-teal-300 transition-colors cursor-pointer"
                >
                  Customer Support &amp; DPDP Privacy
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} DNA GENEIE. Wellness from within. All rights reserved.</p>
          <p>Encrypted Member & Advisor Data Protection</p>
        </div>
      </div>
    </footer>
  );
};
