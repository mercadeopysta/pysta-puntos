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
    } catch (error) {
      console.error("Error enviando recuperación:", error)
      setMensaje("Ocurrió un error inesperado al enviar la recuperación.")
    } finally {
      setCargando(false)
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f5f5f5 0%, #ececec 100%)",
        padding: "32px 20px",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1080px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "22px",
          alignItems: "stretch",
        }}
      >
        <section
          style={{
            background: "linear-gradient(135deg, #111111 0%, #1f1f1f 100%)",
            color: "white",
            borderRadius: "28px",
            padding: "38px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "620px",
          }}
        >
          <div>
            <div
              style={{
                width: "110px",
                height: "110px",
                borderRadius: "24px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                marginBottom: "24px",
              }}
            >
              <img
                src="/logo-pysta.png"
                alt="Pysta"
                style={{ maxWidth: "96px", maxHeight: "96px", objectFit: "contain" }}
              />
            </div>

            <span style={darkBadge}>Recuperación de acceso</span>

            <h1 style={titleDark}>
              Recupera tu
              <br />
              contraseña
            </h1>

            <p style={descDark}>
              Te enviaremos un enlace para que puedas crear una nueva contraseña y volver a entrar a tu cuenta.
            </p>
          </div>

          <div style={{ display: "grid", gap: "12px", marginTop: "28px" }}>
            <InfoMini texto="Proceso rápido y seguro" />
            <InfoMini texto="Recibe un enlace en tu correo" />
            <InfoMini texto="Define una nueva contraseña para volver a ingresar" />
          </div>
        </section>

        <section
          style={{
            background: "#ffffff",
            borderRadius: "28px",
            padding: "38px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.10)",
            minHeight: "620px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            border: "1px solid rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ marginBottom: "24px" }}>
            <span style={lightBadge}>Recuperar contraseña</span>

            <h2 style={titleLight}>Recuperar acceso</h2>

            <p style={descLight}>
              Escribe tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </p>
          </div>

          <div style={{ display: "grid", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Correo electrónico</label>
              <input
                className="campo-pysta"
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button onClick={handleRecuperar} disabled={cargando} style={primaryButton}>
              {cargando ? "Enviando..." : "Enviar enlace"}
            </button>

            <Link href="/login" style={secondaryLink}>
              Volver al login
            </Link>
          </div>

          {mensaje && <div style={messageBox}>{mensaje}</div>}
        </section>
      </div>

      <style>{inputStyles}</style>
    </main>
  )
}

function InfoMini({ texto }: { texto: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: "16px",
        padding: "14px 16px",
        color: "rgba(255,255,255,0.88)",
        fontSize: "14px",
        lineHeight: 1.5,
      }}
    >
      {texto}
    </div>
  )
}

const darkBadge = {
  display: "inline-flex",
  padding: "7px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700 as const,
  background: "rgba(212, 175, 55, 0.16)",
  color: "#f0d77a",
  border: "1px solid rgba(212, 175, 55, 0.24)",
}

const lightBadge = {
  display: "inline-flex",
  padding: "7px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700 as const,
  background: "rgba(212, 175, 55, 0.14)",
  color: "#7a5b00",
  border: "1px solid rgba(212, 175, 55, 0.24)",
}

const titleDark = {
  margin: "18px 0 0 0",
  fontSize: "42px",
  lineHeight: 1.08,
  fontWeight: 800 as const,
  letterSpacing: "-0.02em",
}

const descDark = {
  marginTop: "18px",
  color: "rgba(255,255,255,0.78)",
  fontSize: "16px",
  lineHeight: 1.6,
  maxWidth: "520px",
}

const titleLight = {
  margin: "16px 0 0 0",
  fontSize: "34px",
  color: "#111",
  lineHeight: 1.1,
}

const descLight = {
  margin: "12px 0 0 0",
  color: "#6b7280",
  lineHeight: 1.6,
  fontSize: "15px",
}

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  color: "#111",
  fontWeight: "bold" as const,
  fontSize: "14px",
}

const primaryButton = {
  background: "#111",
  color: "#fff",
  border: "none",
  padding: "15px 22px",
  borderRadius: "14px",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: 700 as const,
}

const secondaryLink = {
  textAlign: "center" as const,
  color: "#111",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: "15px",
}

const messageBox = {
  marginTop: "20px",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
  borderRadius: "16px",
  padding: "14px 16px",
  fontSize: "14px",
  lineHeight: 1.5,
}

const inputStyles = `
  .campo-pysta {
    width: 100%;
    padding: 15px 16px;
    border-radius: 14px;
    border: 1px solid #d1d5db;
    font-size: 16px;
    color: #111;
    background: #fff;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .campo-pysta:focus {
    border-color: #d4af37;
    box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.12);
  }

  .campo-pysta::placeholder {
    color: #8a8a8a;
  }
`