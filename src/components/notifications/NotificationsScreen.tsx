"use client";

import Link from "next/link";
import { BellOff, CheckCircle2, Clock3, FileQuestionMark, Flag, Gauge, Gift, Mail, Moon, ShieldAlert, TrendingUp, Unplug, Wallet, XCircle, Zap, type LucideIcon } from "lucide-react";
import { Card } from "@/components/shared/Card";
import { EmptyState } from "@/components/shared/Controls";
import { PageHeader } from "@/components/shared/PageHeader";
import { useFamily } from "@/context/FamilyContext";
import { fmtDay, plural } from "@/lib/format";
import type { AppNotification, NotificationIcon, NotificationTone } from "@/lib/notifications";

const ICONS: Record<NotificationIcon, LucideIcon> = {
  flag: Flag,
  clock: Clock3,
  bolt: Zap,
  plug: Unplug,
  x: XCircle,
  check: CheckCircle2,
  trend: TrendingUp,
  gift: Gift,
  moon: Moon,
  shield: ShieldAlert,
  mail: Mail,
  gauge: Gauge,
  wallet: Wallet,
  file: FileQuestionMark,
};

const TONES: Record<NotificationTone, string> = {
  alert: "bg-alert-bg text-alert",
  warning: "bg-warning-bg text-warning",
  info: "bg-surface-2 text-pago-blue",
  success: "bg-success-bg text-success",
};

export function NotificationsScreen() {
  const { notifications, readNotifications, markNotificationsRead } = useFamily();
  const unread = notifications.filter((n) => !readNotifications.includes(n.id));
  const read = notifications.filter((n) => readNotifications.includes(n.id));

  return (
    <div className="flex flex-col gap-3">
      <PageHeader title="Notificări" subtitle={unread.length ? plural(unread.length, "necitită", "necitite") : "Ești la zi"} back="/" />

      {notifications.length === 0 ? (
        <EmptyState icon={BellOff} title="Nicio notificare" text="Te anunțăm aici când apare o factură, se apropie o scadență sau se schimbă ceva la plățile tale." />
      ) : (
        <>
          {unread.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Noi</h2>
                <button onClick={() => markNotificationsRead(unread.map((n) => n.id))} className="min-h-9 text-sm font-semibold text-pago-blue">
                  Marchează toate ca citite
                </button>
              </div>
              <Card className="flex flex-col divide-y divide-line">
                {unread.map((n) => (
                  <NotificationRow key={n.id} notification={n} unread onOpen={() => markNotificationsRead([n.id])} />
                ))}
              </Card>
            </>
          )}

          {read.length > 0 && (
            <>
              <h2 className="mt-2 text-sm font-bold uppercase tracking-wide text-muted">Citite</h2>
              <Card className="flex flex-col divide-y divide-line">
                {read.map((n) => (
                  <NotificationRow key={n.id} notification={n} unread={false} />
                ))}
              </Card>
            </>
          )}
        </>
      )}

      <Link href="/profil/setari" className="flex min-h-11 items-center justify-center text-sm font-semibold text-pago-blue">
        Alege ce notificări primești
      </Link>
    </div>
  );
}

function NotificationRow({ notification, unread, onOpen }: { notification: AppNotification; unread: boolean; onOpen?: () => void }) {
  const Icon = ICONS[notification.icon];
  return (
    <Link href={notification.href} onClick={onOpen} className={`flex items-start gap-3 py-3 first:pt-0 last:pb-0 ${unread ? "" : "opacity-75"}`}>
      <span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${TONES[notification.tone]}`}>
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="font-semibold leading-snug text-ink">{notification.title}</span>
          {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-pago-blue" aria-label="necitită" />}
        </span>
        <span className="mt-0.5 block text-sm leading-relaxed text-muted">{notification.body}</span>
        <span className="mt-1 block text-xs font-semibold text-muted">{fmtDay(notification.date)}</span>
      </span>
    </Link>
  );
}
