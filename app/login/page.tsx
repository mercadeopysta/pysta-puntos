"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

type ProfileRow = {
  id: string
  full_name: string
  email: string
  password_text: string
  client_type: string
  is_active: boolean
}

export default function LoginPage() {
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
      .from("profiles")
      .select("id, full_name, email, password_text, client_type, is_active")
      .eq("email", email.trim())
      .eq("password_text", password)
      .maybeSingle()

    if (error) {
      setMensaje("Ocurrió un error al iniciar sesión.")
      setCargando(false)
      return
    }

    const cliente = data as ProfileRow | null

    if (!cliente) {
      setMensaje("Correo o contraseña incorrectos.")
      setCargando(false)
      return
    }

    if (!cliente.is_active) {
      setMensaje("Tu cuenta está inactiva. Comunícate con el administrador.")
      setCargando(false)
      return
    }

    localStorage.setItem("cliente_nombre", cliente.full_name || "")
    localStorage.setItem("cliente_email", cliente.email || "")
    localStorage.setItem("cliente_tipo", cliente.client_type || "")

    router.push("/dashboard")
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
              background: "linear-gradient(180deg, #111111 0%, #1f2937 100%)",
              color: "white",
              padding: "34px",
              display: "grid",
              alignContent: "center",
              gap: "16px",
            }}
          >
            <img
              src="/logo-pysta.png"
              alt="Pysta"
              style={{ width: "170px", filter: "brightness(1.1)" }}
            />

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
              Acceso de clientes
            </span>

            <h1 style={{ margin: 0, fontSize: "38px", lineHeight: 1.05 }}>
              Ingresa a tu cuenta
            </h1>

            <p style={{ margin: 0, color: "rgba(255,255,255,0.82)", lineHeight: 1.6 }}>
              Consulta tus puntos, revisa tus facturas cargadas y accede a tus premios
              disponibles dentro del programa Puntos Pysta.
            </p>
          </div>

          <div style={{ padding: "34px", display: "grid", gap: "18px" }}>
            <a href="/" className="pysta-link-back">
              ← Volver al inicio
            </a>

            <div style={{ display: "grid", gap: "8px" }}>
              <h2 style={{ margin: 0, fontSize: "30px", color: "#111" }}>
                Iniciar sesión
              </h2>
              <p style={{ margin: 0, color: "#6b7280" }}>
                Ingresa con tu correo y contraseña.
              </p>
            </div>

            <div className="pysta-grid" style={{ gap: "14px" }}>
              <input
                className="pysta-input"
                type="email"
                placeholder="Correo electrónico"
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
                {cargando ? "Ingresando..." : "Entrar"}
              </button>

              <a href="/registro" className="pysta-btn pysta-btn-gold">
                Registrarme
              </a>

              {mensaje && <p className="pysta-message">{mensaje}</p>}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}