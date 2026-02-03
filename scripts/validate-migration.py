#!/usr/bin/env python3
"""
Migration Validation Script
===========================

Validates the customer contact data migration results.

Features:
- Compares MDB and PostgreSQL data
- Identifies discrepancies
- Generates validation report
- Checks data quality

Usage:
    python validate-migration.py
    python validate-migration.py --detailed
    python validate-migration.py --export-csv
"""

import sys
import os
import argparse
import csv
from datetime import datetime
from typing import Dict, List, Tuple
from dataclasses import dataclass

try:
    import pyodbc
    import psycopg2
    from psycopg2.extras import RealDictCursor
    from dotenv import load_dotenv
except ImportError as e:
    print(f"❌ Missing required package: {e}")
    print("\n📦 Install required packages:")
    print("pip install pyodbc psycopg2-binary python-dotenv")
    sys.exit(1)


@dataclass
class ValidationStats:
    """Validation statistics"""
    total_pg_customers: int = 0
    customers_with_phone: int = 0
    customers_with_address: int = 0
    customers_with_city: int = 0
    customers_with_district: int = 0
    customers_with_tax_info: int = 0
    phone_format_errors: int = 0
    empty_names: int = 0
    duplicate_phones: int = 0
    recently_updated: int = 0


@dataclass
class ComparisonResult:
    """Comparison between MDB and PostgreSQL"""
    customer_id: str
    customer_name: str
    field: str
    mdb_value: str
    pg_value: str
    match: bool


def connect_mdb(mdb_path: str):
    """Connect to MDB database"""
    try:
        conn_str = (
            r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};'
            f'DBQ={mdb_path};'
        )
        return pyodbc.connect(conn_str)
    except pyodbc.Error as e:
        print(f"❌ Failed to connect to MDB: {e}")
        sys.exit(1)


def connect_postgresql(database_url: str):
    """Connect to PostgreSQL database"""
    try:
        return psycopg2.connect(database_url)
    except psycopg2.Error as e:
        print(f"❌ Failed to connect to PostgreSQL: {e}")
        sys.exit(1)


def validate_phone_format(phone: str) -> bool:
    """Validate Turkish phone number format"""
    if not phone:
        return True  # Empty is OK
    
    # Remove spaces and special characters
    phone_clean = ''.join(c for c in phone if c.isdigit())
    
    # Turkish mobile: 05XXXXXXXXX (11 digits)
    if phone_clean.startswith('05') and len(phone_clean) == 11:
        return True
    
    # Turkish landline: 0XXXXXXXXXX (10 digits)
    if phone_clean.startswith('0') and len(phone_clean) == 10:
        return True
    
    return False


def get_pg_statistics(pg_conn) -> ValidationStats:
    """Get PostgreSQL database statistics"""
    stats = ValidationStats()
    cursor = pg_conn.cursor(cursor_factory=RealDictCursor)
    
    # Total customers
    cursor.execute("SELECT COUNT(*) as count FROM customers")
    stats.total_pg_customers = cursor.fetchone()['count']
    
    # Customers with phone
    cursor.execute("SELECT COUNT(*) as count FROM customers WHERE phone IS NOT NULL AND phone != ''")
    stats.customers_with_phone = cursor.fetchone()['count']
    
    # Customers with address
    cursor.execute("SELECT COUNT(*) as count FROM customers WHERE address IS NOT NULL AND address != ''")
    stats.customers_with_address = cursor.fetchone()['count']
    
    # Customers with city
    cursor.execute("SELECT COUNT(*) as count FROM customers WHERE city IS NOT NULL AND city != ''")
    stats.customers_with_city = cursor.fetchone()['count']
    
    # Customers with district
    cursor.execute("SELECT COUNT(*) as count FROM customers WHERE district IS NOT NULL AND district != ''")
    stats.customers_with_district = cursor.fetchone()['count']
    
    # Customers with tax info
    cursor.execute("""
        SELECT COUNT(*) as count FROM customers 
        WHERE ("taxOffice" IS NOT NULL AND "taxOffice" != '') 
           OR ("taxNumber" IS NOT NULL AND "taxNumber" != '')
    """)
    stats.customers_with_tax_info = cursor.fetchone()['count']
    
    # Recently updated (last 24 hours)
    cursor.execute("""
        SELECT COUNT(*) as count FROM customers 
        WHERE "updatedAt" > NOW() - INTERVAL '24 hours'
    """)
    stats.recently_updated = cursor.fetchone()['count']
    
    # Phone format validation
    cursor.execute("SELECT phone FROM customers WHERE phone IS NOT NULL AND phone != ''")
    for row in cursor.fetchall():
        if not validate_phone_format(row['phone']):
            stats.phone_format_errors += 1
    
    # Empty names
    cursor.execute("SELECT COUNT(*) as count FROM customers WHERE name IS NULL OR name = ''")
    stats.empty_names = cursor.fetchone()['count']
    
    # Duplicate phones
    cursor.execute("""
        SELECT COUNT(*) as count FROM (
            SELECT phone FROM customers 
            WHERE phone IS NOT NULL AND phone != ''
            GROUP BY phone 
            HAVING COUNT(*) > 1
        ) as duplicates
    """)
    stats.duplicate_phones = cursor.fetchone()['count']
    
    return stats


def compare_data(mdb_conn, pg_conn, limit: int = 100) -> List[ComparisonResult]:
    """Compare sample data between MDB and PostgreSQL"""
    results = []
    
    # Get MDB data
    mdb_cursor = mdb_conn.cursor()
    mdb_cursor.execute(f"""
        SELECT TOP {limit} musid, ad, tel, adres, ililce 
        FROM musteri 
        ORDER BY musid
    """)
    mdb_data = {row.musid: row for row in mdb_cursor.fetchall()}
    
    # Get PostgreSQL data
    pg_cursor = pg_conn.cursor(cursor_factory=RealDictCursor)
    pg_cursor.execute(f"""
        SELECT id, "musId", name, phone, address, city, district
        FROM customers
        WHERE "musId" IS NOT NULL
        ORDER BY "musId"
        LIMIT {limit}
    """)
    
    for pg_row in pg_cursor.fetchall():
        mus_id = pg_row['musId']
        if mus_id not in mdb_data:
            continue
        
        mdb_row = mdb_data[mus_id]
        
        # Compare phone
        mdb_phone = mdb_row.tel.strip() if mdb_row.tel else ""
        pg_phone = pg_row['phone'] or ""
        
        if mdb_phone and pg_phone != mdb_phone:
            results.append(ComparisonResult(
                customer_id=pg_row['id'],
                customer_name=pg_row['name'],
                field='phone',
                mdb_value=mdb_phone,
                pg_value=pg_phone,
                match=False
            ))
        
        # Compare address
        mdb_address = mdb_row.adres.strip() if mdb_row.adres else ""
        pg_address = pg_row['address'] or ""
        
        if mdb_address and pg_address != mdb_address:
            results.append(ComparisonResult(
                customer_id=pg_row['id'],
                customer_name=pg_row['name'],
                field='address',
                mdb_value=mdb_address,
                pg_value=pg_address,
                match=False
            ))
    
    return results


def print_statistics(stats: ValidationStats):
    """Print validation statistics"""
    print("\n" + "=" * 70)
    print("📊 VALIDATION STATISTICS")
    print("=" * 70)
    
    print(f"\n📈 Database Overview:")
    print(f"  Total Customers: {stats.total_pg_customers:,}")
    print(f"  Recently Updated (24h): {stats.recently_updated:,}")
    
    print(f"\n📱 Contact Information:")
    print(f"  With Phone: {stats.customers_with_phone:,} ({stats.customers_with_phone/stats.total_pg_customers*100:.1f}%)")
    print(f"  With Address: {stats.customers_with_address:,} ({stats.customers_with_address/stats.total_pg_customers*100:.1f}%)")
    print(f"  With City: {stats.customers_with_city:,} ({stats.customers_with_city/stats.total_pg_customers*100:.1f}%)")
    print(f"  With District: {stats.customers_with_district:,} ({stats.customers_with_district/stats.total_pg_customers*100:.1f}%)")
    print(f"  With Tax Info: {stats.customers_with_tax_info:,} ({stats.customers_with_tax_info/stats.total_pg_customers*100:.1f}%)")
    
    print(f"\n⚠️  Data Quality Issues:")
    print(f"  Phone Format Errors: {stats.phone_format_errors}")
    print(f"  Empty Names: {stats.empty_names}")
    print(f"  Duplicate Phones: {stats.duplicate_phones}")
    
    # Overall health score
    completeness = (
        (stats.customers_with_phone / stats.total_pg_customers * 25) +
        (stats.customers_with_address / stats.total_pg_customers * 25) +
        (stats.customers_with_city / stats.total_pg_customers * 25) +
        (stats.customers_with_district / stats.total_pg_customers * 25)
    )
    
    print(f"\n✅ Data Completeness Score: {completeness:.1f}%")
    
    if completeness >= 90:
        print("   Status: Excellent ✨")
    elif completeness >= 75:
        print("   Status: Good ✅")
    elif completeness >= 50:
        print("   Status: Fair ⚠️")
    else:
        print("   Status: Needs Improvement ❌")
    
    print("=" * 70 + "\n")


def print_comparison_results(results: List[ComparisonResult]):
    """Print comparison results"""
    if not results:
        print("\n✅ All compared records match perfectly!")
        return
    
    print("\n" + "=" * 70)
    print(f"⚠️  DISCREPANCIES FOUND: {len(results)}")
    print("=" * 70)
    
    for i, result in enumerate(results[:20], 1):  # Show first 20
        print(f"\n{i}. Customer: {result.customer_name} (ID: {result.customer_id})")
        print(f"   Field: {result.field}")
        print(f"   MDB Value: {result.mdb_value}")
        print(f"   PG Value:  {result.pg_value}")
    
    if len(results) > 20:
        print(f"\n... and {len(results) - 20} more discrepancies")
    
    print("=" * 70 + "\n")


def export_to_csv(stats: ValidationStats, results: List[ComparisonResult], filename: str):
    """Export validation results to CSV"""
    try:
        with open(filename, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            
            # Statistics section
            writer.writerow(['VALIDATION STATISTICS'])
            writer.writerow(['Metric', 'Value'])
            writer.writerow(['Total Customers', stats.total_pg_customers])
            writer.writerow(['With Phone', stats.customers_with_phone])
            writer.writerow(['With Address', stats.customers_with_address])
            writer.writerow(['With City', stats.customers_with_city])
            writer.writerow(['With District', stats.customers_with_district])
            writer.writerow(['Phone Format Errors', stats.phone_format_errors])
            writer.writerow(['Empty Names', stats.empty_names])
            writer.writerow(['Duplicate Phones', stats.duplicate_phones])
            writer.writerow([])
            
            # Discrepancies section
            if results:
                writer.writerow(['DISCREPANCIES'])
                writer.writerow(['Customer ID', 'Customer Name', 'Field', 'MDB Value', 'PG Value'])
                for result in results:
                    writer.writerow([
                        result.customer_id,
                        result.customer_name,
                        result.field,
                        result.mdb_value,
                        result.pg_value
                    ])
        
        print(f"✅ Validation report exported to: {filename}")
    except Exception as e:
        print(f"❌ Failed to export CSV: {e}")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Validate customer contact data migration"
    )
    
    parser.add_argument(
        '--detailed',
        action='store_true',
        help='Show detailed comparison (slower)'
    )
    
    parser.add_argument(
        '--export-csv',
        action='store_true',
        help='Export results to CSV file'
    )
    
    parser.add_argument(
        '--mdb-path',
        default=r'D:\VTCLN\pm.mdb',
        help='Path to MDB file'
    )
    
    parser.add_argument(
        '--sample-size',
        type=int,
        default=100,
        help='Number of records to compare (default: 100)'
    )
    
    args = parser.parse_args()
    
    print("🔍 Starting migration validation...")
    
    # Load environment
    # Try multiple paths for .env file
    env_paths = [
        '../.env',  # One level up (when running from scripts/)
        'optimus-vet/.env',  # From project root
        '.env'  # Current directory
    ]
    
    database_url = None
    for env_path in env_paths:
        if os.path.exists(env_path):
            load_dotenv(env_path)
            database_url = os.getenv('DATABASE_URL')
            if database_url:
                print(f"✅ Loaded .env from: {env_path}")
                break
    
    if not database_url:
        database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("❌ DATABASE_URL not found in .env file")
        sys.exit(1)
    
    # Connect to databases
    print("📡 Connecting to databases...")
    pg_conn = connect_postgresql(database_url)
    print("✅ Connected to PostgreSQL")
    
    # Get statistics
    print("📊 Gathering statistics...")
    stats = get_pg_statistics(pg_conn)
    print_statistics(stats)
    
    # Detailed comparison
    comparison_results = []
    if args.detailed:
        print(f"🔍 Comparing {args.sample_size} sample records with MDB...")
        mdb_conn = connect_mdb(args.mdb_path)
        print("✅ Connected to MDB")
        
        comparison_results = compare_data(mdb_conn, pg_conn, args.sample_size)
        print_comparison_results(comparison_results)
        
        mdb_conn.close()
    
    # Export to CSV
    if args.export_csv:
        filename = f"validation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        export_to_csv(stats, comparison_results, filename)
    
    # Close connections
    pg_conn.close()
    
    print("✅ Validation completed!")
    
    # Exit code based on issues
    if stats.phone_format_errors > 0 or stats.empty_names > 0:
        print("\n⚠️  Warning: Data quality issues detected")
        sys.exit(1)
    else:
        print("\n✅ All validation checks passed!")
        sys.exit(0)


if __name__ == "__main__":
    main()
