-- Función exclusiva del propietario de la plataforma
-- Solo ejecutable si el usuario autenticado es marchandoruta@gmail.com
CREATE OR REPLACE FUNCTION public.platform_admin_get_orgs()
RETURNS TABLE (
  id                  uuid,
  name                text,
  slug                text,
  plan                text,
  subscription_status text,
  trial_ends_at       timestamptz,
  subscription_ends_at timestamptz,
  deleted_at          timestamptz,
  created_at          timestamptz,
  owner_email         text,
  owner_name          text,
  member_count        bigint,
  vehicle_count       bigint
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo el propietario de la plataforma puede ejecutar esto
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != 'marchandoruta@gmail.com' THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.slug,
    o.plan::text,
    o.subscription_status::text,
    o.trial_ends_at,
    o.subscription_ends_at,
    o.deleted_at,
    o.created_at,
    u.email::text          AS owner_email,
    p.full_name::text      AS owner_name,
    COUNT(DISTINCT m.id)   AS member_count,
    COUNT(DISTINCT v.id)   AS vehicle_count
  FROM organizations o
  LEFT JOIN auth.users u ON u.id = o.owner_id
  LEFT JOIN profiles   p ON p.id = o.owner_id
  LEFT JOIN profiles   m ON m.organization_id = o.id
  LEFT JOIN vehicles   v ON v.organization_id = o.id
  GROUP BY o.id, u.email, p.full_name
  ORDER BY o.created_at DESC;
END;
$$;
