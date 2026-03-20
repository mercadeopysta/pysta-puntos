"use client"

import { useEffect, useMemo, useState } from "react"
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
  type: string
  is_read: boolean
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [nombre, setNombre] = useState("")
  const [tipoCliente, setTipoCliente] = useState("")
  const [puntosDisponibles, setPuntosDisponibles] = useState(0)
  const [puntosRedimidos, setPuntosRedimidos] = useState(0)
  const [cargando, setCargando] = useState(true)

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [notificacionesOpen, setNotificacionesOpen] = useState(false)
  const [cargandoNotificaciones, setCargandoNotificaciones] = useState(false)

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

        setNombre(nombreCliente)
        setTipoCliente(tipo)

        const { data: settingsData } = await supabase
          .from("settings")
          .select("redemption_percentage, points_expiration_enabled, points_expiration_months")
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

  const cargarNotificaciones = async (emailParam?: string) => {
    const email = emailParam || localStorage.getItem("cliente_email") || ""

    if (!email) return

    setCargandoNotificaciones(true)

    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_email, title, message, type, is_read, created_at")
      .eq("user_email", email)
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("Error cargando notificaciones:", error)
      setNotificaciones([])
      setCargandoNotificaciones(false)
      return
    }

    setNotificaciones((data as Notificacion[]) || [])
    setCargandoNotificaciones(false)
  }

  const marcarNotificacionesComoLeidas = async () => {
    const noLeidas = notificaciones.filter((item) => !item.is_read)

    if (noLeidas.length === 0) return

    const ids = noLeidas.map((item) => item.id)

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", ids)

    if (error) {
      console.error("Error marcando notificaciones como leídas:", error)
      return
    }

    setNotificaciones((prev) =>
      prev.map((item) =>
        ids.includes(item.id)
          ? {
              ...item,
              is_read: true,
            }
          : item
      )
    )
  }

  const toggleNotificaciones = async () => {
    const nuevoEstado = !notificacionesOpen
    setNotificacionesOpen(nuevoEstado)

    if (nuevoEstado) {
      await cargarNotificaciones()
      await marcarNotificacionesComoLeidas()
    }
  }

  const refrescarPantalla = async () => {
    await cargarNotificaciones()
    window.location.reload()
  }

  const totalNoLeidas = useMemo(() => {
    return notificaciones.filter((item) => !item.is_read).length
  }, [notificaciones])

  const formatearFechaNotificacion = (fecha: string) => {
    try {
      return new Date(fecha).toLocaleString("es-CO", {
        dateStyle: "short",
        timeStyle: "short",
      })
    } catch {
      return fecha
    }
  }

  const estiloTipoNotificacion = (tipo: string) => {
    if (tipo === "success") {
      return {
        background: "#ecfdf3",
        color: "#166534",
        border: "1px solid #bbf7d0",
      }
    }

    if (tipo === "warning") {
      return {
        background: "#fff7ed",
        color: "#9a3412",
        border: "1px solid #fed7aa",
      }
    }

    if (tipo === "error") {
      return {
        background: "#fef2f2",
        color: "#991b1b",
        border: "1px solid #fecaca",
      }
    }

    return {
      background: "#eff6ff",
      color: "#1d4ed8",
      border: "1px solid #bfdbfe",
    }
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
        <div style={{ maxWidth: "1180px", margin: "0 auto", position: "relative" }}>
          <section
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              padding: "24px",
              boxShadow: "0 14px 40px rgba(0,0,0,0.08)",
              marginBottom: "22px",
              border: "1px solid rgba(0,0,0,0.04)",
              position: "relative",
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
                  onClick={toggleNotificaciones}
                  style={{
                    position: "relative",
                    background: "#111",
                    color: "#fff",
                    border: "none",
                    padding: "12px 16px",
                    borderRadius: "14px",
                    cursor: "pointer",
                    fontSize: "18px",
                    fontWeight: 700,
                    minWidth: "52px",
                    minHeight: "48px",
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
                        padding: "0 6px",
                        borderRadius: "999px",
                        background: "#dc2626",
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 4px 10px rgba(0,0,0,0.18)",
                      }}
                    >
                      {totalNoLeidas > 99 ? "99+" : totalNoLeidas}
                    </span>
                  )}
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

            {notificacionesOpen && (
              <div
                style={{
                  marginTop: "18px",
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "20px",
                  boxShadow: "0 14px 30px rgba(0,0,0,0.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "18px 18px 14px 18px",
                    borderBottom: "1px solid #e5e7eb",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: "20px", color: "#111" }}>Notificaciones</h2>
                    <p style={{ margin: "6px 0 0 0", color: "#6b7280", fontSize: "14px" }}>
                      Aquí verás cambios sobre facturas y redenciones.
                    </p>
                  </div>

                  <button
                    onClick={() => setNotificacionesOpen(false)}
                    style={{
                      background: "#f3f4f6",
                      color: "#111",
                      border: "1px solid #e5e7eb",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    Cerrar
                  </button>
                </div>

                <div style={{ maxHeight: "420px", overflowY: "auto", padding: "14px" }}>
                  {cargandoNotificaciones ? (
                    <p style={{ margin: 0, color: "#6b7280" }}>Cargando notificaciones...</p>
                  ) : notificaciones.length === 0 ? (
                    <div
                      style={{
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: "16px",
                        padding: "16px",
                        color: "#6b7280",
                        lineHeight: 1.5,
                      }}
                    >
                      No tienes notificaciones por ahora.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: "12px" }}>
                      {notificaciones.map((item) => (
                        <article
                          key={item.id}
                          style={{
                            background: item.is_read ? "#fff" : "#fffdf5",
                            border: item.is_read ? "1px solid #e5e7eb" : "1px solid #f3d37a",
                            borderRadius: "16px",
                            padding: "14px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "10px",
                              flexWrap: "wrap",
                              alignItems: "flex-start",
                              marginBottom: "8px",
                            }}
                          >
                            <div style={{ display: "grid", gap: "6px", minWidth: 0 }}>
                              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                                <strong style={{ color: "#111", fontSize: "15px", lineHeight: 1.4 }}>
                                  {item.title}
                                </strong>

                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    padding: "5px 9px",
                                    borderRadius: "999px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    ...estiloTipoNotificacion(item.type),
                                  }}
                                >
                                  {item.type || "info"}
                                </span>

                                {!item.is_read && (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      padding: "5px 9px",
                                      borderRadius: "999px",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      background: "#111",
                                      color: "#fff",
                                    }}
                                  >
                                    Nueva
                                  </span>
                                )}
                              </div>

                              <span style={{ color: "#6b7280", fontSize: "12px" }}>
                                {formatearFechaNotificacion(item.created_at)}
                              </span>
                            </div>
                          </div>

                          <p style={{ margin: 0, color: "#111", lineHeight: 1.55, fontSize: "14px" }}>
                            {item.message}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
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