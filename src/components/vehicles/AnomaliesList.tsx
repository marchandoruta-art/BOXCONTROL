import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Plus, Loader2, Trash2, Camera, X, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface Anomaly {
  id: string;
  description: string;
  photo_path: string | null;
  created_at: string;
  created_by: string | null;
}

export function AnomaliesList({ vehicleId }: { vehicleId: string }) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [desc, setDesc] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('vehicle_anomalies')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });
    setAnomalies((data ?? []) as Anomaly[]);
    setLoading(false);
  }, [vehicleId]);

  useEffect(() => { load(); }, [load]);

  const pickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const getPhotoUrl = (path: string) => {
    const { data } = supabase.storage.from('vehicle-photos').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleAdd = async () => {
    if (!desc.trim() || !organizationId) return;
    setSaving(true);

    let photoPath: string | null = null;
    if (photoFile) {
      const ext = photoFile.name.split('.').pop();
      const path = `anomalies/${vehicleId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('vehicle-photos')
        .upload(path, photoFile);
      if (uploadError) {
        toast.error('Error al subir la foto');
        setSaving(false);
        return;
      }
      photoPath = path;
    }

    const { error } = await supabase.from('vehicle_anomalies').insert({
      vehicle_id: vehicleId,
      organization_id: organizationId,
      description: desc.trim(),
      photo_path: photoPath,
      created_by: user?.id,
    });

    if (error) {
      toast.error('Error al guardar anomalía');
    } else {
      toast.success('Anomalía registrada');
      setDesc('');
      setPhotoFile(null);
      setPhotoPreview(null);
      setAdding(false);
      load();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('vehicle_anomalies').delete().eq('id', id);
    if (error) toast.error('Error al eliminar');
    else { toast.success('Eliminado'); load(); }
  };

  return (
    <div className="border border-border/40 rounded-xl bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[hsl(35_92%_55%)]" />
          <span className="font-semibold text-sm">Anomalías detectadas</span>
          {anomalies.length > 0 && (
            <span className="text-xs bg-[hsl(35_92%_55%/0.15)] text-[hsl(35_92%_55%)] border border-[hsl(35_92%_55%/0.3)] px-2 py-0.5 rounded-full font-medium">
              {anomalies.length}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border/40 p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {anomalies.length === 0 && !adding && (
                <p className="text-xs text-muted-foreground text-center py-2">Sin anomalías registradas</p>
              )}

              {anomalies.map((a) => (
                <div key={a.id} className="flex gap-3 p-3 bg-muted/20 rounded-lg border border-border/30">
                  {a.photo_path && (
                    <img
                      src={getPhotoUrl(a.photo_path)}
                      alt="anomalía"
                      className="w-16 h-16 object-cover rounded-md shrink-0 border border-border/30"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{a.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(a.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {adding && (
                <div className="space-y-3 p-3 border border-border/40 rounded-lg bg-muted/10">
                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Describe la anomalía (golpe, rayón, pieza rota...)"
                    rows={2}
                    autoFocus
                    className="w-full text-sm bg-muted/30 border border-border/50 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                  />
                  {photoPreview ? (
                    <div className="relative inline-block">
                      <img src={photoPreview} alt="preview" className="w-24 h-24 object-cover rounded-md border border-border/30" />
                      <button
                        onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                        className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-0.5"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/50 rounded-lg px-3 py-2 transition-colors"
                    >
                      <Camera className="h-3.5 w-3.5" /> Añadir foto (opcional)
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { setAdding(false); setDesc(''); setPhotoFile(null); setPhotoPreview(null); }}>
                      Cancelar
                    </Button>
                    <Button size="sm" className="flex-1" onClick={handleAdd} disabled={saving || !desc.trim()}>
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Guardar anomalía'}
                    </Button>
                  </div>
                </div>
              )}

              {!adding && (
                <button
                  onClick={() => setAdding(true)}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/40 rounded-lg px-3 py-2 w-full justify-center transition-colors hover:border-border"
                >
                  <Plus className="h-3.5 w-3.5" /> Registrar anomalía
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
