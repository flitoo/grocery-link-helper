import { useState } from 'react';
import OrderForm from './components/OrderForm.jsx';
import Confirmation from './components/Confirmation.jsx';

export default function App() {
  const [order, setOrder] = useState(null);

  return (
    <div className="page">
      <header className="header">
        <h1>Grocery Link Helper</h1>
        <p>Community grocery delivery for Toronto students and busy residents.</p>
      </header>

      <main className="card">
        {order ? (
          <Confirmation order={order} onNewOrder={() => setOrder(null)} />
        ) : (
          <OrderForm onSubmitted={setOrder} />
        )}
      </main>
    </div>
  );
}
