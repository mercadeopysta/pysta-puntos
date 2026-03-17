"use client"

import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()

    localStorage.removeItem("cliente_email")
    localStorage.removeItem("cliente_name")
    localStorage.removeItem("cliente_tipo")

    router.replace("/login")
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        background: "linear-gradient(135deg, #111111 0%, #1f1f1f 100%)",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "12px 18px",
        borderRadius: "14px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 700,
        boxShadow: "0 10px 24px rgba(0,0,0,0.10)",
      }}
    >
      Cerrar sesión
    </button>
  )
}