import { db, type Todo } from "./db";
import { computeNext, parseRule } from "./recurrence";

export async function createTodo(
  title: string,
  extra: {
    description?: string;
    due_at?: number | null;
    recurrence_rule?: string | null;
  } = {},
): Promise<Todo> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title cannot be empty");

  const now = Date.now();
  const id = crypto.randomUUID();
  const todo: Todo = {
    id,
    title: trimmed,
    description: extra.description?.trim() ?? "",
    completed: false,
    due_at: extra.due_at ?? null,
    recurrence_rule: extra.recurrence_rule ?? null,
    recurrence_series_id: extra.recurrence_rule ? id : null,
    created_at: now,
    updated_at: now,
    sync_status: "pending",
  };
  await db.todos.add(todo);
  return todo;
}

export async function toggleTodo(id: string): Promise<void> {
  const existing = await db.todos.get(id);
  if (!existing) return;
  const nowTs = Date.now();
  const becomingCompleted = !existing.completed;

  await db.todos.update(id, {
    completed: becomingCompleted,
    updated_at: nowTs,
    sync_status: "pending",
  });

  if (!becomingCompleted) return;
  const rule = parseRule(existing.recurrence_rule);
  if (!rule) return;

  const base = existing.due_at ?? nowTs;
  const nextDate = computeNext(new Date(base), rule);
  if (!nextDate) return;

  const nextId = crypto.randomUUID();
  const nextTodo: Todo = {
    id: nextId,
    title: existing.title,
    description: existing.description,
    completed: false,
    due_at: nextDate.getTime(),
    recurrence_rule: existing.recurrence_rule,
    recurrence_series_id: existing.recurrence_series_id ?? existing.id,
    created_at: nowTs,
    updated_at: nowTs,
    sync_status: "pending",
  };
  await db.todos.add(nextTodo);
}

export type TodoPatch = {
  title?: string;
  description?: string;
  due_at?: number | null;
  recurrence_rule?: string | null;
};

export async function updateTodo(id: string, patch: TodoPatch): Promise<void> {
  const update: Partial<Todo> = {
    updated_at: Date.now(),
    sync_status: "pending",
  };
  if (patch.title !== undefined) {
    const trimmed = patch.title.trim();
    if (!trimmed) return;
    update.title = trimmed;
  }
  if (patch.description !== undefined) {
    update.description = patch.description;
  }
  if (patch.due_at !== undefined) {
    update.due_at = patch.due_at;
  }
  if (patch.recurrence_rule !== undefined) {
    update.recurrence_rule = patch.recurrence_rule;
    if (patch.recurrence_rule === null) {
      update.recurrence_series_id = null;
    } else {
      const existing = await db.todos.get(id);
      if (existing && !existing.recurrence_series_id) {
        update.recurrence_series_id = existing.id;
      }
    }
  }
  await db.todos.update(id, update);
}

export async function renameTodo(id: string, title: string): Promise<void> {
  await updateTodo(id, { title });
}

export async function deleteTodo(id: string): Promise<void> {
  await db.todos.update(id, {
    sync_status: "deleting",
    updated_at: Date.now(),
  });
}

export async function clearCompletedTodos(): Promise<number> {
  const now = Date.now();
  const completed = await db.todos
    .filter((t) => t.completed && t.sync_status !== "deleting")
    .toArray();
  if (completed.length === 0) return 0;
  await db.transaction("rw", db.todos, async () => {
    for (const t of completed) {
      await db.todos.update(t.id, {
        sync_status: "deleting",
        updated_at: now,
      });
    }
  });
  return completed.length;
}
