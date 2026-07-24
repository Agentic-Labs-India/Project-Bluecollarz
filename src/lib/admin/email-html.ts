import sanitizeHtml from "sanitize-html";

/** Pull bare address from `Name <a@b.com>` or plain email. */
export function extractEmailAddress(value: string): string {
  const trimmed = value.trim();
  const angled = trimmed.match(/<([^<>\s]+@[^<>\s]+)>/);
  if (angled?.[1]) return angled[1].toLowerCase();
  const bare = trimmed.match(/[^\s<>]+@[^\s<>]+/);
  return bare ? bare[0].toLowerCase() : trimmed.toLowerCase();
}

/** Allow richer HTML for outbound compose (incl. images). */
const EMAIL_COMPOSE_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "blockquote",
  "a",
  "img",
  "span",
  "div",
];

/** Broader allow-list when rendering inbound/outbound message bodies. */
const EMAIL_VIEW_TAGS = [
  ...EMAIL_COMPOSE_TAGS,
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "hr",
  "pre",
  "code",
  "h1",
  "h4",
];

export function sanitizeEmailComposeHtml(html: string): string {
  return sanitizeHtml(html ?? "", {
    allowedTags: EMAIL_COMPOSE_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      span: ["style"],
      div: ["style"],
      p: ["style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
    },
  }).trim();
}

export function sanitizeEmailViewHtml(html: string): string {
  return sanitizeHtml(html ?? "", {
    allowedTags: EMAIL_VIEW_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      td: ["colspan", "rowspan", "style", "align"],
      th: ["colspan", "rowspan", "style", "align"],
      table: ["style", "border", "cellpadding", "cellspacing", "width"],
      span: ["style"],
      div: ["style"],
      p: ["style"],
    },
    allowedSchemes: ["http", "https", "mailto", "cid"],
    allowProtocolRelative: false,
  }).trim();
}
