import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { Avatar } from "./vxr";
import ProfileDropdown from "./ProfileDropdown.jsx";

export default function ProfileButton({ onLogout, renderTrigger }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || user?.email || "Account";
  const initial = displayName.charAt(0).toUpperCase();
  const avatarUrl = profile?.avatar_url;

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

  const toggle = () => setOpen((v) => !v);

  const handleLogout = () => {
    setOpen(false);
    if (onLogout) onLogout();
    else navigate("/");
  };

  return (
    <div ref={containerRef} className="relative inline-flex">
      {renderTrigger ? (
        renderTrigger({ open, toggle, initial, avatarUrl })
      ) : (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Open profile menu"
          className="flex items-center gap-1.5 bg-vxr-surface border border-vxr-border rounded-full pl-1 pr-2.5 py-1 shadow-vxr-sm hover:shadow-vxr-md hover:border-vxr-border-strong transition-all cursor-pointer"
        >
          <Avatar name={displayName} src={avatarUrl} gradient size={28} />
          <ChevronDown size={14} className="text-vxr-text-sub" />
        </button>
      )}

      {open && <ProfileDropdown onLogout={handleLogout} />}
    </div>
  );
}
