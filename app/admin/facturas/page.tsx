"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import AdminMenu from "../../../components/AdminMenu"
import AdminLogoutButton from "../../../components/AdminLogoutButton"
import ConfirmModal from "../../../components/ConfirmModal"
import AlertMessage from "../../../components/AlertMessage"

type Factura = {
  id: string
  user_email: string
  invoice_number: string
  invoice_date: string
  amount_without_vat: number
  notes: string | null
  status: string
  file_url: string | null
  file_name: string | null
}

type ProfileRow = {
  email: string
  full_name: string
  document_number: string
}

type FacturaConCliente = Factura & {
  client_name: string
  document_number: string
}

export default function AdminFacturasPage() {
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [facturas, setFacturas] = useState<FacturaConCliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState("")
  const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "warning" | "info">("info")
  const [filtroNombre, setFiltroNombre] = useState("")
  const [filtroDocumento, setFiltroDocumento] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [facturaAEliminar, setFacturaAEliminar] = useState<FacturaConCliente | null>(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    const adminLogueado = localStorage.getItem("admin_logged_in")

    if (adminLogueado !== "true") {
      router.push("/admin/login")
      return
    }

    setAutorizado(true)
  }, [router])

  const cargarFacturas = async () => {
    setCargando(true)
    setMensaje("")

    const { data, error } = await supabase
      .from("invoices")
      .select("id, user_email, invoice_number, invoice_date, amount_without_vat, notes, status, file_url, file_name")
      .order("created_at", { ascending: false })

    if (error) {
      setTipoMensaje("error")
      setMensaje("Ocurrió un error al cargar las facturas.")
      setCargando(false)
      return
    }

    const facturasRows = (data as Factura[]) || []
    const emails = Array.from(new Set(facturasRows.map((f) => f.user_email).filter(Boolean)))

    let profilesMap: Record<string, { full_name: string; document_number: string }> = {}

    if (emails.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("email, full_name, document_number")
        .in("email", emails)

      if (profilesData) {
        ;(profilesData as ProfileRow[]).forEach((profile) => {
          profilesMap[profile.email] = {
            full_name: profile.full_name || profile.email,
            document_number: profile.document_number || "",
          }
        })
      }
    }

    const enriquecidas: FacturaConCliente[] = facturasRows.map((factura) => ({
      ...factura,
      client_name: profilesMap[factura.user_email]?.full_name || factura.user_email,
      document_number: profilesMap[factura.user_email]?.document_number || "",
    }))

    setFacturas(enriquecidas)
    setCargando(false)
  }

  useEffect(() => {
    if (autorizado) {
      cargarFacturas()
    }
  }, [autorizado])

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    setMensaje("")

    const { error } = await supabase
      .from("invoices")
      .update({ status: nuevoEstado })
      .eq("id", id)

    if (error) {
      setTipoMensaje("error")
      setMensaje("Ocurrió un error al actualizar la factura: " + error.message)
      return
    }

    setTipoMensaje("success")
    setMensaje(`Factura actualizada a estado: ${traducirEstado(nuevoEstado)}`)
    cargarFacturas()
  }

  const pedirEliminarFactura = (factura: FacturaConCliente) => {
    setFacturaAEliminar(factura)
    setConfirmOpen(true)
  }

  const cerrarModalEliminar = () => {
    if (eliminando) return
    setConfirmOpen(false)
    setFacturaAEliminar(null)
  }

  const confirmarEliminarFactura = async () => {
    if (!facturaAEliminar) return

    setMensaje("")
    setEliminando(true)

    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", facturaAEliminar.id)

    if (error) {
      setTipoMensaje("error")
      setMensaje("Ocurrió un error al eliminar la factura: " + error.message)
      setEliminando(false)
      return
    }

    setTipoMensaje("success")
    setMensaje("Factura eliminada correctamente.")
    await cargarFacturas()
    setEliminando(false)
    setConfirmOpen(false)
    setFacturaAEliminar(null)
  }

  const traducirEstado = (estado: string) => {
    if (estado === "approved") return "Aprobada"
    if (estado === "rejected") return "Rechazada"
    if (estado === "pending") return "Pendiente"
    return estado
  }

  const estadoBadge = (estado: string) => {
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
    const nombre = filtroNombre.trim().toLowerCase()
    const documento = filtroDocumento.trim().toLowerCase()
    const estado = filtroEstado.trim().toLowerCase()

    return facturas.filter((factura) => {
      const coincideNombre = !nombre || factura.client_name.toLowerCase().includes(nombre)
      const coincideDocumento =
        !documento || (factura.document_number || "").toLowerCase().includes(documento)
      const coincideEstado = !estado || (factura.status || "").toLowerCase() === estado

      return coincideNombre && coincideDocumento && coincideEstado
    })
  }, [facturas, filtroNombre, filtroDocumento, filtroEstado])

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
    <>
      <main className="pysta-page">
        <div className="pysta-shell" style={{ maxWidth: "1650px" }}>
          <AdminMenu />

          <section className="pysta-card" style={{ padding: "28px", marginBottom: "22px" }}>
            <div className="pysta-topbar">
              <div style={{ display: "grid", gap: "8px" }}>
                <span className="pysta-badge">Gestión documental</span>
                <h1 className="pysta-section-title">Administrar facturas</h1>
                <p className="pysta-subtitle">
                  Revisa, aprueba, rechaza, deja pendientes o elimina las facturas subidas por los clientes.
                </p>
              </div>

              <AdminLogoutButton />
            </div>
          </section>

          <section className="pysta-card" style={{ padding: "24px", marginBottom: "22px" }}>
            <div style={{ display: "grid", gap: "8px", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Filtros</h2>
              <p style={{ margin: 0, color: "#6b7280" }}>
                Encuentra más rápido las facturas por cliente, documento o estado.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <div>
                <label style={labelStyle}>Filtrar por nombre</label>
                <input
                  className="pysta-input"
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={filtroNombre}
                  onChange={(e) => setFiltroNombre(e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>Filtrar por documento</label>
                <input
                  className="pysta-input"
                  type="text"
                  placeholder="Ej: 123456789"
                  value={filtroDocumento}
                  onChange={(e) => setFiltroDocumento(e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>Filtrar por estado</label>
                <select
                  className="pysta-select"
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="approved">Aprobadas</option>
                  <option value="rejected">Rechazadas</option>
                  <option value="pending">Pendientes</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                setFiltroNombre("")
                setFiltroDocumento("")
                setFiltroEstado("")
              }}
              className="pysta-btn pysta-btn-light"
            >
              Limpiar filtros
            </button>
          </section>

          {mensaje && (
            <section className="pysta-card" style={{ padding: "18px 20px", marginBottom: "22px" }}>
              <AlertMessage text={mensaje} type={tipoMensaje} />
            </section>
          )}

          <section className="pysta-card" style={{ padding: "0", overflow: "hidden" }}>
            <div
              style={{
                padding: "20px 24px",
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
              <div style={{ padding: "24px", color: "#333" }}>No hay facturas para esos filtros.</div>
            ) : (
              <div style={{ padding: "18px" }}>
                <div style={{ display: "grid", gap: "14px" }}>
                  {facturasFiltradas.map((factura) => (
                    <article
                      key={factura.id}
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
                          marginBottom: "14px",
                        }}
                      >
                        <div style={{ display: "grid", gap: "6px" }}>
                          <h3 style={{ margin: 0, color: "#111", fontSize: "20px" }}>
                            {factura.client_name}
                          </h3>

                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <span style={miniBadge}>
                              Factura #{factura.invoice_number}
                            </span>

                            <span
                              style={{
                                ...miniBadge,
                                ...estadoBadge(factura.status),
                              }}
                            >
                              {traducirEstado(factura.status)}
                            </span>
                          </div>
                        </div>

                        <div className="pysta-actions">
                          {factura.file_url ? (
                            <a
                              href={factura.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="pysta-btn pysta-btn-light"
                              style={smallActionBtn}
                            >
                              Ver archivo
                            </a>
                          ) : (
                            <span style={smallMutedBox}>Sin archivo</span>
                          )}

                          <button
                            onClick={() => cambiarEstado(factura.id, "approved")}
                            className="pysta-btn pysta-btn-gold"
                            style={smallActionBtn}
                          >
                            Aprobar
                          </button>

                          <button
                            onClick={() => cambiarEstado(factura.id, "rejected")}
                            className="pysta-btn pysta-btn-light"
                            style={smallActionBtn}
                          >
                            Rechazar
                          </button>

                          <button
                            onClick={() => cambiarEstado(factura.id, "pending")}
                            className="pysta-btn pysta-btn-dark"
                            style={smallActionBtn}
                          >
                            Pendiente
                          </button>

                          <button
                            onClick={() => pedirEliminarFactura(factura)}
                            className="pysta-btn pysta-btn-danger"
                            style={smallActionBtn}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                          gap: "12px",
                        }}
                      >
                        <InfoItem label="Documento" value={factura.document_number || "-"} />
                        <InfoItem label="Correo" value={factura.user_email} />
                        <InfoItem label="Fecha factura" value={factura.invoice_date || "-"} />
                        <InfoItem
                          label="Valor sin IVA"
                          value={`$${Number(factura.amount_without_vat).toLocaleString("es-CO")}`}
                        />
                      </div>

                      {factura.notes && (
                        <div
                          style={{
                            marginTop: "12px",
                            background: "#f9fafb",
                            border: "1px solid #e5e7eb",
                            borderRadius: "14px",
                            padding: "12px 14px",
                          }}
                        >
                          <p style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#6b7280", fontWeight: 700 }}>
                            Observaciones
                          </p>
                          <p style={{ margin: 0, color: "#111", lineHeight: 1.5 }}>
                            {factura.notes}
                          </p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <ConfirmModal
        open={confirmOpen}
        title="Eliminar factura"
        message={
          facturaAEliminar
            ? `¿Seguro que deseas eliminar la factura ${facturaAEliminar.invoice_number} de ${facturaAEliminar.client_name}? Esta acción no se puede deshacer.`
            : ""
        }
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        danger
        loading={eliminando}
        onCancel={cerrarModalEliminar}
        onConfirm={confirmarEliminarFactura}
      />
    </>
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
      <p style={{ margin: 0, fontSize: "15px", color: "#111", lineHeight: 1.5 }}>
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

const miniBadge = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold" as const,
  background: "rgba(212, 175, 55, 0.14)",
  color: "#7a5b00",
  border: "1px solid rgba(212, 175, 55, 0.24)",
}

const smallActionBtn = {
  padding: "10px 14px",
  fontSize: "13px",
}

const smallMutedBox = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: "14px",
  fontSize: "13px",
  background: "#f3f4f6",
  color: "#6b7280",
  border: "1px solid #e5e7eb",
}