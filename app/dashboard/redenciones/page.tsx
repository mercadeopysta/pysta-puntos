"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import LogoutButton from "../../../components/LogoutButton"

type Redencion = {
  id: string
  reward_name: string | null
  points_used: number | null
  status: string | null
  created_at: string | null
  redemption_group_id: string | null
  admin_note?: string | null
  group_short_code?: string | null
}

type GrupoItem = {
  id: string
  reward_name: string
  points_used: number
  status: string
}

type GrupoRedencion = {
  key: string
  group_id: string
  display_code: string
  created_at: string
  fecha: string
  status: string
  items: GrupoItem[]
  total_puntos: number
  admin_note: string
}

export default function DashboardRedencionesPage() {
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [nombre, setNombre] = useState("")
  const [redenciones, setRedenciones] = useState<Redencion[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
          localStorage.removeItem("cliente_email")
          localStorage.removeItem("cliente_name")
          localStorage.removeItem("cliente_tipo")
          router.replace("/login")
          return
        }

        const user = session.user

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, full_name, is_active, is_approved")
          .eq("id", user.id)
          .maybeSingle()

        if (profileError || !profile) {
          await supabase.auth.signOut()
          localStorage.removeItem("cliente_email")
          localStorage.removeItem("cliente_name")
          localStorage.removeItem("cliente_tipo")
          router.replace("/login")
          return
        }

        if (!profile.is_active || !profile.is_approved) {
          await supabase.auth.signOut()
          localStorage.removeItem("cliente_email")
          localStorage.removeItem("cliente_name")
          localStorage.removeItem("cliente_tipo")
          router.replace("/login")
          return
        }

        localStorage.setItem("cliente_email", profile.email || "")
        localStorage.setItem("cliente_name", profile.full_name || "")
        setNombre(profile.full_name || "")

        const { data, error } = await supabase
          .from("redemptions")
          .select("id, reward_name, points_used, status, created_at, redemption_group_id, admin_note, group_short_code")
          .eq("user_email", profile.email)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error cargando redenciones del cliente:", error)
          setRedenciones([])
        } else {
          setRedenciones((data as Redencion[]) || [])
        }

        setAutorizado(true)
      } catch (error) {
        console.error("Error validando cliente:", error)
        await supabase.auth.signOut()
        localStorage.removeItem("cliente_email")
        localStorage.removeItem("cliente_name")
        localStorage.removeItem("cliente_tipo")
        router.replace("/login")
      } finally {
        setCargando(false)
      }
    }

    cargar()
  }, [router])

  const traducirEstado = (estado: string) => {
    if (estado === "requested") return "Solicitada"
    if (estado === "approved") return "Aprobada"
    if (estado === "shipped") return "Enviada"
    if (estado === "delivered") return "Entregada"
    if (estado === "cancelled") return "Cancelada"
    if (estado === "mixed") return "Mixto"
    return estado || "Sin estado"
  }

  const descripcionEstado = (estado: string) => {
    if (estado === "requested") return "Tu solicitud está pendiente de revisión."
    if (estado === "approved") return "Tu solicitud fue aprobada."
    if (estado === "shipped") return "Tus premios fueron enviados."
    if (estado === "delivered") return "Tus premios ya fueron entregados."
    if (estado === "cancelled") return "Tu solicitud fue cancelada."
    if (estado === "mixed") return "Tu solicitud tiene ítems con estados distintos."
    return "Estado actual de la solicitud."
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
          : `legacy-${dateKey}`

      if (!grouped.has(groupId)) {
        grouped.set(groupId, {
          key: groupId,
          group_id: groupId,
          display_code: redencion.group_short_code || groupId,
          created_at: redencion.created_at || new Date().toISOString(),
          fecha: fecha.toLocaleDateString("es-CO"),
          status: redencion.status || "requested",
          items: [],
          total_puntos: 0,
          admin_note: redencion.admin_note || "",
        })
      }

      const current = grouped.get(groupId)
      if (!current) return

      current.items.push({
        id: redencion.id,
        reward_name: redencion.reward_name || "Premio sin nombre",
        points_used: Number(redencion.points_used || 0),
        status: redencion.status || "requested",
      })

      current.total_puntos += Number(redencion.points_used || 0)

      if (current.status !== (redencion.status || "requested")) {
        current.status = "mixed"
      }

      if (!current.admin_note && redencion.admin_note) {
        current.admin_note = redencion.admin_note
      }

      if ((!current.display_code || current.display_code === current.group_id) && redencion.group_short_code) {
        current.display_code = redencion.group_short_code
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

  if (cargando) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
          fontFamily: "Arial, sans-serif",
          padding: "20px",
        }}
      >
        Cargando...
      </main>
    )
  }

  if (!autorizado) {
    return null
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f5f5f5 0%, #ececec 100%)",
        padding: "20px 14px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
        <section
          style={{
            background: "#ffffff",
            borderRadius: "24px",
            padding: "24px",
            boxShadow: "0 14px 40px rgba(0,0,0,0.08)",
            marginBottom: "22px",
            border: "1px solid rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "18px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
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
                Mis redenciones
              </span>

              <h1 style={{ margin: 0, fontSize: "32px", color: "#111" }}>
                {nombre ? `Hola, ${nombre}` : "Mis redenciones"}
              </h1>

              <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.5 }}>
                Revisa el estado de tus solicitudes y el código corto de cada redención.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Link href="/dashboard" style={secondaryButton}>
                Volver al dashboard
              </Link>
              <LogoutButton />
            </div>
          </div>
        </section>

        {grupos.length === 0 ? (
          <section
            style={{
              background: "#fff",
              borderRadius: "24px",
              padding: "24px",
              boxShadow: "0 14px 40px rgba(0,0,0,0.08)",
              border: "1px solid rgba(0,0,0,0.04)",
            }}
          >
            <h2 style={{ marginTop: 0, color: "#111" }}>Aún no tienes redenciones</h2>
            <p style={{ marginBottom: 0, color: "#6b7280", lineHeight: 1.6 }}>
              Cuando redimas premios, aquí verás el historial de tus solicitudes.
            </p>
          </section>
        ) : (
          <div style={{ display: "grid", gap: "16px" }}>
            {grupos.map((grupo) => (
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
                      {grupo.display_code || grupo.group_id}
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
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <InfoItem label="Código corto" value={grupo.display_code || "-"} />
                  <InfoItem label="Fecha" value={grupo.fecha} />
                  <InfoItem label="Cantidad de ítems" value={String(grupo.items.length)} />
                  <InfoItem label="Puntos usados" value={String(grupo.total_puntos)} />
                  <InfoItem label="Estado" value={traducirEstado(grupo.status)} />
                  <InfoItem label="Detalle" value={descripcionEstado(grupo.status)} />
                </div>

                {grupo.admin_note ? (
                  <div
                    style={{
                      marginTop: "12px",
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: "14px",
                      padding: "12px 14px",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 8px 0",
                        fontSize: "13px",
                        color: "#6b7280",
                        fontWeight: 700,
                      }}
                    >
                      Nota administrativa
                    </p>
                    <p style={{ margin: 0, color: "#111", lineHeight: 1.5 }}>{grupo.admin_note}</p>
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
                  <p
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "13px",
                      color: "#6b7280",
                      fontWeight: 700,
                    }}
                  >
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
        )}
      </div>
    </main>
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
      <p
        style={{
          margin: "0 0 6px 0",
          fontSize: "13px",
          color: "#6b7280",
          fontWeight: 700,
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: "15px",
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

const secondaryButton = {
  background: "#e9e9e9",
  color: "#111",
  textDecoration: "none",
  padding: "12px 18px",
  borderRadius: "14px",
  display: "inline-block",
  fontWeight: 700 as const,
}