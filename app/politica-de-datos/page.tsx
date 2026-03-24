import Link from "next/link"

export default function PoliticaDeDatosPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #fff8e7 0%, #f8f5ee 45%, #f3f4f6 100%)",
        padding: "28px",
      }}
    >
      <div
        style={{
          maxWidth: "980px",
          margin: "0 auto",
          background: "rgba(255,255,255,0.96)",
          borderRadius: "28px",
          padding: "36px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <img
          src="/logo-pysta.png"
          alt="Pysta"
          style={{ width: "160px", height: "auto", marginBottom: "18px" }}
        />

        <div
          style={{
            display: "inline-flex",
            padding: "8px 14px",
            borderRadius: "999px",
            background: "#fff8e7",
            color: "#7a5b00",
            fontWeight: 800,
            fontSize: "12px",
            border: "1px solid #f3d37a",
            marginBottom: "18px",
          }}
        >
          Política de tratamiento de datos personales
        </div>

        <h1
          style={{
            fontSize: "38px",
            lineHeight: 1.1,
            margin: "0 0 12px",
            color: "#111",
            fontWeight: 900,
            letterSpacing: "-0.03em",
          }}
        >
          Política de Tratamiento de Datos Personales
        </h1>

        <p style={p}>
          Esta política regula la recolección, almacenamiento, uso,
          circulación, actualización, supresión y demás tratamientos de datos
          personales realizados a través de la plataforma Puntos Pysta y demás
          canales habilitados por la compañía.
        </p>

        <Section title="1. Responsable del tratamiento">
          <p style={p}>
            El responsable del tratamiento de los datos personales es{" "}
            <strong>[PYSTA SAS]</strong>, identificada con NIT{"900989305"}
            <strong>[NIT]</strong>, con domicilio en <strong>[CALI]</strong>,
            correo electrónico <strong>[MERCADEO@PYSTA.CO]</strong> y teléfono{"311 6825832"}
            <strong>[TELÉFONO]</strong>.
          </p>
        </Section>

        <Section title="2. Datos que podemos recolectar">
          <p style={p}>
            Podemos recolectar, entre otros, los siguientes datos: nombre
            completo, tipo y número de documento, correo electrónico, teléfono,
            tipo de cliente, asesor asociado, credenciales de acceso e
            información relacionada con el uso del programa de puntos, redención
            de beneficios, facturas, solicitudes de material POP y actividad
            dentro de la plataforma.
          </p>
        </Section>

        <Section title="3. Finalidades del tratamiento">
          <ul style={ul}>
            <li>Crear y administrar cuentas de usuario.</li>
            <li>Validar identidad y aprobar accesos.</li>
            <li>Gestionar el programa de puntos y beneficios.</li>
            <li>Procesar facturas, solicitudes, redenciones y material POP.</li>
            <li>Enviar comunicaciones operativas, administrativas y de servicio.</li>
            <li>Atender peticiones, consultas, reclamos y solicitudes.</li>
            <li>Mejorar la seguridad, trazabilidad y funcionamiento de la plataforma.</li>
            <li>Cumplir obligaciones legales y contractuales aplicables.</li>
          </ul>
        </Section>

        <Section title="4. Autorización del titular">
          <p style={p}>
            El tratamiento de los datos personales se realizará con autorización
            previa, expresa e informada del titular, salvo las excepciones
            legales aplicables. La autorización podrá obtenerse por medios
            físicos, electrónicos, digitales o por cualquier mecanismo que
            permita su consulta posterior.
          </p>
        </Section>

        <Section title="5. Derechos del titular">
          <ul style={ul}>
            <li>Conocer, actualizar y rectificar sus datos personales.</li>
            <li>Solicitar prueba de la autorización otorgada.</li>
            <li>Ser informado sobre el uso dado a sus datos.</li>
            <li>
              Presentar consultas y reclamos relacionados con el tratamiento de
              sus datos.
            </li>
            <li>
              Solicitar la supresión de sus datos o la revocatoria de la
              autorización cuando proceda legalmente.
            </li>
            <li>
              Acceder en forma gratuita a sus datos personales que hayan sido
              objeto de tratamiento.
            </li>
          </ul>
        </Section>

        <Section title="6. Consultas y reclamos">
          <p style={p}>
            Los titulares podrán radicar sus consultas o reclamos a través de{" "}
            <strong>[CORREO DE PRIVACIDAD O PQRS]</strong> o en los canales
            oficiales que disponga la empresa. La solicitud deberá incluir como
            mínimo la identificación del titular, los datos de contacto, la
            descripción clara de la consulta o reclamo y los soportes que
            resulten pertinentes.
          </p>
        </Section>

        <Section title="7. Seguridad de la información">
          <p style={p}>
            La empresa adopta medidas razonables de seguridad administrativas,
            técnicas y organizacionales para proteger los datos personales
            contra acceso no autorizado, pérdida, uso indebido, alteración,
            divulgación o destrucción no autorizada. No obstante, ningún sistema
            es absolutamente infalible.
          </p>
        </Section>

        <Section title="8. Transferencia y transmisión">
          <p style={p}>
            En caso de ser necesario, los datos podrán ser compartidos con
            encargados, proveedores tecnológicos o aliados estratégicos que
            apoyen la operación de la plataforma, siempre bajo deberes de
            confidencialidad, seguridad y cumplimiento legal aplicable.
          </p>
        </Section>

        <Section title="9. Vigencia y conservación">
          <p style={p}>
            Los datos personales serán conservados durante el tiempo necesario
            para cumplir las finalidades informadas, las obligaciones legales,
            contractuales y la atención de eventuales responsabilidades.
          </p>
        </Section>

        <Section title="10. Cambios a esta política">
          <p style={p}>
            La presente política podrá ser modificada en cualquier momento. Los
            cambios sustanciales serán informados por los canales que la empresa
            considere adecuados, incluyendo la publicación en esta misma página.
          </p>
        </Section>

        <Section title="11. Fecha de entrada en vigencia">
          <p style={p}>
            Esta política entra en vigencia a partir del{" "}
            <strong>[FECHA DE ENTRADA EN VIGENCIA]</strong>.
          </p>
        </Section>

        <div
          style={{
            marginTop: "28px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <Link href="/registro" style={buttonPrimary}>
            Volver al registro
          </Link>
          <Link href="/" style={buttonSecondary}>
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section style={{ marginTop: "26px" }}>
      <h2
        style={{
          margin: "0 0 10px",
          fontSize: "22px",
          color: "#111",
          fontWeight: 800,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

const p = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: 1.8,
  margin: 0,
}

const ul = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: 1.8,
  paddingLeft: "22px",
  margin: 0,
}

const buttonPrimary = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  background: "#111",
  color: "#fff",
  borderRadius: "14px",
  padding: "12px 18px",
  fontWeight: 800,
}

const buttonSecondary = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  background: "#fff",
  color: "#111",
  borderRadius: "14px",
  padding: "12px 18px",
  fontWeight: 800,
  border: "1px solid #d1d5db",
}