import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationsContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export default function BillPopupModal() {
  const { pendingBill, acknowledgeBill } = useNotifications();
  const { user, refreshProfile } = useAuth();
  const { t } = useTranslation();
  const [processing, setProcessing] = useState(false);

  if (!pendingBill) return null;
  const bill = pendingBill;

  const handlePayBill = async () => {
    if (!user) return;
    try {
      setProcessing(true);

      // Get user profile to check if they have sufficient balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const currentBalance = Number(profile.wallet_balance);
      const billAmount = Number(bill.amount);

      if (currentBalance < billAmount) {
        toast({
          title: 'Insufficient Balance',
          description: `You need $${billAmount.toLocaleString()} but only have $${currentBalance.toLocaleString()} available.`,
          variant: 'destructive'
        });
        setProcessing(false);
        return;
      }

      // Deduct bill amount from wallet
      const newBalance = currentBalance - billAmount;
      await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', user.id);

      // Create transaction record
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'Payment',
        amount: billAmount,
        currency: 'USD',
        status: 'Completed',
        description: `Bill payment: ${bill.title} - ${bill.description}`,
      });

      // Mark bill as paid
      await supabase
        .from('bills')
        .update({
          paid: true,
          paid_at: new Date().toISOString(),
          payment_method: 'wallet'
        })
        .eq('id', bill.id);

      toast({
        title: '✅ Bill Paid',
        description: `$${billAmount.toLocaleString()} has been deducted from your wallet for: ${bill.title}`
      });

      // Refresh profile and dismiss popup
      await refreshProfile();
      await acknowledgeBill(bill.id);
      setProcessing(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[92] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md animate-fade-in">
      <div className="glass-card p-6 w-full max-w-md border-2 border-destructive/40">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-7 h-7 text-destructive flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-display font-bold text-foreground">💳 {bill.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Pending Payment Required</p>
          </div>
        </div>

        <p className="text-sm text-foreground whitespace-pre-wrap mb-4">{bill.reason}</p>

        <p className="text-sm text-muted-foreground mb-3">
          <strong>Description:</strong> {bill.description}
        </p>

        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-5">
          <p className="text-xs text-muted-foreground mb-1">Amount to Pay</p>
          <p className="text-3xl font-bold text-destructive">
            ${Number(bill.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {bill.expires_at && (
          <p className="text-xs text-warning mb-4">
            ⏰ Expires: {new Date(bill.expires_at).toLocaleDateString()}
          </p>
        )}

        <p className="text-xs text-muted-foreground mb-4 p-2 bg-warning/5 rounded border border-warning/20">
          ⚠️ This payment is required to proceed. You will keep seeing this notification until payment is completed.
        </p>

        <div className="flex gap-2">
          <button
            onClick={handlePayBill}
            disabled={processing}
            className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 px-4 py-3 rounded-lg font-medium"
          >
            {processing ? 'Processing...' : 'Pay Now'}
          </button>
          <button
            onClick={() => acknowledgeBill(bill.id)}
            className="flex-1 btn-secondary"
          >
            Remind Later
          </button>
        </div>
      </div>
    </div>
  );
}
