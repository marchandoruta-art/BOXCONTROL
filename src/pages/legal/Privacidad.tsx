import { LegalLayout, Section } from './LegalLayout';

export default function Privacidad() {
  return (
    <LegalLayout title="Política de Privacidad">
      <Section title="1. Responsable del tratamiento">
        <p>
          En cumplimiento del Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD),
          te informamos que el responsable del tratamiento de tus datos personales es:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Razón social:</strong> Israel Maria Garcia Redondo</li>
          <li><strong>NIF:</strong> 46951836G</li>
          <li><strong>Domicilio:</strong> Calle Isidor Macabich, 32, Puerta 6 — 07860 Formentera (Illes Balears), España</li>
          <li><strong>Teléfono:</strong> 628 086 730</li>
          <li><strong>Email de contacto:</strong> marchandoruta@gmail.com</li>
        </ul>
      </Section>

      <Section title="2. Datos que recopilamos">
        <p>Tratamos los siguientes datos personales:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Datos de registro:</strong> nombre, dirección de email y contraseña (cifrada) para crear y acceder a tu cuenta.</li>
          <li><strong>Datos del taller:</strong> nombre del taller, logo, información de los vehículos, clientes y trabajos que introduces tú mismo en la plataforma.</li>
          <li><strong>Datos de facturación:</strong> gestionados íntegramente por Stripe. No almacenamos datos de tarjeta de crédito.</li>
          <li><strong>Datos de uso:</strong> logs de acceso, dirección IP y datos técnicos para garantizar la seguridad del servicio.</li>
        </ul>
      </Section>

      <Section title="3. Finalidad y base jurídica del tratamiento">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Prestación del servicio (art. 6.1.b RGPD):</strong> gestionar tu cuenta, ofrecerte las funcionalidades de TallerControl y procesar el pago de la suscripción.</li>
          <li><strong>Obligaciones legales (art. 6.1.c RGPD):</strong> cumplimiento de obligaciones contables, fiscales y de facturación.</li>
          <li><strong>Interés legítimo (art. 6.1.f RGPD):</strong> seguridad de la plataforma, prevención de fraudes y mejora del servicio.</li>
          <li><strong>Consentimiento (art. 6.1.a RGPD):</strong> envío de comunicaciones comerciales sobre nuevas funcionalidades, si lo has aceptado.</li>
        </ul>
      </Section>

      <Section title="4. Plazo de conservación">
        <p>
          Conservamos tus datos mientras mantengas tu cuenta activa. Tras la cancelación, los datos
          se eliminan en un plazo máximo de <strong>90 días</strong>, salvo que la ley exija conservarlos
          más tiempo (p. ej., datos de facturación: 5 años según legislación fiscal española).
        </p>
      </Section>

      <Section title="5. Destinatarios y transferencias internacionales">
        <p>Tus datos pueden ser compartidos con los siguientes proveedores bajo contratos de encargo de tratamiento:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Supabase Inc.</strong> (infraestructura de base de datos y autenticación) — servidores en la UE (Frankfurt).</li>
          <li><strong>Stripe Inc.</strong> (procesamiento de pagos) — transferencia internacional cubierta por cláusulas contractuales tipo de la UE.</li>
          <li><strong>Vercel Inc.</strong> (alojamiento del frontend) — transferencia internacional cubierta por cláusulas contractuales tipo.</li>
        </ul>
        <p>No vendemos ni cedemos tus datos a terceros para fines publicitarios.</p>
      </Section>

      <Section title="6. Tus derechos">
        <p>
          Puedes ejercer en cualquier momento tus derechos de <strong>acceso, rectificación, supresión,
          limitación, portabilidad y oposición</strong> escribiendo a marchandoruta@gmail.com con el
          asunto "Derechos RGPD" e indicando tu nombre y email de cuenta.
        </p>
        <p>
          Si consideras que el tratamiento de tus datos no es correcto, puedes presentar una reclamación
          ante la <strong>Agencia Española de Protección de Datos</strong> (www.aepd.es).
        </p>
      </Section>

      <Section title="7. Seguridad">
        <p>
          Aplicamos medidas técnicas y organizativas para proteger tus datos: cifrado TLS en tránsito,
          cifrado en reposo en la base de datos, autenticación segura, y control de acceso por roles (RLS).
          Los datos de cada taller son estrictamente aislados de los demás mediante políticas de seguridad a nivel de fila.
        </p>
      </Section>

      <Section title="8. Cambios en esta política">
        <p>
          Podemos actualizar esta política. Te notificaremos por email con al menos 15 días de antelación
          ante cambios sustanciales. El uso continuado del servicio tras ese plazo implica la aceptación.
        </p>
      </Section>
    </LegalLayout>
  );
}
