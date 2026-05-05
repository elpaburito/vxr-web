import { useNavigate } from "react-router-dom";
import { ShieldAlert, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminGuard({ children }) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 text-sm">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-full bg-orange-50 flex items-center justify-center mb-3">
            <LogIn className="w-5 h-5 text-[#EC6138]" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Sign in required</h2>
          <p className="text-sm text-slate-500 mt-1">
            You need to be signed in as an administrator to access this area.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="mt-5 w-full h-11 rounded-xl bg-gradient-to-r from-[#EC6138] to-[#FF8E9E] text-white font-semibold"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  if (profile?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-3">
            <ShieldAlert className="w-5 h-5 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Access denied</h2>
          <p className="text-sm text-slate-500 mt-1">
            Your account doesn't have administrator privileges. Ask an admin to update
            your role to <span className="font-semibold">admin</span> in the profiles table.
          </p>
          <button
            onClick={() => navigate("/home2")}
            className="mt-5 w-full h-11 rounded-xl bg-slate-900 text-white font-semibold"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return children;
}
