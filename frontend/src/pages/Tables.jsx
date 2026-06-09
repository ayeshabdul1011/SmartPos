import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Tables() {
    const navigate = useNavigate();
  const [tables] = useState([
    { id: 1, name: "Table 1", status: "Available" },
    { id: 2, name: "Table 2", status: "Occupied" },
    { id: 3, name: "Table 3", status: "Available" },
    { id: 4, name: "Table 4", status: "Reserved" },
  ]);
  
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
            onClick={() => navigate(`/pos?table=${table.id}`)}
            >
  Open Table
</button>
          </div>
        ))}
      </div>
    </div>
  );
}