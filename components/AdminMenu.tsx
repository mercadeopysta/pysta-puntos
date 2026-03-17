"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/asesores", label: "Asesores" },
  { href: "/admin/premios", label: "Premios" },
  { href: "/admin/facturas", label: "Facturas" },
  { href: "/admin/redenciones", label: "Redenciones" },
  { href: "/admin/puntos", label: "Puntos" },
  { href: "/admin/configuracion", label: "Configuración" },
  { href: "/admin/exportar", label: "Exportar" },
]

export default function AdminMenu() {
  const pathname = usePathname()

  return (
    <nav
      style={{
        background: "linear-gradient(135deg, #111111 0%, #1f1f1f 100%)",
        borderRadius: "24px",
        padding: "22px",
        marginBottom: "22px",
        boxShadow: "0 16px 38px rgba(0,0,0,0.14)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "18px",
          flexWrap: "wrap",
          marginBottom: "18px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <img
              src="/logo-pysta.png"
              alt="Pysta"
              style={{
                maxWidth: "54px",
                maxHeight: "54px",
                objectFit: "contain",
              }}
            />
          </div>

          <div style={{ display: "grid", gap: "6px" }}>
            <span
              style={{
                display: "inline-flex",
                width: "fit-content",
                padding: "6px 10px",
                borderRadius: "999px",
                fontSize: "11px",
                fontWeight: 700,
                background: "rgba(212, 175, 55, 0.16)",
                color: "#f0d77a",
                border: "1px solid rgba(212, 175, 55, 0.24)",
              }}
            >
              Panel administrativo
            </span>

            <h2
              style={{
                margin: 0,
                color: "#fff",
                fontSize: "26px",
                lineHeight: 1.1,
              }}
            >
              Puntos Pysta Admin
            </h2>

            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.72)",
                fontSize: "14px",
                lineHeight: 1.5,
              }}
            >
              Gestión central de clientes, facturas, premios y redenciones
            </p>
          </div>
        </div>

        <Link
          href="/admin/clientes"
          style={{
            background: "rgba(255,255,255,0.06)",
            color: "#fff",
            textDecoration: "none",
            padding: "12px 16px",
            borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.10)",
            fontWeight: 700,
            fontSize: "14px",
          }}
        >
          Ir al módulo principal
        </Link>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        {links.map((link) => {
          const activo = pathname === link.href

          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                textDecoration: "none",
                padding: "12px 16px",
                borderRadius: "14px",
                fontWeight: 700,
                fontSize: "14px",
                transition: "all 0.2s ease",
                background: activo
                  ? "linear-gradient(135deg, #d4af37 0%, #e5c55b 100%)"
                  : "rgba(255,255,255,0.06)",
                color: activo ? "#111" : "#fff",
                border: activeBorder(activo),
                boxShadow: activo ? "0 8px 20px rgba(212,175,55,0.22)" : "none",
              }}
            >
              {link.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function activeBorder(activo: boolean) {
  return activo
    ? "1px solid rgba(212, 175, 55, 0.55)"
    : "1px solid rgba(255,255,255,0.10)"
}