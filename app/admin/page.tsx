"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import AdminMenu from "../../components/AdminMenu"
import AdminLogoutButton from "../../components/AdminLogoutButton"

type FacturaRow = {
  id: string
  status: string
}

type RedencionRow = {
  id: string
  status: string
}

type ProfileRow = {
  id: string
  is_active: boolean
  is_approved: boolean
}

type RewardRow = {
  id: string
  stock: number
  is_active: boolean
}

export default function AdminDashboardPage() {
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [cargando, setCargando] = useState(true)

  const [facturasPendientes, setFacturasPendientes] = useState(0)
  const [redencionesPendientes, setRedencionesPendientes] = useState(0)
  const [clientesActivos, setClientesActivos] = useState(0)
  const [premiosStockBajo, setPremiosStockBajo] = useState(0)

  const [facturasTotales, setFacturasTotales] = useState(0)
  const [redencionesTotales, setRedencionesTotales] = useState(0)
  const [premiosActivos, setPremiosActivos] = useState(0)

  useEffect(() => {
    const adminLogueado = localStorage.getItem("admin_logged_in")

    if (adminLogueado !== "true") {
      router.push("/admin/login")
      return
    }

    setAutorizado(true)
  }, [router])

  const cargarResumen = async () => {
    setCargando(true)

    const [
      facturasResponse,
      redencionesResponse,
      perfilesResponse,
      premiosResponse,
    ] = await Promise.all([
      supabase.from("invoices").select("id, status"),
      supabase.from("redemptions").select("id, status"),
      supabase.from("profiles").select("id, is_active, is_approved"),
      supabase.from("rewards").select("id, stock, is_active"),
    ])

    const facturasData = (facturasResponse.data as FacturaRow[]) || []
    const redencionesData = (redencionesResponse.data as RedencionRow[]) || []
    const perfilesData = (perfilesResponse.data as ProfileRow[]) || []
    const premiosData = (premiosResponse.data as RewardRow[]) || []

    setFacturasTotales(facturasData.length)
    setRedencionesTotales(redencionesData.length)

    setFacturasPendientes(
      facturasData.filter((factura) => factura.status === "pending").length
    )

    setRedencionesPendientes(
      redencionesData.filter((redencion) => redencion.status === "requested").length
    )

    setClientesActivos(
      perfilesData.filter((perfil) => perfil.is_active && perfil.is_approved).length
    )

    setPremiosStockBajo(
      premiosData.filter((premio) => premio.is_active && Number(premio.stock || 0) > 0 && Number(premio.stock || 0) <= 5).length
    )

    setPremiosActivos(
      premiosData.filter((premio) => premio.is_active).length
    )

    setCargando(false)
  }

  useEffect(() => {
    if (autorizado) {
      cargarResumen()
    }
  }, [autorizado])

  const refrescarPantalla = () => {
    cargarResumen()
  }

  if (!autorizado) {
    return (
      <main
        className="pysta-page"
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div className="pysta-card" style={{ padding: "24px 28px" }}>
          Validando acceso...
        </div>
      </main>
    )
  }

  return (
    <main className="pysta-page">
      <div className="pysta-shell" style={{ maxWidth: "1380px" }}>
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
              <span className="pysta-badge">Panel administrativo</span>
              <h1 className="pysta-section-title">Resumen general</h1>
              <p className="pysta-subtitle">
                Consulta rápidamente el estado del sistema, tareas pendientes y accesos principales.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button onClick={refrescarPantalla} className="pysta-btn pysta-btn-light">
                Refrescar
              </button>

              <AdminLogoutButton />
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
            titulo="Facturas pendientes"
            valor={cargando ? "..." : String(facturasPendientes)}
            descripcion="Por revisar o validar"
          />
          <ResumenCard
            titulo="Redenciones pendientes"
            valor={cargando ? "..." : String(redencionesPendientes)}
            descripcion="Solicitudes por gestionar"
          />
          <ResumenCard
            titulo="Clientes activos"
            valor={cargando ? "..." : String(clientesActivos)}
            descripcion="Aprobados y habilitados"
          />
          <ResumenCard
            titulo="Premios con stock bajo"
            valor={cargando ? "..." : String(premiosStockBajo)}
            descripcion="Stock entre 1 y 5"
          />
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
            titulo="Facturas totales"
            valor={cargando ? "..." : String(facturasTotales)}
            descripcion="Histórico cargado"
          />
          <ResumenCard
            titulo="Redenciones totales"
            valor={cargando ? "..." : String(redencionesTotales)}
            descripcion="Ítems registrados"
          />
          <ResumenCard
            titulo="Premios activos"
            valor={cargando ? "..." : String(premiosActivos)}
            descripcion="Disponibles en catálogo"
          />
        </section>

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
              Enfoque rápido
            </span>

            <p style={{ margin: 0, color: "#111", lineHeight: 1.6, fontSize: "15px" }}>
              Si ves facturas pendientes o redenciones pendientes, esas deberían ser las primeras tareas del día. Si hay premios con stock bajo, conviene revisarlos antes de que se agoten.
            </p>
          </div>
        </section>

        <section className="pysta-card" style={{ padding: "24px" }}>
          <div style={{ marginBottom: "18px" }}>
            <h2 style={{ margin: 0, fontSize: "26px", color: "#111" }}>Accesos rápidos</h2>
            <p style={{ margin: "8px 0 0 0", color: "#6b7280", lineHeight: 1.5 }}>
              Entra rápido a las áreas más importantes del panel administrativo.
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
              href="/admin/facturas"
              titulo="Facturas"
              descripcion="Revisa, aprueba, rechaza o elimina facturas."
            />

            <MenuCard
              href="/admin/redenciones"
              titulo="Redenciones"
              descripcion="Gestiona solicitudes, envíos, entregas y cancelaciones."
            />

            <MenuCard
              href="/admin/premios"
              titulo="Premios"
              descripcion="Administra catálogo, stock y límites por premio."
            />

            <MenuCard
              href="/admin/clientes"
              titulo="Clientes"
              descripcion="Consulta y edita clientes registrados."
            />

            <MenuCard
              href="/admin/configuracion"
              titulo="Configuración"
              descripcion="Ajusta reglas generales del sistema."
            />

            <MenuCard
              href="/admin/asesores"
              titulo="Asesores"
              descripcion="Gestiona asesores y asignaciones."
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
      className="pysta-card"
      style={{
        padding: "22px",
        background: "linear-gradient(180deg, #ffffff 0%, #fbfbfb 100%)",
      }}
    >
      <p style={{ margin: 0, color: "#6b7280", fontSize: "14px", fontWeight: 700 }}>
        {titulo}
      </p>
      <h3 style={{ margin: "10px 0 8px 0", fontSize: "34px", color: "#111" }}>
        {valor}
      </h3>
      <p style={{ margin: 0, color: "#555", fontSize: "14px", lineHeight: 1.4 }}>
        {descripcion}
      </p>
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
    <a
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
      <h3 style={{ margin: 0, fontSize: "22px", color: "#111", lineHeight: 1.2 }}>
        {titulo}
      </h3>
      <p style={{ margin: "10px 0 0 0", color: "#6b7280", lineHeight: 1.5 }}>
        {descripcion}
      </p>
    </a>
  )
}