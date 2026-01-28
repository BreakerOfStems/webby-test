# Webby Test

A simple React + Vite application for testing the Claude GitHub Runner.

## Development

```bash
npm install
npm run dev
```

## Docker

```bash
docker-compose up
```

The app runs on http://localhost:3000

## Testing

Test plans are in `qa/tests/`. The runner executes these automatically.

## Guidelines

- Use data-testid attributes for testable elements
- Keep components simple and focused
- Update or create test plans for new features
