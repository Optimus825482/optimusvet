import pyodbc
import pandas as pd

# MDB bağlantısı
mdb_path = r"D:\VTCLN\pm.mdb"
conn_str = (
    r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};"
    f"DBQ={mdb_path};"
)

conn = pyodbc.connect(conn_str)

print("=== MDB'DE TURKAY/DEMIRHAN MÜŞTERİLERİ ===\n")

# Tüm müşterileri çek, Python'da filtrele
musteri_query = """
    SELECT musid, [ad], kod
    FROM musteri
"""

cur = conn.cursor()
cur.execute(musteri_query)
tum_musteriler = cur.fetchall()

# Turkay veya Demirhan içerenleri filtrele
musteriler = [
    (musid, ad, kod) for musid, ad, kod in tum_musteriler
    if ad and ('turkay' in ad.lower() or 'demirhan' in ad.lower())
]

print(f"Toplam {len(musteriler)} müşteri bulundu:\n")

for musid, ad, kod in musteriler:
    # Bu müşterinin satışları
    satis_query = f"""
        SELECT COUNT(*), SUM(tutar)
        FROM satis
        WHERE musid = {musid}
    """
    
    cur.execute(satis_query)
    satis_count, satis_total = cur.fetchone()
    
    # Bu müşterinin tahsilatları
    tahsilat_query = f"""
        SELECT COUNT(*), SUM(tutar)
        FROM musteritahsilat
        WHERE musid = {musid}
    """
    
    cur.execute(tahsilat_query)
    tahsilat_count, tahsilat_total = cur.fetchone()
    
    bakiye = (satis_total or 0) - (tahsilat_total or 0)
    
    print(f"MDB ID: {musid}")
    print(f"İsim: {ad}")
    print(f"Kod: {kod}")
    print(f"Satışlar: {satis_count} adet - {satis_total or 0:,.2f} TL")
    print(f"Tahsilatlar: {tahsilat_count} adet - {tahsilat_total or 0:,.2f} TL")
    print(f"Bakiye: {bakiye:,.2f} TL")
    print("-" * 60)

conn.close()
