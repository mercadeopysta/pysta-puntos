"use client"

export default function AdminLogoutButton() {
  const cerrarSesion = () => {
    localStorage.removeItem("admin_logged_in")
    localStorage.removeItem("admin_nombre")
    localStorage.removeItem("admin_email")
    window.location.href = "/admin/login"
  }

  return (
    <button onClick={cerrarSesion} className="pysta-btn pysta-btn-danger">
      Cerrar sesión admin
    </button>
  )
}