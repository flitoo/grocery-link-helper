
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./CustomerChat.css";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

function CustomerChat() {
  const { orderId } = useParams();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getToken = () => localStorage.getItem("token");

  // Load messages from backend
  async function loadMessages(signal) {
    const token = getToken();

    if (!token) {
      setError("Please log in to view messages.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/api/orders/${orderId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.errors?.[0] ||
            data.error ||
            data.message ||
            "Failed to load messages."
        );
      }

      const messageList = Array.isArray(data)
        ? data
        : data.messages || [];

      setMessages(messageList);
      setError("");
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }

  // Load messages when order changes
  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setMessages([]);
    setError("");
    setSuccess("");

    loadMessages(controller.signal);

    return () => controller.abort();
  }, [orderId]);

  // Send message to backend
  async function handleSend(event) {
    event.preventDefault();

    const content = newMessage.trim();

    if (!content || sending) return;

    const token = getToken();

    if (!token) {
      setError("Please log in before sending messages.");
      return;
    }

    setSending(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_BASE}/api/orders/${orderId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          // Backend requires message_text
          body: JSON.stringify({
            message_text: content,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.errors?.[0] ||
            data.error ||
            data.message ||
            "Failed to send message."
        );
      }

      setNewMessage("");
      setSuccess("Message sent successfully.");

      // Reload conversation after sending
      await loadMessages();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  // Format message time
  function formatTime(value) {
    if (!value) return "";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleString("en-CA", {
          dateStyle: "medium",
          timeStyle: "short",
        });
  }

  return (
    <div className="customer-chat-page">
      {/* Header */}
      <header className="customer-chat-header">
        <h1>Grocery Link Helper</h1>

        <nav>
          <Link to="/dashboard">
            Dashboard
          </Link>

          <Link to="/orders">
            Orders
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="customer-chat-content">
        <div className="customer-chat-title">
          <p>Customer Support</p>

          <h2>Chat with Helper</h2>

          <span>Order #{orderId}</span>
        </div>

        {/* Chat Card */}
        <section className="customer-chat-card">
          <div className="customer-chat-card-header">
            <div>
              <h3>Order #{orderId}</h3>
              <p>Order conversation</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setSuccess("");
                loadMessages();
              }}
              disabled={loading || sending}
            >
              Refresh
            </button>
          </div>

          {/* Message History */}
          <div
            className="customer-chat-messages"
            aria-live="polite"
          >
            {loading ? (
              <p className="customer-chat-empty">
                Loading messages...
              </p>
            ) : messages.length === 0 ? (
              <p className="customer-chat-empty">
                No messages yet.
              </p>
            ) : (
              messages.map((item, index) => {
                const text =
                  item.message_text ??
                  item.message ??
                  item.content ??
                  item.body ??
                  "";

                const sender =
                  item.sender_name ||
                  item.sender_role ||
                  `User #${item.sender_id ?? "Unknown"}`;

                return (
                  <div
                    className="customer-chat-message"
                    key={item.message_id ?? index}
                  >
                    <div className="customer-chat-message-top">
                      <strong>{sender}</strong>

                      <small>
                        {formatTime(
                          item.created_at ||
                            item.sent_at
                        )}
                      </small>
                    </div>

                    <p>{text}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* Error Message */}
          {error && (
            <p
              className="customer-chat-error"
              role="alert"
            >
              {error}
            </p>
          )}

          {/* Success Message */}
          {success && (
            <p className="customer-chat-success">
              {success}
            </p>
          )}

          {/* Send Message Form */}
          <form
            className="customer-chat-form"
            onSubmit={handleSend}
          >
            <textarea
              value={newMessage}
              onChange={(event) =>
                setNewMessage(event.target.value)
              }
              placeholder="Type your message..."
              rows={3}
              maxLength={2000}
              disabled={sending}
            />

            <button
              type="submit"
              disabled={
                !newMessage.trim() || sending
              }
            >
              {sending
                ? "Sending..."
                : "Send Message"}
            </button>
          </form>
        </section>

        {/* Back Button */}
        <Link
          to={`/order-details/${orderId}`}
          className="customer-chat-back"
        >
          Back to Order Details
        </Link>
      </main>
    </div>
  );
}

export default CustomerChat;
