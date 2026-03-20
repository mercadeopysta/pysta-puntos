"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

type Asesor = {
  id: string
  name: string
  is_active: boolean
}

export default function RegistroPage() {
  const router = useRouter()

  const [fullName, setFullName] = useState("")
  const [clientType, setClientType] = useState("")
  const [advisorName, setAdvisorName] = useState("")
  const [documentType, setDocumentType] = useState("")
  const [documentNumber, setDocumentNumber] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [acceptDataPolicy, setAcceptDataPolicy] = useState(false)

  const [asesores, setAsesores] = useState<Asesor[]>([])
  const [mensaje, setMensaje] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [cargandoAsesores, setCargandoAsesores] = useState(true)

  useEffect(() => {
    const cargarAsesores = async () => {
      try {
        setCargandoAsesores(true)

        const { data, error } = await supabase
          .from("advisors")
          .select("id, name, is_active")
          .eq("is_active", true)
          .order("name", { ascending: true })

        if (!error && data) {
          setAsesores(data as Asesor[])
        }
      } catch (error) {
        console.error("Error cargando asesores:", error)
      } finally {
        setCargandoAsesores(false)
      }
    }

    cargarAsesores()
  }, [])

  const limpiarFormulario = () => {
    setFullName("")
    setClientType("")
    setAdvisorName("")
    setDocumentType("")
    setDocumentNumber("")
    setPhone("")
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setAcceptDataPolicy(false)
  }

  const handleRegistro = async () => {
    setMensaje("")

    if (
      !fullName.trim() ||
      !clientType.trim() ||
      !documentType.trim() ||
      !documentNumber.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      setMensaje(
        "Completa nombre, tipo de cliente, tipo de documento, documento, correo y contraseña."
      )
      return
    }

    if (!acceptDataPolicy) {
      setMensaje(
        "Debes aceptar la política de tratamiento de datos para crear tu cuenta."
      )
      return
    }

    if (password.length < 6) {
      setMensaje("La contraseña debe tener al menos 6 caracteres.")
      return
    }

    if (password !== confirmPassword) {
      setMensaje("La confirmación de la contraseña no coincide.")
      return
    }

    try {
      setGuardando(true)

      const correo = email.trim().toLowerCase()

      const { data: existente, error: errorBusqueda } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", correo)
        .maybeSingle()

      if (errorBusqueda) {
        setMensaje("Ocurrió un error validando el correo.")
        setGuardando(false)
        return
      }

      if (existente) {
        setMensaje("Ya existe una cuenta registrada con ese correo.")
        setGuardando(false)
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: correo,
        password,
      })

      if (authError) {
        setMensaje("Ocurrió un error al crear la cuenta: " + authError.message)
        setGuardando(false)
        return
      }

      const userId = authData.user?.id

      if (!userId) {
        setMensaje("No se pudo crear el usuario correctamente.")
        setGuardando(false)
        return
      }

      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: userId,
          full_name: fullName.trim(),
          client_type: clientType,
          advisor_name: advisorName || null,
          document_type: documentType,
          document_number: documentNumber.trim(),
          phone: phone.trim() || null,
          email: correo,
          is_active: true,
          is_approved: false,
        },
      ])

      if (profileError) {
        setMensaje(
          "La cuenta se creó, pero ocurrió un error guardando el perfil: " +
            profileError.message
        )
        setGuardando(false)
        return
      }

      await supabase.auth.signOut()

      setMensaje(
        "Registro creado correctamente. Tu cuenta quedó pendiente de aprobación por el administrador."
      )
      limpiarFormulario()

      setTimeout(() => {
        router.push("/login")
      }, 1800)
    } catch (error) {
      console.error("Error en registro:", error)
      setMensaje("Ocurrió un error inesperado al registrar la cuenta.")
    } finally {
      setGuardando(false)
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
          maxWidth: "1180px",
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
            justifyContent: "flex-start",
            minHeight: "620px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
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
              Crear cuenta en Puntos Pysta
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
              Regístrate y activa
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
              Crea tu cuenta para enviar facturas, acumular puntos, consultar
              premios y hacer seguimiento a tus solicitudes dentro del programa
              Puntos Pysta.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: "12px",
              marginTop: "26px",
            }}
          >
            <InfoMini texto="Tu cuenta quedará pendiente de aprobación administrativa" />
            <InfoMini texto="Podrás consultar puntos, premios y redenciones" />
            <InfoMini texto="Acepta la política de datos antes de registrarte" />
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
              Registro clientes
            </span>

            <h2
              style={{
                margin: 0,
                fontSize: "34px",
                color: "#111",
                lineHeight: 1.1,
              }}
            >
              Crear cuenta
            </h2>

            <p
              style={{
                margin: "12px 0 0 0",
                color: "#6b7280",
                lineHeight: 1.6,
                fontSize: "15px",
              }}
            >
              Completa tus datos para solicitar acceso al programa de puntos.
            </p>
          </div>

          <div style={{ display: "grid", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Nombre completo</label>
              <input
                className="campo-pysta"
                type="text"
                placeholder="Escribe tu nombre completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
              }}
            >
              <div>
                <label style={labelStyle}>Tipo de cliente</label>
                <select
                  className="campo-pysta"
                  value={clientType}
                  onChange={(e) => setClientType(e.target.value)}
                >
                  <option value="">Selecciona tipo</option>
                  <option value="Mayorista">Mayorista</option>
                  <option value="Distribuidor">Distribuidor</option>
                  <option value="Taller">Taller</option>
                  <option value="Almacén">Almacén</option>
                  <option value="Cliente final">Cliente final</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Asesor</label>
                <select
                  className="campo-pysta"
                  value={advisorName}
                  onChange={(e) => setAdvisorName(e.target.value)}
                  disabled={cargandoAsesores}
                >
                  <option value="">
                    {cargandoAsesores ? "Cargando asesores..." : "Selecciona asesor"}
                  </option>
                  {asesores.map((asesor) => (
                    <option key={asesor.id} value={asesor.name}>
                      {asesor.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
              }}
            >
              <div>
                <label style={labelStyle}>Tipo de documento</label>
                <select
                  className="campo-pysta"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                >
                  <option value="">Selecciona tipo</option>
                  <option value="CC">CC</option>
                  <option value="NIT">NIT</option>
                  <option value="CE">CE</option>
                  <option value="OTRO">OTRO</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Número de documento</label>
                <input
                  className="campo-pysta"
                  type="text"
                  placeholder="Escribe el documento"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
              }}
            >
              <div>
                <label style={labelStyle}>Teléfono</label>
                <input
                  className="campo-pysta"
                  type="text"
                  placeholder="Escribe tu teléfono"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

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
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
              }}
            >
              <div>
                <label style={labelStyle}>Contraseña</label>
                <input
                  className="campo-pysta"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>Confirmar contraseña</label>
                <input
                  className="campo-pysta"
                  type="password"
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !guardando) handleRegistro()
                  }}
                />
              </div>
            </div>

            <div
              style={{
                background: "#fafafa",
                border: "1px solid #e5e7eb",
                borderRadius: "16px",
                padding: "16px",
                display: "grid",
                gap: "14px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  cursor: "pointer",
                  color: "#374151",
                  fontSize: "14px",
                  lineHeight: 1.5,
                }}
              >
                <input
                  type="checkbox"
                  checked={acceptDataPolicy}
                  onChange={(e) => setAcceptDataPolicy(e.target.checked)}
                  style={{
                    marginTop: "2px",
                    accentColor: "#111",
                  }}
                />
                <span>
                  Autorizo el tratamiento de mis datos personales conforme a la
                  política de tratamiento de datos personales de Pysta.
                </span>
              </label>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <Link href="/politica-de-datos" style={secondaryButtonStyle}>
                  Ver políticas
                </Link>
              </div>
            </div>

            <button
              onClick={handleRegistro}
              disabled={guardando}
              style={{
                background: "#111",
                color: "#fff",
                border: "none",
                padding: "15px 22px",
                borderRadius: "14px",
                cursor: guardando ? "not-allowed" : "pointer",
                opacity: guardando ? 0.7 : 1,
                fontSize: "16px",
                fontWeight: 700,
                marginTop: "4px",
              }}
            >
              {guardando ? "Creando cuenta..." : "Crear cuenta"}
            </button>

            <div
              style={{
                display: "grid",
                gap: "12px",
                marginTop: "6px",
              }}
            >
              <Link href="/login" style={linkStyle}>
                Ya tengo cuenta
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
          appearance: none;
        }

        .campo-pysta:focus {
          border-color: #d4af37;
          box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.12);
        }

        .campo-pysta::placeholder {
          color: #8a8a8a;
        }

        @media (max-width: 640px) {
          main {
            padding: 20px 14px !important;
          }
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

const secondaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  background: "#fff",
  color: "#111",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  padding: "10px 14px",
  fontWeight: 700,
  fontSize: "14px",
}