-- Admin user oluşturma SQL script'i
-- Production veritabanında çalıştırılacak

-- Önce mevcut admin user'ı kontrol et
DO $$
DECLARE
    user_exists BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM users WHERE email = 'admin@optimusvet.com') INTO user_exists;
    
    IF user_exists THEN
        RAISE NOTICE 'Admin user zaten mevcut. Şifre güncelleniyor...';
        
        -- Şifreyi güncelle (admin123 -> bcrypt hash)
        UPDATE users 
        SET password = '$2a$10$YourBcryptHashHere',
            "updatedAt" = NOW()
        WHERE email = 'admin@optimusvet.com';
        
        RAISE NOTICE 'Admin şifresi güncellendi!';
    ELSE
        RAISE NOTICE 'Admin user oluşturuluyor...';
        
        -- Yeni admin user oluştur
        INSERT INTO users (id, name, email, password, role, "createdAt", "updatedAt")
        VALUES (
            gen_random_uuid(),
            'Admin',
            'admin@optimusvet.com',
            '$2a$10$YourBcryptHashHere',  -- admin123 hash'i
            'ADMIN',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Admin user oluşturuldu!';
    END IF;
END $$;

-- Doğrulama
SELECT id, email, name, role, "createdAt" 
FROM users 
WHERE email = 'admin@optimusvet.com';
