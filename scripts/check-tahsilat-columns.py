import pyodbc
import pandas as pd

# MDB bağlantısı
mdb_path = r"D:\VTCLN\pm.mdb"
conn_str = (
    r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};"
    f"DBQ={mdb_path};"
)

conn = pyodbc.connect(conn_str)

# Tahsilat tablosu kolonlarını göster
tahsilat_df = pd.read_sql("SELECT TOP 5 * FROM musteritahsilat", conn)

print("=== MUSTERITAHSILAT TABLOSU KOLONLARI ===\n")
print(tahsilat_df.columns.tolist())
print("\nİlk 5 kayıt:")
print(tahsilat_df)

# Turkay DEMIRHAN (musid=64) tahsilatları
turkay_tahsilat = pd.read_sql("SELECT * FROM musteritahsilat WHERE musid = 64", conn)

print(f"\n=== TURKAY DEMIRHAN (musid=64) TAHSİLATLARI ===\n")
print(f"Toplam {len(turkay_tahsilat)} tahsilat")
print("\nKolonlar:", turkay_tahsilat.columns.tolist())

if not turkay_tahsilat.empty:
    print("\nİlk 10 tahsilat:")
    print(turkay_tahsilat.head(10))
    
    # Tüm sayısal kolonların toplamını göster
    for col in turkay_tahsilat.columns:
        if turkay_tahsilat[col].dtype in ['int64', 'float64']:
            total = turkay_tahsilat[col].sum()
            print(f"\n{col} toplamı: {total:,.2f}")

conn.close()
