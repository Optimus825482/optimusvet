import pyodbc
import pandas as pd

# MDB bağlantısı
mdb_path = r"D:\VTCLN\pm.mdb"
conn_str = (
    r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};"
    f"DBQ={mdb_path};"
)

conn = pyodbc.connect(conn_str)

print("=== MDB'DE TURKAY DEMIRHAN KAYITLARI ===\n")

# Müşteriyi bul
musteri_query = """
    SELECT musid, ad, kod
    FROM musteri
    WHERE ad LIKE '*turkay*' OR ad LIKE '*demirhan*'
"""

musteri_df = pd.read_sql(musteri_query, conn)

if musteri_df.empty:
    print("❌ Müşteri bulunamadı!")
    conn.close()
    exit()

print("Müşteri Bilgileri:")
print(musteri_df)
print()

musid = musteri_df.iloc[0]['musid']

# Bu müşterinin satışları
satis_query = f"""
    SELECT satisid, tarih, tutar
    FROM satis
    WHERE musid = {musid}
    ORDER BY tarih
"""

satis_df = pd.read_sql(satis_query, conn)

print(f"=== SATIŞLAR ({len(satis_df)} adet) ===")
print(f"Toplam Tutar: {satis_df['tutar'].sum():,.2f} TL\n")

print("İlk 10 Satış:")
print(satis_df.head(10))

print("\nSon 10 Satış:")
print(satis_df.tail(10))

# Bu müşterinin tahsilatları
tahsilat_query = f"""
    SELECT tahid, tarih, tutar
    FROM musteritahsilat
    WHERE musid = {musid}
    ORDER BY tarih
"""

tahsilat_df = pd.read_sql(tahsilat_query, conn)

print(f"\n=== TAHSİLATLAR ({len(tahsilat_df)} adet) ===")
print(f"Toplam Tutar: {tahsilat_df['tutar'].sum():,.2f} TL\n")

print("Tüm Tahsilatlar:")
print(tahsilat_df)

# Hesap özeti
total_sales = satis_df['tutar'].sum()
total_payments = tahsilat_df['tutar'].sum()
balance = total_sales - total_payments

print("\n=== HESAP ÖZETİ (MDB) ===")
print(f"Toplam Satış: {total_sales:,.2f} TL")
print(f"Toplam Tahsilat: {total_payments:,.2f} TL")
print(f"Bakiye: {balance:,.2f} TL")

conn.close()
