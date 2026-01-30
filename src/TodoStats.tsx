import { useState, useEffect, useMemo } from "react";

interface TodoStatsProps {
  todos: { id: number; text: string; completed: boolean }[];
}

const STREAK_STORAGE_KEY = "todo-streak-data";

interface StreakData {
  currentStreak: number;
  lastCompletedDate: string | null;
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function loadStreakData(): StreakData {
  const saved = localStorage.getItem(STREAK_STORAGE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  return { currentStreak: 0, lastCompletedDate: null };
}

function saveStreakData(data: StreakData): void {
  localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(data));
}

function TodoStats({ todos }: TodoStatsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [streakData, setStreakData] = useState<StreakData>(loadStreakData);
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, percentage };
  }, [todos]);

  // Animate progress bar when percentage changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(stats.percentage);
    }, 50);
    return () => clearTimeout(timer);
  }, [stats.percentage]);

  // Update streak when todos are completed
  useEffect(() => {
    const hasCompletedToday = todos.some((t) => t.completed);
    const today = getToday();

    if (hasCompletedToday) {
      const { lastCompletedDate, currentStreak } = streakData;

      if (lastCompletedDate === today) {
        // Already recorded for today
        return;
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      let newStreak: number;
      if (lastCompletedDate === yesterdayStr) {
        // Continue streak
        newStreak = currentStreak + 1;
      } else if (lastCompletedDate === null) {
        // First time
        newStreak = 1;
      } else {
        // Streak broken, start new
        newStreak = 1;
      }

      const newData: StreakData = {
        currentStreak: newStreak,
        lastCompletedDate: today,
      };
      setStreakData(newData);
      saveStreakData(newData);
    }
  }, [todos, streakData]);

  // Check if streak is still valid on load
  useEffect(() => {
    const { lastCompletedDate, currentStreak } = streakData;
    if (!lastCompletedDate || currentStreak === 0) return;

    const today = getToday();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // If last completed date is not today or yesterday, reset streak
    if (lastCompletedDate !== today && lastCompletedDate !== yesterdayStr) {
      const newData: StreakData = { currentStreak: 0, lastCompletedDate: null };
      setStreakData(newData);
      saveStreakData(newData);
    }
  }, []);

  return (
    <div className="todo-stats" data-testid="todo-stats">
      <button
        className="todo-stats-toggle"
        data-testid="todo-stats-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="todo-stats-toggle-icon">{isExpanded ? "▼" : "▶"}</span>
        <span>Statistics</span>
      </button>

      {isExpanded && (
        <div className="todo-stats-panel" data-testid="todo-stats-panel">
          <div className="todo-stats-grid">
            <div className="todo-stat-item" data-testid="todo-stat-total">
              <span className="todo-stat-icon">📋</span>
              <div className="todo-stat-content">
                <span className="todo-stat-value" data-testid="todo-stat-total-value">
                  {stats.total}
                </span>
                <span className="todo-stat-label">Total</span>
              </div>
            </div>

            <div className="todo-stat-item" data-testid="todo-stat-completed">
              <span className="todo-stat-icon">✅</span>
              <div className="todo-stat-content">
                <span className="todo-stat-value" data-testid="todo-stat-completed-value">
                  {stats.completed}
                </span>
                <span className="todo-stat-label">Completed</span>
              </div>
            </div>

            <div className="todo-stat-item" data-testid="todo-stat-pending">
              <span className="todo-stat-icon">⏳</span>
              <div className="todo-stat-content">
                <span className="todo-stat-value" data-testid="todo-stat-pending-value">
                  {stats.pending}
                </span>
                <span className="todo-stat-label">Pending</span>
              </div>
            </div>

            <div className="todo-stat-item" data-testid="todo-stat-streak">
              <span className="todo-stat-icon">🔥</span>
              <div className="todo-stat-content">
                <span className="todo-stat-value" data-testid="todo-stat-streak-value">
                  {streakData.currentStreak}
                </span>
                <span className="todo-stat-label">Day Streak</span>
              </div>
            </div>
          </div>

          <div className="todo-stats-progress" data-testid="todo-stats-progress">
            <div className="todo-stats-progress-header">
              <span>Completion</span>
              <span data-testid="todo-stats-percentage">{stats.percentage}%</span>
            </div>
            <div className="todo-stats-progress-bar" data-testid="todo-stats-progress-bar">
              <div
                className="todo-stats-progress-fill"
                data-testid="todo-stats-progress-fill"
                style={{ width: `${animatedPercentage}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TodoStats;
