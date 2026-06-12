import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function Menu() {
  const [customerName, setCustomerName] = useState("");
  const [cart, setCart] = useState([]);
const [address, setAddress] = useState("");
const [showForm, setShowForm] = useState(false);

const [newItem, setNewItem] = useState({
  name: "",
  category: "",
  price: "",
  station: "",
  image: "",
});
const saveMenuItem = async () => {
  try {
    await fetch(
      "https://smartpos-backend-ore9.onrender.com/api/restaurant/menu",
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newItem.name,
          category: newItem.category,
          price: Number(newItem.price),
          station: newItem.station,
          image: newItem.image,
        }),
      }
    );

    alert("Menu item added");

    setShowForm(false);

    setNewItem({
      name: "",
      category: "",
      price: "",
      station: "",
      image: "",
    });

  } catch (err) {
    console.error(err);
    alert("Failed to save menu item");
  }
};
const [items, setItems] = useState([]);
useEffect(() => {
  loadMenu();
}, []);

const loadMenu = async () => {
  try {
    const res = await fetch(
      "https://smartpos-backend-ore9.onrender.com/api/restaurant/menu",
      {
        credentials: "include",
      }
    );

    const data = await res.json();

    setItems(data);
  } catch (err) {
    console.error(err);
  }
};
const deleteMenuItem = async (id) => {
  if (!window.confirm("Delete this menu item?")) {
    return;
  }

  try {
    await fetch(
      `https://smartpos-backend-ore9.onrender.com/api/restaurant/menu/${id}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    loadMenu();
  } catch (err) {
    console.error(err);
  }
};
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
<button
  className="border px-4 py-2 bg-card"
  onClick={() => setShowForm(true)}
>
  Add Menu Item
</button>
{showForm && (
  <div className="border p-4 bg-card mt-4 space-y-3">

    <input
      className="border p-2 w-full"
      placeholder="Item Name"
      value={newItem.name}
      onChange={(e) =>
        setNewItem({
          ...newItem,
          name: e.target.value,
        })
      }
    />

    <input
      className="border p-2 w-full"
      placeholder="Category"
      value={newItem.category}
      onChange={(e) =>
        setNewItem({
          ...newItem,
          category: e.target.value,
        })
      }
    />

    <input
      className="border p-2 w-full"
      placeholder="Price"
      type="number"
      value={newItem.price}
      onChange={(e) =>
        setNewItem({
          ...newItem,
          price: e.target.value,
        })
      }
    />

    <input
      className="border p-2 w-full"
      placeholder="Kitchen Station"
      value={newItem.station}
      onChange={(e) =>
        setNewItem({
          ...newItem,
          station: e.target.value,
        })
      }
    />

    <input
      className="border p-2 w-full"
      placeholder="Image URL"
      value={newItem.image}
      onChange={(e) =>
        setNewItem({
          ...newItem,
          image: e.target.value,
        })
      }
    />

    <div className="flex gap-2">
      <button
        className="border px-4 py-2"
        onClick={saveMenuItem}
      >
        Save
      </button>

      <button
        className="border px-4 py-2"
        onClick={() => setShowForm(false)}
      >
        Cancel
      </button>
    </div>

  </div>
)}
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
                          <button
                            className="border px-3 py-1 text-red-600"
                            onClick={() => deleteMenuItem(item.id)}
                      >
                            Delete
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
