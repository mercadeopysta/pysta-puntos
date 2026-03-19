"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "../../lib/supabase"
import LogoutButton from "../../components/LogoutButton"
import InfoPopup from "../../components/InfoPopup"

type FacturaSaldo = {
  amount_without_vat: number
  invoice_date: string
}

type Redencion = {
  points_used: number
  created_at: string
  status?: string | null
}

type SettingsRow = {
  redemption_percentage: number
  points_expiration_enabled: boolean
  points_expiration_months: number
}

type InvoiceStatusRow = {
  id: string
  status: string | null
}

type RedemptionStatusRow = {
  id: string
  status: string | null
}

type PuntosVencimientoInfo = {
  puntosVigentes: number
  puntosPorVencer: number
  proximaFechaVencimiento: string
}

type NotificationRow = {
  id: string
  user_email: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [autorizado, setAutorizado] = useState(false)
  const [nombre, setNombre] = useState("")
  const [tipoCliente, setTipoCliente] = useState("")
  const [puntosDisponibles, setPuntosDisponibles] = useState(0)
  const [puntosRedimidos, setPuntosRedimidos] = useState(0)
  const [cargando, setCargando] = useState(true)

  const [facturasPendientes, setFacturasPendientes] = useState(0)
  const [facturasRechazadas, setFacturasRechazadas] = useState(0)
  const [redencionesPendientes, setRedencionesPendientes] = useState(0)
  const [redencionesCanceladas, setRedencionesCanceladas] = useState(0)

  const [puntosPorVencer, setPuntosPorVencer] = useState(0)
  const [proximaFechaVencimiento, setProximaFechaVencimiento] = useState("")

  const [notificaciones, setNotificaciones] = useState<NotificationRow[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false)
  const [mensajeDashboard, setMensajeDashboard] = useState("")

  const calcularResumenPuntos = (
    facturasAprobadas: FacturaSaldo[],
    porcentaje: number,
    vencimientoActivo: boolean,
    mesesVigencia: number
  ): PuntosVencimientoInfo => {
    const hoy = new Date()
    const en30Dias = new Date()
    en30Dias.setDate(en30Dias.getDate() + 30)

    let puntosVigentes = 0
    let puntosPorVencer = 0
    let proximaFecha: Date | null = null

    for (const factura of facturasAprobadas) {
      const valor = Number(factura.amount_without_vat || 0)
      const valorInterno = valor * (porcentaje / 100)
      const puntosFactura = Math.floor(valorInterno / 100)

      if (puntosFactura <= 0) continue

      if (!vencimientoActivo) {
        puntosVigentes += puntosFactura
        continue
      }

      const fechaFactura = new Date(factura.invoice_date)
      const fechaVencimiento = new Date(fechaFactura)
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + mesesVigencia)

      if (fechaVencimiento >= hoy) {
        puntosVigentes += puntosFactura

        if (fechaVencimiento <= en30Dias) {
          puntosPorVencer += puntosFactura

          if (!proximaFecha || fechaVencimiento < proximaFecha) {
            proximaFecha = fechaVencimiento
          }
        }
      }
    }

    return {
      puntosVigentes,
      puntosPorVencer,
      proximaFechaVencimiento: proximaFecha
        ? proximaFecha.toLocaleDateString("es-CO")
        : "",
    }
  }

  const cargarNotificaciones = async (email: string) => {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_email, title, message, type, is_read, created_at")
      .eq("user_email", email)
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) return

    const rows = (data as NotificationRow[]) || []
    setNotificaciones(rows)
    setNoLeidas(rows.filter((n) => !n.is_read).length)
  }

  const marcarNotificacionesComoLeidas = async () => {
    const pendientes = notificaciones.filter((n) => !n.is_read)
    if (pendientes.length === 0) return

    const ids = pendientes.map((n) => n.id)

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", ids)

    if (!error) {
      setNotificaciones((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
        }))
      )
      setNoLeidas(0)
    }
  }

  const togglePanelNotificaciones = async () => {
    const nuevoEstado = !mostrarNotificaciones
    setMostrarNotificaciones(nuevoEstado)

    if (nuevoEstado) {
      await marcarNotificacionesComoLeidas()
    }
  }

  const formatearFechaNotificacion = (fecha: string) => {
    const date = new Date(fecha)
    return date.toLocaleString("es-CO")
  }

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
            "redemption_percentage, points_expiration_enabled, points_expiration_months"
          )
          .limit(1)
          .single()

        const settings = settingsData as SettingsRow | null
        const porcentaje = Number(settings?.redemption_percentage || 6)
        const vencimientoActivo = Boolean(settings?.points_expiration_enabled)
        const mesesVigencia = Number(settings?.points_expiration_months || 1)

        const { data: facturasData } = await supabase
          .from("invoices")
          .select("amount_without_vat, invoice_date")
          .eq("user_email", email)
          .eq("status", "approved")

        const facturasAprobadas = (facturasData as FacturaSaldo[]) || []
        const resumenPuntos = calcularResumenPuntos(
          facturasAprobadas,
          porcentaje,
          vencimientoActivo,
          mesesVigencia
        )

        const { data: redencionesData } = await supabase
          .from("redemptions")
          .select("points_used, created_at, status")
          .eq("user_email", email)
          .neq("status", "cancelled")

        let totalRedimido = 0

        if (redencionesData) {
          totalRedimido = (redencionesData as Redencion[]).reduce((acum, redencion) => {
            return acum + Number(redencion.points_used || 0)
          }, 0)
        }

        const { data: facturasEstadoData } = await supabase
          .from("invoices")
          .select("id, status")
          .eq("user_email", email)

        const { data: redencionesEstadoData } = await supabase
          .from("redemptions")
          .select("id, status")
          .eq("user_email", email)

        const facturasEstado = (facturasEstadoData as InvoiceStatusRow[]) || []
        const redencionesEstado = (redencionesEstadoData as RedemptionStatusRow[]) || []

        setFacturasPendientes(
          facturasEstado.filter((factura) => (factura.status || "") === "pending").length
        )
        setFacturasRechazadas(
          facturasEstado.filter((factura) => (factura.status || "") === "rejected").length
        )
        setRedencionesPendientes(
          redencionesEstado.filter((redencion) => (redencion.status || "") === "requested").length
        )
        setRedencionesCanceladas(
          redencionesEstado.filter((redencion) => (redencion.status || "") === "cancelled").length
        )

        setPuntosPorVencer(resumenPuntos.puntosPorVencer)
        setProximaFechaVencimiento(resumenPuntos.proximaFechaVencimiento)

        setPuntosRedimidos(totalRedimido)
        setPuntosDisponibles(Math.max(resumenPuntos.puntosVigentes - totalRedimido, 0))

        await cargarNotificaciones(email)

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

  useEffect(() => {
    const notice = searchParams.get("notice")

    if (notice === "invoice_pending") {
      setMensajeDashboard("Tu factura quedó pendiente de aprobación por administración.")
    } else {
      setMensajeDashboard("")
    }
  }, [searchParams])

  const refrescarPantalla = () => {
    window.location.reload()
  }

  const notificacionesOrdenadas = useMemo(() => notificaciones, [notificaciones])

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
          padding: "20px",
        }}
      >
        Validando acceso...
      </main>
    )
  }

  if (!autorizado) {
    return null
  }

  return (
    <>
      <InfoPopup
        storageKey="popup-dashboard-cliente"
        title="Información sobre tus premios"
        message="Los premios o ítems redimidos serán enviados junto con el siguiente pedido que realices. También puedes revisar el estado de tus solicitudes en la sección Mis redenciones."
      />

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
                    flexShrink: 0,
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

                <div style={{ display: "grid", gap: "8px", minWidth: 0 }}>
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

                  <h1
                    style={{
                      margin: 0,
                      fontSize: "clamp(28px, 5vw, 34px)",
                      color: "#111",
                      lineHeight: 1.1,
                    }}
                  >
                    Hola{nombre ? `, ${nombre}` : ""}
                  </h1>

                  <p style={{ margin: 0, color: "#6b7280", fontSize: "15px", lineHeight: 1.5 }}>
                    {tipoCliente ? `Tipo de cliente: ${tipoCliente}` : "Bienvenido a tu panel de beneficios"}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  onClick={togglePanelNotificaciones}
                  style={{
                    position: "relative",
                    background: "#e9e9e9",
                    color: "#111",
                    border: "none",
                    padding: "12px 16px",
                    borderRadius: "14px",
                    cursor: "pointer",
                    fontSize: "18px",
                    fontWeight: 700,
                    minWidth: "54px",
                  }}
                  title="Notificaciones"
                >
                  🔔
                  {noLeidas > 0 ? (
                    <span
                      style={{
                        position: "absolute",
                        top: "-6px",
                        right: "-6px",
                        minWidth: "22px",
                        height: "22px",
                        padding: "0 6px",
                        borderRadius: "999px",
                        background: "#dc2626",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid #fff",
                      }}
                    >
                      {noLeidas > 99 ? "99+" : noLeidas}
                    </span>
                  ) : null}
                </button>

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

          {mensajeDashboard ? (
            <section
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1d4ed8",
                borderRadius: "18px",
                padding: "16px 18px",
                marginBottom: "22px",
                boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
              }}
            >
              {mensajeDashboard}
            </section>
          ) : null}

          {mostrarNotificaciones ? (
            <section
              style={{
                background: "#fff",
                borderRadius: "24px",
                padding: "22px",
                boxShadow: "0 14px 40px rgba(0,0,0,0.08)",
                border: "1px solid rgba(0,0,0,0.04)",
                marginBottom: "22px",
              }}
            >
              <div style={{ marginBottom: "16px" }}>
                <h2 style={{ margin: 0, fontSize: "24px", color: "#111" }}>Notificaciones</h2>
                <p style={{ margin: "8px 0 0 0", color: "#6b7280", lineHeight: 1.5 }}>
                  Aquí verás los cambios importantes de tus facturas y redenciones.
                </p>
              </div>

              {notificacionesOrdenadas.length === 0 ? (
                <div
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "16px",
                    padding: "16px",
                    color: "#6b7280",
                  }}
                >
                  No tienes notificaciones todavía.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {notificacionesOrdenadas.map((notificacion) => (
                    <div
                      key={notificacion.id}
                      style={{
                        background: notificacion.is_read ? "#f9fafb" : "#eff6ff",
                        border: notificacion.is_read ? "1px solid #e5e7eb" : "1px solid #bfdbfe",
                        borderRadius: "16px",
                        padding: "14px 16px",
                        display: "grid",
                        gap: "6px",
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
                        <strong style={{ color: "#111", fontSize: "15px" }}>{notificacion.title}</strong>
                        <span style={{ color: "#6b7280", fontSize: "12px" }}>
                          {formatearFechaNotificacion(notificacion.created_at)}
                        </span>
                      </div>

                      <p style={{ margin: 0, color: "#374151", lineHeight: 1.5 }}>
                        {notificacion.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}

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
              titulo="Puntos por vencer pronto"
              valor={String(puntosPorVencer)}
              descripcion="Vencen en los próximos 30 días"
            />
            <ResumenCard
              titulo="Próximo vencimiento"
              valor={proximaFechaVencimiento || "Sin vencimiento cercano"}
              descripcion="Fecha estimada más próxima"
            />
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
              titulo="Facturas pendientes"
              valor={String(facturasPendientes)}
              descripcion="Pendientes por revisión"
            />
            <ResumenCard
              titulo="Facturas rechazadas"
              valor={String(facturasRechazadas)}
              descripcion="Con observaciones"
            />
            <ResumenCard
              titulo="Redenciones pendientes"
              valor={String(redencionesPendientes)}
              descripcion="Solicitudes en proceso"
            />
            <ResumenCard
              titulo="Redenciones canceladas"
              valor={String(redencionesCanceladas)}
              descripcion="Con nota administrativa"
            />
          </section>

          <section
            style={{
              background: "#fff",
              borderRadius: "24px",
              padding: "22px",
              boxShadow: "0 14px 40px rgba(0,0,0,0.08)",
              border: "1px solid rgba(0,0,0,0.04)",
              marginBottom: "24px",
              display: "grid",
              gap: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  padding: "6px 10px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: "rgba(212, 175, 55, 0.14)",
                  color: "#7a5b00",
                  border: "1px solid rgba(212, 175, 55, 0.24)",
                }}
              >
                Información importante
              </span>

              <p style={{ margin: 0, color: "#111", lineHeight: 1.6, fontSize: "15px" }}>
                Los premios o ítems redimidos serán enviados junto con el siguiente pedido que realices.
              </p>
            </div>

            {puntosPorVencer > 0 ? (
              <div
                style={{
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  borderRadius: "18px",
                  padding: "16px 18px",
                  display: "grid",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    width: "fit-content",
                    padding: "6px 10px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: 700,
                    background: "#ea580c",
                    color: "#fff",
                  }}
                >
                  Atención
                </span>

                <h3 style={{ margin: 0, fontSize: "20px", color: "#9a3412", lineHeight: 1.2 }}>
                  Tienes puntos próximos a vencer
                </h3>

                <p style={{ margin: 0, color: "#7c2d12", lineHeight: 1.6 }}>
                  Tienes <strong>{puntosPorVencer}</strong> punto(s) que vencerán pronto
                  {proximaFechaVencimiento ? `, con una fecha estimada de vencimiento el ${proximaFechaVencimiento}` : ""}.
                </p>
              </div>
            ) : (
              <div
                style={{
                  background: "#ecfdf3",
                  border: "1px solid #bbf7d0",
                  borderRadius: "18px",
                  padding: "16px 18px",
                  display: "grid",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    width: "fit-content",
                    padding: "6px 10px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: 700,
                    background: "#166534",
                    color: "#fff",
                  }}
                >
                  Todo bien
                </span>

                <h3 style={{ margin: 0, fontSize: "20px", color: "#166534", lineHeight: 1.2 }}>
                  No tienes vencimientos cercanos
                </h3>

                <p style={{ margin: 0, color: "#166534", lineHeight: 1.6 }}>
                  Tus puntos no tienen vencimientos próximos dentro de los siguientes 30 días.
                </p>
              </div>
            )}
          </section>

          <section
            style={{
              background: "#fff",
              borderRadius: "24px",
              padding: "24px",
              boxShadow: "0 14px 40px rgba(0,0,0,0.08)",
              border: "1px solid rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "26px", color: "#111" }}>Accesos rápidos</h2>
              <p style={{ margin: "8px 0 0 0", color: "#6b7280", lineHeight: 1.5 }}>
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
        minWidth: 0,
      }}
    >
      <p style={{ margin: 0, color: "#6b7280", fontSize: "14px", fontWeight: 700 }}>{titulo}</p>
      <h3
        style={{
          margin: "10px 0 8px 0",
          fontSize: "clamp(24px, 5vw, 34px)",
          color: "#111",
          lineHeight: 1.1,
          wordBreak: "break-word",
        }}
      >
        {valor}
      </h3>
      <p style={{ margin: 0, color: "#555", fontSize: "14px", lineHeight: 1.45 }}>{descripcion}</p>
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
        minWidth: 0,
      }}
    >
      <h3 style={{ margin: 0, fontSize: "22px", color: "#111", lineHeight: 1.2 }}>{titulo}</h3>
      <p style={{ margin: "10px 0 0 0", color: "#6b7280", lineHeight: 1.5 }}>{descripcion}</p>
    </Link>
  )
}