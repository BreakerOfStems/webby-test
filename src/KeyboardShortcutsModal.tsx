import { useEffect, useRef } from "react";
import { KeyboardShortcut, formatShortcutKey } from "./useKeyboardShortcuts";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

function KeyboardShortcutsModal({
  isOpen,
  onClose,
  shortcuts,
}: KeyboardShortcutsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Filter out the help modal shortcut from the display list
  const displayShortcuts = shortcuts.filter((s) => s.key !== "?");

  return (
    <div
      className="keyboard-shortcuts-backdrop"
      data-testid="keyboard-shortcuts-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-title"
    >
      <div
        className="keyboard-shortcuts-modal"
        data-testid="keyboard-shortcuts-modal"
        ref={modalRef}
      >
        <div className="keyboard-shortcuts-header">
          <h2 id="keyboard-shortcuts-title" data-testid="keyboard-shortcuts-title">
            Keyboard Shortcuts
          </h2>
          <button
            className="keyboard-shortcuts-close"
            data-testid="keyboard-shortcuts-close"
            onClick={onClose}
            ref={closeButtonRef}
            aria-label="Close keyboard shortcuts"
          >
            ✕
          </button>
        </div>
        <ul
          className="keyboard-shortcuts-list"
          data-testid="keyboard-shortcuts-list"
        >
          {displayShortcuts.map((shortcut, index) => (
            <li
              key={index}
              className="keyboard-shortcut-item"
              data-testid="keyboard-shortcut-item"
            >
              <span
                className="keyboard-shortcut-description"
                data-testid="keyboard-shortcut-description"
              >
                {shortcut.description}
              </span>
              <kbd
                className="keyboard-shortcut-key"
                data-testid="keyboard-shortcut-key"
              >
                {formatShortcutKey(shortcut)}
              </kbd>
            </li>
          ))}
          <li className="keyboard-shortcut-item" data-testid="keyboard-shortcut-item">
            <span
              className="keyboard-shortcut-description"
              data-testid="keyboard-shortcut-description"
            >
              Show this help
            </span>
            <kbd
              className="keyboard-shortcut-key"
              data-testid="keyboard-shortcut-key"
            >
              ?
            </kbd>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default KeyboardShortcutsModal;
