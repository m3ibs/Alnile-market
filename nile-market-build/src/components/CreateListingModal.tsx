import { ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  compressImageToDataUrl,
  createListing,
  updateListingByOwner,
} from '../services/marketplaceService';
import { Category, Currency, Listing, ListingCondition, SudanState } from '../types/marketplace';

interface CreateListingModalProps {
  categories: Category[];
  states: SudanState[];
  requireApproval: boolean;
  editingListing?: Listing | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export const CreateListingModal: React.FC<CreateListingModalProps> = ({
  categories,
  states,
  requireApproval,
  editingListing,
  onClose,
  onSaved,
}) => {
  const { user, userPrivate } = useAuth();
  const [title, setTitle] = useState(editingListing?.title || '');
  const [description, setDescription] = useState(editingListing?.description || '');
  const [price, setPrice] = useState(editingListing ? String(editingListing.price) : '');
  const [currency, setCurrency] = useState<Currency>(editingListing?.currency || 'SDG');
  const [negotiable, setNegotiable] = useState(editingListing?.negotiable ?? true);
  const [categoryId, setCategoryId] = useState(
    editingListing?.categoryId || categories[0]?.id || ''
  );
  const [stateId, setStateId] = useState(editingListing?.stateId || states[0]?.id || '');
  const [city, setCity] = useState(editingListing?.city || '');
  const [condition, setCondition] = useState<ListingCondition>(
    editingListing?.condition || 'used'
  );
  const [contactPhone, setContactPhone] = useState(
    editingListing?.contactPhone || userPrivate?.phone || ''
  );
  const [contactWhatsapp, setContactWhatsapp] = useState(
    editingListing?.contactWhatsapp || userPrivate?.whatsapp || ''
  );
  const [images, setImages] = useState<string[]>(editingListing?.images || []);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedState = states.find((s) => s.id === stateId);
  const availableCities = selectedState?.cities || [];

  useEffect(() => {
    if (availableCities.length > 0 && !availableCities.includes(city)) {
      setCity(availableCities[0]);
    }
  }, [stateId, availableCities, city]);

  const handleImageFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (images.length + files.length > 6) {
      setError('الحد الأقصى للصور هو 6 صور للإعلان الواحد.');
      return;
    }
    setUploadingImages(true);
    setError(null);
    try {
      const compressed = await Promise.all(files.map((f) => compressImageToDataUrl(f)));
      setImages((prev) => [...prev, ...compressed].slice(0, 6));
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء معالجة الصور');
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    if (title.trim().length < 3 || title.trim().length > 120) {
      setError('عنوان الإعلان يجب أن يكون بين 3 و 120 حرفاً.');
      return;
    }
    if (description.trim().length < 10 || description.trim().length > 3000) {
      setError('الوصف يجب أن يكون 10 أحرف على الأقل.');
      return;
    }
    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      setError('يرجى إدخال سعر صحيح.');
      return;
    }
    if (!categoryId || !stateId || !city) {
      setError('يرجى اختيار القسم والولاية والمدينة.');
      return;
    }
    if (contactPhone.trim().length < 6) {
      setError('يرجى إدخال رقم هاتف صحيح للتواصل.');
      return;
    }

    const catObj = categories.find((c) => c.id === categoryId);
    const stateObj = states.find((s) => s.id === stateId);

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        price: numericPrice,
        currency,
        negotiable,
        categoryId,
        categoryName: catObj?.nameAr || 'عام',
        stateId,
        stateName: stateObj?.nameAr || 'الخرطوم',
        city,
        condition,
        contactPhone: contactPhone.trim(),
        contactWhatsapp: contactWhatsapp.trim() || contactPhone.trim(),
        images,
      };

      if (editingListing) {
        await updateListingByOwner(editingListing.id, {
          ...payload,
          status: editingListing.status === 'sold' ? 'active' : editingListing.status,
        });
        onSaved('تم تحديث الإعلان بنجاح.');
      } else {
        await createListing(user, payload, requireApproval);
        onSaved(
          requireApproval
            ? 'تم استلام إعلانك وهو الآن قيد المراجعة من الإدارة.'
            : 'تم نشر إعلانك في سوق النيل بنجاح!'
        );
      }
    } catch (err: any) {
      console.error(err);
      setError('تعذر حفظ الإعلان. تأكد من اتصالك وصلاحيات الحساب ثم أعد المحاولة.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl overflow-hidden shadow-2xl my-auto max-h-[94dvh] sm:max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-display text-base sm:text-lg font-bold text-slate-900">
            {editingListing ? 'تعديل الإعلان' : 'إضافة إعلان جديد في سوق النيل'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              عنوان الإعلان
            </label>
            <input
              type="text"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تويوتا كورولا 2018 بحالة ممتازة في الخرطوم"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D80605]/30 focus:border-[#D80605]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">القسم</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#D80605]/30 focus:border-[#D80605]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">الحالة</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ListingCondition)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#D80605]/30 focus:border-[#D80605]"
              >
                <option value="new">جديد</option>
                <option value="used">مستعمل</option>
                <option value="unspecified">غير محدد</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">الولاية</label>
              <select
                value={stateId}
                onChange={(e) => setStateId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#D80605]/30 focus:border-[#D80605]"
              >
                {states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">المدينة / المحلية</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#D80605]/30 focus:border-[#D80605]"
              >
                {availableCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">السعر</label>
              <input
                type="number"
                min={0}
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                dir="ltr"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#D80605]/30 focus:border-[#D80605]"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">العملة</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#D80605]/30 focus:border-[#D80605]"
              >
                <option value="SDG">جنيه سوداني (ج.س)</option>
                <option value="USD">دولار أمريكي ($)</option>
              </select>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={negotiable}
              onChange={(e) => setNegotiable(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-[#D80605] focus:ring-[#D80605]"
            />
            <span>السعر قابل للتفاوض</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                رقم الهاتف للتواصل
              </label>
              <input
                type="tel"
                required
                dir="ltr"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+249912345678"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#D80605]/30 focus:border-[#D80605]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                رقم الواتساب (اختياري)
              </label>
              <input
                type="tel"
                dir="ltr"
                value={contactWhatsapp}
                onChange={(e) => setContactWhatsapp(e.target.value)}
                placeholder="249912345678"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono-num focus:outline-none focus:ring-2 focus:ring-[#D80605]/30 focus:border-[#D80605]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              وصف الإعلان
            </label>
            <textarea
              rows={4}
              required
              minLength={10}
              maxLength={3000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب وصفاً واضحاً للمنتج أو الخدمة، المواصفات، الموقع الدقيق، وأي تفاصيل تهم المشتري..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D80605]/30 focus:border-[#D80605]"
            />
          </div>

          {/* Multi-image Upload */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-800">
                صور الإعلان (حتى 6 صور)
              </label>
              <span className="text-xs text-slate-500 font-mono-num">{images.length}/6</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              {images.map((src, idx) => (
                <div
                  key={idx}
                  className="relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                >
                  <img
                    src={src}
                    alt={`صورة ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute top-1 left-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 cursor-pointer"
                    aria-label="حذف الصورة"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {images.length < 6 && (
                <label className="aspect-[4/3] rounded-lg border-2 border-dashed border-slate-300 hover:border-[#D80605] bg-slate-50 flex flex-col items-center justify-center cursor-pointer text-slate-500 hover:text-[#D80605] transition-colors">
                  {uploadingImages ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="w-5 h-5 mb-1" />
                      <span className="text-[11px] font-medium">إضافة صور</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploadingImages}
                    onChange={handleImageFiles}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting || uploadingImages}
              className="px-6 py-2.5 rounded-xl bg-[#D80605] text-white text-sm font-semibold hover:bg-[#A90505] transition-colors disabled:opacity-60 flex items-center gap-2 cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{editingListing ? 'حفظ التعديلات' : 'نشر الإعلان'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
