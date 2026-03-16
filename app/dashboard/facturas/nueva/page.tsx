"use client"

import { ChangeEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../../lib/supabase"
import LogoutButton from "../../../../components/LogoutButton"

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

        setAutorizado(true)
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

  if (cargando) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
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
    <main style={{ minHeight: "100vh", backgroundColor: "#f5f5f5", padding: "40px", fontFamily: "Arial, sans-serif" }}>
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          backgroundColor: "white",
          padding: "30px",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "10px",
          }}
        >
          <h1 style={{ fontSize: "32px", color: "#111", margin: 0 }}>
            Registrar factura
          </h1>

          <LogoutButton />
        </div>

        <p style={{ color: "#555", marginBottom: "30px" }}>
          Ingresa los datos de tu factura y adjunta obligatoriamente la foto o el PDF para validación.
        </p>

        <div style={{ display: "grid", gap: "16px" }}>
          <input
            className="campo-pysta"
            type="text"
            placeholder="Número de factura"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
          />

          <input
            className="campo-pysta"
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
          />

          <input
            className="campo-pysta"
            type="number"
            placeholder="Valor de compra sin IVA"
            value={amountWithoutVat}
            onChange={(e) => setAmountWithoutVat(e.target.value)}
          />

          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "#111", fontWeight: "bold" }}>
              Adjuntar foto o PDF de la factura *
            </label>
            <input
              id="invoice-file-input"
              className="campo-pysta"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={handleFileChange}
            />
            {file && (
              <p style={{ marginTop: "8px", color: "#555" }}>
                Archivo seleccionado: {file.name}
              </p>
            )}
          </div>

          <textarea
            className="campo-pysta"
            placeholder="Observaciones (opcional)"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ resize: "vertical" }}
          />

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "10px" }}>
            <button
              onClick={handleGuardarFactura}
              disabled={guardando}
              style={{
                backgroundColor: "#111",
                color: "white",
                border: "none",
                padding: "14px 24px",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "16px",
                opacity: guardando ? 0.7 : 1,
              }}
            >
              {guardando ? "Guardando..." : "Guardar factura"}
            </button>

            <a
              href="/dashboard"
              style={{
                backgroundColor: "#e9e9e9",
                color: "#111",
                textDecoration: "none",
                padding: "14px 24px",
                borderRadius: "10px",
                display: "inline-block",
              }}
            >
              Volver al panel
            </a>
          </div>

          {mensaje && (
            <p style={{ color: "#111", fontSize: "15px", marginTop: "10px" }}>
              {mensaje}
            </p>
          )}
        </div>
      </div>

      <style>{`
        .campo-pysta {
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          border: 1px solid #ccc;
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