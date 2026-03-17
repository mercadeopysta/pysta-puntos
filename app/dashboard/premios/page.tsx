"use client"

import { useEffect, useState } from "react"
import { supabase } from "../../../lib/supabase"
import LogoutButton from "../../../components/LogoutButton"
import InfoPopup from "../../../components/InfoPopup"

type FacturaSaldo = {
  amount_without_vat: number
  invoice_date: string
}

type Redencion = {
  points_used: number
  created_at: string
  redemption_group_id?: string | null
  reward_id?: string | null
  status?: string
}

type Premio = {
  id: string
  name: string
  item_value: number
  points_required: number
  stock: number
  is_active: boolean
  client_type: string
  image_url: string | null
  max_monthly_per_user: number
}

type ExistingRequestGroup = {
  redemption_group_id: string
  created_at: string
}

export default function PremiosPage() {
  const [puntosDisponibles, setPuntosDisponibles] = useState(0)
  const [premios, setPremios] = useState<Premio[]>([])
  const [cantidades, setCantidades] = useState<Record<string, string>>({})
  const [cargando, setCargando] = useState(true)
  const [mensaje, setMensaje] = useState("")
  const [limiteMensual, setLimiteMensual] = useState(5)
  const [itemsRedimidosMes, setItemsRedimidosMes] = useState(0)
  const [itemsPorPremioMes, setItemsPorPremioMes] = useState<Record<string, number>>({})
  const [procesandoPremioId, setProcesandoPremioId] = useState("")

  const itemsDisponiblesMes = Math.max(limiteMensual - itemsRedimidosMes, 0)

  const cargarDatos = async () => {
    setCargando(true)
    setMensaje("")

    const emailGuardado = localStorage.getItem("cliente_email")
    const tipoCliente = localStorage.getItem("cliente_tipo")

    if (!emailGuardado) {
      setCargando(false)
      setMensaje("No se encontró el usuario logueado.")
      return
    }

    const { data: settingsData } = await supabase
      .from("settings")
      .select(
        "redemption_percentage, monthly_redemption_limit, points_expiration_enabled, points_expiration_months"
      )
      .limit(1)
      .single()

    const porcentaje = Number(settingsData?.redemption_percentage || 6)
    const limite = Number(settingsData?.monthly_redemption_limit || 5)
    const vencimientoActivo = Boolean(settingsData?.points_expiration_enabled)
    const mesesVigencia = Number(settingsData?.points_expiration_months || 1)

    setLimiteMensual(limite)

    const { data: facturasData } = await supabase
      .from("invoices")
      .select("amount_without_vat, invoice_date")
      .eq("user_email", emailGuardado)
      .eq("status", "approved")

    let acumulados = 0

    if (facturasData) {
      const hoy = new Date()

      const facturasVigentes = (facturasData as FacturaSaldo[]).filter((factura) => {
        if (!vencimientoActivo) return true

        const fechaFactura = new Date(factura.invoice_date)
        const fechaVencimiento = new Date(fechaFactura)
        fechaVencimiento.setMonth(fechaVencimiento.getMonth() + mesesVigencia)

        return fechaVencimiento >= hoy
      })

      const totalCompras = facturasVigentes.reduce((acum, factura) => {
        return acum + Number(factura.amount_without_vat || 0)
      }, 0)

      const valorInterno = totalCompras * (porcentaje / 100)
      acumulados = Math.floor(valorInterno / 100)
    }

    const { data: redencionesData } = await supabase
      .from("redemptions")
      .select("points_used, created_at, redemption_group_id, reward_id, status")
      .eq("user_email", emailGuardado)
      .neq("status", "cancelled")

    let redimidos = 0
    let itemsMesActual = 0
    const conteoPorPremio: Record<string, number> = {}

    if (redencionesData) {
      redimidos = (redencionesData as Redencion[]).reduce((acum, redencion) => {
        return acum + Number(redencion.points_used || 0)
      }, 0)

      const hoy = new Date()
      const mesActual = hoy.getMonth()
      const anioActual = hoy.getFullYear()

      ;(redencionesData as Redencion[]).forEach((redencion) => {
        const fecha = new Date(redencion.created_at)
        const mismoMes =
          fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual

        if (mismoMes) {
          itemsMesActual += 1

          if (redencion.reward_id) {
            conteoPorPremio[redencion.reward_id] =
              (conteoPorPremio[redencion.reward_id] || 0) + 1
          }
        }
      })
    }

    setItemsRedimidosMes(itemsMesActual)
    setItemsPorPremioMes(conteoPorPremio)
    setPuntosDisponibles(Math.max(acumulados - redimidos, 0))

    const tiposPermitidos = tipoCliente ? [tipoCliente, "Ambos"] : ["Ambos"]

    const { data: premiosData } = await supabase
      .from("rewards")
      .select(
        "id, name, item_value, points_required, stock, is_active, client_type, image_url, max_monthly_per_user"
      )
      .eq("is_active", true)
      .in("client_type", tiposPermitidos)
      .order("created_at", { ascending: true })

    if (premiosData) {
      const premiosRows = premiosData as Premio[]
      setPremios(premiosRows)

      const cantidadesIniciales: Record<string, string> = {}
      premiosRows.forEach((premio) => {
        cantidadesIniciales[premio.id] =
          premio.stock > 0 ? cantidades[premio.id] ?? "1" : "0"
      })

      setCantidades(cantidadesIniciales)
    } else {
      setPremios([])
      setCantidades({})
    }

    setCargando(false)
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const generarGrupoRedencion = () => {
    return `RG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  const obtenerGrupoActivoDelDia = async (email: string) => {
    const hoy = new Date()
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0)
    const finDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59)

    const { data, error } = await supabase
      .from("redemptions")
      .select("redemption_group_id, created_at")
      .eq("user_email", email)
      .eq("status", "requested")
      .gte("created_at", inicioDia.toISOString())
      .lte("created_at", finDia.toISOString())
      .not("redemption_group_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)

    if (error || !data || data.length === 0) {
      return null
    }

    return data[0] as ExistingRequestGroup
  }

  const cambiarCantidad = (premioId: string, valor: string, stock: number) => {
    const limpio = valor.replace(/\D/g, "")

    if (limpio === "") {
      setCantidades((prev) => ({
        ...prev,
        [premioId]: "",
      }))
      return
    }

    let cantidad = Number(limpio)

    if (cantidad > stock) {
      cantidad = stock
    }

    setCantidades((prev) => ({
      ...prev,
      [premioId]: String(cantidad),
    }))
  }

  const normalizarCantidad = (premioId: string, stock: number) => {
    const actual = cantidades[premioId]

    if (stock <= 0) {
      setCantidades((prev) => ({
        ...prev,
        [premioId]: "0",
      }))
      return
    }

    if (actual === "" || actual === undefined) {
      setCantidades((prev) => ({
        ...prev,
        [premioId]: "1",
      }))
      return
    }

    let cantidad = Number(actual)

    if (Number.isNaN(cantidad) || cantidad < 1) {
      cantidad = 1
    }

    if (cantidad > stock) {
      cantidad = stock
    }

    setCantidades((prev) => ({
      ...prev,
      [premioId]: String(cantidad),
    }))
  }

  const pluralizarNombrePremio = (nombre: string, cantidad: number) => {
    const limpio = (nombre || "ítem").trim()

    if (cantidad === 1) {
      return limpio
    }

    const lower = limpio.toLowerCase()

    if (lower.endsWith("s") || lower.endsWith("x")) {
      return limpio
    }

    if (
      lower.endsWith("a") ||
      lower.endsWith("e") ||
      lower.endsWith("i") ||
      lower.endsWith("o") ||
      lower.endsWith("u")
    ) {
      return `${limpio}s`
    }

    return `${limpio}es`
  }

  const construirMensajeRedencion = (premio: Premio, cantidad: number, agregadaAGrupo: boolean) => {
    const nombreFormateado = pluralizarNombrePremio(premio.name || "ítem", cantidad)
    const textoBase = `Redimiste ${cantidad} ${nombreFormateado} correctamente.`

    if (agregadaAGrupo) {
      return `${textoBase} Se agregó a tu solicitud actual.`
    }

    return `${textoBase} Se creó una nueva solicitud.`
  }

  const handleRedimir = async (premio: Premio) => {
    setMensaje("")

    const emailGuardado = localStorage.getItem("cliente_email")
    const cantidadTexto = cantidades[premio.id]
    const cantidad = Number(cantidadTexto === "" ? 0 : cantidadTexto || "1")
    const puntosNecesarios = premio.points_required * cantidad
    const yaRedimidosDeEsePremio = Number(itemsPorPremioMes[premio.id] || 0)

    if (!emailGuardado) {
      setMensaje("No se encontró el usuario logueado.")
      return
    }

    if (premio.stock <= 0) {
      setMensaje("Este premio ya está agotado.")
      return
    }

    if (!cantidadTexto || cantidad < 1) {
      setMensaje("Debes ingresar una cantidad válida.")
      return
    }

    if (cantidad > premio.stock) {
      setMensaje(`Solo hay ${premio.stock} unidades disponibles de este premio.`)
      return
    }

    if (puntosDisponibles < puntosNecesarios) {
      setMensaje("No tienes puntos suficientes para esa cantidad.")
      return
    }

    if (itemsRedimidosMes + cantidad > limiteMensual) {
      setMensaje(
        `Con esa cantidad superarías el límite mensual de ${limiteMensual} ítems. Ya llevas ${itemsRedimidosMes}.`
      )
      return
    }

    const limitePremio = Number(premio.max_monthly_per_user || 0)

    if (limitePremio > 0 && yaRedimidosDeEsePremio + cantidad > limitePremio) {
      setMensaje(
        `Solo puedes redimir máximo ${limitePremio} unidades de este premio por mes. Ya llevas ${yaRedimidosDeEsePremio}.`
      )
      return
    }

    setProcesandoPremioId(premio.id)

    const grupoActivo = await obtenerGrupoActivoDelDia(emailGuardado)
    const redemptionGroupId =
      grupoActivo?.redemption_group_id || generarGrupoRedencion()

    const filas = Array.from({ length: cantidad }, () => ({
      user_email: emailGuardado,
      reward_id: premio.id,
      reward_name: premio.name,
      points_used: premio.points_required,
      status: "requested",
      redemption_group_id: redemptionGroupId,
    }))

    const { error: redencionError } = await supabase.from("redemptions").insert(filas)

    if (redencionError) {
      setMensaje("Ocurrió un error al redimir: " + redencionError.message)
      setProcesandoPremioId("")
      return
    }

    const { error: stockError } = await supabase
      .from("rewards")
      .update({ stock: premio.stock - cantidad })
      .eq("id", premio.id)

    if (stockError) {
      setMensaje("La redención se guardó, pero hubo un problema al actualizar el stock.")
      setProcesandoPremioId("")
      return
    }

    setMensaje(construirMensajeRedencion(premio, cantidad, Boolean(grupoActivo)))

    setCantidades((prev) => ({
      ...prev,
      [premio.id]: premio.stock - cantidad > 0 ? "1" : "0",
    }))

    setProcesandoPremioId("")
    await cargarDatos()
  }

  const refrescarPantalla = () => {
    cargarDatos()
  }

  return (
    <>
      <InfoPopup
        storageKey="popup-premios"
        title="Redención de premios"
        message="Recuerda que los premios redimidos serán enviados con el siguiente pedido que realices. También puedes revisar el estado de tus solicitudes en Mis redenciones."
      />

      <main
        style={{
          minHeight: "100vh",
          backgroundColor: "#f5f5f5",
          padding: "20px 14px",
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
              Premios disponibles
            </h1>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <a href="/dashboard" className="pysta-btn pysta-btn-light">
                Volver al panel
              </a>

              <button
                onClick={refrescarPantalla}
                className="pysta-btn pysta-btn-light"
                style={{ border: "none", cursor: "pointer" }}
              >
                Refrescar
              </button>

              <LogoutButton />
            </div>
          </div>

          <p style={{ color: "#555", marginBottom: "10px" }}>
            Aquí puedes ver los premios disponibles para redimir con tus puntos.
          </p>

          <p style={{ color: "#111", fontWeight: "bold", marginBottom: "8px" }}>
            Tus puntos disponibles: {puntosDisponibles}
          </p>

          <p style={{ color: "#555", marginBottom: "6px" }}>
            Ítems redimidos este mes: {itemsRedimidosMes} / {limiteMensual}
          </p>

          <p style={{ color: "#111", fontWeight: "bold", marginBottom: "20px" }}>
            Ítems disponibles para este mes: {itemsDisponiblesMes}
          </p>

          {mensaje && (
            <div
              style={{
                backgroundColor: "white",
                padding: "16px",
                borderRadius: "12px",
                marginBottom: "20px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                color: "#111",
              }}
            >
              {mensaje}
            </div>
          )}

          {cargando ? (
            <div style={cardStyle}>
              <p style={{ color: "#333" }}>Cargando premios...</p>
            </div>
          ) : premios.length === 0 ? (
            <div style={cardStyle}>
              <p style={{ color: "#333" }}>
                No hay premios disponibles para tu tipo de cliente.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "20px",
              }}
            >
              {premios.map((premio) => {
                const cantidadTexto = cantidades[premio.id] ?? (premio.stock > 0 ? "1" : "0")
                const cantidad = Number(cantidadTexto === "" ? 0 : cantidadTexto)
                const puntosNecesarios = premio.points_required * cantidad
                const disponible = premio.stock > 0
                const puedeRedimir =
                  cantidad >= 1 && puntosDisponibles >= puntosNecesarios
                const excedeLimite = cantidad >= 1 && itemsRedimidosMes + cantidad > limiteMensual
                const redimidosDeEsePremio = Number(itemsPorPremioMes[premio.id] || 0)
                const limitePremio = Number(premio.max_monthly_per_user || 0)
                const excedeLimitePorItem =
                  cantidad >= 1 &&
                  limitePremio > 0 &&
                  redimidosDeEsePremio + cantidad > limitePremio
                const procesando = procesandoPremioId === premio.id

                return (
                  <div key={premio.id} style={cardStyle}>
                    <div style={imageWrapStyle}>
                      {premio.image_url ? (
                        <img src={premio.image_url} alt={premio.name} style={imageStyle} />
                      ) : (
                        <div style={imagePlaceholderStyle}>Sin imagen</div>
                      )}
                    </div>

                    <h2 style={nameStyle}>{premio.name}</h2>

                    <p style={textStyle}>Puntos por unidad: {premio.points_required}</p>
                    <p style={textStyle}>Stock disponible: {premio.stock}</p>
                    <p style={textStyle}>Aplica para: {premio.client_type}</p>

                    {limitePremio > 0 && (
                      <p style={textStyle}>
                        Máximo por este premio al mes: {redimidosDeEsePremio} / {limitePremio}
                      </p>
                    )}

                    <div style={{ marginTop: "12px", marginBottom: "12px" }}>
                      <label style={labelStyle}>Cantidad</label>
                      <input
                        className="campo-cantidad"
                        type="text"
                        inputMode="numeric"
                        value={cantidadTexto}
                        onChange={(e) =>
                          cambiarCantidad(premio.id, e.target.value, premio.stock)
                        }
                        onBlur={() => normalizarCantidad(premio.id, premio.stock)}
                        disabled={!disponible}
                        placeholder={disponible ? "1" : "0"}
                      />
                    </div>

                    <p style={{ ...textStyle, fontWeight: "bold" }}>
                      Puntos necesarios: {puntosNecesarios}
                    </p>

                    {!disponible && (
                      <p style={{ ...textStyle, color: "#999", fontWeight: "bold" }}>
                        Estado: Agotado
                      </p>
                    )}

                    {disponible && cantidadTexto === "" && (
                      <p style={{ ...textStyle, color: "#b45309", fontWeight: "bold" }}>
                        Ingresa una cantidad para continuar
                      </p>
                    )}

                    {disponible && cantidadTexto !== "" && excedeLimite && (
                      <p style={{ ...textStyle, color: "#b91c1c", fontWeight: "bold" }}>
                        Supera tu límite mensual de ítems
                      </p>
                    )}

                    {disponible &&
                      cantidadTexto !== "" &&
                      !excedeLimite &&
                      excedeLimitePorItem && (
                        <p style={{ ...textStyle, color: "#b91c1c", fontWeight: "bold" }}>
                          Supera el máximo mensual permitido para este premio
                        </p>
                      )}

                    {disponible &&
                      cantidadTexto !== "" &&
                      !excedeLimite &&
                      !excedeLimitePorItem &&
                      puedeRedimir && (
                        <p style={{ ...textStyle, color: "#006400", fontWeight: "bold" }}>
                          Puedes redimir esta cantidad
                        </p>
                      )}

                    {disponible &&
                      cantidadTexto !== "" &&
                      !excedeLimite &&
                      !excedeLimitePorItem &&
                      !puedeRedimir && (
                        <p style={{ ...textStyle, color: "#b45309", fontWeight: "bold" }}>
                          Te faltan {Math.max(puntosNecesarios - puntosDisponibles, 0)} puntos
                        </p>
                      )}

                    {!disponible ? (
                      <button style={buttonDisabled}>Agotado</button>
                    ) : cantidadTexto === "" ? (
                      <button style={buttonDisabled}>Ingresa cantidad</button>
                    ) : excedeLimite ? (
                      <button style={buttonDisabled}>Supera límite mensual</button>
                    ) : excedeLimitePorItem ? (
                      <button style={buttonDisabled}>Supera límite por ítem</button>
                    ) : !puedeRedimir ? (
                      <button style={buttonDisabled}>Sin puntos suficientes</button>
                    ) : (
                      <button
                        onClick={() => handleRedimir(premio)}
                        style={buttonGold}
                        disabled={procesando}
                      >
                        {procesando ? "Procesando..." : "Redimir"}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ marginTop: "30px" }}>
            <a href="/dashboard" style={buttonBack}>
              Volver al panel
            </a>
          </div>
        </div>

        <style>{`
          .campo-cantidad {
            width: 100%;
            padding: 12px;
            border-radius: 10px;
            border: 1px solid #ccc;
            font-size: 16px;
            color: #111;
            background: #fff;
            box-sizing: border-box;
          }
        `}</style>
      </main>
    </>
  )
}

const cardStyle = {
  backgroundColor: "white",
  borderRadius: "16px",
  padding: "20px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
}

const imageWrapStyle = {
  marginBottom: "16px",
}

const imageStyle = {
  width: "100%",
  height: "220px",
  objectFit: "cover" as const,
  borderRadius: "12px",
  border: "1px solid #ddd",
}

const imagePlaceholderStyle = {
  height: "220px",
  borderRadius: "12px",
  backgroundColor: "#ececec",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#666",
  fontSize: "18px",
}

const nameStyle = {
  fontSize: "22px",
  color: "#111",
  marginBottom: "10px",
}

const textStyle = {
  color: "#555",
  marginBottom: "8px",
}

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  color: "#111",
  fontWeight: "bold" as const,
}

const buttonGold = {
  marginTop: "10px",
  backgroundColor: "#d4af37",
  color: "#111",
  border: "none",
  padding: "12px 20px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold" as const,
  width: "100%",
}

const buttonDisabled = {
  marginTop: "10px",
  backgroundColor: "#ccc",
  color: "#666",
  border: "none",
  padding: "12px 20px",
  borderRadius: "10px",
  width: "100%",
}

const buttonBack = {
  backgroundColor: "#111",
  color: "white",
  textDecoration: "none",
  padding: "14px 24px",
  borderRadius: "10px",
  display: "inline-block",
}