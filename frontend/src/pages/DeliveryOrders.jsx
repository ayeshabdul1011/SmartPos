import { useNavigate } from "react-router-dom";

export default function DeliveryOrders() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 p-4 md:p-8">
      <h1 className="text-3xl font-bold">
        Delivery Orders
      </h1>

      <button
        className="border px-4 py-2"
        onClick={() => navigate("/menu?delivery=true")}
      >
        New Delivery Order
      </button>
    </div>
  );
}