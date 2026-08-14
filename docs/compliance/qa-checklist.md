# DPDP / Annex F — QA checklist for counsel

Manual checks before claiming packet-aligned:

1. Hire list + applicant detail: **no email, phone, PAN, Aadhaar, DOB, address** — only allowlisted resume fields + `assurance` (AL + per-attribute status). Nested education/work are field-allowlisted.
2. DigiLocker **start and callback** require active identity+contact consent (current notice version). Withdraw mid-OAuth blocks the write.
3. Consent panel: purpose toggles, **Read aloud**, **I agree**, **Not now**, **Withdraw**, **Ask me a question → OWRC 1800 11 3090**.
4. Granting consent appends `ConsentEvents`; withdraw appends new row (history intact). Method is `voice_tap` after Read aloud. Settings → Withdraw consent also appends withdrawn.
5. After withdraw, hire APIs return withheld assurance (AL0) — raw KYC stays fiduciary-side only.
6. `/privacy` and `/grievance` public; GO fields driven by `DPDP_GRIEVANCE_OFFICER_*` env.
7. Analytics off by default; cookie banner; signed-in banner/rail sync `users.cookiesEnabled`.
8. Settings → Access request downloads JSON export; `/admin/rights` queue works (admin notes not returned to workers).
9. `/admin/breaches` can open incident + mark Board/principal notified (copy preview).
10. Account delete removes apps/interviews/blobs/inquiries/consent/rights.
11. DOB under 16 rejected on profile save; DigiLocker under-16 blocked.
12. DigiLocker stores `kyc.attributes` eight-attribute map (education/pcc/passport remain `not_started` until pipelines ship).
13. `ENABLE_PLACEMENT_AUDIT=1` records job publish events; `jobs.raRcNumber` field ready for RA binding.

Not legal advice — counsel must clear notices, name the Grievance Officer, and Emigration Model 2 before live placements.
