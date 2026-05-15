import { useNavigate } from "react-router-dom";
import { ShieldAlert, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { Button, Card } from "./vxr";

export default function AdminGuard({ children }) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-vxr-bg">
        <div className="font-body text-vxr-text-sub text-sm">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-vxr-bg p-6">
        <Card className="max-w-sm w-full p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-vxr-accent-soft flex items-center justify-center mb-3">
            <LogIn className="w-5 h-5 text-vxr-accent" />
          </div>
          <h2 className="font-display text-lg font-extrabold text-vxr-text">Sign in required</h2>
          <p className="font-body text-sm text-vxr-text-sub mt-1">
            You need to be signed in as an administrator to access this area.
          </p>
          <Button fullWidth size="lg" className="mt-5" onClick={() => navigate("/login")}>
            Go to login
          </Button>
        </Card>
      </div>
    );
  }

  if (profile?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-vxr-bg p-6">
        <Card className="max-w-sm w-full p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-vxr-danger-soft flex items-center justify-center mb-3">
            <ShieldAlert className="w-5 h-5 text-vxr-danger" />
          </div>
          <h2 className="font-display text-lg font-extrabold text-vxr-text">Access denied</h2>
          <p className="font-body text-sm text-vxr-text-sub mt-1">
            Your account doesn't have administrator privileges. Ask an admin to update
            your role to <span className="font-semibold">admin</span> in the profiles table.
          </p>
          <Button
            fullWidth
            variant="secondary"
            size="lg"
            className="mt-5"
            onClick={() => navigate("/home2")}
          >
            Back to home
          </Button>
        </Card>
      </div>
    );
  }

  return children;
}
