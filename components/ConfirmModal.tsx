"use client"

type ConfirmModalProps = {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  loading?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  danger = false,
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17,17,17,0.56)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "#fff",
          borderRadius: "24px",
          padding: "28px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "grid", gap: "10px", marginBottom: "22px" }}>
          <span
            style={{
              display: "inline-flex",
              width: "fit-content",
              padding: "6px 10px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: 700,
              background: danger ? "#fef2f2" : "#eff6ff",
              color: danger ? "#991b1b" : "#1d4ed8",
              border: danger ? "1px solid #fecaca" : "1px solid #bfdbfe",
            }}
          >
            {danger ? "Acción delicada" : "Confirmación"}
          </span>

          <h3
            style={{
              margin: 0,
              fontSize: "28px",
              color: "#111",
              lineHeight: 1.1,
            }}
          >
            {title}
          </h3>

          <p
            style={{
              margin: 0,
              color: "#6b7280",
              lineHeight: 1.6,
              fontSize: "15px",
            }}
          >
            {message}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              background: "#e9e9e9",
              color: "#111",
              border: "none",
              padding: "13px 18px",
              borderRadius: "14px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              background: danger
                ? "linear-gradient(135deg, #991b1b 0%, #b91c1c 100%)"
                : "linear-gradient(135deg, #111111 0%, #1f1f1f 100%)",
              color: "#fff",
              border: "none",
              padding: "13px 18px",
              borderRadius: "14px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: "14px",
              opacity: loading ? 0.75 : 1,
            }}
          >
            {loading ? "Procesando..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}