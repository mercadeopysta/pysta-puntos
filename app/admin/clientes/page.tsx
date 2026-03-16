"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import AdminMenu from "../../../components/AdminMenu"
import AdminLogoutButton from "../../../components/AdminLogoutButton"
import ConfirmModal from "../../../components/ConfirmModal"
import AlertMessage from "../../../components/AlertMessage"

type Cliente = {
  id: string
  full_name: string
  client_type: string
  advisor_name: string
  document_type: string
  document_number: string
  whatsapp: string
  email: string
  is_active: boolean
  is_approved: boolean
}

type Asesor = {
  id: string
  name: string
  is_active: boolean
}

export default function AdminClientesPage() {
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [asesores, setAsesores] = useState<Asesor[]>([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState("")
  const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "warning" | "info">("info")

  const [filtroNombre, setFiltroNombre] = useState("")
  const [filtroDocumento, setFiltroDocumento] = useState("")
  const [filtroCorreo, setFiltroCorreo] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")
  const [filtroAprobacion, setFiltroAprobacion] = useState("")

  const [editingId, setEditingId] = useState<string | null>(null)
  const [fullName, setFullName] = useState("")
  const [clientType, setClientType] = useState("")
  const [advisorName, setAdvisorName] = useState("")
  const [documentType, setDocumentType] = useState("")
  const [documentNumber, setDocumentNumber] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [email, setEmail] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [isApproved, setIsApproved] = useState(true)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    const adminLogueado = localStorage.getItem("admin_logged_in")
    if (adminLogueado !== "true") {
      router.replace("/admin/login")
      return
    }
    setAutorizado(true)
  }, [router])

  useEffect(() => {
    if (!autorizado) return

    const cargarTodo = async () => {
      setCargando(true)

      const { data: clientesData, error: clientesError } = await supabase
        .from("profiles")
        .select(
          "id, full_name, client_type, advisor_name, document_type, document_number, whatsapp, email, is_active, is_approved"
        )
        .order("full_name", { ascending: true })

      const { data: asesoresData } = await supabase
        .from("advisors")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true })

      if (clientesError) {
        setTipoMensaje("error")
        setMensaje("Ocurrió un error al cargar los clientes.")
        setCargando(false)
        return
      }

      setClientes((clientesData as Cliente[]) || [])
      setAsesores((asesoresData as Asesor[]) || [])
      setCargando(false)
    }

    cargarTodo()
  }, [autorizado])

  const recargarClientes = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, client_type, advisor_name, document_type, document_number, whatsapp, email, is_active, is_approved"
      )
      .order("full_name", { ascending: true })

    if (!error) setClientes((data as Cliente[]) || [])
  }

  const limpiarFormulario = () => {
    setEditingId(null)
    setFullName("")
    setClientType("")
    setAdvisorName("")
    setDocumentType("")
    setDocumentNumber("")
    setWhatsapp("")
    setEmail("")
    setIsActive(true)
    setIsApproved(true)
  }

  const handleEditar = (cliente: Cliente) => {
    setEditingId(cliente.id)
    setFullName(cliente.full_name || "")
    setClientType(cliente.client_type || "")
    setAdvisorName(cliente.advisor_name || "")
    setDocumentType(cliente.document_type || "")
    setDocumentNumber(cliente.document_number || "")
    setWhatsapp(cliente.whatsapp || "")
    setEmail(cliente.email || "")
    setIsActive(Boolean(cliente.is_active))
    setIsApproved(Boolean(cliente.is_approved))
    setMensaje("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleGuardarCambios = async () => {
    setMensaje("")

    if (!editingId) {
      setTipoMensaje("warning")
      setMensaje("No hay ningún cliente seleccionado para editar.")
      return
    }

    if (!fullName || !documentType || !documentNumber || !email) {
      setTipoMensaje("warning")
      setMensaje("Completa nombre, tipo de documento, número de documento y correo.")
      return
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        client_type: clientType,
        advisor_name: advisorName,
        document_type: documentType,
        document_number: documentNumber,
        whatsapp,
        email,
        is_active: isActive,
        is_approved: isApproved,
      })
      .eq("id", editingId)

    if (error) {
      setTipoMensaje("error")
      setMensaje("Ocurrió un error al actualizar el cliente: " + error.message)
      return
    }

    setTipoMensaje("success")
    setMensaje("Cliente actualizado correctamente.")
    limpiarFormulario()
    recargarClientes()
  }

  const handleCambiarEstado = async (cliente: Cliente) => {
    setMensaje("")

    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !cliente.is_active })
      .eq("id", cliente.id)

    if (error) {
      setTipoMensaje("error")
      setMensaje("Ocurrió un error al cambiar el estado del cliente: " + error.message)
      return
    }

    setTipoMensaje("success")
    setMensaje(cliente.is_active ? "Cliente desactivado correctamente." : "Cliente activado correctamente.")
    recargarClientes()
  }

  const handleAprobarCliente = async (cliente: Cliente) => {
    setMensaje("")

    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: true })
      .eq("id", cliente.id)

    if (error) {
      setTipoMensaje("error")
      setMensaje("Ocurrió un error al aprobar el cliente: " + error.message)
      return
    }

    setTipoMensaje("success")
    setMensaje("Cliente aprobado correctamente.")
    recargarClientes()
  }

  const pedirEliminarCliente = (cliente: Cliente) => {
    setClienteAEliminar(cliente)
    setConfirmOpen(true)
  }

  const cerrarModalEliminar = () => {
    if (eliminando) return
    setConfirmOpen(false)
    setClienteAEliminar(null)
  }

  const confirmarEliminarCliente = async () => {
    if (!clienteAEliminar) return

    setMensaje("")
    setEliminando(true)

    const cliente = clienteAEliminar

    const { count: facturasCount } = await supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("user_email", cliente.email)

    const { count: redencionesCount } = await supabase
      .from("redemptions")
      .select("*", { count: "exact", head: true })
      .eq("user_email", cliente.email)

    if ((facturasCount || 0) > 0 || (redencionesCount || 0) > 0) {
      setTipoMensaje("warning")
      setMensaje("Este cliente no se puede eliminar porque tiene historial. Edita su información o desactívalo.")
      setEliminando(false)
      setConfirmOpen(false)
      setClienteAEliminar(null)
      return
    }

    const { error } = await supabase.from("profiles").delete().eq("id", cliente.id)

    if (error) {
      setTipoMensaje("error")
      setMensaje("Ocurrió un error al eliminar el cliente: " + error.message)
      setEliminando(false)
      return
    }

    setTipoMensaje("success")
    setMensaje("Cliente eliminado correctamente.")
    if (editingId === cliente.id) limpiarFormulario()
    await recargarClientes()
    setEliminando(false)
    setConfirmOpen(false)
    setClienteAEliminar(null)
  }

  const clientesFiltrados = useMemo(() => {
    const nombre = filtroNombre.trim().toLowerCase()
    const documento = filtroDocumento.trim().toLowerCase()
    const correo = filtroCorreo.trim().toLowerCase()
    const tipo = filtroTipo.trim().toLowerCase()
    const aprobacion = filtroAprobacion.trim().toLowerCase()

    return clientes.filter((cliente) => {
      const coincideNombre = !nombre || (cliente.full_name || "").toLowerCase().includes(nombre)
      const coincideDocumento =
        !documento || (cliente.document_number || "").toLowerCase().includes(documento)
      const coincideCorreo = !correo || (cliente.email || "").toLowerCase().includes(correo)
      const coincideTipo = !tipo || (cliente.client_type || "").toLowerCase() === tipo

      const coincideAprobacion =
        !aprobacion ||
        (aprobacion === "aprobado" && cliente.is_approved) ||
        (aprobacion === "pendiente" && !cliente.is_approved)

      return coincideNombre && coincideDocumento && coincideCorreo && coincideTipo && coincideAprobacion
    })
  }, [clientes, filtroNombre, filtroDocumento, filtroCorreo, filtroTipo, filtroAprobacion])

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
        <div className="pysta-shell" style={{ maxWidth: "1520px" }}>
          <AdminMenu />

          <section className="pysta-card" style={{ padding: "28px", marginBottom: "22px" }}>
            <div className="pysta-topbar">
              <div style={{ display: "grid", gap: "8px" }}>
                <span className="pysta-badge">Gestión administrativa</span>
                <h1 className="pysta-section-title">Administrar clientes</h1>
                <p className="pysta-subtitle">
                  Edita datos de clientes, apruébalos manualmente y controla su acceso a la app.
                </p>
              </div>

              <AdminLogoutButton />
            </div>
          </section>

          <section className="pysta-card" style={{ padding: "24px", marginBottom: "22px" }}>
            <div style={{ display: "grid", gap: "8px", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Filtros</h2>
              <p style={{ margin: 0, color: "#6b7280" }}>
                Usa los filtros para encontrar clientes más rápido.
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
                <input className="pysta-input" value={filtroNombre} onChange={(e) => setFiltroNombre(e.target.value)} />
              </div>

              <div>
                <label style={labelStyle}>Filtrar por documento</label>
                <input className="pysta-input" value={filtroDocumento} onChange={(e) => setFiltroDocumento(e.target.value)} />
              </div>

              <div>
                <label style={labelStyle}>Filtrar por correo</label>
                <input className="pysta-input" value={filtroCorreo} onChange={(e) => setFiltroCorreo(e.target.value)} />
              </div>

              <div>
                <label style={labelStyle}>Filtrar por tipo</label>
                <select className="pysta-select" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="mayorista">Mayorista</option>
                  <option value="distribuidor">Distribuidor</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Filtrar por aprobación</label>
                <select className="pysta-select" value={filtroAprobacion} onChange={(e) => setFiltroAprobacion(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="aprobado">Aprobados</option>
                  <option value="pendiente">Pendientes</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                setFiltroNombre("")
                setFiltroDocumento("")
                setFiltroCorreo("")
                setFiltroTipo("")
                setFiltroAprobacion("")
              }}
              className="pysta-btn pysta-btn-light"
            >
              Limpiar filtros
            </button>
          </section>

          <section className="pysta-card" style={{ padding: "24px", marginBottom: "22px" }}>
            <div style={{ display: "grid", gap: "8px", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>
                {editingId ? "Editar cliente" : "Selecciona un cliente para editar"}
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "16px",
              }}
            >
              <input className="pysta-input" type="text" placeholder="Nombre completo o razón social" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={!editingId} />
              <select className="pysta-select" value={clientType} onChange={(e) => setClientType(e.target.value)} disabled={!editingId}>
                <option value="">Selecciona tipo de cliente</option>
                <option value="Mayorista">Mayorista</option>
                <option value="Distribuidor">Distribuidor</option>
              </select>
              <select className="pysta-select" value={advisorName} onChange={(e) => setAdvisorName(e.target.value)} disabled={!editingId}>
                <option value="">Selecciona asesor</option>
                {asesores.map((asesor) => (
                  <option key={asesor.id} value={asesor.name}>
                    {asesor.name}
                  </option>
                ))}
              </select>
              <select className="pysta-select" value={documentType} onChange={(e) => setDocumentType(e.target.value)} disabled={!editingId}>
                <option value="">Selecciona tipo de documento</option>
                <option value="CC">CC</option>
                <option value="NIT">NIT</option>
                <option value="OTRO">OTRO</option>
              </select>
              <input className="pysta-input" type="text" placeholder="Número de documento" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} disabled={!editingId} />
              <input className="pysta-input" type="text" placeholder="WhatsApp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} disabled={!editingId} />
              <input className="pysta-input" type="email" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!editingId} />

              <select className="pysta-select" value={isActive ? "true" : "false"} onChange={(e) => setIsActive(e.target.value === "true")} disabled={!editingId}>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>

              <select className="pysta-select" value={isApproved ? "true" : "false"} onChange={(e) => setIsApproved(e.target.value === "true")} disabled={!editingId}>
                <option value="true">Aprobado</option>
                <option value="false">Pendiente</option>
              </select>
            </div>

            <div className="pysta-actions" style={{ marginTop: "18px" }}>
              <button
                onClick={handleGuardarCambios}
                disabled={!editingId}
                className="pysta-btn pysta-btn-dark"
                style={{
                  opacity: editingId ? 1 : 0.5,
                  cursor: editingId ? "pointer" : "not-allowed",
                }}
              >
                Guardar cambios
              </button>

              {editingId && (
                <button onClick={limpiarFormulario} className="pysta-btn pysta-btn-light">
                  Cancelar edición
                </button>
              )}
            </div>

            {mensaje && (
              <div style={{ marginTop: "16px" }}>
                <AlertMessage text={mensaje} type={tipoMensaje} />
              </div>
            )}
          </section>

          <section className="pysta-card" style={{ padding: "0", overflow: "hidden" }}>
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e5e7eb",
                background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Listado de clientes</h2>
              <p style={{ margin: "6px 0 0 0", color: "#6b7280" }}>
                Total encontrados: {clientesFiltrados.length}
              </p>
            </div>

            {cargando ? (
              <div style={{ padding: "24px", color: "#333" }}>Cargando clientes...</div>
            ) : clientesFiltrados.length === 0 ? (
              <div style={{ padding: "24px", color: "#333" }}>No hay clientes para esos filtros.</div>
            ) : (
              <div style={{ padding: "18px" }}>
                <div style={{ display: "grid", gap: "14px" }}>
                  {clientesFiltrados.map((cliente) => (
                    <article
                      key={cliente.id}
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
                            {cliente.full_name}
                          </h3>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <span style={miniBadge}>{cliente.client_type || "Sin tipo"}</span>

                            <span
                              style={{
                                ...miniBadge,
                                background: cliente.is_active ? "#ecfdf3" : "#fef2f2",
                                color: cliente.is_active ? "#166534" : "#991b1b",
                                border: cliente.is_active ? "1px solid #bbf7d0" : "1px solid #fecaca",
                              }}
                            >
                              {cliente.is_active ? "Activo" : "Inactivo"}
                            </span>

                            <span
                              style={{
                                ...miniBadge,
                                background: cliente.is_approved ? "#eff6ff" : "#fff7ed",
                                color: cliente.is_approved ? "#1d4ed8" : "#9a3412",
                                border: cliente.is_approved ? "1px solid #bfdbfe" : "1px solid #fed7aa",
                              }}
                            >
                              {cliente.is_approved ? "Aprobado" : "Pendiente"}
                            </span>
                          </div>
                        </div>

                        <div className="pysta-actions">
                          {!cliente.is_approved && (
                            <button
                              onClick={() => handleAprobarCliente(cliente)}
                              className="pysta-btn pysta-btn-dark"
                              style={smallActionBtn}
                            >
                              Aprobar
                            </button>
                          )}

                          <button
                            onClick={() => handleEditar(cliente)}
                            className="pysta-btn pysta-btn-gold"
                            style={smallActionBtn}
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => handleCambiarEstado(cliente)}
                            className="pysta-btn pysta-btn-light"
                            style={smallActionBtn}
                          >
                            {cliente.is_active ? "Desactivar" : "Activar"}
                          </button>

                          <button
                            onClick={() => pedirEliminarCliente(cliente)}
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
                          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                          gap: "12px",
                        }}
                      >
                        <InfoItem label="Asesor" value={cliente.advisor_name || "-"} />
                        <InfoItem label="Documento" value={`${cliente.document_type || "-"} ${cliente.document_number || ""}`.trim()} />
                        <InfoItem label="WhatsApp" value={cliente.whatsapp || "-"} />
                        <InfoItem label="Correo" value={cliente.email || "-"} />
                      </div>
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
        title="Eliminar cliente"
        message={
          clienteAEliminar
            ? `¿Seguro que deseas eliminar a "${clienteAEliminar.full_name}"? Esta acción no se puede deshacer.`
            : ""
        }
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        danger
        loading={eliminando}
        onCancel={cerrarModalEliminar}
        onConfirm={confirmarEliminarCliente}
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