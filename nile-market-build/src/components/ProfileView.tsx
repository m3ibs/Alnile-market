import { CheckCircle2, Loader2, ShieldCheck, User as UserIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/marketplaceService';
import { SudanState } from '../types/marketplace';
import { GoogleLogoIcon } from './Navbar';

interface ProfileViewProps {
  states: SudanState[];
}

export const ProfileView: React.FC<ProfileViewProps> = ({ states }) => {
  const { user, userProfile, userPrivate, isAdmin, signInWithGoogle, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [stateId, setStateId] = useState(userProfile?.stateId || '');
  const [city, setCity] = useState(userProfile?.city || '');
  const [phone, setPhone] = useState(userPrivate?.phone || '');
  const [whatsapp, setWhatsapp] = useState(userPrivate?.whatsapp || '');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setStateId(userProfile.stateId || '');
      setCity(userProfile.city || '');
    }
    if (userPrivate) {
      setPhone(userPrivate.phone || '');
      setWhatsapp(userPrivate.whatsapp || '');
    }
  }, [userProfile, userPrivate]);

  const selectedState = states.find((s) => s.id === stateId);
  const availableCities = selectedState?.cities || [];

  if (!user) {
    return (
      <div className="max-w-lg mx-auto my-12 bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-600">
          <UserIcon className="w-6 h-6" />
        </div>
        <h2 className="font-display text-xl font-bold text-slate-900">تسجيل الدخول مطلوب</h2>
        <p className="text-sm text-slate-600">
          سجل دخولك باستخدام حساب Google لإدارة ملفك الشخصي وحفظ أرقام التواصل الخاصة بك.
        </p>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm font-semibold hover:bg-slate-50 cursor-pointer"
        >
          <GoogleLogoIcon />
          <span>الدخول بحساب Google</span>
        </button>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedMsg(null);
    if (!displayName.trim()) {
      setError('يرجى كتابة الاسم.');
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        displayName,
        stateId,
        city,
        phone,
        whatsapp,
      });
      await refreshProfile();
      setSavedMsg('تم حفظ بيانات حسابك في قاعدة البيانات بنجاح.');
    } catch (err) {
      console.error(err);
      setError('تعذر حفظ البيانات. حاول مرة أخرى.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {userProfile?.photoURL || user.photoURL ? (
              <img
                src={userProfile?.photoURL || user.photoURL || ''}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <UserIcon className="w-7 h-7" />
              </div>
            )}
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900">إعدادات الحساب</h2>
              <p className="text-xs text-slate-500 font-mono-num mt-0.5" dir="ltr">
                {user.email}
              </p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#B45309]">
              <ShieldCheck className="w-4 h-4" />
              <span>مدير المنصة</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {savedMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-[#187344] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{savedMsg}</span>
            </div>
          )}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              الاسم الظاهر للمشترين
            </label>
            <input
              type="text"
              required
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D80605]/30"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                الولاية الافتراضية
              </label>
              <select
                value={stateId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setStateId(nextId);
                  const st = states.find((s) => s.id === nextId);
                  setCity(st?.cities[0] || '');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#D80605]/30"
              >
                <option value="">اختر الولاية</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                المدينة
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!stateId}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white disabled:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#D80605]/30"
              >
                <option value="">اختر المدينة</option>
                {availableCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                رقم الهاتف المحفوظ
              </label>
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+249912345678"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#D80605]/30"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                رقم الواتساب المحفوظ
              </label>
              <input
                type="tel"
                dir="ltr"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="249912345678"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#D80605]/30"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#D80605] text-white text-sm font-semibold hover:bg-[#A90505] transition-colors disabled:opacity-60 flex items-center gap-2 cursor-pointer"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>حفظ التغييرات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
