import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { X, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateRef, getDailyTotal, createVerificationCode, verifyCode } from '@/lib/api';
import { calcFee, type PaymentMethod } from '@/lib/notifications';
import { useTranslation } from 'react-i18next';

interface Props { open: boolean; onClose: () => void; }

export default function WithdrawalModal({ open, onClose }: Props) {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [methodId, setMethodId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'form' | 'feeNotice' | 'verify' | 'success'>('form');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60);
  const [submittedRef, setSubmittedRef] = useState('');
  const [details, setDetails] = useState<any>(null);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    supabase.from('withdrawal_details').select('*').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setDetails(data));
    getDailyTotal(user.id, 'Withdrawal').then(setDailyTotal);
    supabase
      .from('payment_methods')
      .select('*')
      .in('direction', ['withdrawal', 'both'])
      .eq('active', true)
      .order('display_order')
      .then(({ data }) => setMethods((data ?? []) as any));
  }, [open, user]);

  useEffect(() => {
    if (step === 'verify' && timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [step, timer]);

  const currencies = useMemo(
    () => Array.from(new Set(methods.map((m) => m.currency))),
    [methods]
  );

  const filteredMethods = useMemo(
    () => methods.filter((m) => m.currency === currency),
    [methods, currency]
  );

  useEffect(() => {
    if (filteredMethods.length && !filteredMethods.find((m) => m.id === methodId)) {
      setMethodId(filteredMethods[0].id);
    }
  }, [filteredMethods, methodId]);

  if (!open || !user || !profile) return null;

  const numAmount = parseFloat(amount) || 0;
  const selected = filteredMethods.find((m) => m.id === methodId);
  const fee = selected ? calcFee(numAmount, selected) : 0;
  const net = numAmount - fee;

  const validate = () => {
    if (!selected) return 'Please select a withdrawal method.';
    if (numAmount <= 0) return 'Enter a valid amount.';
    if (numAmount < Number(selected.min_amount)) return `Minimum is ${selected.min_amount} ${currency}.`;
    if (selected.max_amount && numAmount > Number(selected.max_amount))
      return `Maximum is ${selected.max_amount} ${currency}.`;
    if (numAmount > Number(profile.wallet_balance)) return 'Insufficient balance.';
    return null;
  };

  const sendCode = async () => {
    const c = await createVerificationCode(user.id, 'withdrawal');
    setTimer(60);
    toast({ title: '📧 Verification Code Sent', description: `Code: ${c}` });
  };

  const handleProceed = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setStep('feeNotice');
  };

  const handleAcknowledgeFee = async () => {
    await sendCode();
    setStep('verify');
  };

  const handleVerify = async () => {
    if (!selected) return;
    const ok = await verifyCode(user.id, code, 'withdrawal');
    if (!ok) { setError('Invalid or expired verification code.'); return; }

    setSubmitting(true);
    const ref = generateRef();

    const { error: balErr } = await supabase.from('profiles')
      .update({ wallet_balance: Number(profile.wallet_balance) - numAmount })
      .eq('id', user.id);
    if (balErr) { toast({ title: 'Error', description: balErr.message, variant: 'destructive' }); setSubmitting(false); return; }

    const { data: req, error: reqErr } = await supabase.from('withdrawal_requests').insert({
      user_id: user.id,
      amount: numAmount,
      fee,
      net_amount: net,
      currency,
      payment_method_id: selected.id,
      region: selected.region,
      withdrawal_details_snapshot: { ...details, payment_method: selected.display_name, currency },
      status: 'Pending',
    }).select().single();

    if (reqErr) {
      await supabase.from('profiles').update({ wallet_balance: Number(profile.wallet_balance) }).eq('id', user.id);
      toast({ title: 'Error', description: reqErr.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    await supabase.from('transactions').insert({
      user_id: user.id, type: 'Withdrawal', amount: numAmount, fee, status: 'Pending',
      reference: ref,
      description: `Withdrawal via ${selected.display_name} (${currency}) — Fee: ${fee.toFixed(2)} ${currency}`,
      related_request_id: req.id,
    });

    setSubmittedRef(ref);
    setStep('success');
    setSubmitting(false);
    toast({ title: t('withdrawal.submitted'), description: t('withdrawal.awaitingApproval') });
  };

  const handleClose = () => {
    setStep('form'); setAmount(''); setCode(''); setError('');
    onClose();
  };

  const hasDetails = !!details;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="glass-card p-6 w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold text-foreground">
            {step === 'success' ? t('withdrawal.submitted') : t('withdrawal.title')}
          </h2>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {!hasDetails && step === 'form' && (
          <p className="text-sm text-muted-foreground bg-warning/10 border border-warning/30 p-3 rounded-lg">
            Register your withdrawal details first in the "Withdrawal Details" page.
          </p>
        )}

        {step === 'form' && hasDetails && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t('common.currency')}</label>
              <div className="flex flex-wrap gap-2">
                {currencies.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                      currency === c ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{t('withdrawal.selectMethod')}</label>
              <div className="space-y-2">
                {filteredMethods.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMethodId(m.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      methodId === m.id ? 'border-primary bg-primary/10' : 'border-border hover:border-border/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm">{m.display_name}</p>
                        <p className="text-xs text-muted-foreground">{m.region} · {m.processing_time}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                        {Number(m.fee_percent) > 0 && <div>{m.fee_percent}%</div>}
                        {Number(m.fee_flat) > 0 && <div>+ {m.fee_flat} {m.currency}</div>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t('withdrawal.amount')} ({currency})</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(''); }}
                className="input-dark w-full"
              />
            </div>

            {numAmount > 0 && selected && (
              <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t('common.amount')}</span><span className="text-foreground">{numAmount.toLocaleString()} {currency}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('common.fee')}</span><span className="text-destructive">{fee.toFixed(2)} {currency}</span></div>
                <div className="border-t border-border my-1" />
                <div className="flex justify-between font-medium"><span className="text-foreground">{t('withdrawal.youReceive')}</span><span className="text-foreground">{net.toFixed(2)} {currency}</span></div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            <button onClick={handleProceed} className="btn-primary w-full">{t('common.continue')}</button>
          </div>
        )}

        {step === 'feeNotice' && selected && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-warning/10 border border-warning/30 rounded-lg p-4">
              <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground">{t('withdrawal.feeNotice')}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Before this withdrawal of <strong className="text-foreground">{numAmount.toLocaleString()} {currency}</strong> can be processed,
                  a fee of <strong className="text-warning">{fee.toFixed(2)} {currency}</strong> will be deducted.
                </p>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('common.method')}</span><span className="text-foreground font-medium">{selected.display_name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('common.amount')}</span><span className="text-foreground">{numAmount.toLocaleString()} {currency}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('common.fee')}</span><span className="text-destructive">{fee.toFixed(2)} {currency}</span></div>
              <div className="border-t border-border my-1" />
              <div className="flex justify-between text-sm font-bold"><span className="text-foreground">{t('withdrawal.youReceive')}</span><span className="text-success">{net.toFixed(2)} {currency}</span></div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('form')} className="btn-secondary flex-1">{t('common.back')}</button>
              <button onClick={handleAcknowledgeFee} className="btn-primary flex-1">{t('withdrawal.iAcknowledge')}</button>
            </div>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('withdrawal.enterCode')}</p>
            <input type="text" maxLength={6} value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }} placeholder="000000" className="input-dark w-full text-center text-2xl tracking-widest" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{timer > 0 ? t('withdrawal.resendIn', { seconds: timer }) : ''}</span>
              {timer === 0 && <button onClick={sendCode} className="text-primary hover:underline">{t('withdrawal.resend')}</button>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setStep('feeNotice'); setError(''); }} className="btn-secondary flex-1">{t('common.back')}</button>
              <button onClick={handleVerify} disabled={code.length !== 6 || submitting} className="btn-primary flex-1">
                {submitting ? t('common.loading') : t('withdrawal.verifyAndSubmit')}
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto">
              <span className="text-3xl">⏳</span>
            </div>
            <p className="text-foreground font-semibold">{t('withdrawal.awaitingApproval')}</p>
            <p className="text-xs text-muted-foreground">Reference: {submittedRef}</p>
            <button onClick={handleClose} className="btn-primary w-full">{t('common.done')}</button>
          </div>
        )}
      </div>
    </div>
  );
}
