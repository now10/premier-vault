import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { X, Wallet } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateRef } from '@/lib/api';
import { calcFee, type PaymentMethod } from '@/lib/notifications';
import { useTranslation } from 'react-i18next';

interface Props { open: boolean; onClose: () => void; }

export default function DepositModal({ open, onClose }: Props) {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [currency, setCurrency] = useState<string>('USD');
  const [methodId, setMethodId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [submittedRef, setSubmittedRef] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from('payment_methods')
      .select('*')
      .in('direction', ['deposit', 'both'])
      .eq('active', true)
      .order('display_order')
      .then(({ data }) => setMethods((data ?? []) as any));
  }, [open]);

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
  const credited = numAmount - fee;

  const validate = () => {
    if (!selected) return 'Please select a payment method.';
    if (numAmount <= 0) return 'Enter a valid amount.';
    if (numAmount < Number(selected.min_amount)) return `Minimum is ${selected.min_amount} ${currency}.`;
    if (selected.max_amount && numAmount > Number(selected.max_amount))
      return `Maximum is ${selected.max_amount} ${currency}.`;
    return null;
  };

  const handleProceed = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setStep('confirm');
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    const ref = generateRef();
    const { data: req, error: reqErr } = await supabase
      .from('deposit_requests')
      .insert({
        user_id: user.id,
        amount: numAmount,
        payment_method: selected.code,
        payment_method_id: selected.id,
        currency,
        region: selected.region,
        fee,
        net_amount: credited,
        payment_reference: reference || null,
        status: 'Pending',
      })
      .select()
      .single();

    if (reqErr) {
      toast({ title: 'Error', description: reqErr.message, variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'Deposit',
      amount: numAmount,
      fee,
      status: 'Pending',
      reference: ref,
      description: `Deposit via ${selected.display_name} (${currency}) — pending review`,
      related_request_id: req.id,
    });

    setSubmittedRef(ref);
    setStep('success');
    setSubmitting(false);
    toast({ title: t('deposit.submitted'), description: t('deposit.awaitingApproval') });
  };

  const handleClose = () => {
    setStep('form'); setAmount(''); setReference(''); setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="glass-card p-6 w-full max-w-lg animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold text-foreground">
            {step === 'success' ? t('deposit.submitted') : t('deposit.title')}
          </h2>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {step === 'form' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t('deposit.selectCurrency')}</label>
              <div className="flex flex-wrap gap-2">
                {currencies.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                      currency === c ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-border/60'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{t('deposit.selectMethod')}</label>
              {filteredMethods.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('deposit.noMethods')}</p>
              ) : (
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
                          <p className="text-xs text-muted-foreground">
                            {m.region} · {m.processing_time}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                          {Number(m.fee_percent) > 0 && <div>{m.fee_percent}%</div>}
                          {Number(m.fee_flat) > 0 && <div>+ {m.fee_flat} {m.currency}</div>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t('deposit.amount')} ({currency})</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(''); }}
                className="input-dark w-full"
              />
              {selected && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('deposit.minMax', { min: `${selected.min_amount} ${currency}`, max: selected.max_amount ? `${selected.max_amount} ${currency}` : '∞' })}
                </p>
              )}
            </div>

            {numAmount > 0 && selected && (
              <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t('deposit.youSend')}</span><span className="text-foreground">{numAmount.toLocaleString()} {currency}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{t('deposit.platformFee')}</span><span className="text-destructive">{fee.toFixed(2)} {currency}</span></div>
                <div className="border-t border-border my-1" />
                <div className="flex justify-between font-medium"><span className="text-foreground">{t('deposit.youReceive')}</span><span className="text-foreground">{credited.toFixed(2)} {currency}</span></div>
              </div>
            )}

            {selected?.instructions && (
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">{selected.instructions}</p>
            )}

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">{t('deposit.reference')}</label>
              <input type="text" value={reference} onChange={e => setReference(e.target.value)} placeholder="Bank ref / Tx hash" className="input-dark w-full" />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <button onClick={handleProceed} className="btn-primary w-full">{t('common.continue')}</button>
          </div>
        )}

        {step === 'confirm' && selected && (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('common.method')}</span><span className="text-foreground font-medium">{selected.display_name}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('common.amount')}</span><span className="text-foreground font-medium">{numAmount.toLocaleString()} {currency}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t('common.fee')}</span><span className="text-destructive">{fee.toFixed(2)} {currency}</span></div>
              <div className="border-t border-border my-1" />
              <div className="flex justify-between text-sm font-bold"><span className="text-foreground">{t('deposit.youReceive')}</span><span className="text-success">{credited.toFixed(2)} {currency}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('form')} className="btn-secondary flex-1">{t('common.back')}</button>
              <button onClick={handleConfirm} disabled={submitting} className="btn-primary flex-1">
                {submitting ? t('common.loading') : t('common.submit')}
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto">
              <Wallet className="w-8 h-8 text-warning" />
            </div>
            <p className="text-foreground font-semibold">{t('deposit.awaitingApproval')}</p>
            <p className="text-xs text-muted-foreground">Reference: {submittedRef}</p>
            <button onClick={handleClose} className="btn-primary w-full">{t('common.done')}</button>
          </div>
        )}
      </div>
    </div>
  );
}
