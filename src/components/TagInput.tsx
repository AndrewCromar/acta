"use client";

import { useState, type KeyboardEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Tag } from "@/lib/db";
import {
  addTagToTodo,
  getTagsForTodo,
  removeTagFromTodo,
} from "@/lib/tags";

type TodoMode = { mode: "todo"; todoId: string };
type DraftMode = {
  mode: "draft";
  value: string[];
  onChange: (names: string[]) => void;
};
type Props = TodoMode | DraftMode;

export function TagInput(props: Props) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const currentTags = useLiveQuery(
    () =>
      props.mode === "todo"
        ? getTagsForTodo(props.todoId)
        : Promise.resolve([] as Tag[]),
    [props.mode === "todo" ? props.todoId : null],
    [] as Tag[],
  );

  const allTags = useLiveQuery(
    () => db.tags.toArray(),
    [],
    [] as Tag[],
  );

  const chipNames =
    props.mode === "todo"
      ? currentTags.map((t) => t.name)
      : props.value;

  const activeNamesLower = new Set(chipNames.map((n) => n.toLowerCase()));
  const suggestions = allTags
    .filter(
      (t) =>
        t.sync_status !== "deleting" &&
        !activeNamesLower.has(t.name.toLowerCase()),
    )
    .filter((t) =>
      draft.trim()
        ? t.name.toLowerCase().includes(draft.trim().toLowerCase())
        : true,
    )
    .slice(0, 6);

  async function handleAdd(name: string) {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    if (activeNamesLower.has(trimmed.toLowerCase())) {
      setDraft("");
      return;
    }
    setBusy(true);
    try {
      if (props.mode === "todo") {
        await addTagToTodo(props.todoId, trimmed);
      } else {
        props.onChange([...props.value, trimmed]);
      }
      setDraft("");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveByIndex(i: number) {
    if (busy) return;
    setBusy(true);
    try {
      if (props.mode === "todo") {
        await removeTagFromTodo(props.todoId, currentTags[i].id);
      } else {
        const next = [...props.value];
        next.splice(i, 1);
        props.onChange(next);
      }
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
      chipNames.length > 0
    ) {
      handleRemoveByIndex(chipNames.length - 1);
    }
  }

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <span className="text-xs text-neutral-500 dark:text-neutral-400">
        Tags
      </span>
      <div className="flex flex-wrap gap-1 items-center min-w-0">
        {chipNames.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs pl-2 pr-1 py-0.5 max-w-full min-w-0"
          >
            <span className="truncate max-w-[10rem] inline-block align-middle">
              {name}
            </span>
            <button
              type="button"
              onClick={() => handleRemoveByIndex(i)}
              aria-label={`Remove ${name}`}
              className="text-neutral-500 hover:text-red-600 dark:hover:text-red-400 px-1 flex-shrink-0"
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
          placeholder={chipNames.length === 0 ? "Add tag…" : "+ tag"}
          className="flex-1 min-w-[6rem] bg-transparent text-base outline-none py-0.5"
        />
      </div>
      {draft.trim() && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 min-w-0">
          {suggestions.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleAdd(t.name)}
              className="text-xs rounded-full border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 max-w-full min-w-0"
            >
              <span className="truncate max-w-[10rem] inline-block align-middle">
                {t.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
