import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="counter" data-testid="counter">
      <span className="counter-value" data-testid="counter-value">
        {count}
      </span>
      <div className="counter-buttons">
        <button
          data-testid="counter-decrement"
          onClick={() => setCount(count - 1)}
        >
          -
        </button>
        <button
          data-testid="counter-reset"
          onClick={() => setCount(0)}
        >
          Reset
        </button>
        <button
          data-testid="counter-increment"
          onClick={() => setCount(count + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default Counter;
