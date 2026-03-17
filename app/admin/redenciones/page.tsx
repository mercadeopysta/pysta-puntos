"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import AdminMenu from "../../../components/AdminMenu"
import AdminLogoutButton from "../../../components/AdminLogoutButton"
import ConfirmModal from "../../../components/ConfirmModal"
import AlertMessage from "../../../components/AlertMessage"

type Redencion = {
  id: string
  user_email: string
  reward_id: string | null
  reward_name: string
  points_used: number
  status: string
  created_at: string
  redemption_group_id: string | null
}

type ProfileRow = {
  email: string
  full_name: string
  document_number?: string
  advisor_name?: string | null
}

type GrupoItem = {
  id: string
  reward_id: string | null
  reward_name: string
  points_used: number
  status: string
}

type GrupoRedencion = {
  key: string
  group_id: string
  user_email: string
  client_name: string
  document_number: string
  advisor_name: string
  date_label: string
  raw_date: string
  date_only: string
  items: GrupoItem[]
  points_total: number
  status: string
  ids: string[]
}

export default function AdminRedencionesPage() {
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [redenciones, setRedenciones] = useState<Redencion[]>([])
  const [profilesMap, setProfilesMap] = useState<
    Record<string, { full_name: string; document_number: string; advisor_name: string }>
  >({})
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState("")
  const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "warning" | "info">("info")

  const [filtroCliente, setFiltroCliente] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroFecha, setFiltroFecha] = useState("")

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [grupoAEliminar, setGrupoAEliminar] = useState<GrupoRedencion | null>(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    const adminLogueado = localStorage.getItem("admin_logged_in")

    if (adminLogueado !== "true") {
      router.push("/admin/login")
      return
    }

    setAutorizado(true)
  }, [router])

  const cargarRedenciones = async () => {
    setCargando(true)
    setMensaje("")

    const { data: redencionesData, error: redencionesError } = await supabase
      .from("redemptions")
      .select("id, user_email, reward_id, reward_name, points_used, status, created_at, redemption_group_id")
      .order("created_at", { ascending: false })

    if (redencionesError) {
      setTipoMensaje("error")
      setMensaje("Ocurrió un error al cargar las redenciones.")
      setCargando(false)
      return
    }

    const redencionesRows = (redencionesData as Redencion[]) || []
    setRedenciones(redencionesRows)

    const emails = Array.from(new Set(redencionesRows.map((r) => r.user_email).filter(Boolean)))

    if (emails.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("email, full_name, document_number, advisor_name")
        .in("email", emails)

      if (profilesData) {
        const map: Record<string, { full_name: string; document_number: string; advisor_name: string }> = {}
        ;(profilesData as ProfileRow[]).forEach((profile) => {
          map[profile.email] = {
            full_name: profile.full_name || profile.email,
            document_number: profile.document_number || "",
            advisor_name: profile.advisor_name || "",
          }
        })
        setProfilesMap(map)
      }
    }

    setCargando(false)
  }

  useEffect(() => {
    if (autorizado) {
      cargarRedenciones()
    }
  }, [autorizado])

  const grupos = useMemo(() => {
    const grouped = new Map<string, GrupoRedencion>()

    redenciones.forEach((redencion) => {
      const date = new Date(redencion.created_at)
      const dateOnly = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate()
      ).padStart(2, "0")}`

      const groupId =
        redencion.redemption_group_id && redencion.redemption_group_id.trim() !== ""
          ? redencion.redemption_group_id
          : `${redencion.user_email}__${dateOnly}__legacy`

      const clientName = profilesMap[redencion.user_email]?.full_name || redencion.user_email
      const documentNumber = profilesMap[redencion.user_email]?.document_number || ""
      const advisorName = profilesMap[redencion.user_email]?.advisor_name || ""

      if (!grouped.has(groupId)) {
        grouped.set(groupId, {
          key: groupId,
          group_id: groupId,
          user_email: redencion.user_email,
          client_name: clientName,
          document_number: documentNumber,
          advisor_name: advisorName,
          date_label: date.toLocaleDateString("es-CO"),
          raw_date: date.toISOString(),
          date_only: dateOnly,
          items: [],
          points_total: 0,
          status: redencion.status,
          ids: [],
        })
      }

      const current = grouped.get(groupId)!
      current.items.push({
        id: redencion.id,
        reward_id: redencion.reward_id,
        reward_name: redencion.reward_name,
        points_used: Number(redencion.points_used || 0),
        status: redencion.status,
      })
      current.points_total += Number(redencion.points_used || 0)
      current.ids.push(redencion.id)

      if (current.status !== redencion.status) {
        current.status = "mixed"
      }
    })

    return Array.from(grouped.values()).sort((a, b) => b.raw_date.localeCompare(a.raw_date))
  }, [redenciones, profilesMap])

  const gruposFiltrados = useMemo(() => {
    const cliente = filtroCliente.trim().toLowerCase()
    const estado = filtroEstado.trim().toLowerCase()
    const fecha = filtroFecha.trim()

    return grupos.filter((grupo) => {
      const coincideCliente =
        !cliente ||
        grupo.client_name.toLowerCase().includes(cliente) ||
        grupo.user_email.toLowerCase().includes(cliente) ||
        (grupo.document_number || "").toLowerCase().includes(cliente) ||
        (grupo.advisor_name || "").toLowerCase().includes(cliente)

      const coincideEstado = !estado || grupo.status.toLowerCase() === estado
      const coincideFecha = !fecha || grupo.date_only === fecha

      return coincideCliente && coincideEstado && coincideFecha
    })
  }, [grupos, filtroCliente, filtroEstado, filtroFecha])

  const devolverStockDeItems = async (items: GrupoItem[]) => {
    const itemsNoCancelados = items.filter((item) => item.status !== "cancelled")
    const conteoPorPremio: Record<string, number> = {}

    for (const item of itemsNoCancelados) {
      if (item.reward_id) {
        conteoPorPremio[item.reward_id] = (conteoPorPremio[item.reward_id] || 0) + 1
      }
    }

    for (const rewardId of Object.keys(conteoPorPremio)) {
      const cantidadADevolver = conteoPorPremio[rewardId]

      const { data: rewardData, error: rewardError } = await supabase
        .from("rewards")
        .select("id, stock")
        .eq("id", rewardId)
        .single()

      if (rewardError || !rewardData) {
        throw new Error("No se pudo devolver el stock de uno de los premios.")
      }

      const stockActual = Number(rewardData.stock || 0)

      const { error: stockUpdateError } = await supabase
        .from("rewards")
        .update({ stock: stockActual + cantidadADevolver })
        .eq("id", rewardId)

      if (stockUpdateError) {
        throw new Error("Ocurrió un error al devolver el stock del premio.")
      }
    }
  }

  const cambiarEstadoGrupo = async (grupo: GrupoRedencion, nuevoEstado: string) => {
    setMensaje("")

    if (nuevoEstado === "cancelled") {
      try {
        const itemsNoCancelados = grupo.items.filter((item) => item.status !== "cancelled")

        if (itemsNoCancelados.length === 0) {
          setTipoMensaje("info")
          setMensaje("Este grupo ya estaba cancelado.")
          return
        }

        await devolverStockDeItems(itemsNoCancelados)

        const idsACancelar = itemsNoCancelados.map((item) => item.id)

        const { error } = await supabase
          .from("redemptions")
          .update({ status: "cancelled" })
          .in("id", idsACancelar)

        if (error) {
          setTipoMensaje("error")
          setMensaje("Ocurrió un error al cancelar la redención: " + error.message)
          return
        }

        setTipoMensaje("success")
        setMensaje("Redención cancelada correctamente. Se devolvieron stock y puntos.")
        cargarRedenciones()
        return
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error al cancelar."
        setTipoMensaje("error")
        setMensaje(errorMessage)
        return
      }
    }

    const { error } = await supabase
      .from("redemptions")
      .update({ status: nuevoEstado })
      .in("id", grupo.ids)

    if (error) {
      setTipoMensaje("error")
      setMensaje("Ocurrió un error al actualizar la redención: " + error.message)
      return
    }

    setTipoMensaje("success")
    setMensaje(`Redenciones actualizadas a estado: ${traducirEstado(nuevoEstado)}`)
    cargarRedenciones()
  }

  const pedirEliminarGrupo = (grupo: GrupoRedencion) => {
    setGrupoAEliminar(grupo)
    setConfirmOpen(true)
  }

  const cerrarModalEliminar = () => {
    if (eliminando) return
    setConfirmOpen(false)
    setGrupoAEliminar(null)
  }

  const confirmarEliminarGrupo = async () => {
    if (!grupoAEliminar) return

    setMensaje("")
    setEliminando(true)

    try {
      const itemsNoCancelados = grupoAEliminar.items.filter((item) => item.status !== "cancelled")

      if (itemsNoCancelados.length > 0) {
        await devolverStockDeItems(itemsNoCancelados)
      }

      const { error } = await supabase
        .from("redemptions")
        .delete()
        .in("id", grupoAEliminar.ids)

      if (error) {
        setTipoMensaje("error")
        setMensaje("Ocurrió un error al eliminar la solicitud: " + error.message)
        setEliminando(false)
        return
      }

      setTipoMensaje("success")
      setMensaje("Solicitud eliminada correctamente.")
      await cargarRedenciones()
      setEliminando(false)
      setConfirmOpen(false)
      setGrupoAEliminar(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al eliminar la solicitud."
      setTipoMensaje("error")
      setMensaje(errorMessage)
      setEliminando(false)
    }
  }

  const traducirEstado = (status: string) => {
    if (status === "requested") return "Solicitada"
    if (status === "approved") return "Aprobada"
    if (status === "shipped") return "Enviada"
    if (status === "delivered") return "Entregada"
    if (status === "cancelled") return "Cancelada"
    if (status === "mixed") return "Mixto"
    return status
  }

  const resumirPremios = (items: GrupoItem[]) => {
    const conteo: Record<string, number> = {}

    items.forEach((item) => {
      conteo[item.reward_name] = (conteo[item.reward_name] || 0) + 1
    })

    return Object.entries(conteo).map(([nombre, cantidad]) => `${cantidad} x ${nombre}`)
  }

  const estadoBadge = (estado: string) => {
    if (estado === "approved") {
      return {
        background: "#ecfdf3",
        color: "#166534",
        border: "1px solid #bbf7d0",
      }
    }

    if (estado === "cancelled") {
      return {
        background: "#fef2f2",
        color: "#991b1b",
        border: "1px solid #fecaca",
      }
    }

    if (estado === "shipped" || estado === "delivered") {
      return {
        background: "#eff6ff",
        color: "#1d4ed8",
        border: "1px solid #bfdbfe",
      }
    }

    if (estado === "mixed") {
      return {
        background: "#f3f4f6",
        color: "#4b5563",
        border: "1px solid #d1d5db",
      }
    }

    return {
      background: "#fff7ed",
      color: "#9a3412",
      border: "1px solid #fed7aa",
    }
  }

  const totalSolicitudes = grupos.length
  const totalItems = redenciones.length
  const totalPuntos = redenciones.reduce((acc, r) => acc + Number(r.points_used || 0), 0)
  const totalPendientes = grupos.filter((g) => g.status === "requested").length
  const totalAprobadas = grupos.filter((g) => g.status === "approved").length
  const totalCanceladas = grupos.filter((g) => g.status === "cancelled").length

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
        <div className="pysta-shell" style={{ maxWidth: "1640px" }}>
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
                <span className="pysta-badge">Gestión de redenciones</span>
                <h1 className="pysta-section-title">Administrar redenciones</h1>
                <p className="pysta-subtitle">
                  Revisa solicitudes reales agrupadas, cambia su estado y controla devoluciones de stock.
                </p>
              </div>

              <AdminLogoutButton />
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
            <ResumenCard titulo="Solicitudes" valor={String(totalSolicitudes)} descripcion="Grupos reales de redención" />
            <ResumenCard titulo="Ítems redimidos" valor={String(totalItems)} descripcion="Premios solicitados" />
            <ResumenCard titulo="Puntos usados" valor={String(totalPuntos)} descripcion="Total comprometido" />
            <ResumenCard titulo="Pendientes" valor={String(totalPendientes)} descripcion="Aún por gestionar" />
            <ResumenCard titulo="Aprobadas" valor={String(totalAprobadas)} descripcion="Listas para proceso" />
            <ResumenCard titulo="Canceladas" valor={String(totalCanceladas)} descripcion="Con stock devuelto" />
          </section>

          <section className="pysta-card" style={{ padding: "24px", marginBottom: "22px" }}>
            <div style={{ display: "grid", gap: "8px", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Filtros</h2>
              <p style={{ margin: 0, color: "#6b7280" }}>
                Filtra por cliente, correo, documento, asesor, estado o fecha de solicitud.
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
                <label style={labelStyle}>Filtrar por cliente</label>
                <input
                  className="pysta-input"
                  type="text"
                  placeholder="Nombre, correo, documento o asesor"
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
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
                  <option value="requested">Solicitadas</option>
                  <option value="approved">Aprobadas</option>
                  <option value="shipped">Enviadas</option>
                  <option value="delivered">Entregadas</option>
                  <option value="cancelled">Canceladas</option>
                  <option value="mixed">Mixto</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Filtrar por fecha</label>
                <input
                  className="pysta-input"
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={() => {
                setFiltroCliente("")
                setFiltroEstado("")
                setFiltroFecha("")
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
                padding: "22px 24px",
                borderBottom: "1px solid #e5e7eb",
                background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Listado de redenciones</h2>
              <p style={{ margin: "6px 0 0 0", color: "#6b7280" }}>
                Total encontradas: {gruposFiltrados.length}
              </p>
            </div>

            {cargando ? (
              <div style={{ padding: "24px", color: "#333" }}>Cargando redenciones...</div>
            ) : gruposFiltrados.length === 0 ? (
              <div style={{ padding: "24px", color: "#333" }}>No hay redenciones para esos filtros.</div>
            ) : (
              <div style={{ padding: "18px" }}>
                <div style={{ display: "grid", gap: "14px" }}>
                  {gruposFiltrados.map((grupo) => (
                    <article
                      key={grupo.key}
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
                            {grupo.client_name}
                          </h3>

                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            <span style={miniBadge}>{grupo.date_label}</span>
                            <span
                              style={{
                                ...miniBadge,
                                ...estadoBadge(grupo.status),
                              }}
                            >
                              {traducirEstado(grupo.status)}
                            </span>
                          </div>
                        </div>

                        <div className="pysta-actions">
                          <button
                            onClick={() => cambiarEstadoGrupo(grupo, "approved")}
                            className="pysta-btn pysta-btn-gold"
                            style={smallActionBtn}
                          >
                            Aprobar
                          </button>

                          <button
                            onClick={() => cambiarEstadoGrupo(grupo, "shipped")}
                            className="pysta-btn pysta-btn-dark"
                            style={smallActionBtn}
                          >
                            Enviado
                          </button>

                          <button
                            onClick={() => cambiarEstadoGrupo(grupo, "delivered")}
                            className="pysta-btn pysta-btn-light"
                            style={smallActionBtn}
                          >
                            Entregado
                          </button>

                          <button
                            onClick={() => cambiarEstadoGrupo(grupo, "cancelled")}
                            className="pysta-btn pysta-btn-light"
                            style={{ ...smallActionBtn, border: "1px solid #e5e7eb" }}
                          >
                            Cancelar
                          </button>

                          <button
                            onClick={() => pedirEliminarGrupo(grupo)}
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
                          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                          gap: "12px",
                        }}
                      >
                        <InfoItem label="Correo" value={grupo.user_email} />
                        <InfoItem label="Documento" value={grupo.document_number || "-"} />
                        <InfoItem label="Asesor" value={grupo.advisor_name || "-"} />
                        <InfoItem label="Puntos usados" value={String(grupo.points_total)} />
                      </div>

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
                          Premios solicitados
                        </p>

                        <div style={{ display: "grid", gap: "6px" }}>
                          {resumirPremios(grupo.items).map((texto, index) => (
                            <p key={`${grupo.key}-${index}`} style={{ margin: 0, color: "#111", lineHeight: 1.5 }}>
                              • {texto}
                            </p>
                          ))}
                        </div>
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
        title="Eliminar solicitud"
        message={
          grupoAEliminar
            ? `¿Seguro que deseas eliminar la solicitud de ${grupoAEliminar.client_name}? Esta acción no se puede deshacer.`
            : ""
        }
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        danger
        loading={eliminando}
        onCancel={cerrarModalEliminar}
        onConfirm={confirmarEliminarGrupo}
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