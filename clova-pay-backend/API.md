# API Documentation

Base URL: `http://localhost:3001/api`

## Authentication

Admin endpoints require API key in header:
```
X-API-KEY: your-admin-api-key
```

## Endpoints

### Orders

#### GET /orders
List all orders with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

#### GET /orders/:id
Get order by ID.

**Response:**
```json
{
  "id": "uuid",
  "orderId": 1,
  "sender": "ST1...",
  "amount": "5000000",
  "status": "PENDING",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### GET /orders/user/:address
Get orders by user address.

#### POST /orders/process/:id
Mark order as processing (Admin only).

#### POST /orders/confirm/:id
Confirm order settlement (Admin only).

### Health

#### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
