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
    role: "tenant",
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

    const { fullName, email, password, confirmPassword, phone, role } = signupForm;

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
        role,
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
          role: "tenant",
        });
      }
    } catch (err) {
      setSignupError(err?.message || "Sign up failed. Please try again.");
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FFF7F3] flex">
      {/* LEFT — Branding panel */}
      <div className="relative hidden lg:flex w-[52%] overflow-hidden bg-gradient-to-br from-[#EC6138] via-[#F17A5A] to-[#FF8E9E]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute top-1/2 -left-32 w-[420px] h-[420px] rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-32 right-1/4 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between w-full p-12 xl:p-16">
          {/* Logo */}
          <div
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2.5 cursor-pointer group w-fit"
          >
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#EC6138] font-bold text-lg shadow-lg group-hover:scale-105 transition-transform">
              V
            </div>
            <span className="text-white text-xl font-bold tracking-tight">
              ViewxRent
            </span>
          </div>

          {/* Center messaging */}
          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/20 rounded-full px-3.5 py-1.5 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-semibold text-white tracking-wide">
                Welcome back
              </span>
            </div>
            <h1 className="text-white text-5xl xl:text-6xl font-bold tracking-tight leading-[1.05]">
              Find your
              <br />
              next home.
            </h1>
            <p className="mt-5 text-white/90 text-lg leading-relaxed">
              Sign in to continue your rental journey — browse verified homes,
              chat with hosts, and manage everything in one place.
            </p>

            {/* Feature points */}
            <div className="mt-10 space-y-4">
              {[
                { icon: ShieldCheck, text: "Verified landlords & secure payments" },
                { icon: Home, text: "Thousands of homes across the Philippines" },
                { icon: Sparkles, text: "Seamlessly synced with your mobile app" },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white/90 text-sm">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-white/70 text-sm">
            © 2026 ViewxRent · Rental living, reimagined.
          </div>
        </div>
      </div>

      {/* RIGHT — Form panel */}
      <div className="relative w-full lg:w-[48%] flex flex-col">
        {/* Mobile header with brand */}
        <div className="lg:hidden flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#EC6138] to-[#FF8E9E] flex items-center justify-center text-white font-bold text-sm">
              V
            </div>
            <span className="font-bold text-slate-900">ViewxRent</span>
          </div>
        </div>

        {/* Back to home */}
        <button
          onClick={() => navigate("/")}
          className="hidden lg:inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors absolute top-8 right-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </button>

        <div className="flex-1 flex items-center justify-center px-6 lg:px-12 py-10 lg:py-0">
          <form onSubmit={handleLogin} className="w-full max-w-md">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
              Sign in
            </h2>
            <p className="mt-2 text-slate-500">
              New to ViewxRent?{" "}
              <button
                type="button"
                onClick={() => setShowSignupModal(true)}
                className="text-[#EC6138] font-semibold hover:underline"
              >
                Create an account
              </button>
            </p>

            <div className="mt-8 space-y-4">
              {/* Email */}
              <div>
                <label className="text-xs font-semibold text-slate-700 tracking-wide">
                  EMAIL
                </label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={loginForm.email}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, email: e.target.value })
                    }
                    className="w-full h-12 bg-white border border-slate-200 rounded-xl pl-11 pr-4 text-slate-900 placeholder-slate-400 outline-none focus:border-[#EC6138] focus:ring-4 focus:ring-orange-100 transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 tracking-wide">
                    PASSWORD
                  </label>
                  <button
                    type="button"
                    className="text-xs font-medium text-slate-500 hover:text-[#EC6138]"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, password: e.target.value })
                    }
                    className="w-full h-12 bg-white border border-slate-200 rounded-xl pl-11 pr-11 text-slate-900 placeholder-slate-400 outline-none focus:border-[#EC6138] focus:ring-4 focus:ring-orange-100 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {loginError && (
              <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl">
                <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="mt-6 w-full h-12 bg-gradient-to-r from-[#EC6138] to-[#FF8E9E] text-white font-semibold rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loginLoading ? "Signing in..." : "Sign in"}
            </button>

            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs font-semibold text-slate-400 tracking-wide">
                OR
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={() => setShowSignupModal(true)}
              className="w-full h-12 bg-white border border-slate-200 text-slate-800 font-semibold rounded-xl hover:border-slate-300 hover:bg-slate-50 transition"
            >
              Create new account
            </button>
          </form>
        </div>
      </div>

      {/* Signup Modal */}
      {showSignupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setShowSignupModal(false)}
          />

          <div className="relative z-10 w-full max-w-[520px] bg-white rounded-3xl shadow-2xl my-8">
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-slate-100 px-8 py-5 flex items-center justify-between z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Create your account
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Start finding homes in under a minute
                </p>
              </div>
              <button
                onClick={() => setShowSignupModal(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSignup} className="p-8 space-y-4">
              {/* Role selector */}
              <div>
                <label className="text-xs font-semibold text-slate-700 tracking-wide">
                  I'M SIGNING UP AS A
                </label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {[
                    { value: "tenant", label: "Tenant", desc: "I'm looking to rent" },
                    { value: "landlord", label: "Landlord", desc: "I'm listing properties" },
                  ].map((r) => {
                    const active = signupForm.role === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() =>
                          setSignupForm({ ...signupForm, role: r.value })
                        }
                        className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                          active
                            ? "border-[#EC6138] bg-orange-50/50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="font-semibold text-slate-900 text-sm">
                          {r.label}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {r.desc}
                        </div>
                        {active && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#EC6138] flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="text-xs font-semibold text-slate-700 tracking-wide">
                  FULL NAME
                </label>
                <div className="relative mt-1.5">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Juan dela Cruz"
                    value={signupForm.fullName}
                    onChange={(e) =>
                      setSignupForm({ ...signupForm, fullName: e.target.value })
                    }
                    className="w-full h-12 bg-white border border-slate-200 rounded-xl pl-11 pr-4 text-slate-900 placeholder-slate-400 outline-none focus:border-[#EC6138] focus:ring-4 focus:ring-orange-100 transition"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-semibold text-slate-700 tracking-wide">
                  EMAIL
                </label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={signupForm.email}
                    onChange={(e) =>
                      setSignupForm({ ...signupForm, email: e.target.value })
                    }
                    className="w-full h-12 bg-white border border-slate-200 rounded-xl pl-11 pr-4 text-slate-900 placeholder-slate-400 outline-none focus:border-[#EC6138] focus:ring-4 focus:ring-orange-100 transition"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs font-semibold text-slate-700 tracking-wide">
                  PHONE NUMBER
                </label>
                <div className="relative mt-1.5 flex">
                  <span className="inline-flex items-center gap-1.5 px-4 bg-slate-50 border border-r-0 border-slate-200 rounded-l-xl text-slate-600 text-sm font-medium">
                    <Phone className="w-3.5 h-3.5" />
                    +63
                  </span>
                  <input
                    type="tel"
                    placeholder="9171234567"
                    value={signupForm.phone}
                    onChange={(e) =>
                      setSignupForm({ ...signupForm, phone: e.target.value })
                    }
                    className="flex-1 h-12 bg-white border border-slate-200 rounded-r-xl px-4 text-slate-900 placeholder-slate-400 outline-none focus:border-[#EC6138] focus:ring-4 focus:ring-orange-100 transition"
                  />
                </div>
              </div>

              {/* Password + Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 tracking-wide">
                    PASSWORD
                  </label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="6+ characters"
                      autoComplete="new-password"
                      value={signupForm.password}
                      onChange={(e) =>
                        setSignupForm({ ...signupForm, password: e.target.value })
                      }
                      className="w-full h-12 bg-white border border-slate-200 rounded-xl pl-11 pr-11 text-slate-900 placeholder-slate-400 outline-none focus:border-[#EC6138] focus:ring-4 focus:ring-orange-100 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 tracking-wide">
                    CONFIRM
                  </label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      value={signupForm.confirmPassword}
                      onChange={(e) =>
                        setSignupForm({
                          ...signupForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full h-12 bg-white border border-slate-200 rounded-xl pl-11 pr-11 text-slate-900 placeholder-slate-400 outline-none focus:border-[#EC6138] focus:ring-4 focus:ring-orange-100 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {signupError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl">
                  <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{signupError}</span>
                </div>
              )}
              {signupInfo && (
                <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm px-4 py-3 rounded-xl">
                  <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{signupInfo}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={signupLoading}
                className="w-full h-12 bg-gradient-to-r from-[#EC6138] to-[#FF8E9E] text-white font-semibold rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {signupLoading ? "Creating account..." : "Create account"}
              </button>

              <p className="text-center text-sm text-slate-500">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setShowSignupModal(false)}
                  className="text-[#EC6138] font-semibold hover:underline"
                >
                  Sign in
                </button>
              </p>

              <p className="text-center text-[11px] text-slate-400 leading-relaxed">
                By creating an account you agree to our Terms of Service and
                Privacy Policy.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
