# Troubleshooting "Failed to fetch" Error

If you're getting `TypeError: Failed to fetch` errors, this means your frontend cannot connect to your backend server. Here's how to fix it:

## Quick Checks

### 1. Verify Environment Variable is Set

Check your `.env.local` file (or `.env` file) and ensure you have:

```bash
NEXT_PUBLIC_API_BASE_URL=http://172.105.50.83:8000
```

**Important:** 
- Next.js only reads `.env.local` files at **build time** for `NEXT_PUBLIC_*` variables
- You **must restart your dev server** after changing environment variables
- Run `npm run dev` again after updating `.env.local`

### 2. Check Browser Console

Look for these log messages when the page loads:
```
[API Client] Initialized with base URL: http://...
[API Client] Environment variable: http://...
```

If you see `http://localhost:8000` or `NOT SET`, your environment variable isn't configured correctly.

### 3. Test Backend Connectivity

Open your browser and try to access:
```
http://172.105.50.83:8000/health
```

**Expected:** You should see a JSON response or at least a response from the server.

**If this fails:**
- Backend is not running
- Firewall is blocking connections
- Wrong IP/port

### 4. CORS Configuration (Most Common Issue)

Your FastAPI backend **must** allow requests from `http://localhost:3000` (your frontend).

**Update your FastAPI backend CORS settings:**

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Your Next.js dev server
        "http://localhost:3001",  # If using different port
        # Add your production frontend URL when deployed
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Restart your FastAPI backend** after updating CORS settings.

### 5. Linode Firewall Configuration

Your Linode server must allow incoming connections on port 8000:

1. Go to Linode Dashboard → Firewalls
2. Edit your firewall rules
3. Add inbound rule:
   - Protocol: TCP
   - Port: 8000
   - Source: 0.0.0.0/0 (or specific IPs for security)
   - Action: Accept

4. Apply the firewall to your Linode instance

### 6. Backend Server Status

SSH into your Linode server and check:

```bash
# Check if backend is running
ps aux | grep python
# or
systemctl status your-backend-service

# Check if port 8000 is listening
netstat -tulpn | grep 8000
# or
ss -tulpn | grep 8000

# Test from server itself
curl http://localhost:8000/health
```

### 7. Network Connectivity

Test from your local machine:

```powershell
# PowerShell (Windows)
Test-NetConnection -ComputerName 172.105.50.83 -Port 8000

# Or using curl
curl http://172.105.50.83:8000/health
```

**If this fails:** The server is not reachable from your network. Check:
- Firewall rules
- Network ACLs
- Backend is binding to `0.0.0.0` not `127.0.0.1`

## Common Issues

### Issue: Environment variable not updating

**Solution:**
1. Stop your Next.js dev server (Ctrl+C)
2. Delete `.next` folder: `rm -rf .next` (Linux/Mac) or delete it manually (Windows)
3. Update `.env.local` with correct URL
4. Restart: `npm run dev`

### Issue: CORS errors in browser console

**Symptoms:** Network request fails with CORS error

**Solution:** Update FastAPI CORS middleware (see step 4 above)

### Issue: Connection timeout

**Symptoms:** Request hangs, then times out

**Solution:** 
- Check firewall allows port 8000
- Verify backend is running: `curl http://172.105.50.83:8000/health`
- Check backend logs for errors

### Issue: Wrong URL being used

**Symptoms:** Console shows `http://localhost:8000` instead of Linode IP

**Solution:**
1. Check `.env.local` file exists in project root
2. Verify variable name: `NEXT_PUBLIC_API_BASE_URL` (must start with `NEXT_PUBLIC_`)
3. No spaces around `=` sign
4. Restart dev server after changes

## Step-by-Step Debugging

1. **Check environment variable:**
   ```bash
   # In your browser console, check:
   console.log(process.env.NEXT_PUBLIC_API_BASE_URL)
   ```

2. **Check API client logs:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for `[API Client]` log messages
   - Note what URL it's trying to connect to

3. **Test backend directly:**
   - Open `http://172.105.50.83:8000/health` in browser
   - If this works → CORS issue
   - If this fails → Backend/firewall issue

4. **Check backend logs:**
   - SSH into Linode
   - Check backend logs for incoming requests
   - If no requests appear → Network/firewall issue
   - If requests appear but fail → Backend error

## Still Not Working?

1. Share the exact error message from browser console
2. Share the URL shown in `[API Client]` logs
3. Confirm backend is accessible: `curl http://172.105.50.83:8000/health`
4. Check if CORS is configured on backend

