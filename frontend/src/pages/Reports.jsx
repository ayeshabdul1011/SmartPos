import { useEffect, useState } from "react";
import api from "../lib/api";
import { fmt } from "../lib/currency";
import Stat from "../components/Stat";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Download, Printer, FileDown } from "lucide-react";
import { printReceipt, downloadReceiptPDF } from "../lib/receipt";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

export default function Reports() {
  const [day, setDay] = useState(null);
  const [month, setMonth] = useState(null);
  const [series, setSeries] = useState([]);
  const [detail, setDetail] = useState(null);

  const load = async () => {
    const [d, m, s, r] = await Promise.all([
      api.get("/reports/summary", { params: { period: "day" } }),
      api.get("/reports/summary", { params: { period: "month" } }),
      api.get("/reports/timeseries", { params: { days: 30 } }),
      api.get("/reports/daily-report"),
    ]);
    setDay(d.data);
    setMonth(m.data);
    setSeries(s.data);
    setDetail(r.data);
  };

  useEffect(() => { load(); }, []);

  const exportCsv = () => {
    if (!detail) return;
    const lines = [
      `Daily Sales Report,${detail.date}`,
      ``,
      `Revenue,${detail.revenue}`,
      `COGS,${detail.cogs}`,
      `Gross profit,${detail.gross_profit}`,
      `Expenses,${detail.expenses}`,
      `Net profit,${detail.net_profit}`,
      `Sales count,${detail.sales_count}`,
      ``,
      `Top products`,
      `Name,Quantity,Revenue`,
      ...detail.top_products.map((p) => `${p.name},${p.quantity},${p.revenue}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-report-${detail.date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label-cap">Reports</div>
          <h1 className="text-3xl font-bold tracking-tight">Profit & Loss</h1>
        </div>
        <Button onClick={exportCsv} variant="outline" className="gap-2 rounded-sm" data-testid="export-csv">
          <Download className="h-4 w-4" /> Export today (CSV)
        </Button>
      </div>

      <Tabs defaultValue="day">
        <TabsList className="rounded-sm">
          <TabsTrigger value="day" data-testid="tab-day">Day</TabsTrigger>
          <TabsTrigger value="month" data-testid="tab-month">Month</TabsTrigger>
        </TabsList>
        <TabsContent value="day" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Revenue" value={day ? fmt(day.revenue) : "—"} tone="accent" />
            <Stat label="Gross profit" value={day ? fmt(day.gross_profit) : "—"} tone="good" />
            <Stat label="Expenses" value={day ? fmt(day.expenses) : "—"} />
            <Stat label="Net profit" value={day ? fmt(day.net_profit) : "—"} tone={day && day.net_profit >= 0 ? "good" : "bad"} />
          </div>
        </TabsContent>
        <TabsContent value="month" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Revenue" value={month ? fmt(month.revenue) : "—"} tone="accent" />
            <Stat label="Gross profit" value={month ? fmt(month.gross_profit) : "—"} tone="good" />
            <Stat label="Expenses" value={month ? fmt(month.expenses) : "—"} />
            <Stat label="Net profit" value={month ? fmt(month.net_profit) : "—"} tone={month && month.net_profit >= 0 ? "good" : "bad"} />
          </div>
        </TabsContent>
      </Tabs>

      <div className="border bg-card p-5">
        <div className="label-cap">Last 30 days</div>
        <h3 className="text-lg font-bold tracking-tight">Daily revenue vs expenses</h3>
        <div className="mt-4 h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 2, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="revenue" fill="hsl(var(--chart-1))" />
              <Bar dataKey="expenses" fill="hsl(var(--chart-2))" />
              <Bar dataKey="profit" fill="hsl(var(--chart-3))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {detail && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border bg-card p-5">
            <div className="label-cap">Top products today</div>
            <h3 className="text-lg font-bold tracking-tight">Best sellers</h3>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="label-cap py-2">Product</th>
                  <th className="label-cap py-2 text-right">Qty</th>
                  <th className="label-cap py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {detail.top_products.map((p) => (
                  <tr key={p.name} className="border-b last:border-0">
                    <td className="py-2">{p.name}</td>
                    <td className="mono py-2 text-right">{p.quantity}</td>
                    <td className="mono py-2 text-right font-bold">{fmt(p.revenue)}</td>
                  </tr>
                ))}
                {detail.top_products.length === 0 && (
                  <tr><td colSpan={3} className="py-8 text-center text-muted-foreground text-xs">No sales today.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border bg-card p-5">
            <div className="label-cap">Latest tickets today</div>
            <h3 className="text-lg font-bold tracking-tight">Recent sales</h3>
            <ul className="mt-3 divide-y">
              {detail.recent_sales.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{s.cashier_name}</div>
                    <div className="mono text-[11px] text-muted-foreground">
                      #{s.id.slice(0, 6)} · {new Date(s.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                  <span className="mono font-bold">{fmt(s.total)}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    title="Print receipt"
                    onClick={() => printReceipt(s)}
                    data-testid={`reprint-${s.id}`}
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    title="Download PDF"
                    onClick={() => downloadReceiptPDF(s)}
                    data-testid={`pdf-${s.id}`}
                  >
                    <FileDown className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
              {detail.recent_sales.length === 0 && <li className="py-8 text-center text-xs text-muted-foreground">No sales today.</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
