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

# Tüm müşterileri çek
musteri_df = pd.read_sql("SELECT * FROM musteri", conn)

# Turkay veya Demirhan içerenleri filtrele
turkay_musteriler = musteri_df[
    musteri_df['ad'].str.lower().str.contains('turkay|demirhan', na=False)
]

print(f"Toplam {len(turkay_musteriler)} müşteri bulundu:\n")

# Musteri tablosu kolonlarını göster
print("Musteri tablosu kolonları:", musteri_df.columns.tolist())
print()

for _, musteri in turkay_musteriler.iterrows():
    musid = musteri['musid']
    ad = musteri.get('ad', musteri.get('isim', 'N/A'))
    
    # Kod varsa al, yoksa musid kullan
    kod = musteri.get('kod', musteri.get('musteriKod', f'ID-{musid}'))
    
    # Bu müşterinin satışları
    satis_df = pd.read_sql(f"SELECT * FROM satis WHERE musid = {musid}", conn)
    satis_count = len(satis_df)
    satis_total = satis_df['tutar'].sum() if not satis_df.empty else 0
    
    # Bu müşterinin tahsilatları
    tahsilat_df = pd.read_sql(f"SELECT * FROM musteritahsilat WHERE musid = {musid}", conn)
    tahsilat_count = len(tahsilat_df)
    
    # Tahsilat kolonlarını kontrol et
    if not tahsilat_df.empty:
        # tutar, miktar, veya amount gibi kolonları ara
        tutar_col = None
        for col in ['tutar', 'miktar', 'amount', 'odeme']:
            if col in tahsilat_df.columns:
                tutar_col = col
                break
        tahsilat_total = tahsilat_df[tutar_col].sum() if tutar_col else 0
    else:
        tahsilat_total = 0
    
    bakiye = satis_total - tahsilat_total
    
    print(f"MDB ID: {musid}")
    print(f"İsim: {ad}")
    print(f"Kod: {kod}")
    print(f"Satışlar: {satis_count} adet - {satis_total:,.2f} TL")
    print(f"Tahsilatlar: {tahsilat_count} adet - {tahsilat_total:,.2f} TL")
    print(f"Bakiye: {bakiye:,.2f} TL")
    print("-" * 60)

conn.close()
