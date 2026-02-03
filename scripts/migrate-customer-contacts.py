#!/usr/bin/env python3
"""
Customer Contact Data Migration Script
======================================

Migrates phone and address data from MDB (pm.mdb) to PostgreSQL.

Features:
- Fuzzy name matching for customer identification
- Conflict resolution (existing data vs new data)
- Dry-run mode for safe testing
- Transaction safety with rollback on error
- Detailed logging and progress reporting
- Statistics and summary report

Usage:
    python migrate-customer-contacts.py --dry-run          # Test mode
    python migrate-customer-contacts.py                    # Live migration
    python migrate-customer-contacts.py --force            # Overwrite existing data
    python migrate-customer-contacts.py --match-threshold 85  # Custom matching threshold

Requirements:
    pip install pyodbc psycopg2-binary python-dotenv fuzzywuzzy python-Levenshtein
"""

import sys
import os
import argparse
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

try:
    import pyodbc
    import psycopg2
    from psycopg2.extras import RealDictCursor
    from dotenv import load_dotenv
    from fuzzywuzzy import fuzz
except ImportError as e:
    print(f"❌ Missing required package: {e}")
    print("\n📦 Install required packages:")
    print("pip install pyodbc psycopg2-binary python-dotenv fuzzywuzzy python-Levenshtein")
    sys.exit(1)


# ============================================================================
# CONFIGURATION
# ============================================================================

class ConflictStrategy(Enum):
    """Strategy for handling existing data conflicts"""
    SKIP = "skip"           # Keep existing data, skip update
    MERGE = "merge"         # Update only empty fields
    OVERWRITE = "overwrite" # Replace all data with MDB data


@dataclass
class MigrationConfig:
    """Migration configuration"""
    mdb_path: str = r"D:\VTCLN\pm.mdb"
    match_threshold: int = 85  # Fuzzy matching threshold (0-100)
    conflict_strategy: ConflictStrategy = ConflictStrategy.MERGE
    dry_run: bool = True
    log_file: str = "migration.log"
    batch_size: int = 100


@dataclass
class CustomerData:
    """Customer data from MDB"""
    musid: int
    name: str
    phone: Optional[str]
    city_district: Optional[str]
    address: Optional[str]
    tax_office: Optional[str]
    tax_number: Optional[str]


@dataclass
class MatchResult:
    """Customer matching result"""
    pg_id: str
    pg_name: str
    mdb_id: int
    mdb_name: str
    match_score: int
    existing_phone: Optional[str]
    existing_address: Optional[str]
    new_phone: Optional[str]
    new_address: Optional[str]


# ============================================================================
# LOGGING SETUP
# ============================================================================

def setup_logging(log_file: str, verbose: bool = False) -> logging.Logger:
    """Setup logging configuration"""
    logger = logging.getLogger("migration")
    logger.setLevel(logging.DEBUG if verbose else logging.INFO)
    
    # File handler
    fh = logging.FileHandler(log_file, encoding='utf-8')
    fh.setLevel(logging.DEBUG)
    
    # Console handler
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    
    # Formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    fh.setFormatter(formatter)
    ch.setFormatter(formatter)
    
    logger.addHandler(fh)
    logger.addHandler(ch)
    
    return logger


# ============================================================================
# DATABASE CONNECTIONS
# ============================================================================

class MDBConnection:
    """Microsoft Access Database connection manager"""
    
    def __init__(self, mdb_path: str, logger: logging.Logger):
        self.mdb_path = mdb_path
        self.logger = logger
        self.conn = None
        
    def __enter__(self):
        """Connect to MDB"""
        try:
            conn_str = (
                r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};'
                f'DBQ={self.mdb_path};'
            )
            self.conn = pyodbc.connect(conn_str)
            self.logger.info(f"✅ Connected to MDB: {self.mdb_path}")
            return self.conn
        except pyodbc.Error as e:
            self.logger.error(f"❌ Failed to connect to MDB: {e}")
            raise
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Close MDB connection"""
        if self.conn:
            self.conn.close()
            self.logger.info("🔌 Closed MDB connection")


class PostgreSQLConnection:
    """PostgreSQL connection manager"""
    
    def __init__(self, database_url: str, logger: logging.Logger):
        self.database_url = database_url
        self.logger = logger
        self.conn = None
        
    def __enter__(self):
        """Connect to PostgreSQL"""
        try:
            self.conn = psycopg2.connect(self.database_url)
            self.logger.info("✅ Connected to PostgreSQL")
            return self.conn
        except psycopg2.Error as e:
            self.logger.error(f"❌ Failed to connect to PostgreSQL: {e}")
            raise
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Close PostgreSQL connection"""
        if self.conn:
            self.conn.close()
            self.logger.info("🔌 Closed PostgreSQL connection")


# ============================================================================
# DATA EXTRACTION
# ============================================================================

def extract_mdb_customers(mdb_conn, logger: logging.Logger) -> List[CustomerData]:
    """Extract customer data from MDB"""
    logger.info("📥 Extracting customers from MDB...")
    
    cursor = mdb_conn.cursor()
    query = """
        SELECT 
            musid, ad, tel, ililce, adres, vergidaire, vergino
        FROM musteri
        ORDER BY musid
    """
    
    cursor.execute(query)
    customers = []
    
    for row in cursor.fetchall():
        customer = CustomerData(
            musid=row.musid,
            name=row.ad.strip() if row.ad else "",
            phone=row.tel.strip() if row.tel else None,
            city_district=row.ililce.strip() if row.ililce else None,
            address=row.adres.strip() if row.adres else None,
            tax_office=row.vergidaire.strip() if row.vergidaire else None,
            tax_number=row.vergino.strip() if row.vergino else None
        )
        customers.append(customer)
    
    logger.info(f"✅ Extracted {len(customers)} customers from MDB")
    return customers


def extract_pg_customers(pg_conn, logger: logging.Logger) -> Dict[str, dict]:
    """Extract customer data from PostgreSQL"""
    logger.info("📥 Extracting customers from PostgreSQL...")
    
    cursor = pg_conn.cursor(cursor_factory=RealDictCursor)
    query = """
        SELECT 
            id, code, "musId", name, phone, email, address, 
            city, district, "taxNumber", "taxOffice"
        FROM customers
        ORDER BY id
    """
    
    cursor.execute(query)
    customers = {}
    
    for row in cursor.fetchall():
        customers[row['id']] = dict(row)
    
    logger.info(f"✅ Extracted {len(customers)} customers from PostgreSQL")
    return customers


# ============================================================================
# FUZZY MATCHING
# ============================================================================

def normalize_name(name: str) -> str:
    """Normalize name for better matching"""
    if not name:
        return ""
    
    # Convert to uppercase
    name = name.upper()
    
    # Turkish character normalization (optional - for better matching)
    replacements = {
        'Ğ': 'G', 'Ü': 'U', 'Ş': 'S', 'İ': 'I', 'Ö': 'O', 'Ç': 'C',
        'ğ': 'g', 'ü': 'u', 'ş': 's', 'ı': 'i', 'ö': 'o', 'ç': 'c'
    }
    for old, new in replacements.items():
        name = name.replace(old, new)
    
    # Remove extra whitespace
    name = ' '.join(name.split())
    
    return name


def find_best_match(
    mdb_customer: CustomerData,
    pg_customers: Dict[str, dict],
    threshold: int,
    logger: logging.Logger
) -> Optional[Tuple[str, int]]:
    """
    Find best matching PostgreSQL customer for MDB customer
    
    Returns: (pg_customer_id, match_score) or None
    """
    mdb_name_norm = normalize_name(mdb_customer.name)
    best_match_id = None
    best_score = 0
    
    # First, try exact musId match
    for pg_id, pg_customer in pg_customers.items():
        if pg_customer.get('musId') == mdb_customer.musid:
            logger.debug(f"✅ Exact musId match: {mdb_customer.name} -> {pg_customer['name']}")
            return (pg_id, 100)
    
    # Fuzzy name matching
    for pg_id, pg_customer in pg_customers.items():
        pg_name_norm = normalize_name(pg_customer['name'])
        
        # Calculate similarity scores
        ratio = fuzz.ratio(mdb_name_norm, pg_name_norm)
        partial_ratio = fuzz.partial_ratio(mdb_name_norm, pg_name_norm)
        token_sort_ratio = fuzz.token_sort_ratio(mdb_name_norm, pg_name_norm)
        
        # Use weighted average
        score = int((ratio * 0.4) + (partial_ratio * 0.3) + (token_sort_ratio * 0.3))
        
        if score > best_score:
            best_score = score
            best_match_id = pg_id
    
    if best_score >= threshold:
        logger.debug(f"🎯 Fuzzy match ({best_score}%): {mdb_customer.name} -> {pg_customers[best_match_id]['name']}")
        return (best_match_id, best_score)
    
    logger.debug(f"❌ No match found for: {mdb_customer.name} (best score: {best_score}%)")
    return None


# ============================================================================
# CONFLICT RESOLUTION
# ============================================================================

def resolve_conflicts(
    mdb_customer: CustomerData,
    pg_customer: dict,
    strategy: ConflictStrategy,
    logger: logging.Logger
) -> Dict[str, any]:
    """
    Resolve data conflicts between MDB and PostgreSQL
    
    Returns: Dictionary of fields to update
    """
    updates = {}
    
    # Phone conflict
    pg_phone = pg_customer.get('phone')
    mdb_phone = mdb_customer.phone
    
    if mdb_phone:
        if strategy == ConflictStrategy.OVERWRITE:
            updates['phone'] = mdb_phone
        elif strategy == ConflictStrategy.MERGE:
            if not pg_phone or pg_phone.strip() == '':
                updates['phone'] = mdb_phone
        # SKIP: don't update
    
    # Address conflict
    pg_address = pg_customer.get('address')
    mdb_address = mdb_customer.address
    
    if mdb_address:
        if strategy == ConflictStrategy.OVERWRITE:
            updates['address'] = mdb_address
        elif strategy == ConflictStrategy.MERGE:
            if not pg_address or pg_address.strip() == '':
                updates['address'] = mdb_address
    
    # City/District
    pg_city = pg_customer.get('city')
    pg_district = pg_customer.get('district')
    
    if mdb_customer.city_district:
        # Parse "CITY - DISTRICT" format
        parts = mdb_customer.city_district.split('-')
        if len(parts) == 2:
            mdb_city = parts[0].strip()
            mdb_district = parts[1].strip()
            
            if strategy == ConflictStrategy.OVERWRITE:
                updates['city'] = mdb_city
                updates['district'] = mdb_district
            elif strategy == ConflictStrategy.MERGE:
                if not pg_city or pg_city.strip() == '':
                    updates['city'] = mdb_city
                if not pg_district or pg_district.strip() == '':
                    updates['district'] = mdb_district
    
    # Tax information
    if mdb_customer.tax_office:
        if strategy == ConflictStrategy.OVERWRITE:
            updates['taxOffice'] = mdb_customer.tax_office
        elif strategy == ConflictStrategy.MERGE:
            if not pg_customer.get('taxOffice'):
                updates['taxOffice'] = mdb_customer.tax_office
    
    if mdb_customer.tax_number:
        if strategy == ConflictStrategy.OVERWRITE:
            updates['taxNumber'] = mdb_customer.tax_number
        elif strategy == ConflictStrategy.MERGE:
            if not pg_customer.get('taxNumber'):
                updates['taxNumber'] = mdb_customer.tax_number
    
    return updates


# ============================================================================
# DATA MIGRATION
# ============================================================================

def migrate_customer_data(
    pg_conn,
    customer_id: str,
    updates: Dict[str, any],
    dry_run: bool,
    logger: logging.Logger
) -> bool:
    """
    Update customer data in PostgreSQL
    
    Returns: True if successful
    """
    if not updates:
        return True
    
    # Build UPDATE query
    set_clauses = []
    values = []
    
    for field, value in updates.items():
        set_clauses.append(f'"{field}" = %s')
        values.append(value)
    
    # Add updatedAt timestamp
    set_clauses.append('"updatedAt" = NOW()')
    
    query = f"""
        UPDATE customers
        SET {', '.join(set_clauses)}
        WHERE id = %s
    """
    values.append(customer_id)
    
    if dry_run:
        logger.debug(f"[DRY-RUN] Would update customer {customer_id}: {updates}")
        return True
    
    try:
        cursor = pg_conn.cursor()
        cursor.execute(query, values)
        logger.debug(f"✅ Updated customer {customer_id}")
        return True
    except psycopg2.Error as e:
        logger.error(f"❌ Failed to update customer {customer_id}: {e}")
        return False


# ============================================================================
# STATISTICS & REPORTING
# ============================================================================

@dataclass
class MigrationStats:
    """Migration statistics"""
    total_mdb_customers: int = 0
    total_pg_customers: int = 0
    matched_customers: int = 0
    unmatched_customers: int = 0
    updated_customers: int = 0
    skipped_customers: int = 0
    failed_updates: int = 0
    phone_updates: int = 0
    address_updates: int = 0
    city_updates: int = 0
    district_updates: int = 0
    tax_updates: int = 0


def print_summary(stats: MigrationStats, config: MigrationConfig, logger: logging.Logger):
    """Print migration summary"""
    logger.info("\n" + "=" * 70)
    logger.info("📊 MIGRATION SUMMARY")
    logger.info("=" * 70)
    
    logger.info(f"\n🔧 Configuration:")
    logger.info(f"  Mode: {'DRY-RUN (Test Mode)' if config.dry_run else 'LIVE MIGRATION'}")
    logger.info(f"  Match Threshold: {config.match_threshold}%")
    logger.info(f"  Conflict Strategy: {config.conflict_strategy.value}")
    logger.info(f"  MDB Path: {config.mdb_path}")
    
    logger.info(f"\n📈 Statistics:")
    logger.info(f"  MDB Customers: {stats.total_mdb_customers}")
    logger.info(f"  PostgreSQL Customers: {stats.total_pg_customers}")
    logger.info(f"  Matched: {stats.matched_customers}")
    logger.info(f"  Unmatched: {stats.unmatched_customers}")
    logger.info(f"  Updated: {stats.updated_customers}")
    logger.info(f"  Skipped: {stats.skipped_customers}")
    logger.info(f"  Failed: {stats.failed_updates}")
    
    logger.info(f"\n📝 Field Updates:")
    logger.info(f"  Phone: {stats.phone_updates}")
    logger.info(f"  Address: {stats.address_updates}")
    logger.info(f"  City: {stats.city_updates}")
    logger.info(f"  District: {stats.district_updates}")
    logger.info(f"  Tax Info: {stats.tax_updates}")
    
    success_rate = (stats.updated_customers / stats.matched_customers * 100) if stats.matched_customers > 0 else 0
    logger.info(f"\n✅ Success Rate: {success_rate:.1f}%")
    
    logger.info("=" * 70 + "\n")


def save_unmatched_report(unmatched: List[CustomerData], filename: str, logger: logging.Logger):
    """Save unmatched customers to file"""
    if not unmatched:
        return
    
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            f.write("Unmatched Customers Report\n")
            f.write("=" * 70 + "\n\n")
            f.write(f"Total unmatched: {len(unmatched)}\n\n")
            f.write("MDB ID | Customer Name | Phone | Address\n")
            f.write("-" * 70 + "\n")
            
            for customer in unmatched:
                f.write(f"{customer.musid:6d} | {customer.name:30s} | {customer.phone or 'N/A':15s} | {customer.address or 'N/A'}\n")
        
        logger.info(f"📄 Unmatched customers report saved: {filename}")
    except Exception as e:
        logger.error(f"❌ Failed to save unmatched report: {e}")


# ============================================================================
# MAIN MIGRATION LOGIC
# ============================================================================

def run_migration(config: MigrationConfig, logger: logging.Logger) -> MigrationStats:
    """Run the migration process"""
    stats = MigrationStats()
    unmatched_customers = []
    
    logger.info("🚀 Starting customer contact data migration...")
    logger.info(f"Mode: {'DRY-RUN' if config.dry_run else 'LIVE'}")
    
    # Load environment variables
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
                logger.info(f"✅ Loaded .env from: {env_path}")
                break
    
    if not database_url:
        database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        logger.error("❌ DATABASE_URL not found in .env file")
        return stats
    
    try:
        # Connect to databases
        with MDBConnection(config.mdb_path, logger) as mdb_conn, \
             PostgreSQLConnection(database_url, logger) as pg_conn:
            
            # Extract data
            mdb_customers = extract_mdb_customers(mdb_conn, logger)
            pg_customers = extract_pg_customers(pg_conn, logger)
            
            stats.total_mdb_customers = len(mdb_customers)
            stats.total_pg_customers = len(pg_customers)
            
            # Process each MDB customer
            logger.info(f"\n🔄 Processing {len(mdb_customers)} customers...")
            
            for i, mdb_customer in enumerate(mdb_customers, 1):
                if i % 100 == 0:
                    logger.info(f"Progress: {i}/{len(mdb_customers)} ({i/len(mdb_customers)*100:.1f}%)")
                
                # Find matching PostgreSQL customer
                match = find_best_match(
                    mdb_customer,
                    pg_customers,
                    config.match_threshold,
                    logger
                )
                
                if not match:
                    stats.unmatched_customers += 1
                    unmatched_customers.append(mdb_customer)
                    continue
                
                pg_id, match_score = match
                stats.matched_customers += 1
                
                # Resolve conflicts and get updates
                updates = resolve_conflicts(
                    mdb_customer,
                    pg_customers[pg_id],
                    config.conflict_strategy,
                    logger
                )
                
                if not updates:
                    stats.skipped_customers += 1
                    continue
                
                # Track field updates
                if 'phone' in updates:
                    stats.phone_updates += 1
                if 'address' in updates:
                    stats.address_updates += 1
                if 'city' in updates:
                    stats.city_updates += 1
                if 'district' in updates:
                    stats.district_updates += 1
                if 'taxOffice' in updates or 'taxNumber' in updates:
                    stats.tax_updates += 1
                
                # Migrate data
                success = migrate_customer_data(
                    pg_conn,
                    pg_id,
                    updates,
                    config.dry_run,
                    logger
                )
                
                if success:
                    stats.updated_customers += 1
                else:
                    stats.failed_updates += 1
            
            # Commit transaction (if not dry-run)
            if not config.dry_run:
                pg_conn.commit()
                logger.info("✅ Transaction committed")
            else:
                logger.info("ℹ️  Dry-run mode - no changes committed")
    
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        if 'pg_conn' in locals():
            pg_conn.rollback()
            logger.info("🔄 Transaction rolled back")
        raise
    
    # Save unmatched report
    if unmatched_customers:
        save_unmatched_report(
            unmatched_customers,
            f"unmatched_customers_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
            logger
        )
    
    return stats


# ============================================================================
# CLI INTERFACE
# ============================================================================

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Migrate customer contact data from MDB to PostgreSQL",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python migrate-customer-contacts.py --dry-run
  python migrate-customer-contacts.py --force
  python migrate-customer-contacts.py --match-threshold 90
  python migrate-customer-contacts.py --strategy overwrite
        """
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Run in test mode without making changes'
    )
    
    parser.add_argument(
        '--force',
        action='store_true',
        help='Overwrite existing data (use with caution!)'
    )
    
    parser.add_argument(
        '--match-threshold',
        type=int,
        default=85,
        help='Fuzzy matching threshold (0-100, default: 85)'
    )
    
    parser.add_argument(
        '--strategy',
        choices=['skip', 'merge', 'overwrite'],
        default='merge',
        help='Conflict resolution strategy (default: merge)'
    )
    
    parser.add_argument(
        '--mdb-path',
        default=r'D:\VTCLN\pm.mdb',
        help='Path to MDB file'
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    # Create configuration
    config = MigrationConfig(
        mdb_path=args.mdb_path,
        match_threshold=args.match_threshold,
        conflict_strategy=ConflictStrategy(args.strategy),
        dry_run=args.dry_run if not args.force else False,
        log_file=f"migration_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    )
    
    # Override strategy if force is used
    if args.force:
        config.conflict_strategy = ConflictStrategy.OVERWRITE
        print("⚠️  WARNING: Force mode enabled - will overwrite existing data!")
        response = input("Are you sure? (yes/no): ")
        if response.lower() != 'yes':
            print("❌ Migration cancelled")
            return
    
    # Setup logging
    logger = setup_logging(config.log_file, args.verbose)
    
    # Run migration
    try:
        stats = run_migration(config, logger)
        print_summary(stats, config, logger)
        
        if config.dry_run:
            print("\n💡 This was a dry-run. To perform actual migration, run without --dry-run flag")
        else:
            print("\n✅ Migration completed successfully!")
        
    except KeyboardInterrupt:
        logger.warning("\n⚠️  Migration interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\n❌ Migration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
