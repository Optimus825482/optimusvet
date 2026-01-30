import pyodbc
import pandas as pd

mdb_conn = pyodbc.connect(r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=D:\VTCLN\pm.mdb;')

print("=== TURKAY DEMIRHAN (musid=64) - TÜM SATIŞLAR ===\n")

# Tüm satışları tarihe göre sırala
satis_df = pd.read_sql("""
    SELECT satisid, tarih, tutar 
    FROM satis 
    WHERE musid = 64 
    ORDER BY tarih, satisid
""", mdb_conn)

print(f"Toplam {len(satis_df)} satış\n")

# İlk 5 ve son 5 satış
print("İLK 5 SATIŞ:")
for idx, row in satis_df.head(5).iterrows():
    print(f"  {idx+1}. SAT-{int(row['satisid']):05d} - {row['tarih'].strftime('%d.%m.%Y')} - {row['tutar']:,.2f} TL")

print("\nSON 5 SATIŞ:")
for idx, row in satis_df.tail(5).iterrows():
    print(f"  {idx+1}. SAT-{int(row['satisid']):05d} - {row['tarih'].strftime('%d.%m.%Y')} - {row['tutar']:,.2f} TL")

# 94. ve 95. satışı özellikle göster
print("\n" + "="*60)
print("94. VE 95. SATIŞLAR:")
print("="*60)

if len(satis_df) >= 94:
    row_94 = satis_df.iloc[93]  # 0-indexed
    print(f"94. Satış: SAT-{int(row_94['satisid']):05d} - {row_94['tarih'].strftime('%d.%m.%Y')} - {row_94['tutar']:,.2f} TL")

if len(satis_df) >= 95:
    row_95 = satis_df.iloc[94]  # 0-indexed
    print(f"95. Satış: SAT-{int(row_95['satisid']):05d} - {row_95['tarih'].strftime('%d.%m.%Y')} - {row_95['tutar']:,.2f} TL")
    print(f"\n⚠️ 95. SATIŞ FAZLADAN! Bu satış eski sistemde YOK!")

# İlk 94 satışın toplamı
first_94_total = satis_df.head(94)['tutar'].sum()
print(f"\nİlk 94 satış toplamı: {first_94_total:,.2f} TL")
print(f"Eski sistem toplamı: 68.003,00 TL")
print(f"Fark: {first_94_total - 68003:,.2f} TL")

# TAHSİLATLAR
print("\n" + "="*60)
print("TAHSİLATLAR")
print("="*60 + "\n")

tahsilat_df = pd.read_sql("""
    SELECT tahsilatid, tarih, odemetutar 
    FROM musteritahsilat 
    WHERE musid = 64 
    ORDER BY tarih, tahsilatid
""", mdb_conn)

print(f"Toplam {len(tahsilat_df)} tahsilat\n")

# İlk 5 ve son 5 tahsilat
print("İLK 5 TAHSİLAT:")
for idx, row in tahsilat_df.head(5).iterrows():
    print(f"  {idx+1}. THS-{int(row['tahsilatid']):05d} - {row['tarih'].strftime('%d.%m.%Y')} - {row['odemetutar']:,.2f} TL")

print("\nSON 5 TAHSİLAT:")
for idx, row in tahsilat_df.tail(5).iterrows():
    print(f"  {idx+1}. THS-{int(row['tahsilatid']):05d} - {row['tarih'].strftime('%d.%m.%Y')} - {row['odemetutar']:,.2f} TL")

# 39. ve 40. tahsilatı özellikle göster
print("\n" + "="*60)
print("39. VE 40. TAHSİLATLAR:")
print("="*60)

if len(tahsilat_df) >= 39:
    row_39 = tahsilat_df.iloc[38]  # 0-indexed
    print(f"39. Tahsilat: THS-{int(row_39['tahsilatid']):05d} - {row_39['tarih'].strftime('%d.%m.%Y')} - {row_39['odemetutar']:,.2f} TL")

if len(tahsilat_df) >= 40:
    row_40 = tahsilat_df.iloc[39]  # 0-indexed
    print(f"40. Tahsilat: THS-{int(row_40['tahsilatid']):05d} - {row_40['tarih'].strftime('%d.%m.%Y')} - {row_40['odemetutar']:,.2f} TL")
    print(f"\n⚠️ 40. TAHSİLAT FAZLADAN! Bu tahsilat eski sistemde YOK!")

# İlk 39 tahsilatın toplamı
first_39_total = tahsilat_df.head(39)['odemetutar'].sum()
print(f"\nİlk 39 tahsilat toplamı: {first_39_total:,.2f} TL")
print(f"Eski sistem toplamı: 58.529,00 TL")
print(f"Fark: {first_39_total - 58529:,.2f} TL")

mdb_conn.close()
