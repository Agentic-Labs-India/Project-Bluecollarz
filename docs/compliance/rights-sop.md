# Data Principal Rights — Procedure (SOP)

Internal SOP aligned to counsel packet Artifact 3.

## Rights we honour

| Right | Worker ask | Our action |
| --- | --- | --- |
| Access | Summary of data + who shared with | JSON export from Settings / rights API |
| Correction | Fix wrong / complete missing | Worker updates `/candidate/profile`; request is logged; re-verify if needed |
| Erasure | Delete data | **Do not auto-delete from the queue.** Verify identity, then the worker completes erasure via Delete account (cascade: apps, interviews, blobs, inquiries, consent, rights) |
| Withdraw consent | Stop consent-based processing | Append `withdrawn` ConsentEvent; DigiLocker gated |
| Nominate | Name someone to act | Rights request with nominee fields |
| Grievance | Complaint | Route to Grievance Officer (`/grievance`) |

## Workflow

1. **RECEIVE** — app Settings → Data rights, or email `support@blucollarz.com`
2. **ACKNOWLEDGE** — admin Rights queue → Acknowledge (target: 72 hours, provisional)
3. **VERIFY IDENTITY** — confirm requester is the Data Principal (or nominee)
4. **ACTION** — carry out; record notes; for hire-shared conclusions use resolve-on-read
5. **RESPOND** — plain language within 30 days (provisional until DPDP Rules notify)
6. **ESCALATE** — legal retention exceptions explained; Board path on `/grievance`

## Timelines (provisional env)

- `DPDP_RIGHTS_ACK_HOURS` (default 72)
- `DPDP_RIGHTS_RESOLVE_DAYS` (default 30)

## Product surfaces

- Candidate: `/candidate/settings` → Data rights; correction via `/candidate/profile`; erasure via Delete account (`#delete-account`) after the request is logged
- Admin: `/admin/compliance` (Rights tab — queue only; resolving an erasure request does not delete the account)
- APIs: `/api/candidate/rights`, `/api/admin/rights`
