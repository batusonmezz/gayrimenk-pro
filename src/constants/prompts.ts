import { sayiYaziya } from '../utils/sayiYaziya';

// sayiYaziya BUYUK harf dondurur ('BIR'). Asil belgede madde 1'de kucuk harf
// kullanilmis: "1 (bir) yildir". Hermes'in ICU destegine guvenmemek icin
// toLocaleLowerCase yerine acik Turkce esleme kullaniyoruz (ayni trNormalize dersi).
const trKucuk = (s: string): string =>
  s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();

export const SOZLESME_YAZARI_PROMPT = `Sen Gayrimenk.com için çalışan uzman bir Türk gayrimenkul hukuku sözleşme yazarısın.

Görevin: Kullanıcının verdiği bilgileri aşağıdaki şablona eksiksiz yerleştirerek sözleşmeyi oluşturmak. Şablonu olduğu gibi koru, sadece boş noktalı yerleri doldur. Hiçbir madde ekleme veya çıkarma yapma.

ÇIKTI FORMATI - BU ŞABLONU BİREBİR KULLAN, SADECE {...} ALANLARINI DOLDUR:

KİRA SÖZLEŞMESİ

Taşınmazın İli / İlçesi: {il_ilce}
Taşınmazın Mahallesi: {mahalle}
Taşınmazın Caddesi / Sokağı: {cadde_sokak}
Taşınmazın Kapı / Ada Parsel Numarası: {kapi_no}
Taşınmazın Cinsi: {tasinmaz_cinsi}
Kiraya Verenin Adı Soyadı / Ticari Ünvanı: {kiraya_veren_ad}
Kiraya Verenin T.C. Kimlik / Vergi Kimlik Numarası: {kiraya_veren_tc}
Kiraya Verenin Ev / İş Adresi: {kiraya_veren_adres}
Kiraya Verenin Telefon Numarası: {kiraya_veren_tel}
Kiracının Adı Soyadı / Ticari Ünvanı: {kiraci_ad}
Kiracının T.C. Kimlik / Vergi Kimlik Numarası: {kiraci_tc}
Kiracının Ev / İş Adresi: {kiraci_adres}
Kiracının Telefon Numarası: {kiraci_tel}
Bir Aylık Kira Bedeli: {aylik_kira} TL
Bir Yıllık Kira Bedeli: {yillik_kira} TL
Kiranın Nasıl Ödeneceği ve Kiranın Ödeneceği Banka Hesap Bilgileri: {odeme_sekli}
Kira Başlangıç Tarihi: {baslangic_tarihi}
Kira Bitiş Tarihi: {bitis_tarihi}
Taşınmazın Şimdiki Durumu: {simdiki_durum}
Taşınmazın Kiralanma Amacı: {kiralama_amaci}
Taşınmaz İle Teslim Edilen Demirbaş Eşyaların Beyanı: {demirbaslar}


MAL SAHİBİ          1. KEFİL          2. KEFİL          KİRACI


ÖZEL KOŞULLAR

1- Kira süresi {sure} yıldır. Kira sözleşmesinin bitiminden 2 (iki) ay önceden noterden bildirim ile kiracı, sözleşmeyi feshedebilir. Bu halde kiracının diğer sorumlulukları ortadan kalkmaz. Kiracı 1. (birinci) yıl dolmadan önce mecurdan ayrılacak olursa, kalan ayların kiralarını ödemeyi kabul eder.

2- İşbu kira sözleşmesi 1 yıllık kira süresi dolmadan 2 (iki) ay önceden yenilemeyeceği Kiracı tarafından bildirilmedikçe otomatik olarak birer yıllık süre ile yenilenebilir. Kira sözleşmesinin otomatik uzaması durumunda kira bedeli, TÜİK tarafından açıklanan ve bir önceki kira yılının tüketici fiyat endeksindeki oniki aylık ortalaması oranında artırılacaktır. Kiracı, mecuru tahliye etmek için her ne nam altında olursa olsun, kiraya verenden herhangi bir bedel talep edemez.

3- Kira bedeli aylık net {aylik_kira} TL dir. Kira sözleşmesinin imzalanması ile birlikte kiraya verene aylık kira bedeli olan {aylik_kira} TL ile depozito bedeli olan {depozito} TL'yi peşin ve nakit olarak ödenecektir. KDV, Stopaj ve bu sözleşmeden kaynaklanan Damga Vergisi gibi diğer bütün mali ve idari yükümlülükler ve sorumluluklar kiracıya aittir. Tahliye halinde taşınmazın kira, elektrik, su, doğalgaz, çevre temizlik vergisi, yönetim giderleri sıfırlanıp taşınmazın hasarsız olarak boş teslimi takiben Kiraya Veren tarafından Kiracı'ya derhal iade edilecektir.

4- Aylık kira bedeli, sözleşmenin başlangıç tarihine göre her ay başında ve ayın ilk iş gününü takip eden ilk {odeme_gunu} ({odeme_gunu_yazi}) gün içinde peşin olarak kiralayanın banka hesabına ödenecektir.

5- İki aylık kira bedeli üst üste süresi içinde ödenmemesi halinde Kiraya Veren tahliye sürecini başlatabilir. Bu durumda Kiracı mecuru tahliye edeceğini ve ödemediği kira bedellerine aylık temerrüd faizi uygulanacağı şimdiden kabul ve taahhüt etmektedir.

6- Kiralanan/mecur, {kiralama_amaci} olarak kiraya verilmiş olup, yalnızca bu amaç ile sınırlı olarak kullanılabilir. Başka bir amaç ve konu için kullanılamaz. Aksine kullanımın akde aykırılık teşkil ettiği ve tahliye sebebi olduğu taraflarca kabul edilmiştir.

7- Kira bedeli nettir. Her türlü kanuni ve idari (stopaj, Çevre temizlik Vergisi gibi vergiler, fon, resim, harç ve sair) sorumluluklar ile mecura ait elektrik, su, doğalgaz, apartman görevlisi ve sair her türlü giderler kiracıya aittir. Kiraya verene hiçbir şekilde yansıtılmadan bizzat kiracı tarafından ödenecektir.

8- Mecurda kullanılması halinde ısıtma/yakıt, aydınlatma/elektrik, su, bekçi-güvenlik elemanı ve diğer ortak giderler ile mecurun kullanılmasından doğan olağan bakım ve küçük çaplı onarım masrafları, sözleşme tarihinden itibaren kiracıya aittir.

9- Kiracı, mecurun bir bölümünü/katını veya tamamını (kısmen veya tamamen) bir başkasına kiraya veremez, bir başkasına devir edemez ve yanına herhangi bir ortak, gerçek ya da tüzel kişi alamaz. Ancak Kiraya Veren'in yazılı izni dahilinde devredilebilir, alt kiraya verilebilir.

10- Kiracı, mecurun dış cephesinde herhangi bir değişiklik yapamaz, içinde ise, binanın statik ve dinamiğine (kolon-kirişine, sıhhi ve elektrik tesisatına ve sair projesine) aykırı ve zarar verecek hiçbir tamir, tadilat ve değişiklikler yapamaz.

11- Kiracı kiraladığı şeyi ne halde buldu ise, mal sahibine o halde ve adete göre teslim etmeğe mecburdur. Kiralanan gayrimenkul içinde bulunan demirbaş eşya ve aletler kontrat müddetinin bitiminde tamamen iade ile mükelleftir.

12- Kiracı mukavele müddetinin son ayı içinde kiralanan şeyi görmeye gelen taliplerin gezip görmesine karşı koyamaz.

13- Kira müddeti bittiği halde kiralanan şeyi boşaltmadığı takdirde Kiracı Kiraya Veren'in bundan doğacak zarar ve ziyanını tazmin edecektir.

14- Sözleşmeye yapıştırılması icap eden damga pulları ve kontrat bedel ve harçları belediye ve noter dairelerine ödenecek harç ve resimler kiracıya aittir.


MAL SAHİBİ          1. KEFİL          2. KEFİL          KİRACI


GENEL KOŞULLAR

1- Taraflar arasında doğabilecek uyuşmazlıklarda öncelikle bu sözleşme hükümleri uygulanacaktır. Sözleşmede hüküm bulunmayan hallerde Türk Borçlar Kanunu, Türk Medeni Kanunu 634 sayılı Kat Mülkiyeti Kanunu ve diğer yürürlükteki alakalı Kanun ve Yargıtay kararları uygulanacaktır.

2- Bu sözleşmenin uygulanmasında yazılılık esastır. Zımni kabul ve onay gibi irade beyanları geçerli değildir. Mevcut sözleşme koşulları, ancak yazılı olarak değiştirilebilir.

3- Taraflar, bu sözleşmede bildirmiş oldukları adreslerinin yasal ikametgah ve tebligat adresleri olduklarını, bu adreslere yapılacak tebligatların ellerine ulaşacağını kabul etmişlerdir.

4- Kefiller, işbu sözleşmeyi müşterek borçlu müteselsil kefil sıfatıyla imzalamışlardır. Kefilin kefaleti kiracı kiralananda oturduğu müddetçe devam eder.

5- Kiracı mecuru tahliyesinde mal sahibine tam eksiksiz ve hasarsız herhangi bir borcu (elektrik, su, yakıt) bulunmaksızın teslim etmeyi kabul ve taahhüt etmiştir.

6- Taraflar işbu kira sözleşmesinden kaynaklanacak ihtilaflar halinde {yetkili_mahkeme} İcra Dairesi ve Mahkemelerinin yetkili olacağını kabul etmişlerdir.

7- İşbu kira sözleşmesi 2 (iki) nüsha olarak, taraflarca okunarak serbest iradeleri ile kabul ve taahhüt edilerek imza altına alınmıştır.


MAL SAHİBİ          1. KEFİL          2. KEFİL          KİRACI


Gayrimenk.com tarafından hazırlanmıştır.

ÖNEMLİ KURALLAR:
- Şablonu birebir koru, madde sırası ve metni değişmesin
- Sadece {} içindeki alanları verilen bilgilerle doldur
- Yıllık kira = aylık kira x 12 olarak hesapla
- Bilgi verilmemişse o alanı boş bırak
- Markdown, başlık, madde işareti ekleme — düz metin olarak yaz
- Kullanıcı bir maddeyi kaldırmasını isterse o maddeyi tamamen sil ve kalan maddeleri 1'den başlayarak yeniden sırala. Madde eklemek isterse uygun yere ekle ve sıralamayı güncelle. Sözleşmenin tamamını döndür.
- Eğer kefil_var "Hayır" ise: sözleşmedeki tüm imza satırlarında "1. KEFİL" ve "2. KEFİL" sütunlarını kaldır, sadece "MAL SAHİBİ" ve "KİRACI" sütunları kalsın. Ayrıca GENEL KOŞULLAR madde 4'teki "Kefiller, işbu sözleşmeyi müşterek borçlu müteselsil kefil sıfatıyla imzalamışlardır. Kefilin kefaleti kiracı kiralananda oturduğu müddetçe devam eder." cümlesini kaldır
- Eğer kefil_var "Evet" ise: kefil1_ad, kefil1_tc, kefil2_ad, kefil2_tc bilgilerini imza satırlarındaki ilgili sütunlara yaz`;

export const MADDE_DUZENLEYICI_PROMPT = `Sen bir kira sözleşmesi madde düzenleyicisisin.

Sana mevcut sözleşme maddelerini (özel koşullar veya genel koşullar) ve kullanıcının isteğini vereceğim.
Sadece maddeleri düzenle, başka hiçbir şey yazma.

Kurallar:
- Sadece maddeleri JSON array olarak döndür, başka hiçbir şey yazma
- Her madde string olarak array'de olsun
- Madde numarası yazma, sadece madde içeriğini yaz
- Madde kaldırılacaksa o maddeyi array'den çıkar
- Madde eklenecekse uygun yere ekle
- Sıralama bozulmasın
- {yetkili_mahkeme} gibi placeholder'ları olduğu gibi bırak

Örnek çıktı formatı (sadece bu format, başka hiçbir şey):
["Madde içeriği 1", "Madde içeriği 2", "Madde içeriği 3"]`;

export const VARSAYILAN_OZEL_MADDELER = (data: Record<string, string>): string[] => {
  const sure = data.sure || '1';
  const sureSayi = parseInt(sure);
  const sureYazi = Number.isFinite(sureSayi) ? trKucuk(sayiYaziya(sureSayi)) : 'bir';

  return [
    // 1 — DEGISTI: sure yaziyla parantez icinde eklendi
    `Kira süresi ${sure} (${sureYazi}) yıldır. Kira sözleşmesinin bitiminden 2 (iki) ay önceden noterden bildirim ile kiracı, sözleşmeyi feshedebilir. Bu halde kiracının diğer sorumlulukları ortadan kalkmaz. Kiracı 1. (birinci) yıl dolmadan önce mecurdan ayrılacak olursa, kalan ayların kiralarını ödemeyi kabul eder.`,

    // 2 — DEGISTI: son cumle geri eklendi (tahliye bedeli talep edilemez)
    `İşbu kira sözleşmesi 1 yıllık kira süresi dolmadan 2 (iki) ay önceden yenilemeyeceği Kiracı tarafından bildirilmedikçe otomatik olarak birer yıllık süre ile yenilenebilir. Kira sözleşmesinin otomatik uzaması durumunda kira bedeli, TÜİK tarafından açıklanan ve bir önceki kira yılının tüketici fiyat endeksindeki oniki aylık ortalaması oranında artırılacaktır. Kiracı, mecuru tahliye etmek için her ne nam altında olursa olsun, kiraya verenden herhangi bir bedel talep edemez.`,

    // 3 — DEGISTI: DEPOZITO IADE cumlesi geri eklendi + "TL'yi" eki duzeltildi
    `Kira bedeli aylık net ${data.aylik_kira || '............'} TL dir. Kira sözleşmesinin imzalanması ile birlikte kiraya verene aylık kira bedeli olan ${data.aylik_kira || '............'} TL ile depozito bedeli olan ${data.depozito || '............'} TL'yi peşin ve nakit olarak ödenecektir. KDV, Stopaj ve bu sözleşmeden kaynaklanan Damga Vergisi gibi diğer bütün mali ve idari yükümlülükler ve sorumluluklar kiracıya aittir. Tahliye halinde taşınmazın kira, elektrik, su, doğalgaz, çevre temizlik vergisi, yönetim giderleri sıfırlanıp taşınmazın hasarsız olarak boş teslimi takiben Kiraya Veren tarafından Kiracı'ya derhal iade edilecektir.`,

    // 4 — DEGISMEDI (asilla birebir)
    `Aylık kira bedeli, sözleşmenin başlangıç tarihine göre her ay başında ve ayın ilk iş gününü takip eden ilk ${data.odeme_gunu || '............'} (${data.odeme_gunu ? sayiYaziya(parseInt(data.odeme_gunu)) : '............'}) gün içinde peşin olarak kiralayanın banka hesabına ödenecektir.`,

    // 5 — DEGISMEDI
    `İki aylık kira bedeli üst üste süresi içinde ödenmemesi halinde Kiraya Veren tahliye sürecini başlatabilir. Bu durumda Kiracı mecuru tahliye edeceğini ve ödemediği kira bedellerine aylık temerrüd faizi uygulanacağı şimdiden kabul ve taahhüt etmektedir.`,

    // 6 — DEGISMEDI
    `Kiralanan/mecur, ${data.kiralama_amaci || '............'} olarak kiraya verilmiş olup, yalnızca bu amaç ile sınırlı olarak kullanılabilir. Başka bir amaç ve konu için kullanılamaz. Aksine kullanımın akde aykırılık teşkil ettiği ve tahliye sebebi olduğu taraflarca kabul edilmiştir.`,

    // 7 — DEGISTI: IKI cumle geri eklendi (yansitilmama + tahsil/faiz)
    `Kira bedeli nettir. Her türlü kanuni ve idari (stopaj, Çevre Temizlik Vergisi gibi vergiler, fon, resim, harç ve sair) sorumluluklar ile mecura ait elektrik, su, doğalgaz, apartman görevlisi ve sair her türlü giderler kiracıya aittir. Kiraya verene hiçbir şekilde yansıtılmadan bizzat kiracı tarafından ödenecektir. Kiracı tarafından ödenmeyip kiraya verenden tahsil olunduğu takdirde, tahsil tarihinden itibaren, yetkili kurumun uyguladığı faiz ve şartlar ile kiracıdan tahsil edilecektir.`,

    // 8 — DEGISTI: "ve kullanim sekline gore" ibaresi + IKI cumle geri eklendi.
    // KARAR A: asildaki "kullanmadan" yazim hatasi DUZELTILDI, "kullanilmasindan"
    // olarak kaliyor (mevcut kodda da oyleydi).
    `Mecurda kullanılması halinde ve kullanım şekline göre ısıtma / yakıt, aydınlatma / elektrik, su, bekçi - güvenlik elemanı ve diğer ortak giderler ile mecurun kullanılmasından doğan olağan bakım ve küçük çaplı onarım masrafları, sözleşme tarihinden itibaren kiracıya aittir. Söz konusu giderlerin kiracı tarafından ödenmemesi veya geç ödenmesi nedeniyle yasal işleme muhatap kalınması ve kiraya veren tarafından ödeme yapılması halinde, ödeme tarihinden itibaren faizi ile kiracıdan talep olunur. Kiracı, kiralananda yapılması gereken bakım ve onarımları, derhal kiralayana bildirmek zorundadır.`,

    // 9 — DEGISTI: "(kismen veya tamamen)" geri eklendi
    `Kiracı, mecurun bir bölümünü/katını veya tamamını (kısmen veya tamamen) bir başkasına kiraya veremez, bir başkasına devir edemez ve yanına herhangi bir ortak, gerçek ya da tüzel kişi alamaz. Ancak Kiraya Veren'in yazılı izni dahilinde devredilebilir, alt kiraya verilebilir.`,

    // 10 — DEGISTI: "icinde ise," + dekorasyon izni IKI cumle geri eklendi
    `Kiracı, mecurun dış cephesinde herhangi bir değişiklik yapamaz, içinde ise, binanın statik ve dinamiğine (kolon-kirişine, sıhhi ve elektrik tesisatına ve sair projesine) aykırı ve zarar verecek hiçbir tamir, tadilat ve değişiklikler yapamaz. Ancak bunların dışında ihtiyacı olan dekoratif, süsleme yapabilir. Sözleşmeye uygun olarak yaptığı ve yapacağı masrafların kendi uhdesinde kalacağını bilerek yapmaktadır.`,

    // 11 — DEGISTI: teferruat/tazmin cumlesi geri eklendi
    `Kiracı kiraladığı şeyi ne halde buldu ise, mal sahibine o halde ve adete göre teslim etmeğe mecburdur. Kiralanan gayrimenkul içinde bulunan demirbaş eşya ve aletler kontrat müddetinin bitiminde tamamen iade ile mükelleftir. Gerek bu demirbaşlar ve gerek kiralanan şeyin teferruatı zayi edilir ve kullanmaktan dolayı eskirse, kiracı talep halinde bunların değerini tazmine mecburdur.`,

    // 12 — DEGISMEDI
    `Kiracı mukavele müddetinin son ayı içinde kiralanan şeyi görmeye gelen taliplerin gezip görmesine karşı koyamaz.`,

    // 13 — DEGISMEDI
    `Kira müddeti bittiği halde kiralanan şeyi boşaltmadığı takdirde Kiracı Kiraya Veren'in bundan doğacak zarar ve ziyanını tazmin edecektir.`,

    // 14 — DEGISTI: asil belgeyle birebir. "kiraciya mal sahibine aittir"
    // seklinde IKI TARAF DA yaziyor ve BILEREK oyle birakildi (KARAR B).
    // Hangisinin gecerli oldugu sozlesme uzerinde elle isaretlenecek.
    // BU BIR YAZIM HATASI DEGIL — duzeltmeye calisma.
    `Sözleşmeye yapıştırılması icap eden damga pulları ve kontrat bedel ve harçları belediye ve noter dairelerine ödenecek harç ve resimler kiracıya mal sahibine aittir.`,
  ];
};

export const VARSAYILAN_GENEL_MADDELER = (esyaVar: boolean = false, data?: Record<string, string>): string[] => {
  const maddeler: string[] = [
    // 1 — DEGISTI: "ve ihtiyac duyuldugunda" geri eklendi
    "Taraflar arasında doğabilecek uyuşmazlıklarda öncelikle bu sözleşme hükümleri uygulanacaktır. Sözleşmede hüküm bulunmayan hallerde ve ihtiyaç duyulduğunda Türk Borçlar Kanunu, Türk Medeni Kanunu 634 sayılı Kat Mülkiyeti Kanunu ve diğer yürürlükteki alakalı Kanun ve Yargıtay kararları uygulanacaktır.",

    // 2 — DEGISMEDI
    "Bu sözleşmenin uygulanmasında yazılılık esastır. Zımni kabul ve onay gibi irade beyanları geçerli değildir. Mevcut sözleşme koşulları, ancak yazılı olarak değiştirilebilir.",

    // 3 — EN BUYUK DEGISIKLIK: maddenin %85'i eksikti, tamami geri eklendi
    "Taraflar, bu sözleşmede bildirmiş oldukları adreslerinin ve mecurun adresinin yasal ikametgah ve tebligat adresleri olduklarını, bu adreslere yapılacak tebligatların ellerine ulaşacağını, bu adreslerinde herhangi bir değişiklik olması halinde yazılı olarak birbirlerine bildireceklerini, aksi halde, sözleşmede yazılı adrese ve mecurun bulunduğu adrese yapılacak tebligatların kendilerine yapılmış sayılacağını ve içeriğine muttali olmuş sayılacaklarını kabul ile tebligat yapılmasının hukuki ve cezai bütün sorumluluklarını bildiklerini ve şimdiden ayrı ayrı kabul ettiklerini beyan ve taahhüt etmişlerdir.",

    // 4 — DEGISMEDI. Kosullu yapilmadi: asil matbu formda kefil imzalanmamis
    // olsa bile bu madde duruyor. Onceki turda "kosullu olmali" demistim,
    // asil belge aksini gosterdi.
    "Kefiller, işbu sözleşmeyi müşterek borçlu müteselsil kefil sıfatıyla imzalamışlardır. Kefilin kefaleti kiracı kiralananda oturduğu müddetçe devam eder.",

    // 5 — DEGISTI: "(elektrik, su, yakit)" geri eklendi
    "Kiracı mecuru tahliyesinde mal sahibine tam eksiksiz ve hasarsız herhangi bir borcu (elektrik, su, yakıt) bulunmaksızın teslim etmeyi kabul ve taahhüt etmiştir.",

    // 6 — DEGISMEDI
    "Taraflar işbu kira sözleşmesinden kaynaklanacak ihtilaflar halinde {yetkili_mahkeme} İcra Dairesi ve Mahkemelerinin yetkili olacağını kabul etmişlerdir.",

    // 7 — COMMIT 2'DE DEGISMEDI. Metin asilla zaten birebir.
    // COMMIT 3'te asagidaki satirin yerine su gelecek (pdfTemplate ile AYNI
    // COMMIT'te, tek basina degil):
    //   "İşbu kira sözleşmesi 2 (iki) nüsha ve {sayfa_sayisi} sayfa olarak, taraflarca okunarak serbest iradeleri ile kabul ve taahhüt edilerek imza altına alınmıştır.",
    "İşbu kira sözleşmesi 2 (iki) nüsha olarak, taraflarca okunarak serbest iradeleri ile kabul ve taahhüt edilerek imza altına alınmıştır.",
  ];

  // --- Asagisi DEGISMEDI: asil belgede yok, uygulamaya sonradan eklenen dallar ---

  if (esyaVar) {
    maddeler.push(
      "Kiralanan taşınmaz eşyalı olarak kiracıya teslim edilmiştir. Taşınmaz içerisinde bulunan eşyalar sözleşmeye ekli demirbaş listesinde belirtilmiş olup kiracı eşyaları sağlam ve çalışır durumda teslim aldığını kabul eder. Kiracı eşyaları özenli şekilde kullanmayı ve kira süresi sonunda eksiksiz olarak teslim etmeyi kabul eder.",
      "Kiralanan taşınmazda bulunan beyaz eşyalar ve elektrikli cihazlar çalışır durumda teslim edilmiştir. Kullanım hatası, ihmal veya kasıt sonucu oluşabilecek arıza ve hasarların onarım masrafları kiracıya aittir.",
      "Demirbaş listesi ve anahtar teslim tutanağı işbu kira sözleşmesinin ayrılmaz ekidir.",
    );
  }

  if (data && (data.depozito_tur === 'Dolar' || data.depozito_tur === 'Euro' || data.depozito_tur === 'Altın')) {
    const miktar = data.depozito_miktar || '...';
    const tlKarsiligi = data.depozito || '...';
    const referans = data.depozito_tur === 'Altın'
      ? 'Kapalıçarşı piyasa fiyatı'
      : 'Türkiye Cumhuriyet Merkez Bankası döviz alış kuru';
    maddeler.push(
      `Kiracı, işbu sözleşmenin imzalanması ile birlikte depozito olarak, sözleşme tarihinde ${miktar} karşılığına denk gelen ${tlKarsiligi} TL'yi mal sahibine nakden teslim eder. Depozito, kira ilişkisinin sona ermesinden itibaren 30 gün içinde iade edilir; iade tutarı, iade tarihinde geçerli ${referans} esas alınarak hesaplanan ${miktar} karşılığı Türk Lirası tutarında iade edilir. Referans fiyata ilgili günde erişilememesi halinde bir önceki iş günü fiyatı geçerli olur.`
    );
  }

  return maddeler;
};

export const HUKUK_ARASTIRMACI_PROMPT = `Sen Gayrimenk.com için çalışan Türk gayrimenkul hukuku araştırmacısısın.

Görevin: Güncel Türk hukuku çerçevesinde gayrimenkul konularında kısa, net ve pratik bilgi vermek.

Kurallar:
- İlgili kanun madde numaralarını belirt (TBK, TMK, vb.)
- Güncel içtihat varsa özetle
- Maksimum 200 kelime
- Pratik ve anlaşılır dil kullan`;

export const CONTRACT_TYPES = {
  kira: 'Kira Sözleşmesi',
  satis: 'Satış Vaadi Sözleşmesi',
  komisyon: 'Komisyon Sözleşmesi',
  vekaletname: 'Vekaletname',
};
