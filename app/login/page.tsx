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
        .select("id, email, full_name, client_type, is_active, is_approved")
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
      localStorage.setItem("cliente_tipo", profile.client_type || "")

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
                style={{
                  maxWidth: "96px",
                  maxHeight: "96px",
                  objectFit: "contain",
                }}
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
                marginBottom: "18px",
              }}
            >
              Bienvenido a Puntos Pysta
            </span>

            <h1
              style={{
                margin: 0,
                fontSize: "42px",
                lineHeight: 1.08,
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              Ingresa y gestiona
              <br />
              tus beneficios
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
              Accede a tu panel, revisa tus puntos, sube facturas, consulta premios disponibles
              y haz seguimiento a tus redenciones en un solo lugar.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: "12px",
              marginTop: "28px",
            }}
          >
            <InfoMini texto="Consulta tus puntos disponibles" />
            <InfoMini texto="Redime premios según tu perfil" />
            <InfoMini texto="Haz seguimiento al estado de tus facturas" />
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
                marginBottom: "16px",
              }}
            >
              Acceso clientes
            </span>

            <h2
              style={{
                margin: 0,
                fontSize: "34px",
                color: "#111",
                lineHeight: 1.1,
              }}
            >
              Iniciar sesión
            </h2>

            <p
              style={{
                margin: "12px 0 0 0",
                color: "#6b7280",
                lineHeight: 1.6,
                fontSize: "15px",
              }}
            >
              Ingresa con tu correo y contraseña para acceder a tus puntos, premios y facturas.
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

            <div>
              <label style={labelStyle}>Contraseña</label>
              <input
                className="campo-pysta"
                type="password"
                placeholder="Escribe tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              onClick={handleLogin}
              disabled={cargando}
              style={{
                background: "#111",
                color: "#fff",
                border: "none",
                padding: "15px 22px",
                borderRadius: "14px",
                cursor: cargando ? "not-allowed" : "pointer",
                opacity: cargando ? 0.7 : 1,
                fontSize: "16px",
                fontWeight: 700,
                marginTop: "4px",
              }}
            >
              {cargando ? "Ingresando..." : "Ingresar"}
            </button>

            <div
              style={{
                display: "grid",
                gap: "12px",
                marginTop: "6px",
              }}
            >
              <Link
                href="/olvide-mi-contrasena"
                style={linkStyle}
              >
                Olvidé mi contraseña
              </Link>

              <Link
                href="/registro"
                style={linkStyle}
              >
                Crear cuenta
              </Link>
            </div>
          </div>

          {mensaje && (
            <div
              style={{
                marginTop: "20px",
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                color: "#9a3412",
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

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  color: "#111",
  fontWeight: "bold" as const,
  fontSize: "14px",
}

const linkStyle = {
  textAlign: "center" as const,
  color: "#111",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: "15px",
}