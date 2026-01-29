import { useToast } from "./ToastContext";

function Toast() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-container" data-testid="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          data-testid={`toast-${toast.type}`}
        >
          <span className="toast-message" data-testid="toast-message">
            {toast.message}
          </span>
          <button
            className="toast-close"
            data-testid="toast-close-btn"
            onClick={() => removeToast(toast.id)}
            aria-label="Close toast"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export default Toast;
