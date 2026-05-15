import { useNavigate } from "react-router-dom";
import { BellOff } from "lucide-react";
import { useNotifications } from "../context/NotificationContext.jsx";

function timeAgo(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(1, Math.floor((now - then) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function routeFor(n) {
  switch (n.reference_type) {
    case "message":
      return n.reference_id ? `/messages?c=${n.reference_id}` : "/messages";
    case "application":
      return "/enlistment";
    case "contract":
      return n.reference_id ? `/contract/${n.reference_id}` : null;
    case "payment":
      return "/my-payments";
    case "report":
      return "/reports";
    default:
      return null;
  }
}

export default function NotificationPanel({ onClose }) {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const handleClick = async (n) => {
    if (!n.is_read) markAsRead(n.id);
    onClose?.();
    const target = routeFor(n);
    if (target) navigate(target);
  };

  return (
    <div
      role="menu"
      className="absolute right-0 top-12 w-[340px] max-w-[92vw] bg-vxr-surface rounded-vxr-md border border-vxr-border shadow-vxr-lg overflow-hidden z-50"
    >
      <div className="px-4 py-3 border-b border-vxr-border flex items-center justify-between">
        <span className="font-display font-bold text-sm text-vxr-text">Notifications</span>
        <button
          type="button"
          onClick={() => markAllAsRead()}
          disabled={unreadCount === 0}
          className={`font-body text-xs font-semibold transition-colors ${
            unreadCount === 0
              ? "text-vxr-text-muted cursor-default"
              : "text-vxr-accent hover:underline cursor-pointer"
          }`}
        >
          Mark all as read
        </button>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-10 px-4">
            <div className="w-12 h-12 rounded-full bg-vxr-accent-soft flex items-center justify-center mb-3">
              <BellOff size={20} className="text-vxr-accent" />
            </div>
            <p className="font-display text-sm font-bold text-vxr-text">
              You're all caught up
            </p>
            <p className="font-body text-xs text-vxr-text-sub mt-1">
              New notifications will show up here.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleClick(n)}
              className={`w-full flex gap-2.5 items-start px-4 py-3 border-b border-vxr-border last:border-b-0 text-left relative transition-colors ${
                n.is_read
                  ? "bg-vxr-surface hover:bg-vxr-surface2/60"
                  : "bg-vxr-accent-soft/40 hover:bg-vxr-accent-soft/60"
              }`}
            >
              {!n.is_read && (
                <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-vxr-accent" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={`font-body text-[13px] text-vxr-text m-0 ${
                    n.is_read ? "font-medium" : "font-bold"
                  }`}
                >
                  {n.title}
                </p>
                {n.body && (
                  <p
                    className="font-body text-xs text-vxr-text-sub mt-0.5 line-clamp-2"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {n.body}
                  </p>
                )}
                <p className="font-body text-[11px] text-vxr-text-muted mt-1">
                  {timeAgo(n.created_at)}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
