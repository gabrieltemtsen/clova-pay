# Contributing to ClovaPay Backend

## Getting Started

1.  **Environment Setup**
    - Ensure Node.js v18+ is installed
    - Install dependencies: `npm install`
    - Copy `.env.example` to `.env` and fill in secrets

2.  **Database**
    - The project uses Prisma with SQLite for dev/test and Postgres for production.
    - Run migrations: `npx prisma migrate dev`
    - Generate client: `npx prisma generate`

3.  **Running the App**
    - Development: `npm run start:dev`
    - Production: `npm run start:prod`

## Coding Standards

- **Style**: We use Prettier and ESLint. Run `npm run lint` before committing.
- **Architecture**: Follow NestJS modular architecture.
- **DTOs**: Use class-validator for all input DTOs.
- **Tests**: Write unit tests for all services and controllers.

## Pull Request Process

1.  Create a feature branch: `feature/your-feature-name`
2.  Commit changes with conventional commits (e.g., `feat(orders): add create endpoint`)
3.  Ensure all tests pass: `npm run test`
4.  Open a PR against `main`
