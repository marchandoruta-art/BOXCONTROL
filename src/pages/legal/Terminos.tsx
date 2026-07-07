import { LegalLayout, Section } from './LegalLayout';

export default function Terminos() {
  return (
    <LegalLayout title="Términos y Condiciones de Servicio">
      <Section title="1. Partes del contrato">
        <p>
          Estos Términos regulan el acceso y uso de <strong>TallerControl</strong>, servicio de software
          como servicio (SaaS) para la gestión de talleres mecánicos, ofrecido por{' '}
          <strong>Israel Maria Garcia Redondo</strong> (NIF: 46951836G), con domicilio en Calle Isidor Macabich, 32, Puerta 6, 07860 Formentera, España (en adelante, "el Proveedor"), con email de contacto
          marchandoruta@gmail.com.
        </p>
        <p>
          Al crear una cuenta o usar el servicio, aceptas estos Términos en su totalidad. Si actúas en
          nombre de una empresa, declaras tener autoridad para vincularla contractualmente.
        </p>
      </Section>

      <Section title="2. Descripción del servicio">
        <p>TallerControl es una aplicación web que permite a talleres mecánicos:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Gestionar vehículos mediante un tablero kanban por estados.</li>
          <li>Organizar citas y agenda de clientes.</li>
          <li>Controlar el trabajo de mecánicos mediante cronómetros y fichaje.</li>
          <li>Realizar inspecciones de calidad antes de entregar vehículos.</li>
          <li>Gestionar piezas, fotos y documentación por vehículo.</li>
          <li>Analizar la productividad del taller.</li>
        </ul>
        <p>
          El servicio <strong>no incluye funcionalidad de facturación electrónica</strong>. No genera
          facturas legales ni se conecta con sistemas de contabilidad.
        </p>
      </Section>

      <Section title="3. Registro y cuenta">
        <p>
          Para usar el servicio debes crear una cuenta con un email válido y una contraseña segura.
          Eres responsable de mantener la confidencialidad de tus credenciales y de todas las
          actividades realizadas desde tu cuenta. Notifícanos inmediatamente ante cualquier uso no
          autorizado.
        </p>
        <p>
          Debes tener al menos 18 años o la mayoría de edad legal en tu país para crear una cuenta.
        </p>
      </Section>

      <Section title="4. Planes y precios">
        <p>TallerControl ofrece:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Período de prueba gratuita:</strong> 14 días sin necesidad de tarjeta de crédito. Al finalizar, el servicio queda limitado hasta que actives una suscripción.</li>
          <li><strong>Plan mensual:</strong> 29 € + IVA al mes, renovación automática.</li>
          <li><strong>Plan anual:</strong> 249 € + IVA al año, renovación automática. Equivale a un ahorro del 28% respecto al plan mensual.</li>
        </ul>
        <p>
          Los precios pueden modificarse con un preaviso mínimo de 30 días por email. El cambio
          aplicará en el siguiente período de facturación.
        </p>
      </Section>

      <Section title="5. Pago y facturación">
        <p>
          Los pagos son procesados por <strong>Stripe</strong>. Al suscribirte autorizas los cargos
          recurrentes según el plan elegido. En caso de impago, el acceso quedará suspendido y
          posteriormente cancelado según la política de Stripe.
        </p>
        <p>
          Emitiremos factura electrónica por cada cargo. Para ello necesitamos que tus datos fiscales
          estén correctamente cumplimentados en el portal de Stripe.
        </p>
      </Section>

      <Section title="6. Derecho de desistimiento y cancelación">
        <p>
          <strong>Usuarios consumidores (B2C):</strong> dispones de 14 días naturales desde la
          contratación para desistir sin coste, salvo que hayas hecho uso efectivo del servicio durante
          ese período (art. 103.a) TRLGDCU).
        </p>
        <p>
          <strong>Cancelación general:</strong> puedes cancelar tu suscripción en cualquier momento
          desde Configuración → Gestionar suscripción. El acceso se mantiene activo hasta el final
          del período pagado. No se realizan reembolsos prorrateados salvo error imputable al Proveedor.
        </p>
      </Section>

      <Section title="7. Propiedad de los datos">
        <p>
          <strong>Tus datos son tuyos.</strong> Todos los datos que introduces en TallerControl
          (clientes, vehículos, trabajos, fotos) son de tu propiedad. El Proveedor actúa como
          encargado del tratamiento y no accede a ellos salvo para prestar el servicio o cuando
          la ley lo exija.
        </p>
        <p>
          Puedes exportar o eliminar tus datos en cualquier momento contactando a marchandoruta@gmail.com.
          Tras la cancelación, los datos se conservan 90 días antes de ser eliminados definitivamente.
        </p>
      </Section>

      <Section title="8. Uso aceptable">
        <p>Está prohibido usar TallerControl para:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Actividades ilegales o fraudulentas.</li>
          <li>Introducir datos de terceros sin su consentimiento.</li>
          <li>Intentar acceder a datos de otros talleres.</li>
          <li>Realizar ingeniería inversa, scraping masivo o sobrecargar los servidores.</li>
          <li>Revender o sublicenciar el acceso al servicio.</li>
        </ul>
        <p>El incumplimiento puede resultar en la suspensión inmediata de la cuenta.</p>
      </Section>

      <Section title="9. Disponibilidad y nivel de servicio">
        <p>
          El Proveedor se compromete a mantener una disponibilidad del servicio del <strong>99%</strong>{' '}
          mensual (excluidos mantenimientos programados notificados con 24h de antelación). No garantizamos
          disponibilidad ininterrumpida ante causas de fuerza mayor o fallos de terceros proveedores
          (Supabase, Vercel).
        </p>
      </Section>

      <Section title="10. Limitación de responsabilidad">
        <p>
          El servicio se presta "tal cual". El Proveedor no será responsable por pérdidas de negocio,
          lucro cesante o daños indirectos derivados del uso o imposibilidad de uso del servicio.
          La responsabilidad máxima total del Proveedor se limita al importe pagado por el usuario en
          los 3 meses anteriores al evento que origina la reclamación.
        </p>
      </Section>

      <Section title="11. Ley aplicable y jurisdicción">
        <p>
          Estos Términos se rigen por la legislación española. Para cualquier controversia, las partes
          se someten a los juzgados y tribunales del domicilio del usuario (si es consumidor) o de
          Formentera (si es empresa).
        </p>
      </Section>

      <Section title="12. Contacto">
        <p>
          Para cualquier consulta sobre estos Términos: <strong>marchandoruta@gmail.com</strong>
        </p>
      </Section>
    </LegalLayout>
  );
}
