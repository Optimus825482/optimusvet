import pandas as pd
from sqlalchemy import create_engine, text
import os
from datetime import datetime
import uuid

# Database URL from .env
DATABASE_URL = "postgresql://postgres:518518Erkan@localhost:5432/optimusvet"
EXCEL_PATH = "D:/VTCLN/"

engine = create_engine(DATABASE_URL)

def generate_cuid():
    # CUID mimic (simple uuid for now, cuid is just a string)
    return str(uuid.uuid4())

def clamp(val, max_val):
    try:
        fval = float(val) if pd.notnull(val) else 0.0
        return min(fval, max_val)
    except:
        return 0.0

def read_excel(filename):
    path = os.path.join(EXCEL_PATH, filename)
    if os.path.exists(path):
        return pd.read_excel(path).where(pd.notnull, None)
    return None

def main():
    print("🚀 Veri aktarımı (Python) başlıyor...")
    
    with engine.connect() as conn:
        # 0. Get a default user (Admin)
        user_res = conn.execute(text("SELECT id FROM users LIMIT 1")).fetchone()
        if not user_res:
            print("❌ Kullanıcı bulunamadı!")
            return
        user_id = user_res[0]

        # Maps for ID linking
        category_map = {}
        customer_map = {}
        supplier_map = {}
        product_map = {}
        sale_map = {}
        purchase_map = {}

        # 1. Categories
        print("📈 Kategoriler...")
        df_cat = read_excel("stokgrup.xlsx")
        if df_cat is not None:
            for _, row in df_cat.iterrows():
                id = generate_cuid()
                conn.execute(text("INSERT INTO product_categories (id, name, \"createdAt\") VALUES (:id, :name, :now)"),
                           {"id": id, "name": row['grup'], "now": datetime.now()})
                category_map[row['grupid']] = id

        # 2. Customers
        print("👥 Müşteriler...")
        df_cust = read_excel("musteri.xlsx")
        if df_cust is not None:
            for i, row in df_cust.iterrows():
                id = generate_cuid()
                name = row['ad'] if pd.notnull(row['ad']) else (row['unvan'] if pd.notnull(row['unvan']) else "İsimsiz Müşteri")
                conn.execute(text("""
                    INSERT INTO customers (id, code, name, phone, address, \"taxNumber\", \"taxOffice\", notes, \"createdAt\", \"updatedAt\")
                    VALUES (:id, :code, :name, :phone, :address, :taxNumber, :taxOffice, :notes, :now, :now)
                """), {
                    "id": id, "code": f"MUS-{i+1:03d}", "name": str(name),
                    "phone": str(row['tel']) if row['tel'] else None,
                    "address": str(row['ililce']) + " " + str(row['adres']) if row['ililce'] else str(row['adres']),
                    "taxNumber": str(row['vergino']) if row['vergino'] else None,
                    "taxOffice": str(row['vergidaire']) if row['vergidaire'] else None,
                    "notes": f"Eski ID: {row['musid']}",
                    "now": datetime.now()
                })
                customer_map[row['musid']] = id

        # 3. Suppliers
        print("🏢 Tedarikçiler...")
        df_supp = read_excel("firma.xlsx")
        if df_supp is not None:
            for i, row in df_supp.iterrows():
                id = generate_cuid()
                name = row['ad'] if pd.notnull(row['ad']) else (row['unvan'] if pd.notnull(row['unvan']) else "İsimsiz Firma")
                conn.execute(text("""
                    INSERT INTO suppliers (id, code, name, phone, address, \"taxNumber\", \"taxOffice\", notes, \"createdAt\", \"updatedAt\")
                    VALUES (:id, :code, :name, :phone, :address, :taxNumber, :taxOffice, :notes, :now, :now)
                """), {
                    "id": id, "code": f"TED-{i+1:03d}", "name": str(name),
                    "phone": str(row['tel']) if row['tel'] else None,
                    "address": str(row['ililce']) + " " + str(row['adres']) if row['ililce'] else str(row['adres']),
                    "taxNumber": str(row['vergino']) if row['vergino'] else None,
                    "taxOffice": str(row['vergidaire']) if row['vergidaire'] else None,
                    "notes": f"Eski ID: {row['firid']}",
                    "now": datetime.now()
                })
                supplier_map[row['firid']] = id

        # 4. Products
        print("📦 Ürünler...")
        df_prod = read_excel("urunler.xlsx")
        if df_prod is not None:
            for i, row in df_prod.iterrows():
                id = generate_cuid()
                conn.execute(text("""
                    INSERT INTO products (id, code, name, barcode, \"categoryId\", unit, \"purchasePrice\", \"salePrice\", \"vatRate\", stock, \"criticalLevel\", description, \"createdAt\", \"updatedAt\")
                    VALUES (:id, :code, :name, :barcode, :catId, :unit, :pPrice, :sPrice, :vat, :stock, :crit, :desc, :now, :now)
                """), {
                    "id": id, "code": str(row['stokkodu']) if pd.notnull(row['stokkodu']) else f"URN-{i+1:03d}",
                    "name": str(row['urun']), "barcode": str(row['barkod']) if 'barkod' in row and pd.notnull(row['barkod']) else None,
                    "catId": category_map.get(row['stokgrubu']), "unit": "Adet",
                    "pPrice": clamp(row.get('alisfiyat'), 999999999.99),
                    "sPrice": clamp(row['satisfiyat'], 999999999.99),
                    "vat": clamp(row['kdv'], 100),
                    "stock": clamp(row['stokmiktar'], 9999999.999),
                    "crit": clamp(row['stoklimit'], 9999999.999), "desc": f"Eski ID: {row['urunid']}", "now": datetime.now()
                })
                product_map[row['urunid']] = id

        # 5. Sales
        print("💰 Satışlar...")
        df_sale = read_excel("satis.xlsx")
        if df_sale is not None:
            for _, row in df_sale.iterrows():
                id = generate_cuid()
                conn.execute(text("""
                    INSERT INTO transactions (id, code, type, \"customerId\", \"userId\", date, subtotal, \"vatTotal\", discount, total, \"paidAmount\", status, notes, \"createdAt\", \"updatedAt\")
                    VALUES (:id, :code, :type, :custId, :userId, :date, :sub, :vat, :disc, :total, :paid, :status, :notes, :now, :now)
                """), {
                    "id": id, "code": str(row['fno']) if pd.notnull(row['fno']) else f"SAT-{row['satisid']}",
                    "type": "SALE", "custId": customer_map.get(row['musid']), "userId": user_id,
                    "date": pd.to_datetime(row['tarih']) if pd.notnull(row['tarih']) else datetime.now(),
                    "sub": clamp(row['tutar'], 999999999.99), "vat": 0, "disc": 0, "total": clamp(row['tutar'], 999999999.99),
                    "paid": clamp(row['tutar'], 999999999.99), "status": "PAID", "notes": f"Eski Satış ID: {row['satisid']}",
                    "now": datetime.now()
                })
                sale_map[row['satisid']] = id

        # 6. Sale Details
        print("📋 Satış detayları...")
        df_sd = read_excel("satisdetay.xlsx")
        if df_sd is not None:
            for _, row in df_sd.iterrows():
                tid = sale_map.get(row['satisid'])
                pid = product_map.get(row['urunid'])
                if tid and pid:
                    conn.execute(text("""
                        INSERT INTO transaction_items (id, \"transactionId\", \"productId\", quantity, \"unitPrice\", \"vatRate\", discount, total)
                        VALUES (:id, :tid, :pid, :qty, :price, :vat, :disc, :total)
                    """), {
                        "id": generate_cuid(), "tid": tid, "pid": pid,
                        "qty": clamp(row['adet'], 9999999.999),
                        "price": clamp(row['satisfiyat'], 999999999.99),
                        "vat": clamp(row['kdv'], 100),
                        "disc": 0, "total": clamp(row['satistutar'], 999999999.99)
                    })

        # 7. Purchases
        print("🛒 Alımlar...")
        df_pur = read_excel("alisislem.xlsx")
        if df_pur is not None:
            for _, row in df_pur.iterrows():
                id = generate_cuid()
                conn.execute(text("""
                    INSERT INTO transactions (id, code, type, \"supplierId\", \"userId\", date, subtotal, \"vatTotal\", discount, total, \"paidAmount\", status, notes, \"createdAt\", \"updatedAt\")
                    VALUES (:id, :code, :type, :suppId, :userId, :date, :sub, :vat, :disc, :total, :paid, :status, :notes, :now, :now)
                """), {
                    "id": id, "code": str(row['fno']) if pd.notnull(row['fno']) else f"ALM-{row['alisislemid']}",
                    "type": "PURCHASE", "suppId": supplier_map.get(row['firid']), "userId": user_id,
                    "date": pd.to_datetime(row['tarih']) if pd.notnull(row['tarih']) else datetime.now(),
                    "sub": clamp(row['tutar'], 999999999.99), "vat": 0, "disc": 0, "total": clamp(row['tutar'], 999999999.99),
                    "paid": clamp(row['tutar'], 999999999.99), "status": "PAID", "notes": f"Eski Alım ID: {row['alisislemid']}",
                    "now": datetime.now()
                })
                purchase_map[row['alisislemid']] = id

        # 8. Purchase Details
        print("📋 Alım detayları...")
        df_pd = read_excel("alisdetay.xlsx")
        if df_pd is not None:
            for _, row in df_pd.iterrows():
                tid = purchase_map.get(row['alisislemid'])
                pid = product_map.get(row['urunid'])
                if tid and pid:
                    conn.execute(text("""
                        INSERT INTO transaction_items (id, \"transactionId\", \"productId\", quantity, \"unitPrice\", \"vatRate\", discount, total)
                        VALUES (:id, :tid, :pid, :qty, :price, :vat, :disc, :total)
                    """), {
                        "id": generate_cuid(), "tid": tid, "pid": pid,
                        "qty": clamp(row['adet'], 9999999.999),
                        "price": clamp(row['birimfiyat'], 999999999.99),
                        "vat": clamp(row['kdv'], 100),
                        "disc": 0, "total": clamp(row['tutar'], 999999999.99)
                    })

        # 9. Tahsilatlar
        print("💸 Tahsilatlar...")
        df_ths = read_excel("musteritahsilat.xlsx")
        if df_ths is not None:
            for _, row in df_ths.iterrows():
                custId = customer_map.get(row['musid'])
                if custId:
                    conn.execute(text("""
                        INSERT INTO transactions (id, code, type, \"customerId\", \"userId\", date, total, \"paidAmount\", status, notes, \"createdAt\", \"updatedAt\", \"subtotal\", \"vatTotal\", \"discount\", \"paymentMethod\")
                        VALUES (:id, :code, :type, :custId, :userId, :date, :total, :paid, :status, :notes, :now, :now, :total, 0, 0, :method)
                    """), {
                        "id": generate_cuid(), "code": f"THS-{row['tahsilatid']}",
                        "type": "CUSTOMER_PAYMENT", "custId": custId, "userId": user_id,
                        "date": pd.to_datetime(row['tarih']) if pd.notnull(row['tarih']) else datetime.now(),
                        "total": clamp(row['odemetutar'], 999999999.99), "paid": clamp(row['odemetutar'], 999999999.99),
                        "status": "PAID", "notes": f"Eski Tahsilat ID: {row['tahsilatid']}",
                        "method": "CASH" if row['odemetur'] == "Nakit" else "CREDIT_CARD",
                        "now": datetime.now()
                    })
                    conn.execute(text("UPDATE customers SET balance = balance + :amt WHERE id = :id"),
                               {"amt": clamp(row['odemetutar'], 999999999.99), "id": custId})

        # 10. Ödemeler
        print("💸 Ödemeler...")
        df_odm = read_excel("firmaodeme.xlsx")
        if df_odm is not None:
            for _, row in df_odm.iterrows():
                suppId = supplier_map.get(row['firid'])
                if suppId:
                    conn.execute(text("""
                        INSERT INTO transactions (id, code, type, \"supplierId\", \"userId\", date, total, \"paidAmount\", status, notes, \"createdAt\", \"updatedAt\", \"subtotal\", \"vatTotal\", \"discount\", \"paymentMethod\")
                        VALUES (:id, :code, :type, :suppId, :userId, :date, :total, :paid, :status, :notes, :now, :now, :total, 0, 0, :method)
                    """), {
                        "id": generate_cuid(), "code": f"ODM-{row['firodemeid']}",
                        "type": "SUPPLIER_PAYMENT", "suppId": suppId, "userId": user_id,
                        "date": pd.to_datetime(row['tarih']) if pd.notnull(row['tarih']) else datetime.now(),
                        "total": clamp(row['odemetutar'], 999999999.99), "paid": clamp(row['odemetutar'], 999999999.99),
                        "status": "PAID", "notes": f"Eski Ödeme ID: {row['firodemeid']}",
                        "method": "CASH" if row['odemetur'] == "Nakit" else "CREDIT_CARD",
                        "now": datetime.now()
                    })
                    conn.execute(text("UPDATE suppliers SET balance = balance - :amt WHERE id = :id"),
                               {"amt": clamp(row['odemetutar'], 999999999.99), "id": suppId})

        conn.commit()
    print("✅ Aktarım başarıyla tamamlandı!")

if __name__ == "__main__":
    main()
