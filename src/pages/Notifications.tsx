import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const typeColor = (type: string) =>
    type === 'success'
      ? 'bg-success/10 border-success/30 text-success'
      : type === 'warning'
      ? 'bg-warning/10 border-warning/30 text-warning'
      : type === 'error'
      ? 'bg-destructive/10 border-destructive/30 text-destructive'
      : 'bg-primary/10 border-primary/30 text-primary';

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-7 h-7 text-primary" />
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            {t('notifications.title')}
          </h1>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="btn-secondary text-sm flex items-center gap-2">
            <CheckCheck className="w-4 h-4" />
            {t('notifications.markAllRead')}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="glass-card p-12 text-center text-muted-foreground">
          {t('notifications.empty')}
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                if (!n.read) markAsRead(n.id);
                if (n.link) navigate(n.link);
              }}
              className={cn(
                'w-full text-left glass-card p-4 hover:border-primary/40 transition-all flex gap-3',
                !n.read && 'border-l-4 border-l-primary'
              )}
            >
              <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase border h-fit', typeColor(n.type))}>
                {n.type}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-foreground">{n.title}</h3>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{n.message}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}