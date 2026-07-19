"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "regalos-amigas-push-tip-v1";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function PushSetup({ personId }: { personId: string }) {
  const [status, setStatus] = useState<"idle" | "asking" | "on" | "denied" | "unsupported">("idle");
  const [testSent, setTestSent] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (localStorage.getItem(STORAGE_KEY)) {
      setDismissed(true);
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      if (existing) setStatus("on");
    });
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  }

  async function enable() {
    setStatus("asking");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setStatus("denied");
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setStatus("unsupported");
      return;
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId, subscription: sub.toJSON() }),
    });
    setStatus("on");
  }

  async function sendTest() {
    setTestSent(true);
    await fetch("/api/push/test", { method: "POST" });
    setTimeout(dismiss, 2500);
  }

  if (status === "unsupported") return null;
  if (dismissed) return null;

  if (status === "on") {
    return (
      <div className="card">
        <p>Las notificaciones están activadas.</p>
        <button onClick={sendTest} disabled={testSent}>
          {testSent ? "Enviada, revisá tu celular" : "Enviar notificación de prueba"}
        </button>
        <button
          onClick={dismiss}
          style={{ background: "transparent", color: "#8a7f73", marginTop: "0.5rem" }}
        >
          No mostrar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <p>Activa las notificaciones para enterarte cuando te toque aportar.</p>
      <button onClick={enable} disabled={status === "asking"}>
        {status === "denied" ? "Notificaciones bloqueadas" : "Activar notificaciones"}
      </button>
    </div>
  );
}
