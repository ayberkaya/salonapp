# Hızlı Kurulum Rehberi

Giriş yapamıyorsanız, muhtemelen `profiles` tablosunda kaydınız yok. Şu adımları izleyin:

## Adım 1: Database Schema'yı Çalıştırın

1. Supabase Dashboard'a gidin: https://supabase.com/dashboard/project/mnnojeqqkmvogltrhmin
2. Sol menüden **SQL Editor**'a tıklayın
3. **New Query** butonuna tıklayın
4. `supabase/schema.sql` dosyasının tüm içeriğini kopyalayın
5. SQL Editor'a yapıştırın
6. **Run** butonuna tıklayın (veya Cmd/Ctrl + Enter)

## Adım 2: Salon Oluşturun

1. Sol menüden **Table Editor** > **salons**'a gidin
2. **Insert** > **Insert row** butonuna tıklayın
3. Şunu girin:
   - **name**: `Kuaför Sadakat`
4. **Save** butonuna tıklayın
5. **Salon ID'yi kopyalayın** (profiles için gerekecek)

## Adım 3: User ID'nizi Bulun

1. Sol menüden **Authentication** > **Users**'a gidin
2. `owner@salon.com` kullanıcısına tıklayın
3. **User UID** değerini kopyalayın (uzun bir UUID)

## Adım 4: Profile Oluşturun

1. **Table Editor** > **profiles**'a gidin
2. **Insert** > **Insert row** butonuna tıklayın
3. Şu değerleri girin:
   - **id**: `[Adım 3'te kopyaladığınız User UID]`
   - **salon_id**: `[Adım 2'de kopyaladığınız Salon ID]`
   - **full_name**: `Salon Owner`
   - **role**: `OWNER` (dropdown'dan seçin)
4. **Save** butonuna tıklayın

## Alternatif: SQL ile Hızlı Kurulum

SQL Editor'da şu sorguyu çalıştırabilirsiniz (USER_ID_OWNER'ı gerçek User UID ile değiştirin):

```sql
-- Salon oluştur (yoksa)
INSERT INTO salons (name)
VALUES ('Kuaför Sadakat')
ON CONFLICT DO NOTHING;

-- Profile oluştur (USER_ID_OWNER'ı değiştirin!)
INSERT INTO profiles (id, salon_id, full_name, role)
VALUES (
  'USER_ID_OWNER',  -- Buraya User UID'yi yapıştırın
  (SELECT id FROM salons WHERE name = 'Kuaför Sadakat' LIMIT 1),
  'Salon Owner',
  'OWNER'
)
ON CONFLICT (id) DO UPDATE SET
  salon_id = EXCLUDED.salon_id,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;
```

## Test Edin

1. Tarayıcıda http://localhost:3000/login adresine gidin
2. Şununla giriş yapın:
   - Email: `owner@salon.com`
   - Password: `owner123`

Artık giriş yapabilmelisiniz! 🎉

## Sorun Giderme

**"Profile not found" hatası alıyorsanız:**
- User UID'nin doğru kopyalandığından emin olun
- Profile'ın `salon_id`'sinin doğru olduğunu kontrol edin
- Browser console'da hata var mı bakın

**"Table does not exist" hatası alıyorsanız:**
- Adım 1'deki schema.sql dosyasını çalıştırdığınızdan emin olun
- Supabase Dashboard'da tabloların oluşturulduğunu kontrol edin

