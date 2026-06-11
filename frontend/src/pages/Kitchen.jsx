import { useEffect, useState } from "react";

export default function RestaurantDashboard() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    const res = await fetch(
      "https://smartpos-backend-ore9.onrender.com/api/restaurant/orders",
      {
        credentials: "include",
      }
    );

    const data = await res.json();
    setOrders(data);
  };

  const completeOrder = async (orderId) => {
    await fetch(
      `https://smartpos-backend-ore9.onrender.com/api/restaurant/orders/${orderId}/complete`,
      {
        method: "PUT",
        credentials: "include",
      }
    );

    loadOrders();
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">
        Kitchen Orders
      </h1>

      <div className="space-y-4">
        {orders
          .filter((o) => o.status === "pending")
          .map((order) => (
            <div
              key={order.id}
              className="border p-4 rounded"
            >
              <h2 className="font-bold">
                Table {order.table_id}
              </h2>

              {order.items.map((item, idx) => (
                <div key={idx}>
                  {item.quantity} × {item.name}
                </div>
              ))}

              <button
                className="mt-3 border px-3 py-1"
                onClick={() => completeOrder(order.id)}
              >
                Complete
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}