"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import AdminMenu from "../../../components/AdminMenu"
import AdminLogoutButton from "../../../components/AdminLogoutButton"
import AlertMessage from "../../../components/AlertMessage"
import ConfirmModal from "../../../components/ConfirmModal"

type Cliente = {
  id: string
  full_name: string | null
  email: string
  document_number: string | null
  phone: string | null
  client_type: string | null
  advisor_name: string | null
  is_active: boolean
  is_approved: boolean
  created_at?: string
}

type BulkAction = "approve" | "activate" | "deactivate" | "unapprove" | ""

export default function AdminClientesPage() {
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)

  const [mensaje, setMensaje] = useState("")
  const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "warning" | "info">("info")

  const [filtroTexto, setFiltroTexto] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")

  const [editandoId, setEditandoId] = useState("")
  const [editNombre, setEditNombre] = useState("")
  const [editDocumento, setEditDocumento] = useState("")
  const [editTelefono, setEditTelefono] = useState("")
  const [editTipoCliente, setEditTipoCliente] = useState("")
  const [editAsesor, setEditAsesor] = useState("")
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)

  const [seleccionados, setSeleccionados] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState<BulkAction>("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [ejecutandoMasivo, setEjecutandoMasivo] = useState(false)

  useEffect(() => {
    const adminLogueado = localStorage.getItem("admin_logged_in")

    if (adminLogueado !== "true") {
      router.push("/admin/login")
      return
    }

    setAutorizado(true)
  }, [router])

  const cargarClientes = async () => {
    setCargando(true)
    setMensaje("")

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, document_number, phone, client_type, advisor_name, is_active, is_approved, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      setTipoMensaje("error")
      setMensaje("Ocurrió un error al cargar los clientes.")
      setCargando(false)
      return
    }

    setClientes((data as Cliente[]) || [])
    setCargando(false)
  }

  useEffect(() => {
    if (autorizado) {
      cargarClientes()
    }
  }, [autorizado])

  const refrescarPantalla = () => {
    cargarClientes()
  }

  const aprobarCliente = async (clienteId: string) => {
    setMensaje("")

    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: true, is_active: true })
      .eq("id", clienteId)

    if (error) {
      setTipoMensaje("error")
      setMensaje("No se pudo aprobar el cliente: " + error.message)
      return
    }

    setTipoMensaje("success")
    setMensaje("Cliente aprobado correctamente.")
    cargarClientes()
  }

  const rechazarAprobacion = async (clienteId: string) => {
    setMensaje("")

    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: false })
      .eq("id", clienteId)

    if (error) {
      setTipoMensaje("error")
      setMensaje("No se pudo actualizar la aprobación: " + error.message)
      return
    }

    setTipoMensaje("success")
    setMensaje("Aprobación del cliente actualizada.")
    cargarClientes()
  }

  const activarCliente = async (clienteId: string) => {
    setMensaje("")

    const { error } = await supabase
      .from("profiles")
      .update({ is_active: true })
      .eq("id", clienteId)

    if (error) {
      setTipoMensaje("error")
      setMensaje("No se pudo activar el cliente: " + error.message)
      return
    }

    setTipoMensaje("success")
    setMensaje("Cliente activado correctamente.")
    cargarClientes()
  }

  const desactivarCliente = async (clienteId: string) => {
    setMensaje("")

    const { error } = await supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", clienteId)

    if (error) {
      setTipoMensaje("error")
      setMensaje("No se pudo desactivar el cliente: " + error.message)
      return
    }

    setTipoMensaje("success")
    setMensaje("Cliente desactivado correctamente.")
    cargarClientes()
  }

  const iniciarEdicion = (cliente: Cliente) => {
    setEditandoId(cliente.id)
    setEditNombre(cliente.full_name || "")
    setEditDocumento(cliente.document_number || "")
    setEditTelefono(cliente.phone || "")
    setEditTipoCliente(cliente.client_type || "")
    setEditAsesor(cliente.advisor_name || "")
    setMensaje("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const cancelarEdicion = () => {
    setEditandoId("")
    setEditNombre("")
    setEditDocumento("")
    setEditTelefono("")
    setEditTipoCliente("")
    setEditAsesor("")
  }

  const guardarEdicion = async () => {
    if (!editandoId) return

    setMensaje("")
    setGuardandoEdicion(true)

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editNombre,
        document_number: editDocumento,
        phone: editTelefono,
        client_type: editTipoCliente,
        advisor_name: editAsesor,
      })
      .eq("id", editandoId)

    if (error) {
      setTipoMensaje("error")
      setMensaje("No se pudo guardar la edición: " + error.message)
      setGuardandoEdicion(false)
      return
    }

    setTipoMensaje("success")
    setMensaje("Cliente actualizado correctamente.")
    setGuardandoEdicion(false)
    cancelarEdicion()
    cargarClientes()
  }

  const estadoGeneralCliente = (cliente: Cliente) => {
    if (!cliente.is_approved) return "pendiente"
    if (!cliente.is_active) return "inactivo"
    return "activo"
  }

  const textoEstadoGeneral = (cliente: Cliente) => {
    const estado = estadoGeneralCliente(cliente)
    if (estado === "pendiente") return "Pendiente de aprobación"
    if (estado === "inactivo") return "Inactivo"
    return "Activo"
  }

  const badgeEstadoGeneral = (cliente: Cliente) => {
    const estado = estadoGeneralCliente(cliente)

    if (estado === "pendiente") {
      return {
        background: "#fff7ed",
        color: "#9a3412",
        border: "1px solid #fed7aa",
      }
    }

    if (estado === "inactivo") {
      return {
        background: "#f3f4f6",
        color: "#4b5563",
        border: "1px solid #d1d5db",
      }
    }

    return {
      background: "#ecfdf3",
      color: "#166534",
      border: "1px solid #bbf7d0",
    }
  }

  const clientesFiltrados = useMemo(() => {
    const texto = filtroTexto.trim().toLowerCase()
    const estado = filtroEstado.trim().toLowerCase()
    const tipo = filtroTipo.trim().toLowerCase()

    return clientes.filter((cliente) => {
      const coincideTexto =
        !texto ||
        (cliente.full_name || "").toLowerCase().includes(texto) ||
        (cliente.email || "").toLowerCase().includes(texto) ||
        (cliente.document_number || "").toLowerCase().includes(texto) ||
        (cliente.phone || "").toLowerCase().includes(texto) ||
        (cliente.advisor_name || "").toLowerCase().includes(texto)

      const estadoCliente = estadoGeneralCliente(cliente)
      const coincideEstado = !estado || estadoCliente === estado
      const coincideTipo = !tipo || (cliente.client_type || "").toLowerCase() === tipo

      return coincideTexto && coincideEstado && coincideTipo
    })
  }, [clientes, filtroTexto, filtroEstado, filtroTipo])

  const totalClientes = clientes.length
  const totalActivos = clientes.filter((c) => c.is_active && c.is_approved).length
  const totalPendientes = clientes.filter((c) => !c.is_approved).length
  const totalInactivos = clientes.filter((c) => c.is_approved && !c.is_active).length

  const idsVisibles = clientesFiltrados.map((c) => c.id)
  const todosVisiblesSeleccionados =
    idsVisibles.length > 0 && idsVisibles.every((id) => seleccionados.includes(id))

  const toggleSeleccion = (clienteId: string) => {
    setSeleccionados((prev) =>
      prev.includes(clienteId) ? prev.filter((id) => id !== clienteId) : [...prev, clienteId]
    )
  }

  const toggleSeleccionarTodosVisibles = () => {
    if (todosVisiblesSeleccionados) {
      setSeleccionados((prev) => prev.filter((id) => !idsVisibles.includes(id)))
      return
    }

    setSeleccionados((prev) => Array.from(new Set([...prev, ...idsVisibles])))
  }

  const abrirConfirmacionMasiva = (accion: BulkAction) => {
    if (!accion) return

    if (seleccionados.length === 0) {
      setTipoMensaje("warning")
      setMensaje("Debes seleccionar al menos un cliente.")
      return
    }

    setBulkAction(accion)
    setConfirmOpen(true)
  }

  const cerrarConfirmacionMasiva = () => {
    if (ejecutandoMasivo) return
    setConfirmOpen(false)
    setBulkAction("")
  }

  const getBulkActionText = () => {
    if (bulkAction === "approve") return "aprobar"
    if (bulkAction === "activate") return "activar"
    if (bulkAction === "deactivate") return "desactivar"
    if (bulkAction === "unapprove") return "quitar aprobación a"
    return ""
  }

  const ejecutarAccionMasiva = async () => {
    if (!bulkAction || seleccionados.length === 0) return

    setEjecutandoMasivo(true)
    setMensaje("")

    let payload: { is_approved?: boolean; is_active?: boolean } = {}

    if (bulkAction === "approve") {
      payload = { is_approved: true, is_active: true }
    }

    if (bulkAction === "activate") {
      payload = { is_active: true }
    }

    if (bulkAction === "deactivate") {
      payload = { is_active: false }
    }

    if (bulkAction === "unapprove") {
      payload = { is_approved: false }
    }

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .in("id", seleccionados)

    if (error) {
      setTipoMensaje("error")
      setMensaje("No se pudo ejecutar la acción masiva: " + error.message)
      setEjecutandoMasivo(false)
      return
    }

    setTipoMensaje("success")
    setMensaje(`Acción masiva aplicada correctamente a ${seleccionados.length} cliente(s).`)
    setSeleccionados([])
    setBulkAction("")
    setConfirmOpen(false)
    setEjecutandoMasivo(false)
    cargarClientes()
  }

  const exportarCSV = () => {
    if (clientesFiltrados.length === 0) {
      setTipoMensaje("warning")
      setMensaje("No hay clientes filtrados para exportar.")
      return
    }

    const filas = clientesFiltrados.map((cliente) => ({
      nombre: cliente.full_name || "",
      correo: cliente.email || "",
      documento: cliente.document_number || "",
      telefono: cliente.phone || "",
      tipo_cliente: cliente.client_type || "",
      asesor: cliente.advisor_name || "",
      aprobado: cliente.is_approved ? "Sí" : "No",
      activo: cliente.is_active ? "Sí" : "No",
      estado_general: textoEstadoGeneral(cliente),
    }))

    const encabezados = Object.keys(filas[0])
    const csv = [
      encabezados.join(","),
      ...filas.map((fila) =>
        encabezados
          .map((campo) => {
            const valor = String(fila[campo as keyof typeof fila] ?? "")
            const limpio = valor.replace(/"/g, '""')
            return `"${limpio}"`
          })
          .join(",")
      ),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const fecha = new Date().toISOString().slice(0, 10)

    link.href = url
    link.setAttribute("download", `clientes-pysta-${fecha}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setTipoMensaje("success")
    setMensaje("CSV exportado correctamente.")
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
    <>
      <main className="pysta-page">
        <div className="pysta-shell" style={{ maxWidth: "1480px" }}>
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
                <span className="pysta-badge">Gestión de clientes</span>
                <h1 className="pysta-section-title">Administrar clientes</h1>
                <p className="pysta-subtitle">
                  Aprueba, activa, desactiva, edita, selecciona varios y exporta tus clientes filtrados.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button onClick={refrescarPantalla} className="pysta-btn pysta-btn-light">
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
            <ResumenCard titulo="Clientes totales" valor={String(totalClientes)} descripcion="Registros encontrados" />
            <ResumenCard titulo="Activos" valor={String(totalActivos)} descripcion="Aprobados y habilitados" />
            <ResumenCard titulo="Pendientes" valor={String(totalPendientes)} descripcion="Por aprobar" />
            <ResumenCard titulo="Inactivos" valor={String(totalInactivos)} descripcion="Aprobados pero desactivados" />
          </section>

          {editandoId && (
            <section className="pysta-card" style={{ padding: "24px", marginBottom: "22px" }}>
              <div style={{ display: "grid", gap: "8px", marginBottom: "18px" }}>
                <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Editar cliente</h2>
                <p style={{ margin: 0, color: "#6b7280" }}>
                  Actualiza la información básica del cliente seleccionado.
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
                  <label style={labelStyle}>Nombre completo</label>
                  <input className="pysta-input" value={editNombre} onChange={(e) => setEditNombre(e.target.value)} />
                </div>

                <div>
                  <label style={labelStyle}>Documento</label>
                  <input className="pysta-input" value={editDocumento} onChange={(e) => setEditDocumento(e.target.value)} />
                </div>

                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input className="pysta-input" value={editTelefono} onChange={(e) => setEditTelefono(e.target.value)} />
                </div>

                <div>
                  <label style={labelStyle}>Tipo de cliente</label>
                  <select className="pysta-select" value={editTipoCliente} onChange={(e) => setEditTipoCliente(e.target.value)}>
                    <option value="">Selecciona</option>
                    <option value="Mayorista">Mayorista</option>
                    <option value="Distribuidor">Distribuidor</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Asesor asignado</label>
                  <input className="pysta-input" value={editAsesor} onChange={(e) => setEditAsesor(e.target.value)} />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "18px" }}>
                <button
                  onClick={guardarEdicion}
                  className="pysta-btn pysta-btn-dark"
                  disabled={guardandoEdicion}
                  style={{ opacity: guardandoEdicion ? 0.7 : 1 }}
                >
                  {guardandoEdicion ? "Guardando..." : "Guardar cambios"}
                </button>

                <button onClick={cancelarEdicion} className="pysta-btn pysta-btn-light">
                  Cancelar
                </button>
              </div>
            </section>
          )}

          <section className="pysta-card" style={{ padding: "24px", marginBottom: "22px" }}>
            <div style={{ display: "grid", gap: "8px", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Filtros</h2>
              <p style={{ margin: 0, color: "#6b7280" }}>
                Busca clientes por nombre, correo, documento, teléfono o asesor.
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
                <label style={labelStyle}>Buscar</label>
                <input
                  className="pysta-input"
                  placeholder="Nombre, correo, documento, teléfono o asesor"
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>Estado</label>
                <select className="pysta-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="activo">Activos</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="inactivo">Inactivos</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Tipo de cliente</label>
                <select className="pysta-select" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="mayorista">Mayorista</option>
                  <option value="distribuidor">Distribuidor</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  setFiltroTexto("")
                  setFiltroEstado("")
                  setFiltroTipo("")
                }}
                className="pysta-btn pysta-btn-light"
              >
                Limpiar filtros
              </button>

              <button onClick={exportarCSV} className="pysta-btn pysta-btn-gold">
                Exportar CSV
              </button>
            </div>
          </section>

          <section className="pysta-card" style={{ padding: "24px", marginBottom: "22px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "16px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div style={{ display: "grid", gap: "6px" }}>
                <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Acciones masivas</h2>
                <p style={{ margin: 0, color: "#6b7280" }}>
                  Seleccionados: {seleccionados.length}
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button onClick={() => abrirConfirmacionMasiva("approve")} className="pysta-btn pysta-btn-gold">
                  Aprobar seleccionados
                </button>

                <button onClick={() => abrirConfirmacionMasiva("activate")} className="pysta-btn pysta-btn-dark">
                  Activar seleccionados
                </button>

                <button onClick={() => abrirConfirmacionMasiva("deactivate")} className="pysta-btn pysta-btn-light">
                  Desactivar seleccionados
                </button>

                <button onClick={() => abrirConfirmacionMasiva("unapprove")} className="pysta-btn pysta-btn-light">
                  Quitar aprobación
                </button>
              </div>
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Listado de clientes</h2>
                  <p style={{ margin: "6px 0 0 0", color: "#6b7280" }}>
                    Total encontrados: {clientesFiltrados.length}
                  </p>
                </div>

                <button
                  onClick={toggleSeleccionarTodosVisibles}
                  className="pysta-btn pysta-btn-light"
                >
                  {todosVisiblesSeleccionados ? "Quitar selección visibles" : "Seleccionar visibles"}
                </button>
              </div>
            </div>

            {cargando ? (
              <div style={{ padding: "24px", color: "#333" }}>Cargando clientes...</div>
            ) : clientesFiltrados.length === 0 ? (
              <div style={{ padding: "24px", color: "#333" }}>No hay clientes para esos filtros.</div>
            ) : (
              <div style={{ padding: "18px" }}>
                <div style={{ display: "grid", gap: "14px" }}>
                  {clientesFiltrados.map((cliente) => {
                    const seleccionado = seleccionados.includes(cliente.id)

                    return (
                      <article
                        key={cliente.id}
                        style={{
                          background: seleccionado ? "#fffdf5" : "#fff",
                          border: seleccionado ? "1px solid #f3d37a" : "1px solid #e5e7eb",
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
                              checked={seleccionado}
                              onChange={() => toggleSeleccion(cliente.id)}
                              style={{ width: "18px", height: "18px", marginTop: "4px" }}
                            />

                            <div style={{ display: "grid", gap: "8px" }}>
                              <h3 style={{ margin: 0, color: "#111", fontSize: "22px" }}>
                                {cliente.full_name || "Sin nombre"}
                              </h3>

                              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                <span style={miniBadge}>{cliente.client_type || "Sin tipo"}</span>

                                <span
                                  style={{
                                    ...miniBadge,
                                    ...badgeEstadoGeneral(cliente),
                                  }}
                                >
                                  {textoEstadoGeneral(cliente)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pysta-actions">
                            {!cliente.is_approved ? (
                              <button
                                onClick={() => aprobarCliente(cliente.id)}
                                className="pysta-btn pysta-btn-gold"
                                style={smallActionBtn}
                              >
                                Aprobar
                              </button>
                            ) : null}

                            {cliente.is_approved ? (
                              cliente.is_active ? (
                                <button
                                  onClick={() => desactivarCliente(cliente.id)}
                                  className="pysta-btn pysta-btn-light"
                                  style={smallActionBtn}
                                >
                                  Desactivar
                                </button>
                              ) : (
                                <button
                                  onClick={() => activarCliente(cliente.id)}
                                  className="pysta-btn pysta-btn-dark"
                                  style={smallActionBtn}
                                >
                                  Activar
                                </button>
                              )
                            ) : null}

                            <button
                              onClick={() => rechazarAprobacion(cliente.id)}
                              className="pysta-btn pysta-btn-light"
                              style={smallActionBtn}
                            >
                              Quitar aprobación
                            </button>

                            <button
                              onClick={() => iniciarEdicion(cliente)}
                              className="pysta-btn pysta-btn-dark"
                              style={smallActionBtn}
                            >
                              Editar
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
                          <InfoItem label="Correo" value={cliente.email || "-"} />
                          <InfoItem label="Documento" value={cliente.document_number || "-"} />
                          <InfoItem label="Teléfono" value={cliente.phone || "-"} />
                          <InfoItem label="Tipo de cliente" value={cliente.client_type || "-"} />
                          <InfoItem label="Asesor" value={cliente.advisor_name || "-"} />
                          <InfoItem label="Estado" value={textoEstadoGeneral(cliente)} />
                        </div>
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
        title="Confirmar acción masiva"
        message={`¿Seguro que deseas ${getBulkActionText()} ${seleccionados.length} cliente(s)?`}
        confirmText="Sí, continuar"
        cancelText="Cancelar"
        loading={ejecutandoMasivo}
        onCancel={cerrarConfirmacionMasiva}
        onConfirm={ejecutarAccionMasiva}
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