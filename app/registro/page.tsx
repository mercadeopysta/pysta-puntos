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
  const [whatsapp, setWhatsapp] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [asesores, setAsesores] = useState<Asesor[]>([])
  const [mensaje, setMensaje] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [cargandoAsesores, setCargandoAsesores] = useState(true)

  useEffect(() => {
    const cargarAsesores = async () => {
      setCargandoAsesores(true)

      const { data, error } = await supabase
        .from("advisors")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true })

      if (!error) {
        setAsesores((data as Asesor[]) || [])
      }

      setCargandoAsesores(false)
    }

    cargarAsesores()
  }, [])

  const limpiarFormulario = () => {
    setFullName("")
    setClientType("")
    setAdvisorName("")
    setDocumentType("")
    setDocumentNumber("")
    setWhatsapp("")
    setEmail("")
    setPassword("")
    setConfirmPassword("")
  }

  const handleRegistro = async () => {
    setMensaje("")

    if (!fullName || !documentType || !documentNumber || !email || !password || !confirmPassword) {
      setMensaje("Completa nombre, tipo de documento, número de documento, correo y contraseña.")
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
          full_name: fullName,
          client_type: clientType,
          advisor_name: advisorName,
          document_type: documentType,
          document_number: documentNumber,
          whatsapp,
          email: correo,
          is_active: true,
          is_approved: false,
        },
      ])

      if (profileError) {
        setMensaje("La cuenta auth se creó, pero ocurrió un error guardando el perfil: " + profileError.message)
        setGuardando(false)
        return
      }

      await supabase.auth.signOut()

      setMensaje("Registro creado correctamente. Tu cuenta quedó pendiente de aprobación por el administrador.")
      limpiarFormulario()

      setTimeout(() => {
        router.push("/login")
      }, 1800)
    } catch {
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
            justifyContent: "space-between",
            minHeight: "700px",
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

            <span style={darkBadge}>Programa de puntos Pysta</span>

            <h1
              style={{
                margin: "18px 0 0 0",
                fontSize: "42px",
                lineHeight: 1.08,
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              Crea tu cuenta
              <br />
              y activa tus beneficios
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
              Registra tus datos, selecciona tu asesor y accede al programa de puntos Pysta.
              Tu cuenta quedará pendiente de aprobación administrativa.
            </p>
          </div>

          <div style={{ display: "grid", gap: "12px", marginTop: "28px" }}>
            <InfoMini texto="Sube facturas y acumula puntos" />
            <InfoMini texto="Consulta premios disponibles según tu perfil" />
            <InfoMini texto="Redime beneficios de forma simple y rápida" />
          </div>
        </section>

        <section
          style={{
            background: "#ffffff",
            borderRadius: "28px",
            padding: "38px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.10)",
            minHeight: "700px",
            border: "1px solid rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ marginBottom: "24px" }}>
            <span style={lightBadge}>Registro clientes</span>

            <h2
              style={{
                margin: "16px 0 0 0",
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            <Field label="Nombre completo o razón social">
              <input className="campo-pysta" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>

            <Field label="Tipo de cliente">
              <select className="campo-pysta" value={clientType} onChange={(e) => setClientType(e.target.value)}>
                <option value="">Selecciona tipo</option>
                <option value="Mayorista">Mayorista</option>
                <option value="Distribuidor">Distribuidor</option>
              </select>
            </Field>

            <Field label="Asesor">
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
            </Field>

            <Field label="Tipo de documento">
              <select className="campo-pysta" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                <option value="">Selecciona tipo</option>
                <option value="CC">CC</option>
                <option value="NIT">NIT</option>
                <option value="OTRO">OTRO</option>
              </select>
            </Field>

            <Field label="Número de documento">
              <input className="campo-pysta" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
            </Field>

            <Field label="WhatsApp">
              <input className="campo-pysta" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </Field>

            <Field label="Correo electrónico">
              <input className="campo-pysta" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>

            <Field label="Contraseña">
              <input className="campo-pysta" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>

            <Field label="Confirmar contraseña">
              <input className="campo-pysta" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </Field>
          </div>

          <div style={{ display: "grid", gap: "14px", marginTop: "24px" }}>
            <button onClick={handleRegistro} disabled={guardando} style={primaryButton}>
              {guardando ? "Guardando..." : "Crear cuenta"}
            </button>

            <Link href="/login" style={secondaryLink}>
              Ya tengo cuenta
            </Link>
          </div>

          {mensaje && (
            <div style={messageBox}>
              {mensaje}
            </div>
          )}
        </section>
      </div>

      <style>{inputStyles}</style>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
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