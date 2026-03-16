"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import LogoutButton from "../../../components/LogoutButton"

type Factura = {
  id: string
  invoice_number: string
  invoice_date: string
  amount_without_vat: number
  status: string
}

export default function MisFacturasPage() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState("")

  useEffect(() => {
    const cargarFacturas = async () => {
      const email = localStorage.getItem("cliente_email")

      if (!email) {
        setMensaje("No se encontró el usuario logueado.")
        setCargando(false)
        return
      }

      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, invoice_date, amount_without_vat, status")
        .eq("user_email", email)
        .order("created_at", { ascending: false })

      if (error) {
        setMensaje("Ocurrió un error al cargar las facturas.")
        setCargando(false)
        return
      }

      setFacturas(data || [])
      setCargando(false)
    }

    cargarFacturas()
  }, [])

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "10px",
          }}
        >
          <h1 style={{ fontSize: "32px", color: "#111", margin: 0 }}>
            Mis facturas
          </h1>

          <LogoutButton />
        </div>

        <p style={{ color: "#555", marginBottom: "30px" }}>
          Aquí puedes ver las facturas que has registrado en Puntos Pysta.
        </p>

        {cargando && (
          <div style={cardStyle}>
            <p style={{ color: "#333" }}>Cargando facturas...</p>
          </div>
        )}

        {!cargando && mensaje && (
          <div style={cardStyle}>
            <p style={{ color: "#333" }}>{mensaje}</p>
          </div>
        )}

        {!cargando && !mensaje && facturas.length === 0 && (
          <div style={cardStyle}>
            <p style={{ color: "#333" }}>Aún no has registrado facturas.</p>
          </div>
        )}

        {!cargando && !mensaje && facturas.length > 0 && (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
                backgroundColor: "#111",
                color: "white",
                padding: "16px",
                fontWeight: "bold",
              }}
            >
              <div>Número de factura</div>
              <div>Fecha</div>
              <div>Valor sin IVA</div>
              <div>Estado</div>
            </div>

            {facturas.map((factura) => (
              <div key={factura.id} style={rowStyle}>
                <div>{factura.invoice_number}</div>
                <div>{factura.invoice_date}</div>
                <div>${Number(factura.amount_without_vat).toLocaleString("es-CO")}</div>
                <div>{factura.status}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "30px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <a href="/dashboard/facturas/nueva" style={buttonGold}>
            Registrar nueva factura
          </a>

          <a href="/dashboard" style={buttonDark}>
            Volver al panel
          </a>
        </div>
      </div>
    </main>
  )
}

const cardStyle = {
  backgroundColor: "white",
  borderRadius: "16px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  padding: "24px",
}

const rowStyle = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr 1fr 1fr",
  padding: "16px",
  borderBottom: "1px solid #eee",
  color: "#333",
}

const buttonDark = {
  backgroundColor: "#111",
  color: "white",
  textDecoration: "none",
  padding: "14px 24px",
  borderRadius: "10px",
  display: "inline-block",
}

const buttonGold = {
  backgroundColor: "#d4af37",
  color: "#111",
  textDecoration: "none",
  padding: "14px 24px",
  borderRadius: "10px",
  display: "inline-block",
  fontWeight: "bold" as const,
}