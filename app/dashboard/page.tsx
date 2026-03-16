"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"
import LogoutButton from "../../components/LogoutButton"

export default function DashboardPage() {
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [nombre, setNombre] = useState("")
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const validarCliente = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
          localStorage.removeItem("cliente_email")
          localStorage.removeItem("cliente_name")
          localStorage.removeItem("cliente_tipo")
          router.replace("/login")
          return
        }

        const user = session.user

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, full_name, client_type, is_active, is_approved")
          .eq("id", user.id)
          .maybeSingle()

        if (profileError || !profile) {
          await supabase.auth.signOut()
          localStorage.removeItem("cliente_email")
          localStorage.removeItem("cliente_name")
          localStorage.removeItem("cliente_tipo")
          router.replace("/login")
          return
        }

        if (!profile.is_active || !profile.is_approved) {
          await supabase.auth.signOut()
          localStorage.removeItem("cliente_email")
          localStorage.removeItem("cliente_name")
          localStorage.removeItem("cliente_tipo")
          router.replace("/login")
          return
        }

        localStorage.setItem("cliente_email", profile.email || "")
        localStorage.setItem("cliente_name", profile.full_name || "")
        localStorage.setItem("cliente_tipo", profile.client_type || "")

        setNombre(profile.full_name || "")
        setAutorizado(true)
      } catch {
        await supabase.auth.signOut()
        localStorage.removeItem("cliente_email")
        localStorage.removeItem("cliente_name")
        localStorage.removeItem("cliente_tipo")
        router.replace("/login")
      } finally {
        setCargando(false)
      }
    }

    validarCliente()
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
        Validando acceso...
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
        background: "#f5f5f5",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "30px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "grid", gap: "8px" }}>
              <span
                style={{
                  display: "inline-flex",
                  width: "fit-content",
                  padding: "6px 10px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: "rgba(212, 175, 55, 0.14)",
                  color: "#7a5b00",
                  border: "1px solid rgba(212, 175, 55, 0.24)",
                }}
              >
                Panel cliente
              </span>

              <h1 style={{ margin: 0, fontSize: "32px", color: "#111" }}>
                Hola{nombre ? `, ${nombre}` : ""}
              </h1>

              <p style={{ margin: 0, color: "#6b7280" }}>
                Bienvenido a tu panel de puntos Pysta.
              </p>
            </div>

            <LogoutButton />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          <Link href="/dashboard/facturas/nueva" style={cardStyle}>
            Registrar factura
          </Link>

          <Link href="/dashboard/premios" style={cardStyle}>
            Ver premios
          </Link>

          <Link href="/dashboard/redenciones" style={cardStyle}>
            Mis redenciones
          </Link>

          <Link href="/dashboard/mis-facturas" style={cardStyle}>
            Mis facturas
          </Link>
        </div>
      </div>
    </main>
  )
}

const cardStyle = {
  background: "#fff",
  color: "#111",
  textDecoration: "none",
  padding: "24px",
  borderRadius: "18px",
  boxShadow: "0 10px 24px rgba(0,0,0,0.06)",
  fontWeight: "bold" as const,
  fontSize: "18px",
}