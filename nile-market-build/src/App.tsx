import {
  Briefcase,
  Building2,
  Car,
  Clock,
  Grid3X3,
  Heart,
  Loader2,
  MapPin,
  PlusCircle,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Smartphone,
  Sofa,
  Sprout,
  Sun,
  Tag,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import logoImg from './assets/img/logo.png';
import { AdminDashboard } from './components/AdminDashboard';
import { CreateListingModal } from './components/CreateListingModal';
import { ListingCard } from './components/ListingCard';
import { ListingDetailModal } from './components/ListingDetailModal';
import { AppView, GoogleLogoIcon, Navbar } from './components/Navbar';
import { ProfileView } from './components/ProfileView';
import { ReportModal } from './components/ReportModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DEFAULT_CATEGORIES, DEFAULT_STATES } from './data/sudanCatalog';
import {
  deleteListing,
  fetchActiveListings,
  fetchCategories,
  fetchFavoriteIds,
  fetchMyListings,
  fetchPlatformSettings,
  fetchStates,
  subscribeListingStats,
  toggleFavoriteListing,
  updateListingByOwner,
} from './services/marketplaceService';
import { Category, Listing, PlatformSettings, SudanState } from './types/marketplace';

function getCategoryIcon(iconName: string, className = 'w-5 h-5') {
  switch (iconName) {
    case 'Building2':
      return <Building2 className={className} />;
    case 'Car':
      return <Car className={className} />;
    case 'Smartphone':
      return <Smartphone className={className} />;
    case 'Sun':
      return <Sun className={className} />;
    case 'Sofa':
      return <Sofa className={className} />;
    case 'Sprout':
      return <Sprout className={className} />;
    case 'Briefcase':
      return <Briefcase className={className} />;
    case 'ShoppingBag':
      return <ShoppingBag className={className} />;
    default:
      return <Tag className={className} />;
  }
}

const MarketplaceShell: React.FC = () => {
  const { user, userProfile, isAdmin, authReady, authError, clearAuthError, signInWithGoogle } =
    useAuth();

  const [currentView, setCurrentView] = useState<AppView>('home');
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [states, setStates] = useState<SudanState[]>(DEFAULT_STATES);
  const [settings, setSettings] = useState<PlatformSettings>({
    requireApproval: false,
    noticeText: '',
    seeded: false,
  });
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

  // Modals & Notifications
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [reportingListing, setReportingListing] = useState<Listing | null>(null);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDeleteListing, setConfirmDeleteListing] = useState<Listing | null>(null);

  // Single-Logo Header <-> Footer Docking
  const headerRef = useRef<HTMLElement | null>(null);
  const headerLogoRef = useRef<HTMLSpanElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const footerLogoRef = useRef<HTMLDivElement | null>(null);
  const dockedRef = useRef(false);
  const initializedDockRef = useRef(false);
  const flightTimerRef = useRef<number | null>(null);

  const [logoDocked, setLogoDocked] = useState(false);
  const [flyingLogo, setFlyingLogo] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
    dx: number;
    dy: number;
    sx: number;
    sy: number;
    active: boolean;
  } | null>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadMarketplace = useCallback(async () => {
    setLoadingData(true);
    try {
      const [activeAds, cats, sts, plat] = await Promise.all([
        fetchActiveListings(),
        fetchCategories(false),
        fetchStates(false),
        fetchPlatformSettings(),
      ]);
      setListings(activeAds);
      setCategories(cats);
      setStates(sts);
      setSettings(plat);
    } catch (err) {
      console.error('Marketplace load error:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  const loadUserScopedData = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set());
      setMyListings([]);
      return;
    }
    try {
      const [favs, mine] = await Promise.all([
        fetchFavoriteIds(user.uid),
        fetchMyListings(user.uid),
      ]);
      setFavoriteIds(favs);
      setMyListings(mine);
    } catch (err) {
      console.error('User data load error:', err);
    }
  }, [user]);

  const handleSingleListingViewUpdated = useCallback((listingId: string, views: number) => {
    setListings((prev) =>
      prev.map((item) => (item.id === listingId && item.views !== views ? { ...item, views } : item))
    );
    setMyListings((prev) =>
      prev.map((item) => (item.id === listingId && item.views !== views ? { ...item, views } : item))
    );
    setSelectedListing((prev) =>
      prev && prev.id === listingId && prev.views !== views ? { ...prev, views } : prev
    );
  }, []);

  useEffect(() => {
    if (authReady) {
      loadMarketplace();
      loadUserScopedData();
    }
  }, [authReady, loadMarketplace, loadUserScopedData]);

  useEffect(() => {
    if (!authReady) return;
    const unsub = subscribeListingStats((statsMap) => {
      setListings((prev) =>
        prev.map((item) => {
          const nextViews = statsMap.get(item.id);
          return nextViews !== undefined && item.views !== nextViews
            ? { ...item, views: nextViews }
            : item;
        })
      );
      setMyListings((prev) =>
        prev.map((item) => {
          const nextViews = statsMap.get(item.id);
          return nextViews !== undefined && item.views !== nextViews
            ? { ...item, views: nextViews }
            : item;
        })
      );
    });
    return () => unsub();
  }, [authReady]);

  const selectedStateObj = states.find((s) => s.id === selectedState);

  const filteredListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = listings.filter((item) => {
      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) return false;
      if (selectedState !== 'all' && item.stateId !== selectedState) return false;
      if (selectedCity !== 'all' && item.city !== selectedCity) return false;
      if (q) {
        const hay = `${item.title} ${item.description} ${item.city} ${item.stateName} ${item.categoryName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'price_asc') {
      return [...list].sort((a, b) => a.price - b.price);
    }
    if (sortBy === 'price_desc') {
      return [...list].sort((a, b) => b.price - a.price);
    }
    return list;
  }, [listings, searchQuery, selectedCategory, selectedState, selectedCity, sortBy]);

  const favoriteListings = useMemo(
    () => listings.filter((l) => favoriteIds.has(l.id)),
    [listings, favoriteIds]
  );

  useEffect(() => {
    const DOCK_OFFSET = 80;
    const UNDOCK_OFFSET = 140;

    const evaluateLogoDock = () => {
      const headerEl = headerRef.current;
      const footerEl = footerRef.current;
      const hLogoEl = headerLogoRef.current;
      const fLogoEl = footerLogoRef.current;
      if (!headerEl || !footerEl || !hLogoEl || !fLogoEl) return;

      const headerRect = headerEl.getBoundingClientRect();
      const footerRect = footerEl.getBoundingClientRect();
      const canMeetHeader =
        footerRect.height >= window.innerHeight - headerRect.bottom - UNDOCK_OFFSET ||
        document.documentElement.scrollHeight - window.innerHeight <= 60;

      const dockThreshold = canMeetHeader
        ? headerRect.bottom + DOCK_OFFSET
        : window.innerHeight - Math.max(footerRect.height * 0.72, 200);
      const undockThreshold = canMeetHeader
        ? headerRect.bottom + UNDOCK_OFFSET
        : window.innerHeight - Math.max(footerRect.height * 0.42, 120);

      const currentlyDocked = dockedRef.current;
      const shouldDock = currentlyDocked
        ? footerRect.top <= undockThreshold
        : footerRect.top <= dockThreshold;

      if (!initializedDockRef.current) {
        initializedDockRef.current = true;
        dockedRef.current = shouldDock;
        setLogoDocked(shouldDock);
        return;
      }

      if (shouldDock === currentlyDocked) return;

      dockedRef.current = shouldDock;
      setLogoDocked(shouldDock);

      const reduceMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const fromRect = shouldDock
        ? hLogoEl.getBoundingClientRect()
        : fLogoEl.getBoundingClientRect();
      const toRect = shouldDock
        ? fLogoEl.getBoundingClientRect()
        : hLogoEl.getBoundingClientRect();

      if (reduceMotion || fromRect.width === 0 || toRect.width === 0) {
        setFlyingLogo(null);
        return;
      }

      if (flightTimerRef.current) {
        window.clearTimeout(flightTimerRef.current);
      }

      setFlyingLogo({
        top: fromRect.top,
        left: fromRect.left,
        width: fromRect.width,
        height: fromRect.height,
        dx: toRect.left - fromRect.left,
        dy: toRect.top - fromRect.top,
        sx: toRect.width / fromRect.width,
        sy: toRect.height / fromRect.height,
        active: false,
      });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setFlyingLogo((prev) => (prev ? { ...prev, active: true } : null));
        });
      });

      flightTimerRef.current = window.setTimeout(() => {
        setFlyingLogo(null);
        flightTimerRef.current = null;
      }, 350);
    };

    evaluateLogoDock();
    window.addEventListener('scroll', evaluateLogoDock, { passive: true });
    window.addEventListener('resize', evaluateLogoDock, { passive: true });
    const ro = new ResizeObserver(evaluateLogoDock);
    if (footerRef.current) ro.observe(footerRef.current);
    ro.observe(document.body);

    return () => {
      window.removeEventListener('scroll', evaluateLogoDock);
      window.removeEventListener('resize', evaluateLogoDock);
      ro.disconnect();
      if (flightTimerRef.current) {
        window.clearTimeout(flightTimerRef.current);
      }
    };
  }, [currentView, loadingData, filteredListings.length]);

  const handleOpenCreate = () => {
    if (!user) {
      setShowSignInPrompt(true);
      return;
    }
    if (userProfile?.isBanned) {
      notify('حسابك مقيد من إضافة إعلانات جديدة.');
      return;
    }
    setEditingListing(null);
    setShowCreateModal(true);
  };

  const handleToggleFavorite = async (listing: Listing) => {
    if (!user) {
      setShowSignInPrompt(true);
      return;
    }
    const isFav = favoriteIds.has(listing.id);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(listing.id);
      else next.add(listing.id);
      return next;
    });
    try {
      await toggleFavoriteListing(user.uid, listing.id, isFav);
      notify(isFav ? 'تمت الإزالة من المفضلة.' : 'تم الحفظ في المفضلة.');
    } catch {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(listing.id);
        else next.delete(listing.id);
        return next;
      });
      notify('تعذر تحديث المفضلة.');
    }
  };

  const handleMarkSold = async (listing: Listing) => {
    try {
      await updateListingByOwner(listing.id, {
        title: listing.title,
        description: listing.description,
        price: listing.price,
        currency: listing.currency,
        negotiable: listing.negotiable,
        categoryId: listing.categoryId,
        categoryName: listing.categoryName,
        stateId: listing.stateId,
        stateName: listing.stateName,
        city: listing.city,
        condition: listing.condition,
        contactPhone: listing.contactPhone,
        contactWhatsapp: listing.contactWhatsapp || '',
        images: listing.images,
        status: 'sold',
      });
      setSelectedListing(null);
      await Promise.all([loadMarketplace(), loadUserScopedData()]);
      notify('تم تحديث حالة الإعلان إلى "تم البيع".');
    } catch {
      notify('تعذر تحديث حالة الإعلان.');
    }
  };

  const handleConfirmedDelete = async () => {
    if (!confirmDeleteListing) return;
    try {
      await deleteListing(confirmDeleteListing.id);
      setConfirmDeleteListing(null);
      setSelectedListing(null);
      await Promise.all([loadMarketplace(), loadUserScopedData()]);
      notify('تم حذف الإعلان بنجاح.');
    } catch {
      notify('تعذر حذف الإعلان.');
    }
  };

  const headerLogoHidden = logoDocked || flyingLogo !== null;
  const footerLogoHidden = flyingLogo !== null || !logoDocked;

  return (
    <div className="min-h-screen flex flex-col text-[#171717] overflow-x-clip">
      {/* Slim Notice Bar */}
      {settings.noticeText && (
        <div className="bg-[#D80605] text-white text-xs sm:text-sm py-2 px-3 sm:px-4 text-center font-semibold leading-snug">
          {settings.noticeText}
        </div>
      )}

      {/* Original Dark Obsidian Glass Top Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={(v) => setCurrentView(v)}
        onOpenCreate={handleOpenCreate}
        favoritesCount={favoriteIds.size}
        headerRef={headerRef}
        logoRef={headerLogoRef}
        logoHidden={headerLogoHidden}
      />

      {/* Auth Error Banner */}
      {authError && (
        <div className="bg-red-50 border-b border-red-200 px-3 sm:px-4 py-2.5 text-center text-xs sm:text-sm text-[#D80605] flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <span>{authError}</span>
          <button
            type="button"
            onClick={clearAuthError}
            className="text-[#A90505] underline font-bold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      <main className="flex-1 min-w-0">
        {/* VIEW: HOME — Restoring Original Hero, Categories & Listings */}
        {currentView === 'home' && (
          <>
            <section className="hero-search max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-3 sm:pt-7 sm:pb-4">
              <div className="max-w-4xl mx-auto text-center space-y-3.5">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#62666d]">
                    كل السودان في سوق واحد
                  </p>
                  <h1 className="font-display text-lg sm:text-2xl font-extrabold text-[#171717] text-balance">
                    بتفتش عن شنو؟
                  </h1>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setCurrentView('browse');
                  }}
                  className="bg-white border border-slate-200/90 rounded-[18px] p-2 sm:p-2.5 shadow-[0_8px_24px_rgba(16,16,16,0.05)] grid grid-cols-1 md:grid-cols-12 gap-2"
                >
                  <div className="md:col-span-6 relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="سيارة، شقة للإيجار، آيفون، ثلاجة..."
                      className="w-full h-11 px-3.5 rounded-[12px] bg-[#F6F7F9] border border-transparent focus:bg-white focus:border-slate-200 text-[#171717] placeholder:text-[#62666d] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#D80605]/30 transition-colors"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <select
                      value={selectedState}
                      onChange={(e) => {
                        setSelectedState(e.target.value);
                        setSelectedCity('all');
                      }}
                      className="w-full h-11 px-3 rounded-[12px] bg-[#F6F7F9] border border-transparent focus:bg-white focus:border-slate-200 text-[#171717] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#D80605]/30 transition-colors"
                    >
                      <option value="all">جميع الولايات</option>
                      {states.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      className="w-full h-11 rounded-[12px] bg-[#D80605] hover:bg-[#A90505] text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-[0_6px_14px_rgba(216,6,5,0.22)] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Search className="w-4 h-4 shrink-0" />
                      <span>بحث</span>
                    </button>
                  </div>
                </form>

                {!user && (
                  <div className="pt-0.5 flex justify-center">
                    <button
                      type="button"
                      onClick={signInWithGoogle}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-[12px] bg-white border border-slate-200 text-[#101010] text-xs sm:text-sm font-bold hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
                    >
                      <GoogleLogoIcon />
                      <span>الدخول السريع بحساب Google</span>
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Categories Grid matching original index.php */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-extrabold text-[#171717] flex items-center gap-2">
                  <Grid3X3 className="w-5 h-5 text-[#D80605]" />
                  <span>الأقسام الرئيسية</span>
                </h2>
                {selectedCategory !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className="text-xs font-bold text-[#D80605] hover:underline cursor-pointer"
                  >
                    عرض كل الأقسام
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {categories.map((cat) => {
                  const active = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() =>
                        setSelectedCategory((prev) => (prev === cat.id ? 'all' : cat.id))
                      }
                      className={`card-listing p-3.5 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                        active ? 'ring-2 ring-[#D80605] bg-white!' : ''
                      }`}
                    >
                      <div className="text-[#D80605]">
                        {getCategoryIcon(cat.icon, 'w-6 h-6')}
                      </div>
                      <span className="text-xs font-bold text-[#171717] line-clamp-1">
                        {cat.nameAr}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Latest Listings */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-display text-lg font-extrabold text-[#171717] flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#D80605]" />
                  <span>أحدث الإعلانات</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setCurrentView('browse')}
                  className="text-sm font-bold text-[#D80605] hover:underline whitespace-nowrap cursor-pointer"
                >
                  عرض الكل ({filteredListings.length})
                </button>
              </div>

              {loadingData ? (
                <div className="py-16 flex items-center justify-center gap-2 text-[#62666d]">
                  <Loader2 className="w-5 h-5 animate-spin text-[#D80605]" />
                  <span>جارٍ تحميل الإعلانات...</span>
                </div>
              ) : filteredListings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {filteredListings.slice(0, 12).map((item) => (
                    <ListingCard
                      key={item.id}
                      listing={item}
                      isFavorited={favoriteIds.has(item.id)}
                      onToggleFavorite={handleToggleFavorite}
                      onSelect={(l) => setSelectedListing(l)}
                    />
                  ))}
                </div>
              ) : (
                <div className="card-listing p-12 text-center space-y-4">
                  <p className="font-display text-lg font-bold text-[#171717]">
                    {listings.length === 0
                      ? 'لا توجد إعلانات منشورة حتى الآن'
                      : 'لا توجد إعلانات مطابقة لخيارات البحث حالياً'}
                  </p>
                  <p className="text-sm text-[#62666d] max-w-md mx-auto">
                    {listings.length === 0
                      ? 'أضف إعلانك الأول الآن أو سجل الدخول بحساب الإدارة لتهيئة الإعلانات الأساسية.'
                      : 'جرّب تغيير القسم أو الولاية أو مسح كلمات البحث.'}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleOpenCreate}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[14px] bg-[#D80605] text-white text-sm font-bold hover:bg-[#A90505] cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>أضف إعلانك</span>
                    </button>
                    {listings.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('all');
                          setSelectedState('all');
                          setSelectedCity('all');
                        }}
                        className="px-4 py-2.5 rounded-[14px] border border-slate-300 text-sm font-bold text-[#171717] hover:bg-slate-50 cursor-pointer"
                      >
                        إعادة ضبط الفلاتر
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {/* VIEW: BROWSE ALL */}
        {currentView === 'browse' && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="font-display text-2xl font-extrabold text-[#171717]">تصفح الإعلانات</h1>
                <p className="text-sm text-[#62666d] mt-0.5 tabular-nums">
                  {filteredListings.length} إعلان متاح
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-[#D80605] text-white text-sm font-bold hover:bg-[#A90505] self-start cursor-pointer shadow-[0_7px_18px_rgba(216,6,5,0.2)]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>أضف إعلانك</span>
              </button>
            </div>

            <div className="card-listing p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[#808080] absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="كلمة البحث..."
                  className="w-full pr-9 pl-3 py-2.5 rounded-[14px] border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D80605]/30"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2.5 rounded-[14px] border border-slate-300 text-sm bg-white"
              >
                <option value="all">كل الأقسام</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr}
                  </option>
                ))}
              </select>

              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedCity('all');
                }}
                className="px-3 py-2.5 rounded-[14px] border border-slate-300 text-sm bg-white"
              >
                <option value="all">كل الولايات</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameAr}
                  </option>
                ))}
              </select>

              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                disabled={selectedState === 'all'}
                className="px-3 py-2.5 rounded-[14px] border border-slate-300 text-sm bg-white disabled:bg-slate-50"
              >
                <option value="all">كل المدن</option>
                {selectedStateObj?.cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#808080] shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-[14px] border border-slate-300 text-sm bg-white"
                >
                  <option value="newest">الأحدث والأكثر تميزاً</option>
                  <option value="price_asc">السعر: من الأقل</option>
                  <option value="price_desc">السعر: من الأعلى</option>
                </select>
              </div>
            </div>

            {filteredListings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {filteredListings.map((item) => (
                  <ListingCard
                    key={item.id}
                    listing={item}
                    isFavorited={favoriteIds.has(item.id)}
                    onToggleFavorite={handleToggleFavorite}
                    onSelect={(l) => setSelectedListing(l)}
                  />
                ))}
              </div>
            ) : (
              <div className="card-listing p-12 text-center space-y-3">
                <MapPin className="w-8 h-8 text-[#D80605] mx-auto" />
                <p className="font-display text-lg font-bold text-[#171717]">
                  لا توجد نتائج مطابقة
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedState('all');
                    setSelectedCity('all');
                  }}
                  className="px-4 py-2 rounded-[14px] border border-slate-300 text-sm font-bold text-[#171717] hover:bg-slate-50 cursor-pointer"
                >
                  مسح الفلاتر
                </button>
              </div>
            )}
          </section>
        )}

        {/* VIEW: FAVORITES */}
        {currentView === 'favorites' && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div>
              <h1 className="font-display text-2xl font-extrabold text-[#171717]">المفضلة</h1>
              <p className="text-sm text-[#62666d] mt-0.5">
                الإعلانات التي قمت بحفظها للمتابعة لاحقاً
              </p>
            </div>

            {!user ? (
              <div className="card-listing p-10 text-center space-y-4">
                <Heart className="w-8 h-8 text-[#D80605] mx-auto" />
                <p className="text-sm text-[#62666d]">سجل دخولك لحفظ واستعراض إعلاناتك المفضلة.</p>
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[14px] bg-white border border-slate-300 text-sm font-bold text-[#101010] hover:bg-slate-50 cursor-pointer"
                >
                  <GoogleLogoIcon />
                  <span>الدخول بحساب Google</span>
                </button>
              </div>
            ) : favoriteListings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {favoriteListings.map((item) => (
                  <ListingCard
                    key={item.id}
                    listing={item}
                    isFavorited={true}
                    onToggleFavorite={handleToggleFavorite}
                    onSelect={(l) => setSelectedListing(l)}
                  />
                ))}
              </div>
            ) : (
              <div className="card-listing p-12 text-center space-y-3">
                <Heart className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-display text-base font-bold text-[#171717]">
                  قائمة المفضلة فارغة
                </p>
                <p className="text-sm text-[#62666d]">
                  اضغط على رمز القلب في أي إعلان لحفظه هنا.
                </p>
              </div>
            )}
          </section>
        )}

        {/* VIEW: MY LISTINGS */}
        {currentView === 'my-listings' && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
              <div>
                <h1 className="font-display text-2xl font-extrabold text-[#171717]">إعلاناتي</h1>
                <p className="text-sm text-[#62666d] mt-0.5">
                  متابعة وتعديل إعلاناتك المنشورة على المنصة
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[14px] bg-[#D80605] text-white text-sm font-bold hover:bg-[#A90505] cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>أضف إعلانك</span>
              </button>
            </div>

            {!user ? (
              <div className="card-listing p-10 text-center space-y-4">
                <p className="text-sm text-[#62666d]">سجل دخولك بحساب Google لعرض وإدارة إعلاناتك.</p>
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[14px] bg-white border border-slate-300 text-sm font-bold text-[#101010] hover:bg-slate-50 cursor-pointer"
                >
                  <GoogleLogoIcon />
                  <span>الدخول بحساب Google</span>
                </button>
              </div>
            ) : myListings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {myListings.map((item) => (
                  <ListingCard
                    key={item.id}
                    listing={item}
                    isFavorited={favoriteIds.has(item.id)}
                    onToggleFavorite={handleToggleFavorite}
                    onSelect={(l) => setSelectedListing(l)}
                    showStatus
                  />
                ))}
              </div>
            ) : (
              <div className="card-listing p-12 text-center space-y-3">
                <p className="font-display text-base font-bold text-[#171717]">
                  لم تضف أي إعلانات بعد
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[14px] bg-[#D80605] text-white text-sm font-bold hover:bg-[#A90505] cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>أنشئ إعلانك الأول</span>
                </button>
              </div>
            )}
          </section>
        )}

        {/* VIEW: PROFILE */}
        {currentView === 'profile' && <ProfileView states={states} />}

        {/* VIEW: ADMIN DASHBOARD */}
        {currentView === 'admin' && (
          <AdminDashboard
            onDataChanged={async () => {
              await Promise.all([loadMarketplace(), loadUserScopedData()]);
            }}
            onNotify={notify}
            onInspectListing={(l) => setSelectedListing(l)}
          />
        )}
      </main>

      {/* Original Dark Gradient Footer with Single-Logo Docking Target */}
      <footer ref={footerRef} className="site-footer text-white mt-12 sm:mt-16 pt-10 sm:pt-12 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div
                ref={footerLogoRef}
                className={`nav-logo-wrap mb-3 transition-opacity duration-150 ${
                  footerLogoHidden ? 'opacity-0' : 'opacity-100'
                }`}
              >
                <img
                  src={logoImg}
                  alt="سوق النيل"
                  className="w-[146px] h-[52px] sm:w-[166px] sm:h-[66px] object-contain"
                />
              </div>
              <p className="text-sm text-white/65 leading-relaxed">
                كل السودان في سوق واحد. منصتك للإعلانات المبوبة والتواصل بين السودانيين في كل الولايات.
              </p>
            </div>

            <div>
              <h6 className="font-display font-bold text-white mb-3">روابط سريعة</h6>
              <div className="space-y-2 text-sm text-white/70">
                <button type="button" onClick={() => setCurrentView('home')} className="block hover:text-white cursor-pointer">
                  الرئيسية
                </button>
                <button type="button" onClick={handleOpenCreate} className="block hover:text-white cursor-pointer">
                  نشر إعلان
                </button>
                <button type="button" onClick={() => setCurrentView('favorites')} className="block hover:text-white cursor-pointer">
                  المفضلة
                </button>
              </div>
            </div>

            <div>
              <h6 className="font-display font-bold text-white mb-3">حسابك</h6>
              <div className="space-y-2 text-sm text-white/70">
                <button type="button" onClick={() => setCurrentView('profile')} className="block hover:text-white cursor-pointer">
                  الملف الشخصي
                </button>
                <button type="button" onClick={() => setCurrentView('my-listings')} className="block hover:text-white cursor-pointer">
                  إعلاناتي
                </button>
                {isAdmin && (
                  <button type="button" onClick={() => setCurrentView('admin')} className="block text-[#ff6b6a] font-bold hover:text-white cursor-pointer">
                    لوحة الإدارة
                  </button>
                )}
              </div>
            </div>

            <div>
              <h6 className="font-display font-bold text-white mb-3">اكتشف سوق النيل</h6>
              <p className="text-xs text-white/65 mb-3">
                بيع، اشترِ، واعثر على ما تبحث عنه بسهولة في مكان واحد.
              </p>
              <button
                type="button"
                onClick={() => setCurrentView('browse')}
                className="px-4 py-2 rounded-[12px] bg-[#D80605] hover:bg-[#A90505] text-white text-xs font-bold cursor-pointer"
              >
                تصفح الإعلانات
              </button>
            </div>
          </div>

          <hr className="border-white/15 my-6" />

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/60">
            <span>© {new Date().getFullYear()} سوق النيل - جميع الحقوق محفوظة</span>
            <span>صُنع للسودانيين بكل حب</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          isFavorited={favoriteIds.has(selectedListing.id)}
          onToggleFavorite={handleToggleFavorite}
          onClose={() => setSelectedListing(null)}
          onViewUpdated={handleSingleListingViewUpdated}
          onEdit={(l) => {
            setSelectedListing(null);
            setEditingListing(l);
            setShowCreateModal(true);
          }}
          onMarkSold={handleMarkSold}
          onDelete={(l) => setConfirmDeleteListing(l)}
          onReport={(l) => {
            if (!user) {
              setShowSignInPrompt(true);
              return;
            }
            setReportingListing(l);
          }}
        />
      )}

      {showCreateModal && (
        <CreateListingModal
          categories={categories}
          states={states}
          requireApproval={settings.requireApproval}
          editingListing={editingListing}
          onClose={() => {
            setShowCreateModal(false);
            setEditingListing(null);
          }}
          onSaved={async (msg) => {
            setShowCreateModal(false);
            setEditingListing(null);
            await Promise.all([loadMarketplace(), loadUserScopedData()]);
            notify(msg);
          }}
        />
      )}

      {reportingListing && (
        <ReportModal
          listing={reportingListing}
          onClose={() => setReportingListing(null)}
          onSubmitted={() => {
            setReportingListing(null);
            notify('تم استلام بلاغك بنجاح وسيتم مراجعته من الإدارة.');
          }}
        />
      )}

      {/* Google Sign-In Modal with Original Logo */}
      {showSignInPrompt && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowSignInPrompt(false)}
        >
          <div
            className="bg-white rounded-[22px] border border-slate-200 w-full max-w-sm p-6 text-center space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowSignInPrompt(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={logoImg}
              alt="سوق النيل للسودانيين"
              className="w-[240px] h-[100px] object-contain mx-auto"
            />
            <h3 className="font-display text-lg font-extrabold text-[#171717]">
              تسجيل الدخول بحساب Google
            </h3>
            <p className="text-sm text-[#62666d]">
              سجل دخولك بنقرة واحدة لإضافة إعلانك، حفظ المفضلة، أو إرسال البلاغات.
            </p>
            <button
              type="button"
              onClick={async () => {
                const signedUser = await signInWithGoogle();
                if (signedUser) {
                  setShowSignInPrompt(false);
                }
              }}
              className="w-full py-3 px-4 rounded-[14px] bg-white border border-slate-300 text-[#101010] text-sm font-bold hover:bg-slate-50 flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <GoogleLogoIcon />
              <span>المتابعة بحساب Google</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteListing && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setConfirmDeleteListing(null)}
        >
          <div
            className="bg-white rounded-[22px] border border-slate-200 w-full max-w-sm p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold text-[#171717]">تأكيد حذف الإعلان</h3>
            <p className="text-sm text-[#62666d]">
              هل أنت متأكد من حذف "{confirmDeleteListing.title}"؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmDeleteListing(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-[#171717] hover:bg-slate-50 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmedDelete}
                className="px-4 py-2 rounded-xl bg-[#D80605] text-white text-sm font-bold hover:bg-[#A90505] cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single-Logo Smooth Flight Overlay between Header and Footer */}
      {flyingLogo && (
        <div
          aria-hidden="true"
          className="fixed z-50 pointer-events-none nav-logo-wrap"
          style={{
            top: `${flyingLogo.top}px`,
            left: `${flyingLogo.left}px`,
            width: `${flyingLogo.width}px`,
            height: `${flyingLogo.height}px`,
            transformOrigin: 'top left',
            transition: 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1)',
            transform: flyingLogo.active
              ? `translate3d(${flyingLogo.dx}px, ${flyingLogo.dy}px, 0) scale(${flyingLogo.sx}, ${flyingLogo.sy})`
              : 'translate3d(0, 0, 0) scale(1, 1)',
          }}
        >
          <img
            src={logoImg}
            alt=""
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 left-3 right-3 sm:left-5 sm:right-auto sm:w-96 z-[80] bg-[#101010] text-white px-4 py-3 rounded-[14px] shadow-xl text-sm flex items-center justify-between gap-3">
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-white/60 hover:text-white cursor-pointer shrink-0 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MarketplaceShell />
    </AuthProvider>
  );
}
