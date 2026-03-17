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
        background: "linear-gradient(180deg, #f5f5f5 0%, #ececec 100%)",
        padding: "32px 20px",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "980px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "22px",
          alignItems: "stretch",
        }}
      >
        <section
          style={{
            background: "linear-gradient(135deg, #111111 0%, #1f1f1f 100%)",
            color: "white",
            borderRadius: "28px",
            padding: "38px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "520px",
          }}
        >
          <div>
            <div
              style={{
                width: "110px",
                height: "110px",
                borderRadius: "24px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                marginBottom: "24px",
              }}
            >
              <img
                src="/logo-pysta.png"
                alt="Pysta"
                style={{
                  maxWidth: "96px",
                  maxHeight: "96px",
                  objectFit: "contain",
                }}
              />
            </div>

            <span
              style={{
                display: "inline-flex",
                padding: "7px 12px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 700,
                background: "rgba(212, 175, 55, 0.16)",
                color: "#f0d77a",
                border: "1px solid rgba(212, 175, 55, 0.24)",
                marginBottom: "18px",
              }}
            >
              Panel administrativo Pysta
            </span>

            <h1
              style={{
                margin: 0,
                fontSize: "42px",
                lineHeight: 1.08,
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              Preparando
              <br />
              acceso admin
            </h1>

            <p
              style={{
                marginTop: "18px",
                color: "rgba(255,255,255,0.78)",
                fontSize: "16px",
                lineHeight: 1.6,
                maxWidth: "520px",
              }}
            >
              Estamos validando tu acceso para dirigirte al módulo administrativo correspondiente.
            </p>
          </div>

          <div style={{ display: "grid", gap: "12px", marginTop: "28px" }}>
            <InfoMini texto="Clientes, premios, facturas y redenciones" />
            <InfoMini texto="Configuración central del programa de puntos" />
            <InfoMini texto="Acceso rápido al entorno administrativo" />
          </div>
        </section>

        <section
          style={{
            background: "#ffffff",
            borderRadius: "28px",
            padding: "38px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.10)",
            minHeight: "520px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            border: "1px solid rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ marginBottom: "24px" }}>
            <span
              style={{
                display: "inline-flex",
                padding: "7px 12px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 700,
                background: "rgba(212, 175, 55, 0.14)",
                color: "#7a5b00",
                border: "1px solid rgba(212, 175, 55, 0.24)",
                marginBottom: "16px",
              }}
            >
              Validación en curso
            </span>

            <h2
              style={{
                margin: 0,
                fontSize: "34px",
                color: "#111",
                lineHeight: 1.1,
              }}
            >
              Redirigiendo...
            </h2>

            <p
              style={{
                margin: "12px 0 0 0",
                color: "#6b7280",
                lineHeight: 1.6,
                fontSize: "15px",
              }}
            >
              En unos segundos te llevaremos al login administrativo o directamente al panel si tu sesión ya está activa.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: "16px",
            }}
          >
            <div
              style={{
                height: "14px",
                width: "100%",
                borderRadius: "999px",
                background: "#ececec",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: "42%",
                  height: "100%",
                  borderRadius: "999px",
                  background: "linear-gradient(90deg, #111 0%, #d4af37 100%)",
                }}
              />
            </div>

            <div
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "18px",
                padding: "18px",
                color: "#111",
                fontSize: "15px",
                lineHeight: 1.6,
              }}
            >
              Verificando sesión administrativa y preparando entorno.
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function InfoMini({ texto }: { texto: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: "16px",
        padding: "14px 16px",
        color: "rgba(255,255,255,0.88)",
        fontSize: "14px",
        lineHeight: 1.5,
      }}
    >
      {texto}
    </div>
  )
}