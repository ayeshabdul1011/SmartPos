import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Protected({ children, manager = false }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-primary pulse-dot" />
          <span className="label-cap">Loading workspace</span>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (manager && user.role !== "manager") return <Navigate to="/login" replace />;
  // workers shouldn't access manager screens
  if (!manager && user.role === "worker") return children;
  return children;
}

export function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "manager" ? "/dashboard" : "/pos"} replace />;
}
