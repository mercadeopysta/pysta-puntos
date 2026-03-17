"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import LogoutButton from "../../components/LogoutButton"

type FacturaSaldo = {
  amount_without_vat: number
  invoice_date: string
}

type Redencion = {
  points_used: number
  created_at: string
}

type SettingsRow = {
  redemption_percentage: number
  monthly_redemption_limit: number
  points_expiration_enabled: boolean
  points_expiration_months: number
}

export default function DashboardPage() {
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [nombre, setNombre] = useState("")
  const [tipoCliente, setTipoCliente] = useState("")
  const [puntosDisponibles, setPuntosDisponibles] = useState(0)
  const [puntosRedimidos, setPuntosRedimidos] = useState(0)
  const [itemsRedimidosMes, setItemsRedimidosMes] = useState(0)
  const [limiteMensual, setLimiteMensual] = useState(5)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const validarYCargar = async () => {
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
          .select("id, email, full_name, client_type, is_active, is_approved")
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

        const email = profile.email || ""
        const nombreCliente = profile.full_name || ""
        const tipo = profile.client_type || ""

        localStorage.setItem("cliente_email", email)
        localStorage.setItem("cliente_name", nombreCliente)
        localStorage.setItem("cliente_tipo", tipo)

        setNombre(nombreCliente)
        setTipoCliente(tipo)

        const { data: settingsData } = await supabase
          .from("settings")
          .select(
            "redemption_percentage, monthly_redemption_limit, points_expiration_enabled, points_expiration_months"
          )
          .limit(1)
          .single()

        const settings = settingsData as SettingsRow | null
        const porcentaje = Number(settings?.redemption_percentage || 6)
        const limite = Number(settings?.monthly_redemption_limit || 5)
        const vencimientoActivo = Boolean(settings?.points_expiration_enabled)
        const mesesVigencia = Number(settings?.points_expiration_months || 1)

        setLimiteMensual(limite)

        const { data: facturasData } = await supabase
          .from("invoices")
          .select("amount_without_vat, invoice_date")
          .eq("user_email", email)
          .eq("status", "approved")

        let acumulados = 0

        if (facturasData) {
          const hoy = new Date()

          const facturasVigentes = (facturasData as FacturaSaldo[]).filter((factura) => {
            if (!vencimientoActivo) return true

            const fechaFactura = new Date(factura.invoice_date)
            const fechaVencimiento = new Date(fechaFactura)
            fechaVencimiento.setMonth(fechaVencimiento.getMonth() + mesesVigencia)

            return fechaVencimiento >= hoy
          })

          const totalCompras = facturasVigentes.reduce((acum, factura) => {
            return acum + Number(factura.amount_without_vat || 0)
          }, 0)

          const valorInterno = totalCompras * (porcentaje / 100)
          acumulados = Math.floor(valorInterno / 100)
        }

        const { data: redencionesData } = await supabase
          .from("redemptions")
          .select("points_used, created_at")
          .eq("user_email", email)
          .neq("status", "cancelled")

        let totalRedimido = 0
        let itemsMes = 0

        if (redencionesData) {
          totalRedimido = (redencionesData as Redencion[]).reduce((acum, redencion) => {
            return acum + Number(redencion.points_used || 0)
          }, 0)

          const hoy = new Date()
          const mesActual = hoy.getMonth()
          const anioActual = hoy.getFullYear()

          ;(redencionesData as Redencion[]).forEach((redencion) => {
            const fecha = new Date(redencion.created_at)
            const mismoMes = fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual

            if (mismoMes) {
              itemsMes += 1
            }
          })
        }

        setPuntosRedimidos(totalRedimido)
        setItemsRedimidosMes(itemsMes)
        setPuntosDisponibles(Math.max(acumulados - totalRedimido, 0))
        setAutorizado(true)
      } catch {
        await supabase.auth.signOut()
        localStorage.removeItem("cliente_email")
        localStorage.removeItem("cliente_name")
        localStorage.removeItem("cliente_tipo")
        router.replace("/login")
      } finally {
        setCargando(false)
      }
    }

    validarYCargar()
  }, [router])

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
        Validando acceso...
      </main>
    )
  }

  if (!autorizado) {
    return null
  }

  const itemsDisponiblesMes = Math.max(limiteMensual - itemsRedimidosMes, 0)

  return (
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
                  Programa de puntos Pysta
                </span>

                <h1 style={{ margin: 0, fontSize: "34px", color: "#111" }}>
                  Hola{nombre ? `, ${nombre}` : ""}
                </h1>

                <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
                  {tipoCliente ? `Tipo de cliente: ${tipoCliente}` : "Bienvenido a tu panel de beneficios"}
                </p>
              </div>
            </div>

            <LogoutButton />
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <ResumenCard
            titulo="Puntos disponibles"
            valor={String(puntosDisponibles)}
            descripcion="Los que puedes usar ahora mismo"
          />
          <ResumenCard
            titulo="Puntos redimidos"
            valor={String(puntosRedimidos)}
            descripcion="Total de puntos ya usados"
          />
          <ResumenCard
            titulo="Ítems redimidos este mes"
            valor={`${itemsRedimidosMes}/${limiteMensual}`}
            descripcion="Control mensual de redenciones"
          />
          <ResumenCard
            titulo="Ítems disponibles este mes"
            valor={String(itemsDisponiblesMes)}
            descripcion="Lo que aún puedes redimir"
          />
        </section>

        <section
          style={{
            background: "#fff",
            borderRadius: "24px",
            padding: "26px",
            boxShadow: "0 14px 40px rgba(0,0,0,0.08)",
            border: "1px solid rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ marginBottom: "18px" }}>
            <h2 style={{ margin: 0, fontSize: "26px", color: "#111" }}>Accesos rápidos</h2>
            <p style={{ margin: "8px 0 0 0", color: "#6b7280" }}>
              Gestiona tus facturas, premios y redenciones desde aquí.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: "16px",
            }}
          >
            <MenuCard
              href="/dashboard/facturas/nueva"
              titulo="Registrar factura"
              descripcion="Sube una nueva factura para validación."
            />

            <MenuCard
              href="/dashboard/premios"
              titulo="Ver premios"
              descripcion="Consulta premios, puntos y disponibilidad."
            />

            <MenuCard
              href="/dashboard/redenciones"
              titulo="Mis redenciones"
              descripcion="Revisa el estado de tus solicitudes."
            />

            <MenuCard
              href="/dashboard/mis-facturas"
              titulo="Mis facturas"
              descripcion="Mira el historial y estado de tus facturas."
            />
          </div>
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

function MenuCard({
  href,
  titulo,
  descripcion,
}: {
  href: string
  titulo: string
  descripcion: string
}) {
  return (
    <Link
      href={href}
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
        color: "#111",
        textDecoration: "none",
        padding: "22px",
        borderRadius: "20px",
        boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
        border: "1px solid #ececec",
        display: "block",
      }}
    >
      <h3 style={{ margin: 0, fontSize: "22px", color: "#111" }}>{titulo}</h3>
      <p style={{ margin: "10px 0 0 0", color: "#6b7280", lineHeight: 1.5 }}>{descripcion}</p>
    </Link>
  )
}