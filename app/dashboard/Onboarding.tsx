"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "regalos-amigas-onboarding-v1";

export default function Onboarding() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  function close() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(62, 49, 40, 0.45)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={close}
    >
      <div
        className="card"
        style={{
          maxWidth: 480,
          width: "100%",
          maxHeight: "85dvh",
          overflowY: "auto",
          borderRadius: "24px 24px 0 0",
          margin: 0,
          animation: "slideUp 0.25s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h1 style={{ fontSize: "1.4rem" }}>¡Bienvenida a Regalos Amigas!</h1>
        <p className="subtitle">Una guía rápida antes de arrancar.</p>

        <h2 style={{ fontSize: "1rem" }}>📲 Instálala en tu celular</h2>
        <p>
          Para recibir notificaciones necesitas agregarla a tu pantalla de inicio, no alcanza con
          tenerla abierta en el navegador.
        </p>
        <p style={{ marginBottom: "0.3rem" }}>
          <strong>Android (Chrome):</strong> menú ⋮ → "Instalar app" o "Agregar a pantalla de
          inicio".
        </p>
        <p>
          <strong>iPhone (Safari):</strong> toca el botón de compartir (el cuadrado con la
          flecha) → "Agregar a pantalla de inicio". En iPhone es obligatorio hacer esto para que
          lleguen los avisos.
        </p>

        <h2 style={{ fontSize: "1rem" }}>🔔 Activa las notificaciones</h2>
        <p>
          Una vez instalada, toca el botón "Activar notificaciones" que aparece arriba del todo.
          Así te vamos a avisar cuando te toque aportar, con recordatorios si se te pasa, y
          cuando se junte todo el regalo.
        </p>

        <h2 style={{ fontSize: "1rem" }}>🎂 Cómo funciona</h2>
        <p>
          La app calcula sola quién cumple años próximamente y quién organiza el regalo (la
          última que cumplió). Cuando no es tu cumpleaños, te toca aportar tu parte — vas a ver un
          botón de "Pagar" en tu pantalla cuando la organizadora inicie el cobro.
        </p>

        <h2 style={{ fontSize: "1rem" }}>🎁 Dónde ver qué regalarle</h2>
        <p>
          En la tarjeta "Cumpleaños actual" vas a encontrar la lista de deseos de la persona que
          cumple, para que la organizadora (o cualquiera) sepa qué comprarle. No te olvides de
          completar la tuya en "Editar mi perfil" cuando te toque a ti.
        </p>

        <button onClick={close}>Entendido, ¡vamos!</button>
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(24px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
