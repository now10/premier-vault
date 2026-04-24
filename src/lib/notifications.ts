import { supabase } from '@/integrations/supabase/client';

export type NotifType = 'info' | 'success' | 'warning' | 'error';

export interface SendNotificationParams {
  userId: string | null; // null = broadcast to all
  title: string;
  message: string;
  type?: NotifType;
  link?: string;
  forcePopup?: boolean;
  relatedRequestId?: string;
  createdBy?: string;
}

export async function sendNotification(p: SendNotificationParams) {
  return supabase.from('notifications').insert({
    user_id: p.userId,
    title: p.title,
    message: p.message,
    type: p.type ?? 'info',
    link: p.link ?? null,
    force_popup: p.forcePopup ?? false,
    related_request_id: p.relatedRequestId ?? null,
    created_by: p.createdBy ?? null,
  });
}

export async function markNotificationRead(id: string) {
  return supabase.from('notifications').update({ read: true }).eq('id', id);
}

export async function markAllRead(userId: string) {
  return supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
}

export interface PaymentMethod {
  id: string;
  code: string;
  display_name: string;
  region: string;
  currency: string;
  direction: 'deposit' | 'withdrawal' | 'both';
  fee_percent: number;
  fee_flat: number;
  min_amount: number;
  max_amount: number | null;
  processing_time: string | null;
  instructions: string | null;
  active: boolean;
}

export function calcFee(amount: number, m: Pick<PaymentMethod, 'fee_percent' | 'fee_flat'>) {
  return +(amount * (Number(m.fee_percent) / 100) + Number(m.fee_flat)).toFixed(2);
}