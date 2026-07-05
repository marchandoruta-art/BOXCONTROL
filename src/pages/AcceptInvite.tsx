import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_LABELS, type UserRole } from '@/lib/types';

interface InvitationInfo {
  email: string;
  role: UserRole;
  organization_name: string;
}

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invInfo, setInvInfo] = useState<InvitationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInvitation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Si el usuario ya está logueado, aceptar directamente
  useEffect(() => {
    if (user && invInfo && token) {
      acceptInvitation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, invInfo]);

  const loadInvitation = async () => {
    setLoadingInfo(true);
    const { data, error: err } = await supabase
      .from('team_invitations')
      .select('email, role, organizations(name)')
      .eq('token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (err || !data) {
      setError('Esta invitación no es válida o ha caducado.');
      setLoadingInfo(false);
      return;
    }

    setInvInfo({
      email: data.email,
      role: data.role as UserRole,
      organization_name: (data as any).organizations?.name ?? '',
    });
    setEmail(data.email);
    setLoadingInfo(false);
  };

  const acceptInvitation = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data, error: fnError } = await supabase.functions.invoke('accept-invitation', {
      body: { token },
    });
    if (fnError || !data?.ok) {
      toast.error('Error al unirte al taller');
      return;
    }
    toast.success(`Te has unido a ${invInfo?.organization_name ?? 'el taller'}`);
    navigate('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let authError: string | null = null;
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      authError = error?.message ?? null;
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      authError = error?.message ?? null;
    }

    if (authError) {
      toast.error(authError);
      setSubmitting(false);
      return;
    }

    // acceptInvitation se llama vía useEffect cuando user cambia
    setSubmitting(false);
  };

  if (loadingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-8 pb-6">
            <p className="text-muted-foreground">{error}</p>
            <Button className="mt-4" onClick={() => navigate('/')}>
              Ir al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-10 w-10 rounded-full bg-status-quality/15 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-status-quality" />
          </div>
          <CardTitle className="text-lg">
            Únete a{' '}
            <span className="text-status-quality">{invInfo?.organization_name}</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Has sido invitado como{' '}
            <span className="font-medium">{ROLE_LABELS[invInfo?.role ?? 'mecanico']}</span>
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label>Nombre completo</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contraseña</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {mode === 'signup' ? 'Crear cuenta y unirme' : 'Entrar y unirme'}
            </Button>
          </form>
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground mt-4 w-full text-center"
            onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
          >
            {mode === 'signup'
              ? '¿Ya tienes cuenta? Inicia sesión'
              : '¿No tienes cuenta? Crea una'}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
