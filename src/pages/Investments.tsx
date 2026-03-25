import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateUser, addTransaction } from '@/lib/storage';
import { TrendingUp, Zap, Crown, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const plans = [
  { name: 'Starter EXCO', min: 500, max: 5000, roi: 2.5, icon: Zap, color: 'primary' },
  { name: 'Premier Elite', min: 5100, max: 20000, roi: 4.2, icon: Crown, color: 'warning' },
  { name: 'Executive Trust', min: 20100, max: 100000, roi: 6.8, icon: Shield, color: 'success' },
];

export default function Investments() {
  const { user, refreshUser } = useAuth();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!user) return null;

  const handleInvest = (plan: typeof plans[0]) => {
    const amount = parseFloat(amounts[plan.name] || '0');
    const errs: Record<string, string> = {};

    if (amount < plan.min) errs[plan.name] = `Minimum investment is $${plan.min.toLocaleString()}`;
    else if (amount > plan.max) errs[plan.name] = `Maximum investment is $${plan.max.toLocaleString()}`;
    else if (amount > user.walletBalance) errs[plan.name] = 'Insufficient wallet balance.';

    if (errs[plan.name]) { setErrors(errs); return; }

    const weeklyReturn = amount * plan.roi / 100;
    const nextPayout = new Date();
    nextPayout.setDate(nextPayout.getDate() + 7);

    const investment = {
      id: crypto.randomUUID(),
      planName: plan.name,
      amount,
      roiRate: plan.roi,
      startDate: new Date().toISOString(),
      nextPayoutDate: nextPayout.toISOString(),
      status: 'Active' as const,
      weeklyReturn,
    };

    const newInvestments = [...user.investments, investment];
    const newBalance = user.walletBalance - amount;
    updateUser(user.id, { investments: newInvestments, walletBalance: newBalance });
    addTransaction(user.id, { type: 'Investment', amount, status: 'Completed', description: `Invested in ${plan.name}` });

    refreshUser();
    setAmounts({ ...amounts, [plan.name]: '' });
    setErrors({});
    toast({ title: '🎉 Investment Successful', description: `$${amount.toLocaleString()} invested in ${plan.name}. Weekly return: $${weeklyReturn.toFixed(2)}` });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">Investment Plans</h1>
        <p className="text-muted-foreground text-sm mt-1">Choose a plan that matches your investment goals</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => {
          const Icon = plan.icon;
          return (
            <div key={plan.name} className="glass-card-hover p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg bg-${plan.color}/10 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${plan.color}`} />
                </div>
                <h3 className="text-lg font-display font-bold text-foreground">{plan.name}</h3>
              </div>

              <div className="space-y-3 mb-6 flex-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Investment Range</span>
                  <span className="text-foreground font-medium">${plan.min.toLocaleString()} - ${plan.max.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Weekly ROI</span>
                  <span className="text-success font-bold">{plan.roi}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payout</span>
                  <span className="text-foreground">Every 7 days</span>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="number"
                  value={amounts[plan.name] || ''}
                  onChange={e => { setAmounts({ ...amounts, [plan.name]: e.target.value }); setErrors({}); }}
                  placeholder={`$${plan.min.toLocaleString()} - $${plan.max.toLocaleString()}`}
                  className="input-dark w-full"
                />
                {errors[plan.name] && <p className="text-xs text-destructive">{errors[plan.name]}</p>}
                <button onClick={() => handleInvest(plan)} className="btn-primary w-full text-sm">
                  Invest Now
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Investments */}
      {user.investments.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-display font-semibold text-foreground mb-4">Your Investments</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-3 px-2">Plan</th>
                  <th className="text-left py-3 px-2">Amount</th>
                  <th className="text-left py-3 px-2">ROI Rate</th>
                  <th className="text-left py-3 px-2">Weekly Return</th>
                  <th className="text-left py-3 px-2 hidden sm:table-cell">Next Payout</th>
                  <th className="text-left py-3 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {user.investments.map(inv => (
                  <tr key={inv.id} className="border-b border-border/50">
                    <td className="py-3 px-2 font-medium text-foreground">{inv.planName}</td>
                    <td className="py-3 px-2 text-foreground">${inv.amount.toLocaleString()}</td>
                    <td className="py-3 px-2 text-primary">{inv.roiRate}%</td>
                    <td className="py-3 px-2 text-success">${inv.weeklyReturn.toFixed(2)}</td>
                    <td className="py-3 px-2 text-muted-foreground hidden sm:table-cell">{new Date(inv.nextPayoutDate).toLocaleDateString()}</td>
                    <td className="py-3 px-2"><span className="badge-active">{inv.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
