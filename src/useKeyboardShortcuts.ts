import { useEffect, useCallback, useRef } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrlOrCmd?: boolean;
  description: string;
  action: () => void;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

function isInputElement(element: EventTarget | null): boolean {
  if (!element || !(element instanceof HTMLElement)) return false;
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    element.isContentEditable
  );
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

      for (const shortcut of shortcutsRef.current) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlOrCmdMatch = shortcut.ctrlOrCmd ? ctrlOrCmd : !ctrlOrCmd && !event.metaKey && !event.ctrlKey;

        if (keyMatch && ctrlOrCmdMatch) {
          // For shortcuts that don't require ctrl/cmd, skip if user is typing in input
          if (!shortcut.ctrlOrCmd && isInputElement(event.target)) {
            continue;
          }

          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [enabled]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export function formatShortcutKey(shortcut: KeyboardShortcut): string {
  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modifier = isMac ? "Cmd" : "Ctrl";

  if (shortcut.ctrlOrCmd) {
    return `${modifier}+${shortcut.key.toUpperCase()}`;
  }
  return shortcut.key === "Escape" ? "Esc" : shortcut.key;
}
