import { useState } from "react";

export default function Menu() {
  const [items] = useState([
    {
      id: 1,
      name: "Butter Chicken",
      category: "Main Course",
      price: 18.90,
      station: "Kitchen",
    },
    {
      id: 2,
      name: "Mango Lassi",
      category: "Drinks",
      price: 4.90,
      station: "Bar",
    },
  ]);

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <div className="label-cap">Restaurant</div>
        <h1 className="text-3xl font-bold tracking-tight">
          Menu Management
        </h1>
      </div>

      <div className="flex justify-end">
        <button className="border px-4 py-2 bg-card">
          Add Menu Item
        </button>
      </div>

      <div className="overflow-hidden border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary text-left">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Kitchen Station</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="px-3 py-2">{item.name}</td>
                <td className="px-3 py-2">{item.category}</td>
                <td className="px-3 py-2">
                  ${item.price.toFixed(2)}
                </td>
                <td className="px-3 py-2">{item.station}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}