# Deployment Guide

## Prerequisites
- Node.js 18+
- Docker (for production)
- Clarinet (for contract deployment)

## Smart Contracts

### Testnet Deployment
```bash
cd clova-pay-contracts
clarinet run scripts/deploy-testnet.clar
```

### Mainnet Deployment
```bash
clarinet run scripts/deploy-mainnet.clar
```

## Backend

### Development
```bash
cd clova-pay-backend
npm run start:dev
```

### Production
```bash
docker-compose up -d
```

## Frontend

### Development
```bash
cd clova-pay-frontend
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

## Environment Configuration

Ensure all `.env` files are properly configured:
- See `.env.example` in each module

## Monitoring

Recommended monitoring tools:
- Prometheus + Grafana for metrics
- Sentry for error tracking
