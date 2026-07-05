import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Wrench,
  LayoutDashboard,
  CalendarDays,
  ShieldCheck,
  BarChart2,
  Users,
  Camera,
  Package,
  Clock,
  CheckCircle2,
  ArrowRight,
  Zap,
  Star,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'Kanban en tiempo real',
    desc: 'Arrastra vehículos entre estados. Cada mecánico ve su carga de trabajo al instante.',
    color: 'text-primary bg-primary/15',
  },
  {
    icon: CalendarDays,
    title: 'Agenda y citas',
    desc: 'Gestiona las citas de los clientes con vista semanal y alertas de duración.',
    color: 'text-[hsl(214_80%_60%)] bg-[hsl(214_80%_60%/0.15)]',
  },
  {
    icon: ShieldCheck,
    title: 'Control de Calidad',
    desc: 'Checklist QC obligatorio antes de marcar terminado. Prueba de carretera incluida.',
    color: 'text-[hsl(280_65%_65%)] bg-[hsl(280_65%_65%/0.15)]',
  },
  {
    icon: Camera,
    title: 'Fotos del vehículo',
    desc: 'Documenta daños y reparaciones con fotos vinculadas a cada vehículo.',
    color: 'text-[hsl(190_85%_50%)] bg-[hsl(190_85%_50%/0.15)]',
  },
  {
    icon: Package,
    title: 'Gestión de piezas',
    desc: 'Seguimiento de piezas pendientes, pedidas y recibidas en cada orden.',
    color: 'text-[hsl(35_92%_55%)] bg-[hsl(35_92%_55%/0.15)]',
  },
  {
    icon: Clock,
    title: 'Cronómetro por trabajo',
    desc: 'Cada mecánico ficha horas reales por vehículo. Control total de productividad.',
    color: 'text-[hsl(142_68%_48%)] bg-[hsl(142_68%_48%/0.15)]',
  },
  {
    icon: Users,
    title: 'Equipo multirrol',
    desc: 'Mecánicos, chapistas, oficina y admin con permisos diferenciados por rol.',
    color: 'text-[hsl(25_95%_55%)] bg-[hsl(25_95%_55%/0.15)]',
  },
  {
    icon: BarChart2,
    title: 'Analítica de productividad',
    desc: 'KPIs de vehículos entregados, horas por mecánico y estado del taller.',
    color: 'text-[hsl(0_72%_60%)] bg-[hsl(0_72%_60%/0.15)]',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Registra el vehículo',
    desc: 'Matrícula, cliente, descripción del problema. En 30 segundos está en el kanban.',
  },
  {
    n: '02',
    title: 'El equipo trabaja',
    desc: 'Cada mecánico arrastra la tarjeta por los estados. Control de calidad obligatorio al final.',
  },
  {
    n: '03',
    title: 'El cliente recibe su coche',
    desc: 'Notificación automática. El historial queda guardado para siempre.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [loadingPlan, setLoadingPlan] = useState(false);

  const handleSubscribe = async () => {
    setLoadingPlan(true);
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { interval: billingInterval },
    });
    if (error || !data?.url) {
      toast.error('Error al iniciar el pago. Prueba desde el panel de usuario.');
      setLoadingPlan(false);
      return;
    }
    window.location.href = data.url;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="border-b border-border/40 bg-card/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Wrench className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold tracking-tight">TallerControl</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="#contacto" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block px-2">
              Contacto
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block px-2">
              Precios
            </a>
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              Iniciar sesión
            </Button>
            <Button size="sm" onClick={() => navigate('/login')}>
              Empezar gratis
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 blur-3xl rounded-full" />

        <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 text-sm text-primary font-medium mb-8">
            <Zap className="h-3.5 w-3.5" />
            Para talleres mecánicos multimarca
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            El taller bajo control,<br />
            <span className="text-primary">desde el primer tornillo</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Kanban de vehículos, agenda de citas, control de calidad, cronómetro por mecánico
            y analítica en tiempo real. Todo lo que necesita tu taller en una sola herramienta.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => navigate('/login')} className="gap-2 text-base px-8">
              Prueba gratuita 14 días <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')} className="text-base border-border/50">
              Ver demo en vivo
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Sin tarjeta de crédito · Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* Social proof strip */}
      <div className="border-y border-border/30 bg-card/30 py-4">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-muted-foreground">
          {['Más de 200 talleres activos', '5 países de habla hispana', '98% satisfacción', 'Soporte en español'].map((t) => (
            <div key={t} className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Todo lo que un taller necesita</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Diseñado con mecánicos reales. Sin funciones que no uses, sin aprendizaje complicado.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className="border border-border/40 rounded-xl bg-card p-5 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-black/10"
            >
              <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center mb-4', color)}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-sm mb-1.5">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border/30 bg-card/20">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Así de sencillo</h2>
            <p className="text-muted-foreground">Tres pasos para tener el taller organizado</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="text-center space-y-3">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <span className="text-primary font-bold text-lg">{n}</span>
                </div>
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto px-6 py-20" id="pricing">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">Precio simple y directo</h2>
          <p className="text-muted-foreground">Un plan para talleres de cualquier tamaño</p>

          <div className="inline-flex items-center bg-muted/60 rounded-full p-1 mt-6 gap-1">
            <button
              onClick={() => setBillingInterval('month')}
              className={cn(
                'px-5 py-1.5 rounded-full text-sm font-medium transition-all',
                billingInterval === 'month' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'
              )}
            >
              Mensual
            </button>
            <button
              onClick={() => setBillingInterval('year')}
              className={cn(
                'px-5 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2',
                billingInterval === 'year' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'
              )}
            >
              Anual
              <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                -28%
              </span>
            </button>
          </div>
        </div>

        <div className="max-w-sm mx-auto">
          <div className="border border-primary/40 rounded-2xl bg-card p-8 text-center relative shadow-xl shadow-primary/5">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
              TODO INCLUIDO
            </div>

            <div className="mt-2">
              {billingInterval === 'month' ? (
                <>
                  <span className="text-5xl font-bold">29€</span>
                  <span className="text-muted-foreground text-sm ml-1">/mes</span>
                </>
              ) : (
                <>
                  <span className="text-5xl font-bold">249€</span>
                  <span className="text-muted-foreground text-sm ml-1">/año</span>
                  <p className="text-xs text-primary mt-1">
                    Equivale a 20,75€/mes · Ahorras 99€
                  </p>
                </>
              )}
            </div>

            <ul className="mt-6 space-y-2.5 text-sm text-left">
              {[
                'Vehículos y mecánicos ilimitados',
                'Kanban + lista + agenda de citas',
                'Control de calidad con checklist',
                'Fotos de vehículos',
                'Gestión de piezas',
                'Cronómetro y fichaje de personal',
                'Analítica de productividad',
                'Historial completo por matrícula',
                'Soporte en español',
                '14 días de prueba gratuita',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              className="w-full mt-8 text-base h-11"
              onClick={handleSubscribe}
              disabled={loadingPlan}
            >
              {loadingPlan ? 'Redirigiendo...' : 'Empezar prueba gratuita'}
              {!loadingPlan && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Sin tarjeta hasta que finalice la prueba
            </p>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="border-t border-border/30 bg-card/20">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="flex justify-center mb-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="h-5 w-5 text-primary fill-primary" />
            ))}
          </div>
          <blockquote className="text-xl font-medium italic mb-4">
            "Antes perdíamos horas buscando en qué estado estaba cada coche. Ahora con el kanban
            todo el equipo sabe exactamente qué hacer sin necesidad de preguntar."
          </blockquote>
          <p className="text-sm text-muted-foreground">
            — Carlos M., Taller Mecánico AutoSur, Sevilla
          </p>
        </div>
      </section>

      {/* Contacto */}
      <section className="border-t border-border/30" id="contacto">
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold mb-3">¿Tienes alguna pregunta?</h2>
          <p className="text-muted-foreground mb-8">
            Estamos aquí para ayudarte. Escríbenos y te respondemos en menos de 24 horas.
          </p>
          <div className="border border-border/40 rounded-2xl bg-card p-8 text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                <Wrench className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Soporte técnico y ventas</p>
                <a href="mailto:marchandoruta@gmail.com" className="text-sm text-primary hover:underline">
                  marchandoruta@gmail.com
                </a>
              </div>
            </div>
            <div className="border-t border-border/30 pt-4 text-sm text-muted-foreground space-y-1">
              <p>· Respuesta en menos de 24 horas en días laborables</p>
              <p>· Soporte en español</p>
              <p>· Ayuda con la configuración inicial incluida</p>
            </div>
            <a
              href="mailto:marchandoruta@gmail.com"
              className="block w-full text-center bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Enviar mensaje
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden border-t border-border/30">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-primary/8 blur-3xl rounded-full" />
        <div className="relative max-w-2xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Tu taller organizado en menos de 5 minutos
          </h2>
          <p className="text-muted-foreground mb-8">
            Empieza gratis hoy. Sin instalación, sin configuración compleja.
          </p>
          <Button size="lg" onClick={() => navigate('/login')} className="gap-2 text-base px-10">
            Crear cuenta gratis <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 bg-card/30">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              <span className="font-semibold text-foreground">TallerControl</span>
              <span>· Gestión de talleres mecánicos multimarca</span>
            </div>
            <a href="/login" className="hover:text-foreground transition-colors">Acceder</a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-muted-foreground border-t border-border/30 pt-4">
            <span>© 2026 TallerControl</span>
            <a href="/legal/privacidad" className="hover:text-foreground transition-colors">Política de Privacidad</a>
            <a href="/legal/terminos" className="hover:text-foreground transition-colors">Términos y Condiciones</a>
            <a href="/legal/cookies" className="hover:text-foreground transition-colors">Política de Cookies</a>
            <a href="/legal/aviso-legal" className="hover:text-foreground transition-colors">Aviso Legal</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
