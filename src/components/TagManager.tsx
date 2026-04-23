"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Tag } from "@/lib/db";
import { deleteTag, renameTag } from "@/lib/tags";
import { sync } from "@/lib/sync";

export function TagManager({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tags = useLiveQuery(
    async () => {
      const all = await db.tags.toArray();
      return all
        .filter((t) => t.sync_status !== "deleting")
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        );
    },
    [],
    [] as Tag[],
  );

  const links = useLiveQuery(
    () => db.todo_tags.toArray(),
    [],
    [] as { todo_id: string; tag_id: string; sync_status: string }[],
  );

  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setDraft("");
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const countByTag = new Map<string, number>();
  for (const l of links) {
    if (l.sync_status === "deleting") continue;
    countByTag.set(l.tag_id, (countByTag.get(l.tag_id) ?? 0) + 1);
  }

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setDraft(tag.name);
    setError(null);
  }

  async function commitEdit(tag: Tag) {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === tag.name) {
      setEditingId(null);
      setError(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await renameTag(tag.id, trimmed);
      void sync();
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rename failed");
    } finally {
      setBusy(false);
    }
  }

  function onEditKey(e: KeyboardEvent<HTMLInputElement>, tag: Tag) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit(tag);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditingId(null);
      setError(null);
    }
  }

  async function handleDelete(tag: Tag) {
    const count = countByTag.get(tag.id) ?? 0;
    const msg =
      count > 0
        ? `Delete "${tag.name}"? This will remove it from ${count} todo${count === 1 ? "" : "s"}.`
        : `Delete "${tag.name}"?`;
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      await deleteTag(tag.id);
      void sync();
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 shadow-xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-base font-semibold">Manage tags</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {tags.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-8">
              No tags yet. Create them from the tag input inside a todo.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {tags.map((tag) => {
                const count = countByTag.get(tag.id) ?? 0;
                const isEditing = editingId === tag.id;
                return (
                  <li
                    key={tag.id}
                    className="flex items-center gap-3 px-4 py-2"
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={draft}
                        autoFocus
                        onChange={(e) => {
                          setDraft(e.target.value);
                          if (error) setError(null);
                        }}
                        onBlur={() => commitEdit(tag)}
                        onKeyDown={(e) => onEditKey(e, tag)}
                        className="flex-1 min-w-0 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1 text-base outline-none focus:border-neutral-500"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(tag)}
                        className="flex-1 min-w-0 text-left text-sm truncate cursor-text"
                      >
                        {tag.name}
                      </button>
                    )}
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 flex-shrink-0">
                      {count} todo{count === 1 ? "" : "s"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(tag)}
                      disabled={busy}
                      aria-label={`Delete ${tag.name}`}
                      className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 flex-shrink-0"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && (
          <p className="px-4 py-2 text-xs text-red-600 dark:text-red-400 border-t border-neutral-200 dark:border-neutral-800">
            {error}
          </p>
        )}

        <p className="px-4 py-2 text-xs text-neutral-500 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-800">
          Click a name to rename · changes sync across devices
        </p>
      </div>
    </div>
  );
}
