import { useEffect, useState } from "react";
import { Bell, CheckCheck, ShoppingCart } from "lucide-react";
import api from "../lib/api";
import { fmt } from "../lib/currency";
import { Button } from "../components/ui/button";

export default function Notifications() {
  const [rows, setRows] = useState([]);

  const load = async () => {
    const { data } = await api.get("/notifications");
    setRows(data);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  const readAll = async () => {
    await api.post("/notifications/read-all");
    load();
  };

  const unread = rows.filter((r) => !r.read).length;

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label-cap">Live feed</div>
          <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="mono font-bold text-foreground">{unread}</span> unread · auto-refresh every 8s
          </p>
        </div>
        <Button onClick={readAll} variant="outline" className="gap-2 rounded-sm" data-testid="mark-all-read" disabled={unread === 0}>
          <CheckCheck className="h-4 w-4" /> Mark all read
        </Button>
      </div>

      <ul className="divide-y border bg-card">
        {rows.length === 0 && (
          <li className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8" strokeWidth={1.5} />
            No alerts yet. New sales will show up here in real time.
          </li>
        )}
        {rows.map((n) => (
          <li
            key={n.id}
            className={`flex items-center gap-4 px-4 py-3 ${n.read ? "opacity-60" : "bg-primary/5"}`}
            data-testid={`notification-${n.id}`}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-sm border bg-card">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{n.title}</div>
              <div className="text-xs text-muted-foreground">{n.message}</div>
            </div>
            <div className="text-right">
              {n.amount > 0 && <div className="mono text-sm font-bold">{fmt(n.amount)}</div>}
              <div className="mono text-[11px] text-muted-foreground">
                {new Date(n.created_at).toLocaleTimeString()}
              </div>
            </div>
            {!n.read && <span className="ml-2 h-2 w-2 rounded-full bg-primary" />}
          </li>
        ))}
      </ul>
    </div>
  );
}
