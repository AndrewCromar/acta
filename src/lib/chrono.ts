import * as chrono from "chrono-node";

export type Parse = {
  date: Date;
  strippedTitle: string;
};

export function parseDate(raw: string): Parse | null {
  if (!raw.trim()) return null;
  const results = chrono.parse(raw, new Date(), { forwardDate: true });
  if (results.length === 0) return null;
  const r = results[0];
  const start = r.index;
  const end = r.index + r.text.length;
  let stripped = (raw.slice(0, start) + raw.slice(end))
    .replace(/\s{2,}/g, " ")
    .trim();
  stripped = stripped.replace(/\b(due|on|at|by)\s*$/i, "").trim();
  if (!stripped) return null;
  return { date: r.start.date(), strippedTitle: stripped };
}

export function formatShort(d: Date): string {
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
