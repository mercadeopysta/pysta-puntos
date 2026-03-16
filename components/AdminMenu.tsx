"use client"

export default function AdminMenu() {
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
      style={{
        backgroundColor: "white",
        borderRadius: "16px",
        padding: "18px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            style={{
              backgroundColor: "#111",
              color: "white",
              textDecoration: "none",
              padding: "10px 14px",
              borderRadius: "9px",
              fontSize: "14px",
              fontWeight: "bold",
              display: "inline-block",
            }}
          >
            {item.label}
          </a>
        ))}
      </div>
    </div>
  )
}