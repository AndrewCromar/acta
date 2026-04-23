import { cookies } from "next/headers";

export type User = {
  id: number;
  email: string;
};

const AUTH_BASE =
  process.env.NEXT_PUBLIC_AUTH_BASE_URL ?? "https://auth.andrewcromar.org";

export async function getUser(): Promise<User | null> {
  const token = (await cookies()).get("session_token")?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${AUTH_BASE}/api/validate_token.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }).toString(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      authenticated?: boolean;
      user?: { id: number; email: string };
    };
    if (!data.authenticated || !data.user) return null;
    return { id: data.user.id, email: data.user.email };
  } catch {
    return null;
  }
}
