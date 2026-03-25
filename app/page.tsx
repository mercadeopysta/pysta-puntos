"use client"

export default function HomePage() {
  return (
    <main className="pysta-page">
      <div className="pysta-shell">
        <section
          className="pysta-card"
          style={{
            padding: "34px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-70px",
              right: "-70px",
              width: "220px",
              height: "220px",
              borderRadius: "999px",
              background: "rgba(212, 175, 55, 0.10)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-60px",
              left: "-60px",
              width: "180px",
              height: "180px",
              borderRadius: "999px",
              background: "rgba(17, 17, 17, 0.05)",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 2,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "26px",
              alignItems: "center",
            }}
          >
            <div style={{ display: "grid", gap: "18px" }}>
              <span className="pysta-badge">Programa de fidelización oficial</span>

              <img
                src="/logo-pysta.png"
                alt="Pysta"
                className="pysta-logo"
              />

              <h1 className="pysta-title">Bienvenido a Puntos Pysta</h1>

              <p className="pysta-subtitle">
                Acumula puntos con tus compras, registra tus facturas y redime
                premios exclusivos.
              </p>

              <div className="pysta-actions">
                <a href="/login" className="pysta-btn pysta-btn-dark">
                  Iniciar sesión
                </a>

                <a href="/registro" className="pysta-btn pysta-btn-gold">
                  Registrarme
                </a>

                <a href="/admin/login" className="pysta-btn pysta-btn-light">
                  Ingreso administrador
                </a>
              </div>

              <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
                Gestiona desde una sola plataforma.
              </p>
            </div>

            <div
              className="pysta-panel"
              style={{
                padding: "26px",
                display: "grid",
                gap: "16px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "24px", color: "#111" }}>
                ¿Qué puedes hacer aquí?
              </h2>

              <div className="pysta-grid">
                <div className="pysta-stat-card">
                  <p className="pysta-stat-label">Clientes</p>
                  <p style={{ margin: 0, color: "#111", lineHeight: 1.5 }}>
                    Cada cliente puede registrarse, iniciar sesión y consultar su progreso.
                  </p>
                </div>

                <div className="pysta-stat-card">
                  <p className="pysta-stat-label">Facturas</p>
                  <p style={{ margin: 0, color: "#111", lineHeight: 1.5 }}>
                    Sube compras y conviértelas en puntos para futuras redenciones.
                  </p>
                </div>

                <div className="pysta-stat-card">
                  <p className="pysta-stat-label">Premios</p>
                  <p style={{ margin: 0, color: "#111", lineHeight: 1.5 }}>
                    Consulta premios disponibles.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}