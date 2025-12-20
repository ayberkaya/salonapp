# Vercel Cron Job Kurulumu

## Cron Job Nedir?

Cron job, belirli zamanlarda otomatik olarak çalışan görevlerdir. Bizim durumumuzda:
- **Zamanlanmış kampanyalar**: Her 5 dakikada bir kontrol edilir ve gönderilmesi gereken kampanyalar gönderilir
- **Doğum günü kampanyaları**: Her gün sabah 9'da çalışır ve o gün doğum günü olan müşterilere otomatik mesaj gönderir

## Kurulum Adımları

### 1. vercel.json Dosyası Oluşturuldu ✅

Proje kök dizininde `vercel.json` dosyası oluşturuldu. Bu dosya Vercel'e hangi endpoint'lerin ne zaman çalışacağını söyler.

### 2. Vercel Dashboard'da Cron Job'ları Aktifleştirme

#### Adım 1: Vercel'e Git
1. [vercel.com](https://vercel.com) adresine git
2. Projeni seç

#### Adım 2: Cron Jobs Ayarlarına Git
1. Proje sayfasında **Settings** (Ayarlar) sekmesine tıkla
2. Sol menüden **Cron Jobs** seçeneğine tıkla

#### Adım 3: Cron Job'ları Kontrol Et
`vercel.json` dosyasını deploy ettikten sonra, Vercel otomatik olarak cron job'ları algılayacak ve şu şekilde görünecek:

- **Send Scheduled Campaigns**: Her 5 dakikada bir çalışır (`*/5 * * * *`)
- **Auto Birthday Campaigns**: Her gün sabah 9'da çalışır (`0 9 * * *`)

### 3. Cron Schedule Formatı Açıklaması

Cron schedule formatı: `dakika saat gün ay haftanın-günü`

Örnekler:
- `*/5 * * * *` = Her 5 dakikada bir
- `0 9 * * *` = Her gün saat 9:00'da
- `0 */6 * * *` = Her 6 saatte bir
- `0 0 * * *` = Her gün gece yarısı
- `0 9 * * 1` = Her Pazartesi saat 9:00'da

### 4. Test Etme

#### Yerel Test (Manuel)
Cron job'ları manuel olarak test etmek için:

```bash
# Terminal'de proje dizininde:
curl http://localhost:3000/api/campaigns/send-scheduled
curl http://localhost:3000/api/campaigns/auto-birthday
```

#### Production Test
Deploy sonrası Vercel Dashboard'dan:
1. **Cron Jobs** sayfasına git
2. Her cron job'ın yanında **"Run Now"** butonu var
3. Bu butona tıklayarak manuel olarak çalıştırabilirsin

### 5. Logları İzleme

Cron job'ların çalışıp çalışmadığını kontrol etmek için:

1. Vercel Dashboard → **Deployments** sekmesi
2. Son deployment'ı seç
3. **Functions** sekmesine git
4. Cron job endpoint'lerini görüntüle
5. Logları kontrol et

## Önemli Notlar

⚠️ **Ücretsiz Plan Sınırlamaları:**
- Vercel'in ücretsiz planında cron job'lar sınırlıdır
- Pro plan'da daha fazla esneklik vardır

⚠️ **API Endpoint Güvenliği:**
- Şu anda cron job endpoint'leri herkese açık (GET isteği ile çalışıyor)
- Production'da güvenlik için secret token eklemen önerilir:

```typescript
// app/api/campaigns/send-scheduled/route.ts
export async function GET(request: Request) {
  // Secret token kontrolü ekle
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... geri kalan kod
}
```

Sonra `.env.local` dosyasına ekle:
```
CRON_SECRET=your-secret-token-here
```

Ve Vercel Dashboard → Settings → Environment Variables'a ekle.

## Alternatif: Manuel Tetikleme

Eğer Vercel cron job kullanmak istemezsen, kampanyalar sayfasından manuel olarak da tetikleyebilirsin. Ancak otomatik kampanyalar için cron job şarttır.

## Sorun Giderme

**Cron job çalışmıyor:**
1. `vercel.json` dosyasının proje kök dizininde olduğundan emin ol
2. Deploy'un başarılı olduğundan emin ol
3. Vercel Dashboard'da cron job'ların aktif olduğunu kontrol et
4. Logları kontrol et

**API hatası alıyorsun:**
1. Supabase bağlantısını kontrol et
2. Environment variable'ların doğru olduğundan emin ol
3. RLS politikalarının doğru olduğundan emin ol

