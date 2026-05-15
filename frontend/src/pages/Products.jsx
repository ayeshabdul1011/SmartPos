import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ScanLine, Search } from "lucide-react";
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

const empty = { name: "", barcode: "", sku: "", category: "General", price: 0, cost: 0, stock: 0 };

export default function Products() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [scanner, setScanner] = useState(false);

  const load = async (search = "") => {
    const { data } = await api.get("/products", { params: search ? { q: search } : {} });
    setRows(data);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name || "",
      barcode: p.barcode || "",
      sku: p.sku || "",
      category: p.category || "General",
      price: p.price ?? 0,
      cost: p.cost ?? 0,
      stock: p.stock ?? 0,
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      const body = {
        ...form,
        price: Number(form.price),
        cost: Number(form.cost),
        stock: Number(form.stock),
        barcode: form.barcode || null,
        sku: form.sku || null,
      };
      if (editing) {
        await api.put(`/products/${editing.id}`, body);
        toast.success("Product updated");
      } else {
        await api.post("/products", body);
        toast.success("Product created");
      }
      setOpen(false);
      load(q);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Save failed");
    }
  };

  const del = async (p) => {
    if (!confirm(`Delete ${p.name}?`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      toast.success("Deleted");
      load(q);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label-cap">Inventory</div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="rounded-sm pl-9" data-testid="products-search" />
          </div>
          <Button onClick={openNew} className="gap-2 rounded-sm" data-testid="add-product-btn">
            <Plus className="h-4 w-4" /> Add product
          </Button>
        </div>
      </div>

      <div className="overflow-hidden border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary text-left">
              <th className="label-cap px-3 py-2">Name</th>
              <th className="label-cap px-3 py-2">Barcode</th>
              <th className="label-cap px-3 py-2">Category</th>
              <th className="label-cap px-3 py-2 text-right">Price</th>
              <th className="label-cap px-3 py-2 text-right">Cost</th>
              <th className="label-cap px-3 py-2 text-right">Stock</th>
              <th className="label-cap px-3 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-secondary/40" data-testid={`product-row-${p.id}`}>
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="mono px-3 py-2 text-xs text-muted-foreground">{p.barcode || "—"}</td>
                <td className="px-3 py-2">{p.category}</td>
                <td className="mono px-3 py-2 text-right">{fmt(p.price)}</td>
                <td className="mono px-3 py-2 text-right text-muted-foreground">{fmt(p.cost)}</td>
                <td className={`mono px-3 py-2 text-right ${p.stock <= 5 ? "text-destructive" : ""}`}>{p.stock}</td>
                <td className="px-3 py-2 text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)} data-testid={`edit-${p.id}`} className="h-7 w-7">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => del(p)} data-testid={`delete-${p.id}`} className="h-7 w-7 text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No products yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm" data-testid="product-dialog">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label className="label-cap">Name</Label>
              <Input className="mt-1 rounded-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="product-name" />
            </div>
            <div>
              <Label className="label-cap">Barcode</Label>
              <div className="mt-1 flex gap-2">
                <Input className="mono rounded-sm" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} data-testid="product-barcode" />
                <Button type="button" variant="outline" size="icon" onClick={() => setScanner(true)} className="rounded-sm" data-testid="product-scan">
                  <ScanLine className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="label-cap">Category</Label>
              <Input className="mt-1 rounded-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div>
              <Label className="label-cap">Sell price (AUD)</Label>
              <Input type="number" step="0.01" className="mt-1 mono rounded-sm" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} data-testid="product-price" />
            </div>
            <div>
              <Label className="label-cap">Cost (AUD)</Label>
              <Input type="number" step="0.01" className="mt-1 mono rounded-sm" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} data-testid="product-cost" />
            </div>
            <div>
              <Label className="label-cap">Stock on hand</Label>
              <Input type="number" className="mt-1 mono rounded-sm" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} data-testid="product-stock" />
            </div>
            <div>
              <Label className="label-cap">SKU</Label>
              <Input className="mt-1 mono rounded-sm" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-sm">Cancel</Button>
            <Button onClick={save} className="rounded-sm" data-testid="product-save">{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {scanner && (
        <BarcodeScanner
          onDetected={(code) => {
            setForm((f) => ({ ...f, barcode: code }));
            setScanner(false);
            toast.success("Barcode set");
          }}
          onClose={() => setScanner(false)}
        />
      )}
    </div>
  );
}
