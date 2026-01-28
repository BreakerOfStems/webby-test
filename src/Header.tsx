import { useTheme } from "./ThemeContext";

function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="nav-header" data-testid="nav-header">
      <a href="/" className="nav-logo" data-testid="nav-logo">
        Webby Test
      </a>
      <ul className="nav-links">
        <li>
          <a href="/" data-testid="nav-link-home">
            Home
          </a>
        </li>
        <li>
          <a href="/about" data-testid="nav-link-about">
            About
          </a>
        </li>
        <li>
          <a href="/contact" data-testid="nav-link-contact">
            Contact
          </a>
        </li>
      </ul>
      <button
        className="theme-toggle"
        data-testid="theme-toggle"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      >
        {theme === "light" ? "Dark" : "Light"}
      </button>
    </nav>
  );
}

export default Header;
