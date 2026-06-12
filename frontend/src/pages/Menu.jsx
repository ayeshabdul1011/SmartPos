import { useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function Menu() {
  const [customerName, setCustomerName] = useState("");
  const [cart, setCart] = useState([]);
const [address, setAddress] = useState("");
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
      station: "Drinks",
    },
     {
      id: 3,
      name: "Chicken Dum Biryani",
      category: "Main Course",
      price: 14.90,
      station: "Kitchen",
    },
     {
      id: 4,
      name: "Gulab Jamun",
      category: "Sweets",
      price: 3.90,
      station: "Sweets",
    },
     {
      id: 5,
      name: "Goat Dum Biryani",
      category: "Main Course",
      price: 15.90,
      station: "Kitchen",
    },
     {
      id: 6,
      name: "Jalebi",
      category: "Sweets",
      price: 2.90,
      station: "Sweets",
    },
  ]);
const [searchParams] = useSearchParams();

const tableId = searchParams.get("table");
const isDelivery =
  searchParams.get("delivery") === "true";

  const addToCart = (item) => {
    const existing = cart.find(
      (c) => c.id === item.id
    );

    if (existing) {
      setCart(
        cart.map((c) =>
          c.id === item.id
            ? { ...c, quantity: c.quantity + 1 }
            : c
        )
      );
    } else {
      setCart([
        ...cart,
        {
          ...item,
          quantity: 1,
        },
      ]);
    }
  };

  const total = cart.reduce(
    (sum, item) =>
      sum + item.price * item.quantity,
    0
  );
const sendOrder = async () => {
    try {
      await fetch(
        "https://smartpos-backend-ore9.onrender.com/api/restaurant/orders",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            table_id: tableId
              ? Number(tableId)
              : null,

            order_type: isDelivery
              ? "delivery"
              : "table",

            customer_name: customerName,

            address: address,

            items: cart.map((item) => ({
  name: item.name,
  quantity: item.quantity,
  price: item.price,
})),
          }),
        }
      );

      alert("Order sent to kitchen");

      setCart([]);
    } catch (err) {
      console.error(err);
      alert("Failed to save order");
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div>
        <div className="label-cap">Restaurant</div>
        <h1 className="text-3xl font-bold tracking-tight">
          Menu Management
        </h1>
      </div>
<button
  className="mt-4 border px-4 py-2"
  onClick={sendOrder}
>
  Send To Kitchen
</button>
      <div className="flex justify-end">
        <button className="border px-4 py-2 bg-card">
          Add Menu Item
        </button>
      </div>
      {isDelivery && (
  <div className="space-y-2">
    <input
      className="border p-2 w-full"
      placeholder="Customer Name"
      value={customerName}
      onChange={(e) =>
        setCustomerName(e.target.value)
      }
    />

    <input
      className="border p-2 w-full"
      placeholder="Delivery Address"
      value={address}
      onChange={(e) =>
        setAddress(e.target.value)
      }
    />
  </div>
)}

      <div className="overflow-hidden border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary text-left">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Kitchen Station</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="px-3 py-2">
  <div className="flex items-center gap-3">
    <img
      src={item.image}
      alt={item.name}
      className="w-16 h-16 object-cover rounded"
    />

    <span>{item.name}</span>
  </div>
</td>
                <td className="px-3 py-2">{item.category}</td>
                <td className="px-3 py-2">
                  ${item.price.toFixed(2)}
                </td>
                <td className="px-3 py-2">{item.station}</td>
                <td className="px-3 py-2">
                  {(() => {
                    const qty = cart.find((c) => c.id === item.id)?.quantity || 0;
                    return (
                      <>
                        <button
                          className="border px-3 py-1"
                          onClick={() => addToCart(item)}
                        >
                          Add
                        </button>
                        {qty > 0 && (
                          <span className="ml-2 font-bold">
                            x{qty}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Current Order */}
<div className="border bg-card p-4 mt-6">
  <h2 className="text-xl font-bold mb-3">
    Current Order
  </h2>

  {cart.length === 0 ? (
    <p>No items selected</p>
  ) : (
    <>
      {cart.map((item) => (
        <div
          key={item.id}
          className="flex justify-between py-2 border-b"
        >
          <span>
            {item.name} x {item.quantity}
          </span>

          <span>
            $
            {(item.price * item.quantity).toFixed(2)}
          </span>
        </div>
      ))}

      <div className="flex justify-between mt-4 text-lg font-bold">
        <span>Total</span>
        <span>${total.toFixed(2)}</span>
      </div>
    </>
  )}
</div>

    </div>
  );
  
}
