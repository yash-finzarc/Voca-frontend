# Linode Backend Configuration Guide

This project has been migrated from ngrok to Linode server hosting.

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Backend API Configuration
# Replace with your Linode server URL
NEXT_PUBLIC_API_BASE_URL=http://172.105.50.83:8000

# WebSocket URL (optional - auto-generated from API_BASE_URL if not set)
# NEXT_PUBLIC_WS_URL=ws://172.105.50.83:8000

# Default Organization ID (optional - for multi-tenant features)
# NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID=your-org-id
```

## Configuration Options

### Using IP Address (Direct)
```bash
NEXT_PUBLIC_API_BASE_URL=http://172.105.50.83:8000
```

### Using Domain with HTTP
```bash
NEXT_PUBLIC_API_BASE_URL=http://your-domain.com:8000
```

### Using Domain with HTTPS
```bash
NEXT_PUBLIC_API_BASE_URL=https://your-domain.com
# WebSocket will automatically use wss://
```

## Backend Setup Requirements

1. **FastAPI Backend**: Ensure your FastAPI backend is running on your Linode server
2. **Firewall**: Open port 8000 (or your backend port) in Linode firewall settings
3. **CORS**: Update your FastAPI backend CORS settings to allow requests from your frontend domain
4. **SSL/TLS**: If using HTTPS, set up SSL/TLS certificate on your Linode server (Let's Encrypt recommended)

## Example CORS Configuration (FastAPI)

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://your-frontend-domain.com",  # Production frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Changes Made

- ✅ Removed ngrok-specific mode checking
- ✅ Simplified API client to use single `NEXT_PUBLIC_API_BASE_URL` variable
- ✅ Removed ngrok browser warning header
- ✅ Updated error messages to reference Linode/backend instead of ngrok
- ✅ Removed ngrok API service functions
- ✅ Updated API test component to show backend URL instead of ngrok URL

## Testing Connection

1. Start your Next.js frontend: `npm run dev`
2. The API Connection Test component will show if the backend is reachable
3. Check browser console for API connection logs

## Troubleshooting

- **Connection Failed**: Verify backend is running on Linode and port is open
- **CORS Errors**: Update backend CORS settings to include your frontend URL
- **WebSocket Errors**: Ensure WebSocket endpoint is available and firewall allows connections

