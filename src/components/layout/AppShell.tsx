import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { AttendanceButton } from './AttendanceButton';
import { Button } from '@/components/ui/button';
import {
  Wrench,
  LayoutDashboard,
  BarChart2,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  CalendarDays,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Taller', icon: LayoutDashboard },
  { to: '/appointments', label: 'Citas', icon: CalendarDays },
  { to: '/history', label: 'Historial', icon: Search },
  { to: '/analytics', label: 'Analítica', icon: BarChart2 },
  { to: '/team', label: 'Equipo', icon: Users },
  { to: '/settings', label: 'Ajustes', icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { organization } = useOrganization();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur sticky top-0 z-40 shadow-sm shadow-black/20">
        <div className="flex items-center gap-3 px-4 h-14">
          {/* Logo */}
          <NavLink to="/dashboard" className="flex items-center gap-2 mr-3 shrink-0 group">
            <div className="h-7 w-7 rounded-md bg-primary/15 flex items-center justify-center border border-primary/30 group-hover:bg-primary/25 transition-colors">
              <Wrench className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold tracking-tight hidden sm:inline text-foreground">
              {organization?.name ?? 'TallerControl'}
            </span>
          </NavLink>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex-1 md:flex-none" />

          {/* Right controls */}
          <div className="hidden md:flex items-center gap-2">
            <AttendanceButton />
            <div className="h-5 w-px bg-border mx-1" />
            <div className="text-xs text-muted-foreground hidden lg:block max-w-[140px] truncate">
              {user?.email}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              title="Cerrar sesión"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile burger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border/50 bg-card px-4 py-3 space-y-1">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
            <div className="pt-2 border-t border-border/50 flex items-center gap-2">
              <AttendanceButton />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="gap-1.5 text-muted-foreground"
              >
                <LogOut className="h-3.5 w-3.5" /> Salir
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
