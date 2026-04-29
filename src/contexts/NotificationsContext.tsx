import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface AppNotification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link: string | null;
  force_popup: boolean;
  read: boolean;
  related_request_id: string | null;
  created_at: string;
}

export interface WithdrawalPopup {
  id: string;
  withdrawal_request_id: string;
  user_id: string;
  title: string;
  message: string;
  required_fee: number | null;
  acknowledged: boolean;
  created_at: string;
}

export interface BonusPopup {
  id: string;
  type: 'coupon' | 'gift' | 'token' | 'bonus';
  amount: number | null;
  description: string;
  message: string;
  target_user_id: string | null;
  expires_at: string | null;
  claimed: boolean;
  claimed_at: string | null;
  required_confirmation: boolean;
  created_at: string;
}

export interface BillPopup {
  id: string;
  title: string;
  description: string;
  amount: number;
  reason: string;
  target_user_id: string;
  paid: boolean;
  paid_at: string | null;
  payment_method: string | null;
  sent_by: string;
  created_at: string;
  expires_at: string | null;
}

interface Ctx {
  notifications: AppNotification[];
  unreadCount: number;
  pendingPopup: AppNotification | null;
  pendingWithdrawalPopup: WithdrawalPopup | null;
  pendingBonusPopup: BonusPopup | null;
  pendingBill: BillPopup | null;
  refresh: () => Promise<void>;
  acknowledgePopup: (id: string) => Promise<void>;
  acknowledgeWithdrawalPopup: (id: string) => Promise<void>;
  acknowledgeBonusPopup: (id: string) => Promise<void>;
  acknowledgeBill: (id: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationsContext = createContext<Ctx | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pendingPopup, setPendingPopup] = useState<AppNotification | null>(null);
  const [pendingWithdrawalPopup, setPendingWithdrawalPopup] = useState<WithdrawalPopup | null>(null);
  const [pendingBonusPopup, setPendingBonusPopup] = useState<BonusPopup | null>(null);
  const [pendingBill, setPendingBill] = useState<BillPopup | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setPendingPopup(null);
      setPendingWithdrawalPopup(null);
      setPendingBonusPopup(null);
      return;
    }
    const [{ data: notifs }, { data: popup }, { data: bonus }, { data: bill }] = await Promise.all([
      supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('withdrawal_popups')
        .select('*')
        .eq('user_id', user.id)
        .eq('acknowledged', false)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('bonuses')
        .select('*')
        .or(`target_user_id.eq.${user.id},target_user_id.is.null`)
        .eq('claimed', false)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('bills')
        .select('*')
        .eq('target_user_id', user.id)
        .eq('paid', false)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);
    const list = (notifs ?? []) as AppNotification[];
    setNotifications(list);
    const forced = list.find((n) => n.force_popup && !n.read && n.user_id === user.id);
    setPendingPopup(forced ?? null);
    setPendingWithdrawalPopup((popup ?? null) as WithdrawalPopup | null);
    setPendingBonusPopup((bonus ?? null) as BonusPopup | null);
    setPendingBill((bill ?? null) as BillPopup | null);
  }, [user]);

  useEffect(() => {
    refresh();
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_popups', filter: `user_id=eq.${user.id}` }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bonuses', filter: `target_user_id=eq.${user.id}` }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills', filter: `target_user_id=eq.${user.id}` }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, refresh]);

  const acknowledgePopup = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setPendingPopup(null);
    refresh();
  };

  const acknowledgeWithdrawalPopup = async (id: string) => {
    await supabase.from('withdrawal_popups').update({ acknowledged: true, acknowledged_at: new Date().toISOString() }).eq('id', id);
    setPendingWithdrawalPopup(null);
    refresh();
  };

  const acknowledgeBonusPopup = async (id: string) => {
    // Mark as acknowledged but not claimed (user clicked "Later")
    setPendingBonusPopup(null);
    refresh();
  };

  const acknowledgeBill = async (id: string) => {
    // User clicked "Remind Later" or dismisses bill; keep bill row intact (still unpaid)
    setPendingBill(null);
    refresh();
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    refresh();
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    refresh();
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, pendingPopup, pendingWithdrawalPopup, pendingBonusPopup, pendingBill, refresh, acknowledgePopup, acknowledgeWithdrawalPopup, acknowledgeBonusPopup, acknowledgeBill, markAsRead, markAllAsRead }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}