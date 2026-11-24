// Synthetic audit data only. Never use a real login token in browser reports.
export const slot = '2099-01-01T18:00:00.000Z';
export const product = { item_id: 1, store_id: 1, name: 'Milk', brand: 'Audit dairy', category: 'Dairy', unit: 'each', unit_price: 5, dietary_tags: [] };
export const order = { order_id: 42, customer_id: 3, helper_id: 7, helper_name: 'Audit Helper', store_id: 1,
  store_name: 'Audit Grocery', status: 'Shopping', delivery_slot: slot, delivery_address: '123 Test Street, Toronto',
  total_amount: 10, created_at: '2026-11-24T12:00:00.000Z', item_count: 1, payment_status: 'Verified',
  items: [{ item_id: 1, item_name: 'Milk', brand: 'Audit dairy', quantity: 2, unit: 'each', estimated_price: 5, allow_substitution: true }] };
export const routes = ['/', '/register', '/forgot-password', '/dashboard', '/store-selection', '/grocery-list',
  '/delivery-time', '/order-summary', '/payment', '/orders', '/order-details/42', '/orders/42/repeat',
  '/collections', '/notifications', '/orders/42/rate', '/orders/42/chat', '/orders/42/tracking',
  '/orders/42/substitutions', '/helper-dashboard', '/helper/orders/42', '/helper/orders/42/status',
  '/helper/orders/42/chat', '/helper/orders/42/substitutions'];

export function storageFor(route) {
  const helper = route.startsWith('/helper');
  return {
    token: 'audit-fixture-not-a-real-token',
    user: JSON.stringify({ id: helper ? 7 : 3, user_id: helper ? 7 : 3, role: helper ? 'Helper' : 'Customer', name: 'Audit User' }),
    selectedStore: JSON.stringify({ id: 1, name: 'Audit Grocery', address: 'Toronto' }),
    groceryItems: JSON.stringify([{ id: 'audit-1', catalogItemId: 1, storeId: 1, name: 'Milk', brand: 'Audit dairy', quantity: 2, unit: 'each', estimatedPrice: 5, allowSubstitution: true }]),
    deliverySlot: slot, deliveryAddress: order.delivery_address, orderId: '42',
    currentOrder: JSON.stringify({ ...order, id: 42, orderId: 42, total: 10 }),
  };
}

export function responseFor(path, route) {
  const currentOrder = { ...order, status: route.endsWith('/rate') ? 'Delivered' : 'Shopping' };
  if (path === '/api/stores') return { stores: [{ store_id: 1, store_name: 'Audit Grocery', address: 'Toronto' }] };
  if (path === '/api/items/filters') return { categories: ['Dairy'], dietary_tags: ['Organic'] };
  if (path.endsWith('/alternatives')) return { item: product, alternatives: [{ ...product, item_id: 2, brand: 'Alternative dairy' }] };
  if (path === '/api/items') return { items: [product], total: 1 };
  if (path === '/api/slots') return { capacity: 2, slots: [{ start: slot, date: '2099-01-01', booked: 0, remaining: 2, available: true }] };
  if (path === '/api/orders/42') return currentOrder;
  if (['/api/orders', '/api/orders/assigned', '/api/orders/available'].includes(path)) return { orders: [currentOrder] };
  if (path === '/api/orders/42/messages') return [{ message_id: 1, sender_id: 7, sender_name: 'Audit Helper', message_text: 'Shopping has started.', sent_at: '2026-11-24T13:00:00Z' }];
  if (path === '/api/payments/42') return { payment_id: 1, payment_status: 'Verified', amount: 10, payment_method: 'Card' };
  if (path === '/api/ratings/orders/42') return { _status: 404, errors: ['Rating not found.'] };
  if (path === '/api/substitution-requests/orders/42') return route.startsWith('/helper') ? [] : [{ substitution_id: 1, original_item_id: 1, suggested_item_name: 'Oat milk', price_difference: '0.50', status: 'Pending' }];
  if (path === '/api/notifications') return { notifications: [{ notification_id: 1, order_id: 42, kind: 'DeliveryDelayed', created_at: '2026-11-24T13:00:00Z', read_at: null }] };
  if (path === '/api/collections') return { collections: [{ collection_id: 1, name: 'Weekly groceries', category: 'Weekly', description: '', item_count: 1 }] };
  if (path === '/api/collections/1') return { collection: { collection_id: 1, name: 'Weekly groceries', category: 'Weekly', description: '', items: [{ collection_item_id: 1, item_name: 'Milk', quantity: 2, unit: 'each', estimated_unit_price: 5, dietary_options: [] }] } };
  if (path === '/api/helpers/stats') return { stats: { active_orders: 1, completed_orders: 1, cancelled_orders: 0, average_rating: 5, rating_count: 1 } };
  if (path === '/api/helpers/history') return { orders: [{ ...order, status: 'Delivered' }], has_more: false };
  throw new Error(`Missing audit fixture: ${path}`);
}
