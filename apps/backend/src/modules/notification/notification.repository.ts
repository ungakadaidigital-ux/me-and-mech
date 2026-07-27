import { getAdminClient } from '../../db/admin-client';
import { rowToCamel } from '../../lib/case-mapping';

/**
 * notification_log and whatsapp_opt_out have zero client RLS policies —
 * this repository always uses the admin client, never a user-scoped one.
 * There is no "attachRepositories" equivalent for this module; every
 * caller (webhooks, cron triggers, the invoice send-whatsapp route) goes
 * through NotificationService, which owns this repository internally.
 */
export class NotificationRepository {
  private get client() {
    return getAdminClient();
  }

  async wasSentToday(phone: string, templateId: string): Promise<boolean> {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await this.client
      .from('notification_log')
      .select('id')
      .eq('phone', phone)
      .eq('template_id', templateId)
      .gte('sent_at', `${today}T00:00:00.000Z`)
      .limit(1);
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  }

  async countSentInLast24h(phone: string): Promise<number> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await this.client
      .from('notification_log')
      .select('id', { count: 'exact', head: true })
      .eq('phone', phone)
      .gte('sent_at', since);
    if (error) throw error;
    return count ?? 0;
  }

  async isOptedOut(phone: string): Promise<boolean> {
    const { data, error } = await this.client.from('whatsapp_opt_out').select('phone').eq('phone', phone).maybeSingle();
    if (error) throw error;
    return !!data;
  }

  async optOut(phone: string, reason: string): Promise<void> {
    await this.client.from('whatsapp_opt_out').insert({ phone, reason });
  }

  async logSend(params: {
    workshopId: string;
    templateId: string;
    phone: string;
    status: 'queued' | 'sent' | 'failed';
    watiMsgId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const { data, error } = await this.client
      .from('notification_log')
      .insert({
        workshop_id: params.workshopId,
        template_id: params.templateId,
        phone: params.phone,
        status: params.status,
        wati_msg_id: params.watiMsgId,
        metadata: params.metadata,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToCamel(data);
  }

  async updateDeliveryStatus(watiMsgId: string, status: 'delivered' | 'read'): Promise<void> {
    const field = status === 'delivered' ? 'delivered_at' : 'read_at';
    await this.client.from('notification_log').update({ status, [field]: new Date().toISOString() }).eq('wati_msg_id', watiMsgId);
  }
}
