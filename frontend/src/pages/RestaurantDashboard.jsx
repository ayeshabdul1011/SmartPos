export default function RestaurantDashboard() {
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
          <div className="text-2xl font-bold">0</div>
        </div>

        <div className="border bg-card p-4">
          <div className="label-cap">Kitchen Queue</div>
          <div className="text-2xl font-bold">0</div>
        </div>

        <div className="border bg-card p-4">
          <div className="label-cap">Delivery Orders</div>
          <div className="text-2xl font-bold">0</div>
        </div>

        <div className="border bg-card p-4">
          <div className="label-cap">Today's Revenue</div>
          <div className="text-2xl font-bold">$0.00</div>
        </div>
      </div>
    </div>
  );
}