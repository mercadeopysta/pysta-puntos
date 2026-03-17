"use client"

type AlertType = "success" | "error" | "warning" | "info"

export default function AlertMessage({
  text,
  type = "info",
}: {
  text: string
  type?: AlertType
}) {
  const styles = getStyles(type)

  return (
    <div
      style={{
        background: styles.background,
        color: styles.color,
        border: styles.border,
        borderRadius: "18px",
        padding: "16px 18px",
        boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <div
          style={{
            minWidth: "34px",
            height: "34px",
            borderRadius: "999px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.55)",
            fontWeight: 800,
            fontSize: "14px",
          }}
        >
          {styles.icon}
        </div>

        <div style={{ display: "grid", gap: "4px" }}>
          <p
            style={{
              margin: 0,
              fontWeight: 800,
              fontSize: "14px",
            }}
          >
            {styles.title}
          </p>

          <p
            style={{
              margin: 0,
              lineHeight: 1.55,
              fontSize: "14px",
            }}
          >
            {text}
          </p>
        </div>
      </div>
    </div>
  )
}

function getStyles(type: AlertType) {
  if (type === "success") {
    return {
      background: "#ecfdf3",
      color: "#166534",
      border: "1px solid #bbf7d0",
      title: "Correcto",
      icon: "✓",
    }
  }

  if (type === "error") {
    return {
      background: "#fef2f2",
      color: "#991b1b",
      border: "1px solid #fecaca",
      title: "Ocurrió un problema",
      icon: "!",
    }
  }

  if (type === "warning") {
    return {
      background: "#fff7ed",
      color: "#9a3412",
      border: "1px solid #fed7aa",
      title: "Atención",
      icon: "!",
    }
  }

  return {
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    title: "Información",
    icon: "i",
  }
}