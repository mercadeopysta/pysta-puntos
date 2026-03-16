"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import AdminMenu from "../../../components/AdminMenu"
import AdminLogoutButton from "../../../components/AdminLogoutButton"
import AlertMessage from "../../../components/AlertMessage"

type Settings = {
  id: string
  redemption_percentage: number
  monthly_redemption_limit: number
  monthly_item_limit_per_reward: number
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
  const [monthlyItemLimitPerReward, setMonthlyItemLimitPerReward] = useState("")
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
      setMonthlyItemLimitPerReward(String(config.monthly_item_limit_per_reward || 0))
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

    if (!redemptionPercentage || !monthlyLimit || !expirationMonths || monthlyItemLimitPerReward === "") {
      setTipoMensaje("warning")
      setMensaje("Completa todos los campos obligatorios.")
      return
    }

    const { error } = await supabase
      .from("settings")
      .update({
        redemption_percentage: Number(redemptionPercentage),
        monthly_redemption_limit: Number(monthlyLimit),
        monthly_item_limit_per_reward: Number(monthlyItemLimitPerReward),
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
      <div className="pysta-shell" style={{ maxWidth: "980px" }}>
        <AdminMenu />

        <section className="pysta-card" style={{ padding: "28px", marginBottom: "22px" }}>
          <div className="pysta-topbar">
            <div style={{ display: "grid", gap: "8px" }}>
              <span className="pysta-badge">Parámetros del sistema</span>
              <h1 className="pysta-section-title">Configuración general</h1>
              <p className="pysta-subtitle">
                Define las reglas del programa de puntos, los límites de redención y el comportamiento general de la plataforma.
              </p>
            </div>

            <AdminLogoutButton />
          </div>
        </section>

        <section className="pysta-card" style={{ padding: "24px" }}>
          {cargando ? (
            <div style={{ padding: "8px 0", color: "#333" }}>Cargando configuración...</div>
          ) : (
            <>
              <div style={{ display: "grid", gap: "8px", marginBottom: "18px" }}>
                <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Reglas del programa</h2>
                <p style={{ margin: 0, color: "#6b7280" }}>
                  Ajusta la conversión, límites de redención, vencimiento de puntos y el texto de bienvenida.
                </p>
              </div>

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
                    Ejemplo: 6 significa que el cliente acumula puntos con base en un 6% del valor registrado.
                  </p>
                </div>

                <div>
                  <label style={labelStyle}>Límite mensual de ítems redimibles</label>
                  <input
                    className="pysta-input"
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(e.target.value)}
                  />
                  <p style={helperText}>
                    Cantidad máxima total de ítems que un cliente puede redimir en el mes.
                  </p>
                </div>

                <div>
                  <label style={labelStyle}>Máximo por ítem al mes</label>
                  <input
                    className="pysta-input"
                    type="number"
                    value={monthlyItemLimitPerReward}
                    onChange={(e) => setMonthlyItemLimitPerReward(e.target.value)}
                  />
                  <p style={helperText}>
                    Si pones 2, un cliente solo podrá redimir 2 unidades del mismo premio al mes. Si pones 0, no tendrá límite por premio.
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
                    Tiempo durante el cual los puntos se mantienen vigentes cuando el vencimiento está activo.
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "16px",
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
                  Cuando está activo, los puntos expiran según la cantidad de meses configurada arriba.
                </p>
              </div>

              <div style={{ marginBottom: "18px" }}>
                <label style={labelStyle}>Instrucciones de la pantalla inicial</label>
                <textarea
                  className="pysta-textarea"
                  rows={7}
                  value={introInstructions}
                  onChange={(e) => setIntroInstructions(e.target.value)}
                  style={{ resize: "vertical" }}
                />
                <p style={helperText}>
                  Este texto puede usarse para explicar el funcionamiento del programa en la pantalla principal o de bienvenida.
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
            </>
          )}
        </section>
      </div>
    </main>
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