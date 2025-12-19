# Supabase'de Kullanıcı Oluşturma Rehberi

"Invalid login credentials" hatası alıyorsanız, kullanıcı Supabase Authentication'da doğru oluşturulmamış olabilir.

## Adım Adım Kullanıcı Oluşturma

### 1. Supabase Dashboard'a Gidin
https://supabase.com/dashboard/project/mnnojeqqkmvogltrhmin

### 2. Authentication Bölümüne Gidin
- Sol menüden **Authentication** > **Users**'a tıklayın

### 3. Yeni Kullanıcı Oluşturun
- **Add user** butonuna tıklayın
- **Create new user** seçeneğini seçin

### 4. Kullanıcı Bilgilerini Girin

**Email:** `owner@salon.com`
**Password:** `owner123`

**ÖNEMLİ:** 
- ✅ **Auto Confirm User** seçeneğini işaretleyin (kritik!)
- ✅ **Send invitation email** seçeneğini kapatabilirsiniz (isteğe bağlı)

### 5. Kullanıcıyı Kaydedin
- **Create user** butonuna tıklayın

### 6. User UID'yi Kopyalayın
- Oluşturulan kullanıcıya tıklayın
- **User UID** değerini kopyalayın (uzun bir UUID)

### 7. Profile Oluşturun
- **Table Editor** > **profiles**'a gidin
- **Insert** > **Insert row** butonuna tıklayın
- Şu değerleri girin:
  - **id**: `[Adım 6'da kopyaladığınız User UID]`
  - **salon_id**: `[Salon ID'niz - salons tablosundan alın]`
  - **full_name**: `Salon Owner`
  - **role**: `OWNER` (dropdown'dan seçin)
- **Save** butonuna tıklayın

## Sorun Giderme

### "Invalid login credentials" hatası
- ✅ Email'in doğru yazıldığından emin olun (büyük/küçük harf duyarlı değil)
- ✅ Şifrenin doğru olduğundan emin olun
- ✅ Kullanıcının "Auto Confirm User" ile oluşturulduğunu kontrol edin
- ✅ Supabase Dashboard > Authentication > Users'da kullanıcının listede olduğunu kontrol edin

### Kullanıcıyı Sıfırlama
Eğer kullanıcı zaten varsa ama giriş yapamıyorsanız:

1. **Authentication** > **Users**'a gidin
2. Kullanıcıya tıklayın
3. **Reset password** butonuna tıklayın
4. Veya kullanıcıyı silip yeniden oluşturun

### Yeni Şifre Belirleme
1. **Authentication** > **Users**'a gidin
2. Kullanıcıya tıklayın
3. **Update user** butonuna tıklayın
4. **Password** alanını güncelleyin
5. **Save** butonuna tıklayın

## Test
1. http://localhost:3000/login adresine gidin
2. Email: `owner@salon.com`
3. Password: `owner123`
4. **Sign in** butonuna tıklayın

Başarılı olursa dashboard'a yönlendirilmelisiniz! 🎉

