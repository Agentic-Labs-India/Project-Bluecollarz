/** Shared Vercel AI Gateway model id for all LLM routes. */
export function getGatewayModel(): string {
  return process.env.AI_GATEWAY_MODEL?.trim() || "openai/gpt-4o";
}
