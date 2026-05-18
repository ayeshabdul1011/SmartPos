import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { fmt } from "../lib/currency";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { scanInvoice } from "../lib/invoiceScanner";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";

const CATS = ["Rent", "Utilities", "Salaries", "Marketing", "Supplies", "Maintenance", "Other"];
const handleInvoiceUpload = async (e) => {
  const file = e.target.files[0];

  if (!file) return;

  try {
    const text = await scanInvoice(file);

    console.log(text);

    toast.success("Invoice scanned");
  } catch (err) {
    console.error(err);
    toast.error("Invoice scan failed");
  }
};
export default function Expenses() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: "Supplies", amount: 0, note: "" });
  const handleExpenseUpload = async (e) => {
  const file = e.target.files[0];

  if (!file) return;

  try {
    const text = await scanInvoice(file);

    console.log(text);

    toast.success("Bill scanned");
  } catch (err) {
    console.error(err);
    toast.error("Scan failed");
  }
};

  const load = async () => {
    const { data } = await api.get("/expenses");
    setRows(data);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await api.post("/expenses", { ...form, amount: Number(form.amount) });
      toast.success("Expense added");
      setOpen(false);
      setForm({ category: "Supplies", amount: 0, note: "" });
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const del = async (id) => {
    if (!confirm("Delete expense?")) return;
    await api.delete(`/expenses/${id}`);
    load();
  };

  const total = rows.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="label-cap">Outflows</div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">Total recorded: <span className="mono font-bold text-foreground">{fmt(total)}</span></p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 rounded-sm" data-testid="add-expense-btn">
          <Plus className="h-4 w-4" /> New expense
        </Button>
      </div>
      <Button
      onClick={() =>
      document.getElementById("expense-upload").click()
      }
      variant="outline"
      className="gap-2 rounded-sm"
      >
      Scan Bill
      </Button>

      <input
      id="expense-upload"
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleExpenseUpload}
      />

      <div className="overflow-hidden border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary text-left">
              <th className="label-cap px-3 py-2">Date</th>
              <th className="label-cap px-3 py-2">Category</th>
              <th className="label-cap px-3 py-2">Note</th>
              <th className="label-cap px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2 w-12" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-secondary/40" data-testid={`expense-row-${r.id}`}>
                <td className="mono px-3 py-2 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-3 py-2">{r.category}</td>
                <td className="px-3 py-2 text-muted-foreground">{r.note || "—"}</td>
                <td className="mono px-3 py-2 text-right font-bold">{fmt(r.amount)}</td>
                <td className="px-3 py-2">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del(r.id)} data-testid={`delete-expense-${r.id}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No expenses logged.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm" data-testid="expense-dialog">
          <DialogHeader><DialogTitle>New expense</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="label-cap">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1 rounded-sm" data-testid="expense-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="label-cap">Amount (AUD)</Label>
              <Input type="number" step="0.01" className="mt-1 mono rounded-sm" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="expense-amount" />
            </div>
            <div>
              <Label className="label-cap">Note</Label>
              <Input className="mt-1 rounded-sm" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-sm">Cancel</Button>
            <Button onClick={save} className="rounded-sm" data-testid="expense-save">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
