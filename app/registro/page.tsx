"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

type Asesor = {
  id: string
  name: string
  is_active: boolean
}

export default function RegistroPage() {
  const [fullName, setFullName] = useState("")
  const [clientType, setClientType] = useState("")
  const [advisorName, setAdvisorName] = useState("")
  const [documentType, setDocumentType] = useState("")
  const [documentNumber, setDocumentNumber] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [asesores, setAsesores] = useState<Asesor[]>([])

  useEffect(() => {
    const cargarAsesores = async () => {
      const { data } = await supabase
        .from("advisors")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true })

      setAsesores((data as Asesor[]) || [])
    }

    cargarAsesores()
  }, [])

  const handleRegistro = async () => {
    setMensaje("")

    if (
      !fullName ||
      !clientType ||
      !documentType ||
      !documentNumber ||
      !whatsapp ||
      !email ||
      !password
    ) {
      setMensaje("Completa todos los campos obligatorios.")
      return
    }

    setGuardando(true)

    const { data: existente } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.trim())
      .maybeSingle()

    if (existente) {
      setMensaje("Ya existe un usuario registrado con ese correo.")
      setGuardando(false)
      return
    }

    const { error } = await supabase.from("profiles").insert([
      {
        full_name: fullName,
        client_type: clientType,
        advisor_name: advisorName,
        document_type: documentType,
        document_number: documentNumber,
        whatsapp,
        email: email.trim(),
        password_text: password,
        is_active: true,
      },
    ])

    if (error) {
      setMensaje("Ocurrió un error al registrar el usuario: " + error.message)
      setGuardando(false)
      return
    }

    setMensaje("Registro exitoso. Ya puedes iniciar sesión.")
    setFullName("")
    setClientType("")
    setAdvisorName("")
    setDocumentType("")
    setDocumentNumber("")
    setWhatsapp("")
    setEmail("")
    setPassword("")
    setGuardando(false)
  }

  return (
    <main className="pysta-page">
      <div className="pysta-shell" style={{ maxWidth: "900px" }}>
        <section className="pysta-card" style={{ padding: "32px" }}>
          <div className="pysta-topbar" style={{ marginBottom: "24px" }}>
            <a href="/" className="pysta-link-back">
              ← Volver al inicio
            </a>

            <img
              src="/logo-pysta.png"
              alt="Pysta"
              style={{ width: "150px" }}
            />
          </div>

          <div style={{ display: "grid", gap: "10px", marginBottom: "24px" }}>
            <span className="pysta-badge">Registro de clientes</span>
            <h1 className="pysta-section-title">Crea tu cuenta en Puntos Pysta</h1>
            <p className="pysta-subtitle">
              Completa tus datos para ingresar al programa y empezar a acumular puntos.
            </p>
          </div>

          <div className="pysta-grid-2">
            <input
              className="pysta-input"
              type="text"
              placeholder="Nombre completo o razón social"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <select
              className="pysta-select"
              value={clientType}
              onChange={(e) => setClientType(e.target.value)}
            >
              <option value="">Selecciona tipo de cliente</option>
              <option value="Mayorista">Mayorista</option>
              <option value="Distribuidor">Distribuidor</option>
            </select>

            <select
              className="pysta-select"
              value={advisorName}
              onChange={(e) => setAdvisorName(e.target.value)}
            >
              <option value="">Selecciona asesor</option>
              {asesores.map((asesor) => (
                <option key={asesor.id} value={asesor.name}>
                  {asesor.name}
                </option>
              ))}
            </select>

            <select
              className="pysta-select"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
            >
              <option value="">Selecciona tipo de documento</option>
              <option value="CC">CC</option>
              <option value="NIT">NIT</option>
              <option value="OTRO">OTRO</option>
            </select>

            <input
              className="pysta-input"
              type="text"
              placeholder="Número de documento"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
            />

            <input
              className="pysta-input"
              type="text"
              placeholder="WhatsApp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />

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
          </div>

          <div className="pysta-actions" style={{ marginTop: "24px" }}>
            <button
              onClick={handleRegistro}
              disabled={guardando}
              className="pysta-btn pysta-btn-dark"
              style={{ opacity: guardando ? 0.7 : 1 }}
            >
              {guardando ? "Registrando..." : "Registrarme"}
            </button>

            <a href="/login" className="pysta-btn pysta-btn-gold">
              Iniciar sesión
            </a>
          </div>

          {mensaje && (
            <div style={{ marginTop: "18px" }}>
              <p className="pysta-message">{mensaje}</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}