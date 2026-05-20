import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gift, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationsContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export default function BonusPopupModal() {
  const { pendingBonusPopup, acknowledgeBonusPopup } = useNotifications();
  const { user, refreshProfile } = useAuth();
  const { t } = useTranslation();
  const [claiming, setClaiming] = useState(false);

  if (!pendingBonusPopup) return null;
  const b = pendingBonusPopup;

  const handleClaimBonus = async () => {
    if (!user) return;
    try {
      setClaiming(true);
      
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();
      
      if (!profile) throw new Error('Profile not found');

      // Add bonus amount to wallet
      const newBalance = Number(profile.wallet_balance) + (b.amount || 0);
      await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', user.id);

      // Create transaction record
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'Bonus',
        amount: b.amount || 0,
        status: 'Completed',
        description: `${b.type === 'coupon' ? 'Coupon' : b.type === 'gift' ? 'Gift' : b.type === 'token' ? 'Token' : 'Bonus'}: ${b.description}`,
      });

      // Mark bonus as claimed
      await supabase
        .from('bonuses')
        .update({ claimed: true, claimed_at: new Date().toISOString(), claimed_by: user.id })
        .eq('id', b.id);

      toast({ title: '✅ Bonus Claimed', description: `$${(b.amount || 0).toLocaleString()} has been added to your wallet` });
      
      // Refresh profile and dismiss popup
      await refreshProfile();
      await acknowledgeBonusPopup(b.id);
      setClaiming(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setClaiming(false);
    }
  };

  const iconColor = 'text-warning';
  const displayType = b.type === 'coupon' ? 'Coupon' : b.type === 'gift' ? 'Gift' : b.type === 'token' ? 'Token' : 'Bonus';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-fade-in">
      <div className="glass-card p-6 w-full max-w-md border border-primary/20">
        <div className="flex items-start gap-3 mb-4">
          <Gift className={`w-7 h-7 ${iconColor} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-display font-bold text-foreground">{displayType}: {b.description}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(b.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <p className="text-sm text-foreground whitespace-pre-wrap mb-4">{b.message}</p>

        {b.amount && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-5">
            <p className="text-xs text-muted-foreground mb-1">Amount</p>
            <p className="text-2xl font-bold gradient-gold-text">
              ${Number(b.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}

        {b.expires_at && (
          <p className="text-xs text-warning mb-4">
            ⏰ Expires: {new Date(b.expires_at).toLocaleDateString()}
          </p>
        )}

        <div className="flex gap-2">
          <button 
            onClick={handleClaimBonus} 
            disabled={claiming}
            className="btn-primary flex-1"
          >
            {claiming ? 'Claiming...' : 'Claim Bonus'}
          </button>
          <button 
            onClick={() => acknowledgeBonusPopup(b.id)} 
            className="btn-secondary flex-1"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
