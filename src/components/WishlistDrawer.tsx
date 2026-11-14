import React from 'react';
import { Heart, ShoppingBag, Trash2, X } from 'lucide-react';
import type { ActiveRoute, Product } from '../types';
import { formatINR } from '../lib/api';
import { getProductImage } from '../lib/assets';

interface WishlistDrawerProps {
  open: boolean;
  wishlistSlugs: string[];
  products: Product[];
  onClose: () => void;
  onToggleWishlist: (slug: string) => void;
  onAddToCart: (item: { itemType: 'product' | 'bundle'; slug: string; name: string; unitPriceInr: number }) => void;
  onNavigate: (route: ActiveRoute) => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  open,
  wishlistSlugs,
  products,
  onClose,
  onToggleWishlist,
  onAddToCart,
  onNavigate,
}) => {
  if (!open) return null;

  const savedProducts = products.filter((p) => wishlistSlugs.includes(p.slug));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/45 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white h-full flex flex-col border-l border-slate-200 shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Heart className="w-5 h-5 text-[#0D9488]" />
            <h2 className="text-lg font-display font-bold text-[#0B2246]">Saved Wishlist</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            aria-label="Close wishlist"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {savedProducts.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                <Heart className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-slate-900">No saved panels yet</p>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                Save NutriG, FitG, or DermaG to keep track of panels you want to explore or purchase later.
              </p>
            </div>
          ) : (
            savedProducts.map((product) => {
              const isComingSoon = product.status === 'coming_soon';
              return (
                <div
                  key={product.slug}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex gap-4 items-start"
                >
                  <img
                    src={getProductImage(product.slug, product.image_url)}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigate({ page: 'product', slug: product.slug });
                        }}
                        className="text-sm font-bold text-[#0B2246] hover:text-[#0D9488] text-left cursor-pointer"
                      >
                        {product.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleWishlist(product.slug)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        aria-label="Remove from wishlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{product.category}</p>
                    <p className="text-sm font-mono font-bold text-[#0B2246] mt-1">
                      {isComingSoon ? 'COMING SOON' : formatINR(product.price_inr)}
                    </p>
                    {!isComingSoon && (
                      <button
                        type="button"
                        onClick={() => {
                          onAddToCart({
                            itemType: 'product',
                            slug: product.slug,
                            name: product.name,
                            unitPriceInr: product.price_inr || 40000,
                          });
                          onClose();
                        }}
                        className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg dna-gradient-bg text-white text-xs font-semibold cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Move to Cart</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
