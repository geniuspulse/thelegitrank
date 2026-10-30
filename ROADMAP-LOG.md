
2026-10-26 — Items 1-3 marked [skip]: need an email/SMS provider decision from the owner (recommend Africa's Talking for Malawi SMS + any SMTP relay for email).
2026-10-26 — Item 4: verified-purchase flow — optional receipt image upload on reviews (multipart, stored privately), staff-only receipt viewer, admin 'Mark verified purchase' action, public chip on review cards.
2026-10-26 — Item 6: duplicate business detection before adding — fuzzy name+city matching shows possible duplicates with links; creator confirms to list anyway.

2026-10-26 — Item 7: public photo attachments on reviews (served via /photo/:id, hidden reviews' photos 404).
2026-10-26 — Item 8: auto-flagging engine — profanity, off-platform solicitation, phone numbers, promotion patterns, ALL-CAPS, character spam; flagged reviews open a moderation report automatically.
2026-10-26 — Item 9: review rate limiting — max 5 posts/minute per user, plus existing one-review-per-business rule.

2026-10-26 — Business profile pictures: logo/photo upload while adding a business, in the owner's new manage-page profile editor (name, category, location, contact, description), and in the admin edit form. Logos serve publicly via /logo/:id, appear on profile heroes and search cards, replacements delete the old file. Owner edits are permission-checked and audited.

2026-10-27 — Item 10: owners cannot review their own business — blocked on both the review form and the POST route with a clear message; regular customers unaffected.

2026-10-28 — Item 15: legal pages live — Terms of Service, Privacy Policy, Cookie Policy, linked from the footer. Receipts/ID docs privacy, the verification-badge caveat, and appeals process are stated explicitly. Items 5 and 13 marked [skip] as owner decisions.

2026-10-28 — Business details editing for added listings: whoever added a business (created_by) can now open its manage page and save details (name, category, city, country, phone, website, description, logo), even if the listing is unclaimed and has no owner yet. Owners and admins keep full access; strangers are redirected with a permission message. "Edit details" button added to the business page for editors, and the dashboard now shows Manage alongside Claim for unclaimed listings you added. Also removed a duplicate write block that let a GET to /business/:slug/profile run the update path.

2026-10-28 — Business management and review management. The business manage page is now a control panel: verification/unclaimed status chips, rating, review count, reply rate and reply totals, quick links to the public page, verification application and claim, the details editor, and a reviews section where owners can post, update or remove their reply on any review. Reviewers can now delete their own reviews from the dashboard behind a confirmation page (author or admin only) — the review, its photo, receipt, reports and appeals are removed together and the deletion is audit-logged.

2026-10-28 — Auth layout: "Continue with Google" now sits at the top of the login and signup cards, above the email fields, with an "or continue with email" divider beneath it. Email sign-in stays the visual second option without being hidden.

2026-10-30 — Item 16: signed-in users can mark reviews helpful; totals display on review cards, repeat votes toggle, and self-voting is blocked.
