# Contributing to ClovaPay

Thank you for your interest in contributing to ClovaPay! We welcome contributions from developers worldwide.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/clova-pay.git
   cd clova-pay
   ```

## Development Setup

### Smart Contracts
```bash
cd clova-pay-contracts
npm install
clarinet check
npm test
```

### Backend
```bash
cd clova-pay-backend
npm install
npx prisma generate
npm run start:dev
```

### Frontend
```bash
cd clova-pay-frontend
npm install
npm run dev
```

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code restructure |
| `test` | Adding tests |
| `chore` | Maintenance tasks |

Examples:
```
feat(contract): add batch-mark-processing function
fix(backend): resolve order status sync issue
docs: update README with API endpoints
test(contract): add partial refund tests
```

## Code Style

- **Clarity**: Follow Clarity best practices
- **TypeScript**: Use strict mode, avoid `any`
- **Testing**: Write tests for all new features
- **Documentation**: Add JSDoc/NatSpec comments

## Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature
   ```

2. Make your changes and commit

3. Push and create PR:
   ```bash
   git push origin feature/your-feature
   ```

4. Ensure all checks pass

5. Request review from maintainers

## Code of Conduct

Be respectful and inclusive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/).

## Questions?

Open an issue or reach out to the maintainers.
