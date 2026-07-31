/** Locked acknowledgment — agreement is implied by signup. */
export function PrivacyTermsAcknowledgment() {
  return (
    <div className="border-border bg-muted/30 flex items-start gap-3 border p-3">
      <input
        type="checkbox"
        className="border-input mt-0.5 size-4 accent-primary"
        checked
        disabled
        readOnly
        aria-checked="true"
        aria-label="I agree to the privacy and terms and conditions set by Blucollarz"
      />
      <span className="space-y-1">
        <span className="text-foreground block text-sm font-medium">
          I agree to the privacy and terms and conditions set by Blucollarz.
        </span>
        <span className="text-muted-foreground block text-xs">
          Already agreed via signup.{" "}
          <a
            href="/privacy"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline underline-offset-2"
          >
            Privacy
          </a>
          {" · "}
          <a
            href="/terms"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline underline-offset-2"
          >
            Terms
          </a>
        </span>
      </span>
    </div>
  );
}
