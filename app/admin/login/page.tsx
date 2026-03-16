"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"

type AdminUser = {
  id: string
  email: string
  password: string
  created_at: string
}

export default function AdminLoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [cargando, setCargando] = useState(false)

  const handleLogin = async () => {
    setMensaje("")

    if (!email || !password) {
      setMensaje("Completa correo y contraseña.")
      return
    }

    setCargando(true)

    const { data, error } = await supabase
      .from("admin_users")
      .select("id, email, password, created_at")
      .eq("email", email.trim())
      .eq("password", password)
      .maybeSingle()

    if (error) {
      setMensaje("Ocurrió un error al iniciar sesión como admin.")
      setCargando(false)
      return
    }

    const admin = data as AdminUser | null

    if (!admin) {
      setMensaje("Credenciales de administrador incorrectas.")
      setCargando(false)
      return
    }

    localStorage.setItem("admin_logged_in", "true")
    localStorage.setItem("admin_email", admin.email || "")
    localStorage.setItem("admin_nombre", admin.email || "Administrador")

    router.push("/admin/clientes")
  }

  return (
    <main className="pysta-page" style={{ display: "flex", alignItems: "center" }}>
      <div className="pysta-shell" style={{ maxWidth: "1080px" }}>
        <section
          className="pysta-card"
          style={{
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          }}
        >
          <div
            style={{
              background: "linear-gradient(180deg, #111111 0%, #242424 100%)",
              color: "white",
              padding: "34px",
              display: "grid",
              alignContent: "center",
              gap: "16px",
            }}
          >
            <img src="/logo-pysta.png" alt="Pysta" style={{ width: "170px" }} />

            <span
              style={{
                display: "inline-flex",
                width: "fit-content",
                background: "rgba(212, 175, 55, 0.18)",
                color: "#f3d46f",
                border: "1px solid rgba(212,175,55,0.28)",
                padding: "8px 12px",
                borderRadius: "999px",
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              Acceso administrativo
            </span>

            <h1 style={{ margin: 0, fontSize: "38px", lineHeight: 1.05 }}>
              Panel de administración
            </h1>

            <p style={{ margin: 0, color: "rgba(255,255,255,0.82)", lineHeight: 1.6 }}>
              Administra clientes, facturas, premios, redenciones, asesores y configuración
              general del sistema.
            </p>
          </div>

          <div style={{ padding: "34px", display: "grid", gap: "18px" }}>
            <a href="/" className="pysta-link-back">
              ← Volver al inicio
            </a>

            <div style={{ display: "grid", gap: "8px" }}>
              <h2 style={{ margin: 0, fontSize: "30px", color: "#111" }}>
                Login administrador
              </h2>
              <p style={{ margin: 0, color: "#6b7280" }}>
                Ingresa tus credenciales para acceder al panel.
              </p>
            </div>

            <div className="pysta-grid" style={{ gap: "14px" }}>
              <input
                className="pysta-input"
                type="email"
                placeholder="Correo administrador"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                className="pysta-input"
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                onClick={handleLogin}
                disabled={cargando}
                className="pysta-btn pysta-btn-dark"
                style={{ opacity: cargando ? 0.7 : 1 }}
              >
                {cargando ? "Ingresando..." : "Entrar como admin"}
              </button>

              {mensaje && <p className="pysta-message">{mensaje}</p>}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}