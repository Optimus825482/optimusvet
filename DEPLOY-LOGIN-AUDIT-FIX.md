# 🚀 DEPLOY LOGIN AUDIT FIX - Quick Guide

## What Was Fixed?

Login audit logs were not being created because the `LOGIN` action was missing from the `AuditAction` enum.

## Changes Made

1. ✅ Added `LOGIN` to Prisma schema enum
2. ✅ Updated database enum (already applied to production)
3. ✅ Updated all UI components to support LOGIN action
4. ✅ Build successful - No errors

## Deployment Steps

### Option 1: Coolify Auto-Deploy (Recommended)

If you have Coolify set up with auto-deploy:

1. **Commit and push changes:**

```bash
cd optimus-vet
git add .
git commit -m "fix: Add LOGIN action to audit system"
git push
```

2. **Coolify will automatically:**
   - Pull the changes
   - Run `npm run build`
   - Restart the application

3. **Monitor deployment:**
   - Check Coolify dashboard for deployment status
   - Watch for any errors in logs

### Option 2: Manual Deploy on Server

If deploying manually:

1. **SSH to production server:**

```bash
ssh user@77.42.68.4
```

2. **Navigate to project:**

```bash
cd /path/to/optimus-vet
```

3. **Pull changes:**

```bash
git pull origin main
```

4. **Install dependencies (if needed):**

```bash
npm install
```

5. **Build application:**

```bash
npm run build
```

6. **Restart application:**

```bash
# If using PM2:
pm2 restart optimus-vet

# If using Docker:
docker-compose restart

# If using systemd:
sudo systemctl restart optimus-vet
```

### Option 3: Local Build + Upload

If you prefer to build locally:

1. **Build locally:**

```bash
cd optimus-vet
npm run build
```

2. **Upload .next folder to server:**

```bash
scp -r .next user@77.42.68.4:/path/to/optimus-vet/
```

3. **Restart on server:**

```bash
ssh user@77.42.68.4
pm2 restart optimus-vet
```

## Verification Steps

### 1. Check Application is Running

```bash
curl https://optimus.celilturan.com.tr/api/health
```

Expected: `{"status":"ok"}`

### 2. Test Login Audit

1. Open browser: https://optimus.celilturan.com.tr/auth/login
2. Login with valid credentials
3. Check server logs for: `[LOGIN AUDIT ERROR]` (should NOT appear)

### 3. Verify Database Record

Connect to PostgreSQL and run:

```sql
SELECT
  action,
  "tableName",
  "recordId",
  "userEmail",
  "userName",
  "createdAt"
FROM audit_logs
WHERE action = 'LOGIN'
ORDER BY "createdAt" DESC
LIMIT 1;
```

Expected result:

```
action | tableName | recordId | userEmail | userName | createdAt
-------|-----------|----------|-----------|----------|----------
LOGIN  | users     | xxx-xxx  | user@...  | Name     | 2026-02-04...
```

### 4. Check UI

1. Go to: https://optimus.celilturan.com.tr/dashboard/audit-logs
2. Filter by action: "Giriş"
3. You should see login events with:
   - Purple badge
   - LogIn icon
   - User details

## Troubleshooting

### Issue: Build fails with "Property 'LOGIN' is missing"

**Solution:** Make sure you pulled ALL changes, including UI component updates

```bash
git pull --force
npm run build
```

### Issue: Database error "invalid input value for enum AuditAction"

**Solution:** The database enum was already updated. If you see this, run:

```sql
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LOGIN';
```

### Issue: No audit logs created

**Check:**

1. Server logs for `[LOGIN AUDIT ERROR]`
2. Database connection is working
3. User has valid session

**Debug:**

```bash
# Check server logs
pm2 logs optimus-vet --lines 100

# Or Docker logs
docker-compose logs -f --tail=100
```

### Issue: UI shows error "Cannot read property 'LOGIN'"

**Solution:** Clear browser cache and hard refresh (Ctrl+Shift+R)

## Rollback Plan

If something goes wrong:

### Quick Rollback

```bash
cd optimus-vet
git revert HEAD
npm run build
pm2 restart optimus-vet
```

### Full Rollback

```bash
cd optimus-vet
git reset --hard HEAD~1
npm run build
pm2 restart optimus-vet
```

**Note:** The database enum change is safe and doesn't need rollback (it only adds a new value).

## Post-Deployment Checklist

- [ ] Application is running (health check passes)
- [ ] Login works normally
- [ ] Audit log is created on login
- [ ] Audit logs page shows LOGIN events
- [ ] No errors in server logs
- [ ] Email notifications still working (test with test-error-tracking endpoint)

## Success Criteria

✅ Users can login normally
✅ Login events appear in `audit_logs` table with action = 'LOGIN'
✅ Audit logs UI shows login events with purple badge
✅ No errors in production logs
✅ All existing functionality still works

## Next Steps After Deployment

Once login audit is confirmed working:

1. **Add audit logging to remaining APIs:**
   - Transactions API (POST, PUT, DELETE)
   - Reminders API (POST, PUT, PATCH, DELETE)
   - Protocols API (POST, PUT, DELETE)
   - Illnesses API (POST, PATCH, DELETE)
   - Treatments API (PATCH, DELETE)
   - Settings API (POST)

2. **Monitor audit log growth:**
   - Set up retention policy (cleanup old logs)
   - Monitor database size
   - Consider archiving old audit logs

3. **Add audit log reports:**
   - User activity reports
   - Security audit reports
   - Compliance reports

## Support

If you encounter any issues during deployment:

1. Check server logs: `pm2 logs optimus-vet`
2. Check database connectivity
3. Verify all files were updated (git status)
4. Review error messages in browser console

---

**Ready to deploy!** 🚀
