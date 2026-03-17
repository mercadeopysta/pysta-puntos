import { Suspense } from "react"
import NuevaFacturaClient from "./NuevaFacturaClient"

export default function Page() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Arial, sans-serif",
            background: "#f5f5f5",
            padding: "20px",
          }}
        >
          Cargando formulario...
        </main>
      }
    >
      <NuevaFacturaClient />
    </Suspense>
  )
}