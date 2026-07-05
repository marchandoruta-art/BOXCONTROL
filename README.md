# BoxControl

App de gestión operativa para talleres mecánicos multimarca. Multi-tenant, sin facturación — flujo de vehículos (recepción → reparación → **control de calidad / prueba en carretera** → entrega), fichaje de personal, cronómetro de trabajo por vehículo, fotos del vehículo, piezas pendientes, portal de seguimiento para el cliente, gestión de equipo con invitaciones, analítica de productividad y **suscripción de pago con Stripe** (mensual y anual).

100% independiente: sin Lovable, sin dependencias privadas. Stack estándar: React + Vite + TypeScript + Tailwind + Supabase.

## 1. Crear el proyecto en Supabase

1. [supabase.com](https://supabase.com) → **New Project** (plan gratuito).
2. **SQL Editor** → pega y ejecuta, en este orden:
   - `supabase/migrations/20260705000000_initial_schema.sql`
   - `supabase/migrations/20260705010000_parts.sql`
   - `supabase/migrations/20260705020000_storage_and_invites.sql`
3. **Project Settings → API** → copia `Project URL` y `anon public key`.

## 2. Variables de entorno del frontend

Copia `.env.example` a `.env`:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## 3. Desarrollo local

```bash
npm install
npm run dev
```

Abre `http://localhost:8080`.

## 4. Configurar Stripe (cobro de la suscripción)

1. En [dashboard.stripe.com](https://dashboard.stripe.com) crea un **Producto** con dos precios recurrentes:
   - Mensual: ej. 29€/mes → anota `price_xxx_monthly`
   - Anual: ej. 249€/año → anota `price_xxx_annual`

2. Despliega las Edge Functions incluidas:
   ```bash
   supabase functions deploy create-checkout-session
   supabase functions deploy stripe-webhook --no-verify-jwt
   supabase functions deploy stripe-portal
   supabase functions deploy accept-invitation
   ```

3. Configura los secretos:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
   supabase secrets set STRIPE_PRICE_ID_MONTHLY=price_...
   supabase secrets set STRIPE_PRICE_ID_ANNUAL=price_...
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   supabase secrets set APP_URL=https://tu-dominio.com
   ```

4. En Stripe Dashboard → **Developers → Webhooks** → añade endpoint:
   `https://tu-proyecto.supabase.co/functions/v1/stripe-webhook` → escucha `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.

5. Activa el **Customer Portal** en Stripe Dashboard → Billing → Customer portal.

## 5. Desplegar el frontend

- **Vercel**: importa el repo de GitHub → Framework: Vite → añade las 2 variables de entorno → Deploy.
- **Netlify**: Build command `npm run build`, Publish directory `dist`.

## 6. Rutas de la app

| Ruta | Descripción |
|------|-------------|
| `/` | Landing page pública con pricing |
| `/login` | Login / registro |
| `/onboarding` | Crear el taller (primer acceso) |
| `/dashboard` | Kanban de vehículos + historial de entregados |
| `/vehicles/:id` | Detalle del vehículo (fotos, cronómetro, piezas, QC) |
| `/analytics` | Analítica de productividad |
| `/team` | Gestión del equipo + invitaciones |
| `/settings` | Configuración del taller + suscripción |
| `/portal/:token` | Portal público del cliente (sin login) |
| `/invite/:token` | Aceptar invitación de equipo |

## 7. Qué incluye esta versión

- Autenticación + multi-tenant real con RLS.
- Landing page pública con pricing mensual/anual.
- Kanban con tabs "En taller" / "Entregados" + buscador.
- Control de Calidad como fase nativa e infranqueable sin checklist + prueba de carretera.
- Historial automático de estados.
- **Fotos del vehículo** con lightbox (Supabase Storage).
- Portal público del cliente vía token.
- **Fichaje de entrada/salida de personal** (`attendance_logs`).
- **Cronómetro de trabajo efectivo por vehículo** (`time_logs`).
- **Gestión de piezas pendientes** (pendiente → pedido → recibido).
- **Gestión de equipo**: invitaciones por enlace, roles (mecánico, chapista, oficina, admin).
- **Analítica**: vehículos terminados, horas por mecánico, distribución por estado.
- **Settings**: nombre del taller, logo, gestión de suscripción vía Stripe Portal.
- **Banner de suscripción** con días de prueba restantes y botón de pago.
- **Edge Functions de Stripe**: checkout (mensual/anual) + webhook + customer portal.
- AppShell con nav responsive (desktop + móvil).
