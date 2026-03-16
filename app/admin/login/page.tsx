"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../../lib/supabase"

type AdminUser = {
  id: string
  email: string
  password: string
  created_at: string
}

export default function AdminLoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [cargando, setCargando] = useState(false)

  const handleLogin = async () => {
    setMensaje("")

    if (!email || !password) {
      setMensaje("Completa correo y contraseña.")
      return
    }

    setCargando(true)

    const { data, error } = await supabase
      .from("admin_users")
      .select("id, email, password, created_at")
      .eq("email", email.trim())
      .eq("password", password)
      .maybeSingle()

    if (error) {
      setMensaje("Ocurrió un error al iniciar sesión como admin.")
      setCargando(false)
      return
    }

    const admin = data as AdminUser | null

    if (!admin) {
      setMensaje("Credenciales de administrador incorrectas.")
      setCargando(false)
      return
    }

    localStorage.setItem("admin_logged_in", "true")
    localStorage.setItem("admin_email", admin.email || "")
    localStorage.setItem("admin_nombre", admin.email || "Administrador")

    router.push("/admin/clientes")
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8f8f8 0%, #efefef 100%)",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: "520px",
          width: "100%",
          margin: "0 auto",
          backgroundColor: "white",
          padding: "32px",
          borderRadius: "18px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          border: "1px solid #eee",
        }}
      >
        <div style={{ marginBottom: "18px" }}>
          <a
            href="/"
            style={{
              color: "#111",
              textDecoration: "none",
              fontWeight: "bold",
              fontSize: "14px",
            }}
          >
            ← Volver al inicio
          </a>
        </div>

        <img
          src="/logo-pysta.png"
          alt="Pysta"
          style={{
            width: "160px",
            height: "auto",
            display: "block",
            margin: "0 auto 20px auto",
          }}
        />

        <h1 style={{ fontSize: "32px", marginBottom: "10px", color: "#111", textAlign: "center" }}>
          Login administrador
        </h1>

        <p style={{ fontSize: "16px", marginBottom: "30px", color: "#555", textAlign: "center" }}>
          Ingresa las credenciales de administrador para acceder al panel.
        </p>

        <div style={{ display: "grid", gap: "16px" }}>
          <input
            className="campo-pysta"
            type="email"
            placeholder="Correo administrador"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="campo-pysta"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleLogin}
            disabled={cargando}
            style={{
              backgroundColor: "#111",
              color: "white",
              border: "none",
              padding: "14px 24px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "bold",
              opacity: cargando ? 0.7 : 1,
            }}
          >
            {cargando ? "Ingresando..." : "Entrar como admin"}
          </button>

          {mensaje && (
            <p style={{ color: "#111", fontSize: "15px", marginTop: "6px", textAlign: "center" }}>
              {mensaje}
            </p>
          )}
        </div>
      </div>

      <style>{`
        .campo-pysta {
          width: 100%;
          padding: 14px;
          border-radius: 10px;
          border: 1px solid #ccc;
          font-size: 16px;
          color: #111;
          background: #fff;
          box-sizing: border-box;
        }

        .campo-pysta::placeholder {
          color: #666;
        }
      `}</style>
    </main>
  )
}