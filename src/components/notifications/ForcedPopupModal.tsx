import { useTranslation } from 'react-i18next';
import { AlertTriangle, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationsContext';

export default function ForcedPopupModal() {
  const { pendingPopup, acknowledgePopup } = useNotifications();
  const { t } = useTranslation();

  if (!pendingPopup) return null;

  const Icon =
    pendingPopup.type === 'warning'
      ? AlertTriangle
      : pendingPopup.type === 'error'
      ? AlertCircle
      : pendingPopup.type === 'success'
      ? CheckCircle2
      : Info;

  const color =
    pendingPopup.type === 'warning'
      ? 'text-warning'
      : pendingPopup.type === 'error'
      ? 'text-destructive'
      : pendingPopup.type === 'success'
      ? 'text-success'
      : 'text-primary';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-fade-in">
      <div className="glass-card p-6 w-full max-w-md">
        <div className="flex items-start gap-3 mb-4">
          <Icon className={`w-7 h-7 ${color} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-display font-bold text-foreground">{pendingPopup.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(pendingPopup.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap mb-6">{pendingPopup.message}</p>
        <button onClick={() => acknowledgePopup(pendingPopup.id)} className="btn-primary w-full">
          {t('common.confirm')}
        </button>
      </div>
    </div>
  );
}