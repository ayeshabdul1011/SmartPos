import { useEffect, useState } from "react";
import { Plus, ScanLine, Trash2 } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { fmt } from "../lib/currency";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../components/ui/dialog";
import { toast } from "sonner";
import BarcodeScanner from "../components/BarcodeScanner";

const emptyLine = { product_id: null, barcode: "", name: "", quantity: 1, unit_cost: 0 };

export default function Purchases() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ ...emptyLine }]);
  const [scannerIdx, setScannerIdx] = useState(null);

  const load = async () => {
    const { data } = await api.get("/purchases");
    setRows(data);
  };

  useEffect(() => { load(); }, []);

  const updateItem = (idx, patch) => {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const resolveBarcode = async (idx, code) => {
    try {
      const { data } = await api.get(`/products/by-barcode/${encodeURIComponent(code)}`);
      updateItem(idx, { product_id: data.id, name: data.name, unit_cost: data.cost, barcode: code });
      toast.success(`Matched ${data.name}`);
    } catch {
      updateItem(idx, { barcode: code, product_id: null });
      toast.info("New product — fill in name & cost");
    }
  };

  const save = async () => {
    if (!items.length || items.some((it) => !it.name || !it.quantity)) {
      toast.error("Each row needs a name and quantity.");
      return;
    }
    try {
      await api.post("/purchases", {
        supplier,
        notes,
        items: items.map((it) => ({
          product_id: it.product_id || null,
          barcode: it.barcode || null,
          name: it.name,
          quantity: Number(it.quantity),
          unit_cost: Number(it.unit_cost),
        })),
      });
      toast.success("Purchase recorded");
      setOpen(false);
      setSupplier("");
      setNotes("");
      setItems([{ ...emptyLine }]);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Save failed");
    }
  };

  const total = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_cost || 0), 0);

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="label-cap">Stock in</div>
          <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 rounded-sm" data-testid="add-purchase-btn">
          <Plus className="h-4 w-4" /> New purchase
        </Button>
      </div>

      <div className="overflow-hidden border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary text-left">
              <th className="label-cap px-3 py-2">Date</th>
              <th className="label-cap px-3 py-2">Supplier</th>
              <th className="label-cap px-3 py-2">Items</th>
              <th className="label-cap px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-secondary/40" data-testid={`purchase-row-${r.id}`}>
                <td className="mono px-3 py-2 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-3 py-2">{r.supplier || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground text-xs">
                  {r.items.map((it) => `${it.quantity}× ${it.name}`).join(" · ")}
                </td>
                <td className="mono px-3 py-2 text-right font-bold">{fmt(r.total_cost)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">No purchases recorded.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl rounded-sm" data-testid="purchase-dialog">
          <DialogHeader>
            <DialogTitle>New purchase</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="label-cap">Supplier</Label>
              <Input className="mt-1 rounded-sm" value={supplier} onChange={(e) => setSupplier(e.target.value)} data-testid="purchase-supplier" />
            </div>
            <div>
              <Label className="label-cap">Notes</Label>
              <Input className="mt-1 rounded-sm" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div className="border">
            <div className="grid grid-cols-[1.5fr_2fr_0.6fr_0.8fr_auto] gap-px bg-border">
              <div className="label-cap bg-secondary px-2 py-1.5">Barcode</div>
              <div className="label-cap bg-secondary px-2 py-1.5">Name</div>
              <div className="label-cap bg-secondary px-2 py-1.5 text-right">Qty</div>
              <div className="label-cap bg-secondary px-2 py-1.5 text-right">Unit cost</div>
              <div className="bg-secondary px-2 py-1.5" />
            </div>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-[1.5fr_2fr_0.6fr_0.8fr_auto] items-center gap-px border-b bg-card last:border-0">
                <div className="flex items-center gap-1 p-1">
                  <Input
                    placeholder="Barcode"
                    className="mono h-8 rounded-sm"
                    value={it.barcode}
                    onChange={(e) => updateItem(idx, { barcode: e.target.value })}
                    onBlur={(e) => e.target.value && resolveBarcode(idx, e.target.value)}
                    data-testid={`purchase-barcode-${idx}`}
                  />
                  <Button size="icon" variant="outline" className="h-8 w-8 rounded-sm" onClick={() => setScannerIdx(idx)} data-testid={`purchase-scan-${idx}`}>
                    <ScanLine className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Input className="m-1 h-8 rounded-sm" placeholder="Product name" value={it.name} onChange={(e) => updateItem(idx, { name: e.target.value })} data-testid={`purchase-name-${idx}`} />
                <Input type="number" className="m-1 mono h-8 rounded-sm text-right" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} data-testid={`purchase-qty-${idx}`} />
                <Input type="number" step="0.01" className="m-1 mono h-8 rounded-sm text-right" value={it.unit_cost} onChange={(e) => updateItem(idx, { unit_cost: e.target.value })} data-testid={`purchase-cost-${idx}`} />
                <button
                  className="px-2 text-muted-foreground hover:text-destructive"
                  onClick={() => setItems(items.filter((_, i) => i !== idx))}
                  aria-label="remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setItems([...items, { ...emptyLine }])} className="rounded-sm" data-testid="purchase-add-line">
              <Plus className="mr-1 h-4 w-4" /> Add line
            </Button>
            <div className="mono text-lg font-bold">Total: {fmt(total)}</div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-sm">Cancel</Button>
            <Button onClick={save} className="rounded-sm" data-testid="purchase-save">Record purchase</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {scannerIdx !== null && (
        <BarcodeScanner
          onDetected={(code) => {
            resolveBarcode(scannerIdx, code);
            setScannerIdx(null);
          }}
          onClose={() => setScannerIdx(null)}
        />
      )}
    </div>
  );
}
