"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"

type Redencion = {
  id: string
  user_email: string
  reward_id: string | null
  reward_name: string | null
  points_used: number | null
  status: string | null
  created_at: string | null
  redemption_group_id: string | null
  admin_note: string | null
}

type GrupoItem = {
  id: string
  reward_id: string | null
  reward_name: string
  points_used: number
  status: string
  admin_note: string
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
  admin_note: string
}

export default function RedencionesPage() {
  const router = useRouter()

  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [userEmail, setUserEmail] = useState("")
  const [redenciones, setRedenciones] = useState<Redencion[]>([])
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

  const cargarRedenciones = async (email: string) => {
    setCargando(true)
    setMensaje("")

    const { data, error } = await supabase
      .from("redemptions")
      .select("id, user_email, reward_id, reward_name, points_used, status, created_at, redemption_group_id, admin_note")
      .eq("user_email", email)
      .order("created_at", { ascending: false })

    if (error) {
      setMensaje("Ocurrió un error al cargar tus redenciones.")
      setCargando(false)
      return
    }

    setRedenciones((data as Redencion[]) || [])
    setCargando(false)
  }

  useEffect(() => {
    if (!cargandoSesion && userEmail) {
      cargarRedenciones(userEmail)
    }
  }, [cargandoSesion, userEmail])

  const traducirEstado = (status: string) => {
    if (status === "requested") return "Solicitada"
    if (status === "approved") return "Aprobada"
    if (status === "shipped") return "Enviada"
    if (status === "delivered") return "Entregada"
    if (status === "cancelled") return "Cancelada"
    if (status === "mixed") return "Mixto"
    return status || "Sin estado"
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
          admin_note: redencion.admin_note || "",
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
        admin_note: redencion.admin_note || "",
      })

      current.points_total += Number(redencion.points_used || 0)

      if (current.status !== (redencion.status || "requested")) {
        current.status = "mixed"
      }

      if (!current.admin_note && redencion.admin_note) {
        current.admin_note = redencion.admin_note
      }
    })

    return Array.from(grouped.values()).sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [redenciones])

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
        (grupo.date_label || "").toLowerCase().includes(texto) ||
        (grupo.admin_note || "").toLowerCase().includes(texto) ||
        premiosTexto.includes(texto)

      const coincideEstado = !estado || (grupo.status || "").toLowerCase() === estado

      return coincideTexto && coincideEstado
    })
  }, [grupos, filtroTexto, filtroEstado])

  const totalSolicitudes = grupos.length
  const totalPendientes = grupos.filter((g) => g.status === "requested").length
  const totalCanceladas = grupos.filter((g) => g.status === "cancelled").length
  const totalPuntos = grupos.reduce((acc, grupo) => acc + Number(grupo.points_total || 0), 0)

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
              <span className="pysta-badge">Mis redenciones</span>
              <h1 className="pysta-section-title">Historial de redenciones</h1>
              <p className="pysta-subtitle">
                Consulta el estado de tus solicitudes, los premios pedidos y las observaciones administrativas.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button onClick={() => cargarRedenciones(userEmail)} className="pysta-btn pysta-btn-light">
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
          <ResumenCard titulo="Solicitudes" valor={String(totalSolicitudes)} descripcion="Agrupadas por pedido" />
          <ResumenCard titulo="Pendientes" valor={String(totalPendientes)} descripcion="En revisión" />
          <ResumenCard titulo="Canceladas" valor={String(totalCanceladas)} descripcion="Con observación" />
          <ResumenCard titulo="Puntos usados" valor={String(totalPuntos)} descripcion="Total acumulado" />
        </section>

        <section className="pysta-card" style={{ padding: "24px", marginBottom: "22px" }}>
          <div style={{ display: "grid", gap: "8px", marginBottom: "18px" }}>
            <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Filtros</h2>
            <p style={{ margin: 0, color: "#6b7280" }}>
              Busca por fecha, premios o nota administrativa, y filtra por estado.
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
                placeholder="Fecha, premio o nota"
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
            <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Listado de solicitudes</h2>
            <p style={{ margin: "6px 0 0 0", color: "#6b7280" }}>
              Total encontradas: {gruposFiltrados.length}
            </p>
          </div>

          {cargando ? (
            <div style={{ padding: "24px", color: "#333" }}>Cargando redenciones...</div>
          ) : gruposFiltrados.length === 0 ? (
            <div style={{ padding: "24px", color: "#333" }}>No tienes redenciones para esos filtros.</div>
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

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                        gap: "12px",
                      }}
                    >
                      <InfoItem label="Solicitud ID" value={grupo.group_id} />
                      <InfoItem label="Cantidad de ítems" value={String(grupo.items.length)} />
                      <InfoItem label="Puntos usados" value={String(grupo.points_total)} />
                      <InfoItem label="Estado actual" value={traducirEstado(grupo.status)} />
                    </div>

                    {grupo.status === "cancelled" && grupo.admin_note ? (
                      <div
                        style={{
                          marginTop: "12px",
                          background: "linear-gradient(180deg, #fff5f5 0%, #fef2f2 100%)",
                          border: "1px solid #fecaca",
                          borderRadius: "16px",
                          padding: "14px",
                        }}
                      >
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "6px 10px",
                              borderRadius: "999px",
                              fontSize: "12px",
                              fontWeight: 700,
                              background: "#991b1b",
                              color: "#fff",
                            }}
                          >
                            Gestión administrativa
                          </span>

                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "6px 10px",
                              borderRadius: "999px",
                              fontSize: "12px",
                              fontWeight: 700,
                              background: "#fee2e2",
                              color: "#991b1b",
                              border: "1px solid #fecaca",
                            }}
                          >
                            Solicitud cancelada
                          </span>
                        </div>

                        <p
                          style={{
                            margin: "0 0 8px 0",
                            fontSize: "13px",
                            color: "#991b1b",
                            fontWeight: 700,
                          }}
                        >
                          Motivo informado por administración
                        </p>

                        <p
                          style={{
                            margin: 0,
                            color: "#111",
                            lineHeight: 1.5,
                          }}
                        >
                          {grupo.admin_note}
                        </p>
                      </div>
                    ) : null}

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