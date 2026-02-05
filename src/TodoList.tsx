import { useState, useEffect, useMemo, useRef } from "react";
import { useToast } from "./ToastContext";
import TodoStats from "./TodoStats";

type CategoryType = "work" | "personal" | "shopping" | "health" | "other";
type PriorityType = "high" | "medium" | "low";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  dueDate?: string; // ISO date string
  category?: CategoryType;
  priority: PriorityType;
}

const CATEGORIES: { value: CategoryType; label: string }[] = [
  { value: "work", label: "Work" },
  { value: "personal", label: "Personal" },
  { value: "shopping", label: "Shopping" },
  { value: "health", label: "Health" },
  { value: "other", label: "Other" },
];

const PRIORITIES: { value: PriorityType; label: string; emoji: string }[] = [
  { value: "high", label: "High", emoji: "🔴" },
  { value: "medium", label: "Medium", emoji: "🟡" },
  { value: "low", label: "Low", emoji: "🟢" },
];

type FilterType = "all" | "active" | "completed";
type DueDateFilterType = "all" | "today" | "overdue" | "upcoming";
type PriorityFilterType = "all" | "high" | "medium-plus" | "high-only";
type SortType = "manual" | "priority" | "dueDate" | "created";

// Helper function to get start of day in local timezone
function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper function to check if a date is today
function isToday(date: Date): boolean {
  const today = getStartOfDay(new Date());
  const d = getStartOfDay(date);
  return d.getTime() === today.getTime();
}

// Helper function to check if a date is tomorrow
function isTomorrow(date: Date): boolean {
  const tomorrow = getStartOfDay(new Date());
  tomorrow.setDate(tomorrow.getDate() + 1);
  const d = getStartOfDay(date);
  return d.getTime() === tomorrow.getTime();
}

// Helper function to check if a date is yesterday
function isYesterday(date: Date): boolean {
  const yesterday = getStartOfDay(new Date());
  yesterday.setDate(yesterday.getDate() - 1);
  const d = getStartOfDay(date);
  return d.getTime() === yesterday.getTime();
}

// Helper function to check if a date is within this week (next 7 days)
function isWithinWeek(date: Date): boolean {
  const today = getStartOfDay(new Date());
  const d = getStartOfDay(date);
  const diffTime = d.getTime() - today.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 6;
}

// Helper function to check if a date is overdue
function isOverdue(dueDate: string): boolean {
  const today = getStartOfDay(new Date());
  const due = getStartOfDay(new Date(dueDate));
  return due.getTime() < today.getTime();
}

// Helper function to get priority order (high = 0, medium = 1, low = 2)
function getPriorityOrder(priority: PriorityType): number {
  switch (priority) {
    case "high": return 0;
    case "medium": return 1;
    case "low": return 2;
    default: return 2;
  }
}

// Helper function to format date in a relative, readable format
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);

  if (isToday(date)) {
    return "Today";
  }
  if (isTomorrow(date)) {
    return "Tomorrow";
  }
  if (isYesterday(date)) {
    return "Yesterday";
  }
  if (isWithinWeek(date)) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STORAGE_KEY = "todos";
const ORDER_STORAGE_KEY = "todo-order";
const FILTER_STORAGE_KEY = "todo-filter";
const DUE_DATE_FILTER_STORAGE_KEY = "todo-due-date-filter";
const CATEGORY_FILTER_STORAGE_KEY = "todo-category-filter";
const PRIORITY_FILTER_STORAGE_KEY = "todo-priority-filter";
const SORT_STORAGE_KEY = "todo-sort";

function TodoList() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsedTodos = JSON.parse(saved);
    // Migration: add default priority to existing todos
    return parsedTodos.map((todo: any) => ({
      ...todo,
      priority: todo.priority || "low"
    }));
  });
  const [inputValue, setInputValue] = useState("");
  const [dueDateValue, setDueDateValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>(() => {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    return (saved as FilterType) || "all";
  });
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilterType>(() => {
    const saved = localStorage.getItem(DUE_DATE_FILTER_STORAGE_KEY);
    return (saved as DueDateFilterType) || "all";
  });
  const [categoryValue, setCategoryValue] = useState<CategoryType | "">("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryType | "all">(() => {
    const saved = localStorage.getItem(CATEGORY_FILTER_STORAGE_KEY);
    return (saved as CategoryType | "all") || "all";
  });
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilterType>(() => {
    const saved = localStorage.getItem(PRIORITY_FILTER_STORAGE_KEY);
    return (saved as PriorityFilterType) || "all";
  });
  const [sortBy, setSortBy] = useState<SortType>(() => {
    const saved = localStorage.getItem(SORT_STORAGE_KEY);
    return (saved as SortType) || "manual";
  });
  const [priorityValue, setPriorityValue] = useState<PriorityType>("low");
  const [todoOrder, setTodoOrder] = useState<number[]>(() => {
    const saved = localStorage.getItem(ORDER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(null);
  const draggedRef = useRef<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const { addToast } = useToast();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    localStorage.setItem(FILTER_STORAGE_KEY, filter);
  }, [filter]);

  useEffect(() => {
    localStorage.setItem(DUE_DATE_FILTER_STORAGE_KEY, dueDateFilter);
  }, [dueDateFilter]);

  useEffect(() => {
    localStorage.setItem(CATEGORY_FILTER_STORAGE_KEY, categoryFilter);
  }, [categoryFilter]);

  useEffect(() => {
    localStorage.setItem(PRIORITY_FILTER_STORAGE_KEY, priorityFilter);
  }, [priorityFilter]);

  useEffect(() => {
    localStorage.setItem(SORT_STORAGE_KEY, sortBy);
  }, [sortBy]);

  useEffect(() => {
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(todoOrder));
  }, [todoOrder]);

  // Sort todos by the selected sorting method
  const orderedTodos = useMemo(() => {
    const sortedTodos = [...todos];

    if (sortBy === "priority") {
      sortedTodos.sort((a, b) => {
        // First sort by priority (high -> medium -> low)
        const aPriority = getPriorityOrder(a.priority);
        const bPriority = getPriorityOrder(b.priority);
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        // Then by creation date (newest first)
        return b.id - a.id;
      });
    } else if (sortBy === "dueDate") {
      sortedTodos.sort((a, b) => {
        // Items with due dates first, sorted by date
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        if (a.dueDate && b.dueDate) {
          const aDate = new Date(a.dueDate).getTime();
          const bDate = new Date(b.dueDate).getTime();
          if (aDate !== bDate) {
            return aDate - bDate;
          }
        }
        // Then by creation date (newest first)
        return b.id - a.id;
      });
    } else if (sortBy === "created") {
      sortedTodos.sort((a, b) => b.id - a.id); // Newest first
    } else if (sortBy === "manual") {
      // Create a map of id -> order index
      const orderMap = new Map<number, number>();
      todoOrder.forEach((id, index) => orderMap.set(id, index));

      // Sort todos: items in order first (by their position), then items not in order (newest first, at top)
      sortedTodos.sort((a, b) => {
        const aInOrder = orderMap.has(a.id);
        const bInOrder = orderMap.has(b.id);

        if (!aInOrder && !bInOrder) {
          // Both are new - newer items (higher id) come first (at top)
          return b.id - a.id;
        }
        if (!aInOrder) return -1; // a is new, goes to top
        if (!bInOrder) return 1;  // b is new, goes to top

        // Both have order - sort by order
        return orderMap.get(a.id)! - orderMap.get(b.id)!;
      });
    }

    return sortedTodos;
  }, [todos, todoOrder, sortBy]);

  const filteredTodos = useMemo(() => {
    return orderedTodos.filter((todo) => {
      const matchesSearch = todo.text.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && !todo.completed) ||
        (filter === "completed" && todo.completed);

      // Due date filter logic
      let matchesDueDateFilter = true;
      if (dueDateFilter !== "all") {
        if (!todo.dueDate) {
          matchesDueDateFilter = false;
        } else {
          const dueDate = new Date(todo.dueDate);
          const today = getStartOfDay(new Date());
          const dueDateStart = getStartOfDay(dueDate);

          if (dueDateFilter === "today") {
            matchesDueDateFilter = isToday(dueDate);
          } else if (dueDateFilter === "overdue") {
            matchesDueDateFilter = dueDateStart.getTime() < today.getTime();
          } else if (dueDateFilter === "upcoming") {
            matchesDueDateFilter = dueDateStart.getTime() > today.getTime();
          }
        }
      }

      // Category filter logic
      const matchesCategoryFilter =
        categoryFilter === "all" || todo.category === categoryFilter;

      // Priority filter logic
      let matchesPriorityFilter = true;
      if (priorityFilter !== "all") {
        if (priorityFilter === "high-only") {
          matchesPriorityFilter = todo.priority === "high";
        } else if (priorityFilter === "medium-plus") {
          matchesPriorityFilter = todo.priority === "high" || todo.priority === "medium";
        } else if (priorityFilter === "high") {
          matchesPriorityFilter = todo.priority === "high";
        }
      }

      return matchesSearch && matchesFilter && matchesDueDateFilter && matchesCategoryFilter && matchesPriorityFilter;
    });
  }, [orderedTodos, searchQuery, filter, dueDateFilter, categoryFilter, priorityFilter]);

  const counts = useMemo(() => {
    const searchFiltered = todos.filter((todo) =>
      todo.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return {
      all: searchFiltered.length,
      active: searchFiltered.filter((t) => !t.completed).length,
      completed: searchFiltered.filter((t) => t.completed).length,
    };
  }, [todos, searchQuery]);

  const priorityCounts = useMemo(() => {
    const searchFiltered = todos.filter((todo) => {
      const matchesSearch = todo.text.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && !todo.completed) ||
        (filter === "completed" && todo.completed);
      const matchesCategoryFilter =
        categoryFilter === "all" || todo.category === categoryFilter;
      return matchesSearch && matchesFilter && matchesCategoryFilter;
    });

    return {
      all: searchFiltered.length,
      high: searchFiltered.filter((t) => t.priority === "high").length,
      medium: searchFiltered.filter((t) => t.priority === "medium").length,
      low: searchFiltered.filter((t) => t.priority === "low").length,
    };
  }, [todos, searchQuery, filter, categoryFilter]);

  const dueDateCounts = useMemo(() => {
    const searchFiltered = todos.filter((todo) =>
      todo.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const today = getStartOfDay(new Date());

    return {
      all: searchFiltered.length,
      today: searchFiltered.filter((t) => t.dueDate && isToday(new Date(t.dueDate))).length,
      overdue: searchFiltered.filter((t) => t.dueDate && isOverdue(t.dueDate)).length,
      upcoming: searchFiltered.filter((t) => {
        if (!t.dueDate) return false;
        const dueDateStart = getStartOfDay(new Date(t.dueDate));
        return dueDateStart.getTime() > today.getTime();
      }).length,
    };
  }, [todos, searchQuery]);

  const highlightMatch = (text: string) => {
    if (!searchQuery.trim()) return text;
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} data-testid="todo-highlight">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const addTodo = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const newTodo: Todo = {
      id: Date.now(),
      text: trimmed,
      completed: false,
      dueDate: dueDateValue || undefined,
      category: categoryValue || undefined,
      priority: priorityValue,
    };
    setTodos([...todos, newTodo]);
    setInputValue("");
    setDueDateValue("");
    setCategoryValue("");
    setPriorityValue("low");
    addToast("Todo item added successfully!", "success");
  };

  const toggleTodo = (id: number) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const startEdit = (id: number, currentText: string) => {
    setEditingId(id);
    setEditValue(currentText);
  };

  const saveEdit = (id: number) => {
    const trimmedValue = editValue.trim();
    if (!trimmedValue) {
      // Revert to original text if empty
      setEditingId(null);
      setEditValue("");
      return;
    }

    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, text: trimmedValue } : todo
      )
    );
    setEditingId(null);
    setEditValue("");
    addToast("Todo updated successfully!", "success");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleDoubleClick = (id: number, currentText: string) => {
    startEdit(id, currentText);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, id: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit(id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleEditBlur = (id: number) => {
    saveEdit(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTodo();
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedId(id);
    draggedRef.current = id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id.toString());
    // Add slight delay for visual feedback to work properly
    requestAnimationFrame(() => {
      const el = e.target as HTMLElement;
      el.classList.add("dragging");
    });
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropTargetId(null);
    setDropPosition(null);
    draggedRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (draggedRef.current === null || draggedRef.current === id) return;

    // Determine drop position based on mouse position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? "before" : "after";

    setDropTargetId(id);
    setDropPosition(position);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the actual target, not children
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTargetId(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();

    const draggedIdFromData = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (isNaN(draggedIdFromData) || draggedIdFromData === targetId) {
      handleDragEnd();
      return;
    }

    // Get current order or initialize with current todo ids
    const currentOrder = todoOrder.length > 0
      ? [...todoOrder]
      : orderedTodos.map(t => t.id);

    // Ensure dragged item is in the order
    if (!currentOrder.includes(draggedIdFromData)) {
      currentOrder.unshift(draggedIdFromData);
    }
    // Ensure target item is in the order
    if (!currentOrder.includes(targetId)) {
      currentOrder.push(targetId);
    }

    // Remove dragged item from its current position
    const filteredOrder = currentOrder.filter(id => id !== draggedIdFromData);

    // Find target position
    const targetIndex = filteredOrder.indexOf(targetId);

    // Insert at the correct position
    const insertIndex = dropPosition === "before" ? targetIndex : targetIndex + 1;
    filteredOrder.splice(insertIndex, 0, draggedIdFromData);

    setTodoOrder(filteredOrder);
    handleDragEnd();
    addToast("Todo reordered", "info");
  };

  // Keyboard reordering with Alt+Arrow keys
  const handleTodoKeyDown = (e: React.KeyboardEvent, todoId: number, index: number) => {
    if (!e.altKey) return;

    if (e.key === "ArrowUp" && index > 0) {
      e.preventDefault();
      moveTodo(todoId, index, index - 1);
    } else if (e.key === "ArrowDown" && index < filteredTodos.length - 1) {
      e.preventDefault();
      moveTodo(todoId, index, index + 1);
    }
  };

  const moveTodo = (todoId: number, fromIndex: number, toIndex: number) => {
    // Get current filtered order
    const currentFilteredIds = filteredTodos.map(t => t.id);

    // Get the full order (or initialize if empty)
    const currentOrder = todoOrder.length > 0
      ? [...todoOrder]
      : orderedTodos.map(t => t.id);

    // Ensure all filtered items are in the order
    currentFilteredIds.forEach(id => {
      if (!currentOrder.includes(id)) {
        currentOrder.push(id);
      }
    });

    // Get the IDs of the items being swapped in the filtered view
    const movedId = currentFilteredIds[fromIndex];
    const targetId = currentFilteredIds[toIndex];

    // Find position in the full order and remove
    const movedFullIndex = currentOrder.indexOf(movedId);
    currentOrder.splice(movedFullIndex, 1);
    const newTargetIndex = currentOrder.indexOf(targetId);
    const insertAt = fromIndex < toIndex ? newTargetIndex + 1 : newTargetIndex;
    currentOrder.splice(insertAt, 0, movedId);

    setTodoOrder(currentOrder);
    addToast("Todo reordered", "info");

    // Maintain focus on the moved item
    setTimeout(() => {
      const dragHandle = document.querySelector(`[data-todo-id="${todoId}"] [data-testid="drag-handle"]`) as HTMLElement;
      dragHandle?.focus();
    }, 0);
  };

  return (
    <div className="todo-list" data-testid="todo-list">
      <div className="todo-list-header">
        <h3>Todo List</h3>
        {priorityCounts.high > 0 && (
          <span
            className="high-priority-badge"
            data-testid="high-priority-badge"
            title={`${priorityCounts.high} high priority item${priorityCounts.high > 1 ? 's' : ''}`}
          >
            🔴 {priorityCounts.high}
          </span>
        )}
      </div>
      <TodoStats todos={todos} />
      <div className="todo-search-filter-row" data-testid="todo-search-filter-row">
        <div className="todo-search-input-wrapper">
          <span className="todo-search-icon">🔍</span>
          <input
            type="text"
            data-testid="todo-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search todos..."
            className="todo-search-input"
          />
          {searchQuery && (
            <button
              data-testid="todo-search-clear"
              className="todo-search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <select
          data-testid="category-filter"
          className="todo-category-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as CategoryType | "all")}
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>
      <div className="todo-filter-container" data-testid="todo-filter-container">
        <button
          data-testid="todo-filter-all"
          className={`todo-filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All ({counts.all})
        </button>
        <button
          data-testid="todo-filter-active"
          className={`todo-filter-btn ${filter === "active" ? "active" : ""}`}
          onClick={() => setFilter("active")}
        >
          Active ({counts.active})
        </button>
        <button
          data-testid="todo-filter-completed"
          className={`todo-filter-btn ${filter === "completed" ? "active" : ""}`}
          onClick={() => setFilter("completed")}
        >
          Completed ({counts.completed})
        </button>
      </div>
      <div className="todo-due-date-filter-container" data-testid="todo-due-date-filter-container">
        <span className="todo-due-date-filter-label">Due:</span>
        <button
          data-testid="todo-due-date-filter-all"
          className={`todo-filter-btn ${dueDateFilter === "all" ? "active" : ""}`}
          onClick={() => setDueDateFilter("all")}
        >
          All
        </button>
        <button
          data-testid="todo-due-date-filter-today"
          className={`todo-filter-btn ${dueDateFilter === "today" ? "active" : ""}`}
          onClick={() => setDueDateFilter("today")}
        >
          Today ({dueDateCounts.today})
        </button>
        <button
          data-testid="todo-due-date-filter-overdue"
          className={`todo-filter-btn todo-filter-btn-overdue ${dueDateFilter === "overdue" ? "active" : ""}`}
          onClick={() => setDueDateFilter("overdue")}
        >
          Overdue ({dueDateCounts.overdue})
        </button>
        <button
          data-testid="todo-due-date-filter-upcoming"
          className={`todo-filter-btn ${dueDateFilter === "upcoming" ? "active" : ""}`}
          onClick={() => setDueDateFilter("upcoming")}
        >
          Upcoming ({dueDateCounts.upcoming})
        </button>
      </div>
      <div className="todo-sort-priority-container" data-testid="todo-sort-priority-container">
        <div className="todo-sort-container">
          <label htmlFor="sort-select" className="todo-sort-label">Sort by:</label>
          <select
            id="sort-select"
            data-testid="sort-select"
            className="todo-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
          >
            <option value="manual">Manual</option>
            <option value="priority">Priority</option>
            <option value="dueDate">Due Date</option>
            <option value="created">Created</option>
          </select>
        </div>
        <div className="todo-priority-filter-container">
          <span className="todo-priority-filter-label">Priority:</span>
          <button
            data-testid="priority-filter-all"
            className={`todo-filter-btn ${priorityFilter === "all" ? "active" : ""}`}
            onClick={() => setPriorityFilter("all")}
          >
            All Priorities
          </button>
          <button
            data-testid="priority-filter-high-only"
            className={`todo-filter-btn todo-filter-btn-high ${priorityFilter === "high-only" ? "active" : ""}`}
            onClick={() => setPriorityFilter("high-only")}
          >
            🔴 High Only ({priorityCounts.high})
          </button>
          <button
            data-testid="priority-filter-medium-plus"
            className={`todo-filter-btn ${priorityFilter === "medium-plus" ? "active" : ""}`}
            onClick={() => setPriorityFilter("medium-plus")}
          >
            Medium+ ({priorityCounts.high + priorityCounts.medium})
          </button>
        </div>
      </div>
      <div className="todo-input-container">
        <input
          type="text"
          data-testid="todo-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a new todo..."
        />
        <select
          data-testid="category-select"
          className="todo-category-select"
          value={categoryValue}
          onChange={(e) => setCategoryValue(e.target.value as CategoryType | "")}
        >
          <option value="">No Category</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        <select
          data-testid="priority-select"
          className="todo-priority-select"
          value={priorityValue}
          onChange={(e) => setPriorityValue(e.target.value as PriorityType)}
        >
          {PRIORITIES.map((priority) => (
            <option key={priority.value} value={priority.value}>
              {priority.emoji} {priority.label}
            </option>
          ))}
        </select>
        <div className="todo-due-date-input-wrapper" data-testid="todo-due-date-input-wrapper">
          <input
            type="date"
            data-testid="todo-due-date-input"
            value={dueDateValue}
            onChange={(e) => setDueDateValue(e.target.value)}
            className="todo-due-date-input"
          />
          {dueDateValue && (
            <button
              data-testid="todo-due-date-clear"
              className="todo-due-date-clear"
              onClick={() => setDueDateValue("")}
              aria-label="Clear due date"
            >
              ✕
            </button>
          )}
        </div>
        <button data-testid="todo-add-btn" onClick={addTodo}>
          Add
        </button>
      </div>
      {filteredTodos.length === 0 && (searchQuery || filter !== "all" || dueDateFilter !== "all" || categoryFilter !== "all" || priorityFilter !== "all") ? (
        <p className="todo-no-results" data-testid="todo-no-results">
          No matching todos found
        </p>
      ) : (
        <ul className="todo-items" data-testid="todo-items">
          {filteredTodos.map((todo, index) => {
            const todoIsOverdue = todo.dueDate && !todo.completed && isOverdue(todo.dueDate);
            const isDragging = draggedId === todo.id;
            const isDropTarget = dropTargetId === todo.id;
            return (
              <li
                key={todo.id}
                data-todo-id={todo.id}
                className={`todo-item ${todo.completed ? "completed" : ""} ${todoIsOverdue ? "todo-item-overdue" : ""} ${isDragging ? "todo-item-dragging" : ""} ${isDropTarget && dropPosition === "before" ? "todo-item-drop-before" : ""} ${isDropTarget && dropPosition === "after" ? "todo-item-drop-after" : ""}`}
                data-testid="todo-item"
                draggable
                onDragStart={(e) => handleDragStart(e, todo.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, todo.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, todo.id)}
              >
                <span
                  className="drag-handle"
                  data-testid="drag-handle"
                  tabIndex={0}
                  role="button"
                  aria-label={`Reorder ${todo.text}. Use Alt+Arrow keys to move.`}
                  onKeyDown={(e) => handleTodoKeyDown(e, todo.id, index)}
                >
                  ⋮⋮
                </span>
                <input
                  type="checkbox"
                  data-testid="todo-checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                />
                <div className="todo-item-content">
                  <div className="todo-text-container">
                    <span
                      data-testid={`priority-indicator-${todo.priority}`}
                      className={`priority-indicator priority-indicator-${todo.priority}`}
                      title={`Priority: ${PRIORITIES.find(p => p.value === todo.priority)?.label}`}
                    >
                      {PRIORITIES.find(p => p.value === todo.priority)?.emoji}
                    </span>
                    {todo.category && (
                      <span
                        data-testid={`category-tag-${todo.category}`}
                        className={`category-tag category-tag-${todo.category}`}
                      >
                        {CATEGORIES.find((c) => c.value === todo.category)?.label}
                      </span>
                    )}
                    {editingId === todo.id ? (
                      <input
                        type="text"
                        data-testid="todo-edit-input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, todo.id)}
                        onBlur={() => handleEditBlur(todo.id)}
                        className="todo-edit-input"
                        autoFocus
                      />
                    ) : (
                      <span
                        data-testid="todo-text"
                        className={todo.completed ? "todo-completed" : ""}
                        onDoubleClick={() => handleDoubleClick(todo.id, todo.text)}
                      >
                        {highlightMatch(todo.text)}
                      </span>
                    )}
                  </div>
                  {todo.dueDate && (
                    <span
                      className={`todo-due-date ${todoIsOverdue ? "todo-due-date-overdue" : ""}`}
                      data-testid="todo-due-date"
                    >
                      {todoIsOverdue && (
                        <span className="todo-overdue-badge" data-testid="todo-overdue-badge">
                          Overdue
                        </span>
                      )}
                      <span data-testid="todo-due-date-text">{formatRelativeDate(todo.dueDate)}</span>
                    </span>
                  )}
                </div>
                <button
                  data-testid="todo-delete-btn"
                  onClick={() => deleteTodo(todo.id)}
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default TodoList;
