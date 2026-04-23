"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { parseDate, formatShort } from "@/lib/chrono";
import {
  parseRule,
  stringifyRule,
  type RecurrenceFreq,
  type RecurrenceRule,
} from "@/lib/recurrence";
import {
  addTagToTodo,
  getTagsForTodo,
  removeTagFromTodo,
} from "@/lib/tags";
import { createTodo, deleteTodo, updateTodo } from "@/lib/todos";
import { db, type Tag, type Todo } from "@/lib/db";
import { Modal } from "./Modal";
import { TagInput } from "./TagInput";

type Props = {
  open: boolean;
  onClose: () => void;
} & (
  | { mode: "create"; todo?: undefined }
  | { mode: "edit"; todo: Todo }
);

function toLocalInputValue(ms: number | null): string {
  if (ms === null) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toUntilInput(ms: number | null): string {
  if (ms === null) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function TodoModal(props: Props) {
  const { open, onClose, mode } = props;
  const todo = mode === "edit" ? props.todo : undefined;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueInput, setDueInput] = useState("");
  const [freq, setFreq] = useState<RecurrenceFreq | "">("");
  const [untilInput, setUntilInput] = useState("");
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [ignoreParse, setIgnoreParse] = useState(false);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const existingTags = useLiveQuery(
    async (): Promise<Tag[]> =>
      mode === "edit" && todo ? getTagsForTodo(todo.id) : [],
    [mode, todo?.id],
    [] as Tag[],
  );

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && todo) {
      setTitle(todo.title);
      setDescription(todo.description);
      setDueInput(toLocalInputValue(todo.due_at));
      const rule = parseRule(todo.recurrence_rule);
      setFreq(rule?.freq ?? "");
      setUntilInput(toUntilInput(rule?.until ?? null));
    } else {
      setTitle("");
      setDescription("");
      setDueInput("");
      setFreq("");
      setUntilInput("");
      setDraftTags([]);
    }
    setIgnoreParse(false);
  }, [open, mode, todo]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => titleRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  const parse = useMemo(
    () => (mode === "create" && !ignoreParse ? parseDate(title) : null),
    [mode, title, ignoreParse],
  );
  const showParseChip = parse !== null && dueInput === "";

  async function handleSave() {
    if (saving) return;

    const manualDue = dueInput ? new Date(dueInput).getTime() : null;
    const useParse = parse && manualDue === null && mode === "create";
    const finalTitle = (useParse ? parse!.strippedTitle : title).trim();
    const finalDue = useParse ? parse!.date.getTime() : manualDue;
    if (!finalTitle) return;

    const rule: RecurrenceRule | null = freq
      ? {
          freq,
          until: untilInput ? new Date(untilInput).getTime() : null,
        }
      : null;
    const ruleJson = stringifyRule(rule);

    setSaving(true);
    try {
      if (mode === "create") {
        const created = await createTodo(finalTitle, {
          description: description.trim(),
          due_at: finalDue,
          recurrence_rule: ruleJson,
        });
        for (const name of draftTags) {
          await addTagToTodo(created.id, name);
        }
      } else if (todo) {
        await updateTodo(todo.id, {
          title: finalTitle,
          description: description,
          due_at: finalDue,
          recurrence_rule: ruleJson,
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (mode !== "edit" || !todo) return;
    if (!window.confirm(`Delete "${todo.title}"?`)) return;
    await deleteTodo(todo.id);
    onClose();
  }

  async function addExistingTag(name: string) {
    if (mode !== "edit" || !todo) return;
    await addTagToTodo(todo.id, name);
  }

  async function removeExistingTag(tagId: string) {
    if (mode !== "edit" || !todo) return;
    await removeTagFromTodo(todo.id, tagId);
  }
  // silence unused-helpers warning while still preserving them for future call sites
  void addExistingTag;
  void removeExistingTag;
  void existingTags;

  if (!open) return null;

  const saveLabel = mode === "create" ? "Create" : "Save";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "New todo" : "Edit todo"}
      footer={
        <div className="flex items-center justify-between gap-2">
          {mode === "edit" ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="text-sm rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="text-sm rounded-md bg-black text-white px-3 py-1 hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 disabled:opacity-50"
            >
              {saving ? "…" : saveLabel}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4 p-4 min-w-0">
        <label className="flex flex-col gap-1 min-w-0">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Title
          </span>
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIgnoreParse(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
            placeholder="What needs doing?"
            className="w-full max-w-full min-w-0 box-border rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1 text-base outline-none focus:border-neutral-500"
          />
          {showParseChip && parse && (
            <div className="flex items-center gap-2 text-xs min-w-0">
              <span className="rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 truncate min-w-0">
                →{" "}
                <span className="font-medium">{parse.strippedTitle}</span>{" "}
                · due {formatShort(parse.date)}
              </span>
              <button
                type="button"
                onClick={() => setIgnoreParse(true)}
                className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 flex-shrink-0"
                aria-label="Don't parse date from title"
              >
                ✕
              </button>
            </div>
          )}
        </label>

        <label className="flex flex-col gap-1 min-w-0">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details…"
            rows={3}
            className="w-full max-w-full min-w-0 box-border rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1 text-base outline-none focus:border-neutral-500 resize-y"
          />
        </label>

        <label className="flex flex-col gap-1 min-w-0">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Due
          </span>
          <div className="max-w-[20rem] min-w-0">
            <input
              type="datetime-local"
              value={dueInput}
              onChange={(e) => setDueInput(e.target.value)}
              className="w-full max-w-full min-w-0 box-border rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1 text-base outline-none focus:border-neutral-500"
            />
          </div>
        </label>

        <div className="flex flex-col gap-2 min-w-0">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Repeats
          </span>
          <div className="flex gap-2 max-w-[20rem] min-w-0">
            <select
              value={freq}
              onChange={(e) => setFreq(e.target.value as RecurrenceFreq | "")}
              className="font-sans flex-1 min-w-0 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1 text-base outline-none focus:border-neutral-500"
            >
              <option value="">Never</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            {freq && (
              <input
                type="date"
                value={untilInput}
                onChange={(e) => setUntilInput(e.target.value)}
                aria-label="Repeat until"
                className="flex-1 min-w-0 box-border rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2 py-1 text-base outline-none focus:border-neutral-500"
              />
            )}
          </div>
        </div>

        {mode === "edit" && todo ? (
          <TagInput mode="todo" todoId={todo.id} />
        ) : (
          <TagInput
            mode="draft"
            value={draftTags}
            onChange={setDraftTags}
          />
        )}
      </div>
    </Modal>
  );
}

// keep db reference alive for potential future use (e.g., prefetching)
void db;
