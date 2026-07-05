import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Trash2, Loader2, ZoomIn, X } from 'lucide-react';
import { toast } from 'sonner';
import type { VehiclePhoto } from '@/lib/types';

interface VehiclePhotosProps {
  vehicleId: string;
}

export function VehiclePhotos({ vehicleId }: VehiclePhotosProps) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [photos, setPhotos] = useState<VehiclePhoto[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!vehicleId) return;
    const { data } = await supabase
      .from('vehicle_photos')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at');
    const rows = (data as unknown as VehiclePhoto[]) ?? [];
    setPhotos(rows);

    // Generar URLs firmadas
    const urls: Record<string, string> = {};
    await Promise.all(
      rows.map(async (p) => {
        const { data: signed } = await supabase.storage
          .from('vehicle-photos')
          .createSignedUrl(p.storage_path, 3600);
        if (signed?.signedUrl) urls[p.id] = signed.signedUrl;
      })
    );
    setSignedUrls(urls);
  }, [vehicleId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !organizationId || !user) return;

    const oversized = files.find((f) => f.size > 10 * 1024 * 1024);
    if (oversized) {
      toast.error('Cada foto debe pesar menos de 10 MB');
      return;
    }

    setUploading(true);
    let uploadedCount = 0;

    for (const file of files) {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${organizationId}/${vehicleId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('vehicle-photos')
        .upload(path, file);

      if (uploadError) {
        toast.error(`Error al subir ${file.name}: ${uploadError.message}`);
        continue;
      }

      const { error: dbError } = await supabase.from('vehicle_photos').insert({
        organization_id: organizationId,
        vehicle_id: vehicleId,
        storage_path: path,
        uploaded_by: user.id,
      });

      if (dbError) {
        toast.error('Foto subida pero error al registrarla');
      } else {
        uploadedCount++;
      }
    }

    if (uploadedCount > 0) {
      toast.success(`${uploadedCount} foto(s) subidas`);
      await load();
    }
    setUploading(false);
    // Limpiar input para permitir subir el mismo archivo de nuevo
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (photo: VehiclePhoto) => {
    await supabase.storage.from('vehicle-photos').remove([photo.storage_path]);
    await supabase.from('vehicle_photos').delete().eq('id', photo.id);
    toast.success('Foto eliminada');
    await load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium flex items-center gap-1.5">
          <Camera className="h-4 w-4" /> Fotos del vehículo
          {photos.length > 0 && (
            <span className="text-xs text-muted-foreground">({photos.length})</span>
          )}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          {uploading ? 'Subiendo...' : 'Añadir fotos'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {photos.length === 0 ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground hover:border-primary/40 hover:text-primary/60 transition-colors"
        >
          <Camera className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Haz clic para subir fotos</p>
          <p className="text-xs mt-0.5">PNG, JPG, HEIC · máx. 10 MB por foto</p>
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square rounded-lg overflow-hidden border bg-muted">
              {signedUrls[photo.id] ? (
                <img
                  src={signedUrls[photo.id]}
                  alt="Foto del vehículo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => setLightbox(signedUrls[photo.id])}
                  className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(photo)}
                  className="h-8 w-8 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {/* Botón de añadir más */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:border-primary/40 hover:text-primary/60 transition-colors"
          >
            <Upload className="h-5 w-5 mb-1" />
            <span className="text-xs">Añadir</span>
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            onClick={() => setLightbox(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightbox}
            alt="Vista ampliada"
            className="max-h-[90vh] max-w-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
