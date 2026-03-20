import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { supabase } from "./supabase"

const ADMIN_SESSION_HOURS = 12

type AdminRow = {
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

export async function cerrarSesionAdmin(router?: AppRouterInstance) {
  try {
    await supabase.auth.signOut()
  } catch (error) {
    console.error("Error cerrando sesión admin:", error)
  } finally {
    limpiarSesionAdmin()
    if (router) {
      router.replace("/admin/login")
    }
  }
}

export async function validarAccesoAdmin(
  router: AppRouterInstance
): Promise<boolean> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session?.user?.email) {
      await cerrarSesionAdmin(router)
      return false
    }

    const emailSesion = session.user.email.trim().toLowerCase()

    const { data, error } = await supabase
      .from("admin_users")
      .select("id, email")
      .eq("email", emailSesion)
      .maybeSingle()

    if (error || !data) {
      await cerrarSesionAdmin(router)
      return false
    }

    const admin = data as AdminRow
    const ahora = new Date()
    const expiracion = new Date(
      ahora.getTime() + ADMIN_SESSION_HOURS * 60 * 60 * 1000
    )

    localStorage.setItem("admin_logged_in", "true")
    localStorage.setItem("admin_email", admin.email || emailSesion)
    localStorage.setItem("admin_nombre", admin.email || "Administrador")
    localStorage.setItem("admin_login_at", ahora.toISOString())
    localStorage.setItem("admin_session_expires_at", expiracion.toISOString())

    return true
  } catch (error) {
    console.error("Error validando acceso admin:", error)
    await cerrarSesionAdmin(router)
    return false
  }
}

export async function obtenerAdminActual() {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session?.user?.email) {
      return null
    }

    const emailSesion = session.user.email.trim().toLowerCase()

    const { data, error } = await supabase
      .from("admin_users")
      .select("id, email")
      .eq("email", emailSesion)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    return data as AdminRow
  } catch (error) {
    console.error("Error obteniendo admin actual:", error)
    return null
  }
}