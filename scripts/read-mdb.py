import pyodbc
import pandas as pd

# MDB dosyası yolu
mdb_file = r"D:\VTCLN\pm.mdb"

try:
    # Access veritabanına bağlan
    conn_str = (
        r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};'
        f'DBQ={mdb_file};'
    )
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    print("=== MDB DOSYASI OKUNUYOR ===\n")
    
    # Tabloları listele
    print("📋 TABLOLAR:")
    tables = cursor.tables(tableType='TABLE')
    table_list = []
    for table in tables:
        if not table.table_name.startswith('MSys'):  # Sistem tablolarını atla
            table_list.append(table.table_name)
            print(f"   - {table.table_name}")
    
    print(f"\nToplam {len(table_list)} tablo bulundu\n")
    
    # Satis tablosu kontrolü
    if 'satis' in [t.lower() for t in table_list]:
        print("=== SATIS TABLOSU ===")
        satis_query = "SELECT * FROM satis"
        satis_df = pd.read_sql(satis_query, conn)
        print(f"Kayıt Sayısı: {len(satis_df)}")
        print(f"Kolonlar: {list(satis_df.columns)}")
        print("\nİlk 3 kayıt:")
        print(satis_df.head(3))
        print()
    
    # Satisdetay tablosu kontrolü
    if 'satisdetay' in [t.lower() for t in table_list]:
        print("=== SATISDETAY TABLOSU ===")
        satisdetay_query = "SELECT * FROM satisdetay"
        satisdetay_df = pd.read_sql(satisdetay_query, conn)
        print(f"Kayıt Sayısı: {len(satisdetay_df)}")
        print(f"Kolonlar: {list(satisdetay_df.columns)}")
        print("\nİlk 3 kayıt:")
        print(satisdetay_df.head(3))
        print()
    
    conn.close()
    print("✅ MDB dosyası başarıyla okundu!")
    
except Exception as e:
    print(f"❌ HATA: {e}")
    print("\nNot: Access Driver kurulu değilse şu adımları izle:")
    print("1. Microsoft Access Database Engine 2016 Redistributable indir")
    print("2. https://www.microsoft.com/en-us/download/details.aspx?id=54920")
