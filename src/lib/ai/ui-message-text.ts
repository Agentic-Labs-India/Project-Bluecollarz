import { isTextUIPart, type UIMessage } from "ai";

/** Join text parts from a UIMessage (chat / voice TTS / stage inference). */
export function uiMessageText(message: UIMessage): string {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("\n")
    .trim();
}
