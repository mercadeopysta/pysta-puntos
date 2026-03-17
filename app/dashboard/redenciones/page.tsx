"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import LogoutButton from "../../../components/LogoutButton"
import InfoPopup from "../../../components/InfoPopup"

type Redencion = {
  id: string
  reward_name: string
  points_used: number
  status: string
  created_at: string
  redemption_group_id: string | null
  user_email: string
}

type ProfileRow = {
  id: string
  email: string
  advisor_name: string | null
  full_name?: string | null
  client_type?: string | null
  is_active: boolean
  is_approved: boolean
}

type GrupoRedencion = {
  key: string
  group_id: string
  date_label: string
  raw_date: string
  reward_names: string[]
  points_total: number
  status: string
  item_count: number
}

export default function RedencionesPage() {
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [redenciones, setRedenciones] = useState<Redencion[]>([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState("")
  const [asesorNombre, setAsesorNombre] = useState("")
  const [nombreCliente, setNombreCliente] = useState("")

  const cerrarSesionCliente = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem("cliente_email")
    localStorage.removeItem("cliente_name")
    localStorage.removeItem("cliente_tipo")
    router.replace("/login")
  }

  const cargarRedenciones = async () => {
    setCargando(true)

    try {
      const sessionResponse = await supabase.auth.getSession()
      const session = sessionResponse.data.session
      const sessionError = sessionResponse.error

      if (sessionError || !session?.user) {
        await cerrarSesionCliente()
        return
      }

      const user = session.user

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, advisor_name, full_name, client_type, is_active, is_approved")
        .eq("id", user.id)
        .maybeSingle()

      if (profileError || !profileData) {
        await cerrarSesionCliente()
        return
      }

      const perfil = profileData as ProfileRow

      if (!perfil.is_active || !perfil.is_approved) {
        await cerrarSesionCliente()
        return
      }

      localStorage.setItem("cliente_email", perfil.email || "")
      localStorage.setItem("cliente_name", perfil.full_name || "")
      localStorage.setItem("cliente_tipo", perfil.client_type || "")

      setNombreCliente(perfil.full_name || "")
      setAsesorNombre(perfil.advisor_name || "")
      setAutorizado(true)

      const { data, error } = await supabase
        .from("redemptions")
        .select("id, reward_name, points_used, status, created_at, redemption_group_id, user_email")
        .eq("user_email", perfil.email)
        .order("created_at", { ascending: false })

      if (error) {
        setMensaje("Ocurrió un error al cargar las redenciones.")
        return
      }

      setRedenciones((data as Redencion[]) || [])
    } catch {
      await cerrarSesionCliente()
      return
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarRedenciones()
  }, [])

  const grupos = useMemo(() => {
    const grouped = new Map<string, GrupoRedencion>()

    redenciones.forEach((redencion) => {
      const date = new Date(redencion.created_at)
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate()
      ).padStart(2, "0")}`

      const groupId =
        redencion.redemption_group_id && redencion.redemption_group_id.trim() !== ""
          ? redencion.redemption_group_id
          : `${redencion.user_email}__${dateKey}__legacy`

      if (!grouped.has(groupId)) {
        grouped.set(groupId, {
          key: groupId,
          group_id: groupId,
          date_label: date.toLocaleDateString("es-CO"),
          raw_date: date.toISOString(),
          reward_names: [],
          points_total: 0,
          status: redencion.status,
          item_count: 0,
        })
      }

      const current = grouped.get(groupId)!

      current.reward_names.push(redencion.reward_name)
      current.points_total += Number(redencion.points_used || 0)
      current.item_count += 1

      if (current.status !== redencion.status) {
        current.status = "mixed"
      }
    })

    return Array.from(grouped.values()).sort((a, b) => b.raw_date.localeCompare(a.raw_date))
  }, [redenciones])

  const traducirEstado = (status: string) => {
    if (status === "requested") return "Solicitada"
    if (status === "approved") return "Aprobada"
    if (status === "shipped") return "Enviada"
    if (status === "delivered") return "Entregada"
    if (status === "cancelled") return "Cancelada"
    if (status === "mixed") return "Mixto"
    return status
  }

  const descripcionEstado = (status: string) => {
    if (status === "requested") return "Tu solicitud fue registrada y está pendiente de revisión."
    if (status === "approved") return "Tu solicitud ya fue aprobada por administración."
    if (status === "shipped") return "Tus premios ya fueron despachados o van en camino con tu pedido."
    if (status === "delivered") return "Tus premios ya fueron entregados."
    if (status === "cancelled") return "Tu solicitud fue cancelada."
    if (status === "mixed") return "Esta solicitud tiene ítems con estados diferentes."
    return "Consulta el estado actual de tu solicitud."
  }

  const resumirPremios = (premios: string[]) => {
    const conteo: Record<string, number> = {}

    premios.forEach((premio) => {
      conteo[premio] = (conteo[premio] || 0) + 1
    })

    return Object.entries(conteo).map(([nombre, cantidad]) => `${cantidad} x ${nombre}`)
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

  const refrescarPantalla = () => {
    cargarRedenciones()
  }

  if (cargando) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
          background: "#f5f5f5",
        }}
      >
        Cargando redenciones...
      </main>
    )
  }

  if (!autorizado) {
    return null
  }

  return (
    <>
      <InfoPopup
        storageKey="popup-mis-redenciones"
        title="Estado de tus redenciones"
        message="Aquí puedes revisar el estado de tus solicitudes de premios. Recuerda que los ítems aprobados o enviados se despachan junto con el siguiente pedido que realices."
      />

      <main
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg, #f5f5f5 0%, #ececec 100%)",
          padding: "32px 20px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
          <section
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              padding: "28px",
              boxShadow: "0 14px 40px rgba(0,0,0,0.08)",
              marginBottom: "22px",
              border: "1px solid rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "18px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                <div
                  style={{
                    width: "84px",
                    height: "84px",
                    borderRadius: "18px",
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                  }}
                >
                  <img
                    src="/logo-pysta.png"
                    alt="Pysta"
                    style={{
                      maxWidth: "76px",
                      maxHeight: "76px",
                      objectFit: "contain",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gap: "8px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      width: "fit-content",
                      padding: "6px 12px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: 700,
                      background: "rgba(212, 175, 55, 0.14)",
                      color: "#7a5b00",
                      border: "1px solid rgba(212, 175, 55, 0.24)",
                    }}
                  >
                    Historial de redenciones
                  </span>

                  <h1 style={{ margin: 0, fontSize: "34px", color: "#111" }}>
                    Mis redenciones
                  </h1>

                  <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
                    {nombreCliente ? `Cliente: ${nombreCliente}` : "Consulta el estado de tus solicitudes"}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  onClick={refrescarPantalla}
                  style={{
                    background: "#e9e9e9",
                    color: "#111",
                    border: "none",
                    padding: "12px 18px",
                    borderRadius: "14px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  Refrescar
                </button>

                <LogoutButton />
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
            <ResumenCard
              titulo="Solicitudes"
              valor={String(grupos.length)}
              descripcion="Total de solicitudes registradas"
            />
            <ResumenCard
              titulo="Premios solicitados"
              valor={String(redenciones.length)}
              descripcion="Total de ítems redimidos"
            />
            <ResumenCard
              titulo="Puntos usados"
              valor={String(redenciones.reduce((acc, item) => acc + Number(item.points_used || 0), 0))}
              descripcion="Total de puntos utilizados"
            />
            <ResumenCard
              titulo="Asesor asignado"
              valor={asesorNombre || "-"}
              descripcion="Persona de apoyo para seguimiento"
            />
          </section>

          {mensaje ? (
            <section style={messageCardStyle}>{mensaje}</section>
          ) : grupos.length === 0 ? (
            <section style={emptyCardStyle}>
              <h2 style={{ margin: 0, fontSize: "24px", color: "#111" }}>Aún no has realizado redenciones</h2>
              <p style={{ margin: "10px 0 0 0", color: "#6b7280", lineHeight: 1.6 }}>
                Cuando redimas premios, aquí podrás consultar el historial y estado de cada solicitud.
              </p>

              <div style={{ marginTop: "20px" }}>
                <a href="/dashboard/premios" style={buttonGold}>
                  Ver premios disponibles
                </a>
              </div>
            </section>
          ) : (
            <section style={{ display: "grid", gap: "16px" }}>
              {grupos.map((grupo) => (
                <article
                  key={grupo.key}
                  style={{
                    background: "#fff",
                    borderRadius: "22px",
                    padding: "22px",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.07)",
                    border: "1px solid rgba(0,0,0,0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "16px",
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                      marginBottom: "16px",
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, color: "#6b7280", fontSize: "13px", fontWeight: 700 }}>
                        SOLICITUD
                      </p>
                      <h3 style={{ margin: "6px 0 0 0", fontSize: "24px", color: "#111" }}>
                        {grupo.date_label}
                      </h3>
                    </div>

                    <span
                      style={{
                        ...estadoStyles(grupo.status),
                        padding: "8px 12px",
                        borderRadius: "999px",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      {traducirEstado(grupo.status)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "14px",
                    }}
                  >
                    <InfoItem label="Solicitud ID" value={grupo.group_id} />
                    <InfoItem label="Cantidad de ítems" value={String(grupo.item_count)} />
                    <InfoItem label="Puntos usados" value={String(grupo.points_total)} />
                    <InfoItem label="Estado actual" value={traducirEstado(grupo.status)} />
                    <InfoItem label="Detalle" value={descripcionEstado(grupo.status)} />
                    <InfoItem label="Premios" value={resumirPremios(grupo.reward_names).join(" · ")} />
                  </div>
                </article>
              ))}
            </section>
          )}

          <div style={{ marginTop: "28px", display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <a href="/dashboard/premios" style={buttonGold}>
              Ver premios
            </a>

            <a href="/dashboard" style={buttonDark}>
              Volver al panel
            </a>
          </div>
        </div>
      </main>
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
      style={{
        background: "#fff",
        borderRadius: "22px",
        padding: "22px",
        boxShadow: "0 10px 28px rgba(0,0,0,0.07)",
        border: "1px solid rgba(0,0,0,0.04)",
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
        borderRadius: "16px",
        padding: "14px 16px",
      }}
    >
      <p style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#6b7280", fontWeight: 700 }}>
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: "16px",
          color: "#111",
          lineHeight: 1.5,
          wordBreak: "break-word",
        }}
      >
        {value}
      </p>
    </div>
  )
}

const messageCardStyle = {
  background: "#fff",
  borderRadius: "22px",
  padding: "22px",
  boxShadow: "0 12px 30px rgba(0,0,0,0.07)",
  border: "1px solid rgba(0,0,0,0.04)",
  color: "#111",
}

const emptyCardStyle = {
  background: "#fff",
  borderRadius: "22px",
  padding: "28px",
  boxShadow: "0 12px 30px rgba(0,0,0,0.07)",
  border: "1px solid rgba(0,0,0,0.04)",
}

const buttonDark = {
  backgroundColor: "#111",
  color: "white",
  textDecoration: "none",
  padding: "14px 24px",
  borderRadius: "14px",
  display: "inline-block",
  fontWeight: "bold" as const,
}

const buttonGold = {
  backgroundColor: "#d4af37",
  color: "#111",
  textDecoration: "none",
  padding: "14px 24px",
  borderRadius: "14px",
  display: "inline-block",
  fontWeight: "bold" as const,
}