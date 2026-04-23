"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type Todo } from "@/lib/db";
import { TodoItem } from "./TodoItem";
import type { SortMode } from "./TodoArea";

function sortTodos(todos: Todo[], mode: SortMode): Todo[] {
  const copy = [...todos];
  switch (mode) {
    case "due":
      copy.sort((a, b) => {
        if (a.due_at === null && b.due_at === null)
          return b.created_at - a.created_at;
        if (a.due_at === null) return 1;
        if (b.due_at === null) return -1;
        if (a.due_at !== b.due_at) return a.due_at - b.due_at;
        return b.created_at - a.created_at;
      });
      break;
    case "alpha":
      copy.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
      );
      break;
    case "created":
    default:
      copy.sort((a, b) => b.created_at - a.created_at);
  }
  return copy;
}

export function TodoList({
  sort,
  expandedId,
  onExpand,
  onCollapse,
}: {
  sort: SortMode;
  expandedId: string | null;
  onExpand: (id: string) => void;
  onCollapse: () => void;
}) {
  const todos = useLiveQuery(
    () =>
      db.todos
        .toArray()
        .then((all) => all.filter((t) => t.sync_status !== "deleting")),
    [],
  );

  if (todos === undefined) {
    return (
      <p className="text-sm text-neutral-400 text-center py-8">Loading…</p>
    );
  }

  if (todos.length === 0) {
    return (
      <p className="text-sm text-neutral-400 text-center py-8">
        No todos yet. Add one above.
      </p>
    );
  }

  const sorted = sortTodos(todos, sort);

  return (
    <ul className="flex flex-col gap-1">
      {sorted.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          expanded={expandedId === todo.id}
          onExpand={() => onExpand(todo.id)}
          onCollapse={onCollapse}
        />
      ))}
    </ul>
  );
}
