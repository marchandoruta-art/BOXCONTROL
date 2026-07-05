-- =========================================================
-- BOXCONTROL — Fotos de vehículos, logos, invitaciones de equipo
-- =========================================================

-- ---------- STORAGE BUCKETS ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-photos', 'vehicle-photos', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('org-logos', 'org-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies para vehicle-photos (privado, solo miembros de la org)
CREATE POLICY "Org members can upload vehicle photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-photos'
  AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
);

CREATE POLICY "Org members can view vehicle photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'vehicle-photos'
  AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
);

CREATE POLICY "Org members can delete vehicle photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'vehicle-photos'
  AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
);

-- Policies para org-logos (público para que el portal del cliente pueda mostrarlos)
CREATE POLICY "Org members can upload logo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'org-logos'
  AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
);

CREATE POLICY "Anyone can view logos"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'org-logos');

CREATE POLICY "Org members can delete logo"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'org-logos'
  AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
);

-- ---------- VEHICLE PHOTOS ----------
CREATE TABLE public.vehicle_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicle_photos_vehicle ON public.vehicle_photos(vehicle_id);

ALTER TABLE public.vehicle_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view photos" ON public.vehicle_photos
  FOR SELECT TO authenticated USING (organization_id = public.get_user_organization_id());
CREATE POLICY "Org members can insert photos" ON public.vehicle_photos
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "Org members can delete photos" ON public.vehicle_photos
  FOR DELETE TO authenticated USING (organization_id = public.get_user_organization_id());

-- ---------- TEAM INVITATIONS ----------
CREATE TABLE public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.user_role NOT NULL DEFAULT 'mecanico',
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invited_by uuid REFERENCES auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view invitations" ON public.team_invitations
  FOR SELECT TO authenticated USING (organization_id = public.get_user_organization_id());
CREATE POLICY "Org admins can create invitations" ON public.team_invitations
  FOR INSERT TO authenticated WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Org admins can update invitations" ON public.team_invitations
  FOR UPDATE TO authenticated USING (organization_id = public.get_user_organization_id());

-- Permite que cualquiera (incluso anon) lea una invitación válida por token
-- para mostrar la pantalla de aceptar invitación antes de registrarse
CREATE POLICY "Public can read valid invitations" ON public.team_invitations
  FOR SELECT TO anon USING (expires_at > now() AND accepted_at IS NULL);
