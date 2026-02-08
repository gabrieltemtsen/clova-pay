# Troubleshooting Guide

Common issues and solutions for ClovaPay development.

## Smart Contracts

### "use of potentially unchecked data" warning
**Issue**: Clarinet shows warnings for unchecked data on admin-configurable values.

**Solution**: These are expected for admin-only functions. The inputs are validated at the application layer and protected by admin guards.

### Tests failing with "ORDER_NOT_FOUND"
**Issue**: Test expects an order that doesn't exist yet.

**Solution**: Ensure you create the order in a `beforeEach` block before testing operations on it.

## Backend

### Prisma client not generated
**Issue**: `Error: @prisma/client did not initialize yet`

**Solution**: Run `npx prisma generate` after install.

### Database connection failed
**Issue**: Cannot connect to database.

**Solution**: Ensure `DATABASE_URL` is set correctly in `.env`.

## Frontend

### Wallet not connecting
**Issue**: Wallet extension not detected.

**Solution**: 
1. Install Hiro/Leather wallet extension
2. Ensure you're on testnet
3. Check browser permissions

### Contract call fails
**Issue**: Transaction rejected.

**Solution**: Check that contract address is correct in `.env.local`.
