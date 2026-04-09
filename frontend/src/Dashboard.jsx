import { useEffect, useMemo, useState } from "react";

export default function Dashboard({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/orders/all", {
        headers: { "x-user-id": user.userId },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load dashboard orders");
      }
      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Unable to load order dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const result = {
      total: orders.length,
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    orders.forEach((order) => {
      result[order.status] = (result[order.status] || 0) + 1;
    });
    return result;
  }, [orders]);

  const getStatusColor = (status) => {
    const colors = {
      pending: "#ffa500",
      confirmed: "#4169e1",
      shipped: "#1e90ff",
      delivered: "#228b22",
      cancelled: "#dc143c",
    };
    return colors[status] || "#666";
  };

  const getNextStatus = (status) => {
    const flow = ["pending", "confirmed", "shipped", "delivered"];
    const idx = flow.indexOf(status);
    return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
  };

  const statusLabel = (status) => {
    const map = {
      pending: "Confirm order",
      confirmed: "Mark as shipped",
      shipped: "Mark as delivered",
    };
    return map[status] || "Advance status";
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.userId,
        },
        body: JSON.stringify({ status }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error("Invalid JSON response from order status update:", text);
        throw new Error("Order service returned invalid response.");
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to update order status");
      }

      setOrders((prev) =>
        prev.map((order) => (order._id === orderId ? data.order : order)),
      );
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(data.order);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Unable to update order status");
    }
  };

  const actorCards = [
    {
      title: "Customer",
      description:
        "Tracks the order life cycle and checks delivery status. Their view is all about order history, status, and shipping.",
      key: "customer",
    },
    {
      title: "Seller",
      description:
        "Accepts pending orders and prepares them for shipping. Their focus is on confirmed orders and order readiness.",
      key: "seller",
    },
    {
      title: "Warehouse",
      description:
        "Manages shipping operations. They fulfill confirmed orders and move them into the shipped stage.",
      key: "warehouse",
    },
    {
      title: "Delivery",
      description:
        "Ensures shipped orders reach customers. They complete the order life cycle by delivering packages.",
      key: "delivery",
    },
    {
      title: "Admin",
      description:
        "Oversees the entire workflow, manages exceptions, and monitors overall order health.",
      key: "admin",
    },
  ];

  if (loading) {
    return (
      <div className="dashboard-container">
        <h2>📊 Order Dashboard</h2>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2>📊 Order Dashboard</h2>
          <p>
            Welcome, {user.name}. This dashboard shows the order lifecycle from
            customer, seller, warehouse, delivery, and admin perspectives.
          </p>
        </div>
        <button className="refresh-btn" type="button" onClick={fetchOrders}>
          Refresh
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <span className="dashboard-card-title">Total Orders</span>
          <strong>{totals.total}</strong>
        </div>
        <div className="dashboard-card">
          <span className="dashboard-card-title">Pending</span>
          <strong>{totals.pending}</strong>
        </div>
        <div className="dashboard-card">
          <span className="dashboard-card-title">Confirmed</span>
          <strong>{totals.confirmed}</strong>
        </div>
        <div className="dashboard-card">
          <span className="dashboard-card-title">Shipped</span>
          <strong>{totals.shipped}</strong>
        </div>
        <div className="dashboard-card">
          <span className="dashboard-card-title">Delivered</span>
          <strong>{totals.delivered}</strong>
        </div>
        <div className="dashboard-card">
          <span className="dashboard-card-title">Cancelled</span>
          <strong>{totals.cancelled}</strong>
        </div>
      </div>

      <div className="role-panels">
        {actorCards.map((actor) => (
          <div key={actor.key} className="role-panel">
            <h3>{actor.title}</h3>
            <p>{actor.description}</p>
          </div>
        ))}
      </div>

      <section className="dashboard-orders">
        <div className="dashboard-section-heading">
          <h3>Order action board</h3>
          <p>
            Advance orders through all lifecycle phases and manage status
            changes.
          </p>
        </div>
        {orders.length === 0 ? (
          <div className="empty-state">No orders available yet.</div>
        ) : (
          <div className="dashboard-orders-list">
            {orders.map((order) => (
              <div key={order._id} className="dashboard-order-card">
                <div className="dashboard-order-header">
                  <div>
                    <strong>#{order._id.slice(-8).toUpperCase()}</strong>
                    <div>
                      {new Date(order.createdAt).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <span
                    className="status-pill"
                    style={{ background: getStatusColor(order.status) }}
                  >
                    {order.status.toUpperCase()}
                  </span>
                </div>
                <div className="dashboard-order-summary">
                  <span>{order.items.length} items</span>
                  <span>₹{order.total.toLocaleString("en-IN")}</span>
                </div>
                <div className="dashboard-order-actions">
                  {getNextStatus(order.status) && (
                    <button
                      type="button"
                      className="status-btn"
                      onClick={() =>
                        updateOrderStatus(
                          order._id,
                          getNextStatus(order.status),
                        )
                      }
                    >
                      {statusLabel(order.status)}
                    </button>
                  )}
                  {order.status !== "delivered" &&
                    order.status !== "cancelled" && (
                      <button
                        type="button"
                        className="cancel-btn"
                        onClick={() =>
                          updateOrderStatus(order._id, "cancelled")
                        }
                      >
                        Cancel
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
