import { useEffect, useState } from "react";

export default function Orders({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [user.userId]);

  const fetchOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${user.userId}`);
      if (!response.ok) throw new Error("Failed to fetch orders");
      const data = await response.json();
      setOrders(
        Array.isArray(data)
          ? data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          : [],
      );
    } catch (err) {
      console.error(err);
      setError("Unable to load your orders");
    } finally {
      setLoading(false);
    }
  };

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

  const getStatusIcon = (status) => {
    const icons = {
      pending: "⏳",
      confirmed: "✓",
      shipped: "📦",
      delivered: "✅",
      cancelled: "❌",
    };
    return icons[status] || "○";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const StatusTimeline = ({ status }) => {
    const statuses = ["pending", "confirmed", "shipped", "delivered"];
    const currentIndex = statuses.indexOf(status);

    return (
      <div className="timeline">
        {statuses.map((s, idx) => (
          <div key={s} className="timeline-item">
            <div
              className={`timeline-circle ${idx <= currentIndex ? "active" : ""}`}
            >
              {getStatusIcon(s)}
            </div>
            <div className="timeline-label">
              <span className="timeline-status">
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
            </div>
            {idx < statuses.length - 1 && (
              <div
                className={`timeline-line ${idx < currentIndex ? "active" : ""}`}
              ></div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const statusDescription = (status) => {
    const descriptions = {
      pending: "Order placed and waiting for seller confirmation.",
      confirmed: "Seller accepted the order and is preparing it for shipment.",
      shipped: "Order has left the warehouse and is on its way.",
      delivered: "Order has been delivered to the customer.",
      cancelled: "Order has been cancelled and will not be shipped.",
    };
    return descriptions[status] || "Order status is being processed.";
  };

  const getNextStatus = (status) => {
    const orderFlow = ["pending", "confirmed", "shipped", "delivered"];
    const currentIndex = orderFlow.indexOf(status);
    return currentIndex >= 0 && currentIndex < orderFlow.length - 1
      ? orderFlow[currentIndex + 1]
      : null;
  };

  const getNextStatusLabel = (status) => {
    const nextStatus = getNextStatus(status);
    const labels = {
      confirmed: "Confirm order",
      shipped: "Mark as shipped",
      delivered: "Mark as delivered",
    };
    return labels[nextStatus] || "Advance status";
  };

  const updateOrderStatus = async (orderId, status, trackingNumber) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.userId,
        },
        body: JSON.stringify({ status, trackingNumber }),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error(
          "Invalid JSON response from /api/orders/:orderId/status:",
          text,
        );
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

  if (loading) {
    return (
      <div className="orders-container">
        <h2>📦 My Orders</h2>
        <p>Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="orders-container">
      <h2>📦 My Orders</h2>
      <p className="order-lifecycle-note">
        Order phases: pending → confirmed → shipped → delivered. Use the action
        buttons inside an order to move it through the lifecycle.
      </p>

      {error && <div className="error-message">{error}</div>}

      {orders.length === 0 ? (
        <div className="empty-state">
          <p>No orders yet. Start shopping to see your orders here!</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div
              key={order._id}
              className="order-card"
              onClick={() =>
                setSelectedOrder(
                  selectedOrder?._id === order._id ? null : order,
                )
              }
            >
              <div className="order-header">
                <div className="order-info">
                  <div className="order-id">
                    Order ID:{" "}
                    <span className="code">
                      {order._id.slice(-8).toUpperCase()}
                    </span>
                  </div>
                  <div className="order-date">
                    {formatDate(order.createdAt)}
                  </div>
                </div>
                <div className="order-status">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(order.status) }}
                  >
                    {getStatusIcon(order.status)} {order.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="order-summary">
                <div className="summary-item">
                  <span className="label">Items:</span>
                  <span className="value">{order.items.length}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Total:</span>
                  <span className="value">
                    ₹{order.total.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {selectedOrder?._id === order._id && (
                <div className="order-details">
                  <h4>Status Timeline</h4>
                  <StatusTimeline status={order.status} />
                  <p className="status-message">
                    {statusDescription(order.status)}
                  </p>

                  {order.status !== "delivered" &&
                    order.status !== "cancelled" && (
                      <div className="order-actions">
                        <button
                          type="button"
                          className="cancel-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            updateOrderStatus(order._id, "cancelled");
                          }}
                        >
                          Cancel Order
                        </button>
                      </div>
                    )}

                  <h4 style={{ marginTop: "20px" }}>Order Items</h4>
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th className="qty-col">Qty</th>
                        <th className="price-col">Price</th>
                        <th className="amount-col">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.name}</td>
                          <td className="qty-col">{item.quantity}</td>
                          <td className="price-col">₹{item.price}</td>
                          <td className="amount-col">
                            ₹
                            {(item.price * item.quantity).toLocaleString(
                              "en-IN",
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {order.shippingAddress && (
                    <>
                      <h4 style={{ marginTop: "20px" }}>Shipping Address</h4>
                      <div className="shipping-box">
                        <p>
                          <strong>{order.shippingAddress.name}</strong>
                        </p>
                        {order.shippingAddress.address && (
                          <p>{order.shippingAddress.address}</p>
                        )}
                        {order.shippingAddress.city && (
                          <p>{order.shippingAddress.city}</p>
                        )}
                        {order.shippingAddress.zipCode && (
                          <p>PIN: {order.shippingAddress.zipCode}</p>
                        )}
                        {order.shippingAddress.phone && (
                          <p>📞 {order.shippingAddress.phone}</p>
                        )}
                      </div>
                    </>
                  )}

                  {order.trackingNumber && (
                    <>
                      <h4 style={{ marginTop: "20px" }}>Tracking</h4>
                      <div className="tracking-box">
                        <strong>Tracking Number:</strong> {order.trackingNumber}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
