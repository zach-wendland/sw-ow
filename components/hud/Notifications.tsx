"use client";

import { useEffect } from "react";
import { useUIStore } from "@/lib/stores/useUIStore";
import { Info, CheckCircle, AlertTriangle, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NOTIFICATION_DURATION = 5000; // 5 seconds

const icons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const styles = {
  info: "bg-blue-500/20 border-blue-500/50 text-blue-200",
  success: "bg-green-500/20 border-green-500/50 text-green-200",
  warning: "bg-yellow-500/20 border-yellow-500/50 text-yellow-200",
  error: "bg-red-500/20 border-red-500/50 text-red-200",
};

export function Notifications() {
  const { notifications, removeNotification } = useUIStore();

  // Auto-remove notifications after duration
  useEffect(() => {
    if (notifications.length === 0) return;

    const timers = notifications.map((notification) => {
      const age = Date.now() - notification.timestamp;
      const remaining = Math.max(0, NOTIFICATION_DURATION - age);

      return setTimeout(() => {
        removeNotification(notification.id);
      }, remaining);
    });

    return () => timers.forEach(clearTimeout);
  }, [notifications, removeNotification]);

  if (notifications.length === 0) return null;

  return (
    <div className="space-y-2 hud-interactive">
      {notifications.map((notification) => {
        const Icon = icons[notification.type];

        return (
          <div
            key={notification.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm animate-slide-up",
              styles[notification.type]
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">{notification.message}</span>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-auto opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
