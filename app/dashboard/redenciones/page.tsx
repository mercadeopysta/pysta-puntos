"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import LogoutButton from "../../../components/LogoutButton"

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
}

export default function RedencionesPage() {
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [redenciones, setRedenciones] = useState<Redencion[]>([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState("")
  const [asesorNombre, setAsesorNombre] = useState("")

  const cerrarSesionCliente = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem("cliente_email")
    localStorage.removeItem("cliente_name")
    localStorage.removeItem("cliente_tipo")
    router.replace("/login")
  }

  useEffect(() => {
    const cargarRedenciones = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

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

        setAsesorNombre(perfil.advisor_name || "")
        setAutorizado(true)

        const { data, error } = await supabase
          .from("redemptions")
          .select("id, reward_name, points_used, status, created_at, redemption_group_id, user_email")
          .eq("user_email", perfil.email)
          .order("created_at", { ascending: false })

        if (error) {
          setMensaje("Ocurrió un error al cargar las redenciones.")
          setCargando(false)
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

    cargarRedenciones()
  }, [router])

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
        })
      }

      const current = grouped.get(groupId)!
      current.reward_names.push(redencion.reward_name)
      current.points_total += Number(redencion.points_used || 0)

      if (current.status !== redencion.status) {
        current.status = "mixed"
      }
    })

    return Array.from(grouped.values()).sort((a, b) =>
      b.raw_date.localeCompare(a.raw_date)
    )
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

  const resumirPremios = (premios: string[]) => {
    const conteo: Record<string, number> = {}

    premios.forEach((premio) => {
      conteo[premio] = (conteo[premio] || 0) + 1
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
          fontFamily: "Arial, sans-serif",
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
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "10px",
          }}
        >
          <h1 style={{ fontSize: "32px", color: "#111", margin: 0 }}>
            Mis redenciones
          </h1>

          <LogoutButton />
        </div>

        <p style={{ color: "#555", marginBottom: "20px" }}>
          Aquí puedes consultar el historial de solicitudes de premios que has realizado.
        </p>

        {asesorNombre && (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              padding: "18px 20px",
              marginBottom: "20px",
            }}
          >
            <p style={{ margin: 0, color: "#555" }}>Asesor asignado</p>
            <p style={{ margin: "6px 0 0 0", color: "#111", fontWeight: "bold", fontSize: "20px" }}>
              {asesorNombre}
            </p>
            <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: "14px" }}>
              Puedes notificarle a tu asesor sobre el estado de tus redenciones.
            </p>
          </div>
        )}

        {mensaje ? (
          <div style={cardStyle}>
            <p style={{ color: "#333" }}>{mensaje}</p>
          </div>
        ) : grupos.length === 0 ? (
          <div style={cardStyle}>
            <p style={{ color: "#333" }}>Aún no has realizado redenciones.</p>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.8fr 1fr 1fr 1fr",
                backgroundColor: "#111",
                color: "white",
                padding: "16px",
                fontWeight: "bold",
              }}
            >
              <div>Premios solicitados</div>
              <div>Fecha</div>
              <div>Puntos usados</div>
              <div>Estado</div>
            </div>

            {grupos.map((grupo) => (
              <div key={grupo.key} style={rowStyle}>
                <div>
                  {resumirPremios(grupo.reward_names).map((texto, index) => (
                    <div key={`${grupo.key}-${index}`} style={{ marginBottom: "6px" }}>
                      • {texto}
                    </div>
                  ))}
                </div>

                <div>{grupo.date_label}</div>
                <div>{grupo.points_total}</div>
                <div>{traducirEstado(grupo.status)}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "30px" }}>
          <a href="/dashboard" style={buttonBack}>
            Volver al panel
          </a>
        </div>
      </div>
    </main>
  )
}

const cardStyle = {
  backgroundColor: "white",
  borderRadius: "16px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  padding: "24px",
}

const rowStyle = {
  display: "grid",
  gridTemplateColumns: "1.8fr 1fr 1fr 1fr",
  padding: "16px",
  borderBottom: "1px solid #eee",
  color: "#333",
  alignItems: "start",
  gap: "12px",
}

const buttonBack = {
  backgroundColor: "#111",
  color: "white",
  textDecoration: "none",
  padding: "14px 24px",
  borderRadius: "10px",
  display: "inline-block",
}