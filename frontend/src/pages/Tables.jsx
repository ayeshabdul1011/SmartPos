import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Tables() {
    const navigate = useNavigate();
const [tables, setTables] = useState([
  { id: 1, name: "Table 1", status: "Available" },
  { id: 2, name: "Table 2", status: "Available" },
  { id: 3, name: "Table 3", status: "Available" },
  { id: 4, name: "Table 4", status: "Available" },
]);
useEffect(() => {
  loadTables();
    const interval = setInterval(loadTables, 5000);

  return () => clearInterval(interval);
}, []);

const loadTables = async () => {
  try {
    const res = await fetch(
      "https://smartpos-backend-ore9.onrender.com/api/restaurant/orders",
      {
        credentials: "include",
      }
    );

    const orders = await res.json();

    const updatedTables = [1, 2, 3, 4].map((tableId) => {
      const hasOrder = orders.some(
        (o) =>
          o.table_id === tableId &&
          o.status === "pending"
      );

      return {
        id: tableId,
        name: `Table ${tableId}`,
        status: hasOrder ? "Occupied" : "Available",
      };
    });

    setTables(updatedTables);
  } catch (err) {
    console.error(err);
  }
};
  return (
    <div className="space-y-6 p-4 md:p-8">
      <h1 className="text-3xl font-bold">Tables</h1>

      <div className="grid gap-4 md:grid-cols-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className="border bg-card p-5"
          >
            <h2 className="font-bold">{table.name}</h2>

            <p
            className={`mt-2 font-semibold ${
            table.status === "Available"
            ? "text-green-600"
            : table.status === "Occupied"
            ? "text-red-600"
            : "text-yellow-600"
          }`}
>
  {table.status}
</p>

           <button
            className="mt-4 border px-3 py-1"
            onClick={() => navigate(`/menu?table=${table.id}`)}
            >
  Open Table
</button>
          </div>
        ))}
      </div>
    </div>
  );
}