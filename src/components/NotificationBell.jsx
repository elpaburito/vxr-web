import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "../context/NotificationContext.jsx";
import NotificationPanel from "./NotificationPanel.jsx";

export default function NotificationBell({
  iconColor = "#1A1310",
  dotBorderColor = "#FFFFFF",
  size = 18,
  framed = false,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const { unreadCount } = useNotifications();

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          framed
            ? "w-9 h-9 rounded-full bg-vxr-surface border border-vxr-border hover:bg-vxr-surface2 transition-colors flex items-center justify-center relative cursor-pointer"
            : "flex items-center justify-center p-1 relative cursor-pointer bg-transparent border-none"
        }
      >
        <Bell size={size} color={iconColor} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              minWidth: 8,
              height: 8,
              padding: unreadCount > 9 ? "0 4px" : 0,
              borderRadius: 999,
              background: "#ff3b30",
              border: `1.5px solid ${dotBorderColor}`,
              color: "white",
              fontSize: 9,
              fontWeight: 700,
              lineHeight: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unreadCount > 9 ? (unreadCount > 99 ? "99+" : unreadCount) : ""}
          </span>
        )}
      </button>

      {open && <NotificationPanel onClose={() => setOpen(false)} />}
    </div>
  );
}
