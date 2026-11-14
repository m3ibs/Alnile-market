import {
  Ban,
  Check,
  CheckCircle,
  Database,
  Eye,
  Flag,
  FolderTree,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Star,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  deleteCategoryAdmin,
  deleteListing,
  deleteStateAdmin,
  fetchAllListingsAdmin,
  fetchAllReportsAdmin,
  fetchAllUsersAdmin,
  fetchCategories,
  fetchPlatformSettings,
  fetchStates,
  saveCategoryAdmin,
  saveStateAdmin,
  seedMarketplaceIfNeeded,
  subscribeListingStats,
  updateListingByAdmin,
  updatePlatformSettings,
  updateReportAdmin,
  updateUserAdmin,
} from '../services/marketplaceService';
import {
  Category,
  Listing,
  ListingStatus,
  PlatformSettings,
  Report,
  ReportStatus,
  SudanState,
  UserPublic,
} from '../types/marketplace';
import { formatPrice } from './ListingCard';

type AdminTab = 'listings' | 'users' | 'categories' | 'states' | 'reports' | 'settings';

interface AdminDashboardProps {
  onDataChanged: () => Promise<void>;
  onNotify: (msg: string) => void;
  onInspectListing: (listing: Listing) => void;
}

const STATUS_AR: Record<ListingStatus, string> = {
  active: 'نشط',
  pending: 'قيد المراجعة',
  sold: 'تم البيع',
  rejected: 'مرفوض',
};

const REPORT_REASON_AR: Record<string, string> = {
  fraud: 'احتيال',
  spam: 'إزعاج وتكرار',
  prohibited: 'مخالف للأنظمة',
  wrong_category: 'قسم خاطئ',
  other: 'أخرى',
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onDataChanged,
  onNotify,
  onInspectListing,
}) => {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('listings');
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<(UserPublic & { email?: string })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [states, setStates] = useState<SudanState[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [settings, setSettings] = useState<PlatformSettings>({
    requireApproval: false,
    noticeText: '',
    seeded: true,
  });

  // Filters
  const [listingStatusFilter, setListingStatusFilter] = useState<'all' | ListingStatus>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Category Form State
  const [newCatId, setNewCatId] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatOrder, setNewCatOrder] = useState('9');

  // State Form State
  const [newStateId, setNewStateId] = useState('');
  const [newStateName, setNewStateName] = useState('');
  const [newStateCities, setNewStateCities] = useState('');
  const [newStateOrder, setNewStateOrder] = useState('19');

  const loadAdminData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [allAds, allUsers, allCats, allStates, allReports, platSettings] = await Promise.all([
        fetchAllListingsAdmin(),
        fetchAllUsersAdmin(),
        fetchCategories(true),
        fetchStates(true),
        fetchAllReportsAdmin(),
        fetchPlatformSettings(),
      ]);
      setListings(allAds);
      setUsers(allUsers);
      setCategories(allCats);
      setStates(allStates);
      setReports(allReports);
      setSettings(platSettings);
    } catch (err) {
      console.error(err);
      onNotify('تعذر تحميل بيانات الإدارة من Firestore.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, onNotify]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = subscribeListingStats((statsMap) => {
      setListings((prev) =>
        prev.map((item) => {
          const nextViews = statsMap.get(item.id);
          return nextViews !== undefined && item.views !== nextViews
            ? { ...item, views: nextViews }
            : item;
        })
      );
    });
    return () => unsub();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <Shield className="w-10 h-10 text-red-600 mx-auto mb-3" />
        <h2 className="font-display text-xl font-bold text-slate-900">صلاحية مقيدة</h2>
        <p className="text-sm text-slate-600 mt-1">
          هذه اللوحة مخصصة لمدير المنصة فقط.
        </p>
      </div>
    );
  }

  const filteredListings =
    listingStatusFilter === 'all'
      ? listings
      : listings.filter((l) => l.status === listingStatusFilter);

  const pendingCount = listings.filter((l) => l.status === 'pending').length;
  const openReportsCount = reports.filter((r) => r.status === 'open').length;

  const handleListingStatus = async (listing: Listing, status: ListingStatus) => {
    setBusyId(listing.id);
    try {
      await updateListingByAdmin(listing.id, { status });
      setListings((prev) => prev.map((l) => (l.id === listing.id ? { ...l, status } : l)));
      await onDataChanged();
      onNotify(`تم تحديث حالة الإعلان إلى "${STATUS_AR[status]}".`);
    } catch {
      onNotify('فشل تحديث حالة الإعلان.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleFeatured = async (listing: Listing) => {
    setBusyId(listing.id);
    try {
      const next = !listing.isFeatured;
      await updateListingByAdmin(listing.id, { isFeatured: next });
      setListings((prev) =>
        prev.map((l) => (l.id === listing.id ? { ...l, isFeatured: next } : l))
      );
      await onDataChanged();
      onNotify(next ? 'تم تمييز الإعلان.' : 'تم إلغاء تمييز الإعلان.');
    } catch {
      onNotify('فشل تحديث التمييز.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    setBusyId(listingId);
    try {
      await deleteListing(listingId);
      setListings((prev) => prev.filter((l) => l.id !== listingId));
      await onDataChanged();
      onNotify('تم حذف الإعلان نهائياً.');
    } catch {
      onNotify('فشل حذف الإعلان.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleBan = async (target: UserPublic & { email?: string }) => {
    if (target.uid === user?.uid) {
      onNotify('لا يمكنك حظر حسابك الشخصي.');
      return;
    }
    setBusyId(target.uid);
    try {
      const next = !target.isBanned;
      await updateUserAdmin(target, { isBanned: next });
      setUsers((prev) => prev.map((u) => (u.uid === target.uid ? { ...u, isBanned: next } : u)));
      onNotify(next ? 'تم حظر المستخدم.' : 'تم إلغاء حظر المستخدم.');
    } catch {
      onNotify('فشل تحديث حالة المستخدم.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleRole = async (target: UserPublic & { email?: string }) => {
    if (target.uid === user?.uid) {
      onNotify('لا يمكنك تغيير صلاحيتك الحالية.');
      return;
    }
    setBusyId(target.uid);
    try {
      const nextRole = target.role === 'admin' ? 'user' : 'admin';
      await updateUserAdmin(target, { role: nextRole });
      setUsers((prev) => prev.map((u) => (u.uid === target.uid ? { ...u, role: nextRole } : u)));
      onNotify(nextRole === 'admin' ? 'تمت ترقية المستخدم إلى مدير.' : 'تمت إزالة صلاحية المدير.');
    } catch {
      onNotify('فشل تغيير صلاحية المستخدم.');
    } finally {
      setBusyId(null);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatId.trim() || !newCatName.trim()) return;
    setBusyId('cat_new');
    try {
      const cleanId = newCatId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      await saveCategoryAdmin(
        {
          id: cleanId,
          nameAr: newCatName.trim(),
          slug: cleanId.replace(/_/g, '-'),
          icon: 'Tag',
          order: Number(newCatOrder) || 10,
          isActive: true,
        },
        true
      );
      setNewCatId('');
      setNewCatName('');
      await loadAdminData();
      await onDataChanged();
      onNotify('تمت إضافة القسم بنجاح.');
    } catch {
      onNotify('تعذر إضافة القسم.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleCategoryActive = async (cat: Category) => {
    setBusyId(cat.id);
    try {
      await saveCategoryAdmin({ ...cat, isActive: !cat.isActive }, false);
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, isActive: !c.isActive } : c))
      );
      await onDataChanged();
    } catch {
      onNotify('تعذر تحديث القسم.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    setBusyId(catId);
    try {
      await deleteCategoryAdmin(catId);
      setCategories((prev) => prev.filter((c) => c.id !== catId));
      await onDataChanged();
      onNotify('تم حذف القسم.');
    } catch {
      onNotify('تعذر حذف القسم.');
    } finally {
      setBusyId(null);
    }
  };

  const handleAddState = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStateId.trim() || !newStateName.trim() || !newStateCities.trim()) return;
    setBusyId('state_new');
    try {
      const cleanId = newStateId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const citiesArr = newStateCities
        .split(/[,،]/)
        .map((c) => c.trim())
        .filter(Boolean);
      await saveStateAdmin(
        {
          id: cleanId,
          nameAr: newStateName.trim(),
          cities: citiesArr,
          order: Number(newStateOrder) || 19,
          isActive: true,
        },
        true
      );
      setNewStateId('');
      setNewStateName('');
      setNewStateCities('');
      await loadAdminData();
      await onDataChanged();
      onNotify('تمت إضافة الولاية والمدن بنجاح.');
    } catch {
      onNotify('تعذر إضافة الولاية.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteState = async (stateId: string) => {
    setBusyId(stateId);
    try {
      await deleteStateAdmin(stateId);
      setStates((prev) => prev.filter((s) => s.id !== stateId));
      await onDataChanged();
      onNotify('تم حذف الولاية.');
    } catch {
      onNotify('تعذر حذف الولاية.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReportUpdate = async (report: Report, status: ReportStatus) => {
    setBusyId(report.id);
    try {
      await updateReportAdmin(report.id, status, status === 'resolved' ? 'تمت المعالجة' : 'تم الإغلاق');
      setReports((prev) => prev.map((r) => (r.id === report.id ? { ...r, status } : r)));
      onNotify('تم تحديث حالة البلاغ.');
    } catch {
      onNotify('تعذر تحديث البلاغ.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId('settings');
    try {
      await updatePlatformSettings({
        requireApproval: settings.requireApproval,
        noticeText: settings.noticeText || '',
        seeded: true,
      });
      await onDataChanged();
      onNotify('تم حفظ إعدادات المنصة.');
    } catch {
      onNotify('تعذر حفظ الإعدادات.');
    } finally {
      setBusyId(null);
    }
  };

  const handleForceSeed = async () => {
    if (!user) return;
    setBusyId('seed');
    try {
      await seedMarketplaceIfNeeded(user, true);
      await loadAdminData();
      await onDataChanged();
      onNotify('تمت تهيئة جميع الولايات والأقسام والإعلانات الأساسية في Firestore.');
    } catch {
      onNotify('حدث خطأ أثناء تهيئة البيانات.');
    } finally {
      setBusyId(null);
    }
  };

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'listings', label: 'الإعلانات', icon: <Database className="w-4 h-4" />, count: pendingCount || undefined },
    { id: 'users', label: 'المستخدمون', icon: <Users className="w-4 h-4" /> },
    { id: 'categories', label: 'الأقسام', icon: <FolderTree className="w-4 h-4" /> },
    { id: 'states', label: 'الولايات والمدن', icon: <MapPin className="w-4 h-4" /> },
    { id: 'reports', label: 'البلاغات', icon: <Flag className="w-4 h-4" />, count: openReportsCount || undefined },
    { id: 'settings', label: 'الإعدادات', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">لوحة تحكم المدير</h1>
          <p className="text-sm text-slate-500 mt-1">
            إدارة كاملة لقاعدة بيانات سوق النيل: الإعلانات، الحسابات، الأقسام، الولايات، والبلاغات.
          </p>
        </div>
        <button
          type="button"
          onClick={loadAdminData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث البيانات</span>
        </button>
      </div>

      {/* KPI Row — Original Black & Red Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#101010] text-white rounded-2xl p-5 shadow-md">
          <span className="text-xs text-white/70">إجمالي الإعلانات</span>
          <p className="text-2xl font-extrabold text-white mt-1 tabular-nums">{listings.length}</p>
        </div>
        <div className="bg-[#D80605] text-white rounded-2xl p-5 shadow-md">
          <span className="text-xs text-white/85">بانتظار المراجعة</span>
          <p className="text-2xl font-extrabold text-white mt-1 tabular-nums">{pendingCount}</p>
        </div>
        <div className="bg-[#101010] text-white rounded-2xl p-5 shadow-md">
          <span className="text-xs text-white/70">المستخدمون المسجلون</span>
          <p className="text-2xl font-extrabold text-white mt-1 tabular-nums">{users.length}</p>
        </div>
        <div className="bg-[#D80605] text-white rounded-2xl p-5 shadow-md">
          <span className="text-xs text-white/85">بلاغات مفتوحة</span>
          <p className="text-2xl font-extrabold text-white mt-1 tabular-nums">{openReportsCount}</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[#f1f2f4] rounded-2xl overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap shrink-0 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#D80605] text-white shadow-sm'
                : 'text-[#171717] hover:bg-white/70'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-xs font-mono-num ${activeTab === tab.id ? 'text-white' : 'text-[#D80605]'}`}>
                ({tab.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex items-center justify-center gap-2 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>جارٍ تحميل البيانات من Firestore...</span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* TAB 1: LISTINGS */}
          {activeTab === 'listings' && (
            <div>
              <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-2">
                {(['all', 'pending', 'active', 'sold', 'rejected'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setListingStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      listingStatusFilter === st
                        ? 'bg-[#D80605] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'all' ? 'الكل' : STATUS_AR[st]}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">الإعلان</th>
                      <th className="px-4 py-3 font-semibold">المعلن</th>
                      <th className="px-4 py-3 font-semibold">الولاية / القسم</th>
                      <th className="px-4 py-3 font-semibold">السعر</th>
                      <th className="px-4 py-3 font-semibold">المشاهدات</th>
                      <th className="px-4 py-3 font-semibold">الحالة</th>
                      <th className="px-4 py-3 font-semibold">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredListings.map((ad) => (
                      <tr key={ad.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 max-w-xs">
                          <button
                            type="button"
                            onClick={() => onInspectListing(ad)}
                            className="font-semibold text-slate-900 hover:text-[#D80605] text-right line-clamp-1 cursor-pointer"
                          >
                            {ad.title}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{ad.ownerName}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {ad.stateName} · {ad.categoryName}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#D80605] tabular-nums whitespace-nowrap" dir="ltr">
                          {formatPrice(ad.price, ad.currency)}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                            {ad.views || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold">
                          {STATUS_AR[ad.status]}
                          {ad.isFeatured && <span className="text-[#B45309]"> · مميز</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {ad.status !== 'active' && (
                              <button
                                type="button"
                                disabled={busyId === ad.id}
                                onClick={() => handleListingStatus(ad, 'active')}
                                title="تفعيل"
                                className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {ad.status !== 'rejected' && (
                              <button
                                type="button"
                                disabled={busyId === ad.id}
                                onClick={() => handleListingStatus(ad, 'rejected')}
                                title="رفض"
                                className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 cursor-pointer"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={busyId === ad.id}
                              onClick={() => handleToggleFeatured(ad)}
                              title="تمييز"
                              className={`p-1.5 rounded-lg cursor-pointer ${
                                ad.isFeatured
                                  ? 'text-[#B45309] bg-amber-50'
                                  : 'text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              <Star className={`w-4 h-4 ${ad.isFeatured ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              type="button"
                              disabled={busyId === ad.id}
                              onClick={() => handleDeleteListing(ad.id)}
                              title="حذف"
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredListings.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                          لا توجد إعلانات مطابقة لهذا الفلتر.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: USERS */}
          {activeTab === 'users' && (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">المستخدم</th>
                    <th className="px-4 py-3 font-semibold">البريد الإلكتروني</th>
                    <th className="px-4 py-3 font-semibold">الصلاحية</th>
                    <th className="px-4 py-3 font-semibold">الحالة</th>
                    <th className="px-4 py-3 font-semibold">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.uid}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{u.displayName}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 font-mono-num" dir="ltr">
                        {u.email || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {u.role === 'admin' ? (
                          <span className="text-[#B45309]">مدير</span>
                        ) : (
                          <span className="text-slate-600">مستخدم</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {u.isBanned ? (
                          <span className="text-red-600">محظور</span>
                        ) : (
                          <span className="text-[#D80605]">نشط</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={busyId === u.uid || u.uid === user?.uid}
                            onClick={() => handleToggleRole(u)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                          >
                            {u.role === 'admin' ? 'سحب الإدارة' : 'ترقية لمدير'}
                          </button>
                          <button
                            type="button"
                            disabled={busyId === u.uid || u.uid === user?.uid}
                            onClick={() => handleToggleBan(u)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer ${
                              u.isBanned
                                ? 'bg-emerald-50 text-[#D80605] border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>{u.isBanned ? 'فك الحظر' : 'حظر'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="p-6 space-y-6">
              <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">المعرف (إنجليزي)</label>
                  <input
                    type="text"
                    required
                    value={newCatId}
                    onChange={(e) => setNewCatId(e.target.value)}
                    placeholder="spare_parts"
                    dir="ltr"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono-num"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">اسم القسم بالعربية</label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="قطع غيار سيارات"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={newCatOrder}
                    onChange={(e) => setNewCatOrder(e.target.value)}
                    className="w-20 px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono-num"
                    title="الترتيب"
                  />
                  <button
                    type="submit"
                    disabled={busyId === 'cat_new'}
                    className="flex-1 px-4 py-2 rounded-xl bg-[#D80605] text-white text-sm font-semibold hover:bg-[#A90505] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة</span>
                  </button>
                </div>
              </form>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {categories.map((cat) => (
                  <div key={cat.id} className="px-4 py-3 flex items-center justify-between gap-4 bg-white">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{cat.nameAr}</p>
                      <p className="text-xs text-slate-500 font-mono-num" dir="ltr">
                        {cat.id} · order: {cat.order}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busyId === cat.id}
                        onClick={() => handleToggleCategoryActive(cat)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                          cat.isActive
                            ? 'bg-emerald-50 text-[#187344]'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {cat.isActive ? 'مفعل' : 'معطل'}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === cat.id}
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: STATES & CITIES */}
          {activeTab === 'states' && (
            <div className="p-6 space-y-6">
              <form onSubmit={handleAddState} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">المعرف (إنجليزي)</label>
                  <input
                    type="text"
                    required
                    value={newStateId}
                    onChange={(e) => setNewStateId(e.target.value)}
                    placeholder="new_state"
                    dir="ltr"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">اسم الولاية</label>
                  <input
                    type="text"
                    required
                    value={newStateName}
                    onChange={(e) => setNewStateName(e.target.value)}
                    placeholder="اسم الولاية"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    المدن (مفصولة بفاصلة)
                  </label>
                  <input
                    type="text"
                    required
                    value={newStateCities}
                    onChange={(e) => setNewStateCities(e.target.value)}
                    placeholder="المدينة 1، المدينة 2"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={newStateOrder}
                    onChange={(e) => setNewStateOrder(e.target.value)}
                    className="w-16 px-2.5 py-2 rounded-xl border border-slate-300 text-sm font-mono-num"
                  />
                  <button
                    type="submit"
                    disabled={busyId === 'state_new'}
                    className="flex-1 px-4 py-2 rounded-xl bg-[#D80605] text-white text-sm font-semibold hover:bg-[#A90505] cursor-pointer"
                  >
                    إضافة
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {states.map((st) => (
                  <div
                    key={st.id}
                    className="p-4 rounded-xl border border-slate-200 flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">{st.nameAr}</p>
                      <p className="text-xs text-slate-600 mt-1">{st.cities.join(' · ')}</p>
                    </div>
                    <button
                      type="button"
                      disabled={busyId === st.id}
                      onClick={() => handleDeleteState(st.id)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: REPORTS */}
          {activeTab === 'reports' && (
            <div className="divide-y divide-slate-100">
              {reports.map((rep) => (
                <div key={rep.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-red-600">
                        {REPORT_REASON_AR[rep.reason] || rep.reason}
                      </span>
                      <span>·</span>
                      <span>المبلّغ: {rep.reporterName}</span>
                      <span>·</span>
                      <span>
                        الحالة:{' '}
                        {rep.status === 'open'
                          ? 'مفتوح'
                          : rep.status === 'resolved'
                          ? 'تمت المعالجة'
                          : 'مرفوض'}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{rep.listingTitle}</p>
                    {rep.details && <p className="text-xs text-slate-600">{rep.details}</p>}
                  </div>

                  {rep.status === 'open' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={busyId === rep.id}
                        onClick={() => handleReportUpdate(rep, 'resolved')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#187344] hover:bg-emerald-100 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>معالجة</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyId === rep.id}
                        onClick={() => handleReportUpdate(rep, 'dismissed')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
                      >
                        <span>تجاهل</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {reports.length === 0 && (
                <div className="p-10 text-center text-sm text-slate-500">
                  لا توجد بلاغات مسجلة حتى الآن.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="p-6 space-y-6 max-w-2xl">
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={settings.requireApproval}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, requireApproval: e.target.checked }))
                    }
                    className="mt-1 w-4 h-4 text-[#D80605] rounded border-slate-300"
                  />
                  <div>
                    <span className="block text-sm font-bold text-slate-900">
                      مراجعة الإعلانات قبل النشر
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      عند التفعيل، تدخل الإعلانات الجديدة بحالة "قيد المراجعة" حتى يوافق عليها المدير.
                    </span>
                  </div>
                </label>

                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    إشعار عام أعلى الموقع (اختياري)
                  </label>
                  <input
                    type="text"
                    maxLength={300}
                    value={settings.noticeText || ''}
                    onChange={(e) => setSettings((s) => ({ ...s, noticeText: e.target.value }))}
                    placeholder="رسالة ترحيب أو تنبيه للزوار..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busyId === 'settings'}
                  className="px-5 py-2.5 rounded-xl bg-[#D80605] text-white text-sm font-semibold hover:bg-[#A90505] cursor-pointer"
                >
                  حفظ الإعدادات
                </button>
              </form>

              <div className="pt-6 border-t border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">تهيئة البيانات الأساسية (Firestore Seed)</h3>
                <p className="text-xs text-slate-500 mt-1 mb-3">
                  إعادة تعبئة الولايات السودانية (18 ولاية)، الأقسام (8 أقسام)، والإعلانات الافتراضية في قاعدة البيانات.
                </p>
                <button
                  type="button"
                  disabled={busyId === 'seed'}
                  onClick={handleForceSeed}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                >
                  <Database className="w-4 h-4 text-[#D80605]" />
                  <span>تهيئة البيانات في Firestore</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
