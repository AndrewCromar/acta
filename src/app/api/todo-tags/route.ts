import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/auth";
import { getDb } from "@/lib/db-server";
import { tags, todoTags, todos } from "@/lib/schema";

async function assertOwnership(
  db: ReturnType<typeof getDb>,
  userId: number,
  todoId: string,
  tagId: string,
): Promise<Response | null> {
  const [todo, tag] = await Promise.all([
    db
      .select({ user_id: todos.user_id })
      .from(todos)
      .where(eq(todos.id, todoId))
      .limit(1),
    db
      .select({ user_id: tags.user_id })
      .from(tags)
      .where(eq(tags.id, tagId))
      .limit(1),
  ]);
  if (!todo[0] || !tag[0])
    return Response.json({ error: "not found" }, { status: 404 });
  if (todo[0].user_id !== userId || tag[0].user_id !== userId)
    return Response.json({ error: "forbidden" }, { status: 403 });
  return null;
}

type LinkBody = { todo_id: string; tag_id: string };

export async function POST(request: Request) {
  const user = await getUser();
  if (!user)
    return Response.json({ error: "unauthenticated" }, { status: 401 });

  let body: LinkBody;
  try {
    body = (await request.json()) as LinkBody;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body?.todo_id || !body.tag_id) {
    return Response.json(
      { error: "todo_id and tag_id required" },
      { status: 400 },
    );
  }

  const db = getDb();
  const owned = await assertOwnership(db, user.id, body.todo_id, body.tag_id);
  if (owned) return owned;

  await db
    .insert(todoTags)
    .values({ todo_id: body.todo_id, tag_id: body.tag_id })
    .onConflictDoNothing();

  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getUser();
  if (!user)
    return Response.json({ error: "unauthenticated" }, { status: 401 });

  const url = new URL(request.url);
  const todoId = url.searchParams.get("todo_id");
  const tagId = url.searchParams.get("tag_id");
  if (!todoId || !tagId) {
    return Response.json(
      { error: "todo_id and tag_id required" },
      { status: 400 },
    );
  }

  const db = getDb();
  const owned = await assertOwnership(db, user.id, todoId, tagId);
  if (owned) return owned;

  await db
    .delete(todoTags)
    .where(
      and(eq(todoTags.todo_id, todoId), eq(todoTags.tag_id, tagId)),
    );

  return Response.json({ ok: true });
}
