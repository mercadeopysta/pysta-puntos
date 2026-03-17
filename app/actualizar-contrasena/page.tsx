"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

export default function ActualizarContrasenaPage() {
  const router = useRouter()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [cargando, setCargando] = useState(false)
  const [sesionLista, setSesionLista] = useState(false)
  const [tokenValido, setTokenValido] = useState(false)

  useEffect(() => {
    const prepararSesion = async () => {
      try {
        const hash = window.location.hash

        if (!hash) {
          setMensaje("El enlace de recuperación no es válido o ya expiró.")
          setSesionLista(true)
          setTokenValido(false)
          return
        }

        const hashParams = new URLSearchParams(hash.replace("#", ""))
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")
        const type = hashParams.get("type")

        if (!accessToken || !refreshToken || type !== "recovery") {
          setMensaje("El enlace de recuperación no es válido o ya expiró.")
          setSesionLista(true)
          setTokenValido(false)
          return
        }

        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) {
          setMensaje("No se pudo validar el enlace de recuperación.")
          setSesionLista(true)
          setTokenValido(false)
          return
        }

        setTokenValido(true)
        setSesionLista(true)
      } catch {
        setMensaje("Ocurrió un error preparando la recuperación.")
        setSesionLista(true)
        setTokenValido(false)
      }
    }

    prepararSesion()
  }, [])

  const handleActualizar = async () => {
    setMensaje("")

    if (!password || !confirmPassword) {
      setMensaje("Completa la nueva contraseña y su confirmación.")
      return
    }

    if (password.length < 6) {
      setMensaje("La nueva contraseña debe tener al menos 6 caracteres.")
      return
    }

    if (password !== confirmPassword) {
      setMensaje("La confirmación de la contraseña no coincide.")
      return
    }

    try {
      setCargando(true)

      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        setMensaje("Ocurrió un error al actualizar la contraseña: " + error.message)
        setCargando(false)
        return
      }

      setMensaje("Tu contraseña fue actualizada correctamente.")

      setTimeout(async () => {
        await supabase.auth.signOut()
        router.push("/login")
      }, 1500)
    } catch {
      setMensaje("Ocurrió un error inesperado al actualizar la contraseña.")
    } finally {
      setCargando(false)
    }
  }

  if (!sesionLista) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
          background: "#f5f5f5",
        }}
      >
        Preparando recuperación...
      </main>
    )
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

            <span
              style={{
                display: "inline-flex",
                padding: "7px 12px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 700,
                background: "rgba(212, 175, 55, 0.16)",
                color: "#f0d77a",
                border: "1px solid rgba(212, 175, 55, 0.24)",
              }}
            >
              Nueva contraseña
            </span>

            <h1
              style={{
                margin: "18px 0 0 0",
                fontSize: "42px",
                lineHeight: 1.08,
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              Actualiza tu
              <br />
              acceso
            </h1>

            <p
              style={{
                marginTop: "18px",
                color: "rgba(255,255,255,0.78)",
                fontSize: "16px",
                lineHeight: 1.6,
                maxWidth: "520px",
              }}
            >
              Define una nueva contraseña para volver a ingresar de forma segura a tu cuenta.
            </p>
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
            <span
              style={{
                display: "inline-flex",
                padding: "7px 12px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 700,
                background: "rgba(212, 175, 55, 0.14)",
                color: "#7a5b00",
                border: "1px solid rgba(212, 175, 55, 0.24)",
              }}
            >
              Actualizar contraseña
            </span>

            <h2 style={{ margin: "16px 0 0 0", fontSize: "34px", color: "#111", lineHeight: 1.1 }}>
              Crear nueva contraseña
            </h2>

            <p style={{ margin: "12px 0 0 0", color: "#6b7280", lineHeight: 1.6, fontSize: "15px" }}>
              Ingresa tu nueva contraseña y confirma el cambio para recuperar tu acceso.
            </p>
          </div>

          {tokenValido ? (
            <div style={{ display: "grid", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#111", fontWeight: "bold", fontSize: "14px" }}>
                  Nueva contraseña
                </label>
                <input
                  className="campo-pysta"
                  type="password"
                  placeholder="Escribe tu nueva contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#111", fontWeight: "bold", fontSize: "14px" }}>
                  Confirmar nueva contraseña
                </label>
                <input
                  className="campo-pysta"
                  type="password"
                  placeholder="Confirma tu nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <button
                onClick={handleActualizar}
                disabled={cargando}
                style={{
                  background: "#111",
                  color: "#fff",
                  border: "none",
                  padding: "15px 22px",
                  borderRadius: "14px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: 700,
                }}
              >
                {cargando ? "Actualizando..." : "Guardar nueva contraseña"}
              </button>
            </div>
          ) : (
            <div
              style={{
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                color: "#9a3412",
                borderRadius: "16px",
                padding: "14px 16px",
                fontSize: "14px",
                lineHeight: 1.5,
              }}
            >
              {mensaje || "El enlace no es válido. Solicita una nueva recuperación."}
            </div>
          )}

          <div style={{ marginTop: "16px" }}>
            <Link
              href="/login"
              style={{
                textAlign: "center",
                color: "#111",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: "15px",
                display: "block",
              }}
            >
              Volver al login
            </Link>
          </div>

          {tokenValido && mensaje && (
            <div
              style={{
                marginTop: "20px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1d4ed8",
                borderRadius: "16px",
                padding: "14px 16px",
                fontSize: "14px",
                lineHeight: 1.5,
              }}
            >
              {mensaje}
            </div>
          )}
        </section>
      </div>

      <style>{`
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
      `}</style>
    </main>
  )
}