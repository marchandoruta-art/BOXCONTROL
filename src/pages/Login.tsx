import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Wrench, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp(email, password, fullName);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(
        mode === 'signin'
          ? 'Sesión iniciada'
          : 'Cuenta creada. Revisa tu email si se requiere confirmación.'
      );
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex flex-col justify-between w-96 border-r border-border/50 bg-card/30 p-10">
        <div>
          <div className="flex items-center gap-2 mb-12">
            <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Wrench className="h-4.5 w-4.5 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight">TallerControl</span>
          </div>

          <div className="space-y-6">
            <h2 className="text-3xl font-bold leading-tight">
              El taller organizado,<br />
              <span className="text-primary">el equipo alineado</span>
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Kanban de vehículos, agenda de citas, control de calidad y analítica de productividad.
              Todo en un panel diseñado para mecánicos reales.
            </p>
          </div>

          {/* Feature list */}
          <ul className="mt-8 space-y-3">
            {[
              'Kanban por estados + drag & drop',
              'Agenda de citas semanal',
              'Control QC obligatorio',
              'Historial por matrícula',
              'Cronómetro por mecánico',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground/50">© 2026 TallerControl</p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="h-8 w-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Wrench className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold text-lg">TallerControl</span>
        </div>

        <div className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-2xl font-bold">
              {mode === 'signin' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'signin'
                ? 'Accede a tu taller'
                : '14 días de prueba gratuita · Sin tarjeta'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nombre completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Carlos García"
                  className="bg-card border-border/60"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="carlos@mitaller.com"
                className="bg-card border-border/60"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                {mode === 'signin' && (
                  <Link
                    to="/forgot-password"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                )}
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="bg-card border-border/60"
              />
            </div>
            <Button type="submit" className="w-full h-10 text-base" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === 'signin' ? (
                'Entrar al taller'
              ) : (
                'Crear cuenta gratis'
              )}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            >
              {mode === 'signin' ? (
                <>¿No tienes cuenta? <span className="text-primary font-medium">Regístrate gratis</span></>
              ) : (
                <>¿Ya tienes cuenta? <span className="text-primary font-medium">Inicia sesión</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
