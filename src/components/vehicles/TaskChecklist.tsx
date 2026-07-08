import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { CheckSquare, Plus, Trash2, Loader2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  completed_at: string | null;
  sort_order: number;
  completed_by_name?: string | null;
}

export function TaskChecklist({ vehicleId }: { vehicleId: string }) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('vehicle_tasks')
      .select('id, title, completed, completed_at, sort_order, completed_by:profiles(full_name)')
      .eq('vehicle_id', vehicleId)
      .order('sort_order');

    setTasks((data ?? []).map((t: any) => ({
      ...t,
      completed_by_name: t.completed_by?.full_name ?? null,
    })));
    setLoading(false);
  }, [vehicleId]);

  useEffect(() => { load(); }, [load]);

  const addTask = async () => {
    if (!newTitle.trim() || !organizationId) return;
    setAdding(true);
    const { error } = await supabase.from('vehicle_tasks').insert({
      vehicle_id: vehicleId,
      organization_id: organizationId,
      title: newTitle.trim(),
      sort_order: tasks.length,
      created_by: user?.id,
    });
    if (error) toast.error('Error al añadir tarea');
    else { setNewTitle(''); load(); }
    setAdding(false);
  };

  const toggleTask = async (task: Task) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('vehicle_tasks')
      .update({
        completed: !task.completed,
        completed_by: !task.completed ? user?.id : null,
        completed_at: !task.completed ? now : null,
      })
      .eq('id', task.id);
    if (error) toast.error('Error al actualizar tarea');
    else load();
  };

  const deleteTask = async (id: string) => {
    await supabase.from('vehicle_tasks').delete().eq('id', id);
    load();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addTask(); }
  };

  const done = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="border border-border/40 rounded-xl bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Tareas del trabajo</span>
          {total > 0 && (
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full border font-medium',
              done === total
                ? 'text-[hsl(142_68%_48%)] bg-[hsl(142_68%_48%/0.1)] border-[hsl(142_68%_48%/0.3)]'
                : 'text-[hsl(35_92%_55%)] bg-[hsl(35_92%_55%/0.1)] border-[hsl(35_92%_55%/0.3)]'
            )}>
              {done}/{total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {total > 0 && (
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/40 p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {tasks.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">Sin tareas. Añade los trabajos a realizar.</p>
              )}

              {/* Pending tasks */}
              {tasks.filter((t) => !t.completed).map((task) => (
                <div key={task.id} className="flex items-center gap-2 group">
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                  <button
                    onClick={() => toggleTask(task)}
                    className="w-4 h-4 rounded border-2 border-border/60 hover:border-primary transition-colors shrink-0 flex items-center justify-center"
                  />
                  <span className="flex-1 text-sm">{task.title}</span>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {/* Completed tasks */}
              {tasks.filter((t) => t.completed).length > 0 && (
                <div className="pt-2 mt-2 border-t border-border/20 space-y-1.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-1">Completadas</p>
                  {tasks.filter((t) => t.completed).map((task) => (
                    <div key={task.id} className="flex items-center gap-2 group opacity-60">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                      <button
                        onClick={() => toggleTask(task)}
                        className="w-4 h-4 rounded border-2 border-primary bg-primary transition-colors shrink-0 flex items-center justify-center"
                      >
                        <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <span className="flex-1 text-sm line-through text-muted-foreground">{task.title}</span>
                      {task.completed_by_name && (
                        <span className="text-[10px] text-muted-foreground hidden group-hover:block">{task.completed_by_name}</span>
                      )}
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add task input */}
              <div className="flex gap-2 pt-1">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Nueva tarea... (Enter para añadir)"
                  className="flex-1 text-sm bg-muted/30 border border-border/50 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
                />
                <button
                  onClick={addTask}
                  disabled={adding || !newTitle.trim()}
                  className="shrink-0 p-1.5 bg-primary/15 hover:bg-primary/25 text-primary rounded-lg disabled:opacity-40 transition-colors"
                >
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
