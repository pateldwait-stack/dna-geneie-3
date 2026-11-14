import React, { useMemo, useState } from 'react';
import { Heart, Mail, Menu, MessageCircle, Phone, Search, ShoppingBag, User, X } from 'lucide-react';
import type { ActiveRoute, AuthUser, Bundle, Product } from '../types';
import { formatINR } from '../lib/api';
import {
  BRAND_TAGLINE,
  OFFICIAL_EMAIL,
  OFFICIAL_MAILTO,
  OFFICIAL_PHONE_DISPLAY,
  OFFICIAL_PHONE_HREF,
  OFFICIAL_WHATSAPP_URL,
} from '../lib/contact';
import { BrandLogo } from './BrandLogo';

interface NavbarProps {
  user: AuthUser | null;
  readOnlyCatalog: boolean;
  products: Product[];
  bundles: Bundle[];
  cartCount: number;
  wishlistCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigate: (route: ActiveRoute, sectionId?: string) => void;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  readOnlyCatalog,
  products,
  bundles,
  cartCount,
  wishlistCount,
  searchQuery,
  onSearchChange,
  onNavigate,
  onOpenCart,
  onOpenWishlist,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const prodMatches = products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      )
      .map((p) => ({
        type: 'product' as const,
        slug: p.slug,
        title: p.name,
        subtitle: p.status === 'coming_soon' ? `${p.category} · Coming Soon` : `${p.category} · ${formatINR(p.price_inr)}`,
      }));

    const bundleMatches = bundles
      .filter((b) => b.name.toLowerCase().includes(q) || b.description.toLowerCase().includes(q))
      .map((b) => ({
        type: 'bundle' as const,
        slug: b.slug,
        title: b.name,
        subtitle: b.status === 'coming_soon' ? 'Bundle · Coming Soon' : `Bundle · ${formatINR(b.price_inr)}`,
      }));

    return [...prodMatches, ...bundleMatches].slice(0, 6);
  }, [searchQuery, products, bundles]);

  const goToDashboard = () => {
    if (!user) {
      onNavigate({ page: 'portal-select' });
      return;
    }
    if (user.role === 'admin') onNavigate({ page: 'admin-dashboard' });
    else if (user.role === 'advisor') onNavigate({ page: 'advisor-dashboard' });
    else onNavigate({ page: 'member-dashboard' });
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Slim Official Contact Header Strip */}
      <div className="bg-[#081933] text-slate-200 text-xs border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between gap-3">
          <p className="hidden sm:block text-slate-300 font-medium truncate">
            DNA GENEIE · <span className="text-teal-300">{BRAND_TAGLINE}</span>
          </p>
          <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-5 w-full sm:w-auto">
            <a
              href={OFFICIAL_MAILTO}
              className="inline-flex items-center gap-1.5 hover:text-teal-300 transition-colors truncate"
            >
              <Mail className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="truncate">{OFFICIAL_EMAIL}</span>
            </a>
            <a
              href={OFFICIAL_PHONE_HREF}
              className="inline-flex items-center gap-1.5 hover:text-teal-300 transition-colors whitespace-nowrap shrink-0"
            >
              <Phone className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="font-mono">{OFFICIAL_PHONE_DISPLAY}</span>
            </a>
            <a
              href={OFFICIAL_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 text-teal-300 hover:text-teal-200 font-medium whitespace-nowrap shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Brand Mark */}
        <button
          type="button"
          onClick={() => onNavigate({ page: 'home' })}
          className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 rounded-md shrink-0 cursor-pointer"
          aria-label="DNA GENEIE Home"
        >
          <BrandLogo size="sm" />
        </button>

        {/* Storefront Search with Live Suggestions */}
        <div className="hidden md:block relative flex-1 max-w-md">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search NutriG, FitG, DermaG, nutrition, fitness..."
              aria-label="Search DNA tests"
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            />
          </div>

          {searchFocused && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
              {suggestions.map((sug) => (
                <button
                  key={`${sug.type}-${sug.slug}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSearchFocused(false);
                    if (sug.type === 'product') {
                      onNavigate({ page: 'product', slug: sug.slug });
                    } else {
                      onNavigate({ page: 'home' }, 'bundles');
                    }
                  }}
                  className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between gap-3 border-b border-slate-100 last:border-b-0 cursor-pointer"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#0B2246]">{sug.title}</p>
                    <p className="text-xs text-slate-500">{sug.subtitle}</p>
                  </div>
                  <span className="text-xs font-semibold text-[#0D9488]">View</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Zone 2: Primary Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => onNavigate({ page: 'home' }, 'tests')}
            className="hover:text-[#0B2246] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            DNA Tests
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ page: 'home' }, 'bundles')}
            className="hover:text-[#0B2246] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Bundles
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ page: 'home' }, 'enquiry')}
            className="hover:text-[#0B2246] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Contact Us
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ page: 'support' })}
            className="hover:text-[#0B2246] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Support
          </button>
        </nav>

        {/* Zone 3: Wishlist, Cart, Account */}
        <div className="flex items-center gap-2.5 shrink-0">
          {!readOnlyCatalog && (
            <>
              <button
                type="button"
                onClick={onOpenWishlist}
                className="relative inline-flex items-center gap-1.5 px-2.5 py-2 text-sm font-medium text-slate-700 hover:text-[#0B2246] border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                aria-label="Open Wishlist"
              >
                <Heart className="w-4 h-4 text-[#0D9488]" />
                {wishlistCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-4.5 px-1 text-[11px] font-mono font-semibold text-white bg-[#0D9488] rounded-md tabular-nums">
                    {wishlistCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={onOpenCart}
                className="relative inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:text-[#0B2246] border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                aria-label="Open Shopping Cart"
              >
                <ShoppingBag className="w-4 h-4 text-[#0D9488]" />
                <span className="hidden sm:inline">Cart</span>
                {cartCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-mono font-semibold text-white bg-[#0B2246] rounded-md tabular-nums">
                    {cartCount}
                  </span>
                )}
              </button>

              {user ? (
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goToDashboard}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-[#0B2246] hover:bg-[#133366] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <User className="w-4 h-4 text-teal-300" />
                    <span className="max-w-[120px] truncate">{user.full_name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate({ page: 'portal-select' })}
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white dna-gradient-bg hover:opacity-95 rounded-lg transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span>Login / Account</span>
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu & Search */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
          <div className="md:hidden relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search DNA tests..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate({ page: 'home' }, 'tests');
            }}
            className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            DNA Tests
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate({ page: 'home' }, 'bundles');
            }}
            className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Bundles
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate({ page: 'home' }, 'how-it-works');
            }}
            className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate({ page: 'home' }, 'enquiry');
            }}
            className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Contact Us
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate({ page: 'support' });
            }}
            className="block w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Support & DPDP Privacy
          </button>
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 gap-1.5 text-xs">
            <a
              href={OFFICIAL_MAILTO}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 text-[#0B2246] font-semibold"
            >
              <Mail className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Email: {OFFICIAL_EMAIL}</span>
            </a>
            <a
              href={OFFICIAL_PHONE_HREF}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 text-[#0B2246] font-semibold"
            >
              <Phone className="w-3.5 h-3.5 text-[#0D9488]" />
              <span>Call: {OFFICIAL_PHONE_DISPLAY}</span>
            </a>
            <a
              href={OFFICIAL_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#128C7E]/10 text-[#0E7266] font-semibold"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Us ({OFFICIAL_PHONE_DISPLAY})</span>
            </a>
          </div>
          {!readOnlyCatalog && (
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    goToDashboard();
                  }}
                  className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-[#0B2246] rounded-lg"
                >
                  Open {user.role === 'admin' ? 'Owner Admin' : user.role === 'advisor' ? 'Advisor' : 'Member'} Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate({ page: 'portal-select' });
                }}
                className="w-full px-4 py-2.5 text-sm font-semibold text-white dna-gradient-bg rounded-lg"
              >
                Login / Account
              </button>
            )}
            </div>
          )}
        </div>
      )}
    </header>
  );
};
