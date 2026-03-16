"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState("")

  const cerrarSesionCliente = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem("cliente_email")
    localStorage.removeItem("cliente_name")
    localStorage.removeItem("cliente_tipo")
    router.replace("/login")
  }

  useEffect(() => {
    const cargarFacturas = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
          await cerrarSesionCliente()
          return
        }

        const user = session.user

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, full_name, client_type, is_active, is_approved")
          .eq("id", user.id)
          .maybeSingle()

        if (profileError || !profile) {
          await cerrarSesionCliente()
          return
        }

        if (!profile.is_active || !profile.is_approved) {
          await cerrarSesionCliente()
          return
        }

        localStorage.setItem("cliente_email", profile.email || "")
        localStorage.setItem("cliente_name", profile.full_name || "")
        localStorage.setItem("cliente_tipo", profile.client_type || "")

        setAutorizado(true)

        const { data, error } = await supabase
          .from("invoices")
          .select("id, invoice_number, invoice_date, amount_without_vat, status")
          .eq("user_email", profile.email)
          .order("created_at", { ascending: false })

        if (error) {
          setMensaje("Ocurrió un error al cargar las facturas.")
          setCargando(false)
          return
        }

        setFacturas(data || [])
      } catch {
        await cerrarSesionCliente()
        return
      } finally {
        setCargando(false)
      }
    }

    cargarFacturas()
  }, [router])

  if (cargando) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Cargando facturas...
      </main>
    )
  }

  if (!autorizado) {
    return null
  }

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

        {mensaje && (
          <div style={cardStyle}>
            <p style={{ color: "#333" }}>{mensaje}</p>
          </div>
        )}

        {!mensaje && facturas.length === 0 && (
          <div style={cardStyle}>
            <p style={{ color: "#333" }}>Aún no has registrado facturas.</p>
          </div>
        )}

        {!mensaje && facturas.length > 0 && (
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