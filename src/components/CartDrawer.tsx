import React from 'react';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import type { Bundle, CartItem } from '../types';
import { formatINR } from '../lib/api';

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  bundles: Bundle[];
  onClose: () => void;
  onUpdateQty: (itemType: 'product' | 'bundle', slug: string, qty: number) => void;
  onRemoveItem: (itemType: 'product' | 'bundle', slug: string) => void;
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  items,
  bundles,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onCheckout,
}) => {
  if (!open) return null;

  const subtotal = items.reduce((sum, item) => sum + item.unitPriceInr * item.quantity, 0);

  const nutrigItem = items.find((i) => i.itemType === 'product' && i.slug === 'nutrig');
  const fitgItem = items.find((i) => i.itemType === 'product' && i.slug === 'fitg');
  const bundle2 = bundles.find((b) => b.slug === 'bundle-2' && b.status === 'available');
  const pairSavings =
    nutrigItem && fitgItem && bundle2
      ? bundle2.savings_inr * Math.min(nutrigItem.quantity, fitgItem.quantity)
      : 0;
  const total = Math.max(0, subtotal - pairSavings);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/45 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white h-full flex flex-col border-l border-slate-200 shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#0D9488]" />
            <h2 className="text-lg font-display font-bold text-[#0B2246]">Your Test Kit Cart</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-slate-900">Your cart is empty</p>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                Select NutriG, FitG, or the Bundle of 2 package to begin your personalized DNA assessment.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.itemType}-${item.slug}`}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[#0D9488]">
                    {item.itemType === 'bundle' ? 'Bundle Package' : 'Individual DNA Panel'}
                  </p>
                  <h3 className="text-sm font-bold text-[#0B2246] mt-0.5 truncate">{item.name}</h3>
                  <p className="text-sm font-mono tabular-nums text-slate-700 mt-1">
                    {formatINR(item.unitPriceInr)} each
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.itemType, item.slug, item.quantity - 1)}
                      className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-mono tabular-nums font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.itemType, item.slug, item.quantity + 1)}
                      className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.itemType, item.slug)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-mono tabular-nums font-bold text-[#0B2246]">
                    {formatINR(item.unitPriceInr * item.quantity)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-slate-200 bg-slate-50 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatINR(subtotal)}</span>
              </div>
              {pairSavings > 0 && (
                <div className="flex justify-between text-teal-700 font-medium">
                  <span>Bundle of 2 Savings Applied</span>
                  <span className="font-mono tabular-nums">-{formatINR(pairSavings)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-[#0B2246] pt-2 border-t border-slate-200">
                <span>Estimated Total</span>
                <span className="font-mono tabular-nums">{formatINR(total)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onCheckout}
              className="w-full py-3 px-5 rounded-xl dna-gradient-bg text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
