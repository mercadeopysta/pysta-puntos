"use client"

import { useEffect, useState } from "react"

type InfoPopupProps = {
  storageKey: string
  title: string
  message: string
}

export default function InfoPopup({
  storageKey,
  title,
  message,
}: InfoPopupProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const wasClosed = localStorage.getItem(storageKey)
    if (wasClosed !== "closed") {
      setOpen(true)
    }
  }, [storageKey])

  const cerrar = () => {
    localStorage.setItem(storageKey, "closed")
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17,17,17,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "18px",
        zIndex: 9999,
      }}
      onClick={cerrar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "#fff",
          borderRadius: "24px",
          padding: "26px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          border: "1px solid rgba(0,0,0,0.05)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            padding: "6px 10px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: 700,
            background: "rgba(212, 175, 55, 0.14)",
            color: "#7a5b00",
            border: "1px solid rgba(212, 175, 55, 0.24)",
            marginBottom: "14px",
          }}
        >
          Información importante
        </span>

        <h3 style={{ margin: 0, fontSize: "28px", color: "#111", lineHeight: 1.1 }}>
          {title}
        </h3>

        <p style={{ margin: "12px 0 0 0", color: "#6b7280", lineHeight: 1.6 }}>
          {message}
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
          <button
            onClick={cerrar}
            style={{
              background: "#111",
              color: "#fff",
              border: "none",
              padding: "13px 18px",
              borderRadius: "14px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}