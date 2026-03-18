"use client"

import { ChangeEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import AdminMenu from "../../../components/AdminMenu"
import AdminLogoutButton from "../../../components/AdminLogoutButton"
import ConfirmModal from "../../../components/ConfirmModal"
import AlertMessage from "../../../components/AlertMessage"

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

export default function AdminPremiosPage() {
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [premios, setPremios] = useState<Premio[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [clientType, setClientType] = useState("")
  const [itemValue, setItemValue] = useState("")
  const [stock, setStock] = useState("")
  const [maxMonthlyPerUser, setMaxMonthlyPerUser] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [currentImageUrl, setCurrentImageUrl] = useState("")

  const [mensaje, setMensaje] = useState("")
  const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "warning" | "info">("info")
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [premioAEliminar, setPremioAEliminar] = useState<Premio | null>(null)
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    const adminLogueado = localStorage.getItem("admin_logged_in")

    if (adminLogueado !== "true") {
      router.push("/admin/login")
      return
    }

    setAutorizado(true)
  }, [router])

  const cargarPremios = async () => {
    setCargando(true)

    const { data, error } = await supabase
      .from("rewards")
      .select("id, name, item_value, points_required, stock, is_active, client_type, image_url, max_monthly_per_user")
      .order("created_at", { ascending: true })

    if (error) {
      setTipoMensaje("error")
      setMensaje("Ocurrió un error al cargar los premios.")
      setCargando(false)
      return
    }

    setPremios((data as Premio[]) || [])
    setCargando(false)
  }

  useEffect(() => {
    if (autorizado) {
      cargarPremios()
    }
  }, [autorizado])

  const limpiarFormulario = () => {
    setEditingId(null)
    setName("")
    setClientType("")
    setItemValue("")
    setStock("")
    setMaxMonthlyPerUser("")
    setImageFile(null)
    setCurrentImageUrl("")

    const fileInput = document.getElementById("reward-image-input") as HTMLInputElement | null
    if (fileInput) {
      fileInput.value = ""
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setImageFile(file)
  }

  const subirImagen = async () => {
    if (!imageFile) return currentImageUrl || null

    const extension = imageFile.name.split(".").pop()?.toLowerCase() || ""
    const allowed = ["jpg", "jpeg", "png", "webp"]

    if (!allowed.includes(extension)) {
      throw new Error("Solo se permiten imágenes JPG, PNG o WEBP.")
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${imageFile.name}`

    const { error } = await supabase.storage
      .from("reward-images")
      .upload(fileName, imageFile, {
        cacheControl: "3600",
        upsert: false,
      })

    if (error) {
      throw new Error(error.message)
    }

    const { data } = supabase.storage.from("reward-images").getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleGuardarPremio = async () => {
    setMensaje("")

    if (!name || !clientType || !itemValue || stock === "") {
      setTipoMensaje("warning")
      setMensaje("Completa nombre, tipo de cliente, valor del premio y stock.")
      return
    }

    const valor = Number(itemValue)
    const stockNumero = Number(stock)
    const maxMensualNumero = Number(maxMonthlyPerUser || 0)

    if (valor <= 0) {
      setTipoMensaje("warning")
      setMensaje("El valor del premio debe ser mayor a 0.")
      return
    }

    if (stockNumero < 0) {
      setTipoMensaje("warning")
      setMensaje("El stock no puede ser negativo.")
      return
    }

    if (maxMensualNumero < 0) {
      setTipoMensaje("warning")
      setMensaje("El máximo por usuario al mes no puede ser negativo.")
      return
    }

    try {
      setSubiendo(true)

      const imageUrl = await subirImagen()
      const pointsRequired = Math.ceil(valor / 100)

      if (editingId) {
        const payload: {
          name: string
          client_type: string
          item_value: number
          points_required: number
          stock: number
          max_monthly_per_user: number
          image_url?: string | null
        } = {
          name,
          client_type: clientType,
          item_value: valor,
          points_required: pointsRequired,
          stock: stockNumero,
          max_monthly_per_user: maxMensualNumero,
        }

        if (imageUrl) {
          payload.image_url = imageUrl
        }

        const { error } = await supabase
          .from("rewards")
          .update(payload)
          .eq("id", editingId)

        if (error) {
          setTipoMensaje("error")
          setMensaje("Ocurrió un error al actualizar el premio: " + error.message)
          setSubiendo(false)
          return
        }

        setTipoMensaje("success")
        setMensaje("Premio actualizado correctamente.")
      } else {
        const { error } = await supabase.from("rewards").insert([
          {
            name,
            client_type: clientType,
            item_value: valor,
            points_required: pointsRequired,
            stock: stockNumero,
            max_monthly_per_user: maxMensualNumero,
            is_active: true,
            image_url: imageUrl,
          },
        ])

        if (error) {
          setTipoMensaje("error")
          setMensaje("Ocurrió un error al crear el premio: " + error.message)
          setSubiendo(false)
          return
        }

        setTipoMensaje("success")
        setMensaje("Premio creado correctamente.")
      }

      limpiarFormulario()
      cargarPremios()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido al subir la imagen."
      setTipoMensaje("error")
      setMensaje("No se pudo subir la imagen: " + message)
    } finally {
      setSubiendo(false)
    }
  }

  const handleEditar = (premio: Premio) => {
    setEditingId(premio.id)
    setName(premio.name)
    setClientType(premio.client_type || "")
    setItemValue(String(premio.item_value || ""))
    setStock(String(premio.stock))
    setMaxMonthlyPerUser(String(premio.max_monthly_per_user ?? 0))
    setImageFile(null)
    setCurrentImageUrl(premio.image_url || "")
    setMensaje("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleCambiarEstado = async (premio: Premio) => {
    setMensaje("")

    const { error } = await supabase
      .from("rewards")
      .update({ is_active: !premio.is_active })
      .eq("id", premio.id)

    if (error) {
      setTipoMensaje("error")
      setMensaje("Ocurrió un error al cambiar el estado: " + error.message)
      return
    }

    setTipoMensaje("success")
    setMensaje(premio.is_active ? "Premio desactivado correctamente." : "Premio activado correctamente.")
    cargarPremios()
  }

  const pedirEliminarPremio = (premio: Premio) => {
    setPremioAEliminar(premio)
    setConfirmOpen(true)
  }

  const cerrarModalEliminar = () => {
    if (eliminando) return
    setConfirmOpen(false)
    setPremioAEliminar(null)
  }

  const confirmarEliminarPremio = async () => {
    if (!premioAEliminar) return

    setMensaje("")
    setEliminando(true)

    const { count, error: redencionesError } = await supabase
      .from("redemptions")
      .select("*", { count: "exact", head: true })
      .eq("reward_id", premioAEliminar.id)

    if (redencionesError) {
      setTipoMensaje("error")
      setMensaje("No se pudo validar si el premio ya fue usado.")
      setEliminando(false)
      return
    }

    if ((count || 0) > 0) {
      setTipoMensaje("warning")
      setMensaje("Este premio no se puede eliminar porque ya tiene redenciones asociadas. Mejor desactívalo.")
      setEliminando(false)
      setConfirmOpen(false)
      setPremioAEliminar(null)
      return
    }

    const { error } = await supabase
      .from("rewards")
      .delete()
      .eq("id", premioAEliminar.id)

    if (error) {
      setTipoMensaje("error")
      setMensaje("Ocurrió un error al eliminar el premio: " + error.message)
      setEliminando(false)
      return
    }

    setTipoMensaje("success")
    setMensaje("Premio eliminado correctamente.")

    if (editingId === premioAEliminar.id) {
      limpiarFormulario()
    }

    await cargarPremios()
    setEliminando(false)
    setConfirmOpen(false)
    setPremioAEliminar(null)
  }

  const totalActivos = premios.filter((p) => p.is_active).length
  const totalInactivos = premios.filter((p) => !p.is_active).length
  const totalStock = premios.reduce((acc, p) => acc + Number(p.stock || 0), 0)
  const totalStockCritico = premios.filter((p) => p.is_active && Number(p.stock || 0) >= 1 && Number(p.stock || 0) <= 2).length
  const totalStockBajo = premios.filter((p) => p.is_active && Number(p.stock || 0) >= 3 && Number(p.stock || 0) <= 5).length

  const puntosCalculados = itemValue && Number(itemValue) > 0 ? Math.ceil(Number(itemValue) / 100) : 0

  const obtenerEstadoStock = (stockValue: number) => {
    const stockNumero = Number(stockValue || 0)

    if (stockNumero === 0) return "agotado"
    if (stockNumero >= 1 && stockNumero <= 2) return "critico"
    if (stockNumero >= 3 && stockNumero <= 5) return "bajo"
    return "normal"
  }

  const renderStockBadge = (stockValue: number) => {
    const estado = obtenerEstadoStock(stockValue)

    if (estado === "agotado") {
      return <span style={badgeAgotado}>Agotado</span>
    }

    if (estado === "critico") {
      return <span style={badgeCritico}>Stock crítico</span>
    }

    if (estado === "bajo") {
      return <span style={badgeBajo}>Stock bajo</span>
    }

    return <span style={badgeNormal}>Stock normal</span>
  }

  const renderStockTexto = (stockValue: number) => {
    const estado = obtenerEstadoStock(stockValue)

    if (estado === "agotado") return "Agotado"
    if (estado === "critico") return "Crítico"
    if (estado === "bajo") return "Bajo"
    return "Normal"
  }

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
    <>
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
                <span className="pysta-badge">Gestión de catálogo</span>
                <h1 className="pysta-section-title">Administrar premios</h1>
                <p className="pysta-subtitle">
                  Crea, edita, activa, desactiva o elimina premios del programa de puntos.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button onClick={cargarPremios} className="pysta-btn pysta-btn-light">
                  Refrescar
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
            <ResumenCard titulo="Premios totales" valor={String(premios.length)} descripcion="Catálogo completo" />
            <ResumenCard titulo="Activos" valor={String(totalActivos)} descripcion="Visibles para clientes" />
            <ResumenCard titulo="Inactivos" valor={String(totalInactivos)} descripcion="Ocultos temporalmente" />
            <ResumenCard titulo="Stock total" valor={String(totalStock)} descripcion="Unidades disponibles" />
            <ResumenCard titulo="Stock crítico" valor={String(totalStockCritico)} descripcion="Entre 1 y 2" />
            <ResumenCard titulo="Stock bajo" valor={String(totalStockBajo)} descripcion="Entre 3 y 5" />
          </section>

          <section className="pysta-card" style={{ padding: "24px", marginBottom: "22px" }}>
            <div style={{ display: "grid", gap: "8px", marginBottom: "18px" }}>
              <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>
                {editingId ? "Editar premio" : "Crear nuevo premio"}
              </h2>
              <p style={{ margin: 0, color: "#6b7280" }}>
                Completa la información del premio, sube su imagen y define el tipo de cliente al que aplica.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.1fr) minmax(300px, 0.9fr)",
                gap: "22px",
              }}
            >
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "16px",
                  }}
                >
                  <Field label="Nombre del premio">
                    <input
                      className="pysta-input"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>

                  <Field label="Tipo de cliente">
                    <select
                      className="pysta-select"
                      value={clientType}
                      onChange={(e) => setClientType(e.target.value)}
                    >
                      <option value="">Selecciona tipo de cliente</option>
                      <option value="Mayorista">Mayorista</option>
                      <option value="Distribuidor">Distribuidor</option>
                      <option value="Ambos">Ambos</option>
                    </select>
                  </Field>

                  <Field label="Valor del premio">
                    <input
                      className="pysta-input"
                      type="number"
                      value={itemValue}
                      onChange={(e) => setItemValue(e.target.value)}
                    />
                  </Field>

                  <Field label="Stock disponible">
                    <input
                      className="pysta-input"
                      type="number"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                    />
                  </Field>

                  <Field label="Máximo por usuario al mes">
                    <input
                      className="pysta-input"
                      type="number"
                      value={maxMonthlyPerUser}
                      onChange={(e) => setMaxMonthlyPerUser(e.target.value)}
                    />
                  </Field>
                </div>

                <div style={{ marginTop: "16px" }}>
                  <label style={labelStyle}>Foto del premio</label>
                  <input
                    id="reward-image-input"
                    className="pysta-input"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                  />
                </div>

                <div className="pysta-actions" style={{ marginTop: "18px" }}>
                  <button
                    onClick={handleGuardarPremio}
                    disabled={subiendo}
                    className="pysta-btn pysta-btn-dark"
                    style={{ opacity: subiendo ? 0.7 : 1 }}
                  >
                    {subiendo ? "Subiendo..." : editingId ? "Actualizar premio" : "Guardar premio"}
                  </button>

                  {editingId && (
                    <button onClick={limpiarFormulario} className="pysta-btn pysta-btn-light">
                      Cancelar edición
                    </button>
                  )}
                </div>

                {mensaje && (
                  <div style={{ marginTop: "16px" }}>
                    <AlertMessage text={mensaje} type={tipoMensaje} />
                  </div>
                )}
              </div>

              <div
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "20px",
                  padding: "20px",
                  display: "grid",
                  gap: "16px",
                  alignContent: "start",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "20px", color: "#111" }}>Vista rápida</h3>
                  <p style={{ margin: "8px 0 0 0", color: "#6b7280", lineHeight: 1.5 }}>
                    Verifica la imagen actual y el cálculo del premio.
                  </p>
                </div>

                <div style={{ display: "flex", justifyContent: "center" }}>
                  {currentImageUrl ? (
                    <img
                      src={currentImageUrl}
                      alt="Premio actual"
                      style={{
                        width: "190px",
                        height: "190px",
                        objectFit: "cover",
                        borderRadius: "20px",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 10px 22px rgba(0,0,0,0.06)",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "190px",
                        height: "190px",
                        borderRadius: "20px",
                        border: "1px dashed #d1d5db",
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#6b7280",
                        textAlign: "center",
                        padding: "16px",
                      }}
                    >
                      Sin imagen seleccionada
                    </div>
                  )}
                </div>

                <InfoItem label="Puntos requeridos calculados" value={String(puntosCalculados)} />
                <InfoItem label="Nivel de stock actual" value={renderStockTexto(Number(stock || 0))} />
              </div>
            </div>
          </section>

          <section className="pysta-card" style={{ padding: "0", overflow: "hidden" }}>
            <div
              style={{
                padding: "22px 24px",
                borderBottom: "1px solid #e5e7eb",
                background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Listado de premios</h2>
              <p style={{ margin: "6px 0 0 0", color: "#6b7280" }}>
                Total creados: {premios.length}
              </p>
            </div>

            {cargando ? (
              <div style={{ padding: "24px", color: "#333" }}>Cargando premios...</div>
            ) : premios.length === 0 ? (
              <div style={{ padding: "24px", color: "#333" }}>No hay premios creados.</div>
            ) : (
              <div style={{ padding: "18px" }}>
                <div style={{ display: "grid", gap: "14px" }}>
                  {premios.map((premio) => (
                    <article
                      key={premio.id}
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
                          display: "grid",
                          gridTemplateColumns: "96px 1fr",
                          gap: "18px",
                          alignItems: "start",
                        }}
                      >
                        <div>
                          {premio.image_url ? (
                            <img
                              src={premio.image_url}
                              alt={premio.name}
                              style={{
                                width: "88px",
                                height: "88px",
                                objectFit: "cover",
                                borderRadius: "18px",
                                border: "1px solid #e5e7eb",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "88px",
                                height: "88px",
                                borderRadius: "18px",
                                background: "#f3f4f6",
                                border: "1px solid #e5e7eb",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#6b7280",
                                fontSize: "12px",
                                textAlign: "center",
                                padding: "8px",
                              }}
                            >
                              Sin foto
                            </div>
                          )}
                        </div>

                        <div style={{ display: "grid", gap: "14px" }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "14px",
                              flexWrap: "wrap",
                              alignItems: "flex-start",
                            }}
                          >
                            <div style={{ display: "grid", gap: "6px" }}>
                              <h3 style={{ margin: 0, color: "#111", fontSize: "22px" }}>
                                {premio.name}
                              </h3>

                              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                <span style={miniBadge}>{premio.client_type || "Sin tipo"}</span>

                                <span
                                  style={{
                                    ...miniBadge,
                                    background: premio.is_active ? "#ecfdf3" : "#fef2f2",
                                    color: premio.is_active ? "#166534" : "#991b1b",
                                    border: premio.is_active ? "1px solid #bbf7d0" : "1px solid #fecaca",
                                  }}
                                >
                                  {premio.is_active ? "Activo" : "Inactivo"}
                                </span>

                                {renderStockBadge(Number(premio.stock || 0))}
                              </div>
                            </div>

                            <div className="pysta-actions">
                              <button
                                onClick={() => handleEditar(premio)}
                                className="pysta-btn pysta-btn-gold"
                                style={smallActionBtn}
                              >
                                Editar
                              </button>

                              <button
                                onClick={() => handleCambiarEstado(premio)}
                                className="pysta-btn pysta-btn-light"
                                style={smallActionBtn}
                              >
                                {premio.is_active ? "Desactivar" : "Activar"}
                              </button>

                              <button
                                onClick={() => pedirEliminarPremio(premio)}
                                className="pysta-btn pysta-btn-danger"
                                style={smallActionBtn}
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                              gap: "12px",
                            }}
                          >
                            <InfoItem
                              label="Valor"
                              value={`$${Number(premio.item_value || 0).toLocaleString("es-CO")}`}
                            />
                            <InfoItem label="Puntos requeridos" value={String(premio.points_required)} />
                            <InfoItem label="Stock disponible" value={String(premio.stock)} />
                            <InfoItem
                              label="Máximo por usuario al mes"
                              value={String(premio.max_monthly_per_user ?? 0)}
                            />
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <ConfirmModal
        open={confirmOpen}
        title="Eliminar premio"
        message={
          premioAEliminar
            ? `¿Seguro que deseas eliminar el premio "${premioAEliminar.name}"? Esta acción no se puede deshacer.`
            : ""
        }
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        danger
        loading={eliminando}
        onCancel={cerrarModalEliminar}
        onConfirm={confirmarEliminarPremio}
      />
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
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

const badgeCritico = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold" as const,
  background: "#fef2f2",
  color: "#991b1b",
  border: "1px solid #fecaca",
}

const badgeBajo = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold" as const,
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fed7aa",
}

const badgeAgotado = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold" as const,
  background: "#f3f4f6",
  color: "#4b5563",
  border: "1px solid #d1d5db",
}

const badgeNormal = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold" as const,
  background: "#ecfdf3",
  color: "#166534",
  border: "1px solid #bbf7d0",
}

const smallActionBtn = {
  padding: "10px 14px",
  fontSize: "13px",
}
