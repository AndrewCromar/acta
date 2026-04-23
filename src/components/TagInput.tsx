"use client";

import { useState, type KeyboardEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Tag } from "@/lib/db";
import { addTagToTodo, removeTagFromTodo, getTagsForTodo } from "@/lib/tags";

export function TagInput({ todoId }: { todoId: string }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const currentTags = useLiveQuery(
    () => getTagsForTodo(todoId),
    [todoId],
    [] as Tag[],
  );
  const allTags = useLiveQuery(
    () => db.tags.toArray(),
    [],
    [] as Tag[],
  );

  const activeTagIds = new Set(currentTags.map((t) => t.id));
  const suggestions = allTags
    .filter((t) => t.sync_status !== "deleting" && !activeTagIds.has(t.id))
    .filter((t) =>
      draft.trim()
        ? t.name.toLowerCase().includes(draft.trim().toLowerCase())
        : true,
    )
    .slice(0, 6);

  async function handleAdd(name: string) {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await addTagToTodo(todoId, trimmed);
      setDraft("");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(tagId: string) {
    if (busy) return;
    setBusy(true);
    try {
      await removeTagFromTodo(todoId, tagId);
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd(draft);
    } else if (
      e.key === "Backspace" &&
      draft === "" &&
      currentTags.length > 0
    ) {
      handleRemove(currentTags[currentTags.length - 1].id);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-neutral-500 dark:text-neutral-400">
        Tags
      </span>
      <div className="flex flex-wrap gap-1 items-center">
        {currentTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs pl-2 pr-1 py-0.5"
          >
            {tag.name}
            <button
              type="button"
              onClick={() => handleRemove(tag.id)}
              aria-label={`Remove ${tag.name}`}
              className="text-neutral-500 hover:text-red-600 dark:hover:text-red-400 px-1"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            currentTags.length === 0 ? "Add tag…" : "+ tag"
          }
          className="flex-1 min-w-[6rem] bg-transparent text-base outline-none py-0.5"
        />
      </div>
      {draft.trim() && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleAdd(t.name)}
              className="text-xs rounded-full border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
