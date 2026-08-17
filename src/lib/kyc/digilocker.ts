import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

/* ── types ── */

interface DigilockerIssuedDoc {
  doctype: string;
  name: string;
  issuer: string;
  uri: string;
  date: string;
}

/** In-memory DigiLocker gather result — written to Mongo, never cookied. */
export interface DigilockerKycPayload {
  name: string | null;
  dob: string | null;
  gender: string | null;
  /** Masked only (XXXXXXXX + last 4). Full Aadhaar is never available. */
  uidMasked: string | null;
  address: string | null;
  pan: string | null;
  phone: string | null;
}

/** KYC page view — sourced from Users Mongo document. */
export interface DigilockerKycView {
  name: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  aadhaarLast4: string | null;
  pan: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  provider: string | null;
}

export interface DigilockerStatusResponse {
  status: "idle" | "verified" | "failed";
  isKycVerified: boolean;
  error: string | null;
  data: DigilockerKycView | null;
  verifiedAt: string | null;
}

/* ── OAuth cookies only (state / PKCE — not KYC data) ── */

export const DIGILOCKER_OAUTH_COOKIE = "dl_oauth";
export const OAUTH_MAX_AGE_SEC = 60 * 15;

interface OAuthCookie {
  state: string;
  codeVerifier: string;
  userId: string;
  returnTo: string;
  createdAt: number;
}

function cookieKey() {
  const secret =
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.DIGILOCKER_CLIENT_SECRET?.trim() ||
    "dev-only-digilocker-secret";
  return createHash("sha256")
    .update(`blucollarz-digilocker-v1:${secret}`)
    .digest();
}

function sealJson(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", cookieKey(), iv);
  const enc = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(value), "utf8")),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString("base64url");
}

function openJson<T>(sealed: string): T | null {
  try {
    const buf = Buffer.from(sealed, "base64url");
    if (buf.length < 28) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      cookieKey(),
      buf.subarray(0, 12),
    );
    decipher.setAuthTag(buf.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([
        decipher.update(buf.subarray(28)),
        decipher.final(),
      ]).toString("utf8"),
    ) as T;
  } catch {
    return null;
  }
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function createCodeVerifier() {
  return randomBytes(32).toString("base64url");
}
export function createCodeChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}
export function createOAuthState() {
  return randomBytes(24).toString("base64url");
}

export function sealOAuthCookie(v: OAuthCookie) {
  return sealJson(v);
}
export function openOAuthCookie(sealed?: string): OAuthCookie | null {
  if (!sealed) return null;
  const d = openJson<OAuthCookie>(sealed);
  if (!d?.state || !d.codeVerifier || !d.userId) return null;
  if (Date.now() - d.createdAt > OAUTH_MAX_AGE_SEC * 1000) return null;
  return d;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/* ── config + OAuth HTTP ── */
/* Env: only DIGILOCKER_CLIENT_ID + DIGILOCKER_CLIENT_SECRET. Rest is fixed. */

const DIGILOCKER_OAUTH_BASE =
  "https://digilocker.meripehchaan.gov.in/public/oauth2";

function cfg() {
  const clientId = process.env.DIGILOCKER_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.DIGILOCKER_CLIENT_SECRET?.trim() ?? "";
  if (!clientId || !clientSecret) {
    throw new Error(
      "DIGILOCKER_CLIENT_ID and DIGILOCKER_CLIENT_SECRET required",
    );
  }
  const base =
    process.env.BETTER_AUTH_URL?.trim().replace(/\/$/, "") ||
    "http://localhost:3000";
  return {
    clientId,
    clientSecret,
    authorizeUrl: `${DIGILOCKER_OAUTH_BASE}/2/authorize`,
    tokenUrl: `${DIGILOCKER_OAUTH_BASE}/2/token`,
    userUrl: `${DIGILOCKER_OAUTH_BASE}/1/user`,
    eaadhaarUrl: `${DIGILOCKER_OAUTH_BASE}/3/xml/eaadhaar`,
    issuedUrl: `${DIGILOCKER_OAUTH_BASE}/2/files/issued`,
    xmlUriBase: `${DIGILOCKER_OAUTH_BASE}/1/xml`,
    redirectUri: `${base}/api/auth/digilocker/callback`,
    scope: "files.issueddocs openid userdetails email address picture",
    acr: "aadhaar pan email mobile user_alias",
    amr: "all aadhaar pan",
    dlFlow: "signin",
    reqDoctype: "ADHAR PANCR",
  };
}

async function apiError(res: Response, fallback: string) {
  const text = await res.text().catch(() => "");
  try {
    const j = JSON.parse(text) as {
      error?: string;
      error_description?: string;
    };
    return j.error_description || j.error || fallback;
  } catch {
    return text ? text.slice(0, 200) : fallback;
  }
}

export function buildAuthorizeUrl(opts: {
  state: string;
  codeChallenge: string;
}) {
  const c = cfg();
  const p = new URLSearchParams({
    response_type: "code",
    client_id: c.clientId,
    redirect_uri: c.redirectUri,
    state: opts.state,
    scope: c.scope,
    code_challenge: opts.codeChallenge,
    code_challenge_method: "S256",
  });
  if (c.dlFlow) p.set("dl_flow", c.dlFlow);
  if (c.acr) p.set("acr", c.acr);
  if (c.amr) p.set("amr", c.amr);
  if (c.reqDoctype) p.set("req_doctype", c.reqDoctype);
  return `${c.authorizeUrl}?${p}`;
}

export async function exchangeAuthorizationCode(opts: {
  code: string;
  codeVerifier: string;
}) {
  const c = cfg();
  const res = await fetch(c.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: opts.code,
      client_id: c.clientId,
      client_secret: c.clientSecret,
      redirect_uri: c.redirectUri,
      code_verifier: opts.codeVerifier,
    }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    id_token?: string;
    eaadhaar?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(
      json.error_description ||
        json.error ||
        `Token exchange failed (${res.status})`,
    );
  }
  return {
    access_token: json.access_token,
    id_token: json.id_token,
    eaadhaar: json.eaadhaar,
  };
}

/* ── parse helpers ── */

function attr(xml: string, tag: string, name: string) {
  return (
    xml
      .match(
        new RegExp(
          `<(?:[\\w.-]+:)?${tag}\\b[^>]*\\b${name}\\s*=\\s*"([^"]*)"`,
          "i",
        ),
      )?.[1]
      ?.trim() || null
  );
}
function anyAttr(xml: string, name: string) {
  return (
    xml.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"))?.[1]?.trim() ||
    null
  );
}
function maskUid(uid: string | null) {
  if (!uid) return null;
  const digits = uid.replace(/\D/g, "");
  return digits.length >= 4 ? `XXXXXXXX${digits.slice(-4)}` : null;
}
function joinAddr(parts: Array<string | null | undefined>) {
  const s = parts
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(", ");
  return s || null;
}

function decodeIdToken(idToken?: string) {
  if (!idToken) return null;
  try {
    return JSON.parse(
      Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"),
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function claim(claims: Record<string, unknown> | null, keys: string[]) {
  if (!claims) return null;
  for (const k of keys) {
    const v = str(claims[k]);
    if (v) return v;
  }
  return null;
}

function addressFromClaims(claims: Record<string, unknown> | null) {
  if (!claims) return null;
  if (typeof claims.address === "string") return str(claims.address);
  if (claims.address && typeof claims.address === "object") {
    const a = claims.address as Record<string, unknown>;
    return (
      str(a.formatted) ||
      joinAddr([
        str(a.street_address),
        str(a.locality),
        str(a.region),
        str(a.postal_code),
        str(a.country),
        str(a.district),
        str(a.state),
        str(a.pin) || str(a.pincode),
      ])
    );
  }
  return joinAddr([
    str(claims.street_address),
    str(claims.locality),
    str(claims.district),
    str(claims.region) || str(claims.state),
    str(claims.postal_code) || str(claims.pincode),
    str(claims.country),
  ]);
}

function parseAadhaarXml(xml: string) {
  const uid =
    attr(xml, "UidData", "uid") ||
    attr(xml, "Certificate", "uid") ||
    anyAttr(xml, "uid");
  return {
    name: attr(xml, "Poi", "name") || attr(xml, "Person", "name"),
    dob: attr(xml, "Poi", "dob") || attr(xml, "Person", "dob"),
    gender: attr(xml, "Poi", "gender") || attr(xml, "Person", "gender"),
    uidMasked: maskUid(uid),
    address: joinAddr([
      attr(xml, "Poa", "co") ||
        attr(xml, "Poa", "careof") ||
        anyAttr(xml, "co"),
      attr(xml, "Poa", "house") || anyAttr(xml, "house"),
      attr(xml, "Poa", "street") || anyAttr(xml, "street"),
      attr(xml, "Poa", "lm") || anyAttr(xml, "lm"),
      attr(xml, "Poa", "loc") || anyAttr(xml, "loc"),
      attr(xml, "Poa", "vtc") || anyAttr(xml, "vtc"),
      attr(xml, "Poa", "dist") || anyAttr(xml, "dist"),
      attr(xml, "Poa", "state") || anyAttr(xml, "state"),
      attr(xml, "Poa", "pc") || anyAttr(xml, "pc") || anyAttr(xml, "pin"),
      attr(xml, "Poa", "country") || anyAttr(xml, "country"),
    ]),
  };
}

function parsePanXml(xml: string) {
  for (const key of ["pannumber", "pan", "num", "number"]) {
    const v = anyAttr(xml, key);
    if (v) return v;
  }
  return (
    xml
      .match(
        /<(?:[\w.-]+:)?(?:PAN|PermanentAccountNumber)\b[^>]*>([^<]+)</i,
      )?.[1]
      ?.trim() || null
  );
}

function parseIssuedList(raw: unknown): DigilockerIssuedDoc[] {
  const bag = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object"
      ? (() => {
          const o = raw as Record<string, unknown>;
          return (
            [o.items, o.docs, o.documents, o.data].find(Array.isArray) ?? []
          );
        })()
      : [];

  const out: DigilockerIssuedDoc[] = [];
  for (const item of bag) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const uri = str(row.uri);
    if (!uri) continue;
    const doctype = (
      str(row.doctype) ||
      str(row.doc_type_id) ||
      uri.match(/-([A-Z0-9]{5})-/i)?.[1] ||
      ""
    ).toUpperCase();
    out.push({
      doctype,
      name: str(row.name) || str(row.description) || doctype,
      issuer: str(row.issuer) || str(row.issuerid) || str(row.org_id) || "",
      uri,
      date: str(row.date) || str(row.modified_on) || "",
    });
  }
  return out;
}

function kind(doc: DigilockerIssuedDoc) {
  const hay = `${doc.name} ${doc.doctype} ${doc.uri}`.toLowerCase();
  if (doc.doctype === "PANCR" || /\bpan\b/.test(hay)) return "pan" as const;
  if (doc.doctype === "ADHAR" || /aadhaar|aadhar/.test(hay))
    return "aadhaar" as const;
  return "other" as const;
}

async function fetchXml(accessToken: string, uri: string, base: string) {
  try {
    const res = await fetch(`${base}/${encodeURIComponent(uri)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer()).toString("utf8");
  } catch {
    return null;
  }
}

/* ── gather ── */

export async function gatherDigilockerKyc(opts: {
  accessToken: string;
  idToken?: string;
  tokenEaadhaar?: string;
}): Promise<DigilockerKycPayload> {
  const c = cfg();
  const auth = { Authorization: `Bearer ${opts.accessToken}` };

  const userRes = await fetch(c.userUrl, { headers: auth, cache: "no-store" });
  const user = (await userRes.json().catch(() => ({}))) as {
    digilockerid?: string;
    name?: string;
    dob?: string;
    gender?: string;
    eaadhaar?: string;
    error?: string;
    error_description?: string;
  };
  if (!userRes.ok || !user.digilockerid) {
    throw new Error(
      user.error_description ||
        user.error ||
        `User fetch failed (${userRes.status})`,
    );
  }

  const claims = decodeIdToken(opts.idToken);
  const eaadhaar = (user.eaadhaar || opts.tokenEaadhaar || "N").toUpperCase();
  if (eaadhaar !== "Y" && !claims?.masked_aadhaar) {
    throw new Error("e-Aadhaar is not available on this DigiLocker account.");
  }

  const out: DigilockerKycPayload = {
    name: claim(claims, ["given_name", "name"]) || str(user.name),
    dob: claim(claims, ["birthdate"]) || str(user.dob),
    gender: claim(claims, ["gender"]) || str(user.gender),
    uidMasked: maskUid(claim(claims, ["masked_aadhaar"])),
    address: addressFromClaims(claims),
    pan: claim(claims, ["pan_number"]),
    phone: claim(claims, ["phone_number", "mobile", "phone"]),
  };

  try {
    const res = await fetch(c.eaadhaarUrl, {
      headers: auth,
      cache: "no-store",
    });
    if (!res.ok)
      throw new Error(await apiError(res, `e-Aadhaar ${res.status}`));
    const parsed = parseAadhaarXml(
      Buffer.from(await res.arrayBuffer()).toString("utf8"),
    );
    out.name = parsed.name || out.name;
    out.dob = parsed.dob || out.dob;
    out.gender = parsed.gender || out.gender;
    out.uidMasked = parsed.uidMasked || out.uidMasked;
    out.address = parsed.address || out.address;
  } catch {
    // e-Aadhaar XML is optional when address already came from claims.
  }

  try {
    const res = await fetch(c.issuedUrl, { headers: auth, cache: "no-store" });
    if (!res.ok) throw new Error(await apiError(res, `issued ${res.status}`));
    const docs = parseIssuedList(await res.json());

    for (const doc of docs) {
      const k = kind(doc);
      if (k !== "pan" && k !== "aadhaar") continue;
      const needXml =
        (k === "pan" && !out.pan) ||
        (k === "aadhaar" && (!out.address || !out.uidMasked));
      if (!needXml) continue;

      const xml = await fetchXml(opts.accessToken, doc.uri, c.xmlUriBase);
      if (!xml) continue;

      if (k === "pan" && !out.pan) out.pan = parsePanXml(xml);
      if (k === "aadhaar") {
        const a = parseAadhaarXml(xml);
        out.address = a.address || out.address;
        out.uidMasked = a.uidMasked || out.uidMasked;
        out.name = a.name || out.name;
      }
    }
  } catch {
    // Issued-doc XML is optional when PAN / Aadhaar already came from claims.
  }

  if (!out.name) {
    throw new Error("No identity details returned from DigiLocker.");
  }
  return out;
}
