"use client"

import { ChangeEvent, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../../lib/supabase"
import LogoutButton from "../../../../components/LogoutButton"

type SettingsRow = {
  redemption_percentage: number
}

export default function NuevaFacturaPage() {
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [invoiceDate, setInvoiceDate] = useState("")
  const [amountWithoutVat, setAmountWithoutVat] = useState("")
  const [notes, setNotes] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [mensaje, setMensaje] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [nombreCliente, setNombreCliente] = useState("")
  const [redemptionPercentage, setRedemptionPercentage] = useState(6)

  const cerrarSesionCliente = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem("cliente_email")
    localStorage.removeItem("cliente_name")
    localStorage.removeItem("cliente_tipo")
    router.replace("/login")
  }

  useEffect(() => {
    const validarCliente = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
          await cerrarSesionCliente()
          return
        }

        const user = session.user

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, full_name, client_type, is_active, is_approved")
          .eq("id", user.id)
          .maybeSingle()

        if (profileError || !profile) {
          await cerrarSesionCliente()
          return
        }

        if (!profile.is_active || !profile.is_approved) {
          await cerrarSesionCliente()
          return
        }

        localStorage.setItem("cliente_email", profile.email || "")
        localStorage.setItem("cliente_name", profile.full_name || "")
        localStorage.setItem("cliente_tipo", profile.client_type || "")

        setNombreCliente(profile.full_name || "")
        setAutorizado(true)

        const { data: settingsData } = await supabase
          .from("settings")
          .select("redemption_percentage")
          .limit(1)
          .single()

        const settings = settingsData as SettingsRow | null
        setRedemptionPercentage(Number(settings?.redemption_percentage || 6))
      } catch {
        await cerrarSesionCliente()
      } finally {
        setCargando(false)
      }
    }

    validarCliente()
  }, [router])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    setFile(selectedFile)
  }

  const handleAmountChange = (value: string) => {
    const soloNumeros = value.replace(/\D/g, "")
    setAmountWithoutVat(soloNumeros)
  }

  const subirArchivo = async () => {
    if (!file) {
      throw new Error("Debes adjuntar la foto o el PDF de la factura.")
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || ""
    const allowed = ["jpg", "jpeg", "png", "webp", "pdf"]

    if (!allowed.includes(extension)) {
      throw new Error("Solo se permiten archivos JPG, PNG, WEBP o PDF.")
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`

    const { error } = await supabase.storage
      .from("invoice-files")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })

    if (error) {
      throw new Error(error.message)
    }

    const { data } = supabase.storage
      .from("invoice-files")
      .getPublicUrl(fileName)

    return {
      fileUrl: data.publicUrl,
      fileName: file.name,
    }
  }

  const handleGuardarFactura = async () => {
    setMensaje("")

    const userEmail = localStorage.getItem("cliente_email")

    if (!userEmail) {
      setMensaje("No se encontró el usuario logueado.")
      return
    }

    if (!invoiceNumber || !invoiceDate || !amountWithoutVat) {
      setMensaje("Completa número de factura, fecha y valor sin IVA.")
      return
    }

    if (!file) {
      setMensaje("Debes adjuntar la foto o el PDF de la factura.")
      return
    }

    if (Number(amountWithoutVat) <= 0) {
      setMensaje("El valor sin IVA debe ser mayor a 0.")
      return
    }

    const { data: existingInvoice, error: existingInvoiceError } = await supabase
      .from("invoices")
      .select("id")
      .eq("invoice_number", invoiceNumber.trim())
      .maybeSingle()

    if (existingInvoiceError) {
      setMensaje("No se pudo validar el número de factura.")
      return
    }

    if (existingInvoice) {
      setMensaje("Ya existe una factura registrada con ese número.")
      return
    }

    try {
      setGuardando(true)

      const { fileUrl, fileName } = await subirArchivo()

      const { error } = await supabase.from("invoices").insert([
        {
          user_email: userEmail,
          invoice_number: invoiceNumber.trim(),
          invoice_date: invoiceDate,
          amount_without_vat: Number(amountWithoutVat),
          notes,
          file_url: fileUrl,
          file_name: fileName,
        },
      ])

      if (error) {
        if (
          error.message.toLowerCase().includes("duplicate") ||
          error.message.toLowerCase().includes("unique")
        ) {
          setMensaje("Ya existe una factura registrada con ese número.")
        } else {
          setMensaje("Ocurrió un error al guardar la factura: " + error.message)
        }
        setGuardando(false)
        return
      }

      setMensaje("Factura guardada correctamente.")
      setInvoiceNumber("")
      setInvoiceDate("")
      setAmountWithoutVat("")
      setNotes("")
      setFile(null)

      const fileInput = document.getElementById("invoice-file-input") as HTMLInputElement | null
      if (fileInput) {
        fileInput.value = ""
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Ocurrió un error al subir el archivo."
      setMensaje(errorMessage)
    } finally {
      setGuardando(false)
    }
  }

  const valorNumerico = useMemo(() => {
    const valor = Number(amountWithoutVat)
    return Number.isFinite(valor) ? valor : 0
  }, [amountWithoutVat])

  const valorFormateado = useMemo(() => {
    if (valorNumerico <= 0) return "$0"
    return `$${valorNumerico.toLocaleString("es-CO")}`
  }, [valorNumerico])

  const puntosEstimados = useMemo(() => {
    if (valorNumerico <= 0) return 0
    const valorInterno = valorNumerico * (redemptionPercentage / 100)
    return Math.floor(valorInterno / 100)
  }, [valorNumerico, redemptionPercentage])

  if (cargando) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
          background: "#f5f5f5",
          padding: "20px",
        }}
      >
        Validando acceso...
      </main>
    )
  }

  if (!autorizado) {
    return null
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f5f5f5 0%, #ececec 100%)",
        padding: "20px 14px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
        <section
          style={{
            background: "#ffffff",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 14px 40px rgba(0,0,0,0.08)",
            marginBottom: "22px",
            border: "1px solid rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "18px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <div
                style={{
                  width: "84px",
                  height: "84px",
                  borderRadius: "18px",
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                  flexShrink: 0,
                }}
              >
                <img
                  src="/logo-pysta.png"
                  alt="Pysta"
                  style={{
                    maxWidth: "76px",
                    maxHeight: "76px",
                    objectFit: "contain",
                  }}
                />
              </div>

              <div style={{ display: "grid", gap: "8px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    width: "fit-content",
                    padding: "6px 12px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: 700,
                    background: "rgba(212, 175, 55, 0.14)",
                    color: "#7a5b00",
                    border: "1px solid rgba(212, 175, 55, 0.24)",
                  }}
                >
                  Registro de facturas
                </span>

                <h1 style={{ margin: 0, fontSize: "32px", color: "#111", lineHeight: 1.1 }}>
                  Registrar factura
                </h1>

                <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
                  {nombreCliente ? `Cliente: ${nombreCliente}` : "Sube una nueva factura para validación"}
                </p>
              </div>
            </div>

            <LogoutButton />
          </div>
        </section>

        <div className="factura-layout">
          <section
            style={{
              background: "#fff",
              borderRadius: "24px",
              padding: "24px",
              boxShadow: "0 14px 40px rgba(0,0,0,0.08)",
              border: "1px solid rgba(0,0,0,0.04)",
              minWidth: 0,
            }}
          >
            <div style={{ marginBottom: "22px" }}>
              <h2 style={{ margin: 0, fontSize: "26px", color: "#111" }}>Datos de la factura</h2>
              <p style={{ margin: "8px 0 0 0", color: "#6b7280", lineHeight: 1.5 }}>
                Completa la información y adjunta la foto o PDF de la factura para que pueda ser revisada.
              </p>
            </div>

            <div className="factura-form-grid">
              <Field label="Número de factura">
                <input
                  className="campo-pysta"
                  type="text"
                  placeholder="Ej: FAC-001245"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </Field>

              <Field label="Fecha de la factura">
                <input
                  className="campo-pysta"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </Field>

              <div>
                <label style={labelStyle}>Valor sin IVA</label>
                <input
                  className="campo-pysta"
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej: 1000000"
                  value={amountWithoutVat}
                  onChange={(e) => handleAmountChange(e.target.value)}
                />
                <p style={helperText}>Vista en pesos: {valorFormateado}</p>
              </div>

              <div className="full-width">
                <label style={labelStyle}>Adjuntar foto o PDF de la factura *</label>

                <div
                  style={{
                    border: "1px dashed #d1d5db",
                    borderRadius: "18px",
                    padding: "18px",
                    background: "#fafafa",
                  }}
                >
                  <input
                    id="invoice-file-input"
                    className="campo-pysta"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={handleFileChange}
                  />

                  <p style={{ margin: "12px 0 0 0", color: "#6b7280", fontSize: "14px" }}>
                    Formatos permitidos: JPG, PNG, WEBP o PDF.
                  </p>

                  {file && (
                    <div
                      style={{
                        marginTop: "14px",
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "14px",
                        padding: "12px 14px",
                        color: "#111",
                        fontSize: "14px",
                        fontWeight: 700,
                        wordBreak: "break-word",
                      }}
                    >
                      Archivo seleccionado: {file.name}
                    </div>
                  )}
                </div>
              </div>

              <div className="full-width">
                <Field label="Observaciones">
                  <textarea
                    className="campo-pysta"
                    placeholder="Escribe alguna observación si la necesitas"
                    rows={5}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ resize: "vertical" }}
                  />
                </Field>
              </div>
            </div>

            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "24px" }}>
              <button onClick={handleGuardarFactura} disabled={guardando} style={primaryButton}>
                {guardando ? "Guardando..." : "Guardar factura"}
              </button>

              <a href="/dashboard" style={secondaryButton}>
                Volver al panel
              </a>
            </div>

            {mensaje && (
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

          <aside
            style={{
              background: "linear-gradient(135deg, #111111 0%, #1f1f1f 100%)",
              color: "white",
              borderRadius: "24px",
              padding: "24px",
              boxShadow: "0 14px 40px rgba(0,0,0,0.12)",
              display: "grid",
              alignContent: "start",
              gap: "16px",
              minWidth: 0,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                width: "fit-content",
                padding: "7px 12px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 700,
                background: "rgba(212, 175, 55, 0.16)",
                color: "#f0d77a",
                border: "1px solid rgba(212, 175, 55, 0.24)",
              }}
            >
              Vista en tiempo real
            </span>

            <h3 style={{ margin: 0, fontSize: "28px", lineHeight: 1.15 }}>
              Resumen estimado
            </h3>

            <p style={{ margin: 0, color: "rgba(255,255,255,0.78)", lineHeight: 1.6 }}>
              A medida que escribes el valor, aquí verás una estimación sencilla antes de enviar tu factura.
            </p>

            <TipCard texto={`Valor ingresado: ${valorFormateado}`} />
            <TipCard texto={`Puntos aproximados: ${puntosEstimados}`} />
          </aside>
        </div>
      </div>

      <style>{`
        .factura-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
          gap: 22px;
        }

        .factura-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .full-width {
          grid-column: 1 / -1;
        }

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
          min-width: 0;
        }

        .campo-pysta:focus {
          border-color: #d4af37;
          box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.12);
        }

        .campo-pysta::placeholder {
          color: #8a8a8a;
        }

        @media (max-width: 900px) {
          .factura-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .factura-form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
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

function TipCard({ texto }: { texto: string }) {
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
        wordBreak: "break-word",
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

const helperText = {
  color: "#6b7280",
  fontSize: "13px",
  marginTop: "8px",
  lineHeight: 1.5,
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

const secondaryButton = {
  background: "#e9e9e9",
  color: "#111",
  textDecoration: "none",
  padding: "15px 22px",
  borderRadius: "14px",
  display: "inline-block",
  fontWeight: 700 as const,
}