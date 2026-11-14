# Security Specification — Souq Al-Nile (سوق النيل للسودانيين)

## 1. Data Invariants
1. **Identity Integrity**: A user document `/users/{userId}` can only be created by `request.auth.uid == userId` with `role == 'user'` and `isBanned == false` (unless the user is verified `mo3iusa@gmail.com`). Regular users cannot elevate `role` or modify `isBanned`.
2. **PII Isolation**: User emails and private contact numbers in `/users/{userId}/private/info` are readable and writable ONLY by the owning user or verified admins.
3. **Referential Existence**: Every listing in `/listings/{listingId}` MUST reference an existing category in `/categories/{categoryId}` and an existing state in `/states/{stateId}`, with `ownerId == request.auth.uid` on creation.
4. **Terminal State Locking**: Once a listing reaches `status == 'rejected'` or a report reaches `status in ['resolved', 'dismissed']`, non-admin users cannot modify the record.
5. **Query Enforcer**: `allow list` on `/listings` only exposes `resource.data.status == 'active'` publicly, or `resource.data.ownerId == request.auth.uid`, or `isAdmin()`. `allow list` on `/favorites` and `/reports` enforces ownership or admin privilege directly on `resource.data`.
6. **Admin Verification**: `isAdmin()` enforces `request.auth.token.email_verified == true` when checking the bootstrapped admin email `mo3iusa@gmail.com` or `/admins/{uid}` existence.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Self-Role Escalation**: `POST /users/{uid}` with `{ "role": "admin", "isBanned": false }` as a regular user -> `PERMISSION_DENIED`.
2. **PII Cross-Read**: `GET /users/{otherUid}/private/info` as another authenticated user -> `PERMISSION_DENIED`.
3. **Ghost Field Injection**: `POST /listings/{id}` including `{ "shadowAdmin": true }` -> `PERMISSION_DENIED`.
4. **Identity Spoofing on Listing**: `POST /listings/{id}` with `ownerId: "victim_uid"` -> `PERMISSION_DENIED`.
5. **Orphan Category Injection**: `POST /listings/{id}` with `categoryId: "non_existent_cat"` -> `PERMISSION_DENIED`.
6. **Feature Flag Forgery**: `POST /listings/{id}` with `isFeatured: true` as non-admin -> `PERMISSION_DENIED`.
7. **Terminal Lock Bypass**: `PATCH /listings/{id}` changing `status: "active"` when existing `status == "rejected"` as non-admin -> `PERMISSION_DENIED`.
8. **Immutable Field Tampering**: `PATCH /listings/{id}` modifying `createdAt` or `ownerId` -> `PERMISSION_DENIED`.
9. **Report Status Hijack**: `POST /reports/{id}` with `status: "resolved"` as a regular user -> `PERMISSION_DENIED`.
10. **Favorite Scraping**: `LIST /favorites` without `where('userId', '==', auth.uid)` -> `PERMISSION_DENIED`.
11. **Oversized ID Poisoning**: `PUT /listings/{1500_char_id}` -> `PERMISSION_DENIED`.
12. **Unverified Admin Email Spoof**: Request with `email: "mo3iusa@gmail.com"` and `email_verified: false` -> `PERMISSION_DENIED`.
