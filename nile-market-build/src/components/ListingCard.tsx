import { Eye, Heart, Star } from 'lucide-react';
import React, { useState } from 'react';
import avatarPlaceholder from '../assets/img/avatar-placeholder.svg';
import noImageSvg from '../assets/img/no-image.svg';
import { Listing } from '../types/marketplace';

interface ListingCardProps {
  listing: Listing;
  isFavorited: boolean;
  onToggleFavorite: (listing: Listing) => void;
  onSelect: (listing: Listing) => void;
  showStatus?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  pending: 'قيد المراجعة',
  sold: 'تم البيع',
  rejected: 'مرفوض',
};

export function formatPrice(price: number, currency: 'SDG' | 'USD'): string {
  const formatted = new Intl.NumberFormat('en-US').format(price);
  return currency === 'USD' ? `$${formatted}` : `${formatted} ج.س`;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  isFavorited,
  onToggleFavorite,
  onSelect,
  showStatus = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const coverImage = listing.images && listing.images.length > 0 ? listing.images[0] : '';

  return (
    <article
      onClick={() => onSelect(listing)}
      className="group card-listing cursor-pointer flex flex-col"
    >
      {/* 4:3 Image Frame */}
      <div className="relative aspect-[4/3] w-full bg-[#f1f2f4] overflow-hidden">
        {coverImage && !imgError ? (
          <img
            src={coverImage}
            alt={listing.title}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <img
            src={noImageSvg}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        )}

        {/* Favorite Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(listing);
          }}
          aria-label={isFavorited ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
          className={`absolute top-3 left-3 w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isFavorited
              ? 'bg-[#D80605] text-white shadow-sm'
              : 'bg-white/95 text-[#101010] hover:bg-white shadow-sm'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
        </button>

        {listing.isFeatured && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-[#101010]/85 text-white text-xs font-bold flex items-center gap-1 backdrop-blur-xs">
            <Star className="w-3 h-3 fill-[#D80605] text-[#D80605]" />
            <span>مميز</span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-2.5">
        <div>
          {/* Seller row matching original .listing-seller */}
          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-[#eceef0] text-xs text-[#34383d]">
            <img
              src={listing.ownerPhoto || avatarPlaceholder}
              alt={listing.ownerName}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = avatarPlaceholder;
              }}
              className="w-7 h-7 rounded-[9px] object-cover border border-[#e3e5e8] shrink-0"
            />
            <span className="font-bold truncate">{listing.ownerName}</span>
          </div>

          {/* Unboxed clean metadata line */}
          <div className="flex items-center gap-1.5 text-xs text-[#62666d] mb-1 truncate">
            <span>{listing.categoryName}</span>
            <span aria-hidden="true">·</span>
            <span>{listing.stateName}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{listing.city}</span>
          </div>

          <h3 className="font-display text-base font-bold text-[#171717] line-clamp-2 leading-snug group-hover:text-[#D80605] transition-colors">
            {listing.title}
          </h3>
        </div>

        <div className="pt-2 border-t border-[#eceef0] flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-base font-extrabold text-[#187344] tabular-nums" dir="ltr">
              {formatPrice(listing.price, listing.currency)}
            </span>
            {listing.negotiable && (
              <span className="text-xs text-[#62666d] whitespace-nowrap">· قابل للتفاوض</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-[#62666d] shrink-0">
            {showStatus && (
              <span
                className={`font-bold ${
                  listing.status === 'active'
                    ? 'text-[#187344]'
                    : listing.status === 'rejected'
                    ? 'text-[#D80605]'
                    : listing.status === 'sold'
                    ? 'text-[#454b54]'
                    : 'text-[#B45309]'
                }`}
              >
                {STATUS_LABELS[listing.status] || listing.status}
              </span>
            )}
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Eye className="w-3.5 h-3.5 text-[#808080]" />
              {listing.views || 0}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
};
