import { Flag, Loader2, X } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { submitReport } from '../services/marketplaceService';
import { Listing, ReportReason } from '../types/marketplace';

interface ReportModalProps {
  listing: Listing;
  onClose: () => void;
  onSubmitted: () => void;
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'fraud', label: 'احتيال أو معلومات مضللة' },
  { value: 'spam', label: 'إعلان مكرر أو مزعج' },
  { value: 'prohibited', label: 'سلعة أو خدمة مخالفة للأنظمة' },
  { value: 'wrong_category', label: 'تصنيف أو قسم غير صحيح' },
  { value: 'other', label: 'سبب آخر' },
];

export const ReportModal: React.FC<ReportModalProps> = ({ listing, onClose, onSubmitted }) => {
  const { user } = useAuth();
  const [reason, setReason] = useState<ReportReason>('fraud');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      await submitReport(user, listing, reason, details);
      onSubmitted();
    } catch (err) {
      console.error(err);
      setError('تعذر إرسال البلاغ. يرجى المحاولة مجدداً.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900">
            <Flag className="w-4 h-4 text-red-600" />
            <h3 className="font-display text-base font-bold">إبلاغ عن إعلان مخالف</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <span className="block text-slate-400 mb-0.5">الإعلان المبلغ عنه</span>
            <span className="font-semibold text-slate-900 line-clamp-1">{listing.title}</span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              سبب البلاغ
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#D80605]/30"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5">
              تفاصيل إضافية (اختياري)
            </label>
            <textarea
              rows={3}
              maxLength={500}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="اشرح المخالفة لمساعدة فريق الإدارة..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#D80605]/30"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 flex items-center gap-2 cursor-pointer"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>إرسال البلاغ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
