"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
import { validarAccesoAdmin } from "../../../lib/adminSession"
import AdminMenu from "../../../components/AdminMenu"
import AdminLogoutButton from "../../../components/AdminLogoutButton"
import AlertMessage from "../../../components/AlertMessage"

type Asesor = {
  id: string
  name: string
  is_active: boolean
}

export default function AdminAsesoresPage() {
  const router = useRouter()

  const [autorizado, setAutorizado] = useState(false)
  const [asesores, setAsesores] = useState<Asesor[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [tipoMensaje, setTipoMensaje] = useState<"success" | "error" | "warning" | "info">("info")
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    const validar = async () => {
      const ok = await validarAccesoAdmin(router)
      if (ok) {
        setAutorizado(true)
      }
    }

    validar()
  }, [router])

  const cargarAsesores = async () => {
    setCargando(true)
    setMensaje("")

    const { data, error } = await supabase
      .from("advisors")
      .select("id, name, is_active")
      .order("created_at", { ascending: true })

    if (error) {
      setTipoMensaje("error")
      setMensaje("Ocurrió un error al cargar los asesores.")
      setCargando(false)
      return
    }

    setAsesores((data as Asesor[]) || [])
    setCargando(false)
  }

  useEffect(() => {
    if (autorizado) {
      cargarAsesores()
    }
  }, [autorizado])

  const limpiarFormulario = () => {
    setEditingId(null)
    setName("")
  }

  const guardarAsesor = async () => {
    setMensaje("")

    if (!name.trim()) {
      setTipoMensaje("warning")
      setMensaje("Debes escribir el nombre del asesor.")
      return
    }

    setGuardando(true)

    if (editingId) {
      const { error } = await supabase
        .from("advisors")
        .update({ name: name.trim() })
        .eq("id", editingId)

      if (error) {
        setTipoMensaje("error")
        setMensaje("Ocurrió un error al actualizar el asesor: " + error.message)
        setGuardando(false)
        return
      }

      setTipoMensaje("success")
      setMensaje("Asesor actualizado correctamente.")
    } else {
      const { error } = await supabase
        .from("advisors")
        .insert([{ name: name.trim(), is_active: true }])

      if (error) {
        setTipoMensaje("error")
        setMensaje("Ocurrió un error al crear el asesor: " + error.message)
        setGuardando(false)
        return
      }

      setTipoMensaje("success")
      setMensaje("Asesor creado correctamente.")
    }

    limpiarFormulario()
    setGuardando(false)
    cargarAsesores()
  }

  const editarAsesor = (asesor: Asesor) => {
    setEditingId(asesor.id)
    setName(asesor.name || "")
    setMensaje("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const cambiarEstado = async (asesor: Asesor) => {
    setMensaje("")

    const { error } = await supabase
      .from("advisors")
      .update({ is_active: !asesor.is_active })
      .eq("id", asesor.id)

    if (error) {
      setTipoMensaje("error")
      setMensaje("Ocurrió un error al cambiar el estado del asesor: " + error.message)
      return
    }

    setTipoMensaje("success")
    setMensaje(asesor.is_active ? "Asesor desactivado correctamente." : "Asesor activado correctamente.")
    cargarAsesores()
  }

  const totalAsesores = asesores.length
  const totalActivos = asesores.filter((a) => a.is_active).length
  const totalInactivos = asesores.filter((a) => !a.is_active).length

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
      <div className="pysta-shell" style={{ maxWidth: "1280px" }}>
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
              <span className="pysta-badge">Gestión de asesores</span>
              <h1 className="pysta-section-title">Administrar asesores</h1>
              <p className="pysta-subtitle">
                Crea, edita, activa o desactiva los asesores disponibles para asignación.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button onClick={cargarAsesores} className="pysta-btn pysta-btn-light">
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
          <ResumenCard titulo="Asesores totales" valor={String(totalAsesores)} descripcion="Registros creados" />
          <ResumenCard titulo="Activos" valor={String(totalActivos)} descripcion="Disponibles para asignar" />
          <ResumenCard titulo="Inactivos" valor={String(totalInactivos)} descripcion="Ocultos temporalmente" />
        </section>

        <section className="pysta-card" style={{ padding: "24px", marginBottom: "22px" }}>
          <div style={{ display: "grid", gap: "8px", marginBottom: "18px" }}>
            <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>
              {editingId ? "Editar asesor" : "Crear nuevo asesor"}
            </h2>
            <p style={{ margin: 0, color: "#6b7280" }}>
              Registra el nombre del asesor o actualiza uno existente.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              gap: "16px",
              maxWidth: "520px",
            }}
          >
            <div>
              <label style={labelStyle}>Nombre del asesor</label>
              <input
                className="pysta-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="pysta-actions" style={{ marginTop: "18px" }}>
            <button
              onClick={guardarAsesor}
              className="pysta-btn pysta-btn-dark"
              disabled={guardando}
              style={{ opacity: guardando ? 0.7 : 1 }}
            >
              {guardando ? "Guardando..." : editingId ? "Actualizar asesor" : "Guardar asesor"}
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
        </section>

        <section className="pysta-card" style={{ padding: "0", overflow: "hidden" }}>
          <div
            style={{
              padding: "22px 24px",
              borderBottom: "1px solid #e5e7eb",
              background: "linear-gradient(180deg, #ffffff 0%, #fafafa 100%)",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>Listado de asesores</h2>
            <p style={{ margin: "6px 0 0 0", color: "#6b7280" }}>
              Total creados: {asesores.length}
            </p>
          </div>

          {cargando ? (
            <div style={{ padding: "24px", color: "#333" }}>Cargando asesores...</div>
          ) : asesores.length === 0 ? (
            <div style={{ padding: "24px", color: "#333" }}>No hay asesores creados.</div>
          ) : (
            <div style={{ padding: "18px" }}>
              <div style={{ display: "grid", gap: "14px" }}>
                {asesores.map((asesor) => (
                  <article
                    key={asesor.id}
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
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ display: "grid", gap: "8px" }}>
                        <h3 style={{ margin: 0, color: "#111", fontSize: "22px" }}>
                          {asesor.name}
                        </h3>

                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <span
                            style={{
                              ...miniBadge,
                              background: asesor.is_active ? "#ecfdf3" : "#f3f4f6",
                              color: asesor.is_active ? "#166534" : "#4b5563",
                              border: asesor.is_active ? "1px solid #bbf7d0" : "1px solid #d1d5db",
                            }}
                          >
                            {asesor.is_active ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                      </div>

                      <div className="pysta-actions">
                        <button
                          onClick={() => editarAsesor(asesor)}
                          className="pysta-btn pysta-btn-gold"
                          style={smallActionBtn}
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => cambiarEstado(asesor)}
                          className="pysta-btn pysta-btn-light"
                          style={smallActionBtn}
                        >
                          {asesor.is_active ? "Desactivar" : "Activar"}
                        </button>
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

const smallActionBtn = {
  padding: "10px 14px",
  fontSize: "13px",
}