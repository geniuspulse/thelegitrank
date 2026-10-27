
2026-10-26 — Items 1-3 marked [skip]: need an email/SMS provider decision from the owner (recommend Africa's Talking for Malawi SMS + any SMTP relay for email).
2026-10-26 — Item 4: verified-purchase flow — optional receipt image upload on reviews (multipart, stored privately), staff-only receipt viewer, admin 'Mark verified purchase' action, public chip on review cards.
2026-10-26 — Item 6: duplicate business detection before adding — fuzzy name+city matching shows possible duplicates with links; creator confirms to list anyway.

2026-10-26 — Item 7: public photo attachments on reviews (served via /photo/:id, hidden reviews' photos 404).
2026-10-26 — Item 8: auto-flagging engine — profanity, off-platform solicitation, phone numbers, promotion patterns, ALL-CAPS, character spam; flagged reviews open a moderation report automatically.
2026-10-26 — Item 9: review rate limiting — max 5 posts/minute per user, plus existing one-review-per-business rule.

2026-10-26 — Business profile pictures: logo/photo upload while adding a business, in the owner's new manage-page profile editor (name, category, location, contact, description), and in the admin edit form. Logos serve publicly via /logo/:id, appear on profile heroes and search cards, replacements delete the old file. Owner edits are permission-checked and audited.

2026-10-27 — Item 10: owners cannot review their own business — blocked on both the review form and the POST route with a clear message; regular customers unaffected.
