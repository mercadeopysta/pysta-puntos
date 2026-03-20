import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { supabase } from "./supabase"

type AdminLookupRow = {
  id: string
  email: string
}

export function limpiarSesionAdmin() {
  if (typeof window === "undefined") return

  localStorage.removeItem("admin_logged_in")
  localStorage.removeItem("admin_email")
  localStorage.removeItem("admin_nombre")
  localStorage.removeItem("admin_login_at")
  localStorage.removeItem("admin_session_expires_at")
}

export async function validarAccesoAdmin(
  router: AppRouterInstance
): Promise<boolean> {
  if (typeof window === "undefined") return false

  const adminLogueado = localStorage.getItem("admin_logged_in")
  const adminEmail = (localStorage.getItem("admin_email") || "")
    .trim()
    .toLowerCase()
  const adminExpira = localStorage.getItem("admin_session_expires_at")

  if (adminLogueado !== "true" || !adminEmail || !adminExpira) {
    limpiarSesionAdmin()
    router.replace("/admin/login")
    return false
  }

  const ahora = new Date()
  const expiracion = new Date(adminExpira)

  if (Number.isNaN(expiracion.getTime()) || expiracion < ahora) {
    limpiarSesionAdmin()
    await supabase.auth.signOut()
    router.replace("/admin/login")
    return false
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session?.user?.email) {
    limpiarSesionAdmin()
    router.replace("/admin/login")
    return false
  }

  const emailSesion = session.user.email.trim().toLowerCase()

  if (emailSesion !== adminEmail) {
    limpiarSesionAdmin()
    await supabase.auth.signOut()
    router.replace("/admin/login")
    return false
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("id, email")
    .eq("email", emailSesion)
    .maybeSingle()

  if (error || !data) {
    limpiarSesionAdmin()
    await supabase.auth.signOut()
    router.replace("/admin/login")
    return false
  }

  const admin = data as AdminLookupRow

  localStorage.setItem("admin_email", admin.email || adminEmail)
  localStorage.setItem("admin_nombre", admin.email || "Administrador")

  return true
}