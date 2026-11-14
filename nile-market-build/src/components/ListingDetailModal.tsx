import {
  CheckCircle2,
  Edit3,
  Eye,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import avatarPlaceholder from '../assets/img/avatar-placeholder.svg';
import noImageSvg from '../assets/img/no-image.svg';
import { useAuth } from '../context/AuthContext';
import {
  incrementListingView,
  subscribeSingleListingViews,
} from '../services/marketplaceService';
import { Listing } from '../types/marketplace';
import { formatPrice } from './ListingCard';

interface ListingDetailModalProps {
  listing: Listing;
  isFavorited: boolean;
  onToggleFavorite: (listing: Listing) => void;
  onClose: () => void;
  onEdit: (listing: Listing) => void;
  onMarkSold: (listing: Listing) => void;
  onDelete: (listing: Listing) => void;
  onReport: (listing: Listing) => void;
  onViewUpdated?: (listingId: string, views: number) => void;
}

const CONDITION_LABELS: Record<string, string> = {
  new: 'جديد',
  used: 'مستعمل',
  unspecified: 'غير محدد',
};

export const ListingDetailModal: React.FC<ListingDetailModalProps> = ({
  listing,
  isFavorited,
  onToggleFavorite,
  onClose,
  onEdit,
  onMarkSold,
  onDelete,
  onReport,
  onViewUpdated,
}) => {
  const { user, isAdmin } = useAuth();
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [liveViews, setLiveViews] = useState(listing.views || 0);
  const [copied, setCopied] = useState(false);
  const countedIdRef = useRef<string | null>(null);

  const isOwner = Boolean(user && user.uid === listing.ownerId);
  const canManage = isOwner || isAdmin;
  const images = listing.images && listing.images.length > 0 ? listing.images : [];

  useEffect(() => {
    setLiveViews(listing.views || 0);
  }, [listing.id, listing.views]);

  useEffect(() => {
    let active = true;
    const unsub = subscribeSingleListingViews(listing.id, (views) => {
      if (!active) return;
      setLiveViews(views);
      onViewUpdated?.(listing.id, views);
    });

    if (countedIdRef.current !== listing.id) {
      countedIdRef.current = listing.id;
      incrementListingView(listing.id, listing.status === 'active')
        .then((v) => {
          if (active && v > 0) {
            setLiveViews(v);
            onViewUpdated?.(listing.id, v);
          }
        })
        .catch(() => {
          // Non-blocking UI fallback
        });
    }

    return () => {
      active = false;
      unsub();
    };
  }, [listing.id, listing.status, onViewUpdated]);

  const handleShare = async () => {
    const shareText = `${listing.title} — ${formatPrice(listing.price, listing.currency)} في سوق النيل`;
    try {
      await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const cleanWhatsapp = (listing.contactWhatsapp || listing.contactPhone || '').replace(/[^\d]/g, '');

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[20px] sm:rounded-[22px] border border-slate-200 w-full max-w-5xl overflow-hidden shadow-2xl my-auto max-h-[94dvh] sm:max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-[#62666d] truncate min-w-0">
            <span className="truncate">{listing.categoryName}</span>
            <span>·</span>
            <span className="truncate">{listing.stateName}</span>
            <span>·</span>
            <span className="truncate">{listing.city}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 min-h-[40px] py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#171717] hover:bg-slate-50 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copied ? 'تم النسخ' : 'مشاركة'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8">
          <div className="lg:col-span-7 space-y-3">
            <div className="aspect-[4/3] w-full rounded-2xl bg-[#f1f2f4] overflow-hidden border border-slate-200">
              {images[selectedImageIdx] ? (
                <img
                  src={images[selectedImageIdx]}
                  alt={listing.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <img src={noImageSvg} alt={listing.title} className="w-full h-full object-cover" />
              )}
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`aspect-[4/3] rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                      selectedImageIdx === idx
                        ? 'border-[#D80605]'
                        : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`صورة ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-slate-200">
              <h4 className="font-display text-base font-bold text-[#171717] mb-2">
                تفاصيل الإعلان
              </h4>
              <p className="text-sm sm:text-base text-[#34383d] leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-5">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#171717] leading-snug text-balance">
                {listing.title}
              </h2>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#187344] tabular-nums" dir="ltr">
                  {formatPrice(listing.price, listing.currency)}
                </span>
                {listing.negotiable && (
                  <span className="text-sm font-medium text-[#62666d]">· قابل للتفاوض</span>
                )}
              </div>
            </div>

            <div className="py-4 border-y border-slate-200 grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <div>
                <span className="text-[#62666d] block text-xs">الولاية والمدينة</span>
                <span className="font-bold text-[#171717] inline-flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#D80605]" />
                  {listing.stateName} - {listing.city}
                </span>
              </div>
              <div>
                <span className="text-[#62666d] block text-xs">الحالة</span>
                <span className="font-bold text-[#171717] block mt-0.5">
                  {CONDITION_LABELS[listing.condition] || 'غير محدد'}
                </span>
              </div>
              <div>
                <span className="text-[#62666d] block text-xs">القسم</span>
                <span className="font-bold text-[#171717] block mt-0.5">
                  {listing.categoryName}
                </span>
              </div>
              <div>
                <span className="text-[#62666d] block text-xs">المشاهدات</span>
                <span className="font-bold text-[#171717] inline-flex items-center gap-1 mt-0.5 tabular-nums">
                  <Eye className="w-3.5 h-3.5 text-[#808080]" />
                  {liveViews}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-[15px] bg-[#f8f8f9] border border-[#e8e9ec] flex items-center gap-3">
              <img
                src={listing.ownerPhoto || avatarPlaceholder}
                alt={listing.ownerName}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = avatarPlaceholder;
                }}
                className="w-11 h-11 rounded-[11px] object-cover border border-[#e3e5e8]"
              />
              <div className="min-w-0">
                <p className="text-xs text-[#6b7077]">المعلن</p>
                <p className="text-sm font-bold text-[#171717] truncate">{listing.ownerName}</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <a
                href={`tel:${listing.contactPhone}`}
                className="w-full py-3 px-4 rounded-[14px] bg-[#D80605] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#A90505] transition-colors shadow-[0_7px_18px_rgba(216,6,5,0.2)]"
              >
                <Phone className="w-4 h-4" />
                <span dir="ltr">{listing.contactPhone}</span>
                <span>— اتصال مباشر</span>
              </a>

              {cleanWhatsapp && (
                <a
                  href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                    `السلام عليكم، أستفسر عن إعلانك في سوق النيل: ${listing.title}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-[14px] bg-[#16834B] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#11683B] transition-colors shadow-[0_7px_18px_rgba(22,131,75,0.18)]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>تواصل عبر واتساب</span>
                </a>
              )}

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => onToggleFavorite(listing)}
                  className={`py-2.5 px-3 rounded-[14px] border text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    isFavorited
                      ? 'border-[#D80605] bg-red-50 text-[#D80605]'
                      : 'border-slate-300 bg-white text-[#171717] hover:bg-slate-50'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                  <span>{isFavorited ? 'في المفضلة' : 'حفظ بالمفضلة'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onReport(listing)}
                  className="py-2.5 px-3 rounded-[14px] border border-slate-300 bg-white text-[#171717] text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <Flag className="w-4 h-4 text-[#D80605]" />
                  <span>إبلاغ عن مخالفة</span>
                </button>
              </div>
            </div>

            {canManage && (
              <div className="pt-4 border-t border-slate-200 space-y-2">
                <p className="text-xs font-bold text-[#62666d]">إدارة الإعلان</p>
                <div className="flex flex-wrap gap-2">
                  {isOwner && listing.status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => onEdit(listing)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-[#171717] hover:bg-slate-50 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل الإعلان</span>
                    </button>
                  )}
                  {isOwner && listing.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => onMarkSold(listing)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#16834B] bg-emerald-50 text-xs font-bold text-[#187344] hover:bg-emerald-100 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>تمييز كمباع</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(listing)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D80605] bg-red-50 text-xs font-bold text-[#D80605] hover:bg-red-100 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف الإعلان</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
