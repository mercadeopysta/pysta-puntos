"use client"

import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"

export default function AdminLogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error("Error cerrando sesión admin:", error)
    } finally {
      localStorage.removeItem("admin_logged_in")
      localStorage.removeItem("admin_email")
      localStorage.removeItem("admin_nombre")
      localStorage.removeItem("admin_login_at")
      localStorage.removeItem("admin_session_expires_at")
      router.replace("/admin/login")
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{
        border: "1px solid rgba(220,38,38,0.18)",
        background: "linear-gradient(180deg, #fff5f5 0%, #fff1f2 100%)",
        color: "#b91c1c",
        borderRadius: "14px",
        padding: "12px 16px",
        fontWeight: 800,
        cursor: "pointer",
        boxShadow: "0 8px 18px rgba(220,38,38,0.08)",
      }}
    >
      Cerrar sesión
    </button>
  )
}