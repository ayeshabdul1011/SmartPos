import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { fmt, fmtInt } from "../lib/currency";
import Stat from "../components/Stat";
import { Button } from "../components/ui/button";
import { ShoppingCart, Receipt, Truck, ArrowUpRight } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";

export default function Dashboard() {
  const navigate = useNavigate();
  const [today, setToday] = useState(null);
  const [month, setMonth] = useState(null);
  const [series, setSeries] = useState([]);
  const [recent, setRecent] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [reminders, setReminders] = useState([]);

const load = async () => {
  try {
    const d = await api.get("/reports/summary", {
      params: { period: "day" },
    });
    console.log("day summary OK");

    const m = await api.get("/reports/summary", {
      params: { period: "month" },
    });
    console.log("month summary OK");

    const s = await api.get("/reports/timeseries", {
      params: { days: 14 },
    });
    console.log("timeseries OK");

    const r = await api.get("/sales", {
      params: { limit: 8 },
    });
    console.log("sales OK");

    const low = await api.get("/products/low-stock");
    console.log("low stock OK");

    const top = await api.get("/reports/top-products");
    console.log("top products OK");

    setToday(d.data);
    setMonth(m.data);
    setSeries(s.data);
    setRecent(r.data);
    setLowStock(low.data);
    setTopProducts(top.data);
  }   catch (err) {
    console.error(err);
  }
};
  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  return (
    <><><div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label-cap">Manager Console</div>
          <h1 className="text-3xl font-bold tracking-tight">Today at a glance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live operating picture · {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Button onClick={() => navigate("/pos")} className="gap-2 rounded-sm" data-testid="open-pos">
          <ShoppingCart className="h-4 w-4" /> Open POS
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          testId="stat-today-revenue"
          label="Today · Revenue"
          value={today ? fmt(today.revenue) : "—"}
          sub={today ? `${fmtInt(today.sales_count)} sales` : ""}
          tone="accent" />
        <Stat
          testId="stat-today-profit"
          label="Today · Net profit"
          value={today ? fmt(today.net_profit) : "—"}
          sub={today ? `Gross ${fmt(today.gross_profit)}` : ""}
          tone={today && today.net_profit >= 0 ? "good" : "bad"} />
        <Stat
          testId="stat-today-expenses"
          label="Today · Expenses"
          value={today ? fmt(today.expenses) : "—"} />
        <Stat
          testId="stat-month-revenue"
          label="Month · Revenue"
          value={month ? fmt(month.revenue) : "—"}
          sub={month ? `Net ${fmt(month.net_profit)}` : ""} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="border bg-card p-5 lg:col-span-2">
          <div className="flex items-end justify-between">
            <div>
              <div className="label-cap">Last 14 days</div>
              <h3 className="text-lg font-bold tracking-tight">Revenue vs Profit</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/reports")} className="gap-1 rounded-sm" data-testid="goto-reports">
              Reports <ArrowUpRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  formatter={(v) => fmt(v)}
                  contentStyle={{ borderRadius: 2, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="profit" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expenses" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border bg-card p-5">
          <div className="label-cap">Recent sales</div>
          <h3 className="text-lg font-bold tracking-tight">Latest tickets</h3>
          <div className="mt-3 divide-y">
            {recent.length === 0 && (
              <div className="py-10 text-center text-xs text-muted-foreground">No sales yet.</div>
            )}
            {recent.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-semibold">{s.cashier_name}</div>
                  <div className="mono text-[11px] text-muted-foreground">
                    #{s.id.slice(0, 6)} · {new Date(s.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <div className="mono text-sm font-bold">{fmt(s.total)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="border bg-card p-5 mt-4">
        <div className="label-cap">Inventory alerts</div>
        <h3 className="text-lg font-bold tracking-tight">
          Low stock
        </h3>

        <div className="mt-3 divide-y">
          {lowStock.length === 0 && (
            <div className="py-6 text-xs text-muted-foreground">
              All products healthy.
            </div>
          )}

          {lowStock.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between py-2"
            >
              <div>
                <div className="text-sm font-semibold">
                  {p.name}
                </div>

                <div className="mono text-[11px] text-muted-foreground">
                  SKU · {p.sku}
                </div>
              </div>

              <div className="text-right">
                <div className="mono text-sm font-bold text-red-500">
                  {p.stock}
                </div>

                <div className="text-[10px] uppercase text-red-400">
                  low
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <button
          onClick={() => navigate("/purchases")}
          className="flex items-center justify-between border bg-card p-5 text-left transition-colors hover:bg-secondary"
          data-testid="quick-purchases"
        >
          <div>
            <div className="label-cap">Quick action</div>
            <div className="text-lg font-bold tracking-tight">Add purchase</div>
          </div>
          <Truck className="h-5 w-5" />
        </button>
        <button
          onClick={() => navigate("/expenses")}
          className="flex items-center justify-between border bg-card p-5 text-left transition-colors hover:bg-secondary"
          data-testid="quick-expenses"
        >
          <div>
            <div className="label-cap">Quick action</div>
            <div className="text-lg font-bold tracking-tight">Log expense</div>
          </div>
          <Receipt className="h-5 w-5" />
        </button>
        <button
          onClick={() => navigate("/products")}
          className="flex items-center justify-between border bg-card p-5 text-left transition-colors hover:bg-secondary"
          data-testid="quick-products"
        >
          <div>
            <div className="label-cap">Quick action</div>
            <div className="text-lg font-bold tracking-tight">Manage products</div>
          </div>
          <ShoppingCart className="h-5 w-5" />
        </button>
      </div>
    </div><div className="border bg-card p-5">
        <div className="label-cap">Performance</div>

        <h3 className="text-lg font-bold tracking-tight">
          Top selling products
        </h3>

        <div className="mt-4 space-y-3">
          {topProducts.map((p, index) => (
            <div
              key={p.id}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="mono text-xs text-muted-foreground">
                  #{index + 1}
                </div>

                <div>
                  <div className="text-sm font-semibold">
                    {p.name}
                  </div>

                  <div className="text-[11px] text-muted-foreground">
                    {p.qty_sold} sold
                  </div>
                </div>
              </div>

              <div className="mono font-bold">
                {fmt(p.revenue)}
              </div>
            </div>
          ))}
        </div>
      </div></><div className="border bg-card p-5">
        <div className="label-cap">Operations</div>

        <h3 className="text-lg font-bold tracking-tight">
          Purchase reminders
        </h3>

        <div className="mt-4 space-y-3 text-sm">
          <div className="border-l-2 border-yellow-500 pl-3">
            Rice stock reorder due
          </div>

          <div className="border-l-2 border-blue-500 pl-3">
            Supplier payment tomorrow
          </div>

          <div className="border-l-2 border-red-500 pl-3">
            Coca Cola inventory critical
          </div>
        </div>
      </div></>
  );
  
}
