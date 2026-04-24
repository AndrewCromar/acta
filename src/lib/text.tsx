import { Fragment, type ReactNode } from "react";

const URL_RE = /(https?:\/\/[^\s]+)/g;

export function linkify(text: string): ReactNode[] {
  if (!text) return [];
  const out: ReactNode[] = [];
  let lastIndex = 0;
  const matches = text.matchAll(URL_RE);
  let i = 0;
  for (const m of matches) {
    const start = m.index ?? 0;
    if (start > lastIndex) {
      out.push(
        <Fragment key={`t-${i}`}>{text.slice(lastIndex, start)}</Fragment>,
      );
    }
    const url = m[0];
    out.push(
      <a
        key={`a-${i}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="underline text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
      >
        {url}
      </a>,
    );
    lastIndex = start + url.length;
    i += 1;
  }
  if (lastIndex < text.length) {
    out.push(<Fragment key={`t-${i}`}>{text.slice(lastIndex)}</Fragment>);
  }
  return out;
}
