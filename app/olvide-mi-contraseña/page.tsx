"use client"

import { useState } from "react"
import Link from "next/link"
import { supabase } from "../../lib/supabase"

export default function OlvideMiContrasenaPage() {
  const [email, setEmail] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [cargando, setCargando] = useState(false)

  const handleRecuperar = async () => {
    setMensaje("")

    if (!email.trim()) {
      setMensaje("Ingresa tu correo electrónico.")
      return
    }

    try {
      setCargando(true)

      const correo = email.trim().toLowerCase()

      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/actualizar-contrasena`
          : undefined

      const { error } = await supabase.auth.resetPasswordForEmail(correo, {
        redirectTo,
      })

      if (error) {
        setMensaje("Ocurrió un error al enviar el correo de recuperación: " + error.message)
        setCargando(false)
        return
      }

      setMensaje("Si el correo existe, te enviamos un enlace para restablecer tu contraseña.")
      setEmail("")
    } catch {
      setMensaje("Ocurrió un error inesperado al enviar la recuperación.")
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
            Recuperar acceso
          </span>

          <h1 style={{ margin: 0, fontSize: "32px", color: "#111" }}>
            Recuperar contraseña
          </h1>

          <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.5 }}>
            Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.
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

          <button
            onClick={handleRecuperar}
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
            {cargando ? "Enviando..." : "Enviar enlace"}
          </button>

          <Link
            href="/login"
            style={{
              textAlign: "center",
              color: "#111",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Volver al login
          </Link>
        </div>

        {mensaje && (
          <div
            style={{
              marginTop: "18px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1d4ed8",
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