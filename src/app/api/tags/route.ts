import { and, eq, inArray } from "drizzle-orm";
import { getUser } from "@/lib/auth";
import { getDb } from "@/lib/db-server";
import { tags, todoTags } from "@/lib/schema";

export async function GET() {
  const user = await getUser();
  if (!user)
    return Response.json({ error: "unauthenticated" }, { status: 401 });

  const db = getDb();
  const [tagRows, linkRows] = await Promise.all([
    db.select().from(tags).where(eq(tags.user_id, user.id)),
    (async () => {
      const userTags = await db
        .select({ id: tags.id })
        .from(tags)
        .where(eq(tags.user_id, user.id));
      if (userTags.length === 0) return [];
      return db
        .select()
        .from(todoTags)
        .where(
          inArray(
            todoTags.tag_id,
            userTags.map((t) => t.id),
          ),
        );
    })(),
  ]);

  return Response.json({ tags: tagRows, links: linkRows });
}

type UpsertBody = {
  id?: string;
  name: string;
};

export async function POST(request: Request) {
  const user = await getUser();
  if (!user)
    return Response.json({ error: "unauthenticated" }, { status: 401 });

  let body: UpsertBody;
  try {
    body = (await request.json()) as UpsertBody;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return Response.json({ error: "name required" }, { status: 400 });
  }

  const db = getDb();

  if (body.id) {
    const existing = await db
      .select()
      .from(tags)
      .where(eq(tags.id, body.id))
      .limit(1);
    if (existing[0] && existing[0].user_id !== user.id) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    if (existing[0]) {
      const [updated] = await db
        .update(tags)
        .set({ name })
        .where(and(eq(tags.id, body.id), eq(tags.user_id, user.id)))
        .returning();
      return Response.json({ tag: updated });
    }
    const [inserted] = await db
      .insert(tags)
      .values({ id: body.id, user_id: user.id, name })
      .returning();
    return Response.json({ tag: inserted });
  }

  const existingByName = await db
    .select()
    .from(tags)
    .where(and(eq(tags.user_id, user.id), eq(tags.name, name)))
    .limit(1);
  if (existingByName[0]) {
    return Response.json({ tag: existingByName[0] });
  }

  const [inserted] = await db
    .insert(tags)
    .values({ user_id: user.id, name })
    .returning();
  return Response.json({ tag: inserted });
}
