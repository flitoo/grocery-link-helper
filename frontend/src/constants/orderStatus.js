// Display labels for order statuses stored in the backend.
export const STATUS_LABELS = {
  Pending: "Pending",
  Paid: "Paid",
  Assigned: "Assigned to Helper",
  Shopping: "Shopping",
  Out_for_Delivery: "Out for Delivery",
  Delivered: "Delivered",
  Cancelled: "Cancelled",
};

// Display labels for payment statuses (payments.payment_status).
const PAYMENT_LABELS = {
  Pending: "Pending",
  Verified: "Paid",
  Rejected: "Rejected",
};

export function formatOrderStatus(status, fallback = "Pending") {
  return STATUS_LABELS[status] || status || fallback;
}

export function formatPaymentStatus(status, fallback = "Paid") {
  return PAYMENT_LABELS[status] || status || fallback;
}
