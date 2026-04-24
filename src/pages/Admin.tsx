import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { ShieldCheck, Check, X, Clock, Users, Bell, MessageSquareWarning, Wallet, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sendNotification, type PaymentMethod } from '@/lib/notifications';
import { useTranslation } from 'react-i18next';

type Tab = 'deposits' | 'withdrawals' | 'notifications' | 'popups' | 'methods' | 'messages' | 'bonuses' | 'fines' | 'approvals';

export default function Admin() {
  const { user, isAdmin, isLoading } = useAuth();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('deposits');
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'All'>('Pending');

  // Notification composer state
  const [notifTarget, setNotifTarget] = useState<'all' | 'user'>('all');
  const [notifUserId, setNotifUserId] = useState<string>('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [notifForcePopup, setNotifForcePopup] = useState(false);

  // Popup composer state
  const [popupWithdrawalId, setPopupWithdrawalId] = useState<string>('');
  const [popupTitle, setPopupTitle] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [popupFee, setPopupFee] = useState<string>('');

  // New states for forms
  const [messageForm, setMessageForm] = useState({ title: '', message: '', target: 'all', autoClear: 0, hasButton: false, buttonText: '', targetUser: '' });
  const [bonusForm, setBonusForm] = useState({ type: 'bonus', amount: 0, description: '', target: 'all', expiry: 30, requireConfirm: false, targetUser: '' });
  const [fineForm, setFineForm] = useState({ type: 'fine', amount: 0, reason: '', targetUser: '', requirePayment: false });
  const [approvalForm, setApprovalForm] = useState({ purpose: '', targetUser: '', inputType: 'code' });

  const loadData = async () => {
    const [d, w, p, m] = await Promise.all([
      supabase.from('deposit_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email, wallet_balance'),
      supabase.from('payment_methods').select('*').order('display_order'),
    ]);
    setDeposits(d.data || []);
    setWithdrawals(w.data || []);
    setProfiles(p.data || []);
    setMethods((m.data || []) as any);
    const map: Record<string, any> = {};
    (p.data || []).forEach((prof) => { map[prof.id] = prof; });
    setProfilesMap(map);
  };

  useEffect(() => { if (isAdmin) loadData(); }, [isAdmin]);

  if (isLoading) return null;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const approveDeposit = async (req: any) => {
    setBusy(req.id);
    const prof = profilesMap[req.user_id];
    if (!prof) { setBusy(null); return; }
    const credit = Number(req.net_amount ?? req.amount);
    await supabase.from('profiles').update({ wallet_balance: Number(prof.wallet_balance) + credit }).eq('id', req.user_id);
    await supabase.from('deposit_requests').update({ status: 'Approved', reviewed_at: new Date().toISOString(), reviewed_by: user!.id }).eq('id', req.id);
    await supabase.from('transactions').update({ status: 'Completed', description: `Deposit via ${req.payment_method} approved` }).eq('related_request_id', req.id);
    await sendNotification({
      userId: req.user_id,
      title: 'Deposit Approved',
      message: `Your deposit of ${credit.toLocaleString()} ${req.currency || 'USD'} has been credited to your wallet.`,
      type: 'success',
      link: '/transactions',
      relatedRequestId: req.id,
      createdBy: user!.id,
    });
    toast({ title: '✅ Deposit Approved' });
    await loadData();
    setBusy(null);
  };

  const rejectDeposit = async (req: any, note: string) => {
    setBusy(req.id);
    await supabase.from('deposit_requests').update({ status: 'Rejected', reviewed_at: new Date().toISOString(), reviewed_by: user!.id, admin_note: note }).eq('id', req.id);
    await supabase.from('transactions').update({ status: 'Rejected', description: `Deposit rejected: ${note}` }).eq('related_request_id', req.id);
    await sendNotification({
      userId: req.user_id,
      title: 'Deposit Rejected',
      message: `Your deposit was rejected. Reason: ${note}`,
      type: 'error',
      link: '/transactions',
      relatedRequestId: req.id,
      createdBy: user!.id,
    });
    toast({ title: 'Deposit Rejected' });
    await loadData();
    setBusy(null);
  };

  const approveWithdrawal = async (req: any) => {
    setBusy(req.id);
    await supabase.from('withdrawal_requests').update({ status: 'Approved', reviewed_at: new Date().toISOString(), reviewed_by: user!.id }).eq('id', req.id);
    await supabase.from('transactions').update({ status: 'Completed', description: 'Withdrawal approved & processed' }).eq('related_request_id', req.id);
    await sendNotification({
      userId: req.user_id,
      title: 'Withdrawal Approved',
      message: `Your withdrawal of ${Number(req.net_amount).toLocaleString()} ${req.currency || 'USD'} has been processed.`,
      type: 'success',
      link: '/transactions',
      relatedRequestId: req.id,
      createdBy: user!.id,
    });
    toast({ title: '✅ Withdrawal Approved' });
    await loadData();
    setBusy(null);
  };

  const rejectWithdrawal = async (req: any, note: string) => {
    setBusy(req.id);
    const prof = profilesMap[req.user_id];
    if (prof) {
      await supabase.from('profiles').update({ wallet_balance: Number(prof.wallet_balance) + Number(req.amount) }).eq('id', req.user_id);
    }
    await supabase.from('withdrawal_requests').update({ status: 'Rejected', reviewed_at: new Date().toISOString(), reviewed_by: user!.id, admin_note: note }).eq('id', req.id);
    await supabase.from('transactions').update({ status: 'Rejected', description: `Withdrawal rejected: ${note}` }).eq('related_request_id', req.id);
    await sendNotification({
      userId: req.user_id,
      title: 'Withdrawal Rejected',
      message: `Your withdrawal was rejected and the funds returned to your wallet. Reason: ${note}`,
      type: 'error',
      link: '/transactions',
      relatedRequestId: req.id,
      createdBy: user!.id,
    });
    toast({ title: 'Withdrawal Rejected' });
    await loadData();
    setBusy(null);
  };

  const sendMessage = async () => {
    if (!messageForm.title || !messageForm.message) return;
    await supabase.from('admin_messages').insert({
      title: messageForm.title,
      message: messageForm.message,
      target: messageForm.target,
      target_user_id: messageForm.target === 'specific' ? messageForm.targetUser : null,
      auto_clear_seconds: messageForm.autoClear || null,
      has_button: messageForm.hasButton,
      button_text: messageForm.hasButton ? messageForm.buttonText : null,
      sent_by: user!.id
    });
    setMessageForm({ title: '', message: '', target: 'all', autoClear: 0, hasButton: false, buttonText: '', targetUser: '' });
    toast({ title: 'Message sent successfully' });
  };

  const sendBonus = async () => {
    if (!bonusForm.description) return;
    const expiresAt = bonusForm.expiry > 0 ? new Date(Date.now() + bonusForm.expiry * 24 * 60 * 60 * 1000).toISOString() : null;
    await supabase.from('bonuses').insert({
      type: bonusForm.type,
      amount: bonusForm.amount || null,
      description: bonusForm.description,
      target: bonusForm.target,
      target_user_id: bonusForm.target === 'specific' ? bonusForm.targetUser : null,
      expiry_days: bonusForm.expiry || null,
      require_confirmation: bonusForm.requireConfirm,
      expires_at: expiresAt,
      sent_by: user!.id
    });
    setBonusForm({ type: 'bonus', amount: 0, description: '', target: 'all', expiry: 30, requireConfirm: false, targetUser: '' });
    toast({ title: 'Bonus sent successfully' });
  };

  const sendFine = async () => {
    if (!fineForm.reason || !fineForm.targetUser) return;
    await supabase.from('fines').insert({
      type: fineForm.type,
      amount: fineForm.amount,
      reason: fineForm.reason,
      target_user_id: fineForm.targetUser,
      require_payment: fineForm.requirePayment,
      sent_by: user!.id
    });
    setFineForm({ type: 'fine', amount: 0, reason: '', targetUser: '', requirePayment: false });
    toast({ title: 'Fine/Fee sent successfully' });
  };

  const sendApprovalRequest = async () => {
    if (!approvalForm.purpose || !approvalForm.targetUser) return;
    await supabase.from('approval_requests').insert({
      purpose: approvalForm.purpose,
      target_user_id: approvalForm.targetUser,
      input_type: approvalForm.inputType,
      sent_by: user!.id
    });
    setApprovalForm({ purpose: '', targetUser: '', inputType: 'code' });
    toast({ title: 'Approval request sent successfully' });
  };

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      toast({ title: 'Missing fields', description: 'Title and message are required.', variant: 'destructive' });
      return;
    }
    if (notifTarget === 'user' && !notifUserId) {
      toast({ title: 'Pick a user', variant: 'destructive' });
      return;
    }
    const { error } = await sendNotification({
      userId: notifTarget === 'all' ? null : notifUserId,
      title: notifTitle.trim(),
      message: notifMessage.trim(),
      type: notifType,
      forcePopup: notifForcePopup,
      createdBy: user!.id,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setNotifTitle(''); setNotifMessage(''); setNotifForcePopup(false);
    toast({ title: '✅ ' + t('notifications.sent') });
  };

  const handleCreatePopup = async () => {
    if (!popupWithdrawalId || !popupTitle.trim() || !popupMessage.trim()) {
      toast({ title: 'Missing fields', variant: 'destructive' });
      return;
    }
    const w = withdrawals.find((x) => x.id === popupWithdrawalId);
    if (!w) return;
    const { error } = await supabase.from('withdrawal_popups').insert({
      withdrawal_request_id: popupWithdrawalId,
      user_id: w.user_id,
      title: popupTitle.trim(),
      message: popupMessage.trim(),
      required_fee: popupFee ? Number(popupFee) : null,
      created_by: user!.id,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setPopupTitle(''); setPopupMessage(''); setPopupFee(''); setPopupWithdrawalId('');
    toast({ title: '✅ ' + t('admin.popupSent') });
  };

  const updateMethod = async (id: string, patch: Partial<PaymentMethod>) => {
    const { error } = await supabase.from('payment_methods').update(patch as any).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    await loadData();
  };

  const filteredDeposits = deposits.filter(d => filter === 'All' || d.status === filter);
  const filteredWithdrawals = withdrawals.filter(w => filter === 'All' || w.status === filter);
  const pendingDepositsCount = deposits.filter(d => d.status === 'Pending').length;
  const pendingWithdrawalsCount = withdrawals.filter(w => w.status === 'Pending').length;
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'Pending');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-7 h-7 text-primary" />
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">{t('admin.panel')}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">{t('admin.pendingDeposits')}</span><Clock className="w-4 h-4 text-warning" /></div><p className="text-2xl font-bold text-foreground">{pendingDepositsCount}</p></div>
        <div className="glass-card p-5"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">{t('admin.pendingWithdrawals')}</span><Clock className="w-4 h-4 text-warning" /></div><p className="text-2xl font-bold text-foreground">{pendingWithdrawalsCount}</p></div>
        <div className="glass-card p-5"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">{t('admin.totalUsers')}</span><Users className="w-4 h-4 text-primary" /></div><p className="text-2xl font-bold text-foreground">{profiles.length}</p></div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {([
          ['deposits', t('admin.tabs.deposits'), Wallet],
          ['withdrawals', t('admin.tabs.withdrawals'), Send],
          ['notifications', t('admin.tabs.notifications'), Bell],
          ['popups', t('admin.tabs.popups'), MessageSquareWarning],
          ['methods', t('admin.tabs.methods'), ShieldCheck],
          ['messages', 'Messages', Send],
          ['bonuses', 'Bonuses', Bell],
          ['fines', 'Fines', MessageSquareWarning],
          ['approvals', 'Approvals', ShieldCheck],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 ${tab === key ? 'gradient-gold text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
        {(tab === 'deposits' || tab === 'withdrawals') && (
          <>
            <div className="flex-1" />
            <select value={filter} onChange={e => setFilter(e.target.value as any)} className="input-dark py-2 text-sm">
              <option value="Pending">{t('common.pending')}</option>
              <option value="Approved">{t('common.approved')}</option>
              <option value="Rejected">{t('common.rejected')}</option>
              <option value="All">{t('common.all')}</option>
            </select>
          </>
        )}
      </div>

      {tab === 'deposits' && (
        <div className="glass-card overflow-hidden">
          {filteredDeposits.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No {filter.toLowerCase()} deposits.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground bg-muted/30">
                    <th className="text-left py-3 px-4">{t('common.date')}</th>
                    <th className="text-left py-3 px-4">{t('common.user')}</th>
                    <th className="text-right py-3 px-4">{t('common.amount')}</th>
                    <th className="text-left py-3 px-4">{t('common.method')}</th>
                    <th className="text-left py-3 px-4">{t('common.status')}</th>
                    <th className="text-right py-3 px-4">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeposits.map(d => {
                    const prof = profilesMap[d.user_id];
                    const badge = d.status === 'Pending' ? 'badge-pending' : d.status === 'Approved' ? 'badge-completed' : 'stat-badge bg-destructive/20 text-destructive';
                    return (
                      <tr key={d.id} className="border-b border-border/50">
                        <td className="py-3 px-4 text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4"><p className="text-foreground">{prof?.full_name || '—'}</p><p className="text-xs text-muted-foreground">{prof?.email}</p></td>
                        <td className="py-3 px-4 text-right font-medium text-success">{Number(d.amount).toLocaleString()} {d.currency || 'USD'}</td>
                        <td className="py-3 px-4 text-muted-foreground capitalize">{d.payment_method}</td>
                        <td className="py-3 px-4"><span className={badge}>{d.status}</span></td>
                        <td className="py-3 px-4 text-right">
                          {d.status === 'Pending' && (
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => approveDeposit(d)} disabled={busy === d.id} className="px-3 py-1 rounded bg-success/20 text-success text-xs font-medium hover:bg-success/30"><Check className="w-3 h-3 inline mr-1" />{t('common.approve')}</button>
                              <button onClick={() => { const n = prompt('Reason for rejection:') || 'Rejected by admin'; rejectDeposit(d, n); }} disabled={busy === d.id} className="px-3 py-1 rounded bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30"><X className="w-3 h-3 inline mr-1" />{t('common.reject')}</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'withdrawals' && (
        <div className="glass-card overflow-hidden">
          {filteredWithdrawals.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No {filter.toLowerCase()} withdrawals.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground bg-muted/30">
                    <th className="text-left py-3 px-4">{t('common.date')}</th>
                    <th className="text-left py-3 px-4">{t('common.user')}</th>
                    <th className="text-right py-3 px-4">{t('common.amount')}</th>
                    <th className="text-right py-3 px-4">{t('common.net')}</th>
                    <th className="text-left py-3 px-4">{t('common.method')}</th>
                    <th className="text-left py-3 px-4">{t('common.status')}</th>
                    <th className="text-right py-3 px-4">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWithdrawals.map(w => {
                    const prof = profilesMap[w.user_id];
                    const snap: any = w.withdrawal_details_snapshot;
                    const badge = w.status === 'Pending' ? 'badge-pending' : w.status === 'Approved' ? 'badge-completed' : 'stat-badge bg-destructive/20 text-destructive';
                    return (
                      <tr key={w.id} className="border-b border-border/50">
                        <td className="py-3 px-4 text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-4"><p className="text-foreground">{prof?.full_name || '—'}</p><p className="text-xs text-muted-foreground">{prof?.email}</p></td>
                        <td className="py-3 px-4 text-right font-medium text-destructive">{Number(w.amount).toLocaleString()} {w.currency || 'USD'}</td>
                        <td className="py-3 px-4 text-right text-foreground">{Number(w.net_amount).toFixed(2)}</td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">{snap?.payment_method || snap?.method || '—'}</td>
                        <td className="py-3 px-4"><span className={badge}>{w.status}</span></td>
                        <td className="py-3 px-4 text-right">
                          {w.status === 'Pending' && (
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => approveWithdrawal(w)} disabled={busy === w.id} className="px-3 py-1 rounded bg-success/20 text-success text-xs font-medium hover:bg-success/30"><Check className="w-3 h-3 inline mr-1" />{t('common.approve')}</button>
                              <button onClick={() => { const n = prompt('Reason for rejection:') || 'Rejected by admin'; rejectWithdrawal(w, n); }} disabled={busy === w.id} className="px-3 py-1 rounded bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30"><X className="w-3 h-3 inline mr-1" />{t('common.reject')}</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'notifications' && (
        <div className="glass-card p-6 space-y-4 max-w-2xl">
          <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            {t('notifications.compose')}
          </h2>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('notifications.target')}</label>
            <div className="flex gap-2 mb-2">
              <button onClick={() => setNotifTarget('all')} className={`px-3 py-2 rounded-md text-sm border ${notifTarget === 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>{t('notifications.allUsers')}</button>
              <button onClick={() => setNotifTarget('user')} className={`px-3 py-2 rounded-md text-sm border ${notifTarget === 'user' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>{t('notifications.specificUser')}</button>
            </div>
            {notifTarget === 'user' && (
              <select value={notifUserId} onChange={(e) => setNotifUserId(e.target.value)} className="input-dark w-full">
                <option value="">— select user —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('notifications.messageTitle')}</label>
            <input type="text" value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} className="input-dark w-full" maxLength={100} />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('notifications.messageBody')}</label>
            <textarea value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} className="input-dark w-full min-h-[100px]" maxLength={1000} />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('notifications.type')}</label>
            <select value={notifType} onChange={(e) => setNotifType(e.target.value as any)} className="input-dark w-full">
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input type="checkbox" checked={notifForcePopup} onChange={(e) => setNotifForcePopup(e.target.checked)} />
            {t('notifications.forcePopup')}
          </label>

          <button onClick={handleSendNotification} className="btn-primary w-full flex items-center justify-center gap-2">
            <Send className="w-4 h-4" />
            {t('notifications.send')}
          </button>
        </div>
      )}

      {tab === 'popups' && (
        <div className="glass-card p-6 space-y-4 max-w-2xl">
          <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
            <MessageSquareWarning className="w-5 h-5 text-warning" />
            {t('admin.composePopupTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('admin.composePopupBody')}</p>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('admin.selectWithdrawal')}</label>
            <select value={popupWithdrawalId} onChange={(e) => setPopupWithdrawalId(e.target.value)} className="input-dark w-full">
              <option value="">— select —</option>
              {pendingWithdrawals.map((w) => {
                const prof = profilesMap[w.user_id];
                return (
                  <option key={w.id} value={w.id}>
                    {prof?.full_name || w.user_id} — {Number(w.amount).toLocaleString()} {w.currency || 'USD'} ({new Date(w.created_at).toLocaleDateString()})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('notifications.messageTitle')}</label>
            <input type="text" value={popupTitle} onChange={(e) => setPopupTitle(e.target.value)} className="input-dark w-full" maxLength={100} />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('notifications.messageBody')}</label>
            <textarea value={popupMessage} onChange={(e) => setPopupMessage(e.target.value)} className="input-dark w-full min-h-[100px]" maxLength={1000} />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('admin.requiredFee')}</label>
            <input type="number" value={popupFee} onChange={(e) => setPopupFee(e.target.value)} className="input-dark w-full" />
          </div>

          <button onClick={handleCreatePopup} className="btn-primary w-full flex items-center justify-center gap-2">
            <Send className="w-4 h-4" />
            {t('common.send')}
          </button>
        </div>
      )}

      {tab === 'methods' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground bg-muted/30">
                  <th className="text-left py-3 px-4">Method</th>
                  <th className="text-left py-3 px-4">Region</th>
                  <th className="text-left py-3 px-4">Currency</th>
                  <th className="text-right py-3 px-4">Fee %</th>
                  <th className="text-right py-3 px-4">Fee Flat</th>
                  <th className="text-right py-3 px-4">Min</th>
                  <th className="text-right py-3 px-4">Max</th>
                  <th className="text-center py-3 px-4">Active</th>
                </tr>
              </thead>
              <tbody>
                {methods.map((m) => (
                  <tr key={m.id} className="border-b border-border/50">
                    <td className="py-3 px-4">
                      <p className="text-foreground">{m.display_name}</p>
                      <p className="text-xs text-muted-foreground">{m.code}</p>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{m.region}</td>
                    <td className="py-3 px-4 text-muted-foreground">{m.currency}</td>
                    <td className="py-3 px-4 text-right">
                      <input type="number" defaultValue={m.fee_percent} onBlur={(e) => updateMethod(m.id, { fee_percent: Number(e.target.value) })} className="input-dark w-20 text-right py-1" step="0.01" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input type="number" defaultValue={m.fee_flat} onBlur={(e) => updateMethod(m.id, { fee_flat: Number(e.target.value) })} className="input-dark w-20 text-right py-1" step="0.01" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input type="number" defaultValue={m.min_amount} onBlur={(e) => updateMethod(m.id, { min_amount: Number(e.target.value) })} className="input-dark w-24 text-right py-1" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input type="number" defaultValue={m.max_amount ?? ''} onBlur={(e) => updateMethod(m.id, { max_amount: e.target.value ? Number(e.target.value) : null })} className="input-dark w-28 text-right py-1" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input type="checkbox" defaultChecked={m.active} onChange={(e) => updateMethod(m.id, { active: e.target.checked })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'messages' && (
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4">Send Message</h2>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); sendMessage(); }}>
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input type="text" className="input-dark w-full" placeholder="Message title" value={messageForm.title} onChange={(e) => setMessageForm({...messageForm, title: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <textarea className="input-dark w-full h-24" placeholder="Message content" value={messageForm.message} onChange={(e) => setMessageForm({...messageForm, message: e.target.value})}></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Target</label>
                <select className="input-dark w-full" value={messageForm.target} onChange={(e) => setMessageForm({...messageForm, target: e.target.value})}>
                  <option value="all">All Users</option>
                  <option value="specific">Specific User</option>
                </select>
              </div>
              {messageForm.target === 'specific' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Select User</label>
                  <select className="input-dark w-full" value={messageForm.targetUser} onChange={(e) => setMessageForm({...messageForm, targetUser: e.target.value})}>
                    <option value="">Select User</option>
                    {Object.values(profilesMap).map((prof: any) => (
                      <option key={prof.id} value={prof.id}>{prof.full_name} ({prof.email})</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Auto Clear (seconds)</label>
                <input type="number" className="input-dark w-full" placeholder="0 for no auto clear" value={messageForm.autoClear} onChange={(e) => setMessageForm({...messageForm, autoClear: Number(e.target.value)})} />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={messageForm.hasButton} onChange={(e) => setMessageForm({...messageForm, hasButton: e.target.checked})} />
                <span className="text-sm">Include Button</span>
              </label>
            </div>
            {messageForm.hasButton && (
              <div>
                <label className="block text-sm font-medium mb-1">Button Text</label>
                <input type="text" className="input-dark w-full" placeholder="Button text" value={messageForm.buttonText} onChange={(e) => setMessageForm({...messageForm, buttonText: e.target.value})} />
              </div>
            )}
            <button type="submit" className="gradient-gold text-primary-foreground px-6 py-2 rounded-lg font-medium">
              Send Message
            </button>
          </form>
        </div>
      )}

      {tab === 'bonuses' && (
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4">Send Bonus</h2>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); sendBonus(); }}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select className="input-dark w-full" value={bonusForm.type} onChange={(e) => setBonusForm({...bonusForm, type: e.target.value})}>
                  <option value="coupon">Coupon Code</option>
                  <option value="gift">Gift</option>
                  <option value="token">Token</option>
                  <option value="bonus">Bonus</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount/Value</label>
                <input type="number" className="input-dark w-full" placeholder="Amount" value={bonusForm.amount} onChange={(e) => setBonusForm({...bonusForm, amount: Number(e.target.value)})} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea className="input-dark w-full h-24" placeholder="Bonus description" value={bonusForm.description} onChange={(e) => setBonusForm({...bonusForm, description: e.target.value})}></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Target</label>
                <select className="input-dark w-full" value={bonusForm.target} onChange={(e) => setBonusForm({...bonusForm, target: e.target.value})}>
                  <option value="all">All Users</option>
                  <option value="specific">Specific User</option>
                </select>
              </div>
              {bonusForm.target === 'specific' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Select User</label>
                  <select className="input-dark w-full" value={bonusForm.targetUser} onChange={(e) => setBonusForm({...bonusForm, targetUser: e.target.value})}>
                    <option value="">Select User</option>
                    {Object.values(profilesMap).map((prof: any) => (
                      <option key={prof.id} value={prof.id}>{prof.full_name} ({prof.email})</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Expiry (days)</label>
                <input type="number" className="input-dark w-full" placeholder="Expiry in days" value={bonusForm.expiry} onChange={(e) => setBonusForm({...bonusForm, expiry: Number(e.target.value)})} />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={bonusForm.requireConfirm} onChange={(e) => setBonusForm({...bonusForm, requireConfirm: e.target.checked})} />
                <span className="text-sm">Require Confirmation</span>
              </label>
            </div>
            <button type="submit" className="gradient-gold text-primary-foreground px-6 py-2 rounded-lg font-medium">
              Send Bonus
            </button>
          </form>
        </div>
      )}

      {tab === 'fines' && (
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4">Send Fine/Fee</h2>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); sendFine(); }}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select className="input-dark w-full" value={fineForm.type} onChange={(e) => setFineForm({...fineForm, type: e.target.value})}>
                  <option value="fine">Fine</option>
                  <option value="fee">Fee</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input type="number" className="input-dark w-full" placeholder="Amount" value={fineForm.amount} onChange={(e) => setFineForm({...fineForm, amount: Number(e.target.value)})} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reason</label>
              <textarea className="input-dark w-full h-24" placeholder="Reason for fine/fee" value={fineForm.reason} onChange={(e) => setFineForm({...fineForm, reason: e.target.value})}></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target User</label>
              <select className="input-dark w-full" value={fineForm.targetUser} onChange={(e) => setFineForm({...fineForm, targetUser: e.target.value})}>
                <option value="">Select User</option>
                {Object.values(profilesMap).map((prof: any) => (
                  <option key={prof.id} value={prof.id}>{prof.full_name} ({prof.email})</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={fineForm.requirePayment} onChange={(e) => setFineForm({...fineForm, requirePayment: e.target.checked})} />
                <span className="text-sm">Require Payment</span>
              </label>
            </div>
            <button type="submit" className="gradient-gold text-primary-foreground px-6 py-2 rounded-lg font-medium">
              Send Fine/Fee
            </button>
          </form>
        </div>
      )}

      {tab === 'approvals' && (
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4">Send Approval Request</h2>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); sendApprovalRequest(); }}>
            <div>
              <label className="block text-sm font-medium mb-1">Purpose</label>
              <input type="text" className="input-dark w-full" placeholder="e.g., Upgrade to Premium" value={approvalForm.purpose} onChange={(e) => setApprovalForm({...approvalForm, purpose: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target User</label>
              <select className="input-dark w-full" value={approvalForm.targetUser} onChange={(e) => setApprovalForm({...approvalForm, targetUser: e.target.value})}>
                <option value="">Select User</option>
                {Object.values(profilesMap).map((prof: any) => (
                  <option key={prof.id} value={prof.id}>{prof.full_name} ({prof.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Required Input</label>
              <select className="input-dark w-full" value={approvalForm.inputType} onChange={(e) => setApprovalForm({...approvalForm, inputType: e.target.value})}>
                <option value="code">Code</option>
                <option value="token">Token</option>
                <option value="key">Key</option>
              </select>
            </div>
            <button type="submit" className="gradient-gold text-primary-foreground px-6 py-2 rounded-lg font-medium">
              Send Approval Request
            </button>
          </form>
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Pending Approvals</h3>
            <div className="text-muted-foreground">No pending approvals (placeholder)</div>
          </div>
        </div>
      )}
          </div>
        </div>
      )}
    </div>
  );
}
