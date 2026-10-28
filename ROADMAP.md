# The Legit Rank — World-Class Roadmap (100 items)

Daily build automation works top-down. Mark done with `[x]`.

## P0 — Trust & safety
- [skip] 1. Email verification at signup (token links) — needs owner: choose an email/SMS provider (e.g. SMTP relay or Africa's Talking)
- [skip] 2. Password reset via email link — needs owner: email provider decision
- [skip] 3. Phone (SMS/OTP) verification option — needs owner: SMS provider (Africa's Talking / Twilio) and account
- [x] 4. "Verified purchase" badge — receipt/proof upload on reviews
- [skip] 5. Business verification tiers (docs, address, phone) — needs owner decision: what should each verification tier check and mean?
- [x] 6. Duplicate business detection before adding
- [x] 7. Review attachments (photos of product/delivery)
- [x] 8. Moderation queue with auto-flagging (spam, profanity)
- [x] 9. Rate limiting reviews per user per business
- [x] 10. Block owners reviewing their own business
- [x] 11. Report/flag buttons on reviews and profiles
- [x] 12. Admin analytics dashboard (signups, reviews, flags/day)
- [skip] 13. Two-factor auth for admin accounts — needs owner decision: email/SMS provider for the one-time codes
- [x] 14. Audit log of admin actions
- [ ] 15. Legal pages: Terms, Privacy, Cookies

## P1 — Reviews & engagement
- [ ] 16. Helpful votes on reviews ("X found this helpful")
- [ ] 17. Notify owners when a review needs response
- [ ] 18. Review edit history with timestamps
- [ ] 19. Reviewer achievement levels (Top Reviewer, Verified Buyer)
- [ ] 20. Auto sentiment tags per business (fast delivery, quality, scam alert)
- [ ] 21. Keyword cloud ("most mentioned: delivery")
- [ ] 22. Share buttons: WhatsApp, X, Facebook
- [ ] 23. Invite friends to review a business
- [ ] 24. Follow a business — new-review alerts
- [ ] 25. Milestone badges for businesses (10, 50, 100 reviews)
- [ ] 26. Review deep-link URLs per review
- [ ] 27. "Reviews near you" weekly digest email

## P1 — Discovery & search
- [ ] 28. Full-text search with typo tolerance
- [ ] 29. Category landing pages with SEO copy
- [ ] 30. City/country pages ("Best in Blantyre")
- [ ] 31. Filters: rating, verified, review count, category
- [ ] 32. Sorting: most reviewed, top rated, newest
- [ ] 33. Pagination/infinite scroll on search
- [ ] 34. "Trending this week" section
- [ ] 35. Compare two businesses side by side
- [ ] 36. Map view of businesses
- [ ] 37. Suggest-a-business (request a listing)
- [ ] 38. Related businesses on profiles
- [ ] 39. Recently viewed businesses
- [ ] 40. Search autocomplete as you type
- [ ] 41. "Near me" location-aware results
- [ ] 42. Useful empty-state education screens

## P2 — Business profiles
- [ ] 43. Cover photos/banner images
- [ ] 44. Logo uploads
- [ ] 45. Opening hours display
- [ ] 46. Contact: phone, WhatsApp, website, socials
- [ ] 47. Product/service catalog with prices
- [ ] 48. Owner announcement posts
- [ ] 49. Verified purchase stats on profile
- [ ] 50. Multi-category support
- [ ] 51. Address with Google Maps link
- [ ] 52. Years in business
- [ ] 53. Payment methods accepted
- [ ] 54. Delivery/pickup options
- [ ] 55. Owner theme color for profile

## P2 — Growth & SEO
- [ ] 56. Auto-generated sitemap.xml
- [ ] 57. robots.txt
- [ ] 58. AggregateRating + LocalBusiness JSON-LD on profiles
- [ ] 59. Open Graph tags per business (share previews)
- [ ] 60. Blog/insights section (scam-awareness articles)
- [ ] 61. Scam-alert listing page (confirmed reports)
- [ ] 62. Weekly "top-rated new businesses" email
- [ ] 63. Generated OG share images per business
- [ ] 64. Referral program
- [ ] 65. PWA manifest (installable app)
- [ ] 66. Service worker + offline shell
- [ ] 67. Image lazy loading
- [ ] 68. Lighthouse ≥ 95 mobile performance
- [ ] 69. Dark mode
- [ ] 70. Accessibility: WCAG AA (contrast, focus, ARIA)
- [ ] 71. Add-to-home-screen prompt

## P2 — Notifications
- [ ] 72. In-app notification center
- [ ] 73. Email on review response
- [ ] 74. Email when followed business gets reviews
- [ ] 75. Admin email alerts for scam reports
- [ ] 76. Daily admin summary email

## P3 — Monetization (Trustpilot model)
- [ ] 77. Free vs Pro tier for claimed businesses
- [ ] 78. Business analytics dashboard (views, sentiment)
- [ ] 79. Embeddable "Review us" invitation widget
- [ ] 80. Sponsored/featured placement in search
- [ ] 81. Embeddable trust badge for business sites
- [ ] 82. Reviews API for businesses
- [ ] 83. Order/receipt verification flow
- [ ] 84. Delivery platform affiliate links

## P3 — Platform & ops
- [ ] 85. Public REST API with docs
- [ ] 86. Webhooks for integrations
- [ ] 87. CSV export for admins
- [ ] 88. Automated daily backups (SQLite + config)
- [ ] 89. Uptime monitoring + alerts
- [ ] 90. Error tracking (Sentry-style)
- [ ] 91. Security headers: CSP, HSTS
- [ ] 92. Abuse/rate-limit monitoring view
- [ ] 93. Automated route smoke tests
- [ ] 94. CI syntax/lint gate before deploy
- [ ] 95. Staging environment with separate DB
- [ ] 96. Custom domain + sender domain (legitrank)
- [ ] 97. Restore Chichewa toggle when content is translated
- [ ] 98. Data retention & deletion policy tooling
- [ ] 99. Ambassador program (campus ambassadors)
- [ ] 100. Contributor guide + open issues list
