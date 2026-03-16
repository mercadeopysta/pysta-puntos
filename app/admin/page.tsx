"use client"

import { useEffect } from "react"

export default function AdminPage() {
  useEffect(() => {
    const adminLogueado = localStorage.getItem("admin_logged_in")

    if (adminLogueado === "true") {
      window.location.href = "/admin/clientes"
    } else {
      window.location.href = "/admin/login"
    }
  }, [])

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f5f5f5",
      }}
    >
      Redirigiendo...
    </main>
  )
}