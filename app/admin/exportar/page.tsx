"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import AdminMenu from "../../../components/AdminMenu"
import AdminLogoutButton from "../../../components/AdminLogoutButton"
import AlertMessage from "../../../components/AlertMessage"

type Row = Record<string, unknown>

function convertirACSV(data: Row[]) {
  if (!data.length) return ""

  const headers = Object.keys(data[0])

  const escapeCSV = (value: unknown) => {
    if (value === null || value === undefined) return ""
    const text = String(value).replace(/"/g, '""')
    return `"${text}"`
  }

  const rows = data.map((row) =>
    headers.map((header) => escapeCSV(row[header])).join(";")
  )

  return [headers.join(";"), ...rows].join("\n")
}

function descargarCSV(nombreArchivo: string, contenido: string) {
  const blob = new Blob(["\ufeff" + contenido], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", nombreArchivo)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function AdminExportarPage() {
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [mensaje, setMensaje] = useState("")
  const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "warning" | "info">("info")
  const [cargando, setCargando] = useState("")

  useEffect(() => {
    const adminLogueado = localStorage.getItem("admin_logged_in")

    if (adminLogueado !== "true") {
      router.push("/admin/login")
      return
    }

    setAutorizado(true)
  }, [router])

  const exportarClientes = async () => {
    setMensaje("")
    setCargando("clientes")

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "full_name, client_type, advisor_name, document_type, document_number, whatsapp, email, is_active, created_at"
      )
      .order("created_at", { ascending: false })

    if (error) {
      setTipoMensaje("error")
      setMensaje("Error exportando clientes: " + error.message)
      setCargando("")
      return
    }

    const csv = convertirACSV((data as Row[]) || [])
    descargarCSV("clientes_pysta.csv", csv)
    setTipoMensaje("success")
    setMensaje("Clientes exportados correctamente.")
    setCargando("")
  }

  const exportarFacturas = async () => {
    setMensaje("")
    setCargando("facturas")

    const { data, error } = await supabase
      .from("invoices")
      .select(
        "user_email, invoice_number, invoice_date, amount_without_vat, notes, status, created_at"
      )
      .order("created_at", { ascending: false })

    if (error) {
      setTipoMensaje("error")
      setMensaje("Error exportando facturas: " + error.message)
      setCargando("")
      return
    }

    const csv = convertirACSV((data as Row[]) || [])
    descargarCSV("facturas_pysta.csv", csv)
    setTipoMensaje("success")
    setMensaje("Facturas exportadas correctamente.")
    setCargando("")
  }

  const exportarRedenciones = async () => {
    setMensaje("")
    setCargando("redenciones")

    const { data, error } = await supabase
      .from("redemptions")
      .select("user_email, reward_name, points_used, status, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      setTipoMensaje("error")
      setMensaje("Error exportando redenciones: " + error.message)
      setCargando("")
      return
    }

    const csv = convertirACSV((data as Row[]) || [])
    descargarCSV("redenciones_pysta.csv", csv)
    setTipoMensaje("success")
    setMensaje("Redenciones exportadas correctamente.")
    setCargando("")
  }

  if (!autorizado) {
    return (
      <main className="pysta-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="pysta-card" style={{ padding: "24px 28px" }}>
          Validando acceso...
        </div>
      </main>
    )
  }

  return (
    <main className="pysta-page">
      <div className="pysta-shell" style={{ maxWidth: "980px" }}>
        <AdminMenu />

        <section className="pysta-card" style={{ padding: "28px", marginBottom: "22px" }}>
          <div className="pysta-topbar">
            <div style={{ display: "grid", gap: "8px" }}>
              <span className="pysta-badge">Reportes y descargas</span>
              <h1 className="pysta-section-title">Exportar información</h1>
              <p className="pysta-subtitle">
                Descarga la base de clientes, facturas y redenciones en formato compatible con Excel.
              </p>
            </div>

            <AdminLogoutButton />
          </div>
        </section>

        <section className="pysta-card" style={{ padding: "24px" }}>
          <div style={{ display: "grid", gap: "8px", marginBottom: "18px" }}>
            <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Descargas disponibles</h2>
            <p style={{ margin: 0, color: "#6b7280" }}>
              Selecciona el tipo de información que quieres exportar para análisis, respaldo o uso administrativo.
            </p>
          </div>

          <div style={{ display: "grid", gap: "14px" }}>
            <ExportCard
              title="Clientes"
              description="Descarga nombre, tipo de cliente, asesor, documento, WhatsApp, correo, estado y fecha de creación."
              buttonLabel={cargando === "clientes" ? "Exportando clientes..." : "Exportar clientes"}
              onClick={exportarClientes}
              disabled={cargando !== "" && cargando !== "clientes"}
            />

            <ExportCard
              title="Facturas"
              description="Descarga correo del cliente, número de factura, fecha, valor sin IVA, observaciones, estado y fecha de creación."
              buttonLabel={cargando === "facturas" ? "Exportando facturas..." : "Exportar facturas"}
              onClick={exportarFacturas}
              disabled={cargando !== "" && cargando !== "facturas"}
            />

            <ExportCard
              title="Redenciones"
              description="Descarga correo del cliente, premio redimido, puntos usados, estado y fecha de creación."
              buttonLabel={cargando === "redenciones" ? "Exportando redenciones..." : "Exportar redenciones"}
              onClick={exportarRedenciones}
              disabled={cargando !== "" && cargando !== "redenciones"}
            />
          </div>

          {mensaje && (
            <div style={{ marginTop: "16px" }}>
              <AlertMessage text={mensaje} type={tipoMensaje} />
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function ExportCard({
  title,
  description,
  buttonLabel,
  onClick,
  disabled,
}: {
  title: string
  description: string
  buttonLabel: string
  onClick: () => void
  disabled: boolean
}) {
  return (
    <article
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "18px",
        padding: "18px",
        boxShadow: "0 8px 22px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "14px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ display: "grid", gap: "6px", maxWidth: "680px" }}>
          <h3 style={{ margin: 0, color: "#111", fontSize: "20px" }}>{title}</h3>
          <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.5 }}>{description}</p>
        </div>

        <button
          onClick={onClick}
          disabled={disabled}
          className="pysta-btn pysta-btn-dark"
          style={{
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </article>
  )
}