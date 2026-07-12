-- Añadir los nuevos valores al enum plan_tier
ALTER TYPE public.plan_tier ADD VALUE IF NOT EXISTS 'basico';
ALTER TYPE public.plan_tier ADD VALUE IF NOT EXISTS 'profesional';
