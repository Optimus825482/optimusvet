# Migration Script - Real-World Examples

## 📚 Table of Contents

1. [First-Time Migration](#first-time-migration)
2. [Incremental Updates](#incremental-updates)
3. [Data Quality Issues](#data-quality-issues)
4. [Advanced Scenarios](#advanced-scenarios)
5. [Troubleshooting Examples](#troubleshooting-examples)

---

## 🎯 First-Time Migration

### Scenario: Initial data migration from MDB to PostgreSQL

**Situation:**

- Fresh PostgreSQL database with customers
- Need to populate phone and address data from MDB
- Want to be cautious and test first

**Step-by-Step:**

#### 1. Install Dependencies

```bash
cd optimus-vet/scripts
pip install -r requirements-migration.txt
```

**Expected Output:**

```
Collecting pyodbc>=5.0.0
  Downloading pyodbc-5.0.1-cp311-cp311-win_amd64.whl (67 kB)
Collecting psycopg2-binary>=2.9.9
  Downloading psycopg2_binary-2.9.9-cp311-cp311-win_amd64.whl (1.2 MB)
...
Successfully installed pyodbc-5.0.1 psycopg2-binary-2.9.9 ...
```

#### 2. Run Dry-Run

```bash
python migrate-customer-contacts.py --dry-run
```

**Expected Output:**

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
Progress: 2300/2315 (99.4%)

ℹ️  Dry-run mode - no changes committed
🔌 Closed PostgreSQL connection
🔌 Closed MDB connection

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

💡 This was a dry-run. To perform actual migration, run without --dry-run flag
```

#### 3. Review Unmatched Customers

```bash
cat unmatched_customers_20240115_103045.txt
```

**Example Content:**

```
Unmatched Customers Report
======================================================================

Total unmatched: 35

MDB ID | Customer Name                  | Phone           | Address
----------------------------------------------------------------------
   145 | Mehmet YILMAZ (ESKİ)          | 05331234567     | Ankara Çankaya
   289 | Ayşe KAYA - SİLİNDİ           | 05449876543     | İstanbul Kadıköy
   512 | TEST MÜŞTERİ                  | 05551112233     | Test Adres
```

**Analysis:**

- Customer 145: Has "(ESKİ)" suffix - old record
- Customer 289: Has "- SİLİNDİ" - deleted record
- Customer 512: Test data

**Action:** These are expected to be unmatched. Proceed with migration.

#### 4. Run Live Migration

```bash
python migrate-customer-contacts.py
```

**Expected Output:**

```
🚀 Starting customer contact data migration...
Mode: LIVE
✅ Connected to MDB: D:\VTCLN\pm.mdb
✅ Connected to PostgreSQL
...
✅ Transaction committed
✅ Migration completed successfully!
```

#### 5. Validate Results

```bash
python validate-migration.py
```

**Expected Output:**

```
🔍 Starting migration validation...
📡 Connecting to databases...
✅ Connected to PostgreSQL
📊 Gathering statistics...

======================================================================
📊 VALIDATION STATISTICS
======================================================================

📈 Database Overview:
  Total Customers: 2,315
  Recently Updated (24h): 1,850

📱 Contact Information:
  With Phone: 2,100 (90.7%)
  With Address: 2,000 (86.4%)
  With City: 2,050 (88.6%)
  With District: 2,050 (88.6%)
  With Tax Info: 1,500 (64.8%)

⚠️  Data Quality Issues:
  Phone Format Errors: 0
  Empty Names: 0
  Duplicate Phones: 5

✅ Data Completeness Score: 89.1%
   Status: Good ✅
======================================================================

✅ Validation completed!
✅ All validation checks passed!
```

---

## 🔄 Incremental Updates

### Scenario: MDB data has been updated, need to sync changes

**Situation:**

- Migration was done 1 month ago
- MDB has new phone numbers for some customers
- Don't want to overwrite existing PostgreSQL data

**Solution: Use MERGE strategy (default)**

```bash
python migrate-customer-contacts.py --strategy merge
```

**What Happens:**

- ✅ Empty phone fields → Updated with MDB data
- ✅ Empty address fields → Updated with MDB data
- ⏭️ Existing phone numbers → Kept as-is
- ⏭️ Existing addresses → Kept as-is

**Example:**

| Customer      | PG Phone    | MDB Phone   | Result                |
| ------------- | ----------- | ----------- | --------------------- |
| Ali AYDIN     | 05331234567 | 05339876543 | 05331234567 (kept)    |
| Mehmet YILMAZ | (empty)     | 05441234567 | 05441234567 (updated) |
| Ayşe KAYA     | 05551234567 | (empty)     | 05551234567 (kept)    |

---

## 🔧 Data Quality Issues

### Scenario 1: Too Many Unmatched Customers

**Problem:**

```
Matched: 1800
Unmatched: 515
```

**Diagnosis:**

```bash
# Check unmatched report
cat unmatched_customers_*.txt
```

**Common Causes:**

1. **Name Format Differences**

   ```
   MDB: "MEHMET YILMAZ"
   PG:  "Mehmet Yılmaz"  (Turkish characters)
   ```

2. **Extra Text in Names**

   ```
   MDB: "ALİ AYDIN (KÖYÜ)"
   PG:  "Ali Aydın"
   ```

3. **Abbreviations**
   ```
   MDB: "M. YILMAZ"
   PG:  "Mehmet Yılmaz"
   ```

**Solution: Lower Match Threshold**

```bash
# Try 80% threshold
python migrate-customer-contacts.py --match-threshold 80 --dry-run
```

**Result:**

```
Matched: 2150
Unmatched: 165
```

**Better! Now run live:**

```bash
python migrate-customer-contacts.py --match-threshold 80
```

---

### Scenario 2: Duplicate Phone Numbers

**Problem:**

```bash
python validate-migration.py
```

**Output:**

```
⚠️  Data Quality Issues:
  Duplicate Phones: 15
```

**Investigation:**

```sql
-- Find duplicates
SELECT phone, COUNT(*), STRING_AGG(name, ', ') as customers
FROM customers
WHERE phone IS NOT NULL AND phone != ''
GROUP BY phone
HAVING COUNT(*) > 1;
```

**Result:**

```
phone        | count | customers
-------------|-------|---------------------------
05331234567  | 2     | Ali Aydın, Ali Aydin (Eski)
05449876543  | 3     | Mehmet Yılmaz, M. Yilmaz, Mehmet Y.
```

**Analysis:**

- Same person with multiple records
- Name variations causing duplicates

**Solution:**

1. Manually merge duplicate customers in PostgreSQL
2. Re-run migration with cleaned data

---

### Scenario 3: Phone Format Issues

**Problem:**

```
Phone Format Errors: 45
```

**Investigation:**

```sql
-- Find invalid phones
SELECT id, name, phone
FROM customers
WHERE phone IS NOT NULL
  AND phone != ''
  AND (
    LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) != 11
    OR NOT phone ~ '^05'
  );
```

**Common Issues:**

| Issue                | Example           | Fix                 |
| -------------------- | ----------------- | ------------------- |
| Missing leading 0    | 5331234567        | Add 0 → 05331234567 |
| Extra spaces         | 0533 123 45 67    | Remove spaces       |
| International format | +90 533 123 45 67 | Remove +90          |
| Landline             | 0312 123 45 67    | Keep as-is (valid)  |

**Fix Script:**

```sql
-- Fix missing leading 0
UPDATE customers
SET phone = '0' || phone
WHERE phone ~ '^5[0-9]{10}$';

-- Remove spaces
UPDATE customers
SET phone = REGEXP_REPLACE(phone, '\s', '', 'g')
WHERE phone ~ '\s';

-- Remove international prefix
UPDATE customers
SET phone = REGEXP_REPLACE(phone, '^\+90', '0')
WHERE phone ~ '^\+90';
```

---

## 🚀 Advanced Scenarios

### Scenario 1: Selective Migration (Specific Customers)

**Situation:** Only want to migrate customers from a specific region

**Solution:** Modify the script or use SQL filtering

```python
# In migrate-customer-contacts.py, modify extract_mdb_customers:

query = """
    SELECT
        musid, ad, tel, ililce, adres, vergidaire, vergino
    FROM musteri
    WHERE ililce LIKE '%ZONGULDAK%'
    ORDER BY musid
"""
```

---

### Scenario 2: Force Overwrite (MDB is Source of Truth)

**Situation:**

- MDB data is more accurate
- Need to replace all PostgreSQL data
- Understand the risks

**Warning Check:**

```bash
python migrate-customer-contacts.py --force
```

**Output:**

```
⚠️  WARNING: Force mode enabled - will overwrite existing data!
Are you sure? (yes/no): yes
```

**What Gets Overwritten:**

| Field   | Before         | After                       |
| ------- | -------------- | --------------------------- |
| Phone   | 05331234567    | 05339876543 (from MDB)      |
| Address | Ankara Çankaya | İstanbul Kadıköy (from MDB) |
| City    | Ankara         | İstanbul (from MDB)         |

**Use Cases:**

- ✅ Initial migration with bad data
- ✅ Data correction from authoritative source
- ❌ Regular updates (use merge instead)

---

### Scenario 3: Custom Match Threshold Per Customer Type

**Situation:** Different matching strictness for different customer types

**Solution:** Run multiple migrations with different thresholds

```bash
# High-value customers (strict matching)
python migrate-customer-contacts.py --match-threshold 95 --dry-run

# Regular customers (normal matching)
python migrate-customer-contacts.py --match-threshold 85 --dry-run

# Old/archived customers (lenient matching)
python migrate-customer-contacts.py --match-threshold 75 --dry-run
```

---

## 🔍 Troubleshooting Examples

### Example 1: Connection Timeout

**Error:**

```
❌ Failed to connect to PostgreSQL: connection timeout
```

**Diagnosis:**

```bash
# Test PostgreSQL connection
psql -h localhost -U postgres -d optimusvet

# Check if PostgreSQL is running
# Windows:
sc query postgresql-x64-14

# Linux:
systemctl status postgresql
```

**Solution:**

```bash
# Start PostgreSQL
# Windows:
net start postgresql-x64-14

# Linux:
sudo systemctl start postgresql
```

---

### Example 2: MDB Driver Not Found

**Error:**

```
❌ Failed to connect to MDB: [Microsoft][ODBC Driver Manager] Data source name not found
```

**Solution:**

1. **Check Python Architecture:**

```bash
python -c "import struct; print(struct.calcsize('P') * 8)"
# Output: 64 (64-bit) or 32 (32-bit)
```

2. **Install Matching Driver:**

- 64-bit Python → Install 64-bit Access Driver
- 32-bit Python → Install 32-bit Access Driver

3. **Download:**
   - [Microsoft Access Database Engine 2016](https://www.microsoft.com/en-us/download/details.aspx?id=54920)

4. **Verify Installation:**

```bash
# Check installed ODBC drivers
odbcad32.exe
# Look for "Microsoft Access Driver (*.mdb, *.accdb)"
```

---

### Example 3: Permission Denied

**Error:**

```
❌ Failed to update customer abc123: permission denied for table customers
```

**Solution:**

```sql
-- Grant UPDATE permission
GRANT UPDATE ON customers TO your_username;

-- Or grant all permissions
GRANT ALL PRIVILEGES ON customers TO your_username;

-- Verify permissions
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'customers';
```

---

### Example 4: Transaction Deadlock

**Error:**

```
❌ Migration failed: deadlock detected
```

**Cause:** Another process is updating customers table

**Solution:**

```bash
# Check active connections
psql -U postgres -d optimusvet -c "
SELECT pid, usename, application_name, state, query
FROM pg_stat_activity
WHERE datname = 'optimusvet'
  AND state = 'active';
"

# If needed, terminate blocking query
psql -U postgres -d optimusvet -c "
SELECT pg_terminate_backend(12345);  -- Replace with actual PID
"

# Re-run migration
python migrate-customer-contacts.py
```

---

## 📊 Performance Optimization

### Large Database (10,000+ customers)

**Problem:** Migration takes too long

**Solution: Batch Processing**

Modify script to process in batches:

```python
# In migrate-customer-contacts.py
config = MigrationConfig(
    batch_size=500,  # Process 500 at a time
    # ... other config
)
```

**Expected Performance:**

| Customers | Time (Default) | Time (Batched) |
| --------- | -------------- | -------------- |
| 2,315     | 15 seconds     | 12 seconds     |
| 10,000    | 65 seconds     | 45 seconds     |
| 50,000    | 320 seconds    | 180 seconds    |

---

## ✅ Success Checklist

After migration, verify:

- [ ] Match rate > 95%
- [ ] No failed updates
- [ ] Phone format valid
- [ ] No duplicate phones
- [ ] Address data populated
- [ ] City/district populated
- [ ] Log file clean
- [ ] Unmatched customers reviewed
- [ ] Validation script passed
- [ ] Application works correctly

---

## 📞 Quick Reference

| Task                | Command                                                    |
| ------------------- | ---------------------------------------------------------- |
| Test migration      | `python migrate-customer-contacts.py --dry-run`            |
| Run migration       | `python migrate-customer-contacts.py`                      |
| Force overwrite     | `python migrate-customer-contacts.py --force`              |
| Strict matching     | `python migrate-customer-contacts.py --match-threshold 95` |
| Lenient matching    | `python migrate-customer-contacts.py --match-threshold 75` |
| Validate results    | `python validate-migration.py`                             |
| Detailed validation | `python validate-migration.py --detailed`                  |
| Export report       | `python validate-migration.py --export-csv`                |

---

**Need more help?** Check `MIGRATION-GUIDE.md` for detailed documentation.
