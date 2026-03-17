"use client"

import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"

export default function AdminLogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()

    localStorage.removeItem("admin_logged_in")

    router.replace("/admin/login")
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        backgroundColor: "#111",
        color: "white",
        border: "none",
        padding: "12px 18px",
        borderRadius: "10px",
        cursor: "pointer",
        fontSize: "15px",
        fontWeight: "bold",
      }}
    >
      Cerrar sesión
    </button>
  )
}