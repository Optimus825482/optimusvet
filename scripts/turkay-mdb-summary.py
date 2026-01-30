import pyodbc
import pandas as pd

conn = pyodbc.connect(r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=D:\VTCLN\pm.mdb;')

print("=== TURKAY DEMIRHAN (MDB ID: 64) - MDB VERİLERİ ===\n")

# Satışlar
satis_df = pd.read_sql('SELECT * FROM satis WHERE musid = 64', conn)
print(f"Satışlar: {len(satis_df)} adet")
print(f"Satış Toplamı: {satis_df['tutar'].sum():,.2f} TL\n")

# Tahsilatlar
tahsilat_df = pd.read_sql('SELECT * FROM musteritahsilat WHERE musid = 64', conn)
print(f"Tahsilatlar: {len(tahsilat_df)} adet")
print(f"Tahsilat Toplamı: {tahsilat_df['odemetutar'].sum():,.2f} TL\n")

# Bakiye
bakiye = satis_df['tutar'].sum() - tahsilat_df['odemetutar'].sum()
print(f"Hesaplanan Bakiye: {bakiye:,.2f} TL")

print("\n=== ESKİ SİSTEM RAPORU (Verdiğin) ===")
print("Toplam Borç: 68.003,00 TL")
print("Toplam Ödeme: 58.529,00 TL")
print("Bakiye: 9.474,00 TL")

print("\n=== FARKLAR ===")
print(f"Satış Farkı: {satis_df['tutar'].sum() - 68003:,.2f} TL")
print(f"Tahsilat Farkı: {tahsilat_df['odemetutar'].sum() - 58529:,.2f} TL")
print(f"Bakiye Farkı: {bakiye - 9474:,.2f} TL")

conn.close()
