import { useState, useEffect, useMemo } from "react";
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

  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
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
  }, [todos, searchQuery, filter, dueDateFilter, categoryFilter]);

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
          {filteredTodos.map((todo) => {
            const todoIsOverdue = todo.dueDate && !todo.completed && isOverdue(todo.dueDate);
            return (
              <li
                key={todo.id}
                className={`todo-item ${todo.completed ? "completed" : ""} ${todoIsOverdue ? "todo-item-overdue" : ""}`}
                data-testid="todo-item"
              >
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
