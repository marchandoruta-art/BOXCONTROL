import { LegalLayout, Section } from './LegalLayout';

export default function Cookies() {
  return (
    <LegalLayout title="Política de Cookies">
      <Section title="1. ¿Qué son las cookies?">
        <p>
          Las cookies son pequeños archivos de texto que los sitios web depositan en tu dispositivo
          cuando los visitas. Permiten que el sitio recuerde tus preferencias y funcione correctamente.
        </p>
      </Section>

      <Section title="2. Cookies que utilizamos">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-border/40 rounded-lg overflow-hidden">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Nombre</th>
                <th className="text-left px-3 py-2 font-semibold">Proveedor</th>
                <th className="text-left px-3 py-2 font-semibold">Finalidad</th>
                <th className="text-left px-3 py-2 font-semibold">Duración</th>
                <th className="text-left px-3 py-2 font-semibold">Tipo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {[
                ['sb-*', 'Supabase', 'Sesión de autenticación (mantener la sesión iniciada)', 'Sesión / 1 año', 'Técnica esencial'],
                ['__stripe_mid', 'Stripe', 'Prevención de fraude en pagos', '1 año', 'Técnica esencial'],
                ['__stripe_sid', 'Stripe', 'Sesión de pago seguro', '30 min', 'Técnica esencial'],
                ['vite-*', 'TallerControl', 'Preferencias de la interfaz (tema, vista kanban)', 'Local', 'Técnica esencial'],
              ].map(([name, provider, purpose, duration, type]) => (
                <tr key={name} className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-mono">{name}</td>
                  <td className="px-3 py-2">{provider}</td>
                  <td className="px-3 py-2">{purpose}</td>
                  <td className="px-3 py-2">{duration}</td>
                  <td className="px-3 py-2 text-primary">{type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3">
          TallerControl <strong>no utiliza cookies de seguimiento, publicidad ni analítica de terceros</strong>.
          Todas las cookies son estrictamente necesarias para el funcionamiento del servicio.
        </p>
      </Section>

      <Section title="3. Cookies técnicas esenciales">
        <p>
          Las cookies técnicas son necesarias para que el servicio funcione. No requieren tu
          consentimiento previo según el art. 22.2 de la LSSI-CE, ya que son imprescindibles para
          la prestación del servicio solicitado.
        </p>
      </Section>

      <Section title="4. Cómo gestionar las cookies">
        <p>
          Puedes configurar tu navegador para bloquear o eliminar cookies. Ten en cuenta que si
          bloqueas las cookies técnicas, el servicio puede no funcionar correctamente (no podrás
          mantener tu sesión iniciada).
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Chrome:</strong> Configuración → Privacidad y seguridad → Cookies</li>
          <li><strong>Firefox:</strong> Opciones → Privacidad y seguridad → Cookies</li>
          <li><strong>Safari:</strong> Preferencias → Privacidad → Gestionar datos</li>
          <li><strong>Edge:</strong> Configuración → Privacidad, búsqueda y servicios → Cookies</li>
        </ul>
      </Section>

      <Section title="5. Actualizaciones">
        <p>
          Podemos actualizar esta política si añadimos nuevas funcionalidades que requieran cookies
          adicionales. Te notificaremos con antelación si usamos cookies que requieran consentimiento.
        </p>
        <p>
          Contacto para dudas sobre cookies: <strong>marchandoruta@gmail.com</strong>
        </p>
      </Section>
    </LegalLayout>
  );
}
