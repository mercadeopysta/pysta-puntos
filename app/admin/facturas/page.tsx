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
  const [seleccionadas, setSeleccionadas] = useState<string[]>([])
  const [procesandoMasivo, setProcesandoMasivo] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [facturaAEliminar, setFacturaAEliminar] = useState<FacturaConCliente | null>(null)
  const [eliminando, setEliminando] = useState(false)

  const [confirmMasivoOpen, setConfirmMasivoOpen] = useState(false)
  const [accionMasivaPendiente, setAccionMasivaPendiente] = useState("")

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
    setSeleccionadas((prev) => prev.filter((id) => enriquecidas.some((f) => f.id === id)))
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

  const cambiarEstadoMasivo = async (nuevoEstado: string) => {
    setMensaje("")

    if (seleccionadas.length === 0) {
      setTipoMensaje("warning")
      setMensaje("Selecciona al menos una factura.")
      return
    }

    try {
      setProcesandoMasivo(true)

      const { error } = await supabase
        .from("invoices")
        .update({ status: nuevoEstado })
        .in("id", seleccionadas)

      if (error) {
        setTipoMensaje("error")
        setMensaje("Ocurrió un error al actualizar las facturas: " + error.message)
        setProcesandoMasivo(false)
        return
      }

      setTipoMensaje("success")
      setMensaje(
        `${seleccionadas.length} factura(s) actualizadas a estado: ${traducirEstado(nuevoEstado)}`
      )
      setSeleccionadas([])
      await cargarFacturas()
    } finally {
      setProcesandoMasivo(false)
    }
  }

  const eliminarFacturasMasivas = async () => {
    setMensaje("")

    if (seleccionadas.length === 0) {
      setTipoMensaje("warning")
      setMensaje("Selecciona al menos una factura.")
      return
    }

    try {
      setProcesandoMasivo(true)

      const { error } = await supabase
        .from("invoices")
        .delete()
        .in("id", seleccionadas)

      if (error) {
        setTipoMensaje("error")
        setMensaje("Ocurrió un error al eliminar las facturas: " + error.message)
        setProcesandoMasivo(false)
        return
      }

      setTipoMensaje("success")
      setMensaje(`${seleccionadas.length} factura(s) eliminadas correctamente.`)
      setSeleccionadas([])
      await cargarFacturas()
    } finally {
      setProcesandoMasivo(false)
    }
  }

  const abrirConfirmacionMasiva = (accion: string) => {
    if (seleccionadas.length === 0) {
      setTipoMensaje("warning")
      setMensaje("Selecciona al menos una factura.")
      return
    }

    setAccionMasivaPendiente(accion)
    setConfirmMasivoOpen(true)
  }

  const confirmarAccionMasiva = async () => {
    const accion = accionMasivaPendiente
    setConfirmMasivoOpen(false)
    setAccionMasivaPendiente("")

    if (!accion) return

    if (accion === "delete") {
      await eliminarFacturasMasivas()
      return
    }

    await cambiarEstadoMasivo(accion)
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
    setSeleccionadas((prev) => prev.filter((id) => id !== facturaAEliminar.id))
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

  const idsFiltrados = facturasFiltradas.map((factura) => factura.id)
  const todasVisiblesSeleccionadas =
    idsFiltrados.length > 0 && idsFiltrados.every((id) => seleccionadas.includes(id))

  const toggleSeleccion = (id: string) => {
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const toggleSeleccionarTodasVisibles = () => {
    if (todasVisiblesSeleccionadas) {
      setSeleccionadas((prev) => prev.filter((id) => !idsFiltrados.includes(id)))
      return
    }

    setSeleccionadas((prev) => Array.from(new Set([...prev, ...idsFiltrados])))
  }

  const totalAprobadas = facturas.filter((f) => f.status === "approved").length
  const totalPendientes = facturas.filter((f) => f.status === "pending").length
  const totalRechazadas = facturas.filter((f) => f.status === "rejected").length
  const valorTotal = facturas.reduce((acc, f) => acc + Number(f.amount_without_vat || 0), 0)

  const refrescarPantalla = () => {
    cargarFacturas()
  }

  const textoConfirmacionMasiva =
    accionMasivaPendiente === "rejected"
      ? `¿Seguro que deseas rechazar ${seleccionadas.length} factura(s)?`
      : accionMasivaPendiente === "approved"
      ? `¿Seguro que deseas aprobar ${seleccionadas.length} factura(s)?`
      : accionMasivaPendiente === "pending"
      ? `¿Seguro que deseas poner en pendiente ${seleccionadas.length} factura(s)?`
      : accionMasivaPendiente === "delete"
      ? `¿Seguro que deseas eliminar ${seleccionadas.length} factura(s)? Esta acción no se puede deshacer.`
      : ""

  const textoBotonConfirmacionMasiva =
    accionMasivaPendiente === "rejected"
      ? "Sí, rechazar"
      : accionMasivaPendiente === "approved"
      ? "Sí, aprobar"
      : accionMasivaPendiente === "pending"
      ? "Sí, poner pendientes"
      : accionMasivaPendiente === "delete"
      ? "Sí, eliminar"
      : "Confirmar"

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

          <section
            className="pysta-card"
            style={{
              padding: "30px",
              marginBottom: "22px",
              background: "linear-gradient(135deg, #ffffff 0%, #fbfbfb 100%)",
            }}
          >
            <div className="pysta-topbar">
              <div style={{ display: "grid", gap: "10px" }}>
                <span className="pysta-badge">Gestión documental</span>
                <h1 className="pysta-section-title">Administrar facturas</h1>
                <p className="pysta-subtitle">
                  Revisa, aprueba, rechaza o elimina las facturas cargadas por los clientes.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  onClick={refrescarPantalla}
                  className="pysta-btn pysta-btn-light"
                >
                  Refrescar
                </button>

                <AdminLogoutButton />
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
            <ResumenCard titulo="Facturas totales" valor={String(facturas.length)} descripcion="Documentos registrados" />
            <ResumenCard titulo="Aprobadas" valor={String(totalAprobadas)} descripcion="Ya validadas" />
            <ResumenCard titulo="Pendientes" valor={String(totalPendientes)} descripcion="En revisión" />
            <ResumenCard titulo="Rechazadas" valor={String(totalRechazadas)} descripcion="No aprobadas" />
            <ResumenCard titulo="Valor acumulado" valor={`$${valorTotal.toLocaleString("es-CO")}`} descripcion="Suma sin IVA" />
          </section>

          <section className="pysta-card" style={{ padding: "24px", marginBottom: "22px" }}>
            <div style={{ display: "grid", gap: "8px", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Filtros</h2>
              <p style={{ margin: 0, color: "#6b7280" }}>
                Encuentra facturas por cliente, documento o estado de validación.
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

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
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

              <button
                onClick={toggleSeleccionarTodasVisibles}
                className="pysta-btn pysta-btn-light"
              >
                {todasVisiblesSeleccionadas ? "Quitar visibles" : "Seleccionar visibles"}
              </button>

              <button
                onClick={() => setSeleccionadas([])}
                className="pysta-btn pysta-btn-light"
              >
                Limpiar selección
              </button>
            </div>
          </section>

          <section className="pysta-card" style={{ padding: "24px", marginBottom: "22px" }}>
            <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
              <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Acciones masivas</h2>
              <p style={{ margin: 0, color: "#6b7280" }}>
                Facturas seleccionadas: {seleccionadas.length}
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={() => abrirConfirmacionMasiva("approved")}
                className="pysta-btn pysta-btn-gold"
                disabled={procesandoMasivo}
                style={{ opacity: procesandoMasivo ? 0.7 : 1 }}
              >
                Aprobar seleccionadas
              </button>

              <button
                onClick={() => abrirConfirmacionMasiva("rejected")}
                className="pysta-btn pysta-btn-light"
                disabled={procesandoMasivo}
                style={{ opacity: procesandoMasivo ? 0.7 : 1 }}
              >
                Rechazar seleccionadas
              </button>

              <button
                onClick={() => abrirConfirmacionMasiva("pending")}
                className="pysta-btn pysta-btn-dark"
                disabled={procesandoMasivo}
                style={{ opacity: procesandoMasivo ? 0.7 : 1 }}
              >
                Poner pendientes
              </button>

              <button
                onClick={() => abrirConfirmacionMasiva("delete")}
                className="pysta-btn pysta-btn-danger"
                disabled={procesandoMasivo}
                style={{ opacity: procesandoMasivo ? 0.7 : 1 }}
              >
                Eliminar seleccionadas
              </button>
            </div>
          </section>

          {mensaje && (
            <section className="pysta-card" style={{ padding: "18px 20px", marginBottom: "22px" }}>
              <AlertMessage text={mensaje} type={tipoMensaje} />
            </section>
          )}

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
              <div style={{ padding: "24px", color: "#333" }}>No hay facturas para esos filtros.</div>
            ) : (
              <div style={{ padding: "18px" }}>
                <div style={{ display: "grid", gap: "14px" }}>
                  {facturasFiltradas.map((factura) => {
                    const seleccionada = seleccionadas.includes(factura.id)

                    return (
                      <article
                        key={factura.id}
                        style={{
                          background: seleccionada ? "#fffdf5" : "#fff",
                          border: seleccionada ? "1px solid #f3d37a" : "1px solid #e5e7eb",
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
                          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                            <input
                              type="checkbox"
                              checked={seleccionada}
                              onChange={() => toggleSeleccion(factura.id)}
                              style={{ width: "18px", height: "18px", marginTop: "6px" }}
                            />

                            <div style={{ display: "grid", gap: "8px" }}>
                              <h3 style={{ margin: 0, color: "#111", fontSize: "22px" }}>
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
                          <InfoItem
                            label="Archivo"
                            value={factura.file_name || "Archivo subido"}
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
                    )
                  })}
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

      <ConfirmModal
        open={confirmMasivoOpen}
        title="Confirmar acción masiva"
        message={textoConfirmacionMasiva}
        confirmText={textoBotonConfirmacionMasiva}
        cancelText="Cancelar"
        danger={accionMasivaPendiente === "rejected" || accionMasivaPendiente === "delete"}
        loading={procesandoMasivo}
        onCancel={() => {
          if (procesandoMasivo) return
          setConfirmMasivoOpen(false)
          setAccionMasivaPendiente("")
        }}
        onConfirm={confirmarAccionMasiva}
      />
    </>
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