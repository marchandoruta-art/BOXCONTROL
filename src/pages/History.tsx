import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { AppShell } from '@/components/layout/AppShell';
import { SubscriptionBanner } from '@/components/layout/SubscriptionBanner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { VehicleStatusBadge } from '@/components/vehicles/VehicleStatusBadge';
import { Search, Car, Clock, User, Loader2, History as HistoryIcon } from 'lucide-react';
import type { Vehicle } from '@/lib/types';

interface HistoryEntry {
  id: string;
  status: string;
  changed_at: string;
  notes: string | null;
}

export default function History() {
  const { organization, organizationId } = useOrganization();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Vehicle[]>([]);
  const [selected, setSelected] = useState<Vehicle | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !query.trim()) return;
    setLoading(true);
    setSearched(true);
    setSelected(null);
    setHistory([]);

    const q = query.trim().toUpperCase();
    const { data } = await supabase
      .from('vehicles')
      .select('*, owner:owners(*)')
      .eq('organization_id', organizationId)
      .or(`plate.ilike.%${q}%,brand.ilike.%${query.trim()}%,model.ilike.%${query.trim()}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    setResults((data as unknown as Vehicle[]) ?? []);
    setLoading(false);
  };

  const loadHistory = async (vehicle: Vehicle) => {
    setSelected(vehicle);
    setHistoryLoading(true);
    const { data } = await supabase
      .from('vehicle_status_history')
      .select('id, status, changed_at, notes')
      .eq('vehicle_id', vehicle.id)
      .order('changed_at', { ascending: false });
    setHistory((data as unknown as HistoryEntry[]) ?? []);
    setHistoryLoading(false);
  };

  return (
    <AppShell>
      {organization && <SubscriptionBanner organization={organization} />}

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-primary" />
            Historial de vehículos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Busca por matrícula, marca o modelo
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="1234 ABC / Ford Focus / Toyota..."
              className="pl-9 bg-card border-border/50 text-base"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
          </Button>
        </form>

        {/* Results */}
        {searched && !loading && results.length === 0 && (
          <div className="text-center py-12 border border-dashed border-border/50 rounded-xl">
            <Car className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm text-muted-foreground">Sin resultados para "{query}"</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {/* Result list */}
          {results.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {results.length} vehículo(s)
              </p>
              {results.map((v) => (
                <button
                  key={v.id}
                  onClick={() => loadHistory(v)}
                  className={`w-full text-left border rounded-xl bg-card p-3 transition-all hover:border-primary/40 ${
                    selected?.id === v.id ? 'border-primary/60 bg-primary/5' : 'border-border/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-sm">{v.plate}</span>
                    <VehicleStatusBadge status={v.status} className="text-[10px]" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {v.brand} {v.model} {v.year ? `(${v.year})` : ''}
                  </p>
                  {v.owner?.name && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                      <User className="h-3 w-3" /> {v.owner.name}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/50 mt-1">
                    Entrada: {new Date(v.created_at).toLocaleDateString('es-ES')}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* History panel */}
          {selected && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  Historial de {selected.plate}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => navigate(`/vehicles/${selected.id}`)}
                >
                  Ver ficha →
                </Button>
              </div>

              {historyLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Sin historial de estados registrado.
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline */}
                  <div className="absolute left-3 top-2 bottom-2 w-px bg-border/50" />
                  <div className="space-y-3">
                    {history.map((entry, i) => (
                      <div key={entry.id} className="flex gap-4 pl-8 relative">
                        <div
                          className={`absolute left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-card ${
                            i === 0 ? 'bg-primary' : 'bg-muted-foreground/40'
                          }`}
                        />
                        <div className="flex-1 border border-border/30 rounded-lg bg-card/50 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <VehicleStatusBadge status={entry.status as Vehicle['status']} className="text-[10px]" />
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(entry.changed_at).toLocaleString('es-ES', {
                                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {entry.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
