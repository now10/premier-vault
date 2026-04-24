import { useState } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@/contexts/NotificationsContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function NotificationsBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const recent = notifications.slice(0, 8);

  const typeColor = (type: string) =>
    type === 'success'
      ? 'bg-success'
      : type === 'warning'
      ? 'bg-warning'
      : type === 'error'
      ? 'bg-destructive'
      : 'bg-primary';

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="relative text-muted-foreground hover:text-foreground transition-colors">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold text-sm text-foreground">{t('notifications.title')}</h3>
          {unreadCount > 0 && (
            <button onClick={() => markAllAsRead()} className="text-xs text-primary hover:underline">
              {t('notifications.markAllRead')}
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-auto">
          {recent.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">{t('notifications.empty')}</p>
          ) : (
            recent.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.read) markAsRead(n.id);
                  if (n.link) {
                    navigate(n.link);
                    setOpen(false);
                  }
                }}
                className={cn(
                  'w-full text-left p-3 border-b border-border/50 hover:bg-muted/40 transition-colors flex gap-3',
                  !n.read && 'bg-muted/20'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', typeColor(n.type))} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                {!n.read && <Check className="w-3 h-3 text-primary opacity-0" />}
              </button>
            ))
          )}
        </div>
        <button
          onClick={() => {
            navigate('/notifications');
            setOpen(false);
          }}
          className="w-full p-3 text-center text-sm text-primary hover:bg-muted/40 border-t border-border flex items-center justify-center gap-1.5"
        >
          {t('notifications.viewAll')}
          <ExternalLink className="w-3 h-3" />
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}