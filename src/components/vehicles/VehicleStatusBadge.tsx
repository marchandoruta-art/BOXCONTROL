import { type VehicleStatus, STATUS_LABELS, STATUS_STYLES } from '@/lib/types';
import { cn } from '@/lib/utils';

export function VehicleStatusBadge({ status, className }: { status: VehicleStatus; className?: string }) {
  return <span className={cn('status-badge', STATUS_STYLES[status], className)}>{STATUS_LABELS[status]}</span>;
}
