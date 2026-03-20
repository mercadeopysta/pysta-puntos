"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
}

type SettingsRow = {
  redemption_percentage: number
  points_expiration_enabled: boolean
  points_expiration_months: number
}

type Notificacion = {
  id: string
  user_email: string
  title: string
  message: string
  type: string | null
  is_read: boolean
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const notificationRef = useRef<HTMLDivElement | null>(null)

  const [autorizado, setAutorizado] = useState(false)
  const [nombre, setNombre] = useState("")
  const [tipoCliente, setTipoCliente] = useState("")
  const [puntosDisponibles, setPuntosDisponibles] = useState(0)
  const [puntosRedimidos, setPuntosRedimidos] = useState(0)
  const [cargando, setCargando] = useState(true)

  const [clienteEmail, setClienteEmail] = useState("")
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [notificacionesOpen, setNotificacionesOpen] = useState(false)
  const [cargandoNotificaciones, setCargandoNotificaciones] = useState(false)

  const normalizarTexto = (texto: string | null | undefined) => {
    return (texto || "").trim().toLowerCase()
  }

  const obtenerTituloNotificacion = (notificacion: Notificacion) => {
    const type = normalizarTexto(notificacion.type)
    const title = (notificacion.title || "").trim()
    const titleLower = normalizarTexto(notificacion.title)
    const messageLower = normalizarTexto(notificacion.message)

    if (type === "invoice_approved") return "Factura aprobada"
    if (type === "invoice_rejected") return "Factura rechazada"
    if (type === "redemption_approved") return "Redención aprobada"
    if (type === "redemption_shipped") return "Redención enviada"
    if (type === "redemption_delivered") return "Redención entregada"
    if (type === "redemption_cancelled") return "Redención cancelada"

    if (type === "success") {
      if (
        titleLower.includes("entreg") ||
        messageLower.includes("entreg")
      ) {
        return "Redención entregada"
      }
      if (
        titleLower.includes("enviad") ||
        messageLower.includes("enviad")
      ) {
        return "Redención enviada"
      }
      if (
        titleLower.includes("aprob") ||
        titleLower.includes("acept") ||
        messageLower.includes("aprob") ||
        messageLower.includes("acept")
      ) {
        return "Redención aprobada"
      }
      return "Actualización de redención"
    }

    if (type === "warning") return title || "Notificación importante"
    if (type === "error") return title || "Notificación importante"

    if (
      titleLower === "invoice_approved" ||
      titleLower === "approved invoice"
    ) {
      return "Factura aprobada"
    }

    if (
      titleLower === "invoice_rejected" ||
      titleLower === "rejected invoice"
    ) {
      return "Factura rechazada"
    }

    if (titleLower === "success") {
      if (
        messageLower.includes("entreg")
      ) {
        return "Redención entregada"
      }
      if (
        messageLower.includes("enviad")
      ) {
        return "Redención enviada"
      }
      if (
        messageLower.includes("aprob") ||
        messageLower.includes("acept")
      ) {
        return "Redención aprobada"
      }
      return "Actualización"
    }

    return title || "Notificación"
  }

  const obtenerMensajeNotificacion = (notificacion: Notificacion) => {
    const type = normalizarTexto(notificacion.type)
    const titleLower = normalizarTexto(notificacion.title)
    const message = (notificacion.message || "").trim()
    const messageLower = normalizarTexto(notificacion.message)

    if (type === "invoice_approved") {
      return message || "Tu factura fue aprobada correctamente."
    }

    if (type === "invoice_rejected") {
      return message || "Tu factura fue rechazada."
    }

    if (type === "redemption_approved") {
      return message || "Tu solicitud de redención fue aprobada correctamente."
    }

    if (type === "redemption_shipped") {
      return message || "Tu redención fue enviada."
    }

    if (type === "redemption_delivered") {
      return message || "Tu redención fue entregada correctamente."
    }

    if (type === "redemption_cancelled") {
      return message || "Tu solicitud de redención fue cancelada."
    }

    if (type === "success") {
      if (message) return message

      if (titleLower.includes("entreg")) {
        return "Tu redención fue entregada correctamente."
      }

      if (titleLower.includes("enviad")) {
        return "Tu redención fue enviada."
      }

      if (titleLower.includes("aprob") || titleLower.includes("acept")) {
        return "Tu solicitud de redención fue aprobada correctamente."
      }

      return "Tu solicitud fue actualizada correctamente."
    }

    if (messageLower === "success") {
      return "Tu solicitud fue actualizada correctamente."
    }

    return message || "Tienes una nueva notificación."
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
          .select("id, email, full_name, client_type, is_active, is_approved, redemption_percentage")
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

        setClienteEmail(email)
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
        const porcentajeGeneral = Number(settings?.redemption_percentage || 6)
        const porcentajeCliente = Number(profile.redemption_percentage || 0)
        const porcentajeFinal = porcentajeCliente > 0 ? porcentajeCliente : porcentajeGeneral

        const vencimientoActivo = Boolean(settings?.points_expiration_enabled)
        const mesesVigencia = Number(settings?.points_expiration_months || 1)

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

          const valorInterno = totalCompras * (porcentajeFinal / 100)
          acumulados = Math.floor(valorInterno / 100)
        }

        const { data: redencionesData } = await supabase
          .from("redemptions")
          .select("points_used, created_at")
          .eq("user_email", email)
          .neq("status", "cancelled")

        let totalRedimido = 0

        if (redencionesData) {
          totalRedimido = (redencionesData as Redencion[]).reduce((acum, redencion) => {
            return acum + Number(redencion.points_used || 0)
          }, 0)
        }

        setPuntosRedimidos(totalRedimido)
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

  const cargarNotificaciones = async () => {
    const email = clienteEmail || localStorage.getItem("cliente_email") || ""
    if (!email) return

    setCargandoNotificaciones(true)

    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_email, title, message, type, is_read, created_at")
      .eq("user_email", email)
      .order("created_at", { ascending: false })
      .limit(20)

    if (!error) {
      setNotificaciones((data as Notificacion[]) || [])
    }

    setCargandoNotificaciones(false)
  }

  useEffect(() => {
    if (!autorizado || !clienteEmail) return

    cargarNotificaciones()

    const channel = supabase
      .channel(`notifications-${clienteEmail}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_email=eq.${clienteEmail}`,
        },
        () => {
          cargarNotificaciones()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [autorizado, clienteEmail])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!notificationRef.current) return
      if (!notificationRef.current.contains(event.target as Node)) {
        setNotificacionesOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const toggleNotificaciones = async () => {
    const nuevoEstado = !notificacionesOpen
    setNotificacionesOpen(nuevoEstado)

    if (nuevoEstado) {
      await cargarNotificaciones()
    }
  }

  const marcarTodasLeidas = async () => {
    const idsNoLeidas = notificaciones.filter((n) => !n.is_read).map((n) => n.id)

    if (idsNoLeidas.length === 0) return

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", idsNoLeidas)

    if (!error) {
      setNotificaciones((prev) =>
        prev.map((n) => ({
          ...n,
          is_read: true,
        }))
      )
    }
  }

  const refrescarPantalla = () => {
    window.location.reload()
  }

  const totalNoLeidas = notificaciones.filter((n) => !n.is_read).length

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
                <div style={{ position: "relative" }} ref={notificationRef}>
                  <button
                    onClick={toggleNotificaciones}
                    style={{
                      position: "relative",
                      background: "#ffffff",
                      color: "#111",
                      border: "1px solid #e5e7eb",
                      padding: "12px 14px",
                      borderRadius: "14px",
                      cursor: "pointer",
                      fontSize: "20px",
                      fontWeight: 700,
                      minWidth: "52px",
                      boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
                    }}
                    aria-label="Notificaciones"
                    title="Notificaciones"
                  >
                    🔔
                    {totalNoLeidas > 0 && (
                      <span
                        style={{
                          position: "absolute",
                          top: "-6px",
                          right: "-6px",
                          minWidth: "22px",
                          height: "22px",
                          borderRadius: "999px",
                          background: "#dc2626",
                          color: "#fff",
                          fontSize: "11px",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "0 6px",
                          border: "2px solid #fff",
                        }}
                      >
                        {totalNoLeidas > 99 ? "99+" : totalNoLeidas}
                      </span>
                    )}
                  </button>

                  {notificacionesOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "62px",
                        right: 0,
                        width: "360px",
                        maxWidth: "calc(100vw - 28px)",
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "18px",
                        boxShadow: "0 18px 40px rgba(0,0,0,0.14)",
                        overflow: "hidden",
                        zIndex: 50,
                      }}
                    >
                      <div
                        style={{
                          padding: "16px",
                          borderBottom: "1px solid #e5e7eb",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div>
                          <h3 style={{ margin: 0, fontSize: "18px", color: "#111" }}>Notificaciones</h3>
                          <p style={{ margin: "4px 0 0 0", color: "#6b7280", fontSize: "13px" }}>
                            {totalNoLeidas > 0
                              ? `${totalNoLeidas} sin leer`
                              : "No tienes notificaciones pendientes"}
                          </p>
                        </div>

                        {totalNoLeidas > 0 && (
                          <button
                            onClick={marcarTodasLeidas}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#111",
                              cursor: "pointer",
                              fontWeight: 700,
                              fontSize: "13px",
                            }}
                          >
                            Marcar leídas
                          </button>
                        )}
                      </div>

                      <div
                        style={{
                          maxHeight: "380px",
                          overflowY: "auto",
                          padding: "10px",
                          display: "grid",
                          gap: "10px",
                        }}
                      >
                        {cargandoNotificaciones ? (
                          <div style={{ padding: "14px", color: "#6b7280" }}>
                            Cargando notificaciones...
                          </div>
                        ) : notificaciones.length === 0 ? (
                          <div
                            style={{
                              padding: "14px",
                              color: "#6b7280",
                              background: "#fafafa",
                              borderRadius: "14px",
                              border: "1px solid #eee",
                            }}
                          >
                            No tienes notificaciones todavía.
                          </div>
                        ) : (
                          notificaciones.map((notificacion) => (
                            <div
                              key={notificacion.id}
                              style={{
                                padding: "14px",
                                borderRadius: "14px",
                                border: notificacion.is_read ? "1px solid #ececec" : "1px solid #bfdbfe",
                                background: notificacion.is_read ? "#fafafa" : "#eff6ff",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  gap: "10px",
                                  marginBottom: "6px",
                                }}
                              >
                                <p
                                  style={{
                                    margin: 0,
                                    fontWeight: 700,
                                    color: "#111",
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {obtenerTituloNotificacion(notificacion)}
                                </p>

                                {!notificacion.is_read && (
                                  <span
                                    style={{
                                      width: "9px",
                                      height: "9px",
                                      borderRadius: "999px",
                                      background: "#2563eb",
                                      flexShrink: 0,
                                      marginTop: "6px",
                                    }}
                                  />
                                )}
                              </div>

                              <p
                                style={{
                                  margin: "0 0 8px 0",
                                  color: "#4b5563",
                                  fontSize: "14px",
                                  lineHeight: 1.5,
                                }}
                              >
                                {obtenerMensajeNotificacion(notificacion)}
                              </p>

                              <p
                                style={{
                                  margin: 0,
                                  color: "#6b7280",
                                  fontSize: "12px",
                                }}
                              >
                                {new Date(notificacion.created_at).toLocaleString("es-CO")}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

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
          </section>

          <section
            style={{
              background: "#fff",
              borderRadius: "24px",
              padding: "22px",
              boxShadow: "0 14px 40px rgba(0,0,0,0.08)",
              border: "1px solid rgba(0,0,0,0.04)",
              marginBottom: "24px",
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
          fontSize: "clamp(28px, 6vw, 34px)",
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