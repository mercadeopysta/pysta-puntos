"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import AdminMenu from "../../../components/AdminMenu"
import AdminLogoutButton from "../../../components/AdminLogoutButton"
import AlertMessage from "../../../components/AlertMessage"

type Settings = {
  id: string
  redemption_percentage: number
  monthly_redemption_limit: number
  points_expiration_enabled: boolean
  points_expiration_months: number
  intro_instructions: string
}

export default function AdminConfiguracionPage() {
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [settingsId, setSettingsId] = useState("")
  const [redemptionPercentage, setRedemptionPercentage] = useState("")
  const [monthlyLimit, setMonthlyLimit] = useState("")
  const [expirationEnabled, setExpirationEnabled] = useState(false)
  const [expirationMonths, setExpirationMonths] = useState("")
  const [introInstructions, setIntroInstructions] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "warning" | "info">("info")
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const adminLogueado = localStorage.getItem("admin_logged_in")

    if (adminLogueado !== "true") {
      router.push("/admin/login")
      return
    }

    setAutorizado(true)
  }, [router])

  useEffect(() => {
    const cargarConfiguracion = async () => {
      if (!autorizado) return

      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .limit(1)
        .single()

      if (error) {
        setTipoMensaje("error")
        setMensaje("Ocurrió un error al cargar la configuración.")
        setCargando(false)
        return
      }

      const config = data as Settings

      setSettingsId(String(config.id))
      setRedemptionPercentage(String(config.redemption_percentage))
      setMonthlyLimit(String(config.monthly_redemption_limit))
      setExpirationEnabled(config.points_expiration_enabled)
      setExpirationMonths(String(config.points_expiration_months))
      setIntroInstructions(config.intro_instructions || "")
      setCargando(false)
    }

    cargarConfiguracion()
  }, [autorizado])

  const guardarConfiguracion = async () => {
    setMensaje("")

    if (!settingsId) {
      setTipoMensaje("warning")
      setMensaje("No se encontró la configuración.")
      return
    }

    if (!redemptionPercentage || !monthlyLimit || !expirationMonths) {
      setTipoMensaje("warning")
      setMensaje("Completa todos los campos obligatorios.")
      return
    }

    const { error } = await supabase
      .from("settings")
      .update({
        redemption_percentage: Number(redemptionPercentage),
        monthly_redemption_limit: Number(monthlyLimit),
        points_expiration_enabled: expirationEnabled,
        points_expiration_months: Number(expirationMonths),
        intro_instructions: introInstructions,
      })
      .eq("id", settingsId)

    if (error) {
      setTipoMensaje("error")
      setMensaje("Ocurrió un error al guardar: " + error.message)
      return
    }

    setTipoMensaje("success")
    setMensaje("Configuración actualizada correctamente.")
  }

  const resumen = useMemo(() => {
    const porcentaje = Number(redemptionPercentage || 0)
    const limiteMensual = Number(monthlyLimit || 0)
    const vigencia = Number(expirationMonths || 0)

    return {
      porcentaje,
      limiteMensual,
      vigencia,
    }
  }, [redemptionPercentage, monthlyLimit, expirationMonths])

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
    <main className="pysta-page">
      <div className="pysta-shell" style={{ maxWidth: "1180px" }}>
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
              <span className="pysta-badge">Parámetros del sistema</span>
              <h1 className="pysta-section-title">Configuración general</h1>
              <p className="pysta-subtitle">
                Ajusta las reglas generales del programa de puntos, el límite mensual total y el comportamiento general de la plataforma.
              </p>
            </div>

            <AdminLogoutButton />
          </div>
        </section>

        {!cargando && (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              marginBottom: "22px",
            }}
          >
            <ResumenCard
              titulo="Conversión"
              valor={`${resumen.porcentaje}%`}
              descripcion="Base para acumulación"
            />
            <ResumenCard
              titulo="Límite mensual"
              valor={String(resumen.limiteMensual)}
              descripcion="Ítems totales por cliente"
            />
            <ResumenCard
              titulo="Vigencia puntos"
              valor={expirationEnabled ? `${resumen.vigencia} mes(es)` : "Inactiva"}
              descripcion="Caducidad configurada"
            />
            <ResumenCard
              titulo="Límite por premio"
              valor="Se define en premios"
              descripcion="Configuración individual"
            />
          </section>
        )}

        <section className="pysta-card" style={{ padding: "24px" }}>
          {cargando ? (
            <div style={{ padding: "8px 0", color: "#333" }}>Cargando configuración...</div>
          ) : (
            <>
              <div style={{ display: "grid", gap: "8px", marginBottom: "18px" }}>
                <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Reglas del programa</h2>
                <p style={{ margin: 0, color: "#6b7280" }}>
                  Ajusta conversión, límite mensual total, vigencia de puntos e instrucciones mostradas al cliente.
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.1fr) minmax(280px, 0.9fr)",
                  gap: "22px",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                      gap: "16px",
                      marginBottom: "18px",
                    }}
                  >
                    <div>
                      <label style={labelStyle}>Porcentaje de conversión</label>
                      <input
                        className="pysta-input"
                        type="number"
                        step="0.01"
                        value={redemptionPercentage}
                        onChange={(e) => setRedemptionPercentage(e.target.value)}
                      />
                      <p style={helperText}>
                        Ejemplo: 6 significa que el cliente acumula puntos sobre el 6% del valor aprobado.
                      </p>
                    </div>

                    <div>
                      <label style={labelStyle}>Límite mensual total de ítems</label>
                      <input
                        className="pysta-input"
                        type="number"
                        value={monthlyLimit}
                        onChange={(e) => setMonthlyLimit(e.target.value)}
                      />
                      <p style={helperText}>
                        Cantidad máxima total de premios que un cliente puede redimir en el mes, sumando todos los ítems.
                      </p>
                    </div>

                    <div>
                      <label style={labelStyle}>Meses de vigencia de puntos</label>
                      <input
                        className="pysta-input"
                        type="number"
                        value={expirationMonths}
                        onChange={(e) => setExpirationMonths(e.target.value)}
                      />
                      <p style={helperText}>
                        Tiempo durante el cual los puntos seguirán siendo válidos cuando la expiración esté activa.
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: "18px",
                      padding: "18px",
                      marginBottom: "18px",
                    }}
                  >
                    <label style={labelStyle}>Activar vencimiento de puntos</label>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                      <input
                        type="checkbox"
                        checked={expirationEnabled}
                        onChange={(e) => setExpirationEnabled(e.target.checked)}
                        style={{ width: "18px", height: "18px" }}
                      />

                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "6px 10px",
                          borderRadius: "999px",
                          fontSize: "13px",
                          fontWeight: 700,
                          background: expirationEnabled ? "#ecfdf3" : "#f3f4f6",
                          color: expirationEnabled ? "#166534" : "#6b7280",
                          border: expirationEnabled ? "1px solid #bbf7d0" : "1px solid #e5e7eb",
                        }}
                      >
                        {expirationEnabled ? "Sí, activo" : "No, inactivo"}
                      </span>
                    </div>

                    <p style={{ ...helperText, marginTop: "10px" }}>
                      Cuando está activo, los puntos expiran según la cantidad de meses configurada.
                    </p>
                  </div>

                  <div
                    style={{
                      background: "#fff8e7",
                      border: "1px solid #f3d37a",
                      borderRadius: "18px",
                      padding: "18px",
                      marginBottom: "18px",
                    }}
                  >
                    <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", color: "#111" }}>
                      Cómo funciona ahora
                    </h3>
                    <p style={{ margin: 0, color: "#444", lineHeight: 1.6, fontSize: "14px" }}>
                      El límite mensual total se configura aquí. El máximo que un cliente puede redimir de cada premio específico se configura directamente en la sección de premios.
                    </p>
                  </div>

                  <div style={{ marginBottom: "18px" }}>
                    <label style={labelStyle}>Instrucciones de la pantalla inicial</label>
                    <textarea
                      className="pysta-textarea"
                      rows={8}
                      value={introInstructions}
                      onChange={(e) => setIntroInstructions(e.target.value)}
                      style={{ resize: "vertical" }}
                    />
                    <p style={helperText}>
                      Este texto sirve como guía de bienvenida o instrucciones generales para el cliente.
                    </p>
                  </div>

                  <div className="pysta-actions">
                    <button
                      onClick={guardarConfiguracion}
                      className="pysta-btn pysta-btn-dark"
                    >
                      Guardar configuración
                    </button>
                  </div>

                  {mensaje && (
                    <div style={{ marginTop: "16px" }}>
                      <AlertMessage text={mensaje} type={tipoMensaje} />
                    </div>
                  )}
                </div>

                <aside
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "20px",
                    padding: "20px",
                    display: "grid",
                    gap: "16px",
                    alignContent: "start",
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: "20px", color: "#111" }}>Vista rápida</h3>
                    <p style={{ margin: "8px 0 0 0", color: "#6b7280", lineHeight: 1.5 }}>
                      Resumen de la configuración activa del programa.
                    </p>
                  </div>

                  <InfoItem
                    label="Conversión"
                    value={`${resumen.porcentaje}%`}
                  />
                  <InfoItem
                    label="Límite mensual total"
                    value={`${resumen.limiteMensual} ítems`}
                  />
                  <InfoItem
                    label="Límite por premio"
                    value="Se configura en cada premio"
                  />
                  <InfoItem
                    label="Expiración"
                    value={expirationEnabled ? `Activa (${resumen.vigencia} mes(es))` : "Inactiva"}
                  />
                  <InfoItem
                    label="Longitud del mensaje inicial"
                    value={`${introInstructions.length} caracteres`}
                  />
                </aside>
              </div>
            </>
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
        background: "#fff",
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

const helperText = {
  color: "#6b7280",
  fontSize: "13px",
  marginTop: "8px",
  lineHeight: 1.5,
}
