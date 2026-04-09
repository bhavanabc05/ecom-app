import { useEffect, useMemo, useState } from "react";
import Auth from "./Auth";
import Orders from "./Orders";
import Dashboard from "./Dashboard";

const API = {
  all: "/api/products",
  order: "/api/order",
};

function App() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState("products");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: "assistant", content: "💎 Hi! Ask me about jewellery products." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  // Check if user is already logged in
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    const userName = localStorage.getItem("userName");
    const userPhone = localStorage.getItem("userPhone");
    const userRole = localStorage.getItem("userRole");

    if (userId) {
      setUser({
        userId,
        name: userName,
        phone: userPhone,
        role: userRole || "customer",
      });
      loadAll();
    }
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser({
      userId: userData.userId,
      name: userData.name,
      phone: userData.phone,
      role: userData.role || "customer",
    });
    loadAll();
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("userPhone");
    localStorage.removeItem("userRole");
    setUser(null);
    setCart([]);
    setProducts([]);
  };

  const loadAll = async () => {
    try {
      const response = await fetch(API.all);
      if (!response.ok) throw new Error("Failed to load products");
      const items = await response.json();
      setProducts(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error(error);
      setProducts([]);
    }
  };

  const addToCart = (product) => {
    setCart((current) => [...current, product]);
    setMessage("Added to cart");
    clearMessage();
  };

  const removeFromCart = (index) => {
    setCart((current) => current.filter((_, i) => i !== index));
  };

  const checkout = async () => {
    if (!cart.length) {
      setMessage("Your cart is empty.");
      clearMessage();
      return;
    }

    const order = {
      userId: user.userId,
      items: cart,
      total: totalPrice,
      shippingAddress: {
        name: user.name,
        phone: user.phone,
      },
    };

    const response = await fetch(API.order, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });

    const data = await response.json();

    if (data.success) {
      setCart([]);
      setMessage("✅ Order placed! Thank you for your purchase.");
    } else {
      setMessage("⚠️ Failed to place order.");
    }
    clearMessage();
  };

  const clearMessage = () => {
    setTimeout(() => setMessage(""), 3000);
  };

  const getLocalChatReply = (text) => {
    const query = text.toLowerCase().trim();
    const rawTerms = query.split(/\s+/).filter((term) => term.length > 2);

    if (!rawTerms.length || !products.length) return null;

    // Synonym mapping for better matching
    const synonyms = {
      chain: ["necklace", "pendant"],
      necklace: ["chain", "pendant"],
      ring: ["band", "solitaire"],
      bracelet: ["bangle", "cuff"],
      earring: ["stud", "hoop"],
      gold: ["yellow", "au", "gld"],
      silver: ["ag", "sterling", "slv"],
      diamond: ["stone", "gem", "crystal"],
      cheap: ["affordable", "budget"],
      expensive: ["premium", "luxury"],
    };

    const expandedTerms = new Set(rawTerms);
    rawTerms.forEach((term) => {
      if (synonyms[term]) {
        synonyms[term].forEach((syn) => expandedTerms.add(syn));
      }
    });

    // Price range detection
    const priceMatch = query.match(
      /(?:under|below|less than|up to|within|around)\s*₹?([0-9,]+)/i,
    );
    const priceThreshold = priceMatch
      ? Number(priceMatch[1].replace(/,/g, ""))
      : null;

    // Smart product matching with relevance scoring
    const scored = products.map((product) => {
      const combined = [
        product.name || "",
        product.category || "",
        product.description || "",
      ]
        .join(" ")
        .toLowerCase();

      let score = 0;
      let matchedTerms = 0;

      expandedTerms.forEach((term) => {
        if (combined.includes(term)) {
          score += 1;
          matchedTerms += 1;

          // Boost score if term is in product name (more specific match)
          if ((product.name || "").toLowerCase().includes(term)) {
            score += 2;
          }
        }
      });

      // Price filtering
      if (
        priceThreshold != null &&
        Number(product.price || 0) > priceThreshold
      ) {
        score = 0;
      }

      return { product, score, matchedTerms };
    });

    // Filter and sort by relevance
    const matches = scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || b.matchedTerms - a.matchedTerms)
      .slice(0, 5)
      .map((item) => item.product);

    if (!matches.length) return null;

    const lines = matches.map(
      (product) =>
        `• **${product.name}** (${product.category || "Jewellery"}) — ₹${product.price}`,
    );

    return `I found these perfect matches for you:\n\n${lines.join(
      "\n",
    )}\n\n**Would you like more details about any of these?**`;
  };

  const sendChatMessage = async () => {
    const text = chatInput.trim();
    if (!text) return;

    const nextMessages = [...chatMessages, { role: "user", content: text }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatError("");
    setChatLoading(true);

    const localReply = getLocalChatReply(text);
    if (localReply) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: localReply },
      ]);
      setChatLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const textResponse = await response.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (jsonError) {
        throw new Error(
          `Chat service returned invalid JSON: ${textResponse.slice(0, 120)}`,
        );
      }

      if (!response.ok) {
        throw new Error(data.error || "Chat service returned an error.");
      }

      const botReply = data.reply || "Sorry, I couldn't respond right now.";
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: botReply },
      ]);
    } catch (error) {
      console.error(error);
      setChatError(
        error.message ||
          "The assistant is unavailable. Please try again later.",
      );
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, the assistant is unavailable. Please try again later.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const getImagePath = (path) => {
    if (!path) return "https://via.placeholder.com/150";
    return path.startsWith("/") ? path : `/${path}`;
  };

  const totalPrice = useMemo(
    () => cart.reduce((sum, product) => sum + Number(product.price || 0), 0),
    [cart],
  );

  // If not logged in, show auth form
  if (!user) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-shell">
      <header>
        <div className="header-content">
          <h1>💎 Jewellery Store</h1>
          <nav className="nav-buttons">
            <button
              className={`nav-btn ${currentPage === "products" ? "active" : ""}`}
              onClick={() => setCurrentPage("products")}
            >
              🛍️ Shop
            </button>
            <button
              className={`nav-btn ${currentPage === "orders" ? "active" : ""}`}
              onClick={() => setCurrentPage("orders")}
            >
              📦 My Orders
            </button>
            {user?.role === "admin" && (
              <button
                className={`nav-btn ${currentPage === "dashboard" ? "active" : ""}`}
                onClick={() => setCurrentPage("dashboard")}
              >
                📊 Dashboard
              </button>
            )}
          </nav>
          <div className="header-user">
            <span className="user-name">👤 {user.name}</span>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {currentPage === "products" ? (
        <>
          <div className="toolbar">
            <button type="button" onClick={loadAll}>
              Show All Jewellery
            </button>
          </div>

          <main>
            <section>
              <div className="products">
                {products.map((product) => (
                  <article key={product._id} className="card">
                    <div
                      className="card-image"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <img
                        src={getImagePath(product.imagePath)}
                        alt={product.name}
                      />
                    </div>
                    <div className="card-content">
                      <h3>{product.name}</h3>
                      <p className="price">₹{product.price}</p>
                      <button type="button" onClick={() => addToCart(product)}>
                        Add to cart
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <aside className="cart-panel">
              <h2>🛍️ Cart</h2>
              {message && <div className="message">{message}</div>}
              <ul>
                {cart.map((item, index) => (
                  <li key={`${item._id}-${index}`} className="cart-item">
                    <span>{item.name}</span>
                    <span>₹{item.price}</span>
                    <button type="button" onClick={() => removeFromCart(index)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <div className="checkout-row">
                <span>Total:</span>
                <strong>₹{totalPrice}</strong>
              </div>
              <button
                type="button"
                className="checkout-button"
                onClick={checkout}
              >
                Checkout
              </button>
            </aside>
          </main>
        </>
      ) : currentPage === "orders" ? (
        <Orders user={user} />
      ) : (
        <Dashboard user={user} />
      )}

      {chatOpen && (
        <div className="chat-modal-overlay" onClick={() => setChatOpen(false)}>
          <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="chat-modal-close"
              type="button"
              onClick={() => setChatOpen(false)}
            >
              ✕
            </button>
            <div className="chat-header">
              <h3>Store Assistant</h3>
              <p>Ask me about products, categories, and pricing.</p>
            </div>
            <div className="chat-messages">
              {chatMessages.map((messageItem, index) => (
                <div key={index} className={`chat-message ${messageItem.role}`}>
                  {messageItem.content}
                </div>
              ))}
            </div>
            {chatError && <div className="chat-error">{chatError}</div>}
            <div className="chat-input-row">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder="Ask the assistant..."
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    sendChatMessage();
                  }
                }}
              />
              <button
                type="button"
                onClick={sendChatMessage}
                disabled={chatLoading}
              >
                {chatLoading ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        className="chat-fab"
        type="button"
        onClick={() => setChatOpen(true)}
      >
        💬
      </button>

      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setSelectedProduct(null)}
            >
              ✕
            </button>
            <div className="modal-body">
              <div className="modal-image">
                <img
                  src={getImagePath(selectedProduct.imagePath)}
                  alt={selectedProduct.name}
                />
              </div>
              <div className="modal-info">
                <h2>{selectedProduct.name}</h2>
                <p className="modal-category">{selectedProduct.category}</p>
                <p className="modal-price">₹{selectedProduct.price}</p>
                <div className="modal-specs">
                  <h4>Specifications</h4>
                  <p>{selectedProduct.specs || "No specs available"}</p>
                </div>
                <div className="modal-description">
                  <h4>Description</h4>
                  <p>{selectedProduct.description}</p>
                </div>
                <div className="modal-stock">
                  <span>Stock: {selectedProduct.stock || 10} items</span>
                </div>
                <button
                  className="modal-add-btn"
                  onClick={() => {
                    addToCart(selectedProduct);
                    setSelectedProduct(null);
                  }}
                >
                  Add to cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
