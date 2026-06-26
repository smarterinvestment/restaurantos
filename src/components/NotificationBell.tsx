import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Bell, X, CheckCheck, AlertCircle, TrendingUp, Info, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "danger" | "success";
  read: boolean;
  created_at: string;
};

const ALERT_THROTTLE_KEY = "ros-last-alert-check";
const ALERT_THROTTLE_MS  = 60 * 60 * 1000;

async function runCheckAlerts(accessToken: string) {
  const last = Number(localStorage.getItem(ALERT_THROTTLE_KEY) ?? 0);
  if (Date.now() - last < ALERT_THROTTLE_MS) return;
  localStorage.setItem(ALERT_THROTTLE_KEY, String(Date.now()));
  await fetch("/api/check-alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  }).catch(console.error);
}

function severityIcon(sev: string) {
  if (sev === "danger")  return <AlertCircle size={13} style={{ color: "#ff4d6d" }} />;
  if (sev === "warning") return <AlertCircle size={13} style={{ color: "#ffb84d" }} />;
  if (sev === "success") return <TrendingUp  size={13} style={{ color: "#10b981" }} />;
  return <Info size={13} style={{ color: "#3d8bff" }} />;
}

function severityColor(sev: string) {
  if (sev === "danger")  return "#ff4d6d";
  if (sev === "warning") return "#ffb84d";
  if (sev === "success") return "#10b981";
  return "#3d8bff";
}

export default function NotificationBell() {
  const { t } = useTranslation();
  const [open, setOpen]       = useState(false);
  const panelRef              = useRef<HTMLDivElement>(null);
  const queryClient           = useQueryClient();
  const { session }           = useAuthStore();
  const accessToken           = session?.access_token ?? "";
  const userId                = session?.user.id ?? "";

  useEffect(() => {
    if (!accessToken) return;
    runCheckAlerts(accessToken).then(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    });
  }, [accessToken, userId, queryClient]);

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id,type,title,body,severity,read,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data ?? []) as Notification[];
    },
    enabled: !!userId,
    refetchInterval: open ? 15_000 : 60_000,
    staleTime: 10_000,
  });

  const unread = notifications.filter(n => !n.read).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", userId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", userId] }),
  });

  const markAll = useMutation({
    mutationFn: async () => {
      await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", userId] }),
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return t("notifications.now");
    if (mins < 60) return t("notifications.minutesAgo", { count: mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t("notifications.hoursAgo", { count: hrs });
    return t("notifications.daysAgo", { count: Math.floor(hrs / 24) });
  }

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-all"
        style={{
          background: open ? "rgba(61,139,255,0.14)" : "rgba(27,39,66,0.50)",
          border: "1px solid rgba(125,165,255,0.12)",
        }}
        title={t("notifications.title")}
      >
        {isLoading
          ? <Loader2 size={15} className="text-text-dim animate-spin" />
          : <Bell size={15} className="text-text-muted" />
        }
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[17px] h-[17px] rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1 leading-none"
            style={{ background: "#ff4d6d", boxShadow: "0 0 8px rgba(255,77,109,0.55)" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 w-80 rounded-2xl overflow-hidden z-50"
          style={{
            background: "linear-gradient(180deg,rgba(12,20,38,0.98),rgba(7,12,26,0.98))",
            backdropFilter: "blur(24px) saturate(150%)",
            border: "1px solid rgba(125,165,255,0.14)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid rgba(125,165,255,0.08)" }}
          >
            <span className="font-display font-semibold text-sm text-text">{t("notifications.title")}</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={() => markAll.mutate()}
                  disabled={markAll.isPending}
                  className="flex items-center gap-1 text-[11px] text-brand hover:text-cyan transition-colors"
                >
                  <CheckCheck size={12} />
                  {t("notifications.markAll")}
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-text-faint hover:text-text transition-colors ml-1">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-[340px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <Bell size={22} className="text-text-faint mb-2 opacity-40" />
                <p className="text-text-dim text-sm">{t("notifications.empty")}</p>
                <p className="text-text-faint text-xs mt-0.5">{t("notifications.emptyHint")}</p>
              </div>
            ) : (
              notifications.map(n => {
                const color = severityColor(n.severity);
                return (
                  <div
                    key={n.id}
                    className="flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-white/[0.025]"
                    style={{ borderBottom: "1px solid rgba(125,165,255,0.05)", opacity: n.read ? 0.55 : 1 }}
                    onClick={() => { if (!n.read) markRead.mutate(n.id); }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: color + "1a", border: `1px solid ${color}30` }}
                    >
                      {severityIcon(n.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-text text-[12.5px] font-medium leading-tight">{n.title}</p>
                        {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0 mt-1.5" />}
                      </div>
                      <p className="text-text-dim text-[11px] leading-relaxed mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-text-faint text-[10px] mt-1">{relativeTime(n.created_at)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
