import { Suspense } from "react"
import NuevaFacturaClient from "./client"

export default function NuevaFacturaPage() {
  return (
    <Suspense fallback={<div style={{ padding: "20px" }}>Cargando...</div>}>
      <NuevaFacturaClient />
    </Suspense>
  )
}