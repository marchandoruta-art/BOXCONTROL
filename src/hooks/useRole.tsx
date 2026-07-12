import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOrganization } from './useOrganization';
import { type UserRole, ROLE_PERMISSIONS } from '@/lib/types';

export function useRole() {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !organizationId) {
      setRole(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .maybeSingle();

    setRole((data?.role as UserRole) ?? null);
    setLoading(false);
  }, [user, organizationId]);

  useEffect(() => { load(); }, [load]);

  const permissions = role ? ROLE_PERMISSIONS[role] : null;

  const can = (permission: keyof typeof ROLE_PERMISSIONS[UserRole]) => {
    return permissions?.[permission] ?? false;
  };

  return { role, loading, can, permissions };
}
