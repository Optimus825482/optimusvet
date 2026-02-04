# 🚨 CRITICAL: Server Memory at 90%

## Current Status

**Health Check Result:**

```json
{
  "status": "unhealthy",
  "memory": {
    "status": "critical",
    "used": 58 GB,
    "total": 64 GB,
    "percentage": 90%  // ⚠️ DANGER ZONE
  }
}
```

## Immediate Risks

1. **Application Crashes** - Node.js may run out of memory and crash
2. **Slow Performance** - High memory usage causes swapping and slowdowns
3. **Failed Deployments** - Not enough memory to build/restart
4. **Database Issues** - PostgreSQL may be affected
5. **OOM Killer** - Linux may kill processes to free memory

## URGENT: Do NOT Deploy Yet!

**⚠️ STOP!** Do not deploy the audit fix until memory is under control.

Deploying now could:

- Cause the build to fail (out of memory)
- Crash the running application
- Trigger the OOM killer
- Lose data or corrupt state

## Immediate Actions Required

### 1. Check What's Using Memory

SSH to server and run:

```bash
# Check overall memory
free -h

# Check top memory consumers
ps aux --sort=-%mem | head -20

# Check Node.js processes
ps aux | grep node

# Check Docker containers (if using Docker)
docker stats --no-stream

# Check PM2 processes (if using PM2)
pm2 list
pm2 monit
```

### 2. Identify Memory Hogs

Common culprits:

- **Node.js memory leaks** - Check if Node processes are growing
- **Too many PM2 instances** - Check cluster mode settings
- **Database connections** - Check for connection pool leaks
- **File uploads** - Check /tmp and upload directories
- **Logs** - Check if log files are huge
- **Build artifacts** - Check .next folder size
- **node_modules** - Multiple copies taking space

### 3. Quick Fixes

#### Option A: Restart Application (Quick Relief)

```bash
# If using PM2
pm2 restart optimus-vet

# If using Docker
docker-compose restart

# If using systemd
sudo systemctl restart optimus-vet
```

**Note:** This is temporary - memory will grow again if there's a leak.

#### Option B: Clear Caches

```bash
# Clear PM2 logs
pm2 flush

# Clear system cache (safe)
sync; echo 3 | sudo tee /proc/sys/vm/drop_caches

# Clear old Docker images
docker system prune -a

# Clear npm cache
npm cache clean --force
```

#### Option C: Reduce PM2 Instances

```bash
# Check current instances
pm2 list

# Scale down if running in cluster mode
pm2 scale optimus-vet 2  # Reduce to 2 instances

# Or restart with fewer instances
pm2 delete optimus-vet
pm2 start npm --name "optimus-vet" -i 2 -- start
```

### 4. Long-term Solutions

#### A. Increase Server Memory

- Upgrade server to 128GB RAM
- Or add swap space (temporary solution)

```bash
# Add 8GB swap (temporary)
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### B. Fix Memory Leaks in Application

Check for common Node.js memory leaks:

1. **Unclosed database connections**
2. **Event listener leaks**
3. **Large objects in memory**
4. **Circular references**
5. **Global variables accumulating data**

#### C. Optimize Node.js Memory

Add to your start script:

```json
{
  "scripts": {
    "start": "NODE_OPTIONS='--max-old-space-size=4096' next start -p 3002"
  }
}
```

This limits Node.js to 4GB instead of trying to use all available memory.

#### D. Enable Memory Monitoring

Add to your application:

```typescript
// Monitor memory usage
setInterval(() => {
  const used = process.memoryUsage();
  console.log("[MEMORY]", {
    rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(used.external / 1024 / 1024)}MB`,
  });
}, 60000); // Every minute
```

## Investigation Checklist

Run these commands to diagnose:

```bash
# 1. Overall system memory
free -h
cat /proc/meminfo

# 2. Top memory processes
ps aux --sort=-%mem | head -20

# 3. Node.js processes specifically
ps aux | grep node
pgrep -a node

# 4. PM2 status
pm2 list
pm2 info optimus-vet

# 5. Docker stats (if applicable)
docker stats --no-stream

# 6. Disk usage (might be related)
df -h
du -sh /path/to/optimus-vet/*

# 7. Check for memory leaks
pm2 monit  # Watch memory in real-time

# 8. System logs
journalctl -xe | grep -i "out of memory"
dmesg | grep -i "killed process"
```

## Safe Deployment Plan

### Phase 1: Stabilize Memory (DO THIS FIRST)

1. ✅ Identify memory hog
2. ✅ Restart application or reduce instances
3. ✅ Verify memory drops below 70%
4. ✅ Monitor for 10 minutes to ensure stability

### Phase 2: Deploy Audit Fix (ONLY AFTER PHASE 1)

1. ✅ Memory is stable at <70%
2. ✅ Pull changes
3. ✅ Build application
4. ✅ Restart with monitoring
5. ✅ Watch memory during restart

### Phase 3: Monitor Post-Deployment

1. ✅ Check memory every 5 minutes for 1 hour
2. ✅ Verify audit logs are working
3. ✅ Check for memory growth
4. ✅ Set up alerts for memory >80%

## Memory Thresholds

- **0-70%** ✅ Healthy - Safe to deploy
- **70-80%** ⚠️ Warning - Monitor closely
- **80-90%** 🔴 Critical - Take action now
- **90-100%** 🚨 Emergency - Application may crash

**Current: 90%** 🚨 **EMERGENCY STATE**

## Recommended Actions (In Order)

1. **IMMEDIATE:** Restart application to free memory
2. **SHORT-TERM:** Reduce PM2 instances or add swap
3. **MEDIUM-TERM:** Investigate and fix memory leaks
4. **LONG-TERM:** Upgrade server RAM or optimize application

## When It's Safe to Deploy

✅ Deploy ONLY when:

- Memory usage is below 70%
- Memory is stable (not growing)
- You have monitoring in place
- You have a rollback plan
- You're available to monitor the deployment

## Emergency Contacts

If server becomes unresponsive:

1. Try SSH connection
2. If SSH fails, use server console (VPS provider dashboard)
3. Force restart server (last resort)
4. Check logs after restart

## Summary

**DO NOT DEPLOY YET!**

1. Fix memory issue first
2. Get memory below 70%
3. Monitor stability
4. Then deploy audit fix

The audit fix is ready and tested, but deploying to an unhealthy server is risky.

---

**Priority:** Fix memory issue FIRST, then deploy audit fix.
