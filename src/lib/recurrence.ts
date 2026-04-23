export type RecurrenceFreq = "daily" | "weekly" | "monthly" | "yearly";

export type RecurrenceRule = {
  freq: RecurrenceFreq;
  until: number | null;
};

const VALID_FREQ: readonly RecurrenceFreq[] = [
  "daily",
  "weekly",
  "monthly",
  "yearly",
];

export function parseRule(raw: string | null): RecurrenceRule | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as unknown;
    if (!obj || typeof obj !== "object") return null;
    const cand = obj as Partial<RecurrenceRule>;
    if (!cand.freq || !(VALID_FREQ as readonly string[]).includes(cand.freq))
      return null;
    const until =
      typeof cand.until === "number"
        ? cand.until
        : cand.until == null
          ? null
          : null;
    return { freq: cand.freq, until };
  } catch {
    return null;
  }
}

export function stringifyRule(rule: RecurrenceRule | null): string | null {
  if (!rule) return null;
  return JSON.stringify({ freq: rule.freq, until: rule.until });
}

export function computeNext(from: Date, rule: RecurrenceRule): Date | null {
  const next = new Date(from.getTime());
  switch (rule.freq) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  if (rule.until !== null && next.getTime() > rule.until) return null;
  return next;
}

export function summarizeRule(rule: RecurrenceRule | null): string {
  if (!rule) return "Never";
  const base =
    rule.freq === "daily"
      ? "Daily"
      : rule.freq === "weekly"
        ? "Weekly"
        : rule.freq === "monthly"
          ? "Monthly"
          : "Yearly";
  if (rule.until === null) return base;
  const until = new Date(rule.until);
  return `${base} until ${until.toLocaleDateString()}`;
}
