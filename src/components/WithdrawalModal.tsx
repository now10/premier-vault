import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateUser, addTransaction, getDailyTotal, generateCode, storeVerificationCode, getVerificationCode, clearVerificationCode } from '@/lib/storage';
import { X, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function WithdrawalModal({ open, onClose }: Props) {
  const { user, refreshUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'form' | 'verify' | 'success'>('form');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60);
  const [txRef, setTxRef] = useState('');

  useEffect(() => {
    if (step === 'verify' && timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [step, timer]);

  if (!open || !user || !user.withdrawalDetails) return null;

  const numAmount = parseFloat(amount) || 0;
  const fee = numAmount * 0.02;
  const totalDeduction = numAmount + fee;
  const dailyTotal = getDailyTotal(user.id, 'Withdrawal');

  const wd = user.withdrawalDetails;
  const methodSummary = wd.method === 'bank'
    ? `Bank: ${wd.bankName} · ****${wd.accountNumber?.slice(-4)}`
    : `${wd.network} · ${wd.walletAddress?.slice(0, 8)}...${wd.walletAddress?.slice(-6)}`;

  const validate = () => {
    if (numAmount <= 0) return 'Enter a valid amount.';
    if (numAmount < 50) return 'Minimum withdrawal is $50.';
    if (numAmount > 10000) return 'Maximum withdrawal is $10,000 per transaction.';
    if (totalDeduction > user.walletBalance) return 'Insufficient balance (including 2% fee).';
    if (dailyTotal + numAmount > 20000) return `Daily withdrawal limit is $20,000. You've withdrawn $${dailyTotal.toLocaleString()} today.`;
    return null;
  };

  const sendCode = () => {
    const c = generateCode();
    storeVerificationCode(user.email, c);
    setTimer(60);
    toast({ title: '📧 Verification Code Sent', description: `Code sent to ${user.email}: ${c}` });
  };

  const handleProceed = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    sendCode();
    setStep('verify');
  };

  const handleVerify = () => {
    const stored = getVerificationCode();
    if (!stored || stored.code !== code) { setError('Invalid verification code.'); return; }

    clearVerificationCode();
    const newBalance = user.walletBalance - totalDeduction;
    updateUser(user.id, { walletBalance: newBalance });
    const tx = addTransaction(user.id, { type: 'Withdrawal', amount: numAmount, status: 'Pending', description: `Withdrawal to ${wd.method === 'bank' ? wd.bankName : wd.network} (Fee: $${fee.toFixed(2)})` });
    setTxRef(tx?.reference || '');
    refreshUser();
    setStep('success');
    toast({ title: '✅ Withdrawal Initiated', description: `$${numAmount.toLocaleString()} withdrawal is being processed.` });
  };

  const handleClose = () => {
    setStep('form');
    setAmount('');
    setCode('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="glass-card p-6 w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold text-foreground">
            {step === 'success' ? 'Withdrawal Initiated' : 'Withdraw Funds'}
          </h2>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {step === 'form' && (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-3 text-sm">
              <p className="text-muted-foreground mb-1">Withdrawal Method</p>
              <p className="text-foreground font-medium">{methodSummary}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Amount (USD)</label>
              <input type="number" value={amount} onChange={e => { setAmount(e.target.value); setError(''); }} placeholder="Min $50" className="input-dark w-full" />
              <p className="text-xs text-muted-foreground mt-1">Min: $50 · Max: $10,000 · Fee: 2%</p>
            </div>

            {numAmount > 0 && (
              <div className="bg-muted rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="text-foreground">${numAmount.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fee (2%)</span><span className="text-destructive">${fee.toFixed(2)}</span></div>
                <div className="border-t border-border my-1" />
                <div className="flex justify-between font-medium"><span className="text-foreground">Total Deduction</span><span className="text-foreground">${totalDeduction.toFixed(2)}</span></div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <button onClick={handleProceed} className="btn-primary w-full">Continue</button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to your email.</p>
            <input type="text" maxLength={6} value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }} placeholder="000000" className="input-dark w-full text-center text-2xl tracking-widest" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{timer > 0 ? `Resend in ${timer}s` : ''}</span>
              {timer === 0 && <button onClick={sendCode} className="text-primary hover:underline">Resend Code</button>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setStep('form'); setError(''); }} className="btn-secondary flex-1">Back</button>
              <button onClick={handleVerify} disabled={code.length !== 6} className="btn-primary flex-1">Verify & Withdraw</button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
              <span className="text-3xl">✅</span>
            </div>
            <p className="text-foreground font-semibold">Withdrawal Initiated!</p>
            <p className="text-muted-foreground text-sm">Your withdrawal of ${numAmount.toLocaleString()} is being processed.</p>
            <p className="text-xs text-muted-foreground">Estimated processing: 24-48 hours</p>
            <p className="text-xs text-muted-foreground">Reference: {txRef}</p>
            <button onClick={handleClose} className="btn-primary w-full">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
