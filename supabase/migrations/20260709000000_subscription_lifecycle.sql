-- Fecha fin de suscripción pagada (Stripe la actualiza vía webhook)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;

-- Soft delete para talleres eliminados (los datos se conservan 90 días)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Los talleres eliminados no deben ser accesibles
-- El RLS existente filtra por organization_id del perfil,
-- pero añadimos esta función para que la app pueda verificar el estado.
CREATE OR REPLACE FUNCTION public.org_is_accessible(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = org_id
      AND deleted_at IS NULL
      AND (
        subscription_status = 'active'
        OR (subscription_status = 'trialing' AND trial_ends_at > now())
      )
  );
$$;
