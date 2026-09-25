# DTFC Backend - Golang

## Setup

```bash
# Install dependencies
go mod download

# Copy environment file
cp .env.example .env

# Run server
go run cmd/api/main.go
```

## Project Structure

```
server-go/
├── cmd/api/              # Application entry point
├── internal/             # Private application code
│   ├── config/          # Configuration
│   ├── models/          # Data models
│   ├── repositories/    # Database layer
│   ├── services/        # Business logic
│   ├── controllers/     # HTTP handlers
│   ├── middleware/      # HTTP middleware
│   ├── routes/          # Route definitions
│   └── utils/           # Helper functions
└── pkg/                 # Public packages
    ├── errors/          # Error types
    ├── logger/          # Logging
    └── security/        # Security utilities
```

## Technology Stack

- **Framework**: Gin
- **Database**: MongoDB
- **Cache**: Redis
- **Auth**: JWT
- **Logging**: Zap

## API Endpoints

### Health Check

- `GET /api/health` - Server health status

### Summary (planned)

- `GET /api/summary/sales` - Sales summary
- `GET /api/summary/purchase` - Purchase summary
- `GET /api/summary/opname` - Opname summary
- `GET /api/summary/waste` - Waste summary
