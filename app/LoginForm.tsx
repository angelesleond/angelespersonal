"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ people }: { people: { id: string; name: string }[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function pick(personId: string) {
    setLoading(personId);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId }),
      });
      if (!res.ok) throw new Error("No se pudo iniciar sesión");
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setLoading(null);
    }
  }

  if (people.length === 0) {
    return <p>Todavía no hay personas cargadas en el grupo.</p>;
  }

  return (
    <div>
      {people.map((p) => (
        <button
          key={p.id}
          className="name-btn"
          disabled={loading !== null}
          onClick={() => pick(p.id)}
        >
          {loading === p.id ? "Entrando..." : p.name}
        </button>
      ))}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
