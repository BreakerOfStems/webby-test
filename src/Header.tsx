function Header() {
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
    </nav>
  );
}

export default Header;
