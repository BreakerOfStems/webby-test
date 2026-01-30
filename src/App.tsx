import { useState, useCallback, useMemo } from "react";
import ContactForm from "./ContactForm";
import Counter from "./Counter";
import Footer from "./Footer";
import Header from "./Header";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";
import { useTheme } from "./ThemeContext";
import { useToast } from "./ToastContext";
import TodoList from "./TodoList";
import { useKeyboardShortcuts, KeyboardShortcut } from "./useKeyboardShortcuts";

function App() {
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();

  const openHelpModal = useCallback(() => {
    setIsHelpModalOpen(true);
  }, []);

  const closeHelpModal = useCallback(() => {
    setIsHelpModalOpen(false);
  }, []);

  const focusTodoInput = useCallback(() => {
    const todoInput = document.querySelector(
      '[data-testid="todo-input"]'
    ) as HTMLInputElement | null;
    if (todoInput) {
      todoInput.focus();
      todoInput.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const handleToggleTheme = useCallback(() => {
    toggleTheme();
    const newTheme = theme === "light" ? "dark" : "light";
    addToast(`Switched to ${newTheme} mode`, "info");
  }, [theme, toggleTheme, addToast]);

  const clearSearchAndCloseModals = useCallback(() => {
    if (isHelpModalOpen) {
      closeHelpModal();
      return;
    }
    // Clear search input if it has content
    const searchInput = document.querySelector(
      '[data-testid="todo-search-input"]'
    ) as HTMLInputElement | null;
    if (searchInput && searchInput.value) {
      // Trigger React's onChange by setting value and dispatching event
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;
      nativeInputValueSetter?.call(searchInput, "");
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }, [isHelpModalOpen, closeHelpModal]);

  const shortcuts: KeyboardShortcut[] = useMemo(
    () => [
      {
        key: "n",
        ctrlOrCmd: true,
        description: "Focus new todo input",
        action: focusTodoInput,
      },
      {
        key: "d",
        ctrlOrCmd: true,
        description: "Toggle dark mode",
        action: handleToggleTheme,
      },
      {
        key: "Escape",
        description: "Clear search/filter, close modals",
        action: clearSearchAndCloseModals,
      },
      {
        key: "?",
        description: "Show keyboard shortcuts help",
        action: openHelpModal,
      },
    ],
    [focusTodoInput, handleToggleTheme, clearSearchAndCloseModals, openHelpModal]
  );

  useKeyboardShortcuts({ shortcuts });

  return (
    <div className="app-container" data-testid="app-container">
      <Header />
      <div className="app-content">
        <div className="app">
          <header>
            <h1>Webby Test</h1>
            <p>A simple React application for testing the Claude GitHub Runner.</p>
          </header>
          <main>
            <p>Welcome! This app will be expanded with new features.</p>
            <Counter />
            <TodoList />
            <ContactForm />
          </main>
        </div>
      </div>
      <Footer />
      <KeyboardShortcutsModal
        isOpen={isHelpModalOpen}
        onClose={closeHelpModal}
        shortcuts={shortcuts}
      />
    </div>
  );
}

export default App;
