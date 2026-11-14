/**
 * Security Rule Verification Suite — Souq Al-Nile (Dirty Dozen Adversarial Payloads)
 *
 * Designed for verification against the Firestore Rules Engine (`DRAFT_firestore.rules` / `firestore.rules`).
 * Every payload below asserts that unauthorized, spoofed, or malformed writes return PERMISSION_DENIED.
 */

export interface AdversarialPayloadTest {
  id: string;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: AdversarialPayloadTest[] = [
  {
    id: 'DD-01',
    name: 'Self-Role Escalation',
    collectionPath: '/users/user_123',
    operation: 'create',
    auth: { uid: 'user_123', email: 'attacker@gmail.com', email_verified: true },
    payload: {
      uid: 'user_123',
      displayName: 'Attacker',
      role: 'admin',
      isBanned: false,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-02',
    name: 'PII Cross-Read',
    collectionPath: '/users/victim_uid/private/info',
    operation: 'get',
    auth: { uid: 'attacker_uid', email: 'attacker@gmail.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-03',
    name: 'Ghost Field Injection',
    collectionPath: '/listings/listing_ghost',
    operation: 'create',
    auth: { uid: 'user_123', email: 'seller@gmail.com', email_verified: true },
    payload: {
      ownerId: 'user_123',
      title: 'Test Listing',
      shadowAdmin: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-04',
    name: 'Identity Spoofing on Listing',
    collectionPath: '/listings/listing_spoof',
    operation: 'create',
    auth: { uid: 'attacker_uid', email: 'attacker@gmail.com', email_verified: true },
    payload: {
      ownerId: 'victim_uid',
      ownerName: 'Victim',
      title: 'Spoofed Ad',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-05',
    name: 'Orphan Category Injection',
    collectionPath: '/listings/listing_orphan',
    operation: 'create',
    auth: { uid: 'user_123', email: 'seller@gmail.com', email_verified: true },
    payload: {
      ownerId: 'user_123',
      categoryId: 'non_existent_cat_999',
      stateId: 'khartoum',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-06',
    name: 'Feature Flag Forgery',
    collectionPath: '/listings/listing_featured',
    operation: 'create',
    auth: { uid: 'user_123', email: 'seller@gmail.com', email_verified: true },
    payload: {
      ownerId: 'user_123',
      isFeatured: true,
      status: 'active',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-07',
    name: 'Terminal Lock Bypass on Rejected Ad',
    collectionPath: '/listings/rejected_ad_1',
    operation: 'update',
    auth: { uid: 'user_123', email: 'seller@gmail.com', email_verified: true },
    payload: {
      status: 'active',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-08',
    name: 'Immutable Field Tampering (createdAt/ownerId)',
    collectionPath: '/listings/active_ad_1',
    operation: 'update',
    auth: { uid: 'user_123', email: 'seller@gmail.com', email_verified: true },
    payload: {
      ownerId: 'other_uid',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-09',
    name: 'Report Status Hijack',
    collectionPath: '/reports/report_1',
    operation: 'create',
    auth: { uid: 'user_123', email: 'reporter@gmail.com', email_verified: true },
    payload: {
      reporterId: 'user_123',
      status: 'resolved',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-10',
    name: 'Favorite Scraping Without Owner Filter',
    collectionPath: '/favorites',
    operation: 'list',
    auth: { uid: 'user_123', email: 'user@gmail.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-11',
    name: 'Oversized ID Poisoning',
    collectionPath: `/listings/${'a'.repeat(300)}`,
    operation: 'create',
    auth: { uid: 'user_123', email: 'seller@gmail.com', email_verified: true },
    payload: { title: 'Poison ID' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-12',
    name: 'Unverified Admin Email Spoof',
    collectionPath: '/categories/cat_new',
    operation: 'create',
    auth: { uid: 'spoof_uid', email: 'mo3iusa@gmail.com', email_verified: false },
    payload: { id: 'cat_new', nameAr: 'قسم مزيف' },
    expectedResult: 'PERMISSION_DENIED',
  },
];
