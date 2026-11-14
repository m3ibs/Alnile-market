import { LayoutDashboard, LogOut, Menu, PlusCircle, User as UserIcon, X } from 'lucide-react';
import React, { useState } from 'react';
import logoImg from '../assets/img/logo.png';
import { useAuth } from '../context/AuthContext';

export type AppView = 'home' | 'browse' | 'favorites' | 'my-listings' | 'profile' | 'admin';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenCreate: () => void;
  favoritesCount: number;
  headerRef?: React.RefObject<HTMLElement | null>;
  logoRef?: React.RefObject<HTMLSpanElement | null>;
  logoHidden?: boolean;
}

export const GoogleLogoIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
    />
  </svg>
);

export const NileLogoMark: React.FC<{ className?: string }> = ({
  className = 'w-[104px] h-[36px] sm:w-[158px] sm:h-[56px] object-contain',
}) => (
  <span className="nav-logo-wrap shrink-0">
    <img src={logoImg} alt="سوق النيل للسودانيين" className={className} />
  </span>
);

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenCreate,
  favoritesCount,
  headerRef,
  logoRef,
  logoHidden = false,
}) => {
  const { user, userProfile, isAdmin, isSigningIn, signInWithGoogle, signOutUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navItems: { id: AppView; label: string; badge?: number; adminOnly?: boolean }[] = [
    { id: 'home', label: 'الرئيسية' },
    { id: 'browse', label: 'الإعلانات' },
    { id: 'favorites', label: 'المفضلة', badge: favoritesCount > 0 ? favoritesCount : undefined },
    { id: 'my-listings', label: 'إعلاناتي' },
    ...(isAdmin ? [{ id: 'admin' as AppView, label: 'لوحة الإدارة', adminOnly: true }] : []),
  ];

  const handleNav = (id: AppView) => {
    onNavigate(id);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  return (
    <header ref={headerRef} className="sticky top-0 z-40 site-navbar text-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-6">
        {/* Zone 1: Original Brand Logo */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className={`flex items-center whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D80605] rounded-2xl cursor-pointer ${
            logoHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          aria-label="سوق النيل للسودانيين"
        >
          <span ref={logoRef} className="inline-flex">
            <NileLogoMark />
          </span>
        </button>

        {/* Zone 2: Primary Navigation Links */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-6">
          {navItems.map((item) => {
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`relative py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  active ? 'text-white' : 'text-white/80 hover:text-white'
                }`}
              >
                {item.adminOnly && <LayoutDashboard className="w-4 h-4 text-[#D80605]" />}
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="text-xs font-mono-num text-[#ff6b6a]">({item.badge})</span>
                )}
                {active && (
                  <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-[#D80605] rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action & Auth */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {user ? (
            <>
              <button
                type="button"
                onClick={onOpenCreate}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 min-h-[40px] py-2 sm:py-2.5 rounded-[12px] sm:rounded-[14px] bg-[#D80605] text-white text-xs sm:text-sm font-bold hover:bg-[#A90505] transition-colors shadow-[0_7px_18px_rgba(216,6,5,0.28)] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span className="sm:hidden">أضف إعلان</span>
                <span className="hidden sm:inline">أضف إعلانك</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen((v) => !v)}
                  className="flex items-center gap-2 px-2 py-1.5 min-h-[40px] min-w-[40px] justify-center rounded-[12px] sm:rounded-[14px] border border-white/25 bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer"
                  aria-label="قائمة الحساب"
                >
                  {userProfile?.photoURL || user.photoURL ? (
                    <img
                      src={userProfile?.photoURL || user.photoURL || ''}
                      alt={userProfile?.displayName || 'صورة الحساب'}
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                  <span className="hidden lg:inline text-sm font-semibold text-white max-w-[115px] truncate">
                    {userProfile?.displayName || user.displayName || 'حسابي'}
                  </span>
                </button>

                {userDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-56 max-w-[calc(100vw-24px)] rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 text-slate-900">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {userProfile?.displayName || user.displayName}
                      </p>
                      <p className="text-xs text-slate-500 truncate font-mono-num" dir="ltr">
                        {user.email}
                      </p>
                      {isAdmin && (
                        <p className="text-xs font-bold text-[#D80605] mt-1">مدير المنصة</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNav('profile')}
                      className="w-full text-right px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <span>حسابي</span>
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleNav('admin')}
                        className="w-full text-right px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <LayoutDashboard className="w-4 h-4 text-[#D80605]" />
                        <span>لوحة الإدارة</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        setUserDropdownOpen(false);
                        await signOutUser();
                        onNavigate('home');
                      }}
                      className="w-full text-right px-4 py-2.5 text-sm text-[#D80605] hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <button
                type="button"
                disabled={isSigningIn}
                onClick={signInWithGoogle}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 min-h-[40px] py-2 rounded-[12px] sm:rounded-[14px] bg-white text-[#101010] text-xs sm:text-sm font-bold hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
              >
                <GoogleLogoIcon className="w-4 h-4 shrink-0" />
                <span className="sm:hidden">{isSigningIn ? 'دخول...' : 'دخول Google'}</span>
                <span className="hidden sm:inline">
                  {isSigningIn ? 'جارٍ الدخول...' : 'الدخول بحساب Google'}
                </span>
              </button>
              <button
                type="button"
                onClick={onOpenCreate}
                className="hidden sm:inline-flex items-center gap-2 px-4 min-h-[40px] py-2 rounded-[14px] bg-[#D80605] text-white text-sm font-bold hover:bg-[#A90505] transition-colors shadow-[0_7px_18px_rgba(216,6,5,0.28)] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>أضف إعلانك</span>
              </button>
            </div>
          )}

          {/* Mobile Menu Trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-white/90 hover:bg-white/10 cursor-pointer shrink-0"
            aria-label="فتح القائمة"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#101010] px-3 py-3 space-y-1.5 max-h-[calc(100dvh-64px)] overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`w-full text-right px-3.5 min-h-[44px] py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between cursor-pointer ${
                currentView === item.id
                  ? 'bg-[#D80605] text-white'
                  : 'text-white/85 hover:bg-white/10'
              }`}
            >
              <span className="flex items-center gap-2">
                {item.adminOnly && <LayoutDashboard className="w-4 h-4" />}
                {item.label}
              </span>
              {item.badge !== undefined && (
                <span className="text-xs font-mono-num">{item.badge}</span>
              )}
            </button>
          ))}
          <div className="pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenCreate();
              }}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#D80605] text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#A90505] cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>أضف إعلانك</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
