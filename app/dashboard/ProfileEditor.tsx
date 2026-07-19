"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfileEditor({
  birthday,
  wishlist,
}: {
  birthday: string; // AAAA-MM-DD
  wishlist: string;
}) {
  const router = useRouter();
  const [bday, setBday] = useState(birthday);
  const [wish, setWish] = useState(wishlist);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthday: bday, wishlist: wish }),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <div className="card">
        <button style={{ background: "transparent", color: "#7c3aed" }} onClick={() => setOpen(true)}>
          Editar mi perfil (cumpleaños / lista de deseos)
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Mi perfil</h2>
      <label>
        Cumpleaños
        <input
          type="date"
          value={bday}
          onChange={(e) => setBday(e.target.value)}
          style={{ display: "block", width: "100%", padding: "0.5rem", marginBottom: "0.75rem" }}
        />
      </label>
      <label>
        Lista de deseos
        <textarea
          value={wish}
          onChange={(e) => setWish(e.target.value)}
          rows={3}
          style={{ display: "block", width: "100%", padding: "0.5rem", marginBottom: "0.75rem" }}
        />
      </label>
      <button onClick={save} disabled={saving}>
        {saving ? "Guardando..." : "Guardar"}
      </button>
    </div>
  );
}
