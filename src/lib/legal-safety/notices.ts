import "server-only";

import { ObjectId } from "mongodb";
import type { TtsLanguageCode } from "@/lib/ai/voice/languages";
import { resolveTtsLanguage } from "@/lib/ai/voice/languages";
import client, { COLLECTIONS, DB_NAME } from "@/lib/db";
import { getClaim } from "@/lib/legal-safety/registry";

export type NoticeId = "POL-0007" | "POL-0005";

/**
 * Wording is versioned and explicitly unapproved. Counsel sign-off changes this
 * to an approval id; until then the status travels with every delivery record
 * so an audit can tell what the worker was actually shown.
 */
export const NOTICE_APPROVAL = "DRAFT-NOT-COUNSEL-APPROVED" as const;

export const NOTICE_VERSIONS: Readonly<Record<NoticeId, string>> = {
  "POL-0007": "pol-0007/draft-2",
  "POL-0005": "pol-0005/draft-2",
};

export interface NoticeWording {
  readonly title: string;
  readonly body: string;
  readonly continueLabel: string;
}

/**
 * Only languages with drafted wording appear here. There is deliberately no
 * English fallback: POL-0005 requires a language the worker understands, and
 * showing a serious-safety warning in a language they do not read is worse than
 * routing to a human, because it manufactures a record of having warned them.
 */
const WORDING: Readonly<
  Record<NoticeId, Partial<Record<TtsLanguageCode, NoticeWording>>>
> = {
  "POL-0007": {
    "en-IN": {
      title: "Please read this",
      body: "This is a computer helper, not a person.\nWhat you say here is saved in your Blucollarz account so we can help you find work.\nYou can ask us to show or delete your information.\nI cannot give legal advice.",
      continueLabel: "Okay, start",
    },
    "hi-IN": {
      title: "यह पढ़ लीजिए",
      body: "यह एक कंप्यूटर सहायक है, इंसान नहीं।\nआप यहाँ जो बताएँगे, वह आपके Blucollarz खाते में सेव होगा, ताकि हम काम ढूँढ़ने में मदद कर सकें।\nआप अपनी जानकारी देखने या मिटवाने के लिए कह सकते हैं।\nमैं कानूनी सलाह नहीं दे सकता।",
      continueLabel: "ठीक है, शुरू करें",
    },
  },
  "POL-0005": {
    "en-IN": {
      title: "Please stop and read",
      body: "What you told us is serious. A person from our team will look at it.\nIf the law says we must tell the police or government, we will have to. I cannot promise to keep it private.\nThis is not your fault. You are not in trouble. You can stop now, and you can still ask for help.",
      continueLabel: "I understand",
    },
    "hi-IN": {
      title: "रुककर यह पढ़ लीजिए",
      body: "आपने जो बताया है वह गंभीर है। हमारी टीम का एक इंसान इसे देखेगा।\nअगर कानून कहे कि पुलिस या सरकार को बताना है, तो हमें बताना पड़ेगा। मैं इसे गुप्त रखने का वादा नहीं कर सकता।\nआपकी कोई गलती नहीं है। आप मुश्किल में नहीं हैं। आप अभी रुक सकते हैं, और फिर भी मदद माँग सकते हैं।",
      continueLabel: "समझ गया",
    },
  },
};

export type NoticeLookup =
  | { available: true; language: TtsLanguageCode; wording: NoticeWording }
  | { available: false; language: TtsLanguageCode; reason: string };

export function getNotice(
  id: NoticeId,
  languageCode: string | null | undefined,
): NoticeLookup {
  const language = resolveTtsLanguage(languageCode);
  const wording = WORDING[id][language];
  if (!wording) {
    return {
      available: false,
      language,
      reason: `No ${NOTICE_APPROVAL} wording for ${id} in ${language}. Route to a human who speaks it.`,
    };
  }
  return { available: true, language, wording };
}

export function noticeLanguages(id: NoticeId): TtsLanguageCode[] {
  return Object.keys(WORDING[id]) as TtsLanguageCode[];
}

export interface NoticeDelivery {
  _id?: ObjectId;
  deliveryId: string;
  noticeId: NoticeId;
  noticeVersion: string;
  approval: typeof NOTICE_APPROVAL;
  userId: string;
  language: TtsLanguageCode;
  /** Exactly what was rendered, so the record does not drift from the wording. */
  bodyShown: string;
  /** The worker's teach-back, verbatim. Never scored, never a gate. */
  teachBackResponse: string | null;
  deliveredAt: Date;
  deliveryMode: "in_app" | "deferred";
  workerAcknowledged: boolean;
  workerContinued: boolean;
  noticeDeferred: boolean;
  /**
   * POL-0006. A delivery is proof the worker was told, never that they agreed.
   * Nothing may read this record as permission, and a worker's silence or
   * refusal never unblocks or blocks a statutory duty.
   */
  readonly isConsent: false;
}

function deliveries() {
  return client
    .db(DB_NAME)
    .collection<NoticeDelivery>(COLLECTIONS.LEGAL_SAFETY_NOTICES);
}

export async function recordNoticeDelivery(input: {
  noticeId: NoticeId;
  userId: string;
  language: TtsLanguageCode;
  bodyShown: string;
  teachBackResponse?: string | null;
  noticeDeferred?: boolean;
}): Promise<NoticeDelivery> {
  getClaim(input.noticeId);

  const deferred = Boolean(input.noticeDeferred);
  const doc: NoticeDelivery = {
    deliveryId: new ObjectId().toHexString(),
    noticeId: input.noticeId,
    noticeVersion: NOTICE_VERSIONS[input.noticeId],
    approval: NOTICE_APPROVAL,
    userId: input.userId,
    language: input.language,
    bodyShown: input.bodyShown,
    teachBackResponse: input.teachBackResponse?.trim() || null,
    deliveredAt: new Date(),
    deliveryMode: deferred ? "deferred" : "in_app",
    workerAcknowledged: !deferred,
    workerContinued: !deferred,
    noticeDeferred: deferred,
    isConsent: false,
  };
  await deliveries().insertOne(doc);
  return doc;
}

/**
 * Any delivery of the current version, including deferred. Deferred is not
 * treated as a successful warning for audit (the record still has
 * `noticeDeferred: true`); it only stops the UI from blocking the worker
 * again after imminent-harm skip or a human-delivery fallback.
 */
export async function hasSeenNotice(
  userId: string,
  noticeId: NoticeId,
): Promise<boolean> {
  const seen = await deliveries().findOne(
    {
      userId,
      noticeId,
      noticeVersion: NOTICE_VERSIONS[noticeId],
    },
    { projection: { _id: 1 } },
  );
  return Boolean(seen);
}

/** POL-0007 is shown inside the Privacy & terms gate, not as a second dialog. */
export async function recordBaselineNoticeForWorker(input: {
  userId: string;
  languageCode?: string | null;
}): Promise<void> {
  if (await hasSeenNotice(input.userId, "POL-0007")) return;
  const notice = getNotice("POL-0007", input.languageCode);
  await recordNoticeDelivery({
    noticeId: "POL-0007",
    userId: input.userId,
    language: notice.available ? notice.language : "en-IN",
    bodyShown: notice.available ? notice.wording.body : "",
    noticeDeferred: !notice.available,
  });
}
