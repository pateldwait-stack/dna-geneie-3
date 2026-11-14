import { useEffect, useState } from 'react';
import type { ActiveRoute, AuthUser, Bundle, CartItem, Product, PromoOffer } from './types';
import { apiFetch, setStoredToken } from './lib/api';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { WhatsAppButton } from './components/WhatsAppButton';
import { CartDrawer } from './components/CartDrawer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { HomePage } from './components/HomePage';
import { ProductDetailPage } from './components/ProductDetailPage';
import { CheckoutPage } from './components/CheckoutPage';
import { SupportPage } from './components/SupportPage';
import { AuthPortals } from './components/AuthPortals';
import { MemberDashboard } from './components/MemberDashboard';
import { AdvisorDashboard } from './components/AdvisorDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { STATIC_CATALOG } from './lib/staticCatalog';

const CART_STORAGE_KEY = 'dnageneie_cart_v1';
const WISHLIST_STORAGE_KEY = 'dnageneie_wishlist_v1';
const RECENT_STORAGE_KEY = 'dnageneie_recent_v1';
const isStaticCatalog = import.meta.env.BASE_URL === '/dna-geneie-3/';

function parseHashRoute(): ActiveRoute {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw || raw === '/') return { page: 'home' };

  const [pathPart, queryPart] = raw.split('?');
  const params = new URLSearchParams(queryPart || '');

  if (pathPart.startsWith('product/')) {
    return { page: 'product', slug: pathPart.replace('product/', '') };
  }
  if (pathPart === 'support') return { page: 'support' };
  if (pathPart === 'portal-select' || pathPart === 'login') return { page: 'portal-select' };
  if (pathPart === 'member-login') return { page: 'member-auth' };
  if (pathPart === 'advisor-login') return { page: 'advisor-auth' };
  if (pathPart === 'admin-login') return { page: 'admin-auth' };
  if (pathPart === 'verify-email') return { page: 'verify-email', token: params.get('token') || '' };
  if (pathPart === 'reset-password') return { page: 'reset-password', token: params.get('token') || '' };
  if (pathPart === 'checkout') return { page: 'checkout' };
  if (pathPart === 'member-dashboard') return { page: 'member-dashboard' };
  if (pathPart === 'advisor-dashboard') return { page: 'advisor-dashboard' };
  if (pathPart === 'admin-dashboard') return { page: 'admin-dashboard' };

  return { page: 'home' };
}

function routeToHash(route: ActiveRoute): string {
  switch (route.page) {
    case 'home':
      return '#';
    case 'product':
      return `#product/${route.slug}`;
    case 'support':
      return '#support';
    case 'portal-select':
      return '#portal-select';
    case 'member-auth':
      return '#member-login';
    case 'advisor-auth':
      return '#advisor-login';
    case 'admin-auth':
      return '#admin-login';
    case 'verify-email':
      return `#verify-email?token=${encodeURIComponent(route.token)}`;
    case 'reset-password':
      return `#reset-password?token=${encodeURIComponent(route.token)}`;
    case 'checkout':
      return '#checkout';
    case 'member-dashboard':
      return '#member-dashboard';
    case 'advisor-dashboard':
      return '#advisor-dashboard';
    case 'admin-dashboard':
      return '#admin-dashboard';
  }
}

export default function App() {
  const [route, setRoute] = useState<ActiveRoute>(() => parseHashRoute());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [promos, setPromos] = useState<PromoOffer[]>([]);
  const [usaLabSectionPublished, setUsaLabSectionPublished] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlistSlugs, setWishlistSlugs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [recentlyViewedSlugs, setRecentlyViewedSlugs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const loadCatalog = async () => {
    if (isStaticCatalog) {
      setProducts(STATIC_CATALOG.products);
      setBundles(STATIC_CATALOG.bundles);
      setPromos(STATIC_CATALOG.promos);
      setUsaLabSectionPublished(STATIC_CATALOG.usaLabSectionPublished);
      return;
    }

    try {
      const res = await apiFetch<{
        products: Product[];
        bundles: Bundle[];
        promos: PromoOffer[];
        usaLabSectionPublished: boolean;
      }>('/api/public/catalog');
      setProducts(res.products || []);
      setBundles(res.bundles || []);
      setPromos(res.promos || []);
      setUsaLabSectionPublished(Boolean(res.usaLabSectionPublished));
    } catch {
      // ignore initial transient error
    }
  };

  const syncMemberWishlist = async () => {
    try {
      const dash = await apiFetch<{ wishlist: string[] }>('/api/member/dashboard');
      if (Array.isArray(dash.wishlist)) {
        setWishlistSlugs(dash.wishlist);
      }
    } catch {
      // ignore
    }
  };

  const loadSession = async () => {
    if (isStaticCatalog) {
      setAuthChecked(true);
      return;
    }

    try {
      const res = await apiFetch<{ user: AuthUser | null }>('/api/auth/me');
      setUser(res.user || null);
      if (res.user?.role === 'member') {
        syncMemberWishlist();
      }
    } catch {
      setUser(null);
    } finally {
      setAuthChecked(true);
    }
  };

  useEffect(() => {
    loadCatalog();
    loadSession();

    const onHashChange = () => {
      setRoute(parseHashRoute());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistSlugs));
    } catch {
      // ignore
    }
  }, [wishlistSlugs]);

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recentlyViewedSlugs));
    } catch {
      // ignore
    }
  }, [recentlyViewedSlugs]);

  // Keep cart strictly aligned with server catalog availability (block DermaG / Coming Soon)
  useEffect(() => {
    if (products.length === 0 && bundles.length === 0) return;
    setCart((prev) =>
      prev.filter((item) => {
        if (item.itemType === 'product') {
          const prod = products.find((p) => p.slug === item.slug);
          return prod && prod.status === 'available';
        }
        const b = bundles.find((x) => x.slug === item.slug);
        return b && b.status === 'available';
      })
    );
  }, [products, bundles]);

  const navigate = (next: ActiveRoute, sectionId?: string) => {
    setRoute(next);
    window.location.hash = routeToHash(next);
    if (sectionId) {
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const addItemToCartState = (item: {
    itemType: 'product' | 'bundle';
    slug: string;
    name: string;
    unitPriceInr: number;
  }) => {
    if (item.itemType === 'product') {
      const p = products.find((x) => x.slug === item.slug);
      if (p && p.status !== 'available') return false;
    } else {
      const b = bundles.find((x) => x.slug === item.slug);
      if (b && b.status !== 'available') return false;
    }

    setCart((prev) => {
      const existing = prev.find((c) => c.itemType === item.itemType && c.slug === item.slug);
      if (existing) {
        return prev.map((c) =>
          c.itemType === item.itemType && c.slug === item.slug
            ? { ...c, quantity: Math.min(10, c.quantity + 1) }
            : c
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    return true;
  };

  const handleAddToCart = (item: {
    itemType: 'product' | 'bundle';
    slug: string;
    name: string;
    unitPriceInr: number;
  }) => {
    if (addItemToCartState(item)) {
      setCartOpen(true);
    }
  };

  const handleBuyNow = (item: {
    itemType: 'product' | 'bundle';
    slug: string;
    name: string;
    unitPriceInr: number;
  }) => {
    if (addItemToCartState(item)) {
      setCartOpen(false);
      navigate({ page: 'checkout' });
    }
  };

  const handleToggleWishlist = async (slug: string) => {
    setWishlistSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [slug, ...prev]
    );
    if (user?.role === 'member') {
      try {
        const res = await apiFetch<{ wishlist: string[] }>('/api/member/wishlist/toggle', {
          method: 'POST',
          body: JSON.stringify({ productSlug: slug }),
        });
        if (Array.isArray(res.wishlist)) {
          setWishlistSlugs(res.wishlist);
        }
      } catch {
        // ignore transient sync failure
      }
    }
  };

  const handleViewedProduct = (slug: string) => {
    setRecentlyViewedSlugs((prev) => [slug, ...prev.filter((s) => s !== slug)].slice(0, 6));
  };

  const handleUpdateQty = (itemType: 'product' | 'bundle', slug: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => !(i.itemType === itemType && i.slug === slug)));
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.itemType === itemType && i.slug === slug ? { ...i, quantity: Math.min(10, qty) } : i
      )
    );
  };

  const handleRemoveItem = (itemType: 'product' | 'bundle', slug: string) => {
    setCart((prev) => prev.filter((i) => !(i.itemType === itemType && i.slug === slug)));
  };

  const handleAuthenticated = (authedUser: AuthUser) => {
    setUser(authedUser);
    if (authedUser.role === 'member') {
      syncMemberWishlist();
      navigate({ page: 'member-dashboard' });
    } else if (authedUser.role === 'advisor') {
      navigate({ page: 'advisor-dashboard' });
    } else {
      navigate({ page: 'admin-dashboard' });
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setStoredToken(null);
    setUser(null);
    navigate({ page: 'home' });
  };

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const renderPage = () => {
    if (
      isStaticCatalog &&
      route.page !== 'home' &&
      route.page !== 'product' &&
      route.page !== 'support'
    ) {
      return (
        <main className="flex-1 px-4 py-20 text-center">
          <h1 className="text-2xl font-display font-bold text-[#0B2246]">Catalog preview only</h1>
          <p className="mt-3 text-slate-600">
            Accounts, checkout, and other server features are not available on GitHub Pages.
          </p>
          <button
            type="button"
            onClick={() => navigate({ page: 'home' }, 'tests')}
            className="mt-6 px-5 py-3 rounded-xl dna-gradient-bg text-white text-sm font-semibold"
          >
            Browse DNA panels
          </button>
        </main>
      );
    }

    if (route.page === 'product') {
      const prod = products.find((p) => p.slug === route.slug);
      if (prod) {
        return (
          <ProductDetailPage
            product={prod}
            allProducts={products}
            bundles={bundles}
            readOnlyCatalog={isStaticCatalog}
            user={user}
            wishlistSlugs={wishlistSlugs}
            onToggleWishlist={handleToggleWishlist}
            onViewedProduct={handleViewedProduct}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            onNavigate={navigate}
          />
        );
      }
    }

    if (route.page === 'support') {
      return <SupportPage onNavigate={navigate} />;
    }

    if (
      route.page === 'portal-select' ||
      route.page === 'member-auth' ||
      route.page === 'advisor-auth' ||
      route.page === 'admin-auth' ||
      route.page === 'verify-email' ||
      route.page === 'reset-password'
    ) {
      return (
        <AuthPortals
          mode={route.page}
          token={route.page === 'verify-email' || route.page === 'reset-password' ? route.token : undefined}
          onAuthenticated={handleAuthenticated}
          onNavigate={navigate}
        />
      );
    }

    if (route.page === 'checkout') {
      return (
        <CheckoutPage
          user={user}
          items={cart}
          bundles={bundles}
          onClearCart={() => setCart([])}
          onUpdateQty={handleUpdateQty}
          onRemoveItem={handleRemoveItem}
          onNavigate={navigate}
        />
      );
    }

    if (route.page === 'member-dashboard') {
      if (!authChecked) return <div className="p-16 text-center text-sm text-slate-500">Verifying session...</div>;
      if (!user || user.role !== 'member') {
        return (
          <AuthPortals
            mode="member-auth"
            onAuthenticated={handleAuthenticated}
            onNavigate={navigate}
          />
        );
      }
      return (
        <MemberDashboard
          user={user}
          products={products}
          wishlistSlugs={wishlistSlugs}
          onToggleWishlist={handleToggleWishlist}
          onAddToCart={handleAddToCart}
          onUserUpdated={setUser}
          onNavigate={navigate}
          onLogout={handleLogout}
        />
      );
    }

    if (route.page === 'advisor-dashboard') {
      if (!authChecked) return <div className="p-16 text-center text-sm text-slate-500">Verifying session...</div>;
      if (!user || user.role !== 'advisor') {
        return (
          <AuthPortals
            mode="advisor-auth"
            onAuthenticated={handleAuthenticated}
            onNavigate={navigate}
          />
        );
      }
      return <AdvisorDashboard user={user} onUserUpdated={setUser} onLogout={handleLogout} />;
    }

    if (route.page === 'admin-dashboard') {
      if (!authChecked) return <div className="p-16 text-center text-sm text-slate-500">Verifying session...</div>;
      if (!user || user.role !== 'admin') {
        return (
          <AuthPortals
            mode="admin-auth"
            onAuthenticated={handleAuthenticated}
            onNavigate={navigate}
          />
        );
      }
      return <AdminDashboard user={user} onCatalogUpdated={loadCatalog} onLogout={handleLogout} />;
    }

    return (
      <HomePage
        products={products}
        bundles={bundles}
        promos={promos}
        usaLabSectionPublished={usaLabSectionPublished}
        readOnlyCatalog={isStaticCatalog}
        searchQuery={searchQuery}
        wishlistSlugs={wishlistSlugs}
        recentlyViewedSlugs={recentlyViewedSlugs}
        onToggleWishlist={handleToggleWishlist}
        onAddToCart={handleAddToCart}
        onNavigate={navigate}
      />
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      {isStaticCatalog && (
        <div className="bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-950">
          Product catalog preview only. Ordering, accounts, and checkout require a server.
        </div>
      )}
      <Navbar
        user={user}
        readOnlyCatalog={isStaticCatalog}
        products={products}
        bundles={bundles}
        cartCount={cartCount}
        wishlistCount={wishlistSlugs.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNavigate={navigate}
        onOpenCart={() => setCartOpen(true)}
        onOpenWishlist={() => setWishlistOpen(true)}
        onLogout={handleLogout}
      />

      <div className="flex-1">{renderPage()}</div>

      <Footer onNavigate={navigate} readOnlyCatalog={isStaticCatalog} />

      {!isStaticCatalog && (
        <>
          <CartDrawer
            open={cartOpen}
            items={cart}
            bundles={bundles}
            onClose={() => setCartOpen(false)}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveItem}
            onCheckout={() => {
              setCartOpen(false);
              navigate({ page: 'checkout' });
            }}
          />

          <WishlistDrawer
            open={wishlistOpen}
            wishlistSlugs={wishlistSlugs}
            products={products}
            onClose={() => setWishlistOpen(false)}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            onNavigate={navigate}
          />
        </>
      )}

      <WhatsAppButton />
    </div>
  );
}
