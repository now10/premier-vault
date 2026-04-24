import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationsContext';

export default function WithdrawalPopupModal() {
  const { pendingWithdrawalPopup, acknowledgeWithdrawalPopup } = useNotifications();
  const { t } = useTranslation();

  if (!pendingWithdrawalPopup) return null;
  const p = pendingWithdrawalPopup;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-fade-in">
      <div className="glass-card p-6 w-full max-w-md border-warning/40">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-7 h-7 text-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-display font-bold text-foreground">{p.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t('withdrawal.feeNotice')}</p>
          </div>
        </div>

        <p className="text-sm text-foreground whitespace-pre-wrap mb-4">{p.message}</p>

        {p.required_fee != null && Number(p.required_fee) > 0 && (
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-5">
            <p className="text-xs text-muted-foreground mb-1">{t('common.fee')}</p>
            <p className="text-2xl font-bold text-warning">
              ${Number(p.required_fee).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}

        <button onClick={() => acknowledgeWithdrawalPopup(p.id)} className="btn-primary w-full">
          {t('withdrawal.iAcknowledge')}
        </button>
      </div>
    </div>
  );
}