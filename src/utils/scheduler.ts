import crypto from "crypto";

export function makeIdemKey(
  sequenceId: string,
  leadId: string,
  stepNumber: number,
  attempt: number = 0,
  suffix: string = "",
): string {
  const raw = JSON.stringify({
    sequenceId,
    leadId,
    stepNumber,
    attempt,
    suffix,
  });

  // Short, consistent hash — avoids huge keys but guarantees uniqueness
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}
