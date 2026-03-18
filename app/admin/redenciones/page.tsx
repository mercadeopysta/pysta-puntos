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
  reward_name: string | null
  points_used: number | null
  status: string | null
  created_at: string | null
  redemption_group_id: string | null
}

type ProfileRow = {
  email: string
  full_name: string | null
  document_number?: string | null
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
  created_at: string
  date_label: string
  status: string
  items: GrupoItem[]
  points_total: number
  customer_name: string
  document_number: string
  advisor_name: string
}

type BulkAction = "approved" | "shipped" | "delivered" | "cancelled" | ""

export default function AdminRedencionesPage() {
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [redenciones, setRedenciones] = useState<Redencion[]>([])
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileRow>>({})
  const [cargando, setCargando] = useState(true)

  const [mensaje, setMensaje] = useState("")
  const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "warning" | "info">("info")

  const [filtroTexto, setFiltroTexto] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")

  const [seleccionados, setSeleccionados] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState<BulkAction>("")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState("")
  const [confirmMessage, setConfirmMessage] = useState("")
  const [confirmDanger, setConfirmDanger] = useState(false)
  const [ejecutandoMasivo, setEjecutandoMasivo] = useState(false)

  const [grupoAEliminar, setGrupoAEliminar] = useState<GrupoRedencion | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [eliminandoGrupo, setEliminandoGrupo] = useState(false)

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

    try {
      const { data: redencionesData, error: redencionesError } = await supabase
        .from("redemptions")
        .select("id, user_email, reward_id, reward_name, points_used, status, created_at, redemption_group_id")
        .order("created_at", { ascending: false })

      if (redencionesError) {
        setTipoMensaje("error")
        setMensaje("Ocurrió un error al cargar las redenciones: " + redencionesError.message)
        setCargando(false)
        return
      }

      const redencionesRows = ((redencionesData as Redencion[]) || []).map((r) => ({
        id: String(r.id || ""),
        user_email: String(r.user_email || ""),
        reward_id: r.reward_id || null,
        reward_name: r.reward_name || "",
        points_used: Number(r.points_used || 0),
        status: String(r.status || "requested"),
        created_at: r.created_at || new Date().toISOString(),
        redemption_group_id: r.redemption_group_id || null,
      }))

      setRedenciones(redencionesRows)

      const correos = Array.from(new Set(redencionesRows.map((r) => r.user_email).filter(Boolean)))

      if (correos.length > 0) {
        const { data: perfilesData, error: perfilesError } = await supabase
          .from("profiles")
          .select("email, full_name, document_number, advisor_name")
          .in("email", correos)

        if (perfilesError) {
          console.error("Error cargando perfiles para redenciones:", perfilesError)
          setProfilesMap({})
        } else {
          const mapa: Record<string, ProfileRow> = {}

          ;((perfilesData as ProfileRow[]) || []).forEach((perfil) => {
            if (perfil?.email) {
              mapa[perfil.email] = {
                email: perfil.email,
                full_name: perfil.full_name || "",
                document_number: perfil.document_number || "",
                advisor_name: perfil.advisor_name || "",
              }
            }
          })

          setProfilesMap(mapa)
        }
      } else {
        setProfilesMap({})
      }
    } catch (error) {
      console.error("Error inesperado cargando redenciones:", error)
      setTipoMensaje("error")
      setMensaje("Ocurrió un error inesperado al cargar redenciones.")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (autorizado) {
      cargarDatos()
    }
  }, [autorizado])

  const traducirEstado = (status: string) => {
    if (status === "requested") return "Solicitada"
    if (status === "approved") return "Aprobada"
    if (status === "shipped") return "Enviada"
    if (status === "delivered") return "Entregada"
    if (status === "cancelled") return "Cancelada"
    if (status === "mixed") return "Mixto"
    return status || "Sin estado"
  }

  const descripcionEstado = (status: string) => {
    if (status === "requested") return "Pendiente de revisión por administración."
    if (status === "approved") return "Solicitud aprobada."
    if (status === "shipped") return "Premios enviados junto al pedido o en tránsito."
    if (status === "delivered") return "Premios entregados."
    if (status === "cancelled") return "Solicitud cancelada."
    if (status === "mixed") return "La solicitud contiene ítems con estados distintos."
    return "Estado actual de la solicitud."
  }

  const grupos = useMemo(() => {
    const grouped = new Map<string, GrupoRedencion>()

    redenciones.forEach((redencion) => {
      const fecha = new Date(redencion.created_at || new Date().toISOString())
      const dateKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(
        fecha.getDate()
      ).padStart(2, "0")}`

      const groupId =
        redencion.redemption_group_id && redencion.redemption_group_id.trim() !== ""
          ? redencion.redemption_group_id
          : `${redencion.user_email || "sin-email"}__${dateKey}__legacy`

      const perfil = profilesMap[redencion.user_email || ""]

      if (!grouped.has(groupId)) {
        grouped.set(groupId, {
          key: groupId,
          group_id: groupId,
          user_email: redencion.user_email || "",
          created_at: redencion.created_at || new Date().toISOString(),
          date_label: fecha.toLocaleDateString("es-CO"),
          status: redencion.status || "requested",
          items: [],
          points_total: 0,
          customer_name: perfil?.full_name || "",
          document_number: perfil?.document_number || "",
          advisor_name: perfil?.advisor_name || "",
        })
      }

      const current = grouped.get(groupId)

      if (!current) return

      current.items.push({
        id: redencion.id,
        reward_id: redencion.reward_id || null,
        reward_name: redencion.reward_name || "Premio sin nombre",
        points_used: Number(redencion.points_used || 0),
        status: redencion.status || "requested",
      })

      current.points_total += Number(redencion.points_used || 0)

      if (current.status !== (redencion.status || "requested")) {
        current.status = "mixed"
      }
    })

    return Array.from(grouped.values()).sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [redenciones, profilesMap])

  const resumirPremios = (items: GrupoItem[]) => {
    const conteo: Record<string, number> = {}

    items.forEach((item) => {
      const nombre = item.reward_name || "Premio sin nombre"
      conteo[nombre] = (conteo[nombre] || 0) + 1
    })

    return Object.entries(conteo).map(([nombre, cantidad]) => `${cantidad} x ${nombre}`)
  }

  const gruposFiltrados = useMemo(() => {
    const texto = filtroTexto.trim().toLowerCase()
    const estado = filtroEstado.trim().toLowerCase()

    return grupos.filter((grupo) => {
      const premiosTexto = resumirPremios(grupo.items || []).join(" ").toLowerCase()

      const coincideTexto =
        !texto ||
        (grupo.group_id || "").toLowerCase().includes(texto) ||
        (grupo.user_email || "").toLowerCase().includes(texto) ||
        (grupo.customer_name || "").toLowerCase().includes(texto) ||
        (grupo.document_number || "").toLowerCase().includes(texto) ||
        (grupo.advisor_name || "").toLowerCase().includes(texto) ||
        premiosTexto.includes(texto)

      const coincideEstado = !estado || (grupo.status || "").toLowerCase() === estado

      return coincideTexto && coincideEstado
    })
  }, [grupos, filtroTexto, filtroEstado])

  const totalSolicitudes = grupos.length
  const totalItems = redenciones.length
  const totalPendientes = grupos.filter((g) => g.status === "requested").length
  const totalPuntos = grupos.reduce((acc, grupo) => acc + Number(grupo.points_total || 0), 0)

  const idsVisibles = gruposFiltrados.map((g) => g.group_id)
  const todosVisiblesSeleccionados =
    idsVisibles.length > 0 && idsVisibles.every((id) => seleccionados.includes(id))

  const toggleSeleccion = (groupId: string) => {
    setSeleccionados((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    )
  }

  const toggleSeleccionarTodosVisibles = () => {
    if (todosVisiblesSeleccionados) {
      setSeleccionados((prev) => prev.filter((id) => !idsVisibles.includes(id)))
      return
    }

    setSeleccionados((prev) => Array.from(new Set([...prev, ...idsVisibles])))
  }

  const estadoStyles = (estado: string) => {
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

    return {
      background: "#fff7ed",
      color: "#9a3412",
      border: "1px solid #fed7aa",
    }
  }

  const actualizarGrupoEstado = async (
    grupo: GrupoRedencion,
    nuevoEstado: "approved" | "shipped" | "delivered"
  ) => {
    setMensaje("")

    const ids = (grupo.items || []).map((item) => item.id).filter(Boolean)

    if (ids.length === 0) {
      setTipoMensaje("warning")
      setMensaje("La solicitud no tiene ítems válidos para actualizar.")
      return
    }

    const { error } = await supabase
      .from("redemptions")
      .update({ status: nuevoEstado })
      .in("id", ids)

    if (error) {
      setTipoMensaje("error")
      setMensaje("No se pudo actualizar la solicitud: " + error.message)
      return
    }

    setTipoMensaje("success")
    setMensaje(`Solicitud actualizada a ${traducirEstado(nuevoEstado)}.`)
    cargarDatos()
  }

  const cancelarGrupoYDevolverStock = async (grupo: GrupoRedencion) => {
    setMensaje("")

    const ids = (grupo.items || []).map((item) => item.id).filter(Boolean)

    if (ids.length === 0) {
      setTipoMensaje("warning")
      setMensaje("La solicitud no tiene ítems válidos para cancelar.")
      return
    }

    for (const item of grupo.items || []) {
      if (!item.reward_id) continue

      const { data: rewardData } = await supabase
        .from("rewards")
        .select("stock")
        .eq("id", item.reward_id)
        .maybeSingle()

      const stockActual = Number(rewardData?.stock || 0)

      const { error: rewardError } = await supabase
        .from("rewards")
        .update({ stock: stockActual + 1 })
        .eq("id", item.reward_id)

      if (rewardError) {
        setTipoMensaje("error")
        setMensaje("No se pudo devolver el stock de uno de los premios.")
        return
      }
    }

    const { error } = await supabase
      .from("redemptions")
      .update({ status: "cancelled" })
      .in("id", ids)

    if (error) {
      setTipoMensaje("error")
      setMensaje("No se pudo cancelar la solicitud: " + error.message)
      return
    }

    setTipoMensaje("success")
    setMensaje("Solicitud cancelada correctamente y stock devuelto.")
    cargarDatos()
  }

  const pedirEliminarGrupo = (grupo: GrupoRedencion) => {
    setGrupoAEliminar(grupo)
    setConfirmDeleteOpen(true)
  }

  const cerrarEliminarGrupo = () => {
    if (eliminandoGrupo) return
    setConfirmDeleteOpen(false)
    setGrupoAEliminar(null)
  }

  const confirmarEliminarGrupo = async () => {
    if (!grupoAEliminar) return

    setEliminandoGrupo(true)
    setMensaje("")

    const ids = (grupoAEliminar.items || []).map((item) => item.id).filter(Boolean)

    if (ids.length === 0) {
      setTipoMensaje("warning")
      setMensaje("La solicitud no tiene ítems válidos para eliminar.")
      setEliminandoGrupo(false)
      return
    }

    const { error } = await supabase
      .from("redemptions")
      .delete()
      .in("id", ids)

    if (error) {
      setTipoMensaje("error")
      setMensaje("No se pudo eliminar la solicitud: " + error.message)
      setEliminandoGrupo(false)
      return
    }

    setTipoMensaje("success")
    setMensaje("Solicitud eliminada correctamente.")
    setEliminandoGrupo(false)
    setConfirmDeleteOpen(false)
    setGrupoAEliminar(null)
    setSeleccionados((prev) => prev.filter((id) => id !== grupoAEliminar.group_id))
    cargarDatos()
  }

  const abrirConfirmacionMasiva = (accion: BulkAction) => {
    if (!accion) return

    if (seleccionados.length === 0) {
      setTipoMensaje("warning")
      setMensaje("Debes seleccionar al menos una solicitud.")
      return
    }

    setBulkAction(accion)
    setConfirmOpen(true)
    setConfirmDanger(accion === "cancelled")
    setConfirmTitle("Confirmar acción masiva")
    setConfirmMessage(`¿Seguro que deseas cambiar ${seleccionados.length} solicitud(es) a ${traducirEstado(accion)}?`)
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

    const gruposSeleccionados = grupos.filter((g) => seleccionados.includes(g.group_id))

    if (bulkAction === "cancelled") {
      for (const grupo of gruposSeleccionados) {
        for (const item of grupo.items || []) {
          if (!item.reward_id) continue

          const { data: rewardData } = await supabase
            .from("rewards")
            .select("stock")
            .eq("id", item.reward_id)
            .maybeSingle()

          const stockActual = Number(rewardData?.stock || 0)

          const { error: rewardError } = await supabase
            .from("rewards")
            .update({ stock: stockActual + 1 })
            .eq("id", item.reward_id)

          if (rewardError) {
            setTipoMensaje("error")
            setMensaje("No se pudo devolver el stock en la acción masiva.")
            setEjecutandoMasivo(false)
            return
          }
        }
      }
    }

    const ids = gruposSeleccionados.flatMap((grupo) => (grupo.items || []).map((item) => item.id)).filter(Boolean)

    if (ids.length === 0) {
      setTipoMensaje("warning")
      setMensaje("No hay ítems válidos para la acción masiva.")
      setEjecutandoMasivo(false)
      return
    }

    const { error } = await supabase
      .from("redemptions")
      .update({ status: bulkAction })
      .in("id", ids)

    if (error) {
      setTipoMensaje("error")
      setMensaje("No se pudo ejecutar la acción masiva: " + error.message)
      setEjecutandoMasivo(false)
      return
    }

    setTipoMensaje("success")
    setMensaje(`Acción masiva aplicada correctamente a ${seleccionados.length} solicitud(es).`)
    setSeleccionados([])
    setBulkAction("")
    setConfirmOpen(false)
    setEjecutandoMasivo(false)
    cargarDatos()
  }

  const exportarCSV = () => {
    if (gruposFiltrados.length === 0) {
      setTipoMensaje("warning")
      setMensaje("No hay solicitudes filtradas para exportar.")
      return
    }

    const filas = gruposFiltrados.map((grupo) => ({
      solicitud_id: grupo.group_id,
      fecha: grupo.date_label,
      correo: grupo.user_email,
      cliente: grupo.customer_name || "",
      documento: grupo.document_number || "",
      asesor: grupo.advisor_name || "",
      cantidad_items: String((grupo.items || []).length),
      premios: resumirPremios(grupo.items || []).join(" | "),
      puntos_usados: String(grupo.points_total || 0),
      estado: traducirEstado(grupo.status),
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
    link.setAttribute("download", `redenciones-pysta-${fecha}.csv`)
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
                <span className="pysta-badge">Gestión de redenciones</span>
                <h1 className="pysta-section-title">Administrar redenciones</h1>
                <p className="pysta-subtitle">
                  Gestiona solicitudes agrupadas, cambia estados, cancela con devolución de stock y exporta reportes.
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
            <ResumenCard titulo="Solicitudes" valor={String(totalSolicitudes)} descripcion="Solicitudes agrupadas" />
            <ResumenCard titulo="Ítems redimidos" valor={String(totalItems)} descripcion="Total de premios solicitados" />
            <ResumenCard titulo="Pendientes" valor={String(totalPendientes)} descripcion="Solicitudes por revisar" />
            <ResumenCard titulo="Puntos usados" valor={String(totalPuntos)} descripcion="Total acumulado" />
          </section>

          <section className="pysta-card" style={{ padding: "24px", marginBottom: "22px" }}>
            <div style={{ display: "grid", gap: "8px", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Filtros</h2>
              <p style={{ margin: 0, color: "#6b7280" }}>
                Busca por ID de solicitud, correo, cliente, documento, asesor o premios.
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
                  placeholder="Solicitud, correo, cliente, documento, asesor o premio"
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>Estado</label>
                <select className="pysta-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="requested">Solicitada</option>
                  <option value="approved">Aprobada</option>
                  <option value="shipped">Enviada</option>
                  <option value="delivered">Entregada</option>
                  <option value="cancelled">Cancelada</option>
                  <option value="mixed">Mixto</option>
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

                <button onClick={() => abrirConfirmacionMasiva("shipped")} className="pysta-btn pysta-btn-dark">
                  Marcar enviadas
                </button>

                <button onClick={() => abrirConfirmacionMasiva("delivered")} className="pysta-btn pysta-btn-light">
                  Marcar entregadas
                </button>

                <button onClick={() => abrirConfirmacionMasiva("cancelled")} className="pysta-btn pysta-btn-danger">
                  Cancelar seleccionadas
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
                  <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Listado de solicitudes</h2>
                  <p style={{ margin: "6px 0 0 0", color: "#6b7280" }}>
                    Total encontradas: {gruposFiltrados.length}
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
              <div style={{ padding: "24px", color: "#333" }}>Cargando redenciones...</div>
            ) : gruposFiltrados.length === 0 ? (
              <div style={{ padding: "24px", color: "#333" }}>No hay solicitudes para esos filtros.</div>
            ) : (
              <div style={{ padding: "18px" }}>
                <div style={{ display: "grid", gap: "14px" }}>
                  {gruposFiltrados.map((grupo) => {
                    const seleccionado = seleccionados.includes(grupo.group_id)

                    return (
                      <article
                        key={grupo.key}
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
                              onChange={() => toggleSeleccion(grupo.group_id)}
                              style={{ width: "18px", height: "18px", marginTop: "4px" }}
                            />

                            <div style={{ display: "grid", gap: "8px" }}>
                              <h3 style={{ margin: 0, color: "#111", fontSize: "22px" }}>
                                {grupo.date_label}
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
                                    ...estadoStyles(grupo.status),
                                  }}
                                >
                                  {traducirEstado(grupo.status)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pysta-actions">
                            {grupo.status !== "approved" && grupo.status !== "cancelled" && (
                              <button
                                onClick={() => actualizarGrupoEstado(grupo, "approved")}
                                className="pysta-btn pysta-btn-gold"
                                style={smallActionBtn}
                              >
                                Aprobar
                              </button>
                            )}

                            {grupo.status !== "shipped" && grupo.status !== "cancelled" && (
                              <button
                                onClick={() => actualizarGrupoEstado(grupo, "shipped")}
                                className="pysta-btn pysta-btn-dark"
                                style={smallActionBtn}
                              >
                                Enviar
                              </button>
                            )}

                            {grupo.status !== "delivered" && grupo.status !== "cancelled" && (
                              <button
                                onClick={() => actualizarGrupoEstado(grupo, "delivered")}
                                className="pysta-btn pysta-btn-light"
                                style={smallActionBtn}
                              >
                                Entregar
                              </button>
                            )}

                            {grupo.status !== "cancelled" && (
                              <button
                                onClick={() => cancelarGrupoYDevolverStock(grupo)}
                                className="pysta-btn pysta-btn-danger"
                                style={smallActionBtn}
                              >
                                Cancelar
                              </button>
                            )}

                            <button
                              onClick={() => pedirEliminarGrupo(grupo)}
                              className="pysta-btn pysta-btn-light"
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
                          <InfoItem label="Solicitud ID" value={grupo.group_id} />
                          <InfoItem label="Ítems en la solicitud" value={String((grupo.items || []).length)} />
                          <InfoItem label="Correo" value={grupo.user_email || "-"} />
                          <InfoItem label="Cliente" value={grupo.customer_name || "-"} />
                          <InfoItem label="Documento" value={grupo.document_number || "-"} />
                          <InfoItem label="Asesor" value={grupo.advisor_name || "-"} />
                          <InfoItem label="Puntos usados" value={String(grupo.points_total || 0)} />
                          <InfoItem label="Estado actual" value={traducirEstado(grupo.status)} />
                          <InfoItem label="Detalle" value={descripcionEstado(grupo.status)} />
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
                            {resumirPremios(grupo.items || []).map((texto, index) => (
                              <p key={`${grupo.key}-${index}`} style={{ margin: 0, color: "#111", lineHeight: 1.5 }}>
                                • {texto}
                              </p>
                            ))}
                          </div>
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
        title="Eliminar solicitud"
        message={
          grupoAEliminar
            ? `¿Seguro que deseas eliminar completamente la solicitud ${grupoAEliminar.group_id}? Esta acción no se puede deshacer.`
            : ""
        }
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        danger
        loading={eliminandoGrupo}
        onCancel={cerrarEliminarGrupo}
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