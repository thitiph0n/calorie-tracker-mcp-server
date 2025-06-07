# GitHub Copilot Instructions

## Git Commit Convention

All commit messages should follow the pattern: `{type}: {short summary}`

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semi-colons, etc.)
- `refactor`: Code refactoring without feature changes
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates, build changes

**Examples:**

- `feat: add user registration endpoint`
- `fix: resolve database connection timeout`
- `docs: update API documentation`
- `refactor: simplify auth middleware logic`

## Code Convention

### Comments

- **Do not over-comment code** - only add comments for important parts
- Focus on explaining **why** something is done, not **what** is being done
- Comment complex business logic, edge cases, and non-obvious implementations
- Avoid redundant comments that simply restate the code

**Good examples:**

```typescript
// Validate API key before processing sensitive operations
const isValidKey = await validateApiKey(apiKey);

// Handle edge case where user has no entries yet
if (entries.length === 0) {
  return { total: 0, entries: [] };
}
```

**Avoid:**

```typescript
// Set variable to true
const isActive = true;

// Loop through array
for (const item of items) {
  // Process item
  processItem(item);
}
```
