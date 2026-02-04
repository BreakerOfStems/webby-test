import { useState, useEffect, useMemo, useRef } from "react";
import { useToast } from "./ToastContext";
import TodoStats from "./TodoStats";

type CategoryType = "work" | "personal" | "shopping" | "health" | "other";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  dueDate?: string; // ISO date string
  category?: CategoryType;
}

const CATEGORIES: { value: CategoryType; label: string }[] = [
  { value: "work", label: "Work" },
  { value: "personal", label: "Personal" },
  { value: "shopping", label: "Shopping" },
  { value: "health", label: "Health" },
  { value: "other", label: "Other" },
];

type FilterType = "all" | "active" | "completed";
type DueDateFilterType = "all" | "today" | "overdue" | "upcoming";

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

function TodoList() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
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
  const [todoOrder, setTodoOrder] = useState<number[]>(() => {
    const saved = localStorage.getItem(ORDER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(null);
  const draggedRef = useRef<number | null>(null);
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
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(todoOrder));
  }, [todoOrder]);

  // Sort todos by the stored order
  const orderedTodos = useMemo(() => {
    // Create a map of id -> order index
    const orderMap = new Map<number, number>();
    todoOrder.forEach((id, index) => orderMap.set(id, index));

    // Sort todos: items in order first (by their position), then items not in order (newest first, at top)
    return [...todos].sort((a, b) => {
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
  }, [todos, todoOrder]);

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

      return matchesSearch && matchesFilter && matchesDueDateFilter && matchesCategoryFilter;
    });
  }, [orderedTodos, searchQuery, filter, dueDateFilter, categoryFilter]);

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
    };
    setTodos([...todos, newTodo]);
    setInputValue("");
    setDueDateValue("");
    setCategoryValue("");
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
      <h3>Todo List</h3>
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
      {filteredTodos.length === 0 && (searchQuery || filter !== "all" || dueDateFilter !== "all" || categoryFilter !== "all") ? (
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
                    {todo.category && (
                      <span
                        data-testid={`category-tag-${todo.category}`}
                        className={`category-tag category-tag-${todo.category}`}
                      >
                        {CATEGORIES.find((c) => c.value === todo.category)?.label}
                      </span>
                    )}
                    <span
                      data-testid="todo-text"
                      className={todo.completed ? "todo-completed" : ""}
                    >
                      {highlightMatch(todo.text)}
                    </span>
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
