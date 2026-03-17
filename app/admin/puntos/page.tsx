"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import AdminMenu from "../../../components/AdminMenu"
import AdminLogoutButton from "../../../components/AdminLogoutButton"
import AlertMessage from "../../../components/AlertMessage"

type InvoiceRow = {
  id: string
  user_email: string
  invoice_date: string
  amount_without_vat: number
  status: string
}

type ProfileRow = {
  email: string
  full_name: string
  document_number: string
  client_type: string
  advisor_name: string | null
}

type SettingsRow = {
  redemption_percentage: number
  points_expiration_enabled: boolean
  points_expiration_months: number
}

type ClientePuntos = {
  email: string
  full_name: string
  document_number: string
  client_type: string
  advisor_name: string
  total_purchase: number
  total_points_accumulated: number
  invoices_count: number
}

export default function AdminPuntosPage() {
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState("")
  const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "warning" | "info">("info")

  const [clientesPuntos, setClientesPuntos] = useState<ClientePuntos[]>([])
  const [filtroBusqueda, setFiltroBusqueda] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")

  useEffect(() => {
    const adminLogueado = localStorage.getItem("admin_logged_in")

    if (adminLogueado !== "true") {
      router.push("/admin/login")
      return
    }

    setAutorizado(true)
  }, [router])

  const cargarPuntos = async () => {
    setCargando(true)
    setMensaje("")

    const { data: settingsData, error: settingsError } = await supabase
      .from("settings")
      .select("redemption_percentage, points_expiration_enabled, points_expiration_months")
      .limit(1)
      .single()

    if (settingsError) {
      setTipoMensaje("error")
      setMensaje("No se pudo cargar la configuración de puntos.")
      setCargando(false)
      return
    }

    const settings = settingsData as SettingsRow
    const porcentaje = Number(settings?.redemption_percentage || 6)
    const vencimientoActivo = Boolean(settings?.points_expiration_enabled)
    const mesesVigencia = Number(settings?.points_expiration_months || 1)

    let invoicesQuery = supabase
      .from("invoices")
      .select("id, user_email, invoice_date, amount_without_vat, status")
      .eq("status", "approved")
      .order("invoice_date", { ascending: false })

    if (fechaDesde) {
      invoicesQuery = invoicesQuery.gte("invoice_date", fechaDesde)
    }

    if (fechaHasta) {
      invoicesQuery = invoicesQuery.lte("invoice_date", fechaHasta)
    }

    const { data: invoicesData, error: invoicesError } = await invoicesQuery

    if (invoicesError) {
      setTipoMensaje("error")
      setMensaje("No se pudieron cargar las facturas aprobadas.")
      setCargando(false)
      return
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("email, full_name, document_number, client_type, advisor_name")

    if (profilesError) {
      setTipoMensaje("error")
      setMensaje("No se pudieron cargar los perfiles de clientes.")
      setCargando(false)
      return
    }

    const invoices = (invoicesData as InvoiceRow[]) || []
    const profiles = (profilesData as ProfileRow[]) || []

    const profilesMap: Record<string, ProfileRow> = {}
    profiles.forEach((profile) => {
      profilesMap[profile.email] = profile
    })

    const hoy = new Date()

    const invoicesVigentes = invoices.filter((invoice) => {
      if (!vencimientoActivo) return true

      const fechaFactura = new Date(invoice.invoice_date)
      const fechaVencimiento = new Date(fechaFactura)
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + mesesVigencia)

      return fechaVencimiento >= hoy
    })

    const agrupado: Record<string, ClientePuntos> = {}

    invoicesVigentes.forEach((invoice) => {
      const email = invoice.user_email
      if (!email) return

      const profile = profilesMap[email]

      if (!agrupado[email]) {
        agrupado[email] = {
          email,
          full_name: profile?.full_name || email,
          document_number: profile?.document_number || "",
          client_type: profile?.client_type || "",
          advisor_name: profile?.advisor_name || "",
          total_purchase: 0,
          total_points_accumulated: 0,
          invoices_count: 0,
        }
      }

      const valor = Number(invoice.amount_without_vat || 0)
      const valorInterno = valor * (porcentaje / 100)
      const puntos = Math.floor(valorInterno / 100)

      agrupado[email].total_purchase += valor
      agrupado[email].total_points_accumulated += puntos
      agrupado[email].invoices_count += 1
    })

    const resultado = Object.values(agrupado).sort(
      (a, b) => b.total_points_accumulated - a.total_points_accumulated
    )

    setClientesPuntos(resultado)
    setCargando(false)
  }

  useEffect(() => {
    if (autorizado) {
      cargarPuntos()
    }
  }, [autorizado, fechaDesde, fechaHasta])

  const clientesFiltrados = useMemo(() => {
    const busqueda = filtroBusqueda.trim().toLowerCase()
    const tipo = filtroTipo.trim().toLowerCase()

    return clientesPuntos.filter((cliente) => {
      const coincideBusqueda =
        !busqueda ||
        cliente.full_name.toLowerCase().includes(busqueda) ||
        cliente.document_number.toLowerCase().includes(busqueda) ||
        cliente.email.toLowerCase().includes(busqueda)

      const coincideTipo =
        !tipo || (cliente.client_type || "").toLowerCase() === tipo

      return coincideBusqueda && coincideTipo
    })
  }, [clientesPuntos, filtroBusqueda, filtroTipo])

  const exportarCSV = () => {
    if (clientesFiltrados.length === 0) {
      setTipoMensaje("warning")
      setMensaje("No hay datos para exportar con los filtros actuales.")
      return
    }

    const filas = clientesFiltrados.map((cliente, index) => ({
      Posicion: index + 1,
      Nombre: cliente.full_name,
      Documento: cliente.document_number || "",
      Correo: cliente.email,
      TipoCliente: cliente.client_type || "",
      Asesor: cliente.advisor_name || "",
      FacturasAprobadas: cliente.invoices_count,
      CompraAcumulada: cliente.total_purchase,
      PuntosAcumulados: cliente.total_points_accumulated,
    }))

    const encabezados = Object.keys(filas[0])

    const escaparCSV = (valor: string | number) => {
      const texto = String(valor ?? "")
      if (texto.includes(",") || texto.includes('"') || texto.includes("\n")) {
        return `"${texto.replace(/"/g, '""')}"`
      }
      return texto
    }

    const contenido = [
      encabezados.join(","),
      ...filas.map((fila) =>
        encabezados.map((encabezado) => escaparCSV(fila[encabezado as keyof typeof fila])).join(",")
      ),
    ].join("\n")

    const blob = new Blob(["\uFEFF" + contenido], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const hoy = new Date().toISOString().slice(0, 10)

    link.href = url
    link.setAttribute("download", `ranking-puntos-${hoy}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setTipoMensaje("success")
    setMensaje("CSV exportado correctamente.")
  }

  const topCliente = clientesFiltrados.length > 0 ? clientesFiltrados[0] : null

  const topMayorista =
    clientesFiltrados.find((c) => (c.client_type || "").toLowerCase() === "mayorista") || null

  const topDistribuidor =
    clientesFiltrados.find((c) => (c.client_type || "").toLowerCase() === "distribuidor") || null

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
      <div className="pysta-shell" style={{ maxWidth: "1500px" }}>
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
              <span className="pysta-badge">Ranking de puntos</span>
              <h1 className="pysta-section-title">Puntos acumulados por cliente</h1>
              <p className="pysta-subtitle">
                Consulta quién ha acumulado más puntos y usa esta vista para campañas, incentivos o premiaciones.
              </p>
            </div>

            <AdminLogoutButton />
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
            titulo="Clientes con puntos"
            valor={String(clientesFiltrados.length)}
            descripcion="Ranking actual"
          />
          <ResumenCard
            titulo="Puntos acumulados"
            valor={String(
              clientesFiltrados.reduce((acc, item) => acc + item.total_points_accumulated, 0)
            )}
            descripcion="Total visible en pantalla"
          />
          <ResumenCard
            titulo="Compra acumulada"
            valor={`$${clientesFiltrados
              .reduce((acc, item) => acc + item.total_purchase, 0)
              .toLocaleString("es-CO")}`}
            descripcion="Suma sin IVA"
          />
          <ResumenCard
            titulo="Líder general"
            valor={topCliente ? topCliente.full_name : "-"}
            descripcion={topCliente ? `${topCliente.total_points_accumulated} puntos` : "Sin datos"}
          />
          <ResumenCard
            titulo="Top mayorista"
            valor={topMayorista ? topMayorista.full_name : "-"}
            descripcion={topMayorista ? `${topMayorista.total_points_accumulated} puntos` : "Sin datos"}
          />
          <ResumenCard
            titulo="Top distribuidor"
            valor={topDistribuidor ? topDistribuidor.full_name : "-"}
            descripcion={topDistribuidor ? `${topDistribuidor.total_points_accumulated} puntos` : "Sin datos"}
          />
        </section>

        <section className="pysta-card" style={{ padding: "24px", marginBottom: "22px" }}>
          <div style={{ display: "grid", gap: "8px", marginBottom: "18px" }}>
            <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Filtros</h2>
            <p style={{ margin: 0, color: "#6b7280" }}>
              Busca por nombre, documento o correo. También puedes filtrar por tipo y por rango de fechas.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <div>
              <label style={labelStyle}>Buscar cliente</label>
              <input
                className="pysta-input"
                type="text"
                placeholder="Nombre, documento o correo"
                value={filtroBusqueda}
                onChange={(e) => setFiltroBusqueda(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Tipo de cliente</label>
              <select
                className="pysta-select"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="mayorista">Mayorista</option>
                <option value="distribuidor">Distribuidor</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Fecha desde</label>
              <input
                className="pysta-input"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Fecha hasta</label>
              <input
                className="pysta-input"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
          </div>

          <div className="pysta-actions">
            <button
              onClick={() => {
                setFiltroBusqueda("")
                setFiltroTipo("")
                setFechaDesde("")
                setFechaHasta("")
              }}
              className="pysta-btn pysta-btn-light"
            >
              Limpiar filtros
            </button>

            <button
              onClick={exportarCSV}
              className="pysta-btn pysta-btn-dark"
            >
              Exportar CSV
            </button>
          </div>
        </section>

        {mensaje && (
          <section className="pysta-card" style={{ padding: "18px 20px", marginBottom: "22px" }}>
            <AlertMessage text={mensaje} type={tipoMensaje} />
          </section>
        )}

        <section className="pysta-card" style={{ padding: "0", overflow: "hidden" }}>
          <div
            style={{
              padding: "22px 24px",
              borderBottom: "1px solid #e5e7eb",
              background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Ranking de clientes</h2>
            <p style={{ margin: "6px 0 0 0", color: "#6b7280" }}>
              Total encontrados: {clientesFiltrados.length}
            </p>
          </div>

          {cargando ? (
            <div style={{ padding: "24px", color: "#333" }}>Cargando puntos...</div>
          ) : clientesFiltrados.length === 0 ? (
            <div style={{ padding: "24px", color: "#333" }}>No hay clientes para esos filtros.</div>
          ) : (
            <div style={{ padding: "18px" }}>
              <div style={{ display: "grid", gap: "14px" }}>
                {clientesFiltrados.map((cliente, index) => (
                  <article
                    key={cliente.email}
                    style={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "20px",
                      padding: "20px",
                      boxShadow: "0 8px 22px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "14px",
                        flexWrap: "wrap",
                        marginBottom: "14px",
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ display: "grid", gap: "8px" }}>
                        <h3 style={{ margin: 0, color: "#111", fontSize: "22px" }}>
                          #{index + 1} · {cliente.full_name}
                        </h3>

                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <span style={miniBadge}>{cliente.client_type || "Sin tipo"}</span>

                          {cliente.advisor_name ? (
                            <span
                              style={{
                                ...miniBadge,
                                background: "#eff6ff",
                                color: "#1d4ed8",
                                border: "1px solid #bfdbfe",
                              }}
                            >
                              Asesor: {cliente.advisor_name}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                        gap: "12px",
                      }}
                    >
                      <InfoItem label="Documento" value={cliente.document_number || "-"} />
                      <InfoItem label="Correo" value={cliente.email} />
                      <InfoItem label="Facturas aprobadas" value={String(cliente.invoices_count)} />
                      <InfoItem
                        label="Compra acumulada"
                        value={`$${cliente.total_purchase.toLocaleString("es-CO")}`}
                      />
                      <InfoItem
                        label="Puntos acumulados"
                        value={String(cliente.total_points_accumulated)}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
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
        borderRadius: "14px",
        padding: "12px 14px",
      }}
    >
      <p style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#6b7280", fontWeight: 700 }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: "15px", color: "#111", lineHeight: 1.5 }}>
        {value}
      </p>
    </div>
  )
}

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  color: "#111",
  fontWeight: "bold" as const,
  fontSize: "14px",
}

const miniBadge = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold" as const,
  background: "rgba(212, 175, 55, 0.14)",
  color: "#7a5b00",
  border: "1px solid rgba(212, 175, 55, 0.24)",
}