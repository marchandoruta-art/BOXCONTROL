import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Wrench, MapPin, Phone, Building2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function Onboarding() {
  const { user } = useAuth();
  const { organization, loading: orgLoading, refresh } = useOrganization();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
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
      toast.error('Error al crear perfil: ' + profileError.message);
      setLoading(false);
      return;
    }

    await supabase.from('user_roles').insert({ user_id: user.id, organization_id: org.id, role: 'admin' });

    toast.success(`¡${name} está listo para trabajar!`);
    await refresh();
    navigate('/dashboard');
  };

  if (orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-96 border-r border-border/50 bg-card/30 p-10">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Wrench className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight">TallerControl</span>
          </div>

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Paso 1 de 1
            </div>
            <h2 className="text-3xl font-bold leading-tight">
              Crea tu<br />
              <span className="text-primary">espacio de trabajo</span>
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Cada taller tiene su propio espacio aislado. Tus datos, tus vehículos, tu equipo. Nadie más tiene acceso.
            </p>
          </div>

          <ul className="mt-10 space-y-4">
            {[
              { icon: Building2, text: 'Un espacio único para tu taller' },
              { icon: Wrench, text: 'Invita a tus mecánicos después' },
              { icon: MapPin, text: 'Tus datos nunca se mezclan con otros' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="h-7 w-7 rounded-lg bg-card border border-border/60 flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground/50">© 2026 TallerControl</p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Wrench className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold text-lg">TallerControl</span>
        </div>

        <div className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Configura tu taller</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Solo tarda 30 segundos. Puedes cambiar estos datos después.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre del taller *</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Taller García Multimarca"
                  className="bg-card border-border/60 pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="628 086 730"
                  className="bg-card border-border/60 pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Dirección <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle Ejemplo 1, Ciudad"
                  className="bg-card border-border/60 pl-9"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-10 text-base mt-2" disabled={loading || !name.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Crear mi taller
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Después podrás invitar a tu equipo desde Configuración → Equipo
          </p>
        </div>
      </div>
    </div>
  );
}
