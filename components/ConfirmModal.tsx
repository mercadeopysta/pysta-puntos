"use client"

type ConfirmModalProps = {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17, 17, 17, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: 9999,
      }}
    >
      <div
        className="pysta-card"
        style={{
          width: "100%",
          maxWidth: "520px",
          padding: "24px",
          borderRadius: "22px",
        }}
      >
        <div style={{ display: "grid", gap: "10px" }}>
          <span className="pysta-badge">
            {danger ? "Acción delicada" : "Confirmación"}
          </span>

          <h3 style={{ margin: 0, fontSize: "24px", color: "#111" }}>{title}</h3>

          <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.6 }}>
            {message}
          </p>
        </div>

        <div
          className="pysta-actions"
          style={{ marginTop: "22px", justifyContent: "flex-end" }}
        >
          <button
            onClick={onCancel}
            disabled={loading}
            className="pysta-btn pysta-btn-light"
            style={{
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className={`pysta-btn ${danger ? "pysta-btn-danger" : "pysta-btn-dark"}`}
            style={{
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Procesando..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}