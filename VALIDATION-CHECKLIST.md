# ✅ Data Validation Checklist

## Pre-Migration Checklist

### 📊 Data Analysis

- [ ] Count total records in source database
- [ ] Identify records with missing required fields
- [ ] Analyze phone number formats and patterns
- [ ] Check for duplicate phone numbers
- [ ] Review address field completeness
- [ ] Identify invalid city names
- [ ] Check for encoding issues (Turkish characters)
- [ ] Analyze data distribution by field

### 🔧 Environment Setup

- [ ] Backup source database (Access DB)
- [ ] Create PostgreSQL backup point
- [ ] Set up migration logging directory
- [ ] Configure error thresholds (10% max error rate)
- [ ] Test database connection
- [ ] Verify Prisma schema matches requirements
- [ ] Set up monitoring dashboard

### 🧪 Test Environment

- [ ] Create test database with sample data
- [ ] Run validation on test data
- [ ] Test rollback procedure
- [ ] Verify error logging works
- [ ] Test duplicate detection
- [ ] Validate cleaning pipeline
- [ ] Performance test with large batches

---

## During Migration Checklist

### 🔄 Batch Processing

- [ ] Process in batches of 100 records
- [ ] Log progress every batch
- [ ] Monitor error rate in real-time
- [ ] Check memory usage
- [ ] Verify transaction commits
- [ ] Track processing speed (records/sec)

### ⚠️ Error Monitoring

- [ ] Monitor critical error count
- [ ] Review error logs in real-time
- [ ] Check for constraint violations
- [ ] Verify duplicate detection working
- [ ] Monitor database locks
- [ ] Check for timeout errors

### 📈 Progress Tracking

- [ ] Display current batch number
- [ ] Show percentage complete
- [ ] Calculate ETA
- [ ] Log successful migrations
- [ ] Track skipped records
- [ ] Monitor database size growth

---

## Post-Migration Checklist

### ✅ Verification

- [ ] Verify total record count (allow 10% loss)
- [ ] Check all phone numbers match Turkish format
- [ ] Verify no missing required fields
- [ ] Confirm no duplicate phone numbers
- [ ] Validate all cities are in Turkish cities list
- [ ] Check postal codes are 5 digits or null
- [ ] Verify Turkish character encoding
- [ ] Test random sample queries

### 📊 Data Quality

- [ ] Run data quality report
- [ ] Review warning logs
- [ ] Check address completeness
- [ ] Verify normalization applied correctly
- [ ] Test search functionality
- [ ] Validate foreign key relationships
- [ ] Check index performance

### 📝 Documentation

- [ ] Generate migration report
- [ ] Document skipped records with reasons
- [ ] Create list of records needing manual review
- [ ] Save error logs for analysis
- [ ] Document any data transformations
- [ ] Update database schema documentation

### 🔒 Cleanup

- [ ] Archive migration logs
- [ ] Keep backup for 30 days
- [ ] Remove temporary tables
- [ ] Update application configuration
- [ ] Notify stakeholders of completion
- [ ] Schedule follow-up data quality check

---

## Rollback Checklist

### 🚨 Rollback Triggers

- [ ] Critical error rate > 10%
- [ ] Database constraint violations
- [ ] Data corruption detected
- [ ] Manual intervention required
- [ ] Verification checks failed

### 🔄 Rollback Procedure

- [ ] Stop migration process immediately
- [ ] Log rollback reason
- [ ] Execute rollback transaction
- [ ] Verify backup restoration
- [ ] Check record counts match pre-migration
- [ ] Test application functionality
- [ ] Generate rollback report
- [ ] Analyze failure cause
- [ ] Plan corrective actions

---

## Emergency Contacts

| Role           | Name   | Contact       | Availability   |
| -------------- | ------ | ------------- | -------------- |
| Database Admin | [Name] | [Phone/Email] | 24/7           |
| Dev Lead       | [Name] | [Phone/Email] | Business hours |
| System Admin   | [Name] | [Phone/Email] | 24/7           |
| Stakeholder    | [Name] | [Phone/Email] | Business hours |

---

## Success Criteria

✅ **Migration is successful if:**

- At least 90% of records migrated successfully
- Zero critical errors in migrated data
- All verification checks pass
- No duplicate phone numbers
- All required fields populated
- Application functions correctly with new data
- Performance meets requirements
- Rollback tested and verified
