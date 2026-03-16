"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import LogoutButton from "../../components/LogoutButton"

type FacturaSaldo = {
  amount_without_vat: number
  invoice_date: string
}

type Redencion = {
  points_used: number
  created_at: string
  redemption_group_id?: string | null
}

export default function DashboardPage() {
  const [nombreCliente, setNombreCliente] = useState("Cliente")
  const [facturasCount, setFacturasCount] = useState(0)
  const [puntosAcumulados, setPuntosAcumulados] = useState(0)
  const [puntosRedimidos, setPuntosRedimidos] = useState(0)
  const [puntosDisponibles, setPuntosDisponibles] = useState(0)
  const [limiteMensual, setLimiteMensual] = useState(5)
  const [itemsRedimidosMes, setItemsRedimidosMes] = useState(0)

  const itemsDisponiblesMes = Math.max(limiteMensual - itemsRedimidosMes, 0)

  useEffect(() => {
    const cargarDashboard = async () => {
      const nombreGuardado = localStorage.getItem("cliente_nombre")
      const emailGuardado = localStorage.getItem("cliente_email")

      if (nombreGuardado) setNombreCliente(nombreGuardado)
      if (!emailGuardado) return

      const { data: settingsData } = await supabase
        .from("settings")
        .select(
          "redemption_percentage, points_expiration_enabled, points_expiration_months, monthly_redemption_limit"
        )
        .limit(1)
        .single()

      const porcentaje = Number(settingsData?.redemption_percentage || 6)
      const vencimientoActivo = Boolean(settingsData?.points_expiration_enabled)
      const mesesVigencia = Number(settingsData?.points_expiration_months || 1)
      const limite = Number(settingsData?.monthly_redemption_limit || 5)

      setLimiteMensual(limite)

      const { count } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("user_email", emailGuardado)

      if (typeof count === "number") setFacturasCount(count)

      const { data: facturasData } = await supabase
        .from("invoices")
        .select("amount_without_vat, invoice_date")
        .eq("user_email", emailGuardado)
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
        setPuntosAcumulados(acumulados)
      }

      const { data: redencionesData } = await supabase
        .from("redemptions")
        .select("points_used, created_at, redemption_group_id")
        .eq("user_email", emailGuardado)
        .neq("status", "cancelled")

      let redimidos = 0
      let itemsMesActual = 0

      if (redencionesData) {
        redimidos = (redencionesData as Redencion[]).reduce((acum, redencion) => {
          return acum + Number(redencion.points_used || 0)
        }, 0)

        setPuntosRedimidos(redimidos)

        const hoy = new Date()
        const mesActual = hoy.getMonth()
        const anioActual = hoy.getFullYear()

        itemsMesActual = (redencionesData as Redencion[]).filter((redencion) => {
          const fecha = new Date(redencion.created_at)
          return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual
        }).length
      }

      setItemsRedimidosMes(itemsMesActual)
      setPuntosDisponibles(Math.max(acumulados - redimidos, 0))
    }

    cargarDashboard()
  }, [])

  return (
    <main className="pysta-page">
      <div className="pysta-shell">
        <section className="pysta-card" style={{ padding: "28px", marginBottom: "22px" }}>
          <div className="pysta-topbar">
            <div style={{ display: "grid", gap: "8px" }}>
              <span className="pysta-badge">Panel del cliente</span>
              <h1 className="pysta-section-title">Hola, {nombreCliente}</h1>
              <p className="pysta-subtitle">
                Aquí podrás revisar tu saldo de puntos, tus facturas y tus premios disponibles.
              </p>
            </div>

            <LogoutButton />
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "18px",
            marginBottom: "26px",
          }}
        >
          <div className="pysta-stat-card">
            <p className="pysta-stat-label">Cliente</p>
            <p className="pysta-stat-value" style={{ fontSize: "22px" }}>{nombreCliente}</p>
          </div>

          <div className="pysta-stat-card">
            <p className="pysta-stat-label">Puntos acumulados</p>
            <p className="pysta-stat-value">{puntosAcumulados}</p>
          </div>

          <div className="pysta-stat-card">
            <p className="pysta-stat-label">Puntos redimidos</p>
            <p className="pysta-stat-value">{puntosRedimidos}</p>
          </div>

          <div className="pysta-stat-card">
            <p className="pysta-stat-label">Puntos disponibles</p>
            <p className="pysta-stat-value">{puntosDisponibles}</p>
          </div>

          <div className="pysta-stat-card">
            <p className="pysta-stat-label">Facturas registradas</p>
            <p className="pysta-stat-value">{facturasCount}</p>
          </div>

          <div className="pysta-stat-card">
            <p className="pysta-stat-label">Ítems redimidos este mes</p>
            <p className="pysta-stat-value">
              {itemsRedimidosMes} / {limiteMensual}
            </p>
          </div>

          <div className="pysta-stat-card">
            <p className="pysta-stat-label">Ítems disponibles este mes</p>
            <p className="pysta-stat-value">{itemsDisponiblesMes}</p>
          </div>
        </section>

        <section className="pysta-card" style={{ padding: "28px" }}>
          <div style={{ display: "grid", gap: "8px", marginBottom: "18px" }}>
            <h2 style={{ margin: 0, fontSize: "24px", color: "#111" }}>
              Acciones rápidas
            </h2>
            <p style={{ margin: 0, color: "#6b7280" }}>
              Usa estas opciones para registrar compras, revisar tu historial y redimir premios.
            </p>
          </div>

          <div className="pysta-actions">
            <a href="/dashboard/facturas/nueva" className="pysta-btn pysta-btn-dark">
              Registrar factura
            </a>

            <a href="/dashboard/mis-facturas" className="pysta-btn pysta-btn-light">
              Mis facturas
            </a>

            <a href="/dashboard/premios" className="pysta-btn pysta-btn-gold">
              Ver premios
            </a>

            <a href="/dashboard/redenciones" className="pysta-btn pysta-btn-light">
              Mis redenciones
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}