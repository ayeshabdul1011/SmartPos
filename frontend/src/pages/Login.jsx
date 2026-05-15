import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ArrowRight, ShoppingBag } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("manager@store.com");
  const [password, setPassword] = useState("manager123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await login(email, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    navigate("/");
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-5">
      <div className="relative hidden bg-foreground p-12 lg:col-span-3 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-grid opacity-[0.06]" />
        <div className="relative flex items-center gap-3 text-background">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-background text-foreground font-black">
            P
          </div>
          <div>
            <div className="text-base font-bold tracking-tight">POS PRO</div>
            <div className="label-cap text-[10px] text-background/60">
              Retail control · AUD
            </div>
          </div>
        </div>
        <div className="relative max-w-xl text-background">
          <div className="label-cap mb-4 text-background/60">Operating System for Retail</div>
          <h1 className="text-5xl font-black leading-[0.95] tracking-tight">
            Ring up sales.
            <br />
            Track every dollar.
            <br />
            <span className="text-primary">Sleep well.</span>
          </h1>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-background/70">
            A complete point of sale, inventory, purchases and expense ledger
            built for stores that want clarity, not clutter. Scan, sell, and see
            tonight's profit before you close the shutter.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-px border border-background/20 bg-background/10">
            {[
              { k: "Sale alerts", v: "Real-time" },
              { k: "Daily report", v: "Auto" },
              { k: "Profit view", v: "Day & Month" },
            ].map((s) => (
              <div key={s.k} className="bg-foreground p-4">
                <div className="label-cap text-background/50">{s.k}</div>
                <div className="mono mt-1 text-sm font-bold text-background">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative mono text-[11px] text-background/40">
          © {new Date().getFullYear()} POS PRO · v1.0
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:col-span-2">
        <form
          onSubmit={submit}
          className="w-full max-w-sm space-y-6"
          data-testid="login-form"
        >
          <div className="lg:hidden flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <span className="font-bold tracking-tight">POS PRO</span>
          </div>
          <div>
            <div className="label-cap mb-2">Sign in</div>
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Use your manager or worker credentials to continue.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="email" className="label-cap">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email"
                className="mt-2 rounded-sm"
              />
            </div>
            <div>
              <Label htmlFor="password" className="label-cap">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="login-password"
                className="mt-2 rounded-sm"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive" data-testid="login-error">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            data-testid="login-submit"
            className="w-full justify-between rounded-sm press-fx"
            size="lg"
          >
            <span>{loading ? "Signing in..." : "Sign in"}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="rounded-sm border bg-secondary/40 p-3 text-xs text-muted-foreground">
            <div className="label-cap mb-2 text-[10px]">Demo accounts</div>
            <div className="mono space-y-1">
              <div><strong>Manager</strong> manager@store.com / manager123</div>
              <div><strong>Worker</strong> worker@store.com / worker123</div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
