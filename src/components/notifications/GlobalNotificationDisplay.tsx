import React from 'react';
import { useTranslation } from 'react-i18next';
import { Gift, AlertTriangle, CheckCircle2, AlertCircle, Bell, X } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationsContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export default function GlobalNotificationDisplay() {
  const { notifications, pendingPopup, pendingWithdrawalPopup, pendingBonusPopup, markAsRead, acknowledgePopup, acknowledgeWithdrawalPopup, acknowledgeBonusPopup } = useNotifications();
  const { user, refreshProfile } = useAuth();
  const { t } = useTranslation();

  const handleClaimBonus = async (bonusId: string, amount: number | null) => {
    if (!user) return;
    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();
      
      if (!profile) throw new Error('Profile not found');

      // Add bonus amount to wallet
      const newBalance = Number(profile.wallet_balance) + (amount || 0);
      await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', user.id);

      // Create transaction record
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'Bonus',
        amount: amount || 0,
        status: 'Completed',
        description: `Bonus claimed and credited to wallet`,
      });

      // Mark bonus as claimed
      await supabase
        .from('bonuses')
        .update({ claimed: true, claimed_at: new Date().toISOString(), claimed_by: user.id })
        .eq('id', bonusId);

      toast({ title: '✅ Bonus Claimed', description: `$${(amount || 0).toLocaleString()} has been added to your wallet` });
      
      // Refresh profile and dismiss popup
      await refreshProfile();
      await acknowledgeBonusPopup(bonusId);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // Show active popups in order of priority
  const getActiveNotifications = () => {
    const active = [];
    
    if (pendingPopup) active.push({ type: 'popup', data: pendingPopup });
    if (pendingWithdrawalPopup) active.push({ type: 'withdrawal', data: pendingWithdrawalPopup });
    if (pendingBonusPopup) active.push({ type: 'bonus', data: pendingBonusPopup });
    
    return active;
  };

  const activeNotifs = getActiveNotifications();

  if (activeNotifs.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 z-[95] max-h-[80vh] overflow-y-auto space-y-3">
      {activeNotifs.map((item, idx) => {
        if (item.type === 'popup') {
          const notif = item.data;
          const Icon =
            notif.type === 'warning'
              ? AlertTriangle
              : notif.type === 'error'
              ? AlertCircle
              : notif.type === 'success'
              ? CheckCircle2
              : Bell;

          const color =
            notif.type === 'warning'
              ? 'text-warning'
              : notif.type === 'error'
              ? 'text-destructive'
              : notif.type === 'success'
              ? 'text-success'
              : 'text-primary';

          return (
            <div
              key={notif.id}
              className="glass-card p-4 border border-primary/20 rounded-lg shadow-lg animate-fade-in"
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-6 h-6 ${color} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">{notif.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{notif.message}</p>
                </div>
                <button
                  onClick={() => acknowledgePopup(notif.id)}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => acknowledgePopup(notif.id)}
                className="w-full mt-3 btn-primary text-xs py-1.5"
              >
                {t('common.confirm')}
              </button>
            </div>
          );
        }

        if (item.type === 'withdrawal') {
          const popup = item.data;
          return (
            <div key={popup.id} className="glass-card p-4 border border-warning/20 rounded-lg shadow-lg animate-fade-in">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">{popup.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('withdrawal.feeNotice')}</p>
                  <p className="text-xs text-foreground mt-1 whitespace-pre-wrap">{popup.message}</p>
                </div>
              </div>

              {popup.required_fee != null && Number(popup.required_fee) > 0 && (
                <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mt-3 mb-3">
                  <p className="text-xs text-muted-foreground">{t('common.fee')}</p>
                  <p className="text-lg font-bold text-warning">
                    ${Number(popup.required_fee).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              <button
                onClick={() => acknowledgeWithdrawalPopup(popup.id)}
                className="w-full btn-primary text-xs py-1.5"
              >
                {t('withdrawal.iAcknowledge')}
              </button>
            </div>
          );
        }

        if (item.type === 'bonus') {
          const bonus = item.data;
          const displayType = bonus.type === 'coupon' ? 'Coupon' : bonus.type === 'gift' ? 'Gift' : bonus.type === 'token' ? 'Token' : 'Bonus';

          return (
            <div key={bonus.id} className="glass-card p-4 border border-primary/20 rounded-lg shadow-lg animate-fade-in">
              <div className="flex items-start gap-3">
                <Gift className="w-6 h-6 text-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">
                    🎁 {displayType}: {bonus.description}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{bonus.message}</p>
                </div>
              </div>

              {bonus.amount && (
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 mt-3 mb-3">
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="text-xl font-bold gradient-gold-text">
                    ${Number(bonus.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}

              {bonus.expires_at && (
                <p className="text-xs text-warning mb-3">
                  ⏰ Expires: {new Date(bonus.expires_at).toLocaleDateString()}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleClaimBonus(bonus.id, bonus.amount)}
                  className="flex-1 btn-primary text-xs py-1.5"
                >
                  Claim Bonus
                </button>
                <button
                  onClick={() => acknowledgeBonusPopup(bonus.id)}
                  className="flex-1 btn-secondary text-xs py-1.5"
                >
                  Later
                </button>
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
