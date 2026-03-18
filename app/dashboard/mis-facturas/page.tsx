"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"

type Factura = {
  id: string
  user_email: string
  invoice_number: string
  invoice_date: string
  amount_without_vat: number
  status: string
  notes: string | null
  file_url: string | null
  file_name: string | null
  created_at: string
}

export default function MisFacturasPage() {
  const router = useRouter()

  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [userEmail, setUserEmail] = useState("")
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [cargando, setCargando] = useState(true)

  const [mensaje, setMensaje] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroTexto, setFiltroTexto] = useState("")

  useEffect(() => {
    const email = localStorage.getItem("user_email") || localStorage.getItem("cliente_email") || ""

    if (!email) {
      router.replace("/login")
      return
    }

    setUserEmail(email)
    setCargandoSesion(false)
  }, [router])

  const cargarFacturas = async (email: string) => {
    setCargando(true)
    setMensaje("")

    const { data, error } = await supabase
      .from("invoices")
      .select("id, user_email, invoice_number, invoice_date, amount_without_vat, status, notes, file_url, file_name, created_at")
      .eq("user_email", email)
      .order("created_at", { ascending: false })

    if (error) {
      setMensaje("Ocurrió un error al cargar tus facturas.")
      setCargando(false)
      return
    }

    setFacturas((data as Factura[]) || [])
    setCargando(false)
  }

  useEffect(() => {
    if (!cargandoSesion && userEmail) {
      cargarFacturas(userEmail)
    }
  }, [cargandoSesion, userEmail])

  const traducirEstado = (estado: string) => {
    if (estado === "pending") return "Pendiente"
    if (estado === "approved") return "Aprobada"
    if (estado === "rejected") return "Rechazada"
    return estado || "Sin estado"
  }

  const estadoStyles = (estado: string) => {
    if (estado === "approved") {
      return {
        background: "#ecfdf3",
        color: "#166534",
        border: "1px solid #bbf7d0",
      }
    }

    if (estado === "rejected") {
      return {
        background: "#fef2f2",
        color: "#991b1b",
        border: "1px solid #fecaca",
      }
    }

    return {
      background: "#fff7ed",
      color: "#9a3412",
      border: "1px solid #fed7aa",
    }
  }

  const facturasFiltradas = useMemo(() => {
    const texto = filtroTexto.trim().toLowerCase()
    const estado = filtroEstado.trim().toLowerCase()

    return facturas.filter((factura) => {
      const coincideTexto =
        !texto ||
        factura.invoice_number.toLowerCase().includes(texto) ||
        factura.invoice_date.toLowerCase().includes(texto) ||
        (factura.file_name || "").toLowerCase().includes(texto)

      const coincideEstado = !estado || factura.status.toLowerCase() === estado

      return coincideTexto && coincideEstado
    })
  }, [facturas, filtroTexto, filtroEstado])

  const totalFacturas = facturas.length
  const totalPendientes = facturas.filter((f) => f.status === "pending").length
  const totalAprobadas = facturas.filter((f) => f.status === "approved").length
  const totalRechazadas = facturas.filter((f) => f.status === "rejected").length

  if (cargandoSesion) {
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
      <div className="pysta-shell" style={{ maxWidth: "1380px" }}>
        <section
          className="pysta-card"
          style={{
            padding: "30px",
            marginBottom: "22px",
            background: "linear-gradient(135deg, #ffffff 0%, #fbfbfb 100%)",
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
            <div style={{ display: "grid", gap: "10px" }}>
              <span className="pysta-badge">Mis facturas</span>
              <h1 className="pysta-section-title">Historial de facturas</h1>
              <p className="pysta-subtitle">
                Consulta el estado de tus facturas cargadas, revisa observaciones y descarga tus archivos.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button onClick={() => cargarFacturas(userEmail)} className="pysta-btn pysta-btn-light">
                Refrescar
              </button>

              <Link href="/dashboard" className="pysta-btn pysta-btn-dark">
                Volver al dashboard
              </Link>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "22px",
          }}
        >
          <ResumenCard titulo="Facturas totales" valor={String(totalFacturas)} descripcion="Registros cargados" />
          <ResumenCard titulo="Pendientes" valor={String(totalPendientes)} descripcion="En revisión" />
          <ResumenCard titulo="Aprobadas" valor={String(totalAprobadas)} descripcion="Validadas correctamente" />
          <ResumenCard titulo="Rechazadas" valor={String(totalRechazadas)} descripcion="Con observaciones" />
        </section>

        <section className="pysta-card" style={{ padding: "24px", marginBottom: "22px" }}>
          <div style={{ display: "grid", gap: "8px", marginBottom: "18px" }}>
            <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Filtros</h2>
            <p style={{ margin: 0, color: "#6b7280" }}>
              Busca por número, fecha o archivo, y filtra por estado.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            <div>
              <label style={labelStyle}>Buscar</label>
              <input
                className="pysta-input"
                placeholder="Número, fecha o archivo"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Estado</label>
              <select className="pysta-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="">Todos</option>
                <option value="pending">Pendiente</option>
                <option value="approved">Aprobada</option>
                <option value="rejected">Rechazada</option>
              </select>
            </div>
          </div>
        </section>

        {mensaje ? (
          <section className="pysta-card" style={{ padding: "18px 20px", marginBottom: "22px", color: "#991b1b" }}>
            {mensaje}
          </section>
        ) : null}

        <section className="pysta-card" style={{ padding: "0", overflow: "hidden" }}>
          <div
            style={{
              padding: "22px 24px",
              borderBottom: "1px solid #e5e7eb",
              background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Listado de facturas</h2>
            <p style={{ margin: "6px 0 0 0", color: "#6b7280" }}>
              Total encontradas: {facturasFiltradas.length}
            </p>
          </div>

          {cargando ? (
            <div style={{ padding: "24px", color: "#333" }}>Cargando facturas...</div>
          ) : facturasFiltradas.length === 0 ? (
            <div style={{ padding: "24px", color: "#333" }}>No tienes facturas para esos filtros.</div>
          ) : (
            <div style={{ padding: "18px" }}>
              <div style={{ display: "grid", gap: "14px" }}>
                {facturasFiltradas.map((factura) => (
                  <article
                    key={factura.id}
                    style={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "20px",
                      padding: "20px",
                      boxShadow: "0 8px 22px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "14px",
                        flexWrap: "wrap",
                        marginBottom: "14px",
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ display: "grid", gap: "8px" }}>
                        <h3 style={{ margin: 0, color: "#111", fontSize: "22px" }}>
                          {factura.invoice_number}
                        </h3>

                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "6px 10px",
                              borderRadius: "999px",
                              fontSize: "12px",
                              fontWeight: "bold",
                              ...estadoStyles(factura.status),
                            }}
                          >
                            {traducirEstado(factura.status)}
                          </span>
                        </div>
                      </div>

                      {factura.file_url ? (
                        <a
                          href={factura.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="pysta-btn pysta-btn-dark"
                          style={{ textDecoration: "none" }}
                        >
                          Ver archivo
                        </a>
                      ) : null}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                        gap: "12px",
                      }}
                    >
                      <InfoItem label="Fecha factura" value={factura.invoice_date} />
                      <InfoItem
                        label="Valor sin IVA"
                        value={`$${Number(factura.amount_without_vat || 0).toLocaleString("es-CO")}`}
                      />
                      <InfoItem label="Archivo" value={factura.file_name || "-"} />
                      <InfoItem label="Estado actual" value={traducirEstado(factura.status)} />
                    </div>

                    {factura.status === "rejected" && factura.notes ? (
                      <div
                        style={{
                          marginTop: "12px",
                          background: "#fef2f2",
                          border: "1px solid #fecaca",
                          borderRadius: "14px",
                          padding: "12px 14px",
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 8px 0",
                            fontSize: "13px",
                            color: "#991b1b",
                            fontWeight: 700,
                          }}
                        >
                          Motivo del rechazo
                        </p>

                        <p
                          style={{
                            margin: 0,
                            color: "#111",
                            lineHeight: 1.5,
                          }}
                        >
                          {factura.notes}
                        </p>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function ResumenCard({
  titulo,
  valor,
  descripcion,
}: {
  titulo: string
  valor: string
  descripcion: string
}) {
  return (
    <div
      className="pysta-card"
      style={{
        padding: "22px",
        background: "linear-gradient(180deg, #ffffff 0%, #fbfbfb 100%)",
      }}
    >
      <p style={{ margin: 0, color: "#6b7280", fontSize: "14px", fontWeight: 700 }}>{titulo}</p>
      <h3 style={{ margin: "10px 0 8px 0", fontSize: "34px", color: "#111" }}>{valor}</h3>
      <p style={{ margin: 0, color: "#555", fontSize: "14px", lineHeight: 1.4 }}>{descripcion}</p>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        padding: "12px 14px",
      }}
    >
      <p style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#6b7280", fontWeight: 700 }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: "15px", color: "#111", lineHeight: 1.5, wordBreak: "break-word" }}>
        {value}
      </p>
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