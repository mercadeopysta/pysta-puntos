"use client"

import { usePathname } from "next/navigation"

export default function AdminMenu() {
  const pathname = usePathname()

  const items = [
    { label: "Clientes", href: "/admin/clientes" },
    { label: "Facturas", href: "/admin/facturas" },
    { label: "Premios", href: "/admin/premios" },
    { label: "Redenciones", href: "/admin/redenciones" },
    { label: "Asesores", href: "/admin/asesores" },
    { label: "Configuración", href: "/admin/configuracion" },
    { label: "Exportar", href: "/admin/exportar" },
  ]

  return (
    <div
      className="pysta-card"
      style={{
        padding: "18px",
        marginBottom: "24px",
      }}
    >
      <div className="pysta-topbar" style={{ marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/logo-pysta.png" alt="Pysta" style={{ width: "110px" }} />
          <div>
            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>Panel administrativo</p>
            <p style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#111" }}>
              Puntos Pysta
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {items.map((item) => {
          const activo = pathname === item.href

          return (
            <a
              key={item.href}
              href={item.href}
              className={`pysta-btn ${activo ? "pysta-btn-gold" : "pysta-btn-light"}`}
              style={{
                padding: "10px 14px",
                fontSize: "14px",
              }}
            >
              {item.label}
            </a>
          )
        })}
      </div>
    </div>
  )
}