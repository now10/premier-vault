import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateUser, addTransaction, getDailyTotal } from '@/lib/storage';
import { X, CreditCard, Building2, Bitcoin } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function DepositModal({ open, onClose }: Props) {
  const { user, refreshUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'card' | 'bank' | 'crypto'>('card');
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [txRef, setTxRef] = useState('');
  const [error, setError] = useState('');

  if (!open || !user) return null;

  const numAmount = parseFloat(amount) || 0;
  const dailyTotal = getDailyTotal(user.id, 'Deposit');

  const validate = () => {
    if (numAmount <= 0) return 'Enter a valid amount.';
    if (numAmount < 100) return 'Minimum deposit is $100.';
    if (numAmount > 50000) return 'Maximum deposit is $50,000 per transaction.';
    if (dailyTotal + numAmount > 50000) return `Daily deposit limit is $50,000. You've deposited $${dailyTotal.toLocaleString()} today.`;
    return null;
  };

  const handleProceed = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setStep('confirm');
  };

  const handleConfirm = () => {
    const newBalance = user.walletBalance + numAmount;
    updateUser(user.id, { walletBalance: newBalance });
    const tx = addTransaction(user.id, { type: 'Deposit', amount: numAmount, status: 'Completed', description: `Deposit via ${method}` });
    setTxRef(tx?.reference || '');
    refreshUser();
    setStep('success');
    toast({ title: '✅ Deposit Successful', description: `$${numAmount.toLocaleString()} has been added to your wallet.` });
  };

  const handleClose = () => {
    setStep('form');
    setAmount('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="glass-card p-6 w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold text-foreground">
            {step === 'success' ? 'Deposit Complete' : 'Deposit Funds'}
          </h2>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {step === 'form' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Amount (USD)</label>
              <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setError(''); }} placeholder="Min $100" className="input-dark w-full" />
              <p className="text-xs text-muted-foreground mt-1">Min: $100 · Max: $50,000</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {([['card', CreditCard, 'Card'], ['bank', Building2, 'Bank'], ['crypto', Bitcoin, 'Crypto']] as const).map(([key, Icon, label]) => (
                  <button key={key} onClick={() => setMethod(key)} className={`p-3 rounded-lg border text-center text-xs transition-all ${method === key ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-border/60'}`}>
                    <Icon className="w-5 h-5 mx-auto mb-1" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button onClick={handleProceed} className="btn-primary w-full">Continue</button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Amount</span><span className="text-foreground font-medium">${numAmount.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Method</span><span className="text-foreground font-medium capitalize">{method}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Fee</span><span className="text-success font-medium">$0.00</span></div>
              <div className="border-t border-border my-2" />
              <div className="flex justify-between"><span className="text-foreground font-medium">Total</span><span className="text-foreground font-bold">${numAmount.toLocaleString()}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('form')} className="btn-secondary flex-1">Back</button>
              <button onClick={handleConfirm} className="btn-primary flex-1">Confirm Deposit</button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
              <span className="text-3xl">✅</span>
            </div>
            <p className="text-foreground font-semibold">Deposit Successful!</p>
            <p className="text-muted-foreground text-sm">${numAmount.toLocaleString()} has been added to your wallet.</p>
            <p className="text-xs text-muted-foreground">Reference: {txRef}</p>
            <button onClick={handleClose} className="btn-primary w-full">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
