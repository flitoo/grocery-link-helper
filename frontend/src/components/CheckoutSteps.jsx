import { Link } from "react-router-dom";
import Icon from "./Icon";
import "./CheckoutSteps.css";

// The order flow really is a sequence, so the steps are numbered.
const STEPS = [
  { to: "/grocery-list", label: "List" },
  { to: "/store-selection", label: "Store" },
  { to: "/delivery-time", label: "Time" },
  { to: "/order-summary", label: "Review" },
  { to: "/payment", label: "Pay" },
];

function CheckoutSteps({ current }) {
  return (
    <nav className="steps" aria-label="Order progress">
      <ol>
        {STEPS.map((step, index) => {
          const state =
            index < current
              ? "done"
              : index === current
                ? "current"
                : "todo";

          const content = (
            <>
              <span className="step-dot">
                {state === "done" ? (
                  <Icon name="check" size={18} />
                ) : (
                  index + 1
                )}
              </span>
              <span className="step-label">{step.label}</span>
            </>
          );

          return (
            <li
              key={step.to}
              className={`step step-${state}`}
              aria-current={state === "current" ? "step" : undefined}
            >
              {state === "done" ? (
                <Link to={step.to}>{content}</Link>
              ) : (
                <div className="step-inner">{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default CheckoutSteps;
