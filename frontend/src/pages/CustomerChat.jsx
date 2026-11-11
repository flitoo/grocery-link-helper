import AppHeader from '../components/AppHeader';
import { API_BASE, api } from '../lib/api';

import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./CustomerChat.css";



function CustomerChat({ isHelper = false }) {
  const { orderId } = useParams();
  return <CustomerChatContent key={orderId} orderId={orderId} isHelper={isHelper} />;
}

function CustomerChatContent({ orderId, isHelper }) {

  const [messages, setMessages] = useState([]);
  const [orderParticipants, setOrderParticipants] =
    useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getToken = () => localStorage.getItem("token");

  // Load messages from backend
  const loadMessages = useCallback(async (signal) => {
    const data = await api(`/orders/${orderId}/messages`, { signal, cache: 'no-store' });
    return Array.isArray(data) ? data : data.messages || [];
  }, [orderId]);

  // Load conversation when order changes
  useEffect(() => {
    const controller = new AbortController();


    loadMessages(controller.signal)
      .then(data => { if (!controller.signal.aborted) { setMessages(data); setError(''); } })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    // Load order information for sender labels
    async function loadOrderParticipants() {
      try {
        const response = await fetch(
          `${API_BASE}/api/orders/${orderId}`,
          {
            signal: controller.signal,
            headers: { Authorization: `Bearer ${getToken()}` },
          }
        );

        if (!response.ok) return;

        const order = await response.json();

        if (!controller.signal.aborted) {
          setOrderParticipants(order);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error(
            "Failed to load order information:",
            err
          );
        }
      }
    }

    loadOrderParticipants();

    return () => controller.abort();
  }, [orderId, loadMessages]);

  // Refresh messages
  async function handleRefresh() {
    setLoading(true);
    setSuccess("");
    try { setMessages(await loadMessages()); setError(''); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

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

      // Reload messages after sending
      setMessages(await loadMessages());
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  // Format message timestamp
  function formatTime(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleString("en-CA", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  // Identify message sender
  function getSenderName(item) {
    const senderId = Number(item.sender_id);

    if (
      orderParticipants &&
      senderId === Number(orderParticipants.customer_id)
    ) {
      return "Customer";
    }

    if (
      orderParticipants?.helper_id != null &&
      senderId === Number(orderParticipants.helper_id)
    ) {
      return "Helper";
    }

    return (
      item.sender_name ||
      item.sender_role ||
      `User #${item.sender_id ?? "Unknown"}`
    );
  }

  return (
    <div className="customer-chat-page">
      {/* Header */}
      <AppHeader helper={isHelper} />

      {/* Main Content */}
      <main className="customer-chat-content">
        <div className="customer-chat-title">
          <p>Order Conversation</p>

          <h2>
            {isHelper
              ? "Chat with Customer"
              : "Chat with Helper"}
          </h2>

          <span>Order #{orderId}</span>
        </div>

        {/* Chat Card */}
        <section className="customer-chat-card">
          <div className="customer-chat-card-header">
            <div>
              <h3>Order #{orderId}</h3>
              <p>
                {isHelper
                  ? "Customer conversation"
                  : "Helper conversation"}
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || sending}
            >
              {loading ? "Loading..." : "Refresh"}
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
                No messages yet. Start the conversation!
              </p>
            ) : (
              messages.map((item, index) => {
                const text =
                  item.message_text ??
                  item.message ??
                  item.content ??
                  item.body ??
                  "";

                return (
                  <div
                    className="customer-chat-message"
                    key={item.message_id ?? index}
                  >
                    <div className="customer-chat-message-top">
                      <strong>
                        {getSenderName(item)}
                      </strong>

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
              placeholder={
                isHelper
                  ? "Type a message to the customer..."
                  : "Type a message to the helper..."
              }
              rows={3}
              maxLength={2000}
              disabled={sending}
            />

            <button
              type="submit"
              disabled={
                !newMessage.trim() ||
                sending ||
                loading ||
                Boolean(error)
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
          to={
            isHelper
              ? `/helper/orders/${orderId}`
              : `/order-details/${orderId}`
          }
          className="customer-chat-back"
        >
          Back to Order Details
        </Link>
      </main>
    </div>
  );
}

export default CustomerChat;
