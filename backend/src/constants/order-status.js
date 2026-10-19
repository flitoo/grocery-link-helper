// Statuses a helper can move an order through, one step at a time.
const NEXT_STATUS = {
  Assigned: 'Shopping',
  Shopping: 'Out_for_Delivery',
  Out_for_Delivery: 'Delivered',
};

const HELPER_SETTABLE_STATUSES = Object.values(NEXT_STATUS);

module.exports = { NEXT_STATUS, HELPER_SETTABLE_STATUSES };
