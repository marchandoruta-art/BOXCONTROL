import { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { SubscriptionBanner } from '@/components/layout/SubscriptionBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserPlus, Copy, CheckCircle2, Users, Clock, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { type TeamMember, type TeamInvitation, ROLE_LABELS, type UserRole } from '@/lib/types';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS: UserRole[] = ['mecanico', 'chapista', 'oficina', 'admin'];

const ROLE_STYLE: Record<UserRole, string> = {
  mecanico: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  chapista: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  oficina: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  admin: 'bg-primary/15 text-primary border-primary/20',
};

const ROLE_DESCRIPTION: Record<UserRole, string> = {
  admin: 'Acceso total: configuración, facturación, equipo y todos los vehículos',
  oficina: 'Gestión de vehículos, clientes y presupuestos. Sin acceso a facturación ni ajustes del taller',
  mecanico: 'Cronómetro, tareas y estado de vehículos. Sin acceso a presupuestos ni administración',
  chapista: 'Cronómetro, tareas y estado de vehículos. Sin acceso a presupuestos ni administración',
};

export default function Team() {
  const { organization, organizationId } = useOrganization();
  const { user } = useAuth();
  const { can } = useRole();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('mecanico');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);

    const [{ data: roles }, { data: profiles }] = await Promise.all([
      supabase.from('user_roles').select('user_id, role').eq('organization_id', organizationId),
      supabase.from('profiles').select('id, full_name, email, avatar_url').eq('organization_id', organizationId),
    ]);

    const roleMap = Object.fromEntries((roles ?? []).map((r) => [r.user_id, r.role as UserRole]));
    const teamMembers: TeamMember[] = (profiles ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email ?? undefined,
      avatar_url: p.avatar_url ?? undefined,
      role: roleMap[p.id] ?? 'mecanico',
    }));
    setMembers(teamMembers);

    const { data: invs } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('organization_id', organizationId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    setInvitations((invs as unknown as TeamInvitation[]) ?? []);

    setLoading(false);
  }, [organizationId]);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !user) return;
    setCreating(true);
    const { error } = await supabase.from('team_invitations').insert({
      organization_id: organizationId,
      email: email.trim(),
      role,
      invited_by: user.id,
    });
    if (error) toast.error('Error al crear la invitación: ' + error.message);
    else { toast.success('Invitación creada'); setEmail(''); await load(); }
    setCreating(false);
  };

  const copyInviteLink = async (token: string, id: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    toast.success('Enlace copiado');
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleChangeRole = async (memberId: string, newRole: UserRole) => {
    if (!organizationId) return;
    setChangingRole(memberId);
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', memberId)
      .eq('organization_id', organizationId);
    if (error) toast.error('Error al cambiar el rol');
    else { toast.success(`Rol actualizado a ${ROLE_LABELS[newRole]}`); await load(); }
    setChangingRole(null);
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!organizationId) return;
    if (memberId === organization?.owner_id) {
      toast.error('No puedes eliminar al propietario del taller');
      return;
    }
    if (!confirm(`¿Eliminar a ${memberName} del equipo? Perderá acceso inmediatamente.`)) return;
    setRemovingId(memberId);
    await Promise.all([
      supabase.from('user_roles').delete().eq('user_id', memberId).eq('organization_id', organizationId),
      supabase.from('profiles').update({ organization_id: null }).eq('id', memberId),
    ]);
    toast.success(`${memberName} eliminado del equipo`);
    await load();
    setRemovingId(null);
  };

  const handleCancelInvite = async (invId: string) => {
    await supabase.from('team_invitations').delete().eq('id', invId);
    toast.success('Invitación cancelada');
    await load();
  };

  const initials = (name: string) =>
    name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const isAdmin = can('canChangeRoles');
  const canInvite = can('canInviteMembers');

  return (
    <AppShell>
      {organization && <SubscriptionBanner organization={organization} />}
      <div className="max-w-2xl mx-auto p-4 py-8 space-y-6">
        <h1 className="text-xl font-bold">Equipo</h1>

        {/* Roles info */}
        <div className="grid grid-cols-2 gap-2">
          {ROLE_OPTIONS.map((r) => (
            <div key={r} className={cn('rounded-lg border p-3 space-y-1', ROLE_STYLE[r])}>
              <div className="flex items-center gap-1.5">
                <Shield className="h-3 w-3" />
                <span className="text-xs font-semibold">{ROLE_LABELS[r]}</span>
              </div>
              <p className="text-xs opacity-70 leading-tight">{ROLE_DESCRIPTION[r]}</p>
            </div>
          ))}
        </div>

        {/* Invitar */}
        {canInvite && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4" /> Invitar miembro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="email@mecanico.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                  <Button type="submit" disabled={creating} className="gap-1.5">
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    Invitar
                  </Button>
                </div>
              </form>
              <p className="text-xs text-muted-foreground mt-2">
                Se genera un enlace que puedes copiar y enviar por WhatsApp o email.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Invitaciones pendientes */}
        {invitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Invitaciones pendientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-2 rounded-md border p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[inv.role]} · Caduca {new Date(inv.expires_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copyInviteLink(inv.token, inv.id)}>
                      {copiedId === inv.id ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      Copiar
                    </Button>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => handleCancelInvite(inv.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Miembros activos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Miembros activos
              <span className="ml-auto text-xs text-muted-foreground font-normal">{members.length} miembro{members.length !== 1 ? 's' : ''}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin miembros aún.</p>
            ) : (
              <div className="space-y-2">
                {members.map((m) => {
                  const isOwner = m.id === organization?.owner_id;
                  const isMe = m.id === user?.id;
                  return (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-3 bg-card/50">
                      {m.avatar_url ? (
                        <img src={m.avatar_url} className="h-9 w-9 rounded-full object-cover shrink-0" alt="" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                          {initials(m.full_name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {m.full_name}
                          {isMe && <span className="ml-1.5 text-xs text-muted-foreground">(tú)</span>}
                          {isOwner && <span className="ml-1.5 text-xs text-primary">· Propietario</span>}
                        </p>
                        {m.email && <p className="text-xs text-muted-foreground truncate">{m.email}</p>}
                      </div>

                      {/* Rol — editable para admin, solo lectura para el resto */}
                      {isAdmin && !isMe ? (
                        <div className="relative">
                          {changingRole === m.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <select
                              value={m.role}
                              onChange={(e) => handleChangeRole(m.id, e.target.value as UserRole)}
                              className={cn(
                                'text-xs font-medium px-2 py-1 rounded-full border cursor-pointer bg-transparent focus:outline-none',
                                ROLE_STYLE[m.role]
                              )}
                            >
                              {ROLE_OPTIONS.map((r) => (
                                <option key={r} value={r} className="bg-background text-foreground">
                                  {ROLE_LABELS[r]}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      ) : (
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', ROLE_STYLE[m.role])}>
                          {ROLE_LABELS[m.role]}
                        </span>
                      )}

                      {/* Eliminar — solo admin, no al propietario ni a sí mismo */}
                      {isAdmin && !isMe && !isOwner && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive shrink-0 h-7 w-7 p-0"
                          onClick={() => handleRemoveMember(m.id, m.full_name)}
                          disabled={removingId === m.id}
                        >
                          {removingId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
