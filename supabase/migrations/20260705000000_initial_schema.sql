-- =========================================================
-- BOXCONTROL — Esquema inicial
-- Multi-tenant desde el diseño, con control de calidad como
-- fase nativa del flujo (no un añadido posterior).
-- =========================================================

-- Extensión necesaria para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- ENUMS ----------
CREATE TYPE public.user_role AS ENUM ('mecanico', 'chapista', 'oficina', 'admin');

CREATE TYPE public.vehicle_priority AS ENUM ('baja', 'normal', 'alta', 'urgente');

CREATE TYPE public.vehicle_status AS ENUM (
  'recibido',
  'presupuestar',
  'presupuestado',
  'en_reparacion',
  'pendiente_piezas',
  'control_calidad',
  'terminado',
  'entregado'
);

CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled');
CREATE TYPE public.plan_tier AS ENUM ('trial', 'starter', 'pro');

-- ---------- FUNCIONES AUXILIARES ----------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------- ORGANIZATIONS (multi-tenant) ----------
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  plan public.plan_tier NOT NULL DEFAULT 'trial',
  subscription_status public.subscription_status NOT NULL DEFAULT 'trialing',
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- PROFILES + ROLES ----------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  UNIQUE (user_id, organization_id)
);

-- Función auxiliar: organización del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Función auxiliar: comprobar rol del usuario
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.user_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- ---------- OWNERS (clientes del taller) ----------
CREATE TABLE public.owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  dni text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- VEHICLES ----------
CREATE TABLE public.vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  plate text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  year int,
  color text,
  status public.vehicle_status NOT NULL DEFAULT 'recibido',
  priority public.vehicle_priority NOT NULL DEFAULT 'normal',
  client_description text,
  work_summary text,
  assigned_to uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicles_org ON public.vehicles(organization_id);
CREATE INDEX idx_vehicles_status ON public.vehicles(organization_id, status);

CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- HISTORIAL DE ESTADOS (automático) ----------
CREATE TABLE public.vehicle_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status public.vehicle_status NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.log_vehicle_status_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.vehicle_status_history (vehicle_id, organization_id, status, changed_by)
    VALUES (NEW.id, NEW.organization_id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_vehicle_status
  AFTER INSERT OR UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.log_vehicle_status_change();

-- ---------- CONTROL DE CALIDAD / PRUEBA EN CARRETERA ----------
-- Fase nativa del flujo, no un módulo añadido.
CREATE TABLE public.vehicle_quality_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  road_test_completed boolean NOT NULL DEFAULT false,
  road_test_notes text,
  road_test_km numeric,
  passed boolean,
  checked_by uuid REFERENCES auth.users(id),
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quality_checks_vehicle ON public.vehicle_quality_checks(vehicle_id);

CREATE TRIGGER trg_quality_checks_updated_at
  BEFORE UPDATE ON public.vehicle_quality_checks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- TIEMPO DE TRABAJO POR VEHÍCULO ----------
CREATE TABLE public.time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  total_minutes int,
  notes text
);

-- ---------- FICHAJE GENERAL DE PERSONAL ----------
CREATE TABLE public.attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  total_minutes int,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- CITAS PRÓXIMAS ----------
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES public.owners(id),
  vehicle_description text,
  scheduled_at timestamptz NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- PORTAL PÚBLICO DEL CLIENTE ----------
CREATE TABLE public.client_portal_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_tokens ENABLE ROW LEVEL SECURITY;

-- Organizations: solo el propietario ve/edita su organización
CREATE POLICY "Owner can view own organization" ON public.organizations
  FOR SELECT TO authenticated USING (owner_id = auth.uid() OR id = public.get_user_organization_id());
CREATE POLICY "Owner can update own organization" ON public.organizations
  FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Authenticated users can create an organization" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR organization_id = public.get_user_organization_id());
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- User roles
CREATE POLICY "Org members can view roles" ON public.user_roles
  FOR SELECT TO authenticated USING (organization_id = public.get_user_organization_id());
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (
    organization_id = public.get_user_organization_id()
    AND public.has_role(auth.uid(), 'admin')
  );

-- Patrón repetido para el resto de tablas del taller: aislar por organization_id
CREATE POLICY "Org members can view owners" ON public.owners
  FOR SELECT TO authenticated USING (organization_id = public.get_user_organization_id());
CREATE POLICY "Org members can manage owners" ON public.owners
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "Org members can update owners" ON public.owners
  FOR UPDATE TO authenticated USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org members can view vehicles" ON public.vehicles
  FOR SELECT TO authenticated USING (organization_id = public.get_user_organization_id());
CREATE POLICY "Org members can insert vehicles" ON public.vehicles
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "Org members can update vehicles" ON public.vehicles
  FOR UPDATE TO authenticated USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org members can view status history" ON public.vehicle_status_history
  FOR SELECT TO authenticated USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org members can view quality checks" ON public.vehicle_quality_checks
  FOR SELECT TO authenticated USING (organization_id = public.get_user_organization_id());
CREATE POLICY "Org members can insert quality checks" ON public.vehicle_quality_checks
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_user_organization_id());
CREATE POLICY "Org members can update quality checks" ON public.vehicle_quality_checks
  FOR UPDATE TO authenticated USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org members can view time logs" ON public.time_logs
  FOR SELECT TO authenticated USING (organization_id = public.get_user_organization_id());
CREATE POLICY "Users can insert own time logs" ON public.time_logs
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_user_organization_id() AND user_id = auth.uid());
CREATE POLICY "Users can update own time logs" ON public.time_logs
  FOR UPDATE TO authenticated USING (organization_id = public.get_user_organization_id() AND user_id = auth.uid());

CREATE POLICY "Org members can view attendance" ON public.attendance_logs
  FOR SELECT TO authenticated USING (organization_id = public.get_user_organization_id());
CREATE POLICY "Users can insert own attendance" ON public.attendance_logs
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_user_organization_id() AND user_id = auth.uid());
CREATE POLICY "Users can update own attendance" ON public.attendance_logs
  FOR UPDATE TO authenticated USING (organization_id = public.get_user_organization_id() AND user_id = auth.uid());

CREATE POLICY "Org members can view appointments" ON public.appointments
  FOR SELECT TO authenticated USING (organization_id = public.get_user_organization_id());
CREATE POLICY "Org members can manage appointments" ON public.appointments
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Org members can view portal tokens" ON public.client_portal_tokens
  FOR SELECT TO authenticated USING (organization_id = public.get_user_organization_id());
CREATE POLICY "Org members can create portal tokens" ON public.client_portal_tokens
  FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_user_organization_id());

-- Acceso público de solo lectura al portal del cliente vía token (sin autenticación)
CREATE POLICY "Public can read vehicle via valid token" ON public.vehicles
  FOR SELECT TO anon USING (
    EXISTS (
      SELECT 1 FROM public.client_portal_tokens t
      WHERE t.vehicle_id = vehicles.id AND t.revoked = false AND t.expires_at > now()
    )
  );
CREATE POLICY "Public can validate token" ON public.client_portal_tokens
  FOR SELECT TO anon USING (revoked = false AND expires_at > now());
