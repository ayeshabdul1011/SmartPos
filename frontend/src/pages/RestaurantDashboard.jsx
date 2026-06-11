import { useEffect, useState } from "react";

export default function RestaurantDashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    kitchenQueue: 0,
    revenue: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await fetch(
        "https://smartpos-backend-ore9.onrender.com/api/restaurant/orders",
        {
          credentials: "include",
        }
      );

      const orders = await res.json();

      const today = new Date().toISOString().split("T")[0];

      const todaysOrders = orders.filter(
        (o) => o.created_at?.startsWith(today)
      );

      const kitchenQueue = orders.filter(
        (o) => o.status === "pending"
      );
      const revenue = todaysOrders.reduce(
  (sum, order) => sum + (order.total || 0),
  0
  );
      setStats({
        totalOrders: todaysOrders.length,
        kitchenQueue: kitchenQueue.length,
        revenue: revenue,
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <div className="label-cap">Restaurant</div>
        <h1 className="text-3xl font-bold tracking-tight">
          Restaurant Dashboard
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="border bg-card p-4">
          <div className="label-cap">Today's Orders</div>
          <div className="text-2xl font-bold">
            {stats.totalOrders}
          </div>
        </div>

        <div className="border bg-card p-4">
          <div className="label-cap">Kitchen Queue</div>
          <div className="text-2xl font-bold">
            {stats.kitchenQueue}
          </div>
        </div>

        <div className="border bg-card p-4">
          <div className="label-cap">Completed Orders</div>
          <div className="text-2xl font-bold">
            {stats.totalOrders - stats.kitchenQueue}
          </div>
        </div>

        <div className="border bg-card p-4">
          <div className="label-cap">Today's Revenue</div>
          <div className="text-2xl font-bold">
            ${stats.revenue.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}