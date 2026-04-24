"use client";

import { useEffect } from "react";
import { sync } from "@/lib/sync";

const INTERVAL_MS = 30_000;

async function refreshServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register("/sw.js");
    } else {
      await reg.update();
    }
  } catch (err) {
    console.warn("sw refresh failed", err);
  }
}

export function SyncRunner() {
  useEffect(() => {
    sync();
    refreshServiceWorker();

    const interval = setInterval(() => {
      sync();
    }, INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
