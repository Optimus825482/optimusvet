# 📋 Data Validation Strategy - Customer Migration

## 🎯 Overview

Comprehensive validation strategy for migrating customer phone and address data from Access DB to PostgreSQL.

---

## 📞 1. Phone Number Validation Rules (Turkish Format)

### 1.1 Valid Turkish Phone Formats

```typescript
// Turkish phone number patterns
const PHONE_PATTERNS = {
  // Mobile: 05XX XXX XX XX or +90 5XX XXX XX XX
  mobile: /^(\+90|0)?5\d{9}$/,

  // Landline: 0XXX XXX XX XX (10 digits starting with 0)
  landline: /^0\d{9}$/,

  // International: +90 XXX XXX XX XX
  international: /^\+90\d{10}$/,
};
```

### 1.2 Validation Rules

| Rule             | Description                                     | Action              |
| ---------------- | ----------------------------------------------- | ------------------- |
| **Format Check** | Must match Turkish phone patterns               | Normalize or flag   |
| **Length**       | 10 digits (without country code) or 13 with +90 | Trim/pad            |
| **Prefix**       | Mobile: 05XX, Landline: 02XX-04XX               | Validate prefix     |
| **No Letters**   | Only digits, +, spaces, parentheses, dashes     | Strip invalid chars |
| **Not Empty**    | Phone cannot be null/empty                      | Flag as required    |
| **Unique**       | No duplicate phones per customer                | Merge duplicates    |

### 1.3 Normalization Process

```typescript
function normalizePhoneNumber(phone: string): string {
  // 1. Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, "");

  // 2. Handle country code
  if (cleaned.startsWith("+90")) {
    cleaned = "0" + cleaned.substring(3);
  } else if (cleaned.startsWith("90") && cleaned.length === 12) {
    cleaned = "0" + cleaned.substring(2);
  }

  // 3. Ensure starts with 0
  if (!cleaned.startsWith("0")) {
    cleaned = "0" + cleaned;
  }

  // 4. Validate length (should be 11 digits)
  if (cleaned.length !== 11) {
    throw new ValidationError("Invalid phone length");
  }

  return cleaned;
}
```

---

## 🏠 2. Address Field Validation

### 2.1 Address Schema

```typescript
interface Address {
  street: string; // Sokak/Cadde
  buildingNo: string; // Bina No
  apartmentNo?: string; // Daire No (optional)
  neighborhood: string; // Mahalle
  district: string; // İlçe
  city: string; // İl
  postalCode?: string; // Posta Kodu (optional)
  country: string; // Ülke (default: "Türkiye")
}
```

### 2.2 Validation Rules

| Field            | Rules                                        | Max Length | Required |
| ---------------- | -------------------------------------------- | ---------- | -------- |
| **street**       | Trim, capitalize                             | 200        | Yes      |
| **buildingNo**   | Alphanumeric, trim                           | 20         | Yes      |
| **apartmentNo**  | Alphanumeric, trim                           | 20         | No       |
| **neighborhood** | Trim, capitalize                             | 100        | Yes      |
| **district**     | Trim, capitalize, validate against list      | 100        | Yes      |
| **city**         | Trim, capitalize, validate against 81 cities | 50         | Yes      |
| **postalCode**   | 5 digits, numeric                            | 5          | No       |
| **country**      | Default "Türkiye"                            | 50         | Yes      |

### 2.3 Turkish Cities Validation

```typescript
const TURKISH_CITIES = [
  "Adana",
  "Adıyaman",
  "Afyonkarahisar",
  "Ağrı",
  "Aksaray",
  "Amasya",
  "Ankara",
  "Antalya",
  "Ardahan",
  "Artvin",
  "Aydın",
  "Balıkesir",
  // ... all 81 cities
  "Yozgat",
  "Zonguldak",
];

function validateCity(city: string): boolean {
  const normalized = city.trim().toLowerCase();
  return TURKISH_CITIES.some((c) => c.toLowerCase() === normalized);
}
```

### 2.4 Address Normalization

```typescript
function normalizeAddress(address: Partial<Address>): Address {
  return {
    street: capitalizeWords(address.street?.trim() || ""),
    buildingNo: address.buildingNo?.trim() || "",
    apartmentNo: address.apartmentNo?.trim() || null,
    neighborhood: capitalizeWords(address.neighborhood?.trim() || ""),
    district: capitalizeWords(address.district?.trim() || ""),
    city: capitalizeWords(address.city?.trim() || ""),
    postalCode: address.postalCode?.replace(/\D/g, "") || null,
    country: address.country?.trim() || "Türkiye",
  };
}

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (l) => l.toUpperCase());
}
```

---

## 🔍 3. Duplicate Detection Strategy

### 3.1 Duplicate Detection Levels

```typescript
enum DuplicateLevel {
  EXACT = "exact", // 100% match
  HIGH = "high", // 90%+ similarity
  MEDIUM = "medium", // 70-89% similarity
  LOW = "low", // 50-69% similarity
}
```

### 3.2 Detection Algorithms

#### 3.2.1 Phone Number Duplicates

```typescript
function detectPhoneDuplicates(phones: string[]): DuplicateGroup[] {
  const normalized = phones.map(normalizePhoneNumber);
  const duplicates = new Map<string, string[]>();

  normalized.forEach((phone, idx) => {
    if (!duplicates.has(phone)) {
      duplicates.set(phone, []);
    }
    duplicates.get(phone)!.push(phones[idx]);
  });

  return Array.from(duplicates.entries())
    .filter(([_, group]) => group.length > 1)
    .map(([normalized, originals]) => ({
      normalized,
      originals,
      level: DuplicateLevel.EXACT,
    }));
}
```

#### 3.2.2 Address Duplicates (Fuzzy Matching)

```typescript
import { levenshtein } from "fast-levenshtein";

function detectAddressDuplicates(addresses: Address[]): DuplicateGroup[] {
  const duplicates: DuplicateGroup[] = [];

  for (let i = 0; i < addresses.length; i++) {
    for (let j = i + 1; j < addresses.length; j++) {
      const similarity = calculateAddressSimilarity(addresses[i], addresses[j]);

      if (similarity >= 0.5) {
        duplicates.push({
          addresses: [addresses[i], addresses[j]],
          similarity,
          level: getSimilarityLevel(similarity),
        });
      }
    }
  }

  return duplicates;
}

function calculateAddressSimilarity(addr1: Address, addr2: Address): number {
  const weights = {
    street: 0.3,
    buildingNo: 0.2,
    neighborhood: 0.2,
    district: 0.15,
    city: 0.15,
  };

  let totalSimilarity = 0;

  for (const [field, weight] of Object.entries(weights)) {
    const val1 = (addr1[field] || "").toLowerCase();
    const val2 = (addr2[field] || "").toLowerCase();

    if (val1 === val2) {
      totalSimilarity += weight;
    } else {
      const distance = levenshtein.get(val1, val2);
      const maxLen = Math.max(val1.length, val2.length);
      const similarity = 1 - distance / maxLen;
      totalSimilarity += similarity * weight;
    }
  }

  return totalSimilarity;
}
```

### 3.3 Duplicate Resolution Strategy

| Scenario                            | Action                              | Priority |
| ----------------------------------- | ----------------------------------- | -------- |
| **Exact phone match**               | Keep most recent, flag others       | High     |
| **Similar addresses (>90%)**        | Manual review required              | High     |
| **Same customer, multiple phones**  | Keep all, mark as primary/secondary | Medium   |
| **Different customers, same phone** | Flag for investigation              | Critical |
| **Empty vs filled fields**          | Merge, prefer filled data           | Medium   |

---

## 🧹 4. Data Cleaning Rules

### 4.1 String Cleaning Pipeline

```typescript
function cleanString(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .trim() // Remove leading/trailing whitespace
    .replace(/\s+/g, " ") // Normalize multiple spaces to single
    .replace(/[\r\n\t]/g, " ") // Replace line breaks with space
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, "") // Remove control characters
    .trim(); // Final trim
}
```

### 4.2 Specific Field Cleaning

#### Phone Number Cleaning

```typescript
function cleanPhoneNumber(phone: string): string {
  return phone
    .replace(/[\s\-\(\)\[\]\.]/g, "") // Remove separators
    .replace(/^00/, "+") // Convert 00 to +
    .replace(/[^\d+]/g, ""); // Keep only digits and +
}
```

#### Address Field Cleaning

```typescript
function cleanAddressField(field: string): string {
  return cleanString(field)
    .replace(/\b(sokak|sok\.?|sk\.?)\b/gi, "Sokak") // Normalize "sokak"
    .replace(/\b(cadde|cad\.?|cd\.?)\b/gi, "Cadde") // Normalize "cadde"
    .replace(/\b(mahalle|mah\.?)\b/gi, "Mahalle") // Normalize "mahalle"
    .replace(/\b(no:?|numara:?)\b/gi, "No:") // Normalize "no"
    .replace(/\s+/g, " ")
    .trim();
}
```

### 4.3 Data Type Conversions

```typescript
const cleaningRules = {
  // Trim all strings
  trim: (value: any) => (typeof value === "string" ? value.trim() : value),

  // Normalize case
  titleCase: (value: string) => capitalizeWords(value.toLowerCase()),

  // Remove null bytes
  removeNullBytes: (value: string) => value.replace(/\0/g, ""),

  // Fix encoding issues
  fixEncoding: (value: string) => {
    // Common Turkish character fixes
    return value
      .replace(/Ä±/g, "ı")
      .replace(/Ä°/g, "İ")
      .replace(/ÅŸ/g, "ş")
      .replace(/Åž/g, "Ş");
  },

  // Normalize numbers
  normalizeNumber: (value: string) => value.replace(/[^\d]/g, ""),

  // Remove extra punctuation
  normalizePunctuation: (value: string) => value.replace(/[,;:]+/g, ","),
};
```

### 4.4 Cleaning Pipeline

```typescript
interface CleaningResult {
  original: any;
  cleaned: any;
  changes: string[];
  warnings: string[];
}

function applyCleaningPipeline(data: any, rules: string[]): CleaningResult {
  const result: CleaningResult = {
    original: data,
    cleaned: { ...data },
    changes: [],
    warnings: [],
  };

  for (const [field, value] of Object.entries(data)) {
    if (typeof value === "string") {
      let cleaned = value;

      // Apply each rule
      for (const rule of rules) {
        const newValue = cleaningRules[rule](cleaned);
        if (newValue !== cleaned) {
          result.changes.push(`${field}: Applied ${rule}`);
          cleaned = newValue;
        }
      }

      result.cleaned[field] = cleaned;

      // Check for potential issues
      if (cleaned.length === 0 && value.length > 0) {
        result.warnings.push(`${field}: Cleaned to empty string`);
      }
    }
  }

  return result;
}
```

---

## ⚠️ 5. Error Handling and Logging Approach

### 5.1 Error Classification

```typescript
enum ValidationErrorType {
  CRITICAL = "critical", // Blocks migration
  ERROR = "error", // Requires manual fix
  WARNING = "warning", // Can proceed with flag
  INFO = "info", // Informational only
}

interface ValidationError {
  type: ValidationErrorType;
  field: string;
  value: any;
  message: string;
  suggestion?: string;
  recordId: string;
  timestamp: Date;
}
```

### 5.2 Error Handling Strategy

| Error Type   | Example                                      | Action           | Migration |
| ------------ | -------------------------------------------- | ---------------- | --------- |
| **CRITICAL** | Invalid phone format, missing required field | Block record     | Skip      |
| **ERROR**    | Duplicate phone, invalid city                | Flag for review  | Skip      |
| **WARNING**  | Missing postal code, unusual format          | Log and continue | Proceed   |
| **INFO**     | Data normalized, encoding fixed              | Log only         | Proceed   |

### 5.3 Logging Implementation

```typescript
class MigrationLogger {
  private logs: ValidationError[] = [];
  private stats = {
    total: 0,
    success: 0,
    skipped: 0,
    critical: 0,
    errors: 0,
    warnings: 0,
  };

  log(error: ValidationError): void {
    this.logs.push(error);
    this.stats[error.type]++;

    // Real-time logging to file
    this.writeToFile(error);

    // Console output for monitoring
    this.logToConsole(error);
  }

  private writeToFile(error: ValidationError): void {
    const logEntry = {
      timestamp: error.timestamp.toISOString(),
      type: error.type,
      recordId: error.recordId,
      field: error.field,
      value: error.value,
      message: error.message,
      suggestion: error.suggestion,
    };

    fs.appendFileSync(
      `migration-${Date.now()}.log`,
      JSON.stringify(logEntry) + "\n",
    );
  }

  private logToConsole(error: ValidationError): void {
    const colors = {
      critical: "\x1b[31m", // Red
      error: "\x1b[33m", // Yellow
      warning: "\x1b[36m", // Cyan
      info: "\x1b[37m", // White
    };

    console.log(
      `${colors[error.type]}[${error.type.toUpperCase()}] ` +
        `Record ${error.recordId}: ${error.message}\x1b[0m`,
    );
  }

  generateReport(): MigrationReport {
    return {
      summary: this.stats,
      errors: this.logs.filter(
        (l) => l.type === "error" || l.type === "critical",
      ),
      warnings: this.logs.filter((l) => l.type === "warning"),
      timestamp: new Date(),
      duration: this.calculateDuration(),
    };
  }
}
```

### 5.4 Validation Error Messages

```typescript
const ERROR_MESSAGES = {
  PHONE_INVALID_FORMAT: {
    message: "Phone number format is invalid",
    suggestion: "Expected format: 05XX XXX XX XX or +90 5XX XXX XX XX",
  },
  PHONE_INVALID_LENGTH: {
    message: "Phone number has invalid length",
    suggestion: "Turkish phone numbers should be 10 digits (11 with leading 0)",
  },
  PHONE_DUPLICATE: {
    message: "Duplicate phone number detected",
    suggestion: "Review and merge duplicate records",
  },
  ADDRESS_MISSING_REQUIRED: {
    message: "Required address field is missing",
    suggestion: "Provide street, neighborhood, district, and city",
  },
  ADDRESS_INVALID_CITY: {
    message: "City name is not in Turkish cities list",
    suggestion: "Check spelling or use standard city name",
  },
  ADDRESS_INVALID_POSTAL: {
    message: "Postal code must be 5 digits",
    suggestion: "Provide valid Turkish postal code or leave empty",
  },
};
```

### 5.5 Progress Tracking

```typescript
class MigrationProgress {
  private total: number;
  private processed: number = 0;
  private startTime: Date;

  constructor(total: number) {
    this.total = total;
    this.startTime = new Date();
  }

  update(count: number = 1): void {
    this.processed += count;
    this.logProgress();
  }

  private logProgress(): void {
    const percentage = ((this.processed / this.total) * 100).toFixed(2);
    const elapsed = Date.now() - this.startTime.getTime();
    const rate = this.processed / (elapsed / 1000);
    const remaining = (this.total - this.processed) / rate;

    console.log(
      `Progress: ${this.processed}/${this.total} (${percentage}%) | ` +
        `Rate: ${rate.toFixed(2)} records/sec | ` +
        `ETA: ${this.formatTime(remaining)}`,
    );
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  }
}
```

---

## 🔄 6. Rollback Strategy

### 6.1 Rollback Scenarios

| Scenario                          | Trigger                 | Action          | Recovery Time |
| --------------------------------- | ----------------------- | --------------- | ------------- |
| **Critical errors > 10%**         | Validation failure rate | Auto-rollback   | < 1 min       |
| **Database constraint violation** | Foreign key error       | Auto-rollback   | < 1 min       |
| **Manual intervention**           | User request            | Manual rollback | < 5 min       |
| **Partial migration failure**     | Mid-process error       | Rollback batch  | < 2 min       |
| **Data corruption detected**      | Post-migration check    | Full rollback   | < 10 min      |

### 6.2 Transaction-Based Migration

```typescript
async function migrateWithRollback(
  records: CustomerRecord[],
  batchSize: number = 100,
): Promise<MigrationResult> {
  const logger = new MigrationLogger();
  const progress = new MigrationProgress(records.length);

  // Create backup point
  const backupId = await createBackupPoint();

  try {
    // Process in batches with transactions
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      await prisma.$transaction(
        async (tx) => {
          for (const record of batch) {
            try {
              // Validate
              const validation = await validateRecord(record);

              if (validation.critical.length > 0) {
                logger.log({
                  type: ValidationErrorType.CRITICAL,
                  field: "record",
                  value: record,
                  message: "Critical validation errors",
                  recordId: record.id,
                  timestamp: new Date(),
                });
                continue; // Skip this record
              }

              // Clean and normalize
              const cleaned = cleanRecord(record);

              // Insert
              await tx.customer.create({
                data: cleaned,
              });

              progress.update();
            } catch (error) {
              logger.log({
                type: ValidationErrorType.ERROR,
                field: "record",
                value: record,
                message: error.message,
                recordId: record.id,
                timestamp: new Date(),
              });

              // If error rate too high, throw to trigger rollback
              if (logger.stats.errors / logger.stats.total > 0.1) {
                throw new Error("Error rate exceeded 10%");
              }
            }
          }
        },
        {
          timeout: 30000, // 30 second timeout per batch
          maxWait: 5000, // Max 5 seconds wait for transaction
        },
      );
    }

    // Verify migration
    const verification = await verifyMigration(records.length);

    if (!verification.success) {
      throw new Error("Migration verification failed");
    }

    return {
      success: true,
      stats: logger.stats,
      report: logger.generateReport(),
    };
  } catch (error) {
    console.error("Migration failed, initiating rollback...", error);

    // Rollback to backup point
    await rollbackToBackup(backupId);

    return {
      success: false,
      error: error.message,
      stats: logger.stats,
      report: logger.generateReport(),
    };
  }
}
```

### 6.3 Backup Strategy

```typescript
interface BackupPoint {
  id: string;
  timestamp: Date;
  tableSnapshot: string;
  recordCount: number;
}

async function createBackupPoint(): Promise<string> {
  const backupId = `backup_${Date.now()}`;

  // Create backup table
  await prisma.$executeRaw`
    CREATE TABLE customer_backup_${backupId} AS 
    SELECT * FROM customer;
  `;

  // Store metadata
  await prisma.migrationBackup.create({
    data: {
      id: backupId,
      timestamp: new Date(),
      tableName: `customer_backup_${backupId}`,
      recordCount: await prisma.customer.count(),
    },
  });

  console.log(`✅ Backup point created: ${backupId}`);
  return backupId;
}

async function rollbackToBackup(backupId: string): Promise<void> {
  console.log(`🔄 Rolling back to backup: ${backupId}`);

  await prisma.$transaction([
    // Delete current data
    prisma.$executeRaw`DELETE FROM customer;`,

    // Restore from backup
    prisma.$executeRaw`
      INSERT INTO customer 
      SELECT * FROM customer_backup_${backupId};
    `,

    // Reset sequences
    prisma.$executeRaw`
      SELECT setval('customer_id_seq', 
        (SELECT MAX(id) FROM customer));
    `,
  ]);

  console.log(`✅ Rollback completed successfully`);
}
```

### 6.4 Verification Checks

```typescript
async function verifyMigration(
  expectedCount: number,
): Promise<VerificationResult> {
  const checks = [];

  // 1. Record count check
  const actualCount = await prisma.customer.count();
  checks.push({
    name: "Record Count",
    expected: expectedCount,
    actual: actualCount,
    passed: actualCount >= expectedCount * 0.9, // Allow 10% loss for invalid records
  });

  // 2. Phone number format check
  const invalidPhones = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM customer 
    WHERE phone !~ '^0[0-9]{10}$' AND phone IS NOT NULL;
  `;
  checks.push({
    name: "Phone Format",
    expected: 0,
    actual: invalidPhones[0].count,
    passed: invalidPhones[0].count === 0,
  });

  // 3. Required fields check
  const missingRequired = await prisma.customer.count({
    where: {
      OR: [{ name: null }, { phone: null }],
    },
  });
  checks.push({
    name: "Required Fields",
    expected: 0,
    actual: missingRequired,
    passed: missingRequired === 0,
  });

  // 4. Duplicate check
  const duplicates = await prisma.$queryRaw`
    SELECT phone, COUNT(*) as count 
    FROM customer 
    WHERE phone IS NOT NULL
    GROUP BY phone 
    HAVING COUNT(*) > 1;
  `;
  checks.push({
    name: "Duplicates",
    expected: 0,
    actual: duplicates.length,
    passed: duplicates.length === 0,
  });

  const allPassed = checks.every((c) => c.passed);

  return {
    success: allPassed,
    checks,
    summary: `${checks.filter((c) => c.passed).length}/${checks.length} checks passed`,
  };
}
```
