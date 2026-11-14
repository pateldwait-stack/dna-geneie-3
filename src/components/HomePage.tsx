import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Dna,
  FlaskConical,
  Heart,
  Lock,
  Mail,
  MessageCircle,
  Package,
  Phone,
  ShieldCheck,
  Star,
  Tag,
  X,
} from 'lucide-react';
import type { ActiveRoute, Bundle, Product, PromoOffer } from '../types';
import { apiFetch, formatINR } from '../lib/api';
import { BRAND_ASSETS, getProductImage } from '../lib/assets';
import {
  BRAND_NAME,
  BRAND_TAGLINE,
  OFFICIAL_EMAIL,
  OFFICIAL_MAILTO,
  OFFICIAL_PHONE_DISPLAY,
  OFFICIAL_PHONE_HREF,
  OFFICIAL_WHATSAPP_URL,
} from '../lib/contact';
import { UsaFlagIcon } from './BrandLogo';

const HERO_SLIDES = [
  {
    src: '/assets/images/hero-lab-microscope.jpeg',
    alt: 'Microscope and modern laboratory equipment',
  },
  {
    src: '/assets/images/hero-lab-scientist.jpeg',
    alt: 'Laboratory scientist working with DNA samples',
  },
  {
    src: '/assets/images/hero-genetic-report.jpeg',
    alt: 'Genetic testing report and DNA collection kit on a wooden table',
  },
] as const;

const FEATURED_PRODUCT_ORDER: Record<string, number> = {
  nutrig: 0,
  fitg: 1,
  dermag: 2,
};

interface HomePageProps {
  products: Product[];
  bundles: Bundle[];
  promos: PromoOffer[];
  usaLabSectionPublished: boolean;
  searchQuery: string;
  wishlistSlugs: string[];
  recentlyViewedSlugs: string[];
  onToggleWishlist: (slug: string) => void;
  onAddToCart: (item: { itemType: 'product' | 'bundle'; slug: string; name: string; unitPriceInr: number }) => void;
  onNavigate: (route: ActiveRoute, sectionId?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  products,
  bundles,
  promos,
  usaLabSectionPublished,
  searchQuery,
  wishlistSlugs,
  recentlyViewedSlugs,
  onToggleWishlist,
  onAddToCart,
  onNavigate,
}) => {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'coming_soon'>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'rating'>('featured');
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    motionPreference.addEventListener('change', handleMotionPreferenceChange);
    return () => motionPreference.removeEventListener('change', handleMotionPreferenceChange);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const intervalId = window.setInterval(() => {
      setActiveHeroSlide((currentSlide) => (currentSlide + 1) % HERO_SLIDES.length);
    }, 16_000);

    return () => window.clearInterval(intervalId);
  }, [prefersReducedMotion]);

  const [enquiryForm, setEnquiryForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    interestProduct: 'General DNA Consultation',
    message: '',
  });
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState<string | null>(null);
  const [enquiryError, setEnquiryError] = useState<string | null>(null);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category)));
    return ['all', ...unique];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = products.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (availabilityFilter !== 'all' && p.status !== availabilityFilter) return false;
      if (q) {
        const hay = `${p.name} ${p.category} ${p.tagline} ${p.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'featured') {
      list = [...list].sort(
        (a, b) =>
          (FEATURED_PRODUCT_ORDER[a.slug] ?? Number.MAX_SAFE_INTEGER) -
          (FEATURED_PRODUCT_ORDER[b.slug] ?? Number.MAX_SAFE_INTEGER),
      );
    } else if (sortBy === 'price_asc') {
      list = [...list].sort((a, b) => (a.price_inr ?? 999999) - (b.price_inr ?? 999999));
    } else if (sortBy === 'price_desc') {
      list = [...list].sort((a, b) => (b.price_inr ?? 0) - (a.price_inr ?? 0));
    } else if (sortBy === 'rating') {
      list = [...list].sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    }
    return list;
  }, [products, selectedCategory, availabilityFilter, sortBy, searchQuery]);

  const recentlyViewedProducts = useMemo(() => {
    return recentlyViewedSlugs
      .map((slug) => products.find((p) => p.slug === slug))
      .filter((p): p is Product => Boolean(p))
      .slice(0, 3);
  }, [recentlyViewedSlugs, products]);

  const activePromo = promos[0];

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnquirySubmitting(true);
    setEnquiryError(null);
    setEnquirySuccess(null);
    try {
      const res = await apiFetch<{ message: string }>('/api/enquiries', {
        method: 'POST',
        body: JSON.stringify(enquiryForm),
      });
      setEnquirySuccess(res.message);
      setEnquiryForm({
        name: '',
        email: '',
        phone: '',
        subject: '',
        interestProduct: 'General DNA Consultation',
        message: '',
      });
    } catch (err) {
      setEnquiryError(err instanceof Error ? err.message : 'Unable to submit enquiry.');
    } finally {
      setEnquirySubmitting(false);
    }
  };

  return (
    <main className="bg-white">
      {/* SLIM PROMOTIONAL OFFER BANNER */}
      {!bannerDismissed && (
        <div className="bg-[#0B2246] text-white text-xs py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-3.5 h-3.5 text-teal-300 shrink-0" />
              <span className="font-semibold">Bundle of 2 Offer:</span>
              <span className="text-slate-200">
                Save ₹5,000 on NutriG + FitG (₹75,000)
                {activePromo ? ` · Use code ${activePromo.code} for additional privilege` : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              className="text-slate-300 hover:text-white cursor-pointer"
              aria-label="Dismiss offer banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-slate-50/80 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-18">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="lg:col-span-6 flex flex-col justify-center space-y-6"
            >
              <div className="text-xs sm:text-sm font-semibold tracking-wide text-[#0D9488] flex items-center gap-2">
                <span>DNA GENEIE</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="text-[#0B2246]">Wellness from within</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-[3.05rem] font-display font-extrabold text-[#0B2246] leading-[1.12] tracking-tight text-balance">
                Your beauty, coded by <span className="text-[#0D9488]">nature</span>, perfected by science
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Unlock actionable biological insights tailored to your DNA. Geneie delivers certified laboratory analysis across cellular skin longevity, athletic physiology, and personalized nutrigenomics from a single painless cheek swab.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate({ page: 'home' }, 'tests')}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl dna-gradient-bg text-white font-semibold text-sm hover:opacity-95 transition-opacity cursor-pointer"
                >
                  <span>Shop DNA Panels</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate({ page: 'portal-select' })}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-slate-300 bg-white text-[#0B2246] font-semibold text-sm hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-[#0D9488]" />
                  <span>Member & Advisor Portals</span>
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="lg:col-span-6"
            >
              <div className="h-full min-h-[260px] sm:min-h-[340px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 relative">
                {HERO_SLIDES.map((slide, index) => (
                  <img
                    key={slide.src}
                    src={slide.src}
                    alt=""
                    loading="eager"
                    decoding="async"
                    aria-hidden={activeHeroSlide !== index}
                    className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-[1200ms] ease-in-out ${
                      activeHeroSlide === index ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          </div>

          {/* 4-Column Storefront Highlights */}
          <div className="mt-10 pt-8 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-xs font-medium text-slate-500">Single Panel Price</p>
              <p className="text-2xl font-display font-bold text-[#0B2246] font-mono tabular-nums mt-1">
                ₹40,000
              </p>
              <p className="text-xs text-slate-500 mt-0.5">NutriG & FitG kits</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Bundle of 2 Offer</p>
              <p className="text-2xl font-display font-bold text-[#0D9488] font-mono tabular-nums mt-1">
                ₹75,000
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Save ₹5,000 on 2 kits</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Pan-India Dispatch</p>
              <p className="text-2xl font-display font-bold text-[#0B2246] mt-1">Free Pickup</p>
              <p className="text-xs text-slate-500 mt-0.5">Sterile swab kit + return</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Laboratory Testing</p>
              <p className="text-2xl font-display font-bold text-[#0B2246] mt-1">CLIA-Certified</p>
              <p className="text-xs text-slate-500 mt-0.5">Modern U.S.-based lab</p>
            </div>
          </div>
        </div>
      </section>

      {/* DNA COLLECTION KIT */}
      <section aria-labelledby="collection-kit-heading" className="py-14 lg:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center">
            <div className="max-w-xl">
              <p className="text-xs font-semibold text-[#0D9488] tracking-wide">At-home sample collection</p>
              <h2 id="collection-kit-heading" className="text-2xl sm:text-3xl font-display font-bold text-[#0B2246] mt-2 text-balance">
                Your DNA Collection Kit
              </h2>
              <p className="text-base text-slate-600 mt-4 leading-relaxed">
                Everything you need to collect your DNA sample safely and conveniently from the comfort of your home.
              </p>
            </div>

            <div className="rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-lg shadow-slate-900/10">
              <img
                src={BRAND_ASSETS.dnaCollectionKit}
                alt="Geneie DNA sample collection kit with swabs and collection materials"
                loading="lazy"
                className="block h-auto w-full object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTS CATALOG WITH CATEGORIES, FILTERS & SORTING */}
      <section id="tests" className="py-14 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold text-[#0D9488] tracking-wide">Shop DNA Testing Kits</p>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#0B2246] mt-1.5 text-balance">
                Targeted genomic panels for nutrition, skin health, and athletic performance.
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value as any)}
                aria-label="Filter by availability"
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
              >
                <option value="all">All Statuses</option>
                <option value="available">Available Now</option>
                <option value="coming_soon">Coming Soon</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort products"
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700"
              >
                <option value="featured">Sort: Featured</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Customer Rating</option>
              </select>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#0B2246] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
                }`}
              >
                {cat === 'all' ? 'All Categories' : cat}
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-12 rounded-2xl border border-slate-200 text-center space-y-2">
              <p className="text-base font-semibold text-[#0B2246]">No matching DNA panels found</p>
              <p className="text-sm text-slate-500">Try clearing your search query or switching category filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {filteredProducts.map((product) => {
                const isComingSoon = product.status === 'coming_soon';
                const imageSrc = BRAND_ASSETS.productCardImages[product.slug] || getProductImage(product.slug, product.image_url);
                const isWishlisted = wishlistSlugs.includes(product.slug);

                return (
                  <article
                    key={product.slug}
                    className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                      <img
                        src={imageSrc}
                        alt={`${product.name} DNA testing kit`}
                        referrerPolicy="no-referrer"
                        onClick={() => onNavigate({ page: 'product', slug: product.slug })}
                        className={`w-full h-full object-contain cursor-pointer ${isComingSoon ? 'opacity-85' : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => onToggleWishlist(product.slug)}
                        aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
                        className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/95 border border-slate-200 flex items-center justify-center text-slate-700 hover:text-rose-600 cursor-pointer"
                      >
                        <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600 text-rose-600' : ''}`} />
                      </button>

                      {isComingSoon && (
                        <div className="absolute top-3 right-3 px-3 py-1 rounded-md bg-[#0B2246] text-white text-xs font-bold tracking-wider">
                          COMING SOON
                        </div>
                      )}
                    </div>

                    <div className="p-6 flex-1 flex flex-col">
                      <div className="text-xs text-slate-500 flex items-center justify-between gap-2">
                        <span className="truncate">{product.category}</span>
                        <span className="inline-flex items-center gap-1 font-mono font-semibold text-[#0B2246] shrink-0">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{product.avg_rating || 4.9}</span>
                          <span className="text-slate-400">({product.review_count || 0})</span>
                        </span>
                      </div>

                      <div className="mt-2 flex items-baseline justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => onNavigate({ page: 'product', slug: product.slug })}
                          className="text-2xl font-display font-bold text-[#0B2246] hover:text-[#0D9488] text-left cursor-pointer"
                        >
                          {product.name}
                        </button>
                        {isComingSoon ? (
                          <span className="text-sm font-bold text-[#0D9488]">COMING SOON</span>
                        ) : (
                          <div className="text-right">
                            <span className="text-xl font-mono tabular-nums font-bold text-[#0B2246]">
                              {formatINR(product.price_inr)}
                            </span>
                            {product.original_price_inr && product.price_inr && product.original_price_inr > product.price_inr && (
                              <span className="block text-xs font-mono tabular-nums text-slate-400 line-through">
                                {formatINR(product.original_price_inr)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <p className="text-sm text-slate-600 mt-2.5 leading-relaxed flex-1">
                        {product.description}
                      </p>

                      {product.offer_label && (
                        <p className="mt-3 text-xs font-semibold text-[#0D9488]">{product.offer_label}</p>
                      )}

                      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-3">
                        {isComingSoon ? (
                          <button
                            type="button"
                            disabled
                            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 text-slate-500 text-sm font-semibold cursor-not-allowed border border-slate-200"
                          >
                            Coming Soon
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              onAddToCart({
                                itemType: 'product',
                                slug: product.slug,
                                name: product.name,
                                unitPriceInr: product.price_inr || 40000,
                              })
                            }
                            className="flex-1 py-2.5 px-4 rounded-xl dna-gradient-bg text-white text-sm font-semibold hover:opacity-95 transition-opacity cursor-pointer"
                          >
                            Add to Cart
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onNavigate({ page: 'product', slug: product.slug })}
                          className="py-2.5 px-4 rounded-xl border border-slate-300 text-[#0B2246] text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* BUNDLE PACKAGES & ACTIVE OFFERS */}
      <section id="bundles" className="py-16 lg:py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold text-[#0D9488] tracking-wide">Value Bundle Offers</p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#0B2246] mt-2 text-balance">
              Combine DNA panels for integrated insights and bundle savings.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {bundles.map((bundle) => {
              const isComingSoon = bundle.status === 'coming_soon';
              return (
                <div
                  key={bundle.slug}
                  className={`rounded-2xl border p-6 sm:p-8 flex flex-col justify-between ${
                    isComingSoon ? 'bg-white/80 border-slate-200' : 'bg-white border-teal-600/30 shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-[#0D9488]">
                        {bundle.included_product_slugs
                          .map((s) => (s === 'nutrig' ? 'NutriG' : s === 'fitg' ? 'FitG' : 'DermaG'))
                          .join(' + ')}
                      </span>
                      {isComingSoon ? (
                        <span className="px-3 py-1 rounded-md bg-[#0B2246] text-white text-xs font-bold tracking-wider">
                          COMING SOON
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold font-mono tabular-nums">
                          Save {formatINR(bundle.savings_inr)}
                        </span>
                      )}
                    </div>

                    <h3 className="text-2xl font-display font-bold text-[#0B2246] mt-3">{bundle.name}</h3>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{bundle.description}</p>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-baseline gap-3">
                        <span className="text-2xl font-mono tabular-nums font-bold text-[#0B2246]">
                          {formatINR(bundle.price_inr)}
                        </span>
                        <span className="text-sm font-mono tabular-nums text-slate-400 line-through">
                          {formatINR(bundle.individual_total_inr)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {isComingSoon
                          ? 'Available for checkout once DermaG officially launches.'
                          : `Includes NutriG & FitG — saves ${formatINR(bundle.savings_inr)} vs. individual kits.`}
                      </p>
                    </div>

                    {isComingSoon ? (
                      <button
                        type="button"
                        disabled
                        className="px-6 py-3 rounded-xl bg-slate-100 text-slate-500 text-sm font-semibold cursor-not-allowed border border-slate-200 whitespace-nowrap"
                      >
                        Coming Soon
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          onAddToCart({
                            itemType: 'bundle',
                            slug: bundle.slug,
                            name: bundle.name,
                            unitPriceInr: bundle.price_inr,
                          })
                        }
                        className="px-6 py-3 rounded-xl dna-gradient-bg text-white text-sm font-semibold hover:opacity-95 transition-opacity cursor-pointer whitespace-nowrap"
                      >
                        Add Bundle to Cart
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* RECENTLY VIEWED PRODUCTS */}
      {recentlyViewedProducts.length > 0 && (
        <section className="py-12 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-lg font-display font-bold text-[#0B2246] mb-5">Recently Viewed Panels</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {recentlyViewedProducts.map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => onNavigate({ page: 'product', slug: p.slug })}
                  className="p-4 rounded-xl border border-slate-200 hover:border-[#0D9488] bg-slate-50/40 flex items-center gap-4 text-left transition-colors cursor-pointer"
                >
                  <img
                    src={getProductImage(p.slug, p.image_url)}
                    alt={p.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0B2246] truncate">{p.name}</p>
                    <p className="text-xs text-slate-500 truncate">{p.category}</p>
                    <p className="text-xs font-mono font-bold text-[#0D9488] mt-1">
                      {p.status === 'coming_soon' ? 'COMING SOON' : formatINR(p.price_inr)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-16 lg:py-22 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-semibold text-[#0D9488] tracking-wide">How It Works</p>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#0B2246] mt-2 text-balance">
              Four structured clinical steps from home collection to verified report delivery.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
              <div className="w-11 h-11 rounded-xl bg-[#0B2246] text-white flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <p className="text-xs font-mono font-semibold text-[#0D9488]">Step 01</p>
              <h3 className="text-lg font-display font-bold text-[#0B2246]">Order Your DNA Kit</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Select NutriG, FitG, or the Bundle of 2 and receive your sterile DNA collection kit delivered directly to your address.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
              <div className="w-11 h-11 rounded-xl bg-[#0E4D7B] text-white flex items-center justify-center">
                <Dna className="w-5 h-5" />
              </div>
              <p className="text-xs font-mono font-semibold text-[#0D9488]">Step 02</p>
              <h3 className="text-lg font-display font-bold text-[#0B2246]">Register & Swab Sample</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Register your kit barcode inside your Member Dashboard and complete the quick, painless cheek swab collection at home.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
              <div className="w-11 h-11 rounded-xl bg-[#0D9488] text-white flex items-center justify-center">
                <FlaskConical className="w-5 h-5" />
              </div>
              <p className="text-xs font-mono font-semibold text-[#0D9488]">Step 03</p>
              <h3 className="text-lg font-display font-bold text-[#0B2246]">Laboratory Processing</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Your sealed sample undergoes DNA extraction, array genotyping, quality control, and clinical bioinformatics verification.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
              <div className="w-11 h-11 rounded-xl dna-gradient-bg text-white flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <p className="text-xs font-mono font-semibold text-[#0D9488]">Step 04</p>
              <h3 className="text-lg font-display font-bold text-[#0B2246]">Verified Member Report Access</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Access your personalized DNA report securely through your Member Dashboard once laboratory processing and report verification are complete.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CONDITIONAL USA LAB TESTING SECTION */}
      {usaLabSectionPublished && (
        <section className="py-16 bg-slate-50 border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-2.5 text-sm font-semibold text-[#0B2246]">
                  <UsaFlagIcon />
                  <span>United States Laboratory Workflow</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#0B2246] text-balance">
                  International DNA Testing Standards
                </h2>
                <p className="text-base text-slate-600 leading-relaxed">
                  Your DNA sample is processed through our designated laboratory testing workflow in the United States.
                </p>
              </div>
              <div className="lg:col-span-6">
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white aspect-[4/3]">
                  <img
                    src={BRAND_ASSETS.usaLabWorkflowImg}
                    alt="Clinical genomics DNA sequencing laboratory"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CONTACT US & CONSULTATION SECTION */}
      <section id="enquiry" className="py-16 lg:py-22 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 space-y-6">
              <div>
                <p className="text-xs font-semibold text-[#0D9488] tracking-wide">Contact Us</p>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#0B2246] mt-1 text-balance">
                  Speak with a DNA GENEIE Specialist
                </h2>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed mt-3">
                  Need guidance choosing between NutriG, FitG, or Bundle of 2, or have an order question? Contact our clinical genomics desk directly or submit an enquiry below.
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

              <div className="space-y-2.5 text-sm text-slate-600">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-[#0D9488] shrink-0" />
                  <span>DPDP Act compliant data handling &amp; encrypted report storage</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#0D9488] shrink-0" />
                  <span>GST Tax Invoices &amp; real-time order tracking</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <form
                onSubmit={handleEnquirySubmit}
                className="p-6 sm:p-8 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4"
              >
                <div className="pb-1">
                  <h3 className="text-lg font-display font-bold text-[#0B2246]">Send a Customer Enquiry</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Delivered securely to <span className="font-semibold text-[#0B2246]">{OFFICIAL_EMAIL}</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="home-enq-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Customer Name
                    </label>
                    <input
                      id="home-enq-name"
                      type="text"
                      required
                      value={enquiryForm.name}
                      onChange={(e) => setEnquiryForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Aarav Sharma"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                    />
                  </div>
                  <div>
                    <label htmlFor="home-enq-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      id="home-enq-email"
                      type="email"
                      required
                      value={enquiryForm.email}
                      onChange={(e) => setEnquiryForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="home-enq-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      id="home-enq-phone"
                      type="tel"
                      required
                      value={enquiryForm.phone}
                      onChange={(e) => setEnquiryForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+91 90232 94189"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                    />
                  </div>
                  <div>
                    <label htmlFor="home-enq-subject" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Subject
                    </label>
                    <input
                      id="home-enq-subject"
                      type="text"
                      required
                      value={enquiryForm.subject}
                      onChange={(e) =>
                        setEnquiryForm((f) => ({
                          ...f,
                          subject: e.target.value,
                          interestProduct: e.target.value || 'General DNA Consultation',
                        }))
                      }
                      placeholder="e.g. NutriG / FitG Panel Enquiry or Order Support"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="home-enq-message" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Message
                  </label>
                  <textarea
                    id="home-enq-message"
                    rows={4}
                    required
                    value={enquiryForm.message}
                    onChange={(e) => setEnquiryForm((f) => ({ ...f, message: e.target.value }))}
                    placeholder="Share your wellness goals, kit questions, or order enquiry..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>

                {enquiryError && (
                  <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3.5 py-2">
                    {enquiryError}
                  </p>
                )}
                {enquirySuccess && (
                  <p className="text-sm text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-3.5 py-2">
                    {enquirySuccess}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={enquirySubmitting}
                  className="px-6 py-3 rounded-xl dna-gradient-bg text-white text-sm font-semibold hover:opacity-95 disabled:opacity-60 cursor-pointer"
                >
                  {enquirySubmitting ? 'Sending Enquiry...' : 'Submit Customer Enquiry'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
