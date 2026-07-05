import { LegalLayout, Section } from './LegalLayout';

export default function AvisoLegal() {
  return (
    <LegalLayout title="Aviso Legal">
      <Section title="1. Datos identificativos del titular">
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la
          Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa de los datos
          del titular de este sitio web:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Titular:</strong> [TU NOMBRE COMPLETO O RAZÓN SOCIAL] — <em className="text-primary">⚠ Rellena este dato</em></li>
          <li><strong>NIF / CIF:</strong> [TU NIF O CIF] — <em className="text-primary">⚠ Rellena este dato</em></li>
          <li><strong>Domicilio social:</strong> [TU DIRECCIÓN COMPLETA, CIUDAD, CP, ESPAÑA] — <em className="text-primary">⚠ Rellena este dato</em></li>
          <li><strong>Email de contacto:</strong> marchandoruta@gmail.com</li>
          <li><strong>Actividad:</strong> Desarrollo y comercialización de software de gestión para talleres mecánicos (SaaS).</li>
        </ul>
      </Section>

      <Section title="2. Objeto y ámbito de aplicación">
        <p>
          El presente Aviso Legal regula el acceso y uso del sitio web y la aplicación web
          <strong> TallerControl</strong>, así como los contenidos y servicios disponibles a través
          de los mismos. El acceso implica la aceptación plena de estas condiciones.
        </p>
      </Section>

      <Section title="3. Propiedad intelectual e industrial">
        <p>
          Todos los contenidos del sitio web (textos, imágenes, diseño, código fuente, marca y
          logotipos) son propiedad del titular o de sus licenciantes, y están protegidos por las
          leyes de propiedad intelectual e industrial vigentes en España y la Unión Europea.
        </p>
        <p>
          Queda expresamente prohibida la reproducción, distribución, comunicación pública o
          transformación de estos contenidos sin autorización escrita previa del titular.
        </p>
      </Section>

      <Section title="4. Exclusión de garantías y responsabilidad">
        <p>
          El titular no garantiza la disponibilidad continua ni la ausencia de errores en el servicio.
          No será responsable de los daños que pudieran derivarse de interrupciones del servicio,
          virus informáticos o fallos de terceros proveedores.
        </p>
        <p>
          El usuario es el único responsable de los datos que introduce en la plataforma y de su
          licitud, especialmente los datos personales de sus clientes.
        </p>
      </Section>

      <Section title="5. Obligaciones del usuario como responsable de datos">
        <p>
          Al usar TallerControl, el usuario introduce datos personales de sus propios clientes
          (nombre, teléfono, etc.). En este contexto:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>El <strong>usuario actúa como Responsable del Tratamiento</strong> de los datos de sus clientes.</li>
          <li>TallerControl actúa como <strong>Encargado del Tratamiento</strong> (art. 28 RGPD).</li>
          <li>El usuario debe informar a sus clientes del tratamiento de sus datos y tener una base jurídica legítima para ello.</li>
          <li>El usuario no debe introducir datos sensibles (salud, religión, etc.) salvo que disponga de consentimiento explícito.</li>
        </ul>
        <p>
          La relación entre el usuario y TallerControl como encargado queda regulada en los{' '}
          <a href="/legal/terminos" className="text-primary hover:underline">Términos y Condiciones</a> y la{' '}
          <a href="/legal/privacidad" className="text-primary hover:underline">Política de Privacidad</a>.
        </p>
      </Section>

      <Section title="6. Legislación aplicable y jurisdicción competente">
        <p>
          Este Aviso Legal se rige por la legislación española, en particular:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Ley 34/2002 (LSSI-CE) — Servicios de la Sociedad de la Información.</li>
          <li>Reglamento (UE) 2016/679 (RGPD) — Protección de Datos.</li>
          <li>Ley Orgánica 3/2018 (LOPDGDD) — Protección de Datos nacional.</li>
          <li>Real Decreto Legislativo 1/2007 (TRLGDCU) — Consumidores y usuarios.</li>
        </ul>
        <p>
          Para la resolución de controversias, las partes se someten a la jurisdicción de los
          juzgados y tribunales españoles competentes.
        </p>
      </Section>

      <Section title="7. Resolución de litigios en línea">
        <p>
          Conforme al Reglamento (UE) 524/2013, los consumidores de la UE pueden acceder a la
          plataforma de resolución de litigios en línea de la Comisión Europea en:{' '}
          <span className="font-mono text-xs">https://ec.europa.eu/consumers/odr</span>
        </p>
      </Section>
    </LegalLayout>
  );
}
