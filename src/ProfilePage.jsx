import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Home, Bell, User, LogOut, CreditCard, Eye, EyeOff,
  Shield, Edit2, Trash2, ShieldCheck, ShieldAlert, Camera, X,
  CheckCircle2, AlertCircle, HelpCircle, BookOpen, Lock, Info,
} from "lucide-react";
import ProfileDropdown from "./components/ProfileDropdown.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import {
  updateMyProfile, uploadAvatar, removeAvatar, updatePassword,
  sendEmailVerification, sendPhoneVerification, verifyPhoneOtp,
} from "./lib/profileService.js";

const CORAL = "#e8756a";

// ==================== NAVBAR ====================
function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav
      className="sticky top-0 z-50"
      style={{ background: "linear-gradient(to right, #e8756a, #f0a090)" }}
      onClick={() => setDropdownOpen(false)}
    >
      <div
        style={{ width: "100%", padding: "10px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" }}
        onClick={e => e.stopPropagation()}
      >
        <div
          onClick={() => navigate("/home2")}
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
        >
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <span className="font-black text-lg" style={{ color: CORAL }}>V</span>
          </div>
          <span className="font-bold text-white text-lg tracking-wide">ViewxRent</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
          <button onClick={() => navigate("/home2")} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <Home size={22} color="white" />
          </button>
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4, position: "relative" }}>
            <Bell size={22} color="white" />
            <span style={{ position: "absolute", top: 2, right: 2, width: 8, height: 8, borderRadius: "50%", background: "#ff3b30", border: "1.5px solid #f0a090" }} />
          </button>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "white", border: "none", cursor: "pointer",
              borderRadius: 999, padding: "5px 14px 5px 6px",
              gap: 24, minWidth: 100,
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              border: `2.5px solid ${CORAL}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative", overflow: "hidden", flexShrink: 0,
            }}>
              <div style={{ position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)", width: 11, height: 11, borderRadius: "50%", background: CORAL }} />
              <div style={{ position: "absolute", bottom: -2, left: "50%", transform: "translateX(-50%)", width: 20, height: 13, borderRadius: "50% 50% 0 0", background: CORAL }} />
            </div>
            <div style={{ width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "8px solid #222", flexShrink: 0 }} />
          </button>

          {dropdownOpen && <ProfileDropdown onLogout={() => { setDropdownOpen(false); navigate("/login"); }} />}
        </div>
      </div>
    </nav>
  );
}

// ==================== TOAST / ALERT BANNER ====================
function Banner({ kind, msg, onDismiss }) {
  if (!msg) return null;
  const palette = kind === "error"
    ? { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c", Icon: AlertCircle }
    : { bg: "#f0fdf4", border: "#bbf7d0", color: "#166534", Icon: CheckCircle2 };
  const Icon = palette.Icon;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: palette.bg, border: `1px solid ${palette.border}`,
      color: palette.color, padding: "10px 14px", borderRadius: 10,
      fontSize: 13, marginBottom: 12,
    }}>
      <Icon size={16} />
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", color: palette.color }}>
        <X size={14} />
      </button>
    </div>
  );
}

// ==================== MODAL SHELL ====================
function Modal({ open, onClose, title, children, maxWidth = 420 }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "white", borderRadius: 16, width: "100%", maxWidth,
          padding: 20, boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ==================== STATUS CARD ====================
function StatusCard({ profile, emailConfirmed }) {
  const verified = !!profile?.is_verified;
  const isLandlord = profile?.is_landlord || profile?.role === "landlord";
  const isAdmin = profile?.role === "admin";
  const roleLabel = isAdmin ? "Admin" : isLandlord ? "Landlord" : "Tenant";
  const roleColor = isAdmin ? "#9333ea" : isLandlord ? CORAL : "#2563eb";

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex items-center gap-3">
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: verified ? "#dcfce7" : "#fef3c7",
        color: verified ? "#15803d" : "#b45309",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {verified ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: verified ? "#15803d" : "#b45309" }}>
          {verified ? "Verified Account" : "Unverified Account"}
        </p>
        <p style={{ fontSize: 12, color: "#6b7280" }}>
          {verified
            ? `Your account has been verified${emailConfirmed ? "" : " — email still pending"}.`
            : "Verify your email and phone to get verified."}
        </p>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 600,
        color: roleColor, background: `${roleColor}1A`,
        padding: "4px 10px", borderRadius: 999,
      }}>
        {roleLabel}
      </span>
    </div>
  );
}

// ==================== AVATAR ====================
function AvatarSection({ avatarUrl, fullName, onChange, onRemove, busy }) {
  const fileRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewing, setViewing] = useState(false);

  const initials = (fullName || "U")
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map(s => s[0]?.toUpperCase()).join("") || "U";

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (f) onChange(f);
    e.target.value = "";
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
      <div
        onClick={() => setMenuOpen(true)}
        style={{
          width: 80, height: 80, borderRadius: "50%",
          border: `3px solid ${CORAL}`, background: "#fff0ee",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", position: "relative", cursor: "pointer", flexShrink: 0,
        }}
      >
        {busy ? (
          <span style={{ fontSize: 11, color: CORAL }}>Uploading…</span>
        ) : avatarUrl ? (
          <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontWeight: 700, fontSize: 26, color: CORAL }}>{initials}</span>
        )}
        <div style={{
          position: "absolute", bottom: 0, right: 0,
          width: 22, height: 22, borderRadius: "50%", background: CORAL,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "2px solid white",
        }}>
          <Camera size={11} color="white" />
        </div>
      </div>
      <div>
        <p style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{fullName || "No name yet"}</p>
        <p style={{ fontSize: 12, color: "#6b7280" }}>Tap the photo to view, change, or remove.</p>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Profile photo">
        {avatarUrl && (
          <button
            onClick={() => { setMenuOpen(false); setViewing(true); }}
            className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 rounded-lg text-sm"
            style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
          >
            <Eye size={16} style={{ color: CORAL }} /> View profile photo
          </button>
        )}
        <button
          onClick={() => { setMenuOpen(false); fileRef.current?.click(); }}
          className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 rounded-lg text-sm"
          style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
        >
          <Edit2 size={16} style={{ color: CORAL }} /> Change profile photo
        </button>
        {avatarUrl && (
          <button
            onClick={() => { setMenuOpen(false); onRemove(); }}
            className="w-full flex items-center gap-3 px-3 py-3 hover:bg-red-50 rounded-lg text-sm"
            style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", color: "#dc2626" }}
          >
            <Trash2 size={16} /> Remove photo
          </button>
        )}
      </Modal>

      <Modal open={viewing} onClose={() => setViewing(false)} title="Profile photo" maxWidth={520}>
        {avatarUrl && (
          <img src={avatarUrl} alt="avatar" style={{ width: "100%", borderRadius: 12, objectFit: "contain" }} />
        )}
      </Modal>
    </div>
  );
}

// ==================== PROFILE INFORMATION ====================
function validateName(v) {
  if (!v?.trim()) return "Full name is required";
  if (v.trim().length < 2) return "Name must be at least 2 characters";
  return null;
}
function validateEmail(v) {
  if (!v?.trim()) return "Email is required";
  if (!/^[\w.\-+]+@[\w-]+\.[\w.-]+$/.test(v.trim())) return "Enter a valid email";
  return null;
}
function validatePhone(v) {
  if (!v?.trim()) return null;
  const cleaned = v.trim().replace(/[\s\-()]/g, "");
  if (!/^(\+?\d{1,3})?\d{10,12}$/.test(cleaned)) return "Enter a valid phone number";
  return null;
}

function ProfileInformation({ profile, user, onSaved, onBanner }) {
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    email: profile?.email || user?.email || "",
    phone: profile?.phone || "",
    date_of_birth: profile?.date_of_birth || "",
    address: profile?.address || "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [phoneOtpOpen, setPhoneOtpOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  useEffect(() => {
    setForm({
      full_name: profile?.full_name || "",
      email: profile?.email || user?.email || "",
      phone: profile?.phone || "",
      date_of_birth: profile?.date_of_birth || "",
      address: profile?.address || "",
    });
  }, [profile, user]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const errs = {
      full_name: validateName(form.full_name),
      email: validateEmail(form.email),
      phone: validatePhone(form.phone),
    };
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    setSaving(true);
    try {
      await updateMyProfile({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        date_of_birth: form.date_of_birth || null,
        address: form.address.trim() || null,
      });
      onBanner({ kind: "success", msg: "Profile updated successfully" });
      onSaved?.();
    } catch (e) {
      onBanner({ kind: "error", msg: e?.message || "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  };

  const handleResendEmail = async () => {
    setResendingEmail(true);
    try {
      await sendEmailVerification();
      onBanner({ kind: "success", msg: "Verification email sent. Check your inbox." });
    } catch (e) {
      onBanner({ kind: "error", msg: e?.message || "Failed to send verification email" });
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    if (validatePhone(form.phone)) {
      onBanner({ kind: "error", msg: "Enter a valid phone number first" });
      return;
    }
    setSendingPhoneOtp(true);
    try {
      await sendPhoneVerification(form.phone.trim());
      setPhoneOtpOpen(true);
      onBanner({ kind: "success", msg: `OTP sent to ${form.phone.trim()}` });
    } catch (e) {
      onBanner({ kind: "error", msg: e?.message || "Failed to send OTP" });
    } finally {
      setSendingPhoneOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return;
    setVerifyingOtp(true);
    try {
      await verifyPhoneOtp(form.phone.trim(), otpCode);
      onBanner({ kind: "success", msg: "Phone verified successfully" });
      setPhoneOtpOpen(false);
      setOtpCode("");
      onSaved?.();
    } catch (e) {
      onBanner({ kind: "error", msg: e?.message || "Invalid OTP code" });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const emailConfirmed = !!user?.email_confirmed_at;
  const phoneVerified = !!profile?.is_verified;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <User size={16} style={{ color: CORAL }} />
        <h2 className="text-sm font-semibold text-gray-800">Profile Information</h2>
      </div>
      <p className="text-xs text-gray-400 mb-5">Update your personal information and profile details.</p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Full Name" error={errors.full_name}>
          <input
            value={form.full_name}
            onChange={e => set("full_name", e.target.value)}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8756a]"
          />
        </Field>
        <Field label="Date of Birth">
          <input
            type="date"
            value={form.date_of_birth || ""}
            onChange={e => set("date_of_birth", e.target.value)}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8756a]"
          />
        </Field>
      </div>

      <div className="mt-3">
        <Field label="Email" error={errors.email}>
          <input
            type="email"
            value={form.email}
            onChange={e => set("email", e.target.value)}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8756a]"
          />
        </Field>
        <VerifyRow
          verified={emailConfirmed}
          label="Email"
          actionLabel="Resend verification email"
          onAction={handleResendEmail}
          loading={resendingEmail}
        />
      </div>

      <div className="mt-3">
        <Field label="Phone Number" error={errors.phone}>
          <input
            value={form.phone}
            onChange={e => set("phone", e.target.value)}
            placeholder="+63 9XX XXX XXXX"
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8756a]"
          />
        </Field>
        <VerifyRow
          verified={phoneVerified}
          label="Phone"
          actionLabel="Verify Phone"
          onAction={handleSendPhoneOtp}
          loading={sendingPhoneOtp}
        />
      </div>

      <div className="mt-3">
        <Field label="Address">
          <textarea
            rows={2}
            value={form.address}
            onChange={e => set("address", e.target.value)}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8756a]"
          />
        </Field>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: `linear-gradient(to right, ${CORAL}, #f0a090)`,
            color: "white", border: "none", borderRadius: 999,
            padding: "10px 22px", fontSize: 13, fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <Modal open={phoneOtpOpen} onClose={() => { setPhoneOtpOpen(false); setOtpCode(""); }} title="Verify Phone">
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>
          Enter the 6-digit code we sent to {form.phone}
        </p>
        <input
          value={otpCode}
          onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          maxLength={6}
          placeholder="000000"
          style={{
            width: "100%", textAlign: "center", letterSpacing: "0.5em",
            fontSize: 22, fontWeight: 700,
            border: "1px solid #e5e7eb", borderRadius: 10,
            padding: "12px 0", outline: "none",
          }}
        />
        <button
          onClick={handleVerifyOtp}
          disabled={otpCode.length !== 6 || verifyingOtp}
          style={{
            width: "100%", marginTop: 12,
            background: CORAL, color: "white", border: "none",
            borderRadius: 10, padding: "10px 0", fontSize: 14, fontWeight: 600,
            cursor: otpCode.length === 6 && !verifyingOtp ? "pointer" : "not-allowed",
            opacity: otpCode.length === 6 && !verifyingOtp ? 1 : 0.6,
          }}
        >
          {verifyingOtp ? "Verifying…" : "Verify"}
        </button>
      </Modal>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      {children}
      {error && <p style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>{error}</p>}
    </div>
  );
}

function VerifyRow({ verified, label, actionLabel, onAction, loading }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
      {verified ? (
        <CheckCircle2 size={14} color="#16a34a" />
      ) : (
        <AlertCircle size={14} color="#d97706" />
      )}
      <span style={{ fontSize: 12, color: verified ? "#16a34a" : "#d97706", fontWeight: 500 }}>
        {verified ? `${label} verified` : `${label} not verified`}
      </span>
      <span style={{ flex: 1 }} />
      {!verified && (
        <button
          onClick={onAction}
          disabled={loading}
          style={{
            fontSize: 11, fontWeight: 600,
            color: CORAL, background: "white",
            border: `1px solid ${CORAL}`, borderRadius: 999,
            padding: "4px 10px", cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Sending…" : actionLabel}
        </button>
      )}
    </div>
  );
}

// ==================== SECURITY ====================
function SecuritySettings({ onBanner }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (pw.length < 6) {
      onBanner({ kind: "error", msg: "Password must be at least 6 characters" });
      return;
    }
    if (pw !== confirmPw) {
      onBanner({ kind: "error", msg: "Passwords do not match" });
      return;
    }
    setSaving(true);
    try {
      await updatePassword(pw);
      onBanner({ kind: "success", msg: "Password updated successfully" });
      setOpen(false);
      setPw("");
      setConfirmPw("");
    } catch (e) {
      onBanner({ kind: "error", msg: e?.message || "Failed to update password" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <Shield size={16} className="text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-800">Security</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4">Manage your password and account security.</p>
      <div className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
        <div className="flex items-center gap-3">
          <Lock size={16} style={{ color: CORAL }} />
          <div>
            <p className="text-sm font-semibold text-gray-800">Password</p>
            <p className="text-xs text-gray-400">Change your account password</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          style={{
            background: CORAL, color: "white", border: "none",
            borderRadius: 6, padding: "8px 14px",
            fontSize: 12, fontWeight: 500, cursor: "pointer",
          }}
        >
          Change Password
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Change Password">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="New Password">
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                value={pw}
                onChange={e => setPw(e.target.value)}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8756a]"
              />
              <button
                onClick={() => setShowPw(s => !s)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
          <Field label="Confirm Password">
            <input
              type={showPw ? "text" : "password"}
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8756a]"
            />
          </Field>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              marginTop: 6, background: CORAL, color: "white", border: "none",
              borderRadius: 10, padding: "10px 0", fontSize: 14, fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Updating…" : "Update Password"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ==================== PAYMENT METHODS (placeholder) ====================
function PaymentMethods() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-800">Payment Methods</h2>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-4">Saved payment methods are stored on signed contracts.</p>
      <div style={{
        border: "1px dashed #e5e7eb", borderRadius: 10,
        padding: "18px 16px", background: "#fafafa",
        textAlign: "center", color: "#9ca3af", fontSize: 13,
      }}>
        No saved payment methods.
      </div>
    </div>
  );
}

// ==================== HELP & INFO ====================
function HelpAndInfo() {
  const [info, setInfo] = useState(null);
  const items = [
    { icon: HelpCircle, title: "Help & Support", body: "For any issues or inquiries, please contact us at support@viewxrent.com." },
    { icon: BookOpen, title: "Terms of Service", body: "By using ViewxRent, you agree to our terms of service. All rental listings must be accurate and legitimate. Users are responsible for verifying property details before signing agreements." },
    { icon: Lock, title: "Privacy Policy", body: "ViewxRent respects your privacy. We collect only the data necessary to provide our services. Your personal information is securely stored and never shared with third parties without your consent." },
    { icon: Info, title: "About ViewxRent", body: "ViewxRent (VXR) is a rental property platform that connects tenants with landlords. Find your perfect home easily.\n\nVersion 1.0.0" },
  ];
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
      <h2 className="text-sm font-semibold text-gray-800 mb-3">Help &amp; Info</h2>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.map((item) => (
          <button
            key={item.title}
            onClick={() => setInfo({ title: item.title, body: item.body })}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 6px", background: "none", border: "none",
              borderTop: "1px solid #f3f4f6", cursor: "pointer", textAlign: "left",
            }}
          >
            <item.icon size={16} className="text-gray-500" />
            <span style={{ fontSize: 14, color: "#374151", flex: 1 }}>{item.title}</span>
            <span style={{ color: "#d1d5db" }}>›</span>
          </button>
        ))}
      </div>
      <Modal open={!!info} onClose={() => setInfo(null)} title={info?.title || ""}>
        <p style={{ fontSize: 13, color: "#374151", whiteSpace: "pre-line" }}>{info?.body}</p>
      </Modal>
    </div>
  );
}

// ==================== LOGOUT ====================
function LogoutSection() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const doLogout = async () => {
    setBusy(true);
    try {
      await signOut();
      navigate("/login");
    } catch {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          width: "100%", marginTop: 8,
          background: `linear-gradient(to right, ${CORAL}, #f0a090)`,
          color: "white", border: "none", borderRadius: 999,
          padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        <LogOut size={16} /> Logout
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Logout">
        <p style={{ fontSize: 13, color: "#374151", marginBottom: 14 }}>
          Are you sure you want to logout?
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={() => setOpen(false)}
            style={{ padding: "8px 14px", border: "1px solid #e5e7eb", background: "white", borderRadius: 8, cursor: "pointer", fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            onClick={doLogout}
            disabled={busy}
            style={{ padding: "8px 14px", background: CORAL, color: "white", border: "none", borderRadius: 8, cursor: busy ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}
          >
            {busy ? "Logging out…" : "Logout"}
          </button>
        </div>
      </Modal>
    </>
  );
}

// ==================== FOOTER ====================
function Footer() {
  return (
    <footer style={{ background: "#111827", marginTop: 32 }}>
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-3 gap-8">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, background: CORAL, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>V</span>
            </div>
            <span style={{ color: "white", fontWeight: 600 }}>ViewxRent</span>
          </div>
          <p style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
            The community-driven rental marketplace — connecting people with unique spaces and unforgettable experiences.
          </p>
        </div>
        <div>
          <p style={{ color: "white", fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Company</p>
          {["About", "Careers", "Press", "Blog"].map(l => (
            <button key={l} style={{ display: "block", fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer", marginBottom: 6, padding: 0 }}>{l}</button>
          ))}
        </div>
        <div>
          <p style={{ color: "white", fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Support</p>
          {["Help Center", "Safety Information", "Cancellation Options", "Report Issue"].map(l => (
            <button key={l} style={{ display: "block", fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer", marginBottom: 6, padding: 0 }}>{l}</button>
          ))}
        </div>
      </div>
    </footer>
  );
}

// ==================== MAIN PROFILE PAGE ====================
export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  const handleAvatarChange = async (file) => {
    setAvatarBusy(true);
    try {
      await uploadAvatar(file);
      await refreshProfile();
      setBanner({ kind: "success", msg: "Profile photo updated" });
    } catch (e) {
      setBanner({ kind: "error", msg: e?.message || "Failed to update photo" });
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleAvatarRemove = async () => {
    setAvatarBusy(true);
    try {
      await removeAvatar();
      await refreshProfile();
      setBanner({ kind: "success", msg: "Profile photo removed" });
    } catch (e) {
      setBanner({ kind: "error", msg: e?.message || "Failed to remove photo" });
    } finally {
      setAvatarBusy(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#6b7280" }}>Loading profile…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", fontFamily: "sans-serif" }}>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-5">
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111", marginBottom: 4 }}>Account Settings</h1>
          <p style={{ fontSize: 14, color: "#6b7280" }}>Manage your profile information and account preferences.</p>
        </div>

        <Banner kind={banner?.kind} msg={banner?.msg} onDismiss={() => setBanner(null)} />

        <StatusCard profile={profile} emailConfirmed={!!user?.email_confirmed_at} />

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
          <AvatarSection
            avatarUrl={profile?.avatar_url}
            fullName={profile?.full_name || user?.user_metadata?.full_name}
            onChange={handleAvatarChange}
            onRemove={handleAvatarRemove}
            busy={avatarBusy}
          />
        </div>

        <ProfileInformation
          profile={profile}
          user={user}
          onSaved={refreshProfile}
          onBanner={setBanner}
        />

        <SecuritySettings onBanner={setBanner} />

        <PaymentMethods />

        <HelpAndInfo />

        <LogoutSection />
      </main>
      <Footer />
    </div>
  );
}
