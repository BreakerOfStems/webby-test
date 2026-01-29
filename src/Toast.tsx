import { useToast, Toast as ToastType } from "./ToastContext";

function ToastItem({ toast }: { toast: ToastType }) {
  const { removeToast } = useToast();

  return (
    <div
      className={`toast toast-${toast.type}`}
      data-testid="toast"
      data-toast-type={toast.type}
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
  );
}

function ToastContainer() {
  const { toasts } = useToast();

  return (
    <div className="toast-container" data-testid="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

export default ToastContainer;
