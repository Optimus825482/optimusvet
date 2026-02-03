# 🧪 Data Validation Test Scenarios

## 📞 Phone Number Validation Tests

### Test Case 1: Valid Turkish Mobile Numbers

```typescript
describe("Phone Validation - Valid Mobile", () => {
  const validMobileNumbers = [
    "05551234567", // Standard format
    "+905551234567", // With country code
    "0 555 123 45 67", // With spaces
    "0555-123-45-67", // With dashes
    "(0555) 123 45 67", // With parentheses
    "905551234567", // Without + prefix
  ];

  test.each(validMobileNumbers)("should accept %s", (phone) => {
    const result = validatePhone(phone);
    expect(result.isValid).toBe(true);
    expect(result.normalized).toBe("05551234567");
  });
});
```

**Expected Result:** All formats normalize to `05551234567`

---

### Test Case 2: Valid Turkish Landline Numbers

```typescript
describe("Phone Validation - Valid Landline", () => {
  const validLandlines = [
    "02121234567", // Istanbul
    "03121234567", // Ankara
    "02321234567", // Izmir
    "0 212 123 45 67", // With spaces
  ];

  test.each(validLandlines)("should accept %s", (phone) => {
    const result = validatePhone(phone);
    expect(result.isValid).toBe(true);
    expect(result.type).toBe("landline");
  });
});
```

**Expected Result:** All recognized as valid landlines

---

### Test Case 3: Invalid Phone Numbers

```typescript
describe("Phone Validation - Invalid", () => {
  const invalidNumbers = [
    "123456", // Too short
    "05551234567890", // Too long
    "15551234567", // Invalid prefix
    "abcd1234567", // Contains letters
    "0555 123 45", // Incomplete
    "", // Empty
    null, // Null
    "0000000000", // All zeros
  ];

  test.each(invalidNumbers)("should reject %s", (phone) => {
    const result = validatePhone(phone);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("PHONE_INVALID_FORMAT");
  });
});
```

**Expected Result:** All rejected with appropriate error messages

---

### Test Case 4: Phone Number Normalization

```typescript
describe("Phone Normalization", () => {
  const testCases = [
    { input: "+90 555 123 45 67", expected: "05551234567" },
    { input: "90 555 123 45 67", expected: "05551234567" },
    { input: "(0555) 123-45-67", expected: "05551234567" },
    { input: "0555.123.45.67", expected: "05551234567" },
    { input: "  0555 123 45 67  ", expected: "05551234567" },
  ];

  test.each(testCases)(
    "$input normalizes to $expected",
    ({ input, expected }) => {
      const result = normalizePhoneNumber(input);
      expect(result).toBe(expected);
    },
  );
});
```

**Expected Result:** All inputs normalize to clean format

---

## 🏠 Address Validation Tests

### Test Case 5: Valid Complete Address

```typescript
describe("Address Validation - Complete", () => {
  const validAddress = {
    street: "Atatürk Caddesi",
    buildingNo: "123",
    apartmentNo: "5",
    neighborhood: "Çankaya Mahallesi",
    district: "Çankaya",
    city: "Ankara",
    postalCode: "06100",
    country: "Türkiye",
  };

  test("should accept complete valid address", () => {
    const result = validateAddress(validAddress);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
```

**Expected Result:** Address accepted with no errors

---

### Test Case 6: Missing Required Fields

```typescript
describe("Address Validation - Missing Required", () => {
  const testCases = [
    { field: "street", error: "ADDRESS_MISSING_REQUIRED" },
    { field: "neighborhood", error: "ADDRESS_MISSING_REQUIRED" },
    { field: "district", error: "ADDRESS_MISSING_REQUIRED" },
    { field: "city", error: "ADDRESS_MISSING_REQUIRED" },
  ];

  test.each(testCases)(
    "should reject when $field is missing",
    ({ field, error }) => {
      const address = { ...validAddress };
      delete address[field];

      const result = validateAddress(address);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(error);
    },
  );
});
```

**Expected Result:** Validation fails for each missing required field

---

### Test Case 7: Invalid City Names

```typescript
describe("Address Validation - Invalid City", () => {
  const invalidCities = [
    "InvalidCity",
    "New York",
    "İstanbu", // Typo
    "Anakra", // Typo
    "123",
    "",
  ];

  test.each(invalidCities)("should reject city: %s", (city) => {
    const address = { ...validAddress, city };
    const result = validateAddress(address);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("ADDRESS_INVALID_CITY");
  });
});
```

**Expected Result:** All invalid cities rejected

---

### Test Case 8: Address Normalization

```typescript
describe("Address Normalization", () => {
  const testCases = [
    {
      input: { street: "  atatürk cad.  " },
      expected: { street: "Atatürk Cadde" },
    },
    {
      input: { neighborhood: "çankaya mah" },
      expected: { neighborhood: "Çankaya Mahalle" },
    },
    {
      input: { buildingNo: "  123A  " },
      expected: { buildingNo: "123A" },
    },
    {
      input: { postalCode: "06-100" },
      expected: { postalCode: "06100" },
    },
  ];

  test.each(testCases)("normalizes $input.street", ({ input, expected }) => {
    const result = normalizeAddress(input);
    expect(result).toMatchObject(expected);
  });
});
```

**Expected Result:** All fields normalized correctly

---

## 🔍 Duplicate Detection Tests

### Test Case 9: Exact Phone Duplicates

```typescript
describe("Duplicate Detection - Exact Phone", () => {
  const records = [
    { id: "1", phone: "05551234567", name: "Ali Yılmaz" },
    { id: "2", phone: "05551234567", name: "Ali Yilmaz" },
    { id: "3", phone: "+90 555 123 45 67", name: "Ali YILMAZ" },
  ];

  test("should detect exact phone duplicates", () => {
    const duplicates = detectPhoneDuplicates(records);

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].records).toHaveLength(3);
    expect(duplicates[0].level).toBe(DuplicateLevel.EXACT);
  });
});
```

**Expected Result:** All 3 records identified as duplicates

---

### Test Case 10: Similar Address Detection

```typescript
describe("Duplicate Detection - Similar Address", () => {
  const addresses = [
    {
      id: "1",
      street: "Atatürk Caddesi",
      buildingNo: "123",
      neighborhood: "Çankaya Mahallesi",
      district: "Çankaya",
      city: "Ankara",
    },
    {
      id: "2",
      street: "Atatürk Cad.",
      buildingNo: "123",
      neighborhood: "Çankaya Mah.",
      district: "Çankaya",
      city: "Ankara",
    },
    {
      id: "3",
      street: "Atatürk Caddesi",
      buildingNo: "125", // Different building
      neighborhood: "Çankaya Mahallesi",
      district: "Çankaya",
      city: "Ankara",
    },
  ];

  test("should detect high similarity addresses", () => {
    const duplicates = detectAddressDuplicates(addresses);

    const highSimilarity = duplicates.filter((d) => d.similarity > 0.9);
    expect(highSimilarity).toHaveLength(1);
    expect(highSimilarity[0].addresses).toContain(addresses[0]);
    expect(highSimilarity[0].addresses).toContain(addresses[1]);
  });

  test("should detect medium similarity addresses", () => {
    const duplicates = detectAddressDuplicates(addresses);

    const mediumSimilarity = duplicates.filter(
      (d) => d.similarity >= 0.7 && d.similarity <= 0.9,
    );
    expect(mediumSimilarity.length).toBeGreaterThan(0);
  });
});
```

**Expected Result:** Addresses 1 & 2 are high similarity, 1 & 3 are medium

---

## 🧹 Data Cleaning Tests

### Test Case 11: String Cleaning

```typescript
describe("Data Cleaning - Strings", () => {
  const testCases = [
    {
      input: "  Multiple   Spaces  ",
      expected: "Multiple Spaces",
    },
    {
      input: "Line\nBreak\rTest",
      expected: "Line Break Test",
    },
    {
      input: "Tab\tSeparated",
      expected: "Tab Separated",
    },
    {
      input: "\x00Null\x00Bytes\x00",
      expected: "NullBytes",
    },
  ];

  test.each(testCases)(
    'cleans "$input" to "$expected"',
    ({ input, expected }) => {
      const result = cleanString(input);
      expect(result).toBe(expected);
    },
  );
});
```

**Expected Result:** All strings cleaned properly

---

### Test Case 12: Turkish Character Encoding

```typescript
describe("Data Cleaning - Turkish Characters", () => {
  const testCases = [
    { input: "Ä±", expected: "ı" },
    { input: "Ä°", expected: "İ" },
    { input: "ÅŸ", expected: "ş" },
    { input: "Åž", expected: "Ş" },
    { input: "Ã§", expected: "ç" },
    { input: "Ã‡", expected: "Ç" },
  ];

  test.each(testCases)(
    "fixes encoding: $input → $expected",
    ({ input, expected }) => {
      const result = fixEncoding(input);
      expect(result).toBe(expected);
    },
  );
});
```

**Expected Result:** All encoding issues fixed

---

## ⚠️ Error Handling Tests

### Test Case 13: Error Classification

```typescript
describe("Error Handling - Classification", () => {
  test("should classify critical errors", () => {
    const error = {
      field: "phone",
      value: "invalid",
      message: "Invalid phone format",
    };

    const classified = classifyError(error);
    expect(classified.type).toBe(ValidationErrorType.CRITICAL);
  });

  test("should classify warnings", () => {
    const error = {
      field: "postalCode",
      value: null,
      message: "Missing postal code",
    };

    const classified = classifyError(error);
    expect(classified.type).toBe(ValidationErrorType.WARNING);
  });
});
```

**Expected Result:** Errors classified correctly

---

### Test Case 14: Error Rate Threshold

```typescript
describe("Error Handling - Threshold", () => {
  test("should trigger rollback when error rate > 10%", async () => {
    const records = generateTestRecords(100);
    // Make 15 records invalid
    records.slice(0, 15).forEach((r) => (r.phone = "invalid"));

    const result = await migrateWithRollback(records);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Error rate exceeded 10%");
    expect(result.stats.errors).toBeGreaterThan(10);
  });

  test("should continue when error rate < 10%", async () => {
    const records = generateTestRecords(100);
    // Make 5 records invalid
    records.slice(0, 5).forEach((r) => (r.phone = "invalid"));

    const result = await migrateWithRollback(records);

    expect(result.success).toBe(true);
    expect(result.stats.errors).toBeLessThanOrEqual(10);
  });
});
```

**Expected Result:** Rollback triggered at 10% threshold

---

## 🔄 Rollback Tests

### Test Case 15: Successful Rollback

```typescript
describe("Rollback - Success", () => {
  test("should restore data after failed migration", async () => {
    // Get initial count
    const initialCount = await prisma.customer.count();

    // Create backup
    const backupId = await createBackupPoint();

    // Attempt migration with invalid data
    const records = generateInvalidRecords(50);
    await migrateWithRollback(records);

    // Verify rollback
    const finalCount = await prisma.customer.count();
    expect(finalCount).toBe(initialCount);
  });
});
```

**Expected Result:** Data restored to pre-migration state

---

### Test Case 16: Verification Checks

```typescript
describe("Verification - Post-Migration", () => {
  test("should pass all verification checks", async () => {
    const records = generateValidRecords(100);
    await migrateWithRollback(records);

    const verification = await verifyMigration(100);

    expect(verification.success).toBe(true);
    expect(verification.checks.every((c) => c.passed)).toBe(true);
  });

  test("should fail verification with invalid data", async () => {
    const records = generateValidRecords(100);
    // Manually insert invalid record
    await prisma.customer.create({
      data: { phone: "invalid", name: "Test" },
    });

    const verification = await verifyMigration(100);

    expect(verification.success).toBe(false);
    const phoneCheck = verification.checks.find(
      (c) => c.name === "Phone Format",
    );
    expect(phoneCheck.passed).toBe(false);
  });
});
```

**Expected Result:** Verification detects data quality issues

---

## 📊 Performance Tests

### Test Case 17: Batch Processing Performance

```typescript
describe("Performance - Batch Processing", () => {
  test("should process 1000 records in < 30 seconds", async () => {
    const records = generateValidRecords(1000);
    const startTime = Date.now();

    await migrateWithRollback(records, 100);

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(30000);
  });

  test("should maintain consistent speed across batches", async () => {
    const records = generateValidRecords(500);
    const batchTimes: number[] = [];

    for (let i = 0; i < records.length; i += 100) {
      const batch = records.slice(i, i + 100);
      const start = Date.now();
      await processBatch(batch);
      batchTimes.push(Date.now() - start);
    }

    const avgTime = batchTimes.reduce((a, b) => a + b) / batchTimes.length;
    const variance = batchTimes.every(
      (t) => Math.abs(t - avgTime) < avgTime * 0.5,
    );

    expect(variance).toBe(true);
  });
});
```

**Expected Result:** Consistent performance across batches

---

## 🎯 Integration Tests

### Test Case 18: End-to-End Migration

```typescript
describe("Integration - Full Migration", () => {
  test("should complete full migration successfully", async () => {
    // Load real test data
    const records = await loadFromAccessDB("test_customers.mdb");

    // Run migration
    const result = await migrateWithRollback(records);

    // Verify results
    expect(result.success).toBe(true);
    expect(result.stats.success).toBeGreaterThan(records.length * 0.9);

    // Verify data quality
    const verification = await verifyMigration(records.length);
    expect(verification.success).toBe(true);

    // Test application functionality
    const customer = await prisma.customer.findFirst();
    expect(customer).toBeDefined();
    expect(customer.phone).toMatch(/^0\d{10}$/);
  });
});
```

**Expected Result:** Complete migration with >90% success rate
