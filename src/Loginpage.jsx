import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  X,
  Mail,
  Lock,
  User,
  Phone,
  Home,
  Sparkles,
  ShieldCheck,
  Check,
} from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { Logo, Button, Input, Modal } from "./components/vxr";

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [signupForm, setSignupForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });
  const [signupError, setSignupError] = useState("");
  const [signupInfo, setSignupInfo] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    if (!loginForm.email || !loginForm.password) {
      setLoginError("Please enter email and password.");
      return;
    }
    setLoginLoading(true);
    try {
      await signIn({ email: loginForm.email.trim(), password: loginForm.password });
      navigate("/home2");
    } catch (err) {
      setLoginError(err?.message || "Login failed. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupError("");
    setSignupInfo("");

    const { fullName, email, password, confirmPassword, phone } = signupForm;

    if (!fullName || !email || !password || !confirmPassword) {
      setSignupError("Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      setSignupError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setSignupError("Passwords do not match.");
      return;
    }

    setSignupLoading(true);
    try {
      const phoneFull = phone ? `+63${phone.replace(/^0+/, "")}` : null;
      const result = await signUp({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: phoneFull,
      });

      if (result?.session) {
        navigate("/home2");
      } else {
        setSignupInfo(
          "Account created. Please check your email to confirm, then log in."
        );
        setSignupForm({
          fullName: "",
          email: "",
          password: "",
          confirmPassword: "",
          phone: "",
        });
      }
    } catch (err) {
      setSignupError(err?.message || "Sign up failed. Please try again.");
    } finally {
      setSignupLoading(false);
    }
  };

  const trustBadges = [
    { icon: ShieldCheck, text: "Verified landlords & secure payments" },
    { icon: Home, text: "Thousands of homes across the Philippines" },
    { icon: Sparkles, text: "Seamlessly synced with your mobile app" },
  ];

  return (
    <div className="min-h-screen w-full bg-vxr-bg flex">
      {/* LEFT — Branding panel */}
      <div className="relative hidden lg:flex w-[55%] overflow-hidden bg-vxr-gradient">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute top-1/2 -left-32 w-[420px] h-[420px] rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-32 right-1/4 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between w-full p-12 xl:p-16">
          <div onClick={() => navigate("/")} className="w-fit">
            <Logo size={36} color="white" />
          </div>

          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/20 rounded-full px-3.5 py-1.5 mb-6">
              <Sparkles size={14} className="text-white" />
              <span className="font-body text-xs font-semibold text-white tracking-wide">
                Welcome back
              </span>
            </div>
            <h1 className="font-display text-white text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Your next home
              <br />
              is waiting.
            </h1>
            <p className="mt-5 font-body text-white/90 text-lg leading-relaxed">
              Sign in to continue your rental journey — browse verified homes,
              chat with hosts, and manage everything in one place.
            </p>

            <div className="mt-10 space-y-4">
              {trustBadges.map((f) => (
                <div key={f.text} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/[0.18] backdrop-blur flex items-center justify-center flex-shrink-0">
                    <f.icon size={16} className="text-white" />
                  </div>
                  <span className="font-body text-white/90 text-sm">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="font-body text-white/70 text-sm">
            © 2026 ViewxRent · Rental living, reimagined.
          </div>
        </div>
      </div>

      {/* RIGHT — Form panel */}
      <div className="relative w-full lg:w-[45%] flex flex-col">
        <div className="lg:hidden flex items-center justify-between px-6 py-5 border-b border-vxr-border">
          <div onClick={() => navigate("/")}>
            <Logo size={28} />
          </div>
        </div>

        <button
          onClick={() => navigate("/")}
          className="hidden lg:inline-flex items-center gap-1.5 font-body text-sm font-medium text-vxr-text-sub hover:text-vxr-text transition-colors absolute top-8 right-10"
        >
          <ArrowLeft size={16} />
          Back to home
        </button>

        <div className="flex-1 flex items-center justify-center px-6 lg:px-12 py-10 lg:py-0">
          <div className="w-full max-w-md bg-vxr-surface rounded-vxr-sheet shadow-vxr-lg border border-vxr-border p-8 lg:p-10">
            <form onSubmit={handleLogin}>
              <h2 className="font-display text-3xl lg:text-4xl font-extrabold tracking-tight text-vxr-text">
                Sign in
              </h2>
              <p className="mt-2 font-body text-vxr-text-sub">
                New to ViewxRent?{" "}
                <button
                  type="button"
                  onClick={() => setShowSignupModal(true)}
                  className="text-vxr-accent font-semibold hover:underline"
                >
                  Create an account
                </button>
              </p>

              <div className="mt-8 space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  icon={Mail}
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, email: e.target.value })
                  }
                />

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-body text-[11px] font-semibold uppercase tracking-wider text-vxr-text-sub">
                      Password
                    </label>
                    <button
                      type="button"
                      className="font-body text-xs font-medium text-vxr-accent hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    icon={Lock}
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, password: e.target.value })
                    }
                    suffix={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-vxr-text-muted hover:text-vxr-text"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                </div>
              </div>

              {loginError && (
                <div className="mt-4 flex items-start gap-2 bg-vxr-danger-soft border border-vxr-danger/20 text-vxr-danger font-body text-sm px-4 py-3 rounded-vxr-md">
                  <X size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <Button
                type="submit"
                fullWidth
                size="lg"
                disabled={loginLoading}
                className="mt-6"
              >
                {loginLoading ? "Signing in..." : "Sign in"}
              </Button>

              <div className="my-6 flex items-center gap-4">
                <div className="flex-1 h-px bg-vxr-border" />
                <span className="font-body text-[11px] font-bold uppercase tracking-wider text-vxr-text-muted">
                  OR
                </span>
                <div className="flex-1 h-px bg-vxr-border" />
              </div>

              <Button
                type="button"
                variant="secondary"
                fullWidth
                size="lg"
                onClick={() => setShowSignupModal(true)}
              >
                Create new account
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Signup Modal */}
      <Modal
        open={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        title="Create your account"
        subtitle="Start finding homes in under a minute"
        size="md"
      >
        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            label="Full name"
            type="text"
            placeholder="Juan dela Cruz"
            icon={User}
            value={signupForm.fullName}
            onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            icon={Mail}
            value={signupForm.email}
            onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
          />
          <div className="flex flex-col gap-1.5">
            <label className="font-body text-[11px] font-semibold uppercase tracking-wider text-vxr-text-sub">
              Phone number
            </label>
            <div className="flex">
              <span className="inline-flex items-center gap-1.5 px-4 bg-vxr-surface2 border border-r-0 border-vxr-border rounded-l-vxr-md text-vxr-text-sub font-body text-sm font-medium">
                <Phone size={14} />
                +63
              </span>
              <input
                type="tel"
                placeholder="9171234567"
                value={signupForm.phone}
                onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                className="flex-1 bg-vxr-surface2 border-[1.5px] border-vxr-border rounded-r-vxr-md px-3.5 py-3 font-body text-sm text-vxr-text placeholder:text-vxr-text-muted outline-none focus:border-vxr-accent transition-colors"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="6+ characters"
              autoComplete="new-password"
              icon={Lock}
              value={signupForm.password}
              onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-vxr-text-muted hover:text-vxr-text"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
            <Input
              label="Confirm"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Repeat password"
              autoComplete="new-password"
              icon={Lock}
              value={signupForm.confirmPassword}
              onChange={(e) =>
                setSignupForm({ ...signupForm, confirmPassword: e.target.value })
              }
              suffix={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-vxr-text-muted hover:text-vxr-text"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
          </div>

          {signupError && (
            <div className="flex items-start gap-2 bg-vxr-danger-soft border border-vxr-danger/20 text-vxr-danger font-body text-sm px-4 py-3 rounded-vxr-md">
              <X size={16} className="mt-0.5 flex-shrink-0" />
              <span>{signupError}</span>
            </div>
          )}
          {signupInfo && (
            <div className="flex items-start gap-2 bg-vxr-success-soft border border-vxr-success/20 text-vxr-success font-body text-sm px-4 py-3 rounded-vxr-md">
              <Check size={16} className="mt-0.5 flex-shrink-0" />
              <span>{signupInfo}</span>
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={signupLoading}
          >
            {signupLoading ? "Creating account..." : "Create account"}
          </Button>

          <p className="text-center font-body text-sm text-vxr-text-sub">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setShowSignupModal(false)}
              className="text-vxr-accent font-semibold hover:underline"
            >
              Sign in
            </button>
          </p>

          <p className="text-center font-body text-[11px] text-vxr-text-muted leading-relaxed">
            By creating an account you agree to our Terms of Service and Privacy
            Policy.
          </p>
        </form>
      </Modal>
    </div>
  );
}
