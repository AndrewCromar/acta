"use client";

import { useEffect, useState } from "react";

type User = { id: number; email: string };

const AUTH_BASE =
  process.env.NEXT_PUBLIC_AUTH_BASE_URL ?? "https://auth.andrewcromar.org";

export function AuthBar() {
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (r) => {
        if (r.ok) {
          const data = (await r.json()) as { authenticated: boolean; user?: User };
          if (data.authenticated && data.user) setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || !user) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const logoutUrl = `${AUTH_BASE}/pages/logout.html?redirect=${encodeURIComponent(origin + "/")}`;

  return (
    <header className="flex items-center justify-between px-4 py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] border-b border-neutral-200 dark:border-neutral-800 text-sm">
      <span className="text-neutral-600 dark:text-neutral-400">
        Signed in as{" "}
        <span className="text-neutral-900 dark:text-neutral-100">{user.email}</span>
      </span>
      <a
        href={logoutUrl}
        className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 underline"
      >
        Sign out
      </a>
    </header>
  );
}
