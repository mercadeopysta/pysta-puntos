"use client"

type AlertMessageProps = {
  text: string
  type?: "success" | "error" | "warning" | "info"
}

export default function AlertMessage({
  text,
  type = "info",
}: AlertMessageProps) {
  const styles = {
    success: {
      background: "#ecfdf3",
      border: "1px solid #bbf7d0",
      color: "#166534",
      badge: "#166534",
      badgeBg: "#d1fae5",
      label: "Éxito",
    },
    error: {
      background: "#fef2f2",
      border: "1px solid #fecaca",
      color: "#991b1b",
      badge: "#991b1b",
      badgeBg: "#fee2e2",
      label: "Error",
    },
    warning: {
      background: "#fff7ed",
      border: "1px solid #fed7aa",
      color: "#9a3412",
      badge: "#9a3412",
      badgeBg: "#ffedd5",
      label: "Atención",
    },
    info: {
      background: "#eff6ff",
      border: "1px solid #bfdbfe",
      color: "#1d4ed8",
      badge: "#1d4ed8",
      badgeBg: "#dbeafe",
      label: "Información",
    },
  }[type]

  return (
    <div
      style={{
        background: styles.background,
        border: styles.border,
        color: styles.color,
        borderRadius: "16px",
        padding: "14px 16px",
        display: "grid",
        gap: "8px",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          width: "fit-content",
          padding: "6px 10px",
          borderRadius: "999px",
          fontSize: "12px",
          fontWeight: 700,
          color: styles.badge,
          background: styles.badgeBg,
        }}
      >
        {styles.label}
      </span>

      <p style={{ margin: 0, lineHeight: 1.5, fontSize: "14px" }}>{text}</p>
    </div>
  )
}