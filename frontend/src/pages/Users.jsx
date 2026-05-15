import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import api, { formatApiError } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

const empty = { email: "", password: "", name: "", role: "worker" };

export default function Users() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const { data } = await api.get("/users");
    setRows(data);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await api.post("/users", form);
      toast.success("User created");
      setOpen(false);
      setForm(empty);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const del = async (id) => {
    if (!confirm("Delete this user?")) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="label-cap">Team</div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Workers only see the POS screen. Managers see everything.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2 rounded-sm" data-testid="add-user-btn">
          <Plus className="h-4 w-4" /> New user
        </Button>
      </div>

      <div className="overflow-hidden border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary text-left">
              <th className="label-cap px-3 py-2">Name</th>
              <th className="label-cap px-3 py-2">Email</th>
              <th className="label-cap px-3 py-2">Role</th>
              <th className="label-cap px-3 py-2">Created</th>
              <th className="px-3 py-2 w-12" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-secondary/40" data-testid={`user-row-${r.id}`}>
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="mono px-3 py-2 text-xs">{r.email}</td>
                <td className="px-3 py-2">
                  <span className={`label-cap rounded-sm px-2 py-0.5 ${r.role === "manager" ? "bg-foreground text-background" : "bg-secondary"}`}>
                    {r.role}
                  </span>
                </td>
                <td className="mono px-3 py-2 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  {r.id !== user?.id && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del(r.id)} data-testid={`delete-user-${r.id}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-sm" data-testid="user-dialog">
          <DialogHeader><DialogTitle>New user</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="label-cap">Name</Label>
              <Input className="mt-1 rounded-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="user-name" />
            </div>
            <div>
              <Label className="label-cap">Email</Label>
              <Input type="email" className="mt-1 mono rounded-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="user-email" />
            </div>
            <div>
              <Label className="label-cap">Password</Label>
              <Input type="text" className="mt-1 mono rounded-sm" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="user-password" />
            </div>
            <div>
              <Label className="label-cap">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="mt-1 rounded-sm" data-testid="user-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker">Worker (POS only)</SelectItem>
                  <SelectItem value="manager">Manager (full access)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-sm">Cancel</Button>
            <Button onClick={save} className="rounded-sm" data-testid="user-save">Create user</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
