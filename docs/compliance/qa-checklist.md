# DPDP / Annex F — QA checklist for counsel

Manual checks before claiming packet-aligned:

1. Hire list + applicant detail: **no email, phone, PAN, Aadhaar, DOB, address, or KYC badges** — only allowlisted resume fields. Nested education/work are field-allowlisted. Application status is Submitted / Selected / Rejected.
2. DigiLocker **start and callback** require every purpose toggle granted (current notice version). Withdraw mid-OAuth blocks the write.
3. KYC consent card: animated dither **band** (not full-card fill), **Before you continue (notice v1.1)** with speaker (replay) / mute icon, notice **auto-plays on load** (no Read aloud button). Purpose switches **start off**. **Agree and Verify** is disabled until every switch is on, then grants and starts DigiLocker. Compact/settings: **Read aloud**, **I agree**, **Withdraw**, **Ask me a question → OWRC 1800 11 3090**.
4. Granting consent appends `ConsentEvents`; withdraw appends new row (history intact). Grant method must be `voice_tap` (server rejects other methods). Settings → Withdraw consent also appends withdrawn.
5. After withdraw, hire APIs still never return raw KYC. Interview scores, transcripts, recordings, and custom answers are withheld without **evaluation** consent (`interviewRelease`).
6. `/privacy` and `/grievance` public; GO fields driven by `DPDP_GRIEVANCE_OFFICER_*` env. Page stays interim until name, phone, and postal address are set.
7. Analytics off by default; cookie banner; signed-in banner/rail sync `users.cookiesEnabled`.
8. Settings → Access request downloads JSON export; `/admin/compliance` Rights queue works (admin notes not returned to workers). Correction points to `/candidate/profile`. Erasure is **not** auto-delete: log the request, then Delete account (`#delete-account`) after identity checks.
9. `/admin/compliance?tab=breaches` can open incident + mark Board/principal notified (copy preview).
10. Account delete removes apps/interviews/blobs/inquiries/consent/rights.
11. Google signup cannot supply DOB. Onboarding collects **currently working as, years of experience, education, work experience, and languages** (resume PDF optional). After onboarding, DigiLocker KYC is required and writes identity (name, DOB, phone, location, gender, PAN, Aadhaar). Under-18 from DigiLocker is rejected. If a leftover profile DOB/phone/PAN/Aadhaar/gender already exists, it must **match** — mismatch fails, no overwrite. Google display name is not matched (Aadhaar name is source of truth).
12. DigiLocker identity pack is name, DOB, phone, location, PAN, Aadhaar last 4, gender. Email stays from Google. Job applications show **Submitted / Selected / Rejected** only — no KYC badges or per-job KYC CTAs.
13. Job-publish audit (`job_published_after_admin_verify`) **always** records. Other Model 2 kinds still need `ENABLE_PLACEMENT_AUDIT=1`. `jobs.raRcNumber` is writable on the hire job form and admin approve sheet.

Not legal advice — counsel must clear notices, name the Grievance Officer, and Emigration Model 2 before live placements.
