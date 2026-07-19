"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      style={{ width: "auto", background: "transparent", color: "#c17a62", padding: "0.4rem 0.6rem" }}
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
    >
      Salir
    </button>
  );
}
