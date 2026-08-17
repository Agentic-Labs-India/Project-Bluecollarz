/** Replace `{{key}}` tokens. Unknown tokens are left in place. */
export function applyPromptTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key: string) => {
    return Object.hasOwn(vars, key) ? vars[key] : match;
  });
}

/** Append a runtime block when the rendered prompt does not already include it. */
export function ensurePromptContains(
  rendered: string,
  value: string,
  heading: string,
): string {
  const chunk = value.trim();
  if (!chunk) return rendered;
  if (rendered.includes(chunk)) return rendered;
  return `${rendered.trim()}\n\n${heading}\n${chunk}`;
}
