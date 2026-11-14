import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, Dna, FlaskConical, Heart, Mail, MessageCircle, Phone, ShieldCheck, Star } from 'lucide-react';
import type { ActiveRoute, AuthUser, Bundle, Product, ProductReview } from '../types';
import { apiFetch, formatINR } from '../lib/api';
import {
  OFFICIAL_EMAIL,
  OFFICIAL_MAILTO,
  OFFICIAL_PHONE_DISPLAY,
  OFFICIAL_PHONE_HREF,
  OFFICIAL_WHATSAPP_URL,
} from '../lib/contact';
import { BRAND_ASSETS, getProductImage } from '../lib/assets';
import { FitnessParametersSection } from './FitnessParametersSection';
import { NutritionParametersSection } from './NutritionParametersSection';
import { SkinParametersSection } from './SkinParametersSection';

interface ProductDetailPageProps {
  product: Product;
  allProducts: Product[];
  bundles: Bundle[];
  readOnlyCatalog: boolean;
  user: AuthUser | null;
  wishlistSlugs: string[];
  onToggleWishlist: (slug: string) => void;
  onViewedProduct: (slug: string) => void;
  onAddToCart: (item: { itemType: 'product' | 'bundle'; slug: string; name: string; unitPriceInr: number }) => void;
  onBuyNow: (item: { itemType: 'product' | 'bundle'; slug: string; name: string; unitPriceInr: number }) => void;
  onNavigate: (route: ActiveRoute, sectionId?: string) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  allProducts,
  bundles,
  readOnlyCatalog,
  user,
  wishlistSlugs,
  onToggleWishlist,
  onViewedProduct,
  onAddToCart,
  onBuyNow,
  onNavigate,
}) => {
  const isComingSoon = product.status === 'coming_soon';
  const isWishlisted = wishlistSlugs.includes(product.slug);

  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);

  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistPhone, setWaitlistPhone] = useState('');
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);

  const loadReviews = async () => {
    try {
      const res = await apiFetch<{ reviews: ProductReview[] }>(`/api/public/reviews/${product.slug}`);
      setReviews(res.reviews || []);
    } catch {
      setReviews([]);
    }
  };

  useEffect(() => {
    onViewedProduct(product.slug);
    if (!readOnlyCatalog) loadReviews();
  }, [product.slug, readOnlyCatalog]);

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaitlistError(null);
    try {
      await apiFetch('/api/enquiries', {
        method: 'POST',
        body: JSON.stringify({
          name: waitlistName,
          email: waitlistEmail,
          phone: waitlistPhone,
          interestProduct: `${product.name} — Launch Notification`,
          message: `Please notify me when ${product.name} becomes available for ordering.`,
        }),
      });
      setWaitlistDone(true);
    } catch (err) {
      setWaitlistError(err instanceof Error ? err.message : 'Unable to register notification request.');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError(null);
    setReviewNotice(null);
    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ productSlug: product.slug, ...reviewForm }),
      });
      setReviewNotice('Thank you! Your review has been published.');
      setReviewForm({ rating: 5, title: '', comment: '' });
      await loadReviews();
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Unable to post review.');
    }
  };

  const relatedProducts = allProducts.filter((p) => p.slug !== product.slug);
  const bundle2 = bundles.find((b) => b.slug === 'bundle-2' && b.status === 'available');
  const handleExploreReport = () => {
    if (readOnlyCatalog) {
      onNavigate({ page: 'home' }, 'enquiry');
      return;
    }

    onBuyNow({
      itemType: 'product',
      slug: product.slug,
      name: product.name,
      unitPriceInr: product.price_inr || 40000,
    });
  };

  return (
    <main className="bg-white py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div>
          <button
            type="button"
            onClick={() => onNavigate({ page: 'home' }, 'tests')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#0B2246] mb-8 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All DNA Panels</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            <div className="lg:col-span-6 lg:sticky lg:top-24">
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[4/3] relative">
                <img
                  src={BRAND_ASSETS.productCardImages[product.slug] || getProductImage(product.slug, product.image_url)}
                  alt={`${product.name} kit`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                {isComingSoon && (
                  <div className="absolute top-4 right-4 px-4 py-1.5 rounded-md bg-[#0B2246] text-white text-xs font-bold tracking-wider">
                    COMING SOON
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-6 space-y-6">
              <div className="text-xs font-semibold text-[#0D9488] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span>{product.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{product.markers_count}</span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[#0B2246]">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{product.avg_rating || 4.9}</span>
                  <span className="text-slate-400">({reviews.length || product.review_count || 0} reviews)</span>
                </div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-[#0B2246]">
                    {product.name}
                  </h1>
                  <p className="text-lg text-slate-600 mt-2">{product.tagline}</p>
                </div>
                {!readOnlyCatalog && (
                  <button
                    type="button"
                    onClick={() => onToggleWishlist(product.slug)}
                    aria-label="Toggle wishlist"
                    className="p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer shrink-0"
                  >
                    <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-rose-600 text-rose-600' : 'text-slate-500'}`} />
                  </button>
                )}
              </div>

              <div className="py-4 border-y border-slate-200 flex items-center justify-between gap-4">
                {isComingSoon ? (
                  <div>
                    <span className="text-xl font-display font-bold text-[#0D9488]">COMING SOON</span>
                    <p className="text-xs text-slate-500 mt-0.5">Purchasing is disabled until official launch.</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-mono tabular-nums font-bold text-[#0B2246]">
                        {formatINR(product.price_inr)}
                      </span>
                      {product.original_price_inr && product.price_inr && product.original_price_inr > product.price_inr && (
                        <span className="text-base font-mono tabular-nums text-slate-400 line-through">
                          {formatINR(product.original_price_inr)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Inclusive of kit shipping, sample return pickup & verified Member Report
                    </p>
                  </div>
                )}
                {!isComingSoon && (
                  <span className="text-xs font-semibold text-teal-700">
                    {(product.stock_count ?? 100) > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                )}
              </div>

              <p className="text-base text-slate-600 leading-relaxed">{product.description}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                  <Dna className="w-5 h-5 text-[#0D9488] mb-2" />
                  <p className="text-xs text-slate-500">Markers</p>
                  <p className="text-sm font-semibold text-[#0B2246] mt-0.5">{product.markers_count}</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                  <FlaskConical className="w-5 h-5 text-[#0D9488] mb-2" />
                  <p className="text-xs text-slate-500">Sample Type</p>
                  <p className="text-sm font-semibold text-[#0B2246] mt-0.5">{product.sample_type}</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                  <Clock className="w-5 h-5 text-[#0D9488] mb-2" />
                  <p className="text-xs text-slate-500">Turnaround</p>
                  <p className="text-sm font-semibold text-[#0B2246] mt-0.5">{product.turnaround_days}</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h2 className="text-sm font-bold text-[#0B2246]">What This Panel Evaluates</h2>
                <ul className="space-y-2.5 text-sm text-slate-600">
                  {product.highlights.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {readOnlyCatalog ? (
                <p className="pt-4 text-sm text-slate-600">
                  This GitHub Pages catalog is for product information only. Contact us for ordering details.
                </p>
              ) : !isComingSoon ? (
                <div className="pt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      onBuyNow({
                        itemType: 'product',
                        slug: product.slug,
                        name: product.name,
                        unitPriceInr: product.price_inr || 40000,
                      })
                    }
                    className="px-7 py-3.5 rounded-xl dna-gradient-bg text-white font-semibold text-sm hover:opacity-95 transition-opacity cursor-pointer"
                  >
                    Buy Now — {formatINR(product.price_inr)}
                  </button>
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
                    className="px-6 py-3.5 rounded-xl border border-slate-300 text-[#0B2246] font-semibold text-sm hover:bg-slate-50 cursor-pointer"
                  >
                    Add to Cart
                  </button>
                </div>
              ) : (
                <div
                  id={product.slug === 'dermag' ? 'skin-waitlist' : undefined}
                  className="p-6 rounded-2xl border border-slate-200 bg-slate-50 space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-[#0B2246]">
                    <ShieldCheck className="w-5 h-5 text-[#0D9488]" />
                    <span>{product.name} Launch Notification</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {product.name} is currently in final pre-launch preparation and cannot be purchased yet. Leave your contact details to be notified when it launches.
                  </p>
                  {readOnlyCatalog ? (
                    <p className="text-sm text-slate-600">
                      Contact us directly for launch updates.
                    </p>
                  ) : waitlistDone ? (
                    <p className="text-sm font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-4 py-2.5">
                      Thank you! You are registered for {product.name} launch updates.
                    </p>
                  ) : (
                    <form onSubmit={handleWaitlist} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          placeholder="Full Name"
                          value={waitlistName}
                          onChange={(e) => setWaitlistName(e.target.value)}
                          className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                        />
                        <input
                          type="tel"
                          required
                          placeholder="Phone Number"
                          value={waitlistPhone}
                          onChange={(e) => setWaitlistPhone(e.target.value)}
                          className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="email"
                          required
                          placeholder="Email Address"
                          value={waitlistEmail}
                          onChange={(e) => setWaitlistEmail(e.target.value)}
                          className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                        />
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-xl bg-[#0B2246] text-white text-sm font-semibold hover:bg-[#133366] cursor-pointer whitespace-nowrap"
                        >
                          Notify Me
                        </button>
                      </div>
                      {waitlistError && <p className="text-xs text-rose-600">{waitlistError}</p>}
                    </form>
                  )}
                </div>
              )}
              {/* Product Enquiry & Specialist Support */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                <p className="text-xs font-bold text-[#0B2246]">
                  Questions about {product.name}? Connect with a DNA GENEIE Specialist
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <a
                    href={OFFICIAL_MAILTO}
                    className="inline-flex items-center gap-1.5 font-semibold text-[#0B2246] hover:text-[#0D9488]"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#0D9488]" />
                    <span>{OFFICIAL_EMAIL}</span>
                  </a>
                  <a
                    href={OFFICIAL_PHONE_HREF}
                    className="inline-flex items-center gap-1.5 font-mono font-semibold text-[#0B2246] hover:text-[#0D9488]"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#0D9488]" />
                    <span>{OFFICIAL_PHONE_DISPLAY}</span>
                  </a>
                  <a
                    href={OFFICIAL_WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-semibold text-[#128C7E] hover:underline"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp Us</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {product.slug === 'nutrig' && (
          <NutritionParametersSection onExploreReport={handleExploreReport} />
        )}

        {product.slug === 'fitg' && (
          <FitnessParametersSection onExploreReport={handleExploreReport} />
        )}

        {product.slug === 'dermag' && (
          <SkinParametersSection
            onExploreReport={() => {
              if (readOnlyCatalog) {
                onNavigate({ page: 'home' }, 'enquiry');
                return;
              }
              if (isComingSoon) {
                const waitlist = document.getElementById('skin-waitlist');
                if (waitlist) {
                  waitlist.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  return;
                }
                onNavigate({ page: 'home' }, 'enquiry');
                return;
              }
              onBuyNow({
                itemType: 'product',
                slug: product.slug,
                name: product.name,
                unitPriceInr: product.price_inr || 40000,
              });
            }}
          />
        )}

        {/* RELATED PRODUCTS & BUNDLE RECOMMENDATION */}
        <section className="pt-10 border-t border-slate-200 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-display font-bold text-[#0B2246]">Related Panels & Bundle Offer</h2>
            {bundle2 && !isComingSoon && !readOnlyCatalog && (
              <button
                type="button"
                onClick={() =>
                  onAddToCart({
                    itemType: 'bundle',
                    slug: bundle2.slug,
                    name: bundle2.name,
                    unitPriceInr: bundle2.price_inr,
                  })
                }
                className="text-sm font-semibold text-[#0D9488] hover:underline cursor-pointer"
              >
                Upgrade to {bundle2.name} — {formatINR(bundle2.price_inr)} (Save {formatINR(bundle2.savings_inr)})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {relatedProducts.map((rp) => (
              <button
                key={rp.slug}
                type="button"
                onClick={() => onNavigate({ page: 'product', slug: rp.slug })}
                className="p-4 rounded-2xl border border-slate-200 hover:border-[#0D9488] flex items-center gap-4 text-left transition-colors cursor-pointer"
              >
                <img
                  src={BRAND_ASSETS.productCardImages[rp.slug] || getProductImage(rp.slug, rp.image_url)}
                  alt={rp.name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">{rp.category}</p>
                  <p className="text-base font-bold text-[#0B2246]">{rp.name}</p>
                  <p className="text-sm font-mono font-bold text-[#0D9488] mt-1">
                    {rp.status === 'coming_soon' ? 'COMING SOON' : formatINR(rp.price_inr)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* CUSTOMER REVIEWS & RATINGS */}
        <section className={`pt-10 border-t border-slate-200 ${readOnlyCatalog ? '' : 'grid grid-cols-1 lg:grid-cols-12 gap-10'}`}>
          <div className={readOnlyCatalog ? 'space-y-4' : 'lg:col-span-7 space-y-4'}>
            <h2 className="text-xl font-display font-bold text-[#0B2246]">
              Customer Reviews & Ratings ({reviews.length})
            </h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-slate-500">No reviews posted yet for {product.name}.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-slate-400 font-mono">{rev.created_at.slice(0, 10)}</span>
                    </div>
                    <h3 className="text-sm font-bold text-[#0B2246]">{rev.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{rev.comment}</p>
                    <p className="text-xs text-slate-500">
                      {rev.author_name} {rev.verified_purchase ? '· Verified Purchase' : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!readOnlyCatalog && <div className="lg:col-span-5">
            <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-4">
              <h3 className="text-base font-display font-bold text-[#0B2246]">Write a Customer Review</h3>
              {user?.role === 'member' ? (
                <form onSubmit={handleSubmitReview} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Rating</label>
                    <select
                      value={reviewForm.rating}
                      onChange={(e) => setReviewForm((f) => ({ ...f, rating: Number(e.target.value) }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm"
                    >
                      <option value={5}>5 Stars — Excellent</option>
                      <option value={4}>4 Stars — Very Good</option>
                      <option value={3}>3 Stars — Good</option>
                      <option value={2}>2 Stars — Fair</option>
                      <option value={1}>1 Star — Poor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Review Headline</label>
                    <input
                      type="text"
                      required
                      value={reviewForm.title}
                      onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Summarize your experience"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Your Feedback</label>
                    <textarea
                      rows={3}
                      required
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                      placeholder="Share how the test kit and report helped you..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm"
                    />
                  </div>
                  {reviewError && <p className="text-xs text-rose-600">{reviewError}</p>}
                  {reviewNotice && <p className="text-xs text-teal-700 font-semibold">{reviewNotice}</p>}
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#0B2246] text-white text-sm font-semibold cursor-pointer"
                  >
                    Submit Review
                  </button>
                </form>
              ) : (
                <div className="space-y-3 text-sm text-slate-600">
                  <p>Sign in as a Member to leave a verified rating and review for {product.name}.</p>
                  <button
                    type="button"
                    onClick={() => onNavigate({ page: 'member-auth' })}
                    className="px-4 py-2 rounded-xl dna-gradient-bg text-white text-xs font-semibold cursor-pointer"
                  >
                    Member Login
                  </button>
                </div>
              )}
            </div>
          </div>}
        </section>
      </div>
    </main>
  );
};
