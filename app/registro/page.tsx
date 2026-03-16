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
        background: "#f5f5f5",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "760px",
          margin: "0 auto",
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
            Crear cuenta
          </span>

          <h1 style={{ margin: 0, fontSize: "32px", color: "#111" }}>
            Registro de cliente
          </h1>

          <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.5 }}>
            Registra tu cuenta para ingresar al programa de puntos. Tu acceso quedará pendiente de aprobación por el administrador.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
          }}
        >
          <input
            className="campo-pysta"
            placeholder="Nombre completo o razón social"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <select
            className="campo-pysta"
            value={clientType}
            onChange={(e) => setClientType(e.target.value)}
          >
            <option value="">Tipo de cliente</option>
            <option value="Mayorista">Mayorista</option>
            <option value="Distribuidor">Distribuidor</option>
          </select>

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

          <select
            className="campo-pysta"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
          >
            <option value="">Tipo de documento</option>
            <option value="CC">CC</option>
            <option value="NIT">NIT</option>
            <option value="OTRO">OTRO</option>
          </select>

          <input
            className="campo-pysta"
            placeholder="Número de documento"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
          />

          <input
            className="campo-pysta"
            placeholder="WhatsApp"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />

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

          <input
            className="campo-pysta"
            type="password"
            placeholder="Confirmar contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "22px" }}>
          <button
            onClick={handleRegistro}
            disabled={guardando}
            style={{
              background: "#111",
              color: "#fff",
              border: "none",
              padding: "14px 22px",
              borderRadius: "10px",
              cursor: guardando ? "not-allowed" : "pointer",
              opacity: guardando ? 0.7 : 1,
              fontSize: "16px",
            }}
          >
            {guardando ? "Guardando..." : "Crear cuenta"}
          </button>

          <Link
            href="/login"
            style={{
              background: "#e9e9e9",
              color: "#111",
              textDecoration: "none",
              padding: "14px 22px",
              borderRadius: "10px",
              display: "inline-block",
            }}
          >
            Ir a iniciar sesión
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