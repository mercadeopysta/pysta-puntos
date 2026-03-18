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
  const [clientesPendientes, setClientesPendientes] = useState(0)
  const [premiosStockCritico, setPremiosStockCritico] = useState(0)
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

    setClientesPendientes(
      perfilesData.filter((perfil) => perfil.is_active && !perfil.is_approved).length
    )

    setPremiosStockCritico(
      premiosData.filter(
        (premio) =>
          premio.is_active &&
          Number(premio.stock || 0) >= 1 &&
          Number(premio.stock || 0) <= 2
      ).length
    )

    setPremiosStockBajo(
      premiosData.filter(
        (premio) =>
          premio.is_active &&
          Number(premio.stock || 0) >= 3 &&
          Number(premio.stock || 0) <= 5
      ).length
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
                Consulta rápidamente el estado del sistema, pendientes y accesos más usados.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button onClick={cargarResumen} className="pysta-btn pysta-btn-light">
                {cargando ? "Actualizando..." : "Refrescar"}
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
          <ResumenLinkCard
            href="/admin/facturas"
            titulo="Facturas pendientes"
            valor={cargando ? "..." : String(facturasPendientes)}
            descripcion="Por revisar o validar"
            tono={facturasPendientes > 0 ? "warning" : "normal"}
            badge={facturasPendientes > 0 ? "Atención" : ""}
          />

          <ResumenLinkCard
            href="/admin/redenciones"
            titulo="Redenciones pendientes"
            valor={cargando ? "..." : String(redencionesPendientes)}
            descripcion="Solicitudes por gestionar"
            tono={redencionesPendientes > 0 ? "warning" : "normal"}
            badge={redencionesPendientes > 0 ? "Atención" : ""}
          />

          <ResumenLinkCard
            href="/admin/clientes"
            titulo="Clientes pendientes"
            valor={cargando ? "..." : String(clientesPendientes)}
            descripcion="Pendientes por aprobar"
            tono={clientesPendientes > 0 ? "warning" : "normal"}
            badge={clientesPendientes > 0 ? "Revisar" : ""}
          />

          <ResumenLinkCard
            href="/admin/premios"
            titulo="Stock crítico"
            valor={cargando ? "..." : String(premiosStockCritico)}
            descripcion="Premios entre 1 y 2 unidades"
            tono={premiosStockCritico > 0 ? "danger" : "normal"}
            badge={premiosStockCritico > 0 ? "Crítico" : ""}
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
          <ResumenLinkCard
            href="/admin/premios"
            titulo="Stock bajo"
            valor={cargando ? "..." : String(premiosStockBajo)}
            descripcion="Premios entre 3 y 5 unidades"
            tono={premiosStockBajo > 0 ? "warning" : "normal"}
            badge={premiosStockBajo > 0 ? "Bajo" : ""}
          />

          <ResumenLinkCard
            href="/admin/clientes"
            titulo="Clientes activos"
            valor={cargando ? "..." : String(clientesActivos)}
            descripcion="Aprobados y habilitados"
            tono="normal"
            badge=""
          />

          <ResumenLinkCard
            href="/admin/facturas"
            titulo="Facturas totales"
            valor={cargando ? "..." : String(facturasTotales)}
            descripcion="Histórico cargado"
            tono="normal"
            badge=""
          />

          <ResumenLinkCard
            href="/admin/redenciones"
            titulo="Redenciones totales"
            valor={cargando ? "..." : String(redencionesTotales)}
            descripcion="Ítems registrados"
            tono="normal"
            badge=""
          />
        </section>

        <section
          className="pysta-card"
          style={{
            padding: "24px",
            marginBottom: "22px",
          }}
        >
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
              descripcion="Gestiona solicitudes, estados, cancelaciones y reportes."
            />

            <MenuCard
              href="/admin/premios"
              titulo="Premios"
              descripcion="Administra catálogo, stock, límites e imágenes."
            />

            <MenuCard
              href="/admin/clientes"
              titulo="Clientes"
              descripcion="Consulta, aprueba, edita y exporta clientes."
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

        <section
          className="pysta-card"
          style={{
            padding: "24px",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "24px", color: "#111" }}>Estado rápido del sistema</h2>
            <p style={{ margin: "8px 0 0 0", color: "#6b7280", lineHeight: 1.5 }}>
              Vista rápida de lo más importante para operar hoy.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            <StatusLine
              label="Facturas pendientes"
              value={cargando ? "..." : String(facturasPendientes)}
              color={facturasPendientes > 0 ? "#9a3412" : "#166534"}
            />
            <StatusLine
              label="Redenciones pendientes"
              value={cargando ? "..." : String(redencionesPendientes)}
              color={redencionesPendientes > 0 ? "#9a3412" : "#166534"}
            />
            <StatusLine
              label="Clientes pendientes de aprobación"
              value={cargando ? "..." : String(clientesPendientes)}
              color={clientesPendientes > 0 ? "#9a3412" : "#166534"}
            />
            <StatusLine
              label="Premios con stock crítico"
              value={cargando ? "..." : String(premiosStockCritico)}
              color={premiosStockCritico > 0 ? "#991b1b" : "#166534"}
            />
            <StatusLine
              label="Premios activos"
              value={cargando ? "..." : String(premiosActivos)}
              color="#111"
            />
          </div>
        </section>
      </div>
    </main>
  )
}

function ResumenLinkCard({
  href,
  titulo,
  valor,
  descripcion,
  tono,
  badge,
}: {
  href: string
  titulo: string
  valor: string
  descripcion: string
  tono: "normal" | "warning" | "danger"
  badge: string
}) {
  const estilos =
    tono === "danger"
      ? {
          background: "linear-gradient(180deg, #fff1f2 0%, #fffafa 100%)",
          border: "1px solid #fecaca",
          shadow: "0 12px 28px rgba(239, 68, 68, 0.12)",
          titleColor: "#991b1b",
          badgeBg: "#dc2626",
          badgeColor: "#fff",
        }
      : tono === "warning"
      ? {
          background: "linear-gradient(180deg, #fff8e7 0%, #fffdf7 100%)",
          border: "1px solid #f3d37a",
          shadow: "0 12px 28px rgba(212, 175, 55, 0.14)",
          titleColor: "#7a5b00",
          badgeBg: "#d4af37",
          badgeColor: "#111",
        }
      : {
          background: "linear-gradient(180deg, #ffffff 0%, #fbfbfb 100%)",
          border: "1px solid rgba(0,0,0,0.04)",
          shadow: "0 10px 28px rgba(0,0,0,0.07)",
          titleColor: "#6b7280",
          badgeBg: "",
          badgeColor: "",
        }

  return (
    <a
      href={href}
      style={{
        textDecoration: "none",
        color: "#111",
        background: estilos.background,
        borderRadius: "22px",
        padding: "22px",
        boxShadow: estilos.shadow,
        border: estilos.border,
        display: "block",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
        <p style={{ margin: 0, color: estilos.titleColor, fontSize: "14px", fontWeight: 700 }}>
          {titulo}
        </p>

        {badge ? (
          <span
            style={{
              display: "inline-flex",
              padding: "5px 9px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: 700,
              background: estilos.badgeBg,
              color: estilos.badgeColor,
              whiteSpace: "nowrap",
            }}
          >
            {badge}
          </span>
        ) : null}
      </div>

      <h3 style={{ margin: "10px 0 8px 0", fontSize: "34px", color: "#111" }}>{valor}</h3>
      <p style={{ margin: 0, color: "#555", fontSize: "14px", lineHeight: 1.4 }}>{descripcion}</p>
    </a>
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
      <h3 style={{ margin: 0, fontSize: "22px", color: "#111", lineHeight: 1.2 }}>{titulo}</h3>
      <p style={{ margin: "10px 0 0 0", color: "#6b7280", lineHeight: 1.5 }}>{descripcion}</p>
    </a>
  )
}

function StatusLine({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "12px",
        padding: "14px 16px",
        borderRadius: "14px",
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        alignItems: "center",
      }}
    >
      <span style={{ color: "#555", fontWeight: 600 }}>{label}</span>
      <span style={{ color, fontWeight: 800 }}>{value}</span>
    </div>
  )
}