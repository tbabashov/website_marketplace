import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LoadingBlock, Toaster } from '@/components/ui/Bits';
import { useAuth } from '@/store/auth';
import { useSaved } from '@/store/ui';
import { useLangQueryParam } from '@/lib/seo';

// The home page is the entry point for nearly every visit, so it ships in the
// initial bundle. Everything else is fetched when it is first needed.
import HomePage from '@/pages/HomePage';

const PortfolioPage = lazy(() => import('@/pages/PortfolioPage'));
const CaseStudyPage = lazy(() => import('@/pages/CaseStudyPage'));
const MarketplacePage = lazy(() => import('@/pages/MarketplacePage'));
const ListingPage = lazy(() => import('@/pages/ListingPage'));
const RequestPage = lazy(() => import('@/pages/RequestPage'));
const AuthPage = lazy(() => import('@/pages/AuthPage'));
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const OrderPage = lazy(() => import('@/pages/OrderPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const AdminPage = lazy(() => import('@/pages/admin/AdminPage'));
const LegalPage = lazy(() => import('@/pages/legal/LegalPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

/**
 * Restores the top of the page on navigation, but leaves anchor links alone —
 * jumping to #faq and then being yanked to the top is the classic SPA bug.
 */
function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const target = document.querySelector(hash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const ready = useAuth((s) => s.ready);
  const user = useAuth((s) => s.user);
  const { pathname, search } = useLocation();

  if (!ready) return <LoadingBlock />;
  if (!user) {
    return <Navigate to={`/auth?next=${encodeURIComponent(pathname + search)}`} replace />;
  }
  return <>{children}</>;
}

function RequireOwner({ children }: { children: React.ReactNode }) {
  const ready = useAuth((s) => s.ready);
  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const isOwner = useAuth((s) => s.isOwner);
  const { t } = useTranslation();

  if (!ready) return <LoadingBlock />;
  if (!user) return <Navigate to="/auth?next=/admin" replace />;
  // `profile` is null for a beat after sign-in while it loads; showing "not
  // the owner" during that window would be wrong.
  if (!profile) return <LoadingBlock />;
  if (!isOwner) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-32 text-center">
        <p className="font-display text-h3 text-bone">{t('admin.notOwner')}</p>
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  const init = useAuth((s) => s.init);
  const userId = useAuth((s) => s.user?.id ?? null);
  const hydrateSaved = useSaved((s) => s.hydrate);
  const { t } = useTranslation();

  useLangQueryParam();

  useEffect(() => init(), [init]);
  useEffect(() => {
    void hydrateSaved(userId);
  }, [userId, hydrateSaved]);

  return (
    <>
      <a href="#main" className="skip-link">
        {t('nav.skip')}
      </a>

      <ScrollManager />
      <Header />

      <main id="main" tabIndex={-1}>
        <Suspense fallback={<LoadingBlock />}>
          <Routes>
            <Route path="/" element={<HomePage />} />

            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/portfolio/:slug" element={<CaseStudyPage />} />

            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/marketplace/:slug" element={<ListingPage />} />

            <Route path="/request" element={<RequestPage />} />

            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            <Route
              path="/dashboard"
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <RequireAuth>
                  <OrderPage />
                </RequireAuth>
              }
            />
            <Route
              path="/checkout/:id"
              element={
                <RequireAuth>
                  <CheckoutPage />
                </RequireAuth>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireOwner>
                  <AdminPage />
                </RequireOwner>
              }
            />

            <Route path="/terms" element={<LegalPage doc="terms" />} />
            <Route path="/privacy" element={<LegalPage doc="privacy" />} />
            <Route path="/refund" element={<LegalPage doc="refund" />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
      <Toaster />
    </>
  );
}
