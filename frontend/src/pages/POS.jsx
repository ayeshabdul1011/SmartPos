
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ScanLine, Trash2, Plus, Minus, LogOut, Bell, Printer, FileDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api, { formatApiError } from "../lib/api";
import { fmt } from "../lib/currency";
import { printReceipt, downloadReceiptPDF } from "../lib/receipt";
import BarcodeScanner from "../components/BarcodeScanner";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { useSearchParams } from "react-router-dom";

export default function POS() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]); // {product, quantity}
  const [scanner, setScanner] = useState(false);
  const [payment, setPayment] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [showReceipt, setShowReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get("table");

  const loadProducts = async (q = "") => {
    try {
      const { data } = await api.get("/products", { params: q ? { q } : {} });
      setProducts(data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Failed to load products");
    }
  };

const sendToKitchen = async () => {
  try {
    const payload = {
      table_id: Number(tableId),
      items: cart.map((it) => ({
        name: it.product.name,
        quantity: it.quantity,
      })),
      status: "pending",
    };

    console.log("KITCHEN PAYLOAD", payload);

    await api.post("/restaurant/orders", payload);

    toast.success("Order sent to kitchen");

    setCart([]);
  } 
  /*catch (err) {
    console.error("KITCHEN ERROR", err.response?.data);

    toast.error(
      err.response?.data?.detail
        ? JSON.stringify(err.response.data.detail)
        : "Failed to send order"
    );
  }*/
 catch (err) {
  console.log("FULL ERROR", err);
  console.log("RESPONSE", err.response);
  console.log("DATA", err.response?.data);

  toast.error("Failed to save order");
}
};
const saveRestaurantOrder = async () => {
  try {
    const payload = {
      table_id: Number(tableId),
      items: cart.map((it) => ({
        name: it.product.name,
        quantity: it.quantity,
      })),
      status: "pending",
    };

    console.log("SAVE ORDER PAYLOAD", payload);

    await api.post("/restaurant/orders", payload);

    toast.success("Order saved");
  } 
  /*catch (err) {
    console.error("SAVE ORDER ERROR", err.response?.data);
    toast.error("Failed to save order");
  }
};*/
catch (err) {
  console.log("FULL ERROR", err);
  console.log("RESPONSE", err.response);
  console.log("DATA", err.response?.data);

  toast.error("Failed to save order");
}
};

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadProducts(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const addToCart = (product, quantity = 1) => {
    if (!product) return;
    if (product.stock <= 0) {
      toast.error(`${product.name} out of stock`);
      return;
    }
    setCart((c) => {
      const idx = c.findIndex((i) => i.product.id === product.id);
      if (idx >= 0) {
        const next = [...c];
        const newquantity = Math.min(next[idx].quantity + quantity, product.stock);
        next[idx] = { ...next[idx], quantity: newquantity };
        return next;
      }
      return [...c, { product, quantity: Math.min(quantity, product.stock) }];
    });
  };

  const updatequantity = (productId, quantity) => {
    setCart((c) =>
      c
        .map((it) =>
          it.product.id === productId
            ? { ...it, quantity: Math.max(0, Math.min(quantity, it.product.stock)) }
            : it
        )
        .filter((it) => it.quantity > 0)
    );
  };

  const removeItem = (productId) => {
    setCart((c) => c.filter((it) => it.product.id !== productId));
  };

  const subtotal = useMemo(
    () => cart.reduce((s, it) => s + it.quantity * it.product.price, 0),
    [cart]
  );
  const total = Math.max(0, subtotal - Number(discount || 0));

  const handleScan = async (code) => {
    setScanner(false);
    try {
      const { data } = await api.get(`/products/by-barcode/${encodeURIComponent(code)}`);
      addToCart(data, 1);
      toast.success(`Added ${data.name}`);
    } catch (e) {
      toast.error("Product not found for barcode " + code);
    }
  };
  const handleCheckout = async () => {
    if (tableId) {
      await sendToKitchen();
    } else {
      await checkout();
    }
  };

  const checkout = async () => {
    if (!cart.length) return;
    setSubmitting(true);
    try {
      const { data } = await api.post("/sales", {
        items: cart.map((it) => ({
          product_id: it.product.id,
          quantity: it.quantity,
          price: it.product.price,
        })),
        payment_method: payment,
        discount: Number(discount || 0),
      });
      setShowReceipt(data);
      setCart([]);
      setDiscount(0);
      loadProducts(query);
      toast.success(`Sale recorded · ${fmt(data.total)}`);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
        <div className="flex h-screen flex-col bg-background">
           <div className="p-2 bg-yellow-100">
      Table ID: {tableId || "NONE"}
    </div>
      {/* top bar */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-foreground text-background font-black">P</div>
          <div>
            <div className="text-sm font-bold tracking-tight">POS · Register</div>
            <div className="label-cap text-[10px]">Cashier · {user?.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === "manager" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard")}
              data-testid="back-to-dashboard"
              className="rounded-sm"
            >
              Manager view
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/notifications")}
            data-testid="bell-btn"
            title="Alerts"
            className="rounded-sm"
          >
            <Bell className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            data-testid="pos-logout"
            className="gap-2 rounded-sm"
          >
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </header>
      {tableId && (
  <div className="border-b bg-amber-50 p-3 text-center font-semibold">
    🍽️ Table {tableId}
  </div>
)}      
      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[65fr_35fr]">
        {/* Left: products */}
        <section className="flex flex-col border-r">
          <div className="flex items-center gap-2 border-b bg-card p-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, SKU or barcode"
                data-testid="pos-search"
                className="rounded-sm pl-9"
              />
            </div>
            <Button
              onClick={() => setScanner(true)}
              data-testid="pos-scan-btn"
              className="gap-2 rounded-sm"
            >
              <ScanLine className="h-4 w-4" /> Scan
            </Button>
          </div>

          <div className="flex-1 overflow-auto p-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={p.stock <= 0}
                  data-testid={`product-card-${p.id}`}
                  className="group relative flex flex-col items-start border bg-card p-3 text-left transition-transform hover:-translate-y-0.5 hover:border-foreground disabled:opacity-40"
                >
                  <div className="label-cap text-[10px]">{p.category}</div>
                  <div className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug">
                    {p.name}
                  </div>
                  <div className="mono mt-2 flex w-full items-end justify-between">
                    <span className="text-lg font-bold">{fmt(p.price)}</span>
                    <span className="text-[11px] text-muted-foreground">×{p.stock}</span>
                  </div>
                </button>
              ))}
              {products.length === 0 && (
                <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
                  No products. Manager can add products in the Products screen.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right: cart */}
        <section className="flex flex-col bg-card">
          <div className="border-b px-4 py-3">
            <div className="label-cap">Cart</div>
            <div className="mono text-2xl font-bold">{cart.length} item(s)</div>
          </div>
          <div className="flex-1 overflow-auto">
            {cart.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                Tap a product or scan a barcode to start a sale.
              </div>
            ) : (
              <ul className="divide-y">
                {cart.map((it) => (
                  <li key={it.product.id} className="flex items-center gap-3 px-4 py-3" data-testid={`cart-item-${it.product.id}`}>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{it.product.name}</div>
                      <div className="mono text-xs text-muted-foreground">
                        {fmt(it.product.price)} each
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7 rounded-sm"
                        onClick={() => updatequantity(it.product.id, it.quantity - 1)}
                        data-testid={`quantity-dec-${it.product.id}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="mono w-7 text-center text-sm font-bold">{it.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7 rounded-sm"
                        onClick={() => updatequantity(it.product.id, it.quantity + 1)}
                        data-testid={`quantity-inc-${it.product.id}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="mono w-20 text-right text-sm font-bold">
                      {fmt(it.product.price * it.quantity)}
                    </div>
                    <button
                      onClick={() => removeItem(it.product.id)}
                      className="text-muted-foreground hover:text-destructive"
                      data-testid={`remove-${it.product.id}`}
                      aria-label="remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3 border-t bg-secondary/40 p-4">
            <div className="grid grid-cols-3 gap-2">
              {["cash", "card", "other"].map((m) => (
                <button
                  key={m}
                  onClick={() => setPayment(m)}
                  data-testid={`payment-${m}`}
                  className={`label-cap rounded-sm border py-2 text-center transition-colors ${
                    payment === m
                      ? "border-foreground bg-foreground text-background"
                      : "bg-card hover:bg-secondary"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between mono text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 mono text-sm">
                <span className="text-muted-foreground">Discount</span>
                <Input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="mono h-7 w-24 rounded-sm text-right"
                  data-testid="discount-input"
                />
              </div>
              <div className="flex items-center justify-between border-t pt-2 mono text-xl font-bold">
                <span>Total</span>
                <span data-testid="cart-total">{fmt(total)}</span>
              </div>
            </div>
            {tableId && (
  <Button
    variant="outline"
    className="w-full"
    onClick={saveRestaurantOrder}
  >
    Save Order
  </Button>
)}
            <Button
              size="lg"
              className="h-12 w-full rounded-sm text-base font-bold press-fx"
              disabled={cart.length === 0 || submitting}
              onClick={() => {
              if (tableId) {
              sendToKitchen();
              } else {
              checkout();
              }
              }}
              data-testid="checkout-btn"
            >
              {submitting
  ? "Processing..."
  : tableId
    ? "Send To Kitchen"
    : `Charge ${fmt(total)}`
}
            </Button>
          </div>
        </section>
      </div>

      {scanner && (
        <BarcodeScanner onDetected={handleScan} onClose={() => setScanner(false)} />
      )}

      <Dialog open={!!showReceipt} onOpenChange={(o) => !o && setShowReceipt(null)}>
        <DialogContent className="max-w-sm rounded-sm" data-testid="receipt-dialog">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {showReceipt && (
            <div className="space-y-2 mono text-sm">
              <div className="text-xs text-muted-foreground">
                #{showReceipt.id.slice(0, 8)} · {new Date(showReceipt.created_at).toLocaleString()}
              </div>
              <div className="border-t pt-2">
                {showReceipt.items.map((it, i) => (
                  <div key={i} className="flex justify-between py-0.5">
                    <span className="truncate pr-2">{it.quantity}× {it.name}</span>
                    <span>{fmt(it.line_total)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t pt-2">
                <span>Subtotal</span>
                <span>{fmt(showReceipt.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount</span>
                <span>-{fmt(showReceipt.discount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total</span>
                <span>{fmt(showReceipt.total)}</span>
              </div>
              <div className="label-cap pt-2">Paid · {showReceipt.payment_method}</div>
            </div>
          )}
          <DialogFooter className="grid grid-cols-3 gap-2 sm:grid-cols-3">
            <Button
              variant="outline"
              className="rounded-sm gap-2"
              onClick={() => showReceipt && printReceipt(showReceipt)}
              data-testid="receipt-print"
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button
              variant="outline"
              className="rounded-sm gap-2"
              onClick={() => showReceipt && downloadReceiptPDF(showReceipt)}
              data-testid="receipt-pdf"
            >
              <FileDown className="h-4 w-4" /> PDF
            </Button>
            <Button onClick={() => setShowReceipt(null)} className="rounded-sm" data-testid="receipt-close">
              New sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
