"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import LogoutButton from "../../../components/LogoutButton"
import InfoPopup from "../../../components/InfoPopup"

type Factura = {
  id: string
  invoice_number: string
  invoice_date: string
  amount_without_vat: number
  status: string
  file_url?: string | null
  file_name?: string | null
}

export default function MisFacturasPage() {
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState("")
  const [nombreCliente, setNombreCliente] = useState("")

  const cerrarSesionCliente = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem("cliente_email")
    localStorage.removeItem("cliente_name")
    localStorage.removeItem("cliente_tipo")
    router.replace("/login")
  }

  const cargarFacturas = async () => {
    try {
      const sessionResponse = await supabase.auth.getSession()
      const session = sessionResponse.data.session
      const sessionError = sessionResponse.error

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

      setNombreCliente(profile.full_name || "")
      setAutorizado(true)

      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, invoice_date, amount_without_vat, status, file_url, file_name")
        .eq("user_email", profile.email)
        .order("created_at", { ascending: false })

      if (error) {
        setMensaje("Ocurrió un error al cargar las facturas.")
        return
      }

      setFacturas((data as Factura[]) || [])
    } catch {
      await cerrarSesionCliente()
      return
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarFacturas()
  }, [router])

  const traducirEstado = (estado: string) => {
    if (estado === "approved") return "Aprobada"
    if (estado === "rejected") return "Rechazada"
    if (estado === "pending") return "Pendiente"
    return estado
  }

  const descripcionEstado = (estado: string) => {
    if (estado === "approved") return "Tu factura ya fue validada por administración."
    if (estado === "rejected") return "Tu factura fue rechazada. Puedes reemplazarla fácilmente desde aquí."
    if (estado === "pending") return "Tu factura está pendiente de aprobación. Puedes revisar su estado aquí."
    return "Consulta el estado actual de tu factura."
  }

  const estadoStyles = (estado: string) => {
    if (estado === "approved") {
      return {
        background: "#ecfdf3",
        color: "#166534",
        border: "1px solid #bbf7d0",
      }
    }

    if (estado === "rejected") {
      return {
        background: "#fef2f2",
        color: "#991b1b",
        border: "1px solid #fecaca",
      }
    }

    return {
      background: "#fff7ed",
      color: "#9a3412",
      border: "1px solid #fed7aa",
    }
  }

  const refrescarPantalla = () => {
    cargarFacturas()
  }

  if (cargando) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
          background: "#f5f5f5",
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
    <>
      <InfoPopup
        storageKey="popup-mis-facturas"
        title="Estado de tus facturas"
        message="Cuando registres una factura, esta puede quedar pendiente de aprobación mientras es validada por administración. Si una factura es rechazada, puedes reemplazarla desde esta misma pantalla."
      />

      <main
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg, #f5f5f5 0%, #ececec 100%)",
          padding: "32px 20px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: "1180px", margin: "0 auto" }}>
          <section
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              padding: "28px",
              boxShadow: "0 14px 40px rgba(0,0,0,0.08)",
              marginBottom: "22px",
              border: "1px solid rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "18px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                <div
                  style={{
                    width: "84px",
                    height: "84px",
                    borderRadius: "18px",
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                  }}
                >
                  <img
                    src="/logo-pysta.png"
                    alt="Pysta"
                    style={{
                      maxWidth: "76px",
                      maxHeight: "76px",
                      objectFit: "contain",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gap: "8px" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      width: "fit-content",
                      padding: "6px 12px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: 700,
                      background: "rgba(212, 175, 55, 0.14)",
                      color: "#7a5b00",
                      border: "1px solid rgba(212, 175, 55, 0.24)",
                    }}
                  >
                    Historial de facturas
                  </span>

                  <h1 style={{ margin: 0, fontSize: "34px", color: "#111" }}>
                    Mis facturas
                  </h1>

                  <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
                    {nombreCliente ? `Cliente: ${nombreCliente}` : "Consulta las facturas registradas en tu cuenta"}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  onClick={refrescarPantalla}
                  style={{
                    background: "#e9e9e9",
                    color: "#111",
                    border: "none",
                    padding: "12px 18px",
                    borderRadius: "14px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  Refrescar
                </button>

                <LogoutButton />
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
              titulo="Facturas registradas"
              valor={String(facturas.length)}
              descripcion="Total cargadas en tu cuenta"
            />
            <ResumenCard
              titulo="Facturas aprobadas"
              valor={String(facturas.filter((f) => f.status === "approved").length)}
              descripcion="Ya validadas por administración"
            />
            <ResumenCard
              titulo="Facturas pendientes"
              valor={String(facturas.filter((f) => f.status === "pending").length)}
              descripcion="Aún en proceso de revisión"
            />
            <ResumenCard
              titulo="Facturas rechazadas"
              valor={String(facturas.filter((f) => f.status === "rejected").length)}
              descripcion="Puedes reemplazarlas"
            />
          </section>

          {mensaje ? (
            <section style={messageCardStyle}>{mensaje}</section>
          ) : facturas.length === 0 ? (
            <section style={emptyCardStyle}>
              <h2 style={{ margin: 0, fontSize: "24px", color: "#111" }}>Aún no has registrado facturas</h2>
              <p style={{ margin: "10px 0 0 0", color: "#6b7280", lineHeight: 1.6 }}>
                Cuando cargues tu primera factura, aparecerá aquí con su estado de revisión.
              </p>

              <div style={{ marginTop: "20px" }}>
                <a href="/dashboard/facturas/nueva" style={buttonGold}>
                  Registrar nueva factura
                </a>
              </div>
            </section>
          ) : (
            <section style={{ display: "grid", gap: "16px" }}>
              {facturas.map((factura) => (
                <article
                  key={factura.id}
                  style={{
                    background: "#fff",
                    borderRadius: "22px",
                    padding: "22px",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.07)",
                    border: "1px solid rgba(0,0,0,0.04)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "16px",
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                      marginBottom: "16px",
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, color: "#6b7280", fontSize: "13px", fontWeight: 700 }}>
                        FACTURA
                      </p>
                      <h3 style={{ margin: "6px 0 0 0", fontSize: "24px", color: "#111" }}>
                        {factura.invoice_number}
                      </h3>
                    </div>

                    <span
                      style={{
                        ...estadoStyles(factura.status),
                        padding: "8px 12px",
                        borderRadius: "999px",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      {traducirEstado(factura.status)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "14px",
                    }}
                  >
                    <InfoItem label="Fecha" value={factura.invoice_date} />
                    <InfoItem
                      label="Valor sin IVA"
                      value={`$${Number(factura.amount_without_vat).toLocaleString("es-CO")}`}
                    />
                    <InfoItem label="Estado actual" value={traducirEstado(factura.status)} />
                    <InfoItem label="Detalle" value={descripcionEstado(factura.status)} />
                  </div>

                  <div style={{ marginTop: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {factura.file_url ? (
                      <a
                        href={factura.file_url}
                        target="_blank"
                        rel="noreferrer"
                        style={buttonLight}
                      >
                        Ver archivo
                      </a>
                    ) : null}

                    {factura.status === "rejected" ? (
                      <a
                        href={`/dashboard/facturas/nueva?edit=${factura.id}`}
                        style={buttonGold}
                      >
                        Reemplazar factura rechazada
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </section>
          )}

          <div style={{ marginTop: "28px", display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <a href="/dashboard/facturas/nueva" style={buttonGold}>
              Registrar nueva factura
            </a>

            <a href="/dashboard" style={buttonDark}>
              Volver al panel
            </a>
          </div>
        </div>
      </main>
    </>
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
      style={{
        background: "#fff",
        borderRadius: "22px",
        padding: "22px",
        boxShadow: "0 10px 28px rgba(0,0,0,0.07)",
        border: "1px solid rgba(0,0,0,0.04)",
      }}
    >
      <p style={{ margin: 0, color: "#6b7280", fontSize: "14px", fontWeight: 700 }}>{titulo}</p>
      <h3 style={{ margin: "10px 0 8px 0", fontSize: "34px", color: "#111" }}>{valor}</h3>
      <p style={{ margin: 0, color: "#555", fontSize: "14px", lineHeight: 1.4 }}>{descripcion}</p>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        padding: "14px 16px",
      }}
    >
      <p style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#6b7280", fontWeight: 700 }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: "16px", color: "#111", lineHeight: 1.5 }}>
        {value}
      </p>
    </div>
  )
}

const messageCardStyle = {
  background: "#fff",
  borderRadius: "22px",
  padding: "22px",
  boxShadow: "0 12px 30px rgba(0,0,0,0.07)",
  border: "1px solid rgba(0,0,0,0.04)",
  color: "#111",
}

const emptyCardStyle = {
  background: "#fff",
  borderRadius: "22px",
  padding: "28px",
  boxShadow: "0 12px 30px rgba(0,0,0,0.07)",
  border: "1px solid rgba(0,0,0,0.04)",
}

const buttonDark = {
  backgroundColor: "#111",
  color: "white",
  textDecoration: "none",
  padding: "14px 24px",
  borderRadius: "14px",
  display: "inline-block",
  fontWeight: "bold" as const,
}

const buttonGold = {
  backgroundColor: "#d4af37",
  color: "#111",
  textDecoration: "none",
  padding: "14px 24px",
  borderRadius: "14px",
  display: "inline-block",
  fontWeight: "bold" as const,
}

const buttonLight = {
  backgroundColor: "#e9e9e9",
  color: "#111",
  textDecoration: "none",
  padding: "14px 24px",
  borderRadius: "14px",
  display: "inline-block",
  fontWeight: "bold" as const,
}