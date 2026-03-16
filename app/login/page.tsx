"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [cargando, setCargando] = useState(false)

  const handleLogin = async () => {
    setMensaje("")

    if (!email.trim() || !password.trim()) {
      setMensaje("Ingresa tu correo y contraseña.")
      return
    }

    try {
      setCargando(true)

      const correo = email.trim().toLowerCase()

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: correo,
        password,
      })

      if (authError) {
        setMensaje("Correo o contraseña incorrectos.")
        setCargando(false)
        return
      }

      const user = authData.user

      if (!user) {
        setMensaje("No se pudo iniciar sesión correctamente.")
        setCargando(false)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, full_name, is_active, is_approved")
        .eq("id", user.id)
        .maybeSingle()

      if (profileError || !profile) {
        await supabase.auth.signOut()
        setMensaje("No se encontró el perfil del cliente.")
        setCargando(false)
        return
      }

      if (!profile.is_active) {
        await supabase.auth.signOut()
        setMensaje("Tu cuenta está inactiva. Comunícate con el administrador.")
        setCargando(false)
        return
      }

      if (!profile.is_approved) {
        await supabase.auth.signOut()
        setMensaje("Tu cuenta fue creada correctamente, pero aún está pendiente de aprobación por el administrador.")
        setCargando(false)
        return
      }

      localStorage.setItem("cliente_email", profile.email)
      localStorage.setItem("cliente_name", profile.full_name || "")

      router.push("/dashboard")
    } catch {
      setMensaje("Ocurrió un error inesperado al iniciar sesión.")
    } finally {
      setCargando(false)
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "#fff",
          borderRadius: "20px",
          padding: "32px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ display: "grid", gap: "8px", marginBottom: "22px" }}>
          <span
            style={{
              display: "inline-flex",
              width: "fit-content",
              padding: "6px 10px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: 700,
              background: "rgba(212, 175, 55, 0.14)",
              color: "#7a5b00",
              border: "1px solid rgba(212, 175, 55, 0.24)",
            }}
          >
            Acceso cliente
          </span>

          <h1 style={{ margin: 0, fontSize: "32px", color: "#111" }}>
            Iniciar sesión
          </h1>

          <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.5 }}>
            Ingresa con tu correo y contraseña para acceder a tus puntos y premios.
          </p>
        </div>

        <div style={{ display: "grid", gap: "16px" }}>
          <input
            className="campo-pysta"
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="campo-pysta"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleLogin}
            disabled={cargando}
            style={{
              background: "#111",
              color: "#fff",
              border: "none",
              padding: "14px 22px",
              borderRadius: "10px",
              cursor: cargando ? "not-allowed" : "pointer",
              opacity: cargando ? 0.7 : 1,
              fontSize: "16px",
            }}
          >
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>

          <Link
            href="/registro"
            style={{
              textAlign: "center",
              color: "#111",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Crear cuenta
          </Link>
        </div>

        {mensaje && (
          <div
            style={{
              marginTop: "18px",
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              color: "#9a3412",
              borderRadius: "14px",
              padding: "14px 16px",
            }}
          >
            {mensaje}
          </div>
        )}
      </div>

      <style>{`
        .campo-pysta {
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          border: 1px solid #d1d5db;
          font-size: 16px;
          color: #111;
          background: #fff;
          box-sizing: border-box;
        }

        .campo-pysta::placeholder {
          color: #666;
        }
      `}</style>
    </main>
  )
}