import { useState, useEffect, useMemo } from "react";
import { useToast } from "./ToastContext";
import TodoStats from "./TodoStats";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

type FilterType = "all" | "active" | "completed";

const STORAGE_KEY = "todos";
const FILTER_STORAGE_KEY = "todo-filter";

function TodoList() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>(() => {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    return (saved as FilterType) || "all";
  });
  const { addToast } = useToast();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    localStorage.setItem(FILTER_STORAGE_KEY, filter);
  }, [filter]);

  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      const matchesSearch = todo.text.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && !todo.completed) ||
        (filter === "completed" && todo.completed);
      return matchesSearch && matchesFilter;
    });
  }, [todos, searchQuery, filter]);

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
    };
    setTodos([...todos, newTodo]);
    setInputValue("");
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
      <div className="todo-search-container" data-testid="todo-search-container">
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
      <div className="todo-input-container">
        <input
          type="text"
          data-testid="todo-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a new todo..."
        />
        <button data-testid="todo-add-btn" onClick={addTodo}>
          Add
        </button>
      </div>
      {filteredTodos.length === 0 && (searchQuery || filter !== "all") ? (
        <p className="todo-no-results" data-testid="todo-no-results">
          No matching todos found
        </p>
      ) : (
        <ul className="todo-items" data-testid="todo-items">
          {filteredTodos.map((todo) => (
            <li
              key={todo.id}
              className={`todo-item ${todo.completed ? "completed" : ""}`}
              data-testid="todo-item"
            >
              <input
                type="checkbox"
                data-testid="todo-checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
              />
              <span
                data-testid="todo-text"
                className={todo.completed ? "todo-completed" : ""}
              >
                {highlightMatch(todo.text)}
              </span>
              <button
                data-testid="todo-delete-btn"
                onClick={() => deleteTodo(todo.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TodoList;
