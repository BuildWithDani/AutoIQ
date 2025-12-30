# Security Setup Guide for AutoIQ Backend

## 🔒 Critical Security Requirements

This guide covers the **REQUIRED** security configurations that were implemented to fix critical vulnerabilities.

---

## 1. JWT Secret Configuration (CRITICAL)

### Why This Matters
The JWT secret is used to sign authentication tokens. If compromised or using the default value, attackers can forge tokens and impersonate any user.

### Setup Steps

1. **Generate a secure secret:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

2. **Add to your `.env` file:**
```env
JWT_SECRET=your_generated_secret_here
```

3. **NEVER:**
   - Use the default value
   - Commit the secret to git
   - Share the secret publicly
   - Use a weak or short secret (minimum 32 characters)

### What Happens If Not Set
The backend will **refuse to start** and show this error:
```
CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not set!
```

---

## 2. CORS Configuration (CRITICAL)

### Why This Matters
The previous configuration (`allow_origins=["*"]` with `allow_credentials=True`) was a **critical security vulnerability** that allowed any website to make authenticated requests to your API, enabling:
- Cross-Site Request Forgery (CSRF) attacks
- Credential theft
- Session hijacking

### Setup Steps

1. **Set allowed origins in `.env`:**
```env
# Development
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:8001

# Production - add your actual domain
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com,http://localhost:5173
```

2. **Format:**
   - Comma-separated list (no spaces around commas recommended)
   - Include protocol (http:// or https://)
   - Include port if non-standard
   - NO wildcards (*)

### What Happens If Misconfigured
The backend will **refuse to start** if you try to use "*" as an origin:
```
CRITICAL SECURITY ERROR: Cannot use '*' as allowed origin with credentials enabled!
```

---

## 3. Rate Limiting (Protection Against Brute Force)

### What Was Added
Rate limiting on authentication endpoints to prevent:
- Brute force password attacks
- Account enumeration
- Credential stuffing
- Denial of Service (DOS)

### Current Limits
- **Registration:** 3 attempts per minute per IP
- **Login:** 5 attempts per minute per IP  
- **Password Change:** 3 attempts per minute per IP

### No Configuration Required
Rate limiting is automatically enabled. Users who exceed limits will receive:
```json
{
  "error": "Rate limit exceeded",
  "detail": "5 per 1 minute"
}
```

---

## 4. Installation Steps

### Install New Dependencies
```bash
cd backend
pip install -r requirements.txt
```

This installs `slowapi` for rate limiting.

---

## 5. Environment File Setup

### Copy the example file:
```bash
cp .env.example .env
```

### Edit `.env` and set REQUIRED values:

1. **Generate JWT Secret:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

2. **Update `.env`:**
```env
# REQUIRED: Use your generated secret
JWT_SECRET=<paste_generated_secret_here>

# REQUIRED: Set your allowed origins
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# REQUIRED: Your Appwrite credentials
APPWRITE_ENDPOINT=https://your-appwrite-instance.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_api_key
```

---

## 6. Verification

### Test the backend starts correctly:
```bash
cd backend
python main.py
```

### You should see:
```
INFO:     CORS allowed origins: ['http://localhost:5173', 'http://127.0.0.1:5173', ...]
INFO:     JWT configuration loaded: algorithm=HS256, expires_minutes=60
INFO:     Starting AutoIQ backend...
INFO:     Application startup complete.
```

### If you see errors:
- **JWT_SECRET error:** Generate and set a secure secret
- **CORS error:** Set ALLOWED_ORIGINS in .env (no wildcards)
- **Appwrite error:** Check your Appwrite credentials

---

## 7. Production Deployment Checklist

- [ ] Generate a NEW JWT_SECRET for production (different from development)
- [ ] Set ALLOWED_ORIGINS to your production domain(s) only
- [ ] Remove localhost/127.0.0.1 from ALLOWED_ORIGINS in production
- [ ] Use HTTPS for all production origins
- [ ] Store secrets in a secure secret manager (AWS Secrets Manager, etc.)
- [ ] Never commit `.env` file to git (already in .gitignore)
- [ ] Rotate JWT_SECRET periodically (every 90 days recommended)
- [ ] Monitor rate limit violations in logs
- [ ] Set up alerts for security events

---

## 8. Additional Security Recommendations

### Implemented ✅
- JWT secret validation
- CORS security
- Rate limiting on auth endpoints
- Explicit CORS methods and headers
- Security logging

### Recommended Next Steps
- [ ] Implement password complexity requirements
- [ ] Add refresh token mechanism
- [ ] Move tokens from localStorage to httpOnly cookies
- [ ] Add comprehensive audit logging
- [ ] Implement Web Application Firewall (WAF)
- [ ] Regular security audits
- [ ] Penetration testing

---

## 9. Security Incident Response

If you suspect a security breach:

1. **Immediately rotate JWT_SECRET:**
   - Generate new secret
   - Update .env
   - Restart backend
   - All users will need to re-login

2. **Check logs for:**
   - Rate limit violations
   - Failed authentication attempts
   - Unusual access patterns

3. **Review CORS origins:**
   - Ensure only legitimate domains are allowed
   - Check for any unauthorized changes

---

## Support

For security concerns or questions:
- Review the main security audit report
- Check application logs
- Contact the development team

**Remember:** Security is an ongoing process, not a one-time setup!

