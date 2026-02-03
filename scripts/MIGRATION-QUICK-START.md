# 🚀 Customer Contact Migration - Quick Start

## ⚡ 3-Step Migration

### 1️⃣ Install Dependencies

```bash
cd optimus-vet/scripts
pip install -r requirements-migration.txt
```

### 2️⃣ Test Run (Dry-Run)

```bash
python migrate-customer-contacts.py --dry-run
```

### 3️⃣ Run Migration

```bash
python migrate-customer-contacts.py
```

---

## 📋 Common Commands

| Command                | Description                      |
| ---------------------- | -------------------------------- |
| `--dry-run`            | Test without changes             |
| `--force`              | Overwrite existing data          |
| `--match-threshold 90` | Stricter matching                |
| `--strategy merge`     | Only fill empty fields (default) |
| `--verbose`            | Detailed logging                 |

---

## 🎯 Quick Examples

### Safe Test Run

```bash
python migrate-customer-contacts.py --dry-run
```

### Standard Migration (Recommended)

```bash
python migrate-customer-contacts.py
```

### Strict Matching

```bash
python migrate-customer-contacts.py --match-threshold 95
```

### Force Overwrite (⚠️ Caution!)

```bash
python migrate-customer-contacts.py --force
```

---

## 📊 What Gets Updated?

✅ Phone numbers (`tel` → `phone`)
✅ Addresses (`adres` → `address`)
✅ City/District (`ililce` → `city`, `district`)
✅ Tax Office (`vergidaire` → `taxOffice`)
✅ Tax Number (`vergino` → `taxNumber`)

---

## 🔍 Matching Logic

1. **Exact Match** (Priority 1)
   - Matches by `musId` field
   - 100% confidence

2. **Fuzzy Match** (Priority 2)
   - Matches by customer name
   - Default threshold: 85%
   - Adjustable with `--match-threshold`

---

## 🛡️ Safety Features

✅ **Dry-run mode** - Test first
✅ **Transaction safety** - Rollback on error
✅ **Conflict resolution** - Smart data merging
✅ **Detailed logging** - Track everything
✅ **Unmatched report** - Review missed customers

---

## 📝 Output Files

| File                        | Description            |
| --------------------------- | ---------------------- |
| `migration_*.log`           | Detailed migration log |
| `unmatched_customers_*.txt` | Customers not matched  |

---

## ⚠️ Before You Start

- [ ] Backup PostgreSQL database
- [ ] Verify MDB file exists: `D:\VTCLN\pm.mdb`
- [ ] Check `.env` has `DATABASE_URL`
- [ ] Install Microsoft Access Driver
- [ ] Run dry-run first!

---

## 🆘 Quick Troubleshooting

### "Missing required package"

```bash
pip install -r requirements-migration.txt
```

### "Failed to connect to MDB"

- Install [Microsoft Access Driver](https://www.microsoft.com/en-us/download/details.aspx?id=54920)
- Verify file path: `D:\VTCLN\pm.mdb`

### "DATABASE_URL not found"

- Check `optimus-vet/.env` file exists
- Verify `DATABASE_URL` is set

### "Too many unmatched"

- Lower threshold: `--match-threshold 80`
- Review `unmatched_customers_*.txt`

---

## 📈 Expected Results

For 2,315 customers:

- ⏱️ **Time:** 10-20 seconds
- 🎯 **Match Rate:** > 95%
- ✅ **Success Rate:** 100%
- 📝 **Updates:** ~1,500-2,000 records

---

## 🎓 Conflict Strategies

| Strategy            | Behavior               | Use Case               |
| ------------------- | ---------------------- | ---------------------- |
| **merge** (default) | Fill empty fields only | Recommended            |
| **skip**            | Never overwrite        | Most conservative      |
| **overwrite**       | Replace all data       | MDB is source of truth |

---

## ✅ Verification

After migration, check:

```sql
-- Count updated records
SELECT COUNT(*) FROM customers
WHERE "updatedAt" > NOW() - INTERVAL '1 hour';

-- Check phone numbers
SELECT COUNT(*) FROM customers WHERE phone IS NOT NULL;

-- Check addresses
SELECT COUNT(*) FROM customers WHERE address IS NOT NULL;
```

---

## 📞 Need Help?

1. Check `migration_*.log` for errors
2. Review `MIGRATION-GUIDE.md` for details
3. Run with `--verbose` for more info

---

**Ready to migrate? Start with dry-run! 🚀**

```bash
python migrate-customer-contacts.py --dry-run
```
