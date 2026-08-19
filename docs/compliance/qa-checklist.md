# DPDP / Annex F — QA checklist

Manual checks before claiming packet-aligned:

1. Hire list + applicant detail: **no email, phone, PAN, Aadhaar, DOB, address, or KYC badges** — only allowlisted resume fields. Nested education/work are field-allowlisted. Application status is Submitted / Selected / Rejected.
2. DigiLocker **start and callback** require identity, contact, evaluation, and medical consent (current notice version). Withdraw mid-OAuth blocks the write.
3. KYC consent card: animated dither **band** (not full-card fill), **Before you continue (notice v1.4)** with speaker (replay) / mute icon, notice **auto-plays on load** (no Read aloud button). Purpose switches **start off**. **Agree and Verify** is disabled until every switch is on, then grants and starts DigiLocker. Compact/settings: **Read aloud**, **I agree**, **Withdraw**, **Ask me a question → OWRC 1800 11 3090**. No second consent dialog on interview or medical.
4. Granting consent appends `ConsentEvents`; withdraw appends new row (history intact). Grant method must be `voice_tap` (server rejects other methods). Settings → Withdraw consent also appends withdrawn.
5. After withdraw, hire APIs still never return raw KYC. Interview scores, transcripts, recordings, and custom answers are withheld without **evaluation** consent (`interviewRelease`).
6. `/privacy`, `/terms`, and `/grievance` public. Grievance desk email is published (`support@blucollarz.com`); named officer / phone / street come from Admin → Settings when appointed.
7. Cookie banner is Grok-style **Accept All Cookies** / **Reject All** /
   **Cookies Settings**, with 18+ in the copy. Reject All blocks Log in / Get
   Started and re-opens the same banner if they try again. Accept All turns
   analytics on. Cookies Settings can leave analytics off. Browser analytics
   choice syncs to `users.cookiesEnabled` on login; rail must not overwrite a
   prior Allow.
8. Settings → Access request downloads JSON export; `/admin/compliance` Rights queue works (admin notes not returned to workers). Correction points to `/candidate/profile`. Erasure is **not** auto-delete: log the request, then Delete account (`#delete-account`) after identity checks. Grievance SLA: 90 days.
9. `/admin/compliance?tab=breaches` can open incident + mark Board/principal notified (copy preview includes Rule 7 fields). Board detailed report target: 72 hours.
10. Account delete removes apps/interviews/blobs/inquiries/consent/rights and that user's legal-safety rows. Legal hold blocks delete.
11. Google signup cannot supply DOB. Onboarding collects **currently working as, years of experience, education, work experience, and languages** (resume PDF optional). After onboarding, DigiLocker KYC is required and writes identity (name, DOB, phone, location, gender, PAN, Aadhaar). Under-18 from DigiLocker is rejected. If a leftover profile DOB/phone/PAN/Aadhaar/gender already exists, it must **match** — mismatch fails, no overwrite. Google display name is not matched (Aadhaar name is source of truth).
12. DigiLocker identity pack is name, DOB, phone, location, PAN, Aadhaar last 4, gender. Email stays from Google. Job applications show **Submitted / Selected / Rejected** only — no KYC badges or per-job KYC CTAs.
13. `jobs.raRcNumber` is writable on the hire job form and admin approve sheet.
14. Platform Privacy & Terms gate persists on the user (`platformTermsVersion` / `platformTermsAcceptedAt`), not only localStorage.

Not legal advice — appoint a named Grievance Officer in Admin → Settings when you have one. Counsel should still review notices before live regulated placements.
