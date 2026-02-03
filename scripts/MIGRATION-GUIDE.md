# Customer Contact Data Migration Guide

## 📋 Overview

This guide explains how to use the `migrate-customer-contacts.py` script to migrate customer phone and address data from the legacy MDB database to PostgreSQL.

## 🎯 What This Script Does

The migration script:

- ✅ Reads customer data from `D:\VTCLN\pm.mdb`
- ✅ Matches customers by name using fuzzy matching
- ✅ Updates PostgreSQL customers with phone and address data
- ✅ Handles conflicts intelligently (existing vs new data)
- ✅ Creates detailed migration logs
- ✅ Supports dry-run mode for safe testing
- ✅ Provides transaction safety with rollback on error

## 📦 Prerequisites

### 1. Install Required Python Packages

```bash
pip install pyodbc psycopg2-binary python-dotenv fuzzywuzzy python-Levenshtein
```

### 2. Install Microsoft Access Driver

**Windows:**

- Download and install [Microsoft Access Database Engine](https://www.microsoft.com/en-us/download/details.aspx?id=54920)
- Choose the version matching your Python (32-bit or 64-bit)

### 3. Verify Database Access

Ensure you have:

- ✅ Read access to `D:\VTCLN\pm.mdb`
- ✅ PostgreSQL connection configured in `.env`
- ✅ Write permissions on PostgreSQL database

## 🚀 Quick Start

### Step 1: Test Run (Dry-Run Mode)

**Always start with a dry-run to see what would happen:**

```bash
cd optimus-vet/scripts
python migrate-customer-contacts.py --dry-run
```

This will:

- Connect to both databases
- Match customers
- Show what would be updated
- **NOT make any changes**

### Step 2: Review the Results

Check the generated files:

- `migration_YYYYMMDD_HHMMSS.log` - Detailed log
- `unmatched_customers_YYYYMMDD_HHMMSS.txt` - Customers that couldn't be matched

### Step 3: Run Live Migration

If the dry-run looks good:

```bash
python migrate-customer-contacts.py
```

**Note:** Without `--dry-run`, it still uses MERGE strategy (safe mode)

## 🎛️ Command Line Options

### Basic Usage

```bash
python migrate-customer-contacts.py [OPTIONS]
```

### Available Options

| Option                | Description                   | Default         |
| --------------------- | ----------------------------- | --------------- |
| `--dry-run`           | Test mode - no changes made   | False           |
| `--force`             | Overwrite existing data       | False           |
| `--match-threshold N` | Fuzzy match threshold (0-100) | 85              |
| `--strategy STRATEGY` | Conflict resolution strategy  | merge           |
| `--mdb-path PATH`     | Path to MDB file              | D:\VTCLN\pm.mdb |
| `--verbose`           | Enable detailed logging       | False           |

### Conflict Resolution Strategies

#### 1. **MERGE** (Default - Recommended)

Updates only empty fields in PostgreSQL:

- If PostgreSQL has phone → Keep it
- If PostgreSQL phone is empty → Use MDB phone
- Same logic for address, city, district, tax info

```bash
python migrate-customer-contacts.py --strategy merge
```

#### 2. **SKIP**

Never overwrites existing data:

- Only updates completely empty records
- Most conservative approach

```bash
python migrate-customer-contacts.py --strategy skip
```

#### 3. **OVERWRITE** (Use with caution!)

Replaces all PostgreSQL data with MDB data:

- ⚠️ **WARNING:** Overwrites existing phone/address
- Use only if MDB data is more accurate

```bash
python migrate-customer-contacts.py --strategy overwrite
```

Or use the shorthand:

```bash
python migrate-customer-contacts.py --force
```

## 📊 Understanding the Output

### Console Output

```
🚀 Starting customer contact data migration...
Mode: DRY-RUN
✅ Connected to MDB: D:\VTCLN\pm.mdb
✅ Connected to PostgreSQL
📥 Extracting customers from MDB...
✅ Extracted 2315 customers from MDB
📥 Extracting customers from PostgreSQL...
✅ Extracted 2315 customers from PostgreSQL
🔄 Processing 2315 customers...
Progress: 100/2315 (4.3%)
Progress: 200/2315 (8.6%)
...
```

### Summary Report

```
======================================================================
📊 MIGRATION SUMMARY
======================================================================

🔧 Configuration:
  Mode: DRY-RUN (Test Mode)
  Match Threshold: 85%
  Conflict Strategy: merge
  MDB Path: D:\VTCLN\pm.mdb

📈 Statistics:
  MDB Customers: 2315
  PostgreSQL Customers: 2315
  Matched: 2280
  Unmatched: 35
  Updated: 1850
  Skipped: 430
  Failed: 0

📝 Field Updates:
  Phone: 1200
  Address: 1500
  City: 1400
  District: 1400
  Tax Info: 800

✅ Success Rate: 100.0%
======================================================================
```

## 🔍 Matching Algorithm

### How Customers Are Matched

1. **Exact musId Match** (Priority 1)
   - If PostgreSQL customer has `musId` field
   - Matches directly with MDB `musid`
   - 100% confidence

2. **Fuzzy Name Match** (Priority 2)
   - Normalizes names (uppercase, removes Turkish chars)
   - Uses multiple algorithms:
     - Ratio (40% weight)
     - Partial Ratio (30% weight)
     - Token Sort Ratio (30% weight)
   - Must exceed threshold (default 85%)

### Match Threshold Examples

| Threshold | Behavior                | Use Case                   |
| --------- | ----------------------- | -------------------------- |
| 100       | Only exact matches      | Very strict                |
| 90        | Very similar names      | Recommended for clean data |
| 85        | Similar names (default) | Balanced approach          |
| 80        | More lenient            | If names have variations   |
| 70        | Very lenient            | Use with caution           |

### Adjusting Match Threshold

```bash
# Stricter matching (fewer matches, higher confidence)
python migrate-customer-contacts.py --match-threshold 90

# More lenient (more matches, lower confidence)
python migrate-customer-contacts.py --match-threshold 80
```

## 📝 Log Files

### Migration Log

**File:** `migration_YYYYMMDD_HHMMSS.log`

Contains:

- Connection status
- Each customer match
- Update operations
- Errors and warnings
- Final statistics

**Example:**

```
2024-01-15 10:30:45 - INFO - ✅ Connected to MDB
2024-01-15 10:30:46 - INFO - ✅ Connected to PostgreSQL
2024-01-15 10:30:47 - DEBUG - ✅ Exact musId match: Ali AYDIN -> Ali AYDIN
2024-01-15 10:30:47 - DEBUG - ✅ Updated customer abc123
```

### Unmatched Customers Report

**File:** `unmatched_customers_YYYYMMDD_HHMMSS.txt`

Lists customers that couldn't be matched:

```
Unmatched Customers Report
======================================================================

Total unmatched: 35

MDB ID | Customer Name                  | Phone           | Address
----------------------------------------------------------------------
   145 | Mehmet YILMAZ                  | 05331234567     | Ankara
   289 | Ayşe KAYA                      | 05449876543     | İstanbul
```

**What to do with unmatched customers:**

1. Review the list
2. Manually verify if they exist in PostgreSQL
3. Consider lowering match threshold
4. Manually add if needed

## 🛡️ Safety Features

### 1. Transaction Safety

- All updates in a single transaction
- Automatic rollback on error
- Database remains consistent

### 2. Dry-Run Mode

- Test without making changes
- See exactly what would happen
- Review before committing

### 3. Conflict Resolution

- Never loses data accidentally
- Configurable strategies
- Logs all decisions

### 4. Error Handling

- Graceful error recovery
- Detailed error messages
- Rollback on failure

## 🔧 Troubleshooting

### Problem: "Missing required package"

**Solution:**

```bash
pip install pyodbc psycopg2-binary python-dotenv fuzzywuzzy python-Levenshtein
```

### Problem: "Failed to connect to MDB"

**Possible causes:**

1. Microsoft Access Driver not installed
2. Wrong MDB path
3. File permissions

**Solution:**

```bash
# Check if file exists
dir D:\VTCLN\pm.mdb

# Install Access Driver
# Download from Microsoft website

# Try custom path
python migrate-customer-contacts.py --mdb-path "C:\path\to\your\pm.mdb"
```

### Problem: "DATABASE_URL not found"

**Solution:**

```bash
# Check .env file exists
cd optimus-vet
cat .env

# Verify DATABASE_URL is set
# Should look like:
# DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
```

### Problem: "Too many unmatched customers"

**Possible causes:**

1. Match threshold too high
2. Name format differences
3. Data quality issues

**Solution:**

```bash
# Lower threshold
python migrate-customer-contacts.py --match-threshold 80 --dry-run

# Check unmatched report
cat unmatched_customers_*.txt

# Review name differences
```

### Problem: "Permission denied on PostgreSQL"

**Solution:**

```sql
-- Grant permissions
GRANT UPDATE ON customers TO your_user;
```

## 📋 Pre-Migration Checklist

Before running the migration:

- [ ] Backup PostgreSQL database
- [ ] Verify MDB file is accessible
- [ ] Install all required packages
- [ ] Test database connections
- [ ] Run dry-run mode first
- [ ] Review unmatched customers
- [ ] Check log files
- [ ] Verify match threshold is appropriate
- [ ] Choose correct conflict strategy
- [ ] Have rollback plan ready

## 🎯 Best Practices

### 1. Always Start with Dry-Run

```bash
# GOOD
python migrate-customer-contacts.py --dry-run
# Review results
python migrate-customer-contacts.py

# BAD
python migrate-customer-contacts.py --force  # Without testing first!
```

### 2. Use MERGE Strategy (Default)

- Safest option
- Preserves existing data
- Only fills empty fields

### 3. Review Unmatched Customers

- Check the unmatched report
- Investigate why they didn't match
- Consider manual updates

### 4. Keep Logs

- Save all log files
- Document any issues
- Track migration history

### 5. Backup First

```bash
# PostgreSQL backup
pg_dump -U postgres -d optimusvet > backup_before_migration.sql
```

## 📊 Example Scenarios

### Scenario 1: First-Time Migration

```bash
# Step 1: Dry-run with default settings
python migrate-customer-contacts.py --dry-run

# Step 2: Review results
cat migration_*.log
cat unmatched_customers_*.txt

# Step 3: Run migration
python migrate-customer-contacts.py

# Step 4: Verify
# Check PostgreSQL data
```

### Scenario 2: Re-Migration with New Data

```bash
# Use MERGE to only update empty fields
python migrate-customer-contacts.py --strategy merge
```

### Scenario 3: Complete Data Refresh

```bash
# WARNING: Overwrites existing data!
python migrate-customer-contacts.py --force

# Or explicitly:
python migrate-customer-contacts.py --strategy overwrite
```

### Scenario 4: Strict Matching

```bash
# Only match very similar names
python migrate-customer-contacts.py --match-threshold 95 --dry-run
```

## 🔄 Post-Migration Verification

### 1. Check Statistics

Review the summary report:

- Match rate should be > 95%
- Failed updates should be 0
- Success rate should be 100%

### 2. Verify Sample Records

```sql
-- Check updated records
SELECT id, name, phone, address, city, district, "updatedAt"
FROM customers
WHERE "updatedAt" > NOW() - INTERVAL '1 hour'
LIMIT 10;
```

### 3. Validate Data Quality

```sql
-- Check phone numbers
SELECT COUNT(*) FROM customers WHERE phone IS NOT NULL;

-- Check addresses
SELECT COUNT(*) FROM customers WHERE address IS NOT NULL;

-- Check for duplicates
SELECT phone, COUNT(*)
FROM customers
WHERE phone IS NOT NULL
GROUP BY phone
HAVING COUNT(*) > 1;
```

## 📞 Support

If you encounter issues:

1. Check the log file for detailed errors
2. Review this guide's troubleshooting section
3. Verify all prerequisites are met
4. Run with `--verbose` flag for more details

## 🎓 Advanced Usage

### Custom MDB Path

```bash
python migrate-customer-contacts.py --mdb-path "E:\backup\old_pm.mdb"
```

### Verbose Logging

```bash
python migrate-customer-contacts.py --verbose --dry-run
```

### Combination of Options

```bash
# Strict matching with overwrite
python migrate-customer-contacts.py \
  --match-threshold 95 \
  --strategy overwrite \
  --verbose \
  --dry-run
```

## 📈 Performance

- **Speed:** ~100-200 customers per second
- **Memory:** Low (processes in batches)
- **Network:** Minimal (efficient queries)

**Estimated time for 2,315 customers:** 10-20 seconds

## ✅ Success Criteria

Migration is successful when:

- ✅ Match rate > 95%
- ✅ No failed updates
- ✅ All logs clean
- ✅ Data verified in PostgreSQL
- ✅ Application works correctly

---

**Last Updated:** 2024-01-15
**Script Version:** 1.0.0
**Author:** Optimus Vet Development Team
