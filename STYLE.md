# Code Style Guide

This document outlines coding conventions for the ClovaPay project.

## Clarity Smart Contracts

### Naming
- Use `kebab-case` for function names: `create-order`
- Use `UPPER_SNAKE_CASE` for constants: `ERR_NOT_AUTHORIZED`
- Use `lower-case` for variables: `order-nonce`

### Documentation
- Document all public functions with `@notice`
- Include `@param` for parameters
- Include `@return` for return values

### Best Practices
- Keep functions focused and small
- Use helper functions to reduce duplication
- Emit events for all state changes
- Include block height in events for indexing

## TypeScript / JavaScript

### Naming
- Use `camelCase` for variables and functions
- Use `PascalCase` for classes and types
- Use `UPPER_SNAKE_CASE` for constants

### Formatting
- 2 space indentation
- Single quotes for strings
- Trailing commas in multi-line lists
- Prettier for auto-formatting

### Testing
- One assertion per test when possible
- Descriptive test names with "should"
- Arrange-Act-Assert pattern

## Git Commits

Follow [Conventional Commits](https://conventionalcommits.org):
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `test:` adding tests
- `refactor:` code restructure
- `chore:` maintenance
