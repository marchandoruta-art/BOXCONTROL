import { useNavigate } from 'react-router-dom';
import { Wrench, ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 bg-card/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </button>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Wrench className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-bold text-sm">TallerControl</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Última actualización: 5 de julio de 2026
        </p>
        <div className="prose prose-sm max-w-none text-foreground space-y-6">
          {children}
        </div>
      </main>

      <footer className="border-t border-border/30 bg-card/30 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 text-xs text-muted-foreground text-center">
          © 2026 TallerControl · <a href="/legal/privacidad" className="hover:text-foreground">Privacidad</a> ·{' '}
          <a href="/legal/terminos" className="hover:text-foreground">Términos</a> ·{' '}
          <a href="/legal/cookies" className="hover:text-foreground">Cookies</a> ·{' '}
          <a href="/legal/aviso-legal" className="hover:text-foreground">Aviso Legal</a>
        </div>
      </footer>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground border-b border-border/40 pb-2">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </section>
  );
}
