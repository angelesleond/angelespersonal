"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OrganizerActions({
  cycleId,
  started,
  organizerConnected,
}: {
  cycleId: string;
  started: boolean;
  organizerConnected: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function connect() {
    window.location.href = "/api/mp/oauth/start";
  }

  async function startCharge() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/charge/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error iniciando el cobro");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Sos la organizadora</h2>
      {!organizerConnected && (
        <>
          <p>Primero conectá tu cuenta de Mercado Pago para recibir los aportes directo.</p>
          <button onClick={connect}>Conectar con Mercado Pago</button>
        </>
      )}
      {organizerConnected && !started && (
        <>
          <p>Cuando estés lista, iniciá el cobro para generar los links de pago del resto del grupo.</p>
          <button onClick={startCharge} disabled={loading}>
            {loading ? "Generando cobros..." : "Iniciar cobro"}
          </button>
        </>
      )}
      {organizerConnected && started && <p>El cobro ya está en marcha. Mirá el estado abajo.</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
