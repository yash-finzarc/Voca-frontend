# HTTPS Setup Guide for Linode Backend

## Problem

Your frontend is deployed on Vercel (HTTPS), but your backend on Linode is using HTTP (`http://172.105.50.83:8000`). Modern browsers **block mixed content** - they won't allow an HTTPS page to make requests to an HTTP endpoint.

## Solution: Set Up HTTPS on Your Backend

### Option 1: Using Nginx Reverse Proxy with Let's Encrypt (Recommended)

1. **Install Nginx on your Linode server:**
   ```bash
   sudo apt update
   sudo apt install nginx certbot python3-certbot-nginx
   ```

2. **Get a domain name** (optional but recommended):
   - Point your domain's A record to `172.105.50.83`
   - Or use a free subdomain service

3. **Configure Nginx as reverse proxy:**
   Create `/etc/nginx/sites-available/voca-backend`:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;  # Replace with your domain or IP

       location / {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           
           # CORS headers
           add_header 'Access-Control-Allow-Origin' '*' always;
           add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
           add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
           
           if ($request_method = 'OPTIONS') {
               return 204;
           }
       }
   }
   ```

4. **Enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/voca-backend /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. **Set up SSL with Let's Encrypt:**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

6. **Update Vercel environment variable:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Update `NEXT_PUBLIC_API_BASE_URL` to: `https://your-domain.com`
   - Redeploy your frontend

### Option 2: Use IP with Self-Signed Certificate (Not Recommended for Production)

If you don't have a domain, you can create a self-signed certificate, but browsers will show security warnings.

### Option 3: Development/Testing Workaround

For local development, you can still use `http://172.105.50.83:8000` in your `.env.local` file, and it will work when accessing `http://localhost:3000` locally.

## Testing

After setting up HTTPS:
1. Test backend directly: `https://your-domain.com/health`
2. Update Vercel environment variable
3. Redeploy frontend
4. Test from deployed site

## Important Notes

- **Local development**: Use `http://172.105.50.83:8000` in `.env.local` - this works fine
- **Production**: Must use HTTPS URL (`https://your-domain.com`)
- **CORS**: Make sure your FastAPI backend allows requests from `https://voca-frontend-self.vercel.app`
- **Firewall**: Ensure ports 80 and 443 are open on Linode

## FastAPI CORS Configuration

Make sure your FastAPI backend allows your Vercel domain:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://voca-frontend-self.vercel.app",
        "http://localhost:3000",  # For local dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```


