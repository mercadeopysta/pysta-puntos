"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"
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

  useEffect(() => {
    const adminLogueado = localStorage.getItem("admin_logged_in")

    if (adminLogueado !== "true") {
      router.push("/admin/login")
      return
    }

    setAutorizado(true)
  }, [router])

  const cargarAsesores = async () => {
    setCargando(true)

    const { data, error } = await supabase
      .from("advisors")
      .select("id, name, is_active")
      .order("name", { ascending: true })

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

  const handleGuardarAsesor = async () => {
    setMensaje("")

    if (!name.trim()) {
      setTipoMensaje("warning")
      setMensaje("Escribe el nombre del asesor.")
      return
    }

    if (editingId) {
      const { error } = await supabase
        .from("advisors")
        .update({ name: name.trim() })
        .eq("id", editingId)

      if (error) {
        setTipoMensaje("error")
        setMensaje("Ocurrió un error al actualizar el asesor: " + error.message)
        return
      }

      setTipoMensaje("success")
      setMensaje("Asesor actualizado correctamente.")
    } else {
      const { error } = await supabase.from("advisors").insert([
        {
          name: name.trim(),
          is_active: true,
        },
      ])

      if (error) {
        setTipoMensaje("error")
        setMensaje("Ocurrió un error al crear el asesor: " + error.message)
        return
      }

      setTipoMensaje("success")
      setMensaje("Asesor creado correctamente.")
    }

    limpiarFormulario()
    cargarAsesores()
  }

  const handleEditar = (asesor: Asesor) => {
    setEditingId(asesor.id)
    setName(asesor.name)
    setMensaje("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleCambiarEstado = async (asesor: Asesor) => {
    setMensaje("")

    const { error } = await supabase
      .from("advisors")
      .update({ is_active: !asesor.is_active })
      .eq("id", asesor.id)

    if (error) {
      setTipoMensaje("error")
      setMensaje("Ocurrió un error al cambiar el estado: " + error.message)
      return
    }

    setTipoMensaje("success")
    setMensaje(
      asesor.is_active
        ? "Asesor desactivado correctamente."
        : "Asesor activado correctamente."
    )

    cargarAsesores()
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
    <main className="pysta-page">
      <div className="pysta-shell" style={{ maxWidth: "1100px" }}>
        <AdminMenu />

        <section className="pysta-card" style={{ padding: "28px", marginBottom: "22px" }}>
          <div className="pysta-topbar">
            <div style={{ display: "grid", gap: "8px" }}>
              <span className="pysta-badge">Gestión comercial</span>
              <h1 className="pysta-section-title">Administrar asesores</h1>
              <p className="pysta-subtitle">
                Crea, edita y activa o desactiva los asesores disponibles para asignar clientes.
              </p>
            </div>

            <AdminLogoutButton />
          </div>
        </section>

        <section className="pysta-card" style={{ padding: "24px", marginBottom: "22px" }}>
          <div style={{ display: "grid", gap: "8px", marginBottom: "18px" }}>
            <h2 style={{ margin: 0, fontSize: "22px", color: "#111" }}>
              {editingId ? "Editar asesor" : "Crear nuevo asesor"}
            </h2>
            <p style={{ margin: 0, color: "#6b7280" }}>
              Registra nuevos asesores o corrige la información de uno existente.
            </p>
          </div>

          <div style={{ display: "grid", gap: "16px" }}>
            <input
              className="pysta-input"
              type="text"
              placeholder="Nombre del asesor"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div className="pysta-actions">
              <button
                onClick={handleGuardarAsesor}
                className="pysta-btn pysta-btn-dark"
              >
                {editingId ? "Actualizar asesor" : "Guardar asesor"}
              </button>

              {editingId && (
                <button
                  onClick={limpiarFormulario}
                  className="pysta-btn pysta-btn-light"
                >
                  Cancelar edición
                </button>
              )}
            </div>

            {mensaje && (
              <div style={{ marginTop: "4px" }}>
                <AlertMessage text={mensaje} type={tipoMensaje} />
              </div>
            )}
          </div>
        </section>

        <section className="pysta-card" style={{ padding: "0", overflow: "hidden" }}>
          <div
            style={{
              padding: "20px 24px",
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
                      borderRadius: "18px",
                      padding: "18px",
                      boxShadow: "0 8px 22px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "14px",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "grid", gap: "6px" }}>
                        <h3 style={{ margin: 0, color: "#111", fontSize: "20px" }}>
                          {asesor.name}
                        </h3>

                        <span
                          style={{
                            ...miniBadge,
                            background: asesor.is_active ? "#ecfdf3" : "#fef2f2",
                            color: asesor.is_active ? "#166534" : "#991b1b",
                            border: asesor.is_active
                              ? "1px solid #bbf7d0"
                              : "1px solid #fecaca",
                          }}
                        >
                          {asesor.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </div>

                      <div className="pysta-actions">
                        <button
                          onClick={() => handleEditar(asesor)}
                          className="pysta-btn pysta-btn-gold"
                          style={smallActionBtn}
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => handleCambiarEstado(asesor)}
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

const miniBadge = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold" as const,
}

const smallActionBtn = {
  padding: "10px 14px",
  fontSize: "13px",
}
