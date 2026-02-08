# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please send an email to security@clovapay.com.

**Please do NOT create a public GitHub issue.**

### Response Process

1. Acknowledgment within 48 hours
2. Investigation and validation
3. Fix development and testing
4. Coordinated disclosure

## Security Features

### Smart Contract
- Multi-admin support with owner controls
- Time-locked admin transfers (144 block delay)
- Rate limiting per user
- Order amount limits (min/max)
- Daily volume caps
- Emergency pause functionality
- Order expiry for stale funds

### Backend
- API key authentication for admin routes
- Rate limiting via throttler
- Webhook signature verification
- Input validation

### General
- No private keys stored in code
- Environment variable configuration
- Secure escrow model
