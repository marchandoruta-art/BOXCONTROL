import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function Onboarding() {
  const { user } = useAuth();
  const { organization, loading: orgLoading, refresh } = useOrganization();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orgLoading && organization) {
      navigate('/dashboard');
    }
  }, [orgLoading, organization, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const slug = `${slugify(name)}-${user.id.slice(0, 6)}`;

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name, slug, owner_id: user.id })
      .select()
      .single();

    if (orgError || !org) {
      toast.error('No se pudo crear el taller: ' + (orgError?.message ?? ''));
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      organization_id: org.id,
      full_name: user.user_metadata?.full_name ?? user.email,
      email: user.email,
    });

    if (profileError) {
      toast.error('Taller creado, pero hubo un error al crear tu perfil: ' + profileError.message);
      setLoading(false);
      return;
    }

    await supabase.from('user_roles').insert({ user_id: user.id, organization_id: org.id, role: 'admin' });

    toast.success(`${name} está listo`);
    await refresh();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Configura tu taller</CardTitle>
          <p className="text-sm text-muted-foreground">Esto crea tu espacio aislado en BoxControl.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre del taller</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Taller García Multimarca" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !name}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear taller'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
