import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Clock, LogIn, LogOut as ClockOut } from 'lucide-react';
import { toast } from 'sonner';

export function AttendanceButton() {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkOpenLog = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('attendance_logs')
      .select('id')
      .eq('user_id', user.id)
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .limit(1)
      .maybeSingle();
    setActiveLogId(data?.id ?? null);
  }, [user]);

  useEffect(() => {
    checkOpenLog();
  }, [checkOpenLog]);

  const handleToggle = async () => {
    if (!user || !organizationId) return;
    setLoading(true);

    if (activeLogId) {
      const { data: log } = await supabase.from('attendance_logs').select('clock_in').eq('id', activeLogId).single();
      const minutes = log ? Math.round((Date.now() - new Date(log.clock_in).getTime()) / 60000) : null;
      await supabase.from('attendance_logs').update({ clock_out: new Date().toISOString(), total_minutes: minutes }).eq('id', activeLogId);
      toast.success('Fichaje de salida registrado');
      setActiveLogId(null);
    } else {
      await supabase.from('attendance_logs').insert({ user_id: user.id, organization_id: organizationId });
      toast.success('Fichaje de entrada registrado');
      await checkOpenLog();
    }
    setLoading(false);
  };

  return (
    <Button
      variant={activeLogId ? 'default' : 'outline'}
      size="sm"
      className="gap-1.5"
      onClick={handleToggle}
      disabled={loading}
    >
      {activeLogId ? <ClockOut className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
      <Clock className="h-3.5 w-3.5" />
      {activeLogId ? 'Fichar salida' : 'Fichar entrada'}
    </Button>
  );
}
