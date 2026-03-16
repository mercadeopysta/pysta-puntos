"use client"

export default function LogoutButton() {
  const cerrarSesion = () => {
    localStorage.removeItem("cliente_nombre")
    localStorage.removeItem("cliente_email")
    localStorage.removeItem("cliente_documento")
    localStorage.removeItem("cliente_tipo")
    window.location.href = "/"
  }

  return (
    <button onClick={cerrarSesion} className="pysta-btn pysta-btn-danger">
      Cerrar sesión
    </button>
  )
}