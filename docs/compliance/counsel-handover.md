# Blucollarz — counsel handover

**For:** the lawyer (or firm) who must understand this product well enough to defend the company.

**As of:** 18 August 2026. This is what the **live software does today**, not a wish list.

**This is not a legal opinion. It is not DPDP certification. It is not your approval of any notice. It is not a filing with the Data Protection Board.** Engineering wrote it so you have the facts in one place. If we over-claim, those over-claims will be used against us.

---

## 1. The company and the product

**Blucollarz Technologies Private Limited** runs a hiring platform called Blucollarz. For personal data on this platform, Blucollarz is the **Data Fiduciary**. Office: Hyderabad, Telangana. Public grievance email: **support@blucollarz.com**. Named officer, phone, and postal address appear on the public Grievance page only after they are entered in Admin → Settings. OWRC helpline shown to workers: **1800 11 3090**.

The product is for **skilled blue-collar workers** (welders, electricians, drivers, facilities, similar trades) and for **companies that hire them**, including for work abroad (Gulf, Singapore, Korea, UK, USA, and other corridors depending on open roles).

Three kinds of account:

- **Candidate (work)** — any Google sign-in. This is the default. There is no email/password signup.
- **Recruiter (hire)** — invited by an admin only. No public recruiter signup.
- **Admin** — invited only.

---

## 2. What the software is

A worker can: agree to the first banner, sign in with Google, accept platform terms, complete a **voice** onboarding (optional resume PDF, parsed in memory and **not stored**), grant purpose consent, verify identity with **DigiLocker** (Aadhaar + PAN), sit AI interviews if a job requires them, apply, and — **only after an employer selects them** — book a medical fitness test.

A recruiter can: complete company onboarding, post a job (an admin must publish it), review applicants as a **scrubbed profile plus interview scores**, and mark Submitted / Selected / Rejected. Recruiters never see email, phone, PAN, Aadhaar, date of birth, address, raw DigiLocker files, or medical report files.

An admin can: provision hire/admin users, approve or decline jobs, run the medical queue (schedule, no-show, unfit, upload reports), work a rights queue, keep a breach **register**, send email, handle support tickets, publish blog posts, and set grievance-officer fields, AI prompts, and voice settings.

Auth is Google via Better Auth. AI text goes through Vercel AI Gateway. Voice is Sarvam (speech-to-text and text-to-speech) when configured. Database is MongoDB. Files (interview recordings, medical reports, company documents) are **private** objects: no public link; every download is re-checked for entitlement.

---

## 3. What the software is not

Say this out loud to sales, marketing, and anyone who talks to workers or the press.

| If someone says | The fact |
| --- | --- |
| We are eMigrate / we file PoE clearance | **False.** No eMigrate connection. No clearance, no PBBY, no Indian Mission accreditation of a foreign employer. |
| We are a PGE Recruiting Agent | **False.** This product does not hold a Recruiting Agent Registration Certificate. We do not register anyone as an RA. |
| ECNR / Non-ECR means the worker needs no agent | **Forbidden** for the AI to say. ECNR is only the absence of an ECR endorsement. It is not a licence to skip an RA. |
| Workers pay us | **False.** Workers pay ₹0. Employers pay. If a human or the AI tells a worker to pay Blucollarz, that is an incident. |
| We are DPDP certified / the Board assessed us | **False.** Controls exist. The Rules’ remaining substantive duties are scheduled **13 May 2027**. |
| We onboard children with parental consent | **False.** This product refuses under-18. There is no parent flow. |
| We collect passport, PCC, emigration files | **False.** Identity is DigiLocker Aadhaar + PAN. |
| AI verifies identity from photos of IDs | **False.** Identity is DigiLocker. |
| We guarantee a job, visa, or salary | **Forbidden** for the AI to say. |

**The line you can stand behind today:** this is a hiring and verification platform. Emigration clearance, if required, is done by a **licensed Recruiting Agent** on the government eMigrate system, **outside this app**. Blucollarz does not impersonate that agent.

**The question only you can answer:** for a live overseas placement, is Blucollarz’s own activity “platform / KYC” or “recruitment” under the Emigration Act, 1983, section 10? The software does **not** decide that. A job can go live **without** an RA registration number. The number field is optional typed text. It is **not** checked against the PGE list. A typo or a fake RC still saves.

---

## 4. The concept (how the three parties are supposed to sit)

```
Worker   →  identity verified + interviews + (if selected) fitness report
Company  →  scrubbed profile + scores; never raw KYC or medical files
RA       →  files eMigrate / PoE outside this app, if a role is bound to them
```

Intended commercial picture: a PGE-registered Recruiting Agent works **with** the platform. A job **may** store an RA registration number. Publishing does **not** require that number today.

---

## 5. How a candidate actually moves through the product

### 5.1 Public site (no account)

Anyone can open the homepage, About, Mission, Vision, For recruiters, Contact, Privacy Notice, Terms, Grievance, Blog, and public job pages.

Hero **Get Started** and nav **Log in** both start Google. Applying from a public job still requires Google. There is no password signup.

### 5.2 First banner (every page, including after login if they never agreed on this browser)

Buttons: **Cookies Settings** (outline) / **Reject All** / **Accept All Cookies**. Dark floating bar, 18+ in the copy, X closes without agreeing.

Exact idea of the copy:

> You must be 18 or older. Essential cookies keep the site working and stay on. Optional analytics help with performance — accept, reject, or manage them. We do not use advertising cookies. By clicking Accept All Cookies, you confirm you are 18 or older and agree to our Cookie Policy, Privacy Notice, and Terms of Service.

| They click | What happens |
| --- | --- |
| Nothing / X | Banner hides on X. Login stays blocked until they accept. Google Analytics does not load. |
| Accept All Cookies | Stored **in this browser only**. Login can start. Analytics **on**. |
| Cookies Settings → Accept | Same 18+ / Terms / Privacy. Analytics only if they turn that switch on (starts off). |
| Reject All | Writes `declined`. Banner hides. Login stays blocked. If they were signed in, they are signed out. Clicking Log in again brings the **same** banner back. |

This click is **not** DigiLocker proof of age and **not** the purpose-consent sitting. A child can still click Accept. The recorded Terms on the **account** happen later (section 5.4).

The sidebar “open/closed” cookie is only UI. It is not analytics.

### 5.3 Google sign-in

New Google users are always **candidates**. Hire and admin cannot self-serve.

If a session already exists and they hit the homepage, they are sent to:

- candidate + onboarding incomplete → onboarding
- candidate + onboarded, KYC not done → KYC
- candidate + both done → candidate home
- hire incomplete → hire onboarding
- hire complete → hire roles

**Google can create a session before anyone knows date of birth.** Login is blocked until they accept on this browser. Under-18 is still refused at DigiLocker.

### 5.4 Privacy & terms modal (after Google, blocks the screen)

Saved on the **user account** (terms version 1 + timestamp). Never inferred from the browser Accept All / Settings Accept.

There is a required checkbox. The continue button stays dead until it is checked. **There is no Reject and no close.** They leave the site or they agree. Until this is saved they cannot use the voice onboarding agent.

**Candidate copy on this modal (English):**

- This is a computer helper, not a person. I cannot give legal advice.
- What you say here is saved in your Blucollarz account so we can help you find work. You can ask us to show or delete your information.
- Links: Privacy Notice, Terms, Grievance. DigiLocker will ask for extra permission later.
- Checkbox: “I have read this. I agree to the Privacy Notice and Terms.”
- Button: **Okay, start**

This is **platform terms**. It is **not** identity / medical / interview purpose consent.

The same ideas exist in Hindi for the computer-helper notice (section 11). Status of that wording: **draft, not counsel-approved.**

### 5.5 Voice onboarding

Must allow the microphone. There is **no** “type the whole profile instead” on this page. Later profile edits cannot mark onboarding complete; only the onboarding agent can.

The agent asks which language to use (English, Hindi, Bengali, Gujarati, Kannada, Malayalam, Marathi, Odia, Punjabi, Tamil, Telugu). That language is used for later voice. **The consent notice text itself is still English.**

Optional resume PDF: skills can come from it. The PDF is not kept.

**Collected here (required to finish):** currently working as, years of experience (including 0), education, work experience, spoken languages, and a short summary the system writes when the rest is done.

**Deliberately not collected here:** phone, date of birth, location, PAN, Aadhaar, gender. DigiLocker fills identity after this.

Every worker utterance is screened for serious-offence indicators. Every model reply is run through the output guard (section 11).

Settings remains reachable during onboarding (cookies, rights, withdraw) without unlocking Explore.

### 5.6 KYC: notice, four switches, then DigiLocker

Onboarding must be finished first.

If not yet verified, the page is only the consent card. The official **notice version 1.4** is shown and **auto-played**. This is the **one sitting** for every purpose this product uses.

**Exact English notice (spoken and on screen):**

> We verify you through DigiLocker. Employers see results, not your documents. Interviews may be recorded for a role you pursue. If an employer selects you, we book a fitness test and store the report. You pay nothing. You can view, fix, delete, or withdraw anytime. We never sell your data. You choose which of these you agree to.

Passport, police clearance, and emigration clearance are **not** in this notice and **not** collected.

The server issues a **one-time playback ticket** (15 minutes). Agree is rejected without a valid unused ticket for this user and this notice version. A homemade “I tapped” flag from the phone is not enough. Grants are written as **new rows** (append-only). History is not overwritten. The grant method for this path must be **voice tap**; the server rejects other methods.

Four switches, **all start off**. **Agree and Verify** stays disabled until **every** switch is on.

| Purpose | Label the worker sees | What it turns on |
| --- | --- | --- |
| Identity | PAN, Aadhaar, Name — to confirm your identity | DigiLocker identity pack |
| Contact | Email & mobile — to contact you and secure your account | Account + match DigiLocker phone |
| Evaluation | AI interviews, transcripts, and optional recording — to evaluate you for a role | Interviews; hire sees files **only while this stays on** |
| Medical | Medical fitness test and its report — booked only after an employer selects you | Booking and storing the report **after select**; hire **never** gets the file |

Also on the card: **Ask me a question → OWRC 1800 11 3090**. That is a phone link, not a consent.

Then the browser goes to DigiLocker (MeriPehchaan, Aadhaar + PAN). Start and callback **both** re-check that onboarding is done and all four purposes are still granted. If they withdraw mid-OAuth, the identity pack is **not** written.

**DigiLocker success stores:** verified flag, name, date of birth, phone, location, gender, PAN, Aadhaar last four. **Not stored:** raw DigiLocker XML/JSON.

If the profile already had phone, DOB, PAN, Aadhaar last four, or gender, the DigiLocker values **must match**. Mismatch → stay unverified, no overwrite. Google’s display name is **not** matched. Aadhaar name is the source of truth. Email stays from Google.

**Age:** if DigiLocker date of birth is under 18, verification fails with: you must be at least 18 years old to complete DigiLocker verification on Blucollarz.

Then the verified card: Continue to candidate home. The app (Explore, apply, interviews, medical APIs) stays locked until onboarding is complete **and** KYC is verified.

There is **no second consent dialog** on interview start or medical booking. If they later withdraw evaluation or medical in Settings, those features fail until they turn the same switches back on (same notice).

### 5.7 Interviews (Explore)

A job may require: communication interview, domain interview, custom questions. Apply is refused until required stages are done.

Start needs KYC done **and** live evaluation consent. If they withdrew evaluation, they restore it in Settings.

Mobile: told to use a laptop. Desktop: checks internet, camera, microphone; copy requires quiet room, face on camera, **entire-screen share**, no other person, no notes. Optional recording is a **private** file.

If they withdraw evaluation after recording: the hirer sees withheld, not the files.

### 5.8 Apply

Creates one application (idempotent). Statuses shown to everyone: **Submitted / Selected / Rejected**. No KYC badges on applications. No per-job KYC button.

### 5.9 Medical (only after Selected)

If they have no selected role: they cannot schedule. If they withdrew medical: the page tells them to turn it back on in Settings. **No extra medical notice.**

Then centre / date / slot. Consent is checked again at booking **and** at report upload. Statuses: scheduled, completed, cancelled, no-show, unfit. Reports: private files. **Admin medical desk can read them. The employer cannot.** Withdraw medical → any scheduled appointment is cancelled.

Centres have a licence number, address, hours.

### 5.10 Settings (available even before KYC)

Appearance, language, the same consent notice (compact: read aloud, I agree, Withdraw), data rights, delete account.

Cookie and notification toggles also sit in the account menu. Analytics stay **off** unless they clicked Accept All Cookies or allowed analytics in Cookies Settings / account Settings.

Delete account is refused if a **legal hold** is on (serious-offence review still open).

---

## 6. Consent — four layers. Do not mix them in a pleading.

If a dispute asks “did they consent?”, name the layer.

**Layer A — browser accept (before login).** Terms + Privacy + “I am 18+” + essential cookies. Lives in **this browser**. Accept All Cookies also turns analytics on; Cookies Settings can leave analytics off. A minor can click it. Not DigiLocker age. Not purpose consent.

**Layer B — platform terms on the account (after Google).** Checkbox, saved on the user. No Reject. Needed for the voice agent. Still not purpose consent.

**Layer C — purpose consent (the DPDP sitting).** Notice 1.4, four switches, playback ticket, append-only ledger. This is the sitting that unlocks DigiLocker. Withdraw in Settings appends a **new** withdrawn row; old grants stay in history.

**Layer D — safety overlay.** If a review case is open, they may see the serious-safety wording (section 11). The product treats that as **not consent**. A delivery record is proof they were shown a warning, never that they agreed to reporting.

---

## 7. What personal data we process (RoPA in plain language)

| Activity | Data | Purpose | Shared with | Kept |
| --- | --- | --- | --- | --- |
| Account | Google name, email | Sign in | — | Account life |
| Onboarding | Headline, experience, education, work, languages, optional skills from PDF | Build a hire-safe profile | Employer sees allowlisted fields only | Account life |
| Identity | PAN, Aadhaar last 4, name, DOB, gender, location/phone from DigiLocker | Verify identity; confirm 18+ | Employers see **conclusions / scrubbed fields**, not documents. An RA bound to a job may get hire-safe data for that placement | Account / law |
| Consent ledger | Grants and withdrawals, notice version, time, method | Prove what was granted | — | Until erasure policy / delete |
| Interviews | Transcript, scores, answers, optional recording | Evaluate for a role | Hirer **only while evaluation consent is live** | Until delete / policy |
| Medical | Centre, time, fitness report files | Pre-placement fitness | **Admin medical desk only. Never the employer.** | Until delete / policy |
| Job / RA bind | Job id, optional RA registration number | Optional bind to a licensed RA | That RA when bound | Per policy |
| Legal holds / cases | Principal id, indicators, excerpts of what they typed, reviewer identity | Preserve material under review | Internal review only; **no tip-off to the accused** | Until a named human releases |
| Support / Help | Ticket and chat content, email | Support | Support staff | Ticket life + policy |
| Analytics | Page usage | Improve product | Google, **only if they Allow in Settings** | Per Google / withdraw |
| Rights requests | Type, details, nominee | Honour DPDP rights | Admin (internal notes **not** sent back to the worker) | Per policy / until erase |
| Security logs | Device, IP, browser | Operate and debug | — | One year |

**Processors under contract (from the public Privacy Notice):** MongoDB, Vercel (hosting and private files), AI providers through Vercel AI Gateway, Sarvam (voice), Resend (email), Google (OAuth; Analytics only if allowed).

**Transfers:** processors may store or process outside India under contract.

Public Privacy Notice (version 1.4, August 18 2026) also states: we do not charge workers; we do not sell data; we do not give employers raw DigiLocker / PAN / Aadhaar / passport numbers; we do not track children.

---

## 8. DPDP — statute vs product vs what you must not say

**Law we are building toward:** Digital Personal Data Protection Act, 2023, and DPDP Rules, 2025 (G.S.R. 846(E), notified 13 November 2025). The Board exists now. Consent Managers (Rule 4) from **13 November 2026**. Remaining substantive duties (Rules 3, 5–16, 22–23) from **13 May 2027**. Building now is **preparation**, not a Board assessment.

**What the Act/Rules (plain reading) want:** a standalone notice in clear language; itemised data; specific purpose and what the service is; withdraw as easy as grant; rights; complain to the Board; notice in English **or** an Eighth Schedule language; ability to **prove** notice and consent if challenged (s.6(10)); no children’s data without verifiable parental consent, or do not process children; breach duties; security.

**What the product actually has:**

- Public Privacy Notice v1.4, Terms, Grievance — all public. Notice is **English**. Hindi and other Eighth Schedule languages: “available on request via the grievance desk,” **not** shipped as the in-app notice text.
- Layer C purpose consent, withdraw in Settings (easier than grant), append-only ledger.
- Rights: access (JSON download of profile, KYC public state, consent events, rights history, applications, interview metadata, medical appointment metadata — **not** the report files themselves), correction (they edit profile; request is logged), erasure (request is **logged**; wipe happens only when they Delete account after identity check — admin “resolve” does **not** delete the account), nominate, grievance.
- Timelines in the product: acknowledge **72 hours**, resolve grievances within a reasonable period **not exceeding 90 days**.
- 18+ product. DigiLocker DOB is the verifiable check. Banner 18+ is self-attest.
- Employers get a minimised profile (section 5.8).
- Private files; each download re-authorised.
- Breach **register** in admin: title, summary, status (detected / investigating / notified / closed), ticks for “Board notified” / “principals notified,” a **draft** letter preview (nature, likely consequences, measures, what the person can do, grievance contact, Board, OWRC). **The software does not send that letter to the Board.**
- Legal hold blocks account deletion while a serious-offence hold is live.
- Analytics off until Settings Allow. Ads-related storage stays denied.

**Rights operations (internal SOP as implemented):**

1. Receive — Settings → Data rights, or email support@blucollarz.com  
2. Acknowledge — admin Rights queue (target 72 hours)  
3. Verify — signed-in email, or request ID + that email  
4. Act — notes stay internal  
5. Respond — plain language, ≤ 90 days, include grievance contact  
6. Escalate — retention exceptions explained; Board path on the Grievance page  

**Account delete removes:** applications, interviews, recordings, medical appointments and reports, support tickets, inquiries, consent events, rights requests, safety notices, holds, and closed cases for that person. **Breach incidents stay**; that person’s id is removed from the affected list. A live legal hold blocks delete. There is **no** automated “48 hours before we erase” countdown (Rule 8).

**Do not tell a court, the Board, a journalist, or a worker:**

- that playback proves they **listened to the end** (it proves this device requested **our** official sentence);
- that the short spoken notice is a full **itemised Rule 3** notice (the long form is the public Privacy Notice);
- that the in-app notice exists in every Eighth Schedule language;
- that we operate a Consent Manager;
- that the breach screen **files** with the Board;
- that we are “DPDP certified.”

---

## 9. eMigrate and the Emigration Act

**eMigrate** is the Ministry of External Affairs computerised system for emigration clearance. It connects Protectors of Emigrants, the Protector General of Emigrants, Indian Missions, Foreign Employers, Recruiting Agents, Passport Sewa, Bureau of Immigration, and insurance. ECR passport holders going to the currently notified **17** ECR countries **for employment** need PoE clearance through that system. Airport immigration checks it.

**ECNR** is not a stamp. Passports without an ECR endorsement are ECNR. That does **not** mean “no Recruiting Agent.”

**Emigration Act, 1983, section 10:** a person who wishes to recruit Indian citizens for employment abroad must register with the PGE and hold an RC.

**This product does not:** be eMigrate; call eMigrate; register anyone as an RA; accredit a Foreign Employer with a Mission; file emigration clearance or PBBY.

**This product does:** optional RA registration number on a job; DigiLocker KYC; a pre-employment medical **desk** (not eMigrate medical); block the AI from saying we are an RA, from charging workers, and from “ECNR = no agent.”

**Litigation if we drift:** recruiting Indian workers for overseas jobs without an RC; marketing “eMigrate compliant”; the AI telling a worker they do not need an agent.

---

## 10. Recruiter side (short)

Hire accounts are provisioned. Company onboarding is a **separate** company-KYC flow (not DigiLocker). Jobs go to an admin verification queue. Admin approve makes the job live and emails the recruiter; admin can type or keep an RA registration number. Admin decline sends the job back to draft with a reason.

Recruiters see allowlisted education/work fields, interview scores and (if evaluation consent is live) transcripts/recordings, and application status only. They never see medical reports.

---

## 11. AI legal safety (lawsuit surface)

**Rule:** the machine reports observations. Humans make determinations.

Prompts can be edited by admins. **Enforcement is a runtime guard** on Help, onboarding, and interview streams: text is released a clause at a time so a ban is caught **before** the worker sees it. English and Hindi.

**The model must never say:**

| Ban | Meaning |
| --- | --- |
| Trafficking verdict | Must not say trafficking occurred or that a person is a trafficker. Permitted: facts mapped to indicators, sent to a human. |
| BNS s.111 | Must not say conduct is organised crime under that section. That section is not in the detector at all. |
| Offer-letter verdict | Must not say an offer is genuine, verified, safe, approved. Permitted labels only: no flags found / needs review / high risk. |
| Our own legal status | Must not classify Blucollarz as (not) an RA, or whether someone needs RA registration. |
| Absolute secrecy | Must not promise “we will never report this” or unconditional confidentiality. |
| Worker fees | Must not say the worker should pay Blucollarz. Workers pay ₹0. |
| ECNR = no agent | Must not say a Non-ECR / ECNR worker does not need a registered recruiting agent. |
| Guarantees | Must not guarantee employment, visa, salary, or placement. |

**If the worker’s own words match indicators** (examples the detector looks for: agent took my passport; I paid the agent a fee; work until the debt is paid; not allowed to leave; contract different from what was promised; not paid; they took my phone; I am 16; fake passport), the machine may **open a case** at “legal review required” and immediately place a **legal hold** so Delete account cannot destroy the material before a human looks.

The machine **cannot** close the case and **cannot** mark “mandatory report triggered.” Only a **named logged-in human**, with a written reason, can. The actor cannot be “system.”

Marking mandatory report **does not file** with police or any Board. Dual filing is **not** automated. There is **no** notification to the accused.

**Computer-helper notice (draft, not counsel-approved) — English:**

> This is a computer helper, not a person.  
> What you say here is saved in your Blucollarz account so we can help you find work.  
> You can ask us to show or delete your information.  
> I cannot give legal advice.

**Hindi:**

> यह एक कंप्यूटर सहायक है, इंसान नहीं।  
> आप यहाँ जो बताएँगे, वह आपके Blucollarz खाते में सेव होगा, ताकि हम काम ढूँढ़ने में मदद कर सकें।  
> आप अपनी जानकारी देखने या मिटवाने के लिए कह सकते हैं।  
> मैं कानूनी सलाह नहीं दे सकता।

**Serious-safety notice (draft, not counsel-approved) — English:**

> What you told us is serious. A person from our team will look at it.  
> If the law says we must tell the police or government, we will have to. I cannot promise to keep it private.  
> This is not your fault. You are not in trouble. You can stop now, and you can still ask for help.

**Hindi:**

> आपने जो बताया है वह गंभीर है। हमारी टीम का एक इंसान इसे देखेगा।  
> अगर कानून कहे कि पुलिस या सरकार को बताना है, तो हमें बताना पड़ेगा। मैं इसे गुप्त रखने का वादा नहीं कर सकता।  
> आपकी कोई गलती नहीं है। आप मुश्किल में नहीं हैं। आप अभी रुक सकते हैं, और फिर भी मदद माँग सकते हैं।

Only English and Hindi exist. Any other language: the product **does not** show English and pretend they were warned. It fails closed (“someone will call you”) so we do not manufacture a false warning record. If harm is imminent, the overlay can be skipped; that is recorded as deferred with an empty body, not as a successful warning.

A teach-back field may store what they typed. It is **not scored** and is **not** a consent to report.

---

## 12. Gaps that will be used against us if we over-claim

1. Account-level Terms are still **after** Google. Browser accept is only this device.
2. Playback is not proof they listened to the end.
3. Purpose notice text is English; other voices may speak that English text.
4. Short spoken notice is not the full itemised Privacy Notice.
5. Platform terms modal has no Reject — only leave the site.
6. No Consent Manager.
7. Banner 18+ is self-attest; real age check is DigiLocker. A session can exist before DOB.
8. Serious-safety wording is draft. “Mandatory report” does not file anything.
9. Jobs can publish without a real PGE RC.
10. No automated 48-hour pre-erasure countdown.
11. Access export is JSON, not every private file byte.
12. Breach screen does not send the Board notice.
13. Detector is pattern-matching, not a lawyer. False positives and misses both exist.

---

## 13. What we need from you

Engineering will not treat these as settled law until you say so.

1. Characterise Blucollarz under the **Emigration Act** for live overseas roles. Decide whether every overseas job **must** carry a validated RC.
2. Approve or rewrite: Privacy Notice, Terms, the KYC spoken notice, both safety notices, and the Eighth Schedule language plan.
3. Decide whether playback + switches is enough for **s.6(10)** proof.
4. Write the **serious-offence SOP**: who files, where, dual filing, when the worker warning is enough.
5. Write the **breach SOP**: 72-hour Board notice and principal notice. The UI only drafts.
6. Appoint a **named Grievance Officer** (name, phone, postal) in Admin → Settings.
7. Set retention vs Delete account (including whether the consent ledger may be wiped).
8. Issue a **forbidden claims list** for marketing: no “eMigrate compliant,” no “DPDP certified,” no “we are / are not an RA” as a casual slogan, no job guarantees.

Until you sign those, the only honest external line is:

**Blucollarz is a hiring platform with DigiLocker identity checks and DPDP-oriented consent. It is not a Recruiting Agent. It is not eMigrate. It is not certified. Workers pay nothing. Clearance, if required, stays with a licensed RA.**
