import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  User, LogOut, CreditCard, Eye, EyeOff,
  Shield, Edit2, Trash2, Camera, X,
  CheckCircle2, AlertCircle, HelpCircle, BookOpen, Lock, Info, ChevronRight,
} from "lucide-react";
import AppHeader from "./components/AppHeader.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import {
  updateMyProfile, uploadAvatar, removeAvatar, updatePassword,
  sendEmailVerification, sendPhoneVerification, verifyPhoneOtp,
} from "./lib/profileService.js";
import {
  listMyPaymentMethods, deletePaymentMethod,
  setDefaultPaymentMethod,
} from "./lib/paymentMethodsService.js";
import { METHOD_LABELS } from "./lib/paymongo.js";
import Footer from "./Footer.jsx";
import {
  Card, Button, Input, Modal, PageHero, Avatar as VxrAvatar,
  PaymentMethodIcon,
} from "./components/vxr";
import VerificationStatusCard from "./components/VerificationStatusCard.jsx";
import IdentityVerificationModal from "./components/IdentityVerificationModal.jsx";
import AddPaymentMethodModal from "./components/AddPaymentMethodModal.jsx";

function Banner({ kind, msg, onDismiss }) {
  if (!msg) return null;
  const isError = kind === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;
  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 rounded-vxr-md font-body text-sm mb-4 border ${
        isError
          ? "bg-vxr-danger-soft border-vxr-danger/20 text-vxr-danger"
          : "bg-vxr-success-soft border-vxr-success/20 text-vxr-success"
      }`}
    >
      <Icon size={16} />
      <span className="flex-1">{msg}</span>
      <button onClick={onDismiss} className="hover:opacity-70">
        <X size={14} />
      </button>
    </div>
  );
}

function AvatarSection({ avatarUrl, fullName, onChange, onRemove, busy }) {
  const fileRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewing, setViewing] = useState(false);

  const initials =
    (fullName || "U")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "U";

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (f) onChange(f);
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-4">
      <div
        onClick={() => setMenuOpen(true)}
        className="relative w-20 h-20 rounded-full border-[3px] border-vxr-accent bg-vxr-accent-soft flex items-center justify-center overflow-hidden cursor-pointer shrink-0"
      >
        {busy ? (
          <span className="font-body text-[11px] text-vxr-accent">Uploading…</span>
        ) : avatarUrl ? (
          <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="font-display font-bold text-2xl text-vxr-accent">
            {initials}
          </span>
        )}
        <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-vxr-accent flex items-center justify-center border-2 border-white">
          <Camera size={11} className="text-white" />
        </div>
      </div>
      <div>
        <p className="font-display font-bold text-sm text-vxr-text">
          {fullName || "No name yet"}
        </p>
        <p className="font-body text-xs text-vxr-text-sub mt-0.5">
          Tap the photo to view, change, or remove.
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title="Profile photo" size="sm">
        <div className="flex flex-col">
          {avatarUrl && (
            <button
              onClick={() => {
                setMenuOpen(false);
                setViewing(true);
              }}
              className="flex items-center gap-3 px-3 py-3 hover:bg-vxr-surface2 rounded-vxr-md font-body text-sm text-left"
            >
              <Eye size={16} className="text-vxr-accent" /> View profile photo
            </button>
          )}
          <button
            onClick={() => {
              setMenuOpen(false);
              fileRef.current?.click();
            }}
            className="flex items-center gap-3 px-3 py-3 hover:bg-vxr-surface2 rounded-vxr-md font-body text-sm text-left"
          >
            <Edit2 size={16} className="text-vxr-accent" /> Change profile photo
          </button>
          {avatarUrl && (
            <button
              onClick={() => {
                setMenuOpen(false);
                onRemove();
              }}
              className="flex items-center gap-3 px-3 py-3 hover:bg-vxr-danger-soft rounded-vxr-md font-body text-sm text-left text-vxr-danger"
            >
              <Trash2 size={16} /> Remove photo
            </button>
          )}
        </div>
      </Modal>

      <Modal open={viewing} onClose={() => setViewing(false)} title="Profile photo" size="lg">
        {avatarUrl && (
          <img
            src={avatarUrl}
            alt="avatar"
            className="w-full rounded-vxr object-contain"
          />
        )}
      </Modal>
    </div>
  );
}

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

function VerifyRow({ verified, label, actionLabel, onAction, loading }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      {verified ? (
        <CheckCircle2 size={14} className="text-vxr-success" />
      ) : (
        <AlertCircle size={14} className="text-vxr-warning" />
      )}
      <span
        className={`font-body text-xs font-medium ${
          verified ? "text-vxr-success" : "text-vxr-warning"
        }`}
      >
        {verified ? `${label} verified` : `${label} not verified`}
      </span>
      <span className="flex-1" />
      {!verified && (
        <Button
          variant="secondary"
          size="sm"
          disabled={loading}
          onClick={onAction}
        >
          {loading ? "Sending…" : actionLabel}
        </Button>
      )}
    </div>
  );
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

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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
  // Phone-verified state lives on auth.users.phone_confirmed_at — Supabase
  // sets it automatically on verifyOtp(). We no longer overload
  // profile.is_verified for this (that's reserved for identity verification).
  const phoneVerified = !!user?.phone_confirmed_at;

  return (
    <Card className="p-6 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <User size={16} className="text-vxr-accent" />
        <h2 className="font-display text-sm font-bold text-vxr-text">
          Profile Information
        </h2>
      </div>
      <p className="font-body text-xs text-vxr-text-muted mb-5">
        Update your personal information and profile details.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Full Name"
          value={form.full_name}
          onChange={(e) => set("full_name", e.target.value)}
          error={errors.full_name}
        />
        <Input
          label="Date of Birth"
          type="date"
          value={form.date_of_birth || ""}
          onChange={(e) => set("date_of_birth", e.target.value)}
        />
      </div>

      <div className="mt-3">
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          error={errors.email}
        />
        <VerifyRow
          verified={emailConfirmed}
          label="Email"
          actionLabel="Resend verification"
          onAction={handleResendEmail}
          loading={resendingEmail}
        />
      </div>

      <div className="mt-3">
        <Input
          label="Phone Number"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="+63 9XX XXX XXXX"
          error={errors.phone}
        />
        <VerifyRow
          verified={phoneVerified}
          label="Phone"
          actionLabel="Verify Phone"
          onAction={handleSendPhoneOtp}
          loading={sendingPhoneOtp}
        />
      </div>

      <div className="mt-3">
        <label className="font-body text-[11px] font-semibold uppercase tracking-wider text-vxr-text-sub">
          Address
        </label>
        <textarea
          rows={2}
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          className="mt-1.5 w-full bg-vxr-surface2 border-[1.5px] border-vxr-border rounded-vxr-md px-3.5 py-3 font-body text-sm text-vxr-text placeholder:text-vxr-text-muted outline-none focus:border-vxr-accent transition-colors"
        />
      </div>

      <div className="flex justify-end mt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      <Modal
        open={phoneOtpOpen}
        onClose={() => {
          setPhoneOtpOpen(false);
          setOtpCode("");
        }}
        title="Verify Phone"
        size="sm"
      >
        <p className="font-body text-sm text-vxr-text-sub mb-3">
          Enter the 6-digit code we sent to {form.phone}
        </p>
        <input
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          maxLength={6}
          placeholder="000000"
          className="w-full text-center tracking-[0.5em] font-display text-2xl font-extrabold bg-vxr-surface2 border-[1.5px] border-vxr-border rounded-vxr-md py-3 outline-none focus:border-vxr-accent"
        />
        <Button
          fullWidth
          className="mt-3"
          disabled={otpCode.length !== 6 || verifyingOtp}
          onClick={handleVerifyOtp}
        >
          {verifyingOtp ? "Verifying…" : "Verify"}
        </Button>
      </Modal>
    </Card>
  );
}

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
    <Card className="p-6 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <Shield size={16} className="text-vxr-text-sub" />
        <h2 className="font-display text-sm font-bold text-vxr-text">Security</h2>
      </div>
      <p className="font-body text-xs text-vxr-text-muted mb-4">
        Manage your password and account security.
      </p>
      <div className="flex items-center justify-between border border-vxr-border rounded-vxr-md p-3">
        <div className="flex items-center gap-3">
          <Lock size={16} className="text-vxr-accent" />
          <div>
            <p className="font-display text-sm font-bold text-vxr-text">Password</p>
            <p className="font-body text-xs text-vxr-text-muted">
              Change your account password
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          Change Password
        </Button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Change Password" size="sm">
        <div className="flex flex-col gap-3">
          <Input
            label="New Password"
            type={showPw ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            suffix={
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="text-vxr-text-muted hover:text-vxr-text"
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />
          <Input
            label="Confirm Password"
            type={showPw ? "text" : "password"}
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
          />
          <Button
            fullWidth
            disabled={saving}
            onClick={handleSubmit}
          >
            {saving ? "Updating…" : "Update Password"}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

function PaymentMethods() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [err, setErr] = useState(null);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await listMyPaymentMethods();
    if (error) setErr(error.message || "Failed to load payment methods");
    setMethods(data ?? []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleDelete = async (id) => {
    setBusyId(id);
    const res = await deletePaymentMethod(id);
    if (res?.error) setErr(res.error);
    await refresh();
    setBusyId(null);
  };

  const handleSetDefault = async (id) => {
    setBusyId(id);
    const res = await setDefaultPaymentMethod(id);
    if (res?.error) setErr(res.error);
    await refresh();
    setBusyId(null);
  };

  return (
    <Card className="p-6 mb-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-vxr-text-sub" />
          <h2 className="font-display text-sm font-bold text-vxr-text">
            Payment Methods
          </h2>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
          Add method
        </Button>
      </div>
      <p className="font-body text-xs text-vxr-text-muted mb-4">
        Save GCash, Maya, GrabPay, or bank transfer for one-tap checkout.
        Cards are entered fresh at checkout for security.
      </p>

      {err && (
        <div className="mb-3 rounded-vxr-md border border-vxr-danger/30 bg-vxr-danger-soft text-vxr-danger text-xs p-2">
          {err}
        </div>
      )}

      {loading ? (
        <div className="text-center font-body text-xs text-vxr-text-muted py-5">
          Loading…
        </div>
      ) : methods.length === 0 ? (
        <div className="border border-dashed border-vxr-border rounded-vxr-md py-5 bg-vxr-surface2/50 text-center font-body text-sm text-vxr-text-muted">
          No saved payment methods yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {methods.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 px-3 py-2.5 border border-vxr-border rounded-vxr-md"
            >
              <PaymentMethodIcon type={m.type} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-body text-sm font-semibold text-vxr-text truncate">
                    {m.label || METHOD_LABELS[m.type]?.label || m.type}
                  </span>
                  {m.is_default && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-vxr-success bg-vxr-success-soft px-1.5 py-0.5 rounded">
                      Default
                    </span>
                  )}
                  {m.is_mock && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                      Mock
                    </span>
                  )}
                </div>
                {m.account_hint && (
                  <div className="font-body text-xs text-vxr-text-muted truncate">
                    {m.account_hint}
                  </div>
                )}
              </div>
              {!m.is_default && (
                <button
                  type="button"
                  disabled={busyId === m.id}
                  onClick={() => handleSetDefault(m.id)}
                  className="text-xs font-semibold text-vxr-accent hover:underline disabled:opacity-50"
                >
                  Set default
                </button>
              )}
              <button
                type="button"
                disabled={busyId === m.id}
                onClick={() => handleDelete(m.id)}
                className="p-1.5 rounded-vxr-md text-vxr-danger hover:bg-vxr-danger-soft disabled:opacity-50"
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <AddPaymentMethodModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => { setAddOpen(false); refresh(); }}
      />
    </Card>
  );
}

function HelpAndInfo() {
  const [info, setInfo] = useState(null);
  const items = [
    {
      icon: HelpCircle,
      title: "Help & Support",
      body: "For any issues or inquiries, please contact us at support@viewxrent.com.",
    },
    {
      icon: BookOpen,
      title: "Terms of Service",
      body: "By using ViewxRent, you agree to our terms of service. All rental listings must be accurate and legitimate. Users are responsible for verifying property details before signing agreements.",
    },
    {
      icon: Lock,
      title: "Privacy Policy",
      body: "ViewxRent respects your privacy. We collect only the data necessary to provide our services. Your personal information is securely stored and never shared with third parties without your consent.",
    },
    {
      icon: Info,
      title: "About ViewxRent",
      body: "ViewxRent (VXR) is a rental property platform that connects tenants with landlords. Find your perfect home easily.\n\nVersion 1.0.0",
    },
  ];
  return (
    <Card className="p-6 mb-4">
      <h2 className="font-display text-sm font-bold text-vxr-text mb-3">
        Help &amp; Info
      </h2>
      <div className="flex flex-col">
        {items.map((item) => (
          <button
            key={item.title}
            onClick={() => setInfo({ title: item.title, body: item.body })}
            className="flex items-center gap-3 py-3 px-1.5 border-t border-vxr-border first:border-t-0 text-left hover:bg-vxr-surface2/50 rounded transition-colors"
          >
            <div className="w-9 h-9 rounded-vxr-md bg-vxr-accent-soft flex items-center justify-center shrink-0">
              <item.icon size={16} className="text-vxr-accent" />
            </div>
            <span className="font-body text-sm text-vxr-text flex-1">
              {item.title}
            </span>
            <ChevronRight size={16} className="text-vxr-text-muted" />
          </button>
        ))}
      </div>
      <Modal
        open={!!info}
        onClose={() => setInfo(null)}
        title={info?.title || ""}
        size="sm"
      >
        <p className="font-body text-sm text-vxr-text whitespace-pre-line">
          {info?.body}
        </p>
      </Modal>
    </Card>
  );
}

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
      <Button
        fullWidth
        variant="danger"
        icon={LogOut}
        onClick={() => setOpen(true)}
        className="mt-2"
      >
        Logout
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Logout" size="sm">
        <p className="font-body text-sm text-vxr-text mb-4">
          Are you sure you want to logout?
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" disabled={busy} onClick={doLogout}>
            {busy ? "Logging out…" : "Logout"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [banner, setBanner] = useState(null);
  const [verifyOpen, setVerifyOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  // Allow other pages to deep-link into verification via /profile?verify=1
  useEffect(() => {
    if (searchParams.get("verify") === "1") {
      setVerifyOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("verify");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
      <div className="min-h-screen bg-vxr-bg flex items-center justify-center">
        <p className="font-body text-vxr-text-sub">Loading profile…</p>
      </div>
    );
  }

  const fullName = profile?.full_name || user?.user_metadata?.full_name;

  return (
    <div className="min-h-screen bg-vxr-bg">
      <AppHeader />

      <PageHero
        eyebrow="Account"
        title={fullName || "Your profile"}
        subtitle={user?.email || ""}
      >
        <div className="flex items-center gap-4">
          <VxrAvatar
            name={fullName}
            src={profile?.avatar_url}
            gradient
            size={56}
          />
          <Button variant="secondary" size="sm" icon={Edit2}>
            Edit profile
          </Button>
        </div>
      </PageHero>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <Banner
          kind={banner?.kind}
          msg={banner?.msg}
          onDismiss={() => setBanner(null)}
        />

        <VerificationStatusCard
          profile={profile}
          onVerifyClick={() => setVerifyOpen(true)}
        />

        <Card className="p-6 mb-4">
          <AvatarSection
            avatarUrl={profile?.avatar_url}
            fullName={fullName}
            onChange={handleAvatarChange}
            onRemove={handleAvatarRemove}
            busy={avatarBusy}
          />
        </Card>

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

      <IdentityVerificationModal
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        onDone={refreshProfile}
      />

      <Footer />
    </div>
  );
}
