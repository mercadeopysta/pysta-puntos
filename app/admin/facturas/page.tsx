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
  status: string
  notes: string | null
  file_url: string | null
  file_name: string | null
  created_at: string
}

type ProfileRow = {
  email: string
  full_name: string | null
  document_number?: string | null
  advisor_name?: string | null
  client_type?: string | null
}

type BulkAction = "approved" | "rejected" | "deleted" | ""

export default function AdminFacturasPage() {
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileRow>>({})
  const [cargando, setCargando] = useState(true)

  const [mensaje, setMensaje] = useState("")
  const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "warning" | "info">("info")

  const [filtroTexto, setFiltroTexto] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")

  const [seleccionados, setSeleccionados] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState<BulkAction>("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmDanger, setConfirmDanger] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState("")
  const [confirmMessage, setConfirmMessage] = useState("")
  const [ejecutandoMasivo, setEjecutandoMasivo] = useState(false)

  const [facturaAEliminar, setFacturaAEliminar] = useState<Factura | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [eliminandoFactura, setEliminandoFactura] = useState(false)

  useEffect(() => {
    const adminLogueado = localStorage.getItem("admin_logged_in")

    if (adminLogueado !== "true") {
      router.push("/admin/login")
      return
    }

    setAutorizado(true)
  }, [router])

  const cargarDatos = async () => {
    setCargando(true)
    setMensaje("")

    const { data: facturasData, error: facturasError } = await supabase
      .from("invoices")
      .select("id, user_email, invoice_number, invoice_date, amount_without_vat, status, notes, file_url, file_name, created_at")
      .order("created_at", { ascending: false })

    if (facturasError) {
      setTipoMensaje("error")
      setMensaje("Ocurrió un error al cargar las facturas.")
      setCargando(false)
      return
    }

    const facturasRows = (facturasData as Factura[]) || []
    setFacturas(facturasRows)

    const correos = Array.from(new Set(facturasRows.map((f) => f.user_email).filter(Boolean)))

    if (correos.length > 0) {
      const { data: perfilesData } = await supabase
        .from("profiles")
        .select("email, full_name, document_number, advisor_name, client_type")
        .in("email", correos)

      const mapa: Record<string, ProfileRow> = {}

      ;((perfilesData as ProfileRow[]) || []).forEach((perfil) => {
        if (perfil.email) {
          mapa[perfil.email] = perfil
        }
      })

      setProfilesMap(mapa)
    } else {
      setProfilesMap({})
    }

    setCargando(false)
  }

  useEffect(() => {
    if (autorizado) {
      cargarDatos()
    }
  }, [autorizado])

  const traducirEstado = (estado: string) => {
    if (estado === "approved") return "Aprobada"
    if (estado === "rejected") return "Rechazada"
    if (estado === "pending") return "Pendiente"
    return estado
  }

  const descripcionEstado = (estado: string) => {
    if (estado === "approved") return "Factura validada correctamente."
    if (estado === "rejected") return "Factura rechazada."
    if (estado === "pending") return "Pendiente de revisión."
    return "Estado actual de la factura."
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
      const perfil = profilesMap[factura.user_email]

      const coincideTexto =
        !texto ||
        factura.invoice_number.toLowerCase().includes(texto) ||
        factura.user_email.toLowerCase().includes(texto) ||
        (perfil?.full_name || "").toLowerCase().includes(texto) ||
        (perfil?.document_number || "").toLowerCase().includes(texto) ||
        (perfil?.advisor_name || "").toLowerCase().includes(texto) ||
        (perfil?.client_type || "").toLowerCase().includes(texto)

      const coincideEstado = !estado || factura.status.toLowerCase() === estado

      return coincideTexto && coincideEstado
    })
  }, [facturas, profilesMap, filtroTexto, filtroEstado])

  const totalFacturas = facturas.length
  const totalPendientes = facturas.filter((f) => f.status === "pending").length
  const totalAprobadas = facturas.filter((f) => f.status === "approved").length
  const totalRechazadas = facturas.filter((f) => f.status === "rejected").length

  const idsVisibles = facturasFiltradas.map((f) => f.id)
  const todosVisiblesSeleccionados =
    idsVisibles.length > 0 && idsVisibles.every((id) => seleccionados.includes(id))

  const toggleSeleccion = (facturaId: string) => {
    setSeleccionados((prev) =>
      prev.includes(facturaId) ? prev.filter((id) => id !== facturaId) : [...prev, facturaId]
    )
  }

  const toggleSeleccionarTodosVisibles = () => {
    if (todosVisiblesSeleccionados) {
      setSeleccionados((prev) => prev.filter((id) => !idsVisibles.includes(id)))
      return
    }

    setSeleccionados((prev) => Array.from(new Set([...prev, ...idsVisibles])))
  }

  const aprobarFactura = async (facturaId: string) => {
    setMensaje("")

    const { error } = await supabase
      .from("invoices")
      .update({ status: "approved" })
      .eq("id", facturaId)

    if (error) {
      setTipoMensaje("error")
      setMensaje("No se pudo aprobar la factura: " + error.message)
      return
    }

    setTipoMensaje("success")
    setMensaje("Factura aprobada correctamente.")
    cargarDatos()
  }

  const rechazarFactura = async (facturaId: string) => {
    setMensaje("")

    const { error } = await supabase
      .from("invoices")
      .update({ status: "rejected" })
      .eq("id", facturaId)

    if (error) {
      setTipoMensaje("error")
      setMensaje("No se pudo rechazar la factura: " + error.message)
      return
    }

    setTipoMensaje("success")
    setMensaje("Factura rechazada correctamente.")
    cargarDatos()
  }

  const pedirEliminarFactura = (factura: Factura) => {
    setFacturaAEliminar(factura)
    setConfirmDeleteOpen(true)
  }

  const cerrarEliminarFactura = () => {
    if (eliminandoFactura) return
    setConfirmDeleteOpen(false)
    setFacturaAEliminar(null)
  }

  const confirmarEliminarFactura = async () => {
    if (!facturaAEliminar) return

    setEliminandoFactura(true)
    setMensaje("")

    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", facturaAEliminar.id)

    if (error) {
      setTipoMensaje("error")
      setMensaje("No se pudo eliminar la factura: " + error.message)
      setEliminandoFactura(false)
      return
    }

    setTipoMensaje("success")
    setMensaje("Factura eliminada correctamente.")
    setSeleccionados((prev) => prev.filter((id) => id !== facturaAEliminar.id))
    setConfirmDeleteOpen(false)
    setFacturaAEliminar(null)
    setEliminandoFactura(false)
    cargarDatos()
  }

  const abrirConfirmacionMasiva = (accion: BulkAction) => {
    if (!accion) return

    if (seleccionados.length === 0) {
      setTipoMensaje("warning")
      setMensaje("Debes seleccionar al menos una factura.")
      return
    }

    setBulkAction(accion)
    setConfirmOpen(true)
    setConfirmDanger(accion === "deleted")
    setConfirmTitle("Confirmar acción masiva")

    if (accion === "approved") {
      setConfirmMessage(`¿Seguro que deseas aprobar ${seleccionados.length} factura(s)?`)
    }

    if (accion === "rejected") {
      setConfirmMessage(`¿Seguro que deseas rechazar ${seleccionados.length} factura(s)?`)
    }

    if (accion === "deleted") {
      setConfirmMessage(`¿Seguro que deseas eliminar ${seleccionados.length} factura(s)? Esta acción no se puede deshacer.`)
    }
  }

  const cerrarConfirmacionMasiva = () => {
    if (ejecutandoMasivo) return
    setConfirmOpen(false)
    setBulkAction("")
    setConfirmDanger(false)
    setConfirmTitle("")
    setConfirmMessage("")
  }

  const ejecutarAccionMasiva = async () => {
    if (!bulkAction || seleccionados.length === 0) return

    setEjecutandoMasivo(true)
    setMensaje("")

    if (bulkAction === "deleted") {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .in("id", seleccionados)

      if (error) {
        setTipoMensaje("error")
        setMensaje("No se pudo ejecutar la eliminación masiva: " + error.message)
        setEjecutandoMasivo(false)
        return
      }
    } else {
      const nuevoEstado = bulkAction === "approved" ? "approved" : "rejected"

      const { error } = await supabase
        .from("invoices")
        .update({ status: nuevoEstado })
        .in("id", seleccionados)

      if (error) {
        setTipoMensaje("error")
        setMensaje("No se pudo ejecutar la acción masiva: " + error.message)
        setEjecutandoMasivo(false)
        return
      }
    }

    setTipoMensaje("success")
    setMensaje(`Acción masiva aplicada correctamente a ${seleccionados.length} factura(s).`)
    setSeleccionados([])
    setBulkAction("")
    setConfirmOpen(false)
    setEjecutandoMasivo(false)
    cargarDatos()
  }

  const exportarCSV = () => {
    if (facturasFiltradas.length === 0) {
      setTipoMensaje("warning")
      setMensaje("No hay facturas filtradas para exportar.")
      return
    }

    const filas = facturasFiltradas.map((factura) => {
      const perfil = profilesMap[factura.user_email]

      return {
        numero_factura: factura.invoice_number,
        fecha_factura: factura.invoice_date,
        correo: factura.user_email,
        cliente: perfil?.full_name || "",
        documento: perfil?.document_number || "",
        asesor: perfil?.advisor_name || "",
        tipo_cliente: perfil?.client_type || "",
        valor_sin_iva: String(factura.amount_without_vat || 0),
        estado: traducirEstado(factura.status),
        observaciones: factura.notes || "",
        archivo: factura.file_name || "",
      }
    })

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
    link.setAttribute("download", `facturas-pysta-${fecha}.csv`)
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
                <span className="pysta-badge">Gestión de facturas</span>
                <h1 className="pysta-section-title">Administrar facturas</h1>
                <p className="pysta-subtitle">
                  Revisa, filtra, aprueba, rechaza, elimina y exporta facturas filtradas a CSV.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button onClick={cargarDatos} className="pysta-btn pysta-btn-light">
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
            <ResumenCard titulo="Facturas totales" valor={String(totalFacturas)} descripcion="Registros cargados" />
            <ResumenCard titulo="Pendientes" valor={String(totalPendientes)} descripcion="Por revisar" />
            <ResumenCard titulo="Aprobadas" valor={String(totalAprobadas)} descripcion="Validadas" />
            <ResumenCard titulo="Rechazadas" valor={String(totalRechazadas)} descripcion="No aprobadas" />
          </section>

          <section className="pysta-card" style={{ padding: "24px", marginBottom: "22px" }}>
            <div style={{ display: "grid", gap: "8px", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Filtros</h2>
              <p style={{ margin: 0, color: "#6b7280" }}>
                Busca por número de factura, correo, cliente, documento, asesor o tipo de cliente.
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
                  placeholder="Factura, correo, cliente, documento, asesor o tipo"
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

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  setFiltroTexto("")
                  setFiltroEstado("")
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
                  Seleccionadas: {seleccionados.length}
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button onClick={() => abrirConfirmacionMasiva("approved")} className="pysta-btn pysta-btn-gold">
                  Aprobar seleccionadas
                </button>

                <button onClick={() => abrirConfirmacionMasiva("rejected")} className="pysta-btn pysta-btn-light">
                  Rechazar seleccionadas
                </button>

                <button onClick={() => abrirConfirmacionMasiva("deleted")} className="pysta-btn pysta-btn-danger">
                  Eliminar seleccionadas
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
                  <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Listado de facturas</h2>
                  <p style={{ margin: "6px 0 0 0", color: "#6b7280" }}>
                    Total encontradas: {facturasFiltradas.length}
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
              <div style={{ padding: "24px", color: "#333" }}>Cargando facturas...</div>
            ) : facturasFiltradas.length === 0 ? (
              <div style={{ padding: "24px", color: "#333" }}>No hay facturas para esos filtros.</div>
            ) : (
              <div style={{ padding: "18px" }}>
                <div style={{ display: "grid", gap: "14px" }}>
                  {facturasFiltradas.map((factura) => {
                    const seleccionado = seleccionados.includes(factura.id)
                    const perfil = profilesMap[factura.user_email]

                    return (
                      <article
                        key={factura.id}
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
                              onChange={() => toggleSeleccion(factura.id)}
                              style={{ width: "18px", height: "18px", marginTop: "4px" }}
                            />

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
                          </div>

                          <div className="pysta-actions">
                            {factura.status !== "approved" && (
                              <button
                                onClick={() => aprobarFactura(factura.id)}
                                className="pysta-btn pysta-btn-gold"
                                style={smallActionBtn}
                              >
                                Aprobar
                              </button>
                            )}

                            {factura.status !== "rejected" && (
                              <button
                                onClick={() => rechazarFactura(factura.id)}
                                className="pysta-btn pysta-btn-light"
                                style={smallActionBtn}
                              >
                                Rechazar
                              </button>
                            )}

                            {factura.file_url && (
                              <a
                                href={factura.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="pysta-btn pysta-btn-dark"
                                style={smallLinkBtn}
                              >
                                Ver archivo
                              </a>
                            )}

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
                          <InfoItem label="Fecha factura" value={factura.invoice_date} />
                          <InfoItem
                            label="Valor sin IVA"
                            value={`$${Number(factura.amount_without_vat || 0).toLocaleString("es-CO")}`}
                          />
                          <InfoItem label="Correo" value={factura.user_email} />
                          <InfoItem label="Cliente" value={perfil?.full_name || "-"} />
                          <InfoItem label="Documento" value={perfil?.document_number || "-"} />
                          <InfoItem label="Asesor" value={perfil?.advisor_name || "-"} />
                          <InfoItem label="Tipo de cliente" value={perfil?.client_type || "-"} />
                          <InfoItem label="Estado actual" value={traducirEstado(factura.status)} />
                          <InfoItem label="Detalle" value={descripcionEstado(factura.status)} />
                        </div>

                        {factura.notes ? (
                          <div
                            style={{
                              marginTop: "12px",
                              background: "#f9fafb",
                              border: "1px solid #e5e7eb",
                              borderRadius: "14px",
                              padding: "12px 14px",
                            }}
                          >
                            <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#6b7280", fontWeight: 700 }}>
                              Observaciones
                            </p>
                            <p style={{ margin: 0, color: "#111", lineHeight: 1.5 }}>{factura.notes}</p>
                          </div>
                        ) : null}
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
        title={confirmTitle}
        message={confirmMessage}
        confirmText="Sí, continuar"
        cancelText="Cancelar"
        danger={confirmDanger}
        loading={ejecutandoMasivo}
        onCancel={cerrarConfirmacionMasiva}
        onConfirm={ejecutarAccionMasiva}
      />

      <ConfirmModal
        open={confirmDeleteOpen}
        title="Eliminar factura"
        message={
          facturaAEliminar
            ? `¿Seguro que deseas eliminar la factura ${facturaAEliminar.invoice_number}? Esta acción no se puede deshacer.`
            : ""
        }
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        danger
        loading={eliminandoFactura}
        onCancel={cerrarEliminarFactura}
        onConfirm={confirmarEliminarFactura}
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

const smallActionBtn = {
  padding: "10px 14px",
  fontSize: "13px",
}

const smallLinkBtn = {
  padding: "10px 14px",
  fontSize: "13px",
  textDecoration: "none",
}
