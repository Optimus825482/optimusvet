# Scripts Directory

This directory contains utility scripts for the Optimus Vet application.

## 📁 Available Scripts

### 🔄 Customer Contact Migration

Migrate customer phone and address data from MDB to PostgreSQL.

| File                           | Description                               |
| ------------------------------ | ----------------------------------------- |
| `migrate-customer-contacts.py` | Main migration script with fuzzy matching |
| `validate-migration.py`        | Validation and data quality checking      |
| `requirements-migration.txt`   | Python dependencies for migration         |

**Quick Start:**

```bash
pip install -r requirements-migration.txt
python migrate-customer-contacts.py --dry-run
python migrate-customer-contacts.py
python validate-migration.py
```

**Documentation:**

- `MIGRATION-QUICK-START.md` - Quick reference (start here!)
- `MIGRATION-GUIDE.md` - Complete user guide
- `MIGRATION-EXAMPLES.md` - Real-world examples

### 👤 User Management

| File               | Description                     |
| ------------------ | ------------------------------- |
| `create-admin.py`  | Create admin user in PostgreSQL |
| `create-admin.sql` | SQL script for admin creation   |
| `generate-hash.py` | Generate password hashes        |

### 📊 Data Management

| File                               | Description                       |
| ---------------------------------- | --------------------------------- |
| `read-mdb.py`                      | Read and analyze MDB database     |
| `final-clean-import-with-items.py` | Import data from MDB              |
| `fix-customer-balances.ts`         | Fix customer balance calculations |
| `seed-protocols.ts`                | Seed protocol data                |

### 🎨 UI/Assets

| File                | Description                |
| ------------------- | -------------------------- |
| `generate-icons.js` | Generate application icons |

## 🚀 Most Common Tasks

### 1. Migrate Customer Contacts

```bash
# Test first
python migrate-customer-contacts.py --dry-run

# Run migration
python migrate-customer-contacts.py

# Validate
python validate-migration.py
```

### 2. Create Admin User

```bash
python create-admin.py
```

### 3. Fix Customer Balances

```bash
npx tsx fix-customer-balances.ts
```

### 4. Seed Protocol Data

```bash
npx tsx seed-protocols.ts
```

## 📚 Documentation

- **Migration System:** See `MIGRATION-QUICK-START.md`
- **Project Root:** See `../CUSTOMER-CONTACT-MIGRATION-COMPLETE.md`

## 🔧 Requirements

### Python Scripts

```bash
pip install -r requirements-migration.txt
```

### TypeScript Scripts

```bash
npm install
```

## 💡 Tips

- Always test with `--dry-run` first
- Keep log files for troubleshooting
- Backup database before running scripts
- Check documentation for detailed usage

## 🆘 Need Help?

1. Check script-specific documentation
2. Review log files
3. Run with `--help` flag
4. Check main project documentation

---

**Last Updated:** 2024-01-15
