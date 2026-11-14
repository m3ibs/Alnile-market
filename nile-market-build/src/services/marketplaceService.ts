import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { DEFAULT_CATEGORIES, DEFAULT_STATES, INITIAL_SAMPLE_LISTINGS } from '../data/sudanCatalog';
import { db, handleFirestoreError, OperationType, PRIMARY_ADMIN_EMAIL } from '../firebase';
import {
  Category,
  Favorite,
  Listing,
  ListingStatus,
  PlatformSettings,
  Report,
  ReportReason,
  ReportStatus,
  SudanState,
  UserPrivate,
  UserPublic,
} from '../types/marketplace';

function toMillis(ts: any): number {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  return 0;
}

export function generateSafeId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export async function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ملف الصورة غير صالح'));
      img.onload = () => {
        const maxDim = 720;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('تعذر معالجة الصورة'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.72;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 120000 && quality > 0.3) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// User & Admin Synchronization
// ============================================================================

const syncInFlight = new Map<
  string,
  Promise<{ publicProfile: UserPublic; privateProfile: UserPrivate; isAdmin: boolean }>
>();

async function getDocPreferServer(ref: ReturnType<typeof doc>) {
  try {
    return await getDocFromServer(ref);
  } catch {
    return await getDoc(ref);
  }
}

export function syncUserOnSignIn(
  firebaseUser: User
): Promise<{ publicProfile: UserPublic; privateProfile: UserPrivate; isAdmin: boolean }> {
  const existingPromise = syncInFlight.get(firebaseUser.uid);
  if (existingPromise) {
    return existingPromise;
  }

  const runPromise = (async () => {
    const uid = firebaseUser.uid;
    const userRef = doc(db, 'users', uid);
    const privateRef = doc(db, 'users', uid, 'private', 'info');
    const adminRef = doc(db, 'admins', uid);

    const isPrimaryAdmin =
      firebaseUser.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() &&
      firebaseUser.emailVerified;

    let publicProfile: UserPublic;
    let privateProfile: UserPrivate;
    let isAdmin = isPrimaryAdmin;

    try {
      const userSnap = await getDocPreferServer(userRef);
      if (!userSnap.exists()) {
        const newPublic: Record<string, unknown> = {
          uid,
          displayName: (firebaseUser.displayName || 'مستخدم سوق النيل').slice(0, 80),
          photoURL: (firebaseUser.photoURL || '').slice(0, 500),
          stateId: '',
          city: '',
          role: isPrimaryAdmin ? 'admin' : 'user',
          isBanned: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(userRef, newPublic);
        publicProfile = {
          uid,
          displayName: String(newPublic.displayName),
          photoURL: String(newPublic.photoURL),
          stateId: '',
          city: '',
          role: isPrimaryAdmin ? 'admin' : 'user',
          isBanned: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      } else {
        const data = userSnap.data() as UserPublic;
        if (isPrimaryAdmin && data.role !== 'admin') {
          await updateDoc(userRef, { role: 'admin', updatedAt: serverTimestamp() });
          data.role = 'admin';
        }
        publicProfile = data;
        if (data.role === 'admin') {
          isAdmin = true;
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
    }

    try {
      const privSnap = await getDocPreferServer(privateRef);
      if (!privSnap.exists()) {
        const newPriv = {
          email: (firebaseUser.email || '').slice(0, 120),
          phone: '',
          whatsapp: '',
          updatedAt: serverTimestamp(),
        };
        await setDoc(privateRef, newPriv);
        privateProfile = {
          email: newPriv.email,
          phone: '',
          whatsapp: '',
          updatedAt: new Date(),
        };
      } else {
        privateProfile = privSnap.data() as UserPrivate;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${uid}/private/info`);
    }

    if (isPrimaryAdmin) {
      try {
        const adminSnap = await getDocPreferServer(adminRef);
        if (!adminSnap.exists()) {
          await setDoc(adminRef, {
            uid,
            email: firebaseUser.email || PRIMARY_ADMIN_EMAIL,
            createdAt: serverTimestamp(),
          });
        }
        isAdmin = true;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `admins/${uid}`);
      }
    } else {
      try {
        const adminSnap = await getDocPreferServer(adminRef);
        if (adminSnap.exists()) {
          isAdmin = true;
        }
      } catch {
        // Non-admin check failed silently as expected
      }
    }

    if (isAdmin) {
      await seedMarketplaceIfNeeded(firebaseUser, false);
    }

    return { publicProfile, privateProfile, isAdmin };
  })().finally(() => {
    syncInFlight.delete(firebaseUser.uid);
  });

  syncInFlight.set(firebaseUser.uid, runPromise);
  return runPromise;
}

export async function updateUserProfile(
  uid: string,
  updates: { displayName: string; stateId: string; city: string; phone: string; whatsapp: string }
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  const privateRef = doc(db, 'users', uid, 'private', 'info');

  try {
    await updateDoc(userRef, {
      displayName: updates.displayName.trim().slice(0, 80),
      stateId: updates.stateId.trim().slice(0, 64),
      city: updates.city.trim().slice(0, 64),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }

  try {
    const privSnap = await getDoc(privateRef);
    const email = privSnap.exists() ? String(privSnap.data().email || '') : '';
    await updateDoc(privateRef, {
      email,
      phone: updates.phone.trim().slice(0, 30),
      whatsapp: updates.whatsapp.trim().slice(0, 30),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}/private/info`);
  }
}

// ============================================================================
// Auto-Seeding Catalog & Sample Listings (Admin Only)
// ============================================================================

export async function seedMarketplaceIfNeeded(adminUser: User, force = false): Promise<boolean> {
  const settingsRef = doc(db, 'settings', 'platform');
  try {
    const snap = await getDoc(settingsRef);
    if (!force && snap.exists() && snap.data()?.seeded === true) {
      return false;
    }

    // Step 1: Seed Categories & States first so referential exists() checks pass for listings
    const batch1 = writeBatch(db);
    for (const cat of DEFAULT_CATEGORIES) {
      batch1.set(doc(db, 'categories', cat.id), {
        id: cat.id,
        nameAr: cat.nameAr,
        slug: cat.slug,
        icon: cat.icon,
        order: cat.order,
        isActive: cat.isActive,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const state of DEFAULT_STATES) {
      batch1.set(doc(db, 'states', state.id), {
        id: state.id,
        nameAr: state.nameAr,
        cities: state.cities,
        order: state.order,
        isActive: state.isActive,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    batch1.set(settingsRef, {
      requireApproval: false,
      noticeText: 'مرحباً بكم في سوق النيل للسودانيين — منصة موثوقة للبيع والشراء في جميع ولايات السودان.',
      seeded: true,
      updatedAt: serverTimestamp(),
    });
    await batch1.commit();

    // Step 2: Seed initial sample listings if none exist (or forced)
    const existingListings = await getDocs(query(collection(db, 'listings'), limit(1)));
    if (force || existingListings.empty) {
      const batch2 = writeBatch(db);
      for (const item of INITIAL_SAMPLE_LISTINGS) {
        const listingRef = doc(db, 'listings', item.id);
        batch2.set(listingRef, {
          ownerId: adminUser.uid,
          ownerName: (adminUser.displayName || 'إدارة سوق النيل').slice(0, 80),
          ownerPhoto: (adminUser.photoURL || '').slice(0, 500),
          title: item.title,
          description: item.description,
          price: item.price,
          currency: item.currency,
          negotiable: item.negotiable,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          stateId: item.stateId,
          stateName: item.stateName,
          city: item.city,
          condition: item.condition,
          contactPhone: item.contactPhone,
          contactWhatsapp: item.contactWhatsapp,
          images: item.images,
          status: item.status,
          isFeatured: item.isFeatured,
          views: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch2.commit();
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/platform');
  }
}

// ============================================================================
// Public Catalog Queries (Categories, States, Settings)
// ============================================================================

export async function fetchCategories(includeInactive = false): Promise<Category[]> {
  try {
    const q = includeInactive
      ? collection(db, 'categories')
      : query(collection(db, 'categories'), where('isActive', '==', true));
    const snap = await getDocs(q);
    if (snap.empty && !includeInactive) {
      return DEFAULT_CATEGORIES;
    }
    const list = snap.docs.map((d) => ({ ...(d.data() as Category), id: d.id }));
    return list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'categories');
  }
}

export async function fetchStates(includeInactive = false): Promise<SudanState[]> {
  try {
    const q = includeInactive
      ? collection(db, 'states')
      : query(collection(db, 'states'), where('isActive', '==', true));
    const snap = await getDocs(q);
    if (snap.empty && !includeInactive) {
      return DEFAULT_STATES;
    }
    const list = snap.docs.map((d) => ({ ...(d.data() as SudanState), id: d.id }));
    return list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'states');
  }
}

export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'platform'));
    if (!snap.exists()) {
      return { requireApproval: false, noticeText: '', seeded: false };
    }
    return snap.data() as PlatformSettings;
  } catch {
    return { requireApproval: false, noticeText: '', seeded: false };
  }
}

export async function updatePlatformSettings(settings: {
  requireApproval: boolean;
  noticeText: string;
  seeded: boolean;
}): Promise<void> {
  try {
    await setDoc(doc(db, 'settings', 'platform'), {
      requireApproval: settings.requireApproval,
      noticeText: settings.noticeText.trim().slice(0, 300),
      seeded: settings.seeded,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'settings/platform');
  }
}

// ============================================================================
// Listings CRUD & Views
// ============================================================================

async function mergeListingStats(items: Listing[]): Promise<Listing[]> {
  if (items.length === 0) return items;
  try {
    const statsSnap = await getDocs(
      query(collection(db, 'listing_stats'), where('views', '>=', 0), limit(200))
    );
    const statsMap = new Map<string, number>();
    statsSnap.docs.forEach((s) => {
      const data = s.data();
      if (typeof data.views === 'number') {
        statsMap.set(s.id, data.views);
      }
    });
    items.forEach((item) => {
      item.views = statsMap.get(item.id) ?? item.views ?? 0;
    });
  } catch {
    // Non-blocking fallback
  }
  return items;
}

export function subscribeListingStats(onUpdate: (statsMap: Map<string, number>) => void): () => void {
  const q = query(collection(db, 'listing_stats'), where('views', '>=', 0), limit(200));
  return onSnapshot(
    q,
    (snapshot) => {
      const statsMap = new Map<string, number>();
      snapshot.docs.forEach((s) => {
        const data = s.data();
        if (typeof data.views === 'number') {
          statsMap.set(s.id, data.views);
        }
      });
      onUpdate(statsMap);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'listing_stats');
    }
  );
}

export function subscribeSingleListingViews(
  listingId: string,
  onUpdate: (views: number) => void
): () => void {
  const statRef = doc(db, 'listing_stats', listingId);
  return onSnapshot(
    statRef,
    (snap) => {
      if (snap.exists()) {
        const val = snap.data()?.views;
        if (typeof val === 'number') {
          onUpdate(val);
        }
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `listing_stats/${listingId}`);
    }
  );
}

export async function fetchActiveListings(): Promise<Listing[]> {
  try {
    const q = query(collection(db, 'listings'), where('status', '==', 'active'), limit(200));
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({ ...(d.data() as Omit<Listing, 'id'>), id: d.id }));

    await mergeListingStats(items);

    return items.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return toMillis(b.createdAt) - toMillis(a.createdAt);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'listings');
  }
}

export async function fetchMyListings(uid: string): Promise<Listing[]> {
  try {
    const q = query(collection(db, 'listings'), where('ownerId', '==', uid), limit(100));
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({ ...(d.data() as Omit<Listing, 'id'>), id: d.id }));
    await mergeListingStats(items);
    return items.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `listings(ownerId=${uid})`);
  }
}

export async function fetchAllListingsAdmin(): Promise<Listing[]> {
  try {
    const snap = await getDocs(query(collection(db, 'listings'), limit(300)));
    const items = snap.docs.map((d) => ({ ...(d.data() as Omit<Listing, 'id'>), id: d.id }));
    await mergeListingStats(items);
    return items.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'listings(admin)');
  }
}

export interface ListingInput {
  title: string;
  description: string;
  price: number;
  currency: 'SDG' | 'USD';
  negotiable: boolean;
  categoryId: string;
  categoryName: string;
  stateId: string;
  stateName: string;
  city: string;
  condition: 'new' | 'used' | 'unspecified';
  contactPhone: string;
  contactWhatsapp: string;
  images: string[];
  status?: ListingStatus;
}

export async function createListing(
  user: User,
  input: ListingInput,
  requireApproval: boolean
): Promise<string> {
  const id = generateSafeId('ad');
  const status: ListingStatus = requireApproval ? 'pending' : 'active';
  try {
    await setDoc(doc(db, 'listings', id), {
      ownerId: user.uid,
      ownerName: (user.displayName || 'معلن في سوق النيل').slice(0, 80),
      ownerPhoto: (user.photoURL || '').slice(0, 500),
      title: input.title.trim().slice(0, 120),
      description: input.description.trim().slice(0, 3000),
      price: Number(input.price) || 0,
      currency: input.currency,
      negotiable: Boolean(input.negotiable),
      categoryId: input.categoryId,
      categoryName: input.categoryName.slice(0, 60),
      stateId: input.stateId,
      stateName: input.stateName.slice(0, 60),
      city: input.city.slice(0, 60),
      condition: input.condition,
      contactPhone: input.contactPhone.trim().slice(0, 30),
      contactWhatsapp: input.contactWhatsapp.trim().slice(0, 30),
      images: input.images.slice(0, 6),
      status,
      isFeatured: false,
      views: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `listings/${id}`);
  }
}

export async function updateListingByOwner(
  listingId: string,
  input: ListingInput & { status: ListingStatus }
): Promise<void> {
  try {
    await updateDoc(doc(db, 'listings', listingId), {
      title: input.title.trim().slice(0, 120),
      description: input.description.trim().slice(0, 3000),
      price: Number(input.price) || 0,
      currency: input.currency,
      negotiable: Boolean(input.negotiable),
      categoryId: input.categoryId,
      categoryName: input.categoryName.slice(0, 60),
      stateId: input.stateId,
      stateName: input.stateName.slice(0, 60),
      city: input.city.slice(0, 60),
      condition: input.condition,
      contactPhone: input.contactPhone.trim().slice(0, 30),
      contactWhatsapp: input.contactWhatsapp.trim().slice(0, 30),
      images: input.images.slice(0, 6),
      status: input.status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `listings/${listingId}`);
  }
}

export async function updateListingByAdmin(
  listingId: string,
  updates: { status?: ListingStatus; isFeatured?: boolean }
): Promise<void> {
  try {
    await updateDoc(doc(db, 'listings', listingId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `listings/${listingId}`);
  }
}

export async function deleteListing(listingId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'listings', listingId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `listings/${listingId}`);
  }
}

const viewInFlight = new Map<string, Promise<number>>();
const recentViewAt = new Map<string, number>();

export async function incrementListingView(listingId: string, isActiveListing = true): Promise<number> {
  const statRef = doc(db, 'listing_stats', listingId);

  if (!isActiveListing) {
    try {
      const snap = await getDocPreferServer(statRef);
      return snap.exists() ? Number(snap.data().views || 0) : 0;
    } catch {
      return 0;
    }
  }

  const existing = viewInFlight.get(listingId);
  if (existing) {
    return existing;
  }

  // Guard against React StrictMode double-mounting within 2.5 seconds
  const lastAt = recentViewAt.get(listingId) ?? 0;
  if (Date.now() - lastAt < 2500) {
    try {
      const snap = await getDocPreferServer(statRef);
      return snap.exists() ? Number(snap.data().views || 0) : 0;
    } catch {
      return 0;
    }
  }

  const runPromise = (async () => {
    recentViewAt.set(listingId, Date.now());
    try {
      const nextViews = await runTransaction(db, async (tx) => {
        const snap = await tx.get(statRef);
        if (!snap.exists()) {
          tx.set(statRef, {
            listingId,
            views: 1,
            updatedAt: serverTimestamp(),
          });
          return 1;
        }
        const next = Number(snap.data().views || 0) + 1;
        tx.update(statRef, {
          views: next,
          updatedAt: serverTimestamp(),
        });
        return next;
      });
      return nextViews;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `listing_stats/${listingId}`);
    }
  })().finally(() => {
    viewInFlight.delete(listingId);
  });

  viewInFlight.set(listingId, runPromise);
  return runPromise;
}

// ============================================================================
// Favorites
// ============================================================================

export async function fetchFavoriteIds(uid: string): Promise<Set<string>> {
  try {
    const q = query(collection(db, 'favorites'), where('userId', '==', uid), limit(200));
    const snap = await getDocs(q);
    const ids = new Set<string>();
    snap.docs.forEach((d) => {
      const fav = d.data() as Favorite;
      if (fav.listingId) ids.add(fav.listingId);
    });
    return ids;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `favorites(userId=${uid})`);
  }
}

export async function toggleFavoriteListing(
  uid: string,
  listingId: string,
  currentlyFavorited: boolean
): Promise<boolean> {
  const favId = `${uid}_${listingId}`;
  const favRef = doc(db, 'favorites', favId);
  try {
    if (currentlyFavorited) {
      await deleteDoc(favRef);
      return false;
    } else {
      await setDoc(favRef, {
        userId: uid,
        listingId,
        createdAt: serverTimestamp(),
      });
      return true;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `favorites/${favId}`);
  }
}

// ============================================================================
// Reports
// ============================================================================

export async function submitReport(
  user: User,
  listing: Listing,
  reason: ReportReason,
  details: string
): Promise<string> {
  const id = generateSafeId('rep');
  try {
    await setDoc(doc(db, 'reports', id), {
      reporterId: user.uid,
      reporterName: (user.displayName || 'مستخدم').slice(0, 80),
      listingId: listing.id,
      listingTitle: listing.title.slice(0, 120),
      reason,
      details: details.trim().slice(0, 500),
      status: 'open',
      adminNote: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `reports/${id}`);
  }
}

export async function fetchAllReportsAdmin(): Promise<Report[]> {
  try {
    const snap = await getDocs(query(collection(db, 'reports'), limit(200)));
    const items = snap.docs.map((d) => ({ ...(d.data() as Omit<Report, 'id'>), id: d.id }));
    return items.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'reports(admin)');
  }
}

export async function updateReportAdmin(
  reportId: string,
  status: ReportStatus,
  adminNote: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'reports', reportId), {
      status,
      adminNote: adminNote.trim().slice(0, 500),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
  }
}

// ============================================================================
// Admin Management (Users, Categories, States)
// ============================================================================

export async function fetchAllUsersAdmin(): Promise<(UserPublic & { email?: string })[]> {
  try {
    const snap = await getDocs(query(collection(db, 'users'), limit(200)));
    const users = snap.docs.map((d) => d.data() as UserPublic & { email?: string });
    await Promise.all(
      users.map(async (u) => {
        try {
          const priv = await getDoc(doc(db, 'users', u.uid, 'private', 'info'));
          if (priv.exists()) {
            u.email = String(priv.data().email || '');
          }
        } catch {
          // Ignore individual private doc failures
        }
      })
    );
    return users.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users(admin)');
  }
}

export async function updateUserAdmin(
  targetUser: UserPublic & { email?: string },
  updates: { role?: 'user' | 'admin'; isBanned?: boolean }
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', targetUser.uid), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    if (updates.role === 'admin') {
      const adminRef = doc(db, 'admins', targetUser.uid);
      const adminSnap = await getDocPreferServer(adminRef);
      if (!adminSnap.exists()) {
        await setDoc(adminRef, {
          uid: targetUser.uid,
          email: targetUser.email || 'admin@souqalnile.sd',
          createdAt: serverTimestamp(),
        });
      }
    } else if (updates.role === 'user') {
      await deleteDoc(doc(db, 'admins', targetUser.uid));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${targetUser.uid}`);
  }
}

export async function saveCategoryAdmin(
  cat: Omit<Category, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const safeId = cat.id.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const ref = doc(db, 'categories', safeId);
  try {
    if (isNew) {
      await setDoc(ref, {
        id: safeId,
        nameAr: cat.nameAr.trim().slice(0, 60),
        slug: cat.slug.trim().slice(0, 60),
        icon: cat.icon.trim().slice(0, 40) || 'Tag',
        order: Number(cat.order) || 1,
        isActive: Boolean(cat.isActive),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        nameAr: cat.nameAr.trim().slice(0, 60),
        slug: cat.slug.trim().slice(0, 60),
        icon: cat.icon.trim().slice(0, 40) || 'Tag',
        order: Number(cat.order) || 1,
        isActive: Boolean(cat.isActive),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `categories/${safeId}`);
  }
}

export async function deleteCategoryAdmin(categoryId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `categories/${categoryId}`);
  }
}

export async function saveStateAdmin(
  state: Omit<SudanState, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const safeId = state.id.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const ref = doc(db, 'states', safeId);
  const cleanCities = state.cities
    .map((c) => c.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 30);
  try {
    if (isNew) {
      await setDoc(ref, {
        id: safeId,
        nameAr: state.nameAr.trim().slice(0, 60),
        cities: cleanCities.length > 0 ? cleanCities : [state.nameAr.trim().slice(0, 60)],
        order: Number(state.order) || 1,
        isActive: Boolean(state.isActive),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        nameAr: state.nameAr.trim().slice(0, 60),
        cities: cleanCities.length > 0 ? cleanCities : [state.nameAr.trim().slice(0, 60)],
        order: Number(state.order) || 1,
        isActive: Boolean(state.isActive),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `states/${safeId}`);
  }
}

export async function deleteStateAdmin(stateId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'states', stateId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `states/${stateId}`);
  }
}
