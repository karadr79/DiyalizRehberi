/* Diyaliz Rehberi · çekirdek: alan şeması, hesaplamalar ve kural motoru.
   Arayüzden bağımsızdır; aynı dosya tarayıcıda ve Node testlerinde çalışır.
   İlke: boş değer sıfır sayılmaz; her kural yalnız gerekli veriler girilmişse çalışır. */
(function (root) {
  'use strict';
  var num = function (x) { if (x === '' || x == null) return null; var n = typeof x === 'number' ? x : parseFloat(String(x).replace(',', '.')); return isFinite(n) ? n : null; };
  var r1 = function (x) { return x == null ? null : Math.round(x * 10) / 10; }, r2 = function (x) { return x == null ? null : Math.round(x * 100) / 100; };
  var tr = function (x, d) { if (x == null) return '—'; return (d == null ? String(x) : x.toFixed(d)).replace('.', ','); };

  /* ---------------- Alan şeması ----------------
     k: anahtar · l: etiket · u: birim · t: n(sayı) | s(seçim) | x(metin) · c: yeni aya taşınır (reçete türü alanlar)
     mn/mx: akla yatkınlık sınırı (dışında kalan giriş uyarı verir, hesaplara alınmaz) */
  var LAB = [
    { k: 'alb', l: 'Albümin', u: 'g/dL', t: 'n', mn: 1, mx: 6 },
    { k: 'na', l: 'Sodyum', u: 'mmol/L', t: 'n', mn: 110, mx: 170 },
    { k: 'crp', l: 'CRP', u: 'mg/L', t: 'n', mn: 0, mx: 500 },
    { k: 'hba1c', l: 'HbA1c', u: '%', t: 'n', mn: 3, mx: 20 }
  ];
  var KAB = [
    { k: 'k', l: 'Potasyum', u: 'mmol/L', t: 'n', mn: 1.5, mx: 9 },
    { k: 'hco3', l: 'Bikarbonat', u: 'mmol/L', t: 'n', mn: 5, mx: 45 },
    { k: 'kBag', l: 'Potasyum bağlayıcı', t: 's', c: 1, o: ['Yok', 'Sodyum zirkonyum siklosilikat', 'Patiromer', 'Kalsiyum polistiren sülfonat', 'Sodyum polistiren sülfonat'] },
    { k: 'kBagDoz', l: 'Bağlayıcı dozu', t: 'x', c: 1, h: 'ör. 5 g/gün, diyaliz dışı günlerde' },
    { k: 'kIlac', l: 'Potasyumu yükselten ilaç', t: 's', c: 1, o: ['Yok', 'RAAS blokeri', 'MRA', 'RAAS blokeri + MRA', 'Diğer'] },
    { k: 'bikarb', l: 'Oral sodyum bikarbonat', t: 's', c: 1, o: ['Yok', 'Var'] },
    { k: 'bikarbDoz', l: 'Bikarbonat dozu', u: 'g/gün', t: 'n', c: 1, mn: 0, mx: 12 },
    { k: 'kabiz', l: 'Kabızlık', t: 's', o: ['Yok', 'Var'] }
  ];
  var ERI_HD = [
    { k: 'erisim', l: 'Damar erişimi', t: 's', c: 1, o: ['AV fistül', 'AV greft', 'Tünelli kateter', 'Geçici kateter'] },
    { k: 'igne', l: 'İğne çapı', t: 's', c: 1, o: ['17G', '16G', '15G', '14G', 'Kateter'] },
    { k: 'katBas', l: 'Kateter takılma ayı', t: 'm', c: 1 },
    { k: 'qa', l: 'Erişim akımı (Qa)', u: 'mL/dk', t: 'n', mn: 50, mx: 4000 },
    { k: 'resirk', l: 'Resirkülasyon', u: '%', t: 'n', mn: 0, mx: 80 },
    { k: 'venBas', l: 'Dinamik venöz basınç', u: 'mmHg', t: 'n', mn: 0, mx: 500, h: 'Qb 200 mL/dk, 15G iğne ile' },
    { k: 'fm', l: 'Erişim fizik muayenesi', t: 's', o: ['Normal', 'Zayıf thrill / üfürüm', 'Hiperpulsatil', 'Kol kaldırmada ven çökmüyor', 'Uzamış kanama (> 15 dk)', 'Kol veya yüz ödemi'] },
    { k: 'alteplaz', l: 'Alteplaz uygulaması', u: '/ay', t: 'n', mn: 0, mx: 30 },
    { k: 'kilit', l: 'Kateter kilit solüsyonu', t: 's', c: 1, o: ['Heparin', '%4 sitrat', 'Antibiyotikli kilit', 'Diğer'] },
    { k: 'crbsi', l: 'Kateter ilişkili kan dolaşımı enfeksiyonu', t: 's', o: ['Yok', 'Var'] },
    { k: 'etken', l: 'Etken', t: 's', o: ['Bilinmiyor / kültür bekleniyor', 'Koagülaz negatif stafilokok', 'S. aureus', 'Pseudomonas', 'Diğer Gram-negatif', 'Candida', 'Diğer'] },
    { k: 'esi', l: 'Kateter çıkış yeri', t: 's', o: ['Normal', 'Enfekte'] },
    { k: 'tunel', l: 'Tünel enfeksiyonu', t: 's', o: ['Yok', 'Var'] }
  ];
  var ERI_PD = [
    { k: 'perit', l: 'Bu ay peritonit', t: 's', o: ['Yok', 'Var'] },
    { k: 'pLok', l: 'Diyalizat lökosit', u: '/µL', t: 'n', mn: 0, mx: 100000, h: 'En az 2 saatlik bekleme sonrası' },
    { k: 'pPmn', l: 'Diyalizat nötrofil oranı', u: '%', t: 'n', mn: 0, mx: 100 },
    { k: 'pEtken', l: 'Peritonit etkeni', t: 's', o: ['Kültür bekleniyor', 'Kültür negatif', 'Koagülaz negatif stafilokok', 'Streptokok', 'S. aureus', 'Enterokok', 'Pseudomonas', 'Diğer Gram-negatif', 'Polimikrobiyal', 'Fungal'] },
    { k: 'pYanit', l: 'Tedavinin 5. gününde yanıt', t: 's', o: ['Düzeldi', 'Düzelmedi'] },
    { k: 'pRelaps', l: 'Önceki tedaviden sonraki 4 haftada aynı etken', t: 's', o: ['Yok', 'Var'] },
    { k: 'pSay', l: 'Son 12 ayda peritonit sayısı', u: 'atak', t: 'n', mn: 0, mx: 20 },
    { k: 'esi', l: 'Kateter çıkış yeri', t: 's', o: ['Normal', 'Şüpheli', 'Enfekte'] },
    { k: 'tunel', l: 'Tünel enfeksiyonu', t: 's', o: ['Yok', 'Var'] },
    { k: 'profil', l: 'Çıkış yeri profilaksisi', t: 's', c: 1, o: ['Yok', 'Mupirosin', 'Gentamisin'] },
    { k: 'kFonk', l: 'Kateter işlevi', t: 's', o: ['Normal', 'Drenaj sorunu', 'Kaçak'] }
  ];
  var ENF = [
    { k: 'hbsag', l: 'HBsAg', t: 's', o: ['Negatif', 'Pozitif'] },
    { k: 'antiHbs', l: 'Anti-HBs', u: 'mIU/mL', t: 'n', mn: 0, mx: 100000 },
    { k: 'antiHbc', l: 'Anti-HBc', t: 's', o: ['Negatif', 'Pozitif'] },
    { k: 'antiHcv', l: 'Anti-HCV', t: 's', o: ['Negatif', 'Pozitif'] },
    { k: 'hcvRna', l: 'HCV RNA', t: 's', o: ['Negatif', 'Pozitif'] },
    { k: 'antiHiv', l: 'Anti-HIV', t: 's', o: ['Negatif', 'Pozitif'] },
    { k: 'hbvAsi', l: 'Hepatit B aşı durumu', t: 's', c: 1, o: ['Aşısız', 'Seri sürüyor', 'Seri tamamlandı', 'İki seri sonrası yanıtsız'] },
    { k: 'hbvDoz', l: 'Son hepatit B aşı dozu', t: 'm', c: 1 },
    { k: 'gripAy', l: 'Son influenza aşısı', t: 'm', c: 1 },
    { k: 'pnomo', l: 'Pnömokok aşısı', t: 's', c: 1, o: ['Yok', 'PCV20', 'PCV15 + PPSV23', 'PCV13 + PPSV23', 'Yalnız PPSV23'] },
    { k: 'covidAy', l: 'Son COVID-19 aşısı', t: 'm', c: 1 },
    { k: 'zona', l: 'Rekombinant zona aşısı', t: 's', c: 1, o: ['Yok', 'Tek doz', 'İki doz tamamlandı'] },
    { k: 'tdYil', l: 'Son Td/Tdap yılı', t: 'n', c: 1, mn: 1950, mx: 2100 }
  ];

  var ANE = [
    { k: 'hb', l: 'Hemoglobin', u: 'g/dL', t: 'n', mn: 3, mx: 20 },
    { k: 'ferritin', l: 'Ferritin', u: 'ng/mL', t: 'n', mn: 1, mx: 10000 },
    { k: 'tsat', l: 'TSAT', u: '%', t: 'n', mn: 1, mx: 100 },
    { k: 'esa', l: 'ESA', t: 's', c: 1, o: ['Yok', 'Epoetin alfa/beta', 'Darbepoetin alfa', 'Metoksi-PEG epoetin beta (CERA)'] },
    { k: 'esaDoz', l: 'ESA dozu', u: 'IU veya µg', t: 'n', c: 1, mn: 0, mx: 60000, h: 'Epoetin: IU/hafta · Darbepoetin: µg/hafta · CERA: µg/ay' },
    { k: 'demir', l: 'Demir tedavisi', t: 's', c: 1, o: ['Yok', 'IV demir sükroz', 'IV ferrik karboksimaltoz', 'IV diğer', 'Oral demir'] },
    { k: 'demirDoz', l: 'Demir dozu (IV)', u: 'mg/ay', t: 'n', c: 1, mn: 0, mx: 3000 },
    { k: 'hifphi', l: 'HIF-PHI', t: 's', c: 1, o: ['Yok', 'Var'] },
    { k: 'enf', l: 'Aktif sistemik enfeksiyon', t: 's', o: ['Yok', 'Var'] },
    { k: 'kanama', l: 'Kan kaybı / kanama', t: 's', o: ['Yok', 'Var'] },
    { k: 'tromboz', l: 'Yeni tromboembolik olay / erişim trombozu', t: 's', o: ['Yok', 'Var'] },
    { k: 'transf', l: 'Bu ay eritrosit transfüzyonu', u: 'ünite', t: 'n', mn: 0, mx: 20 }
  ];
  var MKB = [
    { k: 'ca', l: 'Kalsiyum', u: 'mg/dL', t: 'n', mn: 4, mx: 16 },
    { k: 'p', l: 'Fosfor', u: 'mg/dL', t: 'n', mn: 0.5, mx: 15 },
    { k: 'pth', l: 'iPTH', u: 'pg/mL', t: 'n', mn: 1, mx: 5000 },
    { k: 'pthUst', l: 'iPTH testi üst sınırı', u: 'pg/mL', t: 'n', c: 1, mn: 20, mx: 150, h: 'Laboratuvarınızın değeri; boşsa 65 alınır' },
    { k: 'alp', l: 'ALP', u: 'U/L', t: 'n', mn: 5, mx: 3000 },
    { k: 'd25', l: '25(OH) D vitamini', u: 'ng/mL', t: 'n', mn: 1, mx: 200 },
    { k: 'caBag', l: 'Kalsiyum içeren bağlayıcı', t: 's', c: 1, o: ['Yok', 'Kalsiyum asetat', 'Kalsiyum karbonat'] },
    { k: 'caBagEl', l: 'Bağlayıcıdan elemental Ca', u: 'mg/gün', t: 'n', c: 1, mn: 0, mx: 4000 },
    { k: 'nonCa', l: 'Kalsiyum içermeyen bağlayıcı', t: 's', c: 1, o: ['Yok', 'Sevelamer', 'Lantan karbonat', 'Sukroferrik oksihidroksit', 'Ferrik sitrat'] },
    { k: 'vitD', l: 'Kalsitriol / D vitamini analoğu', t: 's', c: 1, o: ['Yok', 'Kalsitriol', 'Parikalsitol', 'Alfakalsidol'] },
    { k: 'vitDDoz', l: 'Aktif D vitamini dozu', u: 'µg/hafta', t: 'n', c: 1, mn: 0, mx: 100 },
    { k: 'kalsim', l: 'Kalsimimetik', t: 's', c: 1, o: ['Yok', 'Sinakalset', 'Etelkalsetid'] },
    { k: 'kalsimDoz', l: 'Kalsimimetik dozu', u: 'mg', t: 'n', c: 1, mn: 0, mx: 300, h: 'Sinakalset: mg/gün · Etelkalsetid: mg/seans' },
    { k: 'natD', l: 'Nutrisyonel D vitamini (kolekalsiferol)', t: 's', c: 1, o: ['Yok', 'Var'] }
  ];
  var NUT = [
    { k: 'npcr', l: 'nPCR / nPNA', u: 'g/kg/gün', t: 'n', mn: 0.2, mx: 3 },
    { k: 'prealb', l: 'Prealbümin', u: 'mg/dL', t: 'n', mn: 1, mx: 60 },
    { k: 'kol', l: 'Total kolesterol', u: 'mg/dL', t: 'n', mn: 30, mx: 600 },
    { k: 'protAlim', l: 'Diyet protein alımı (diyet kaydı)', u: 'g/kg/gün', t: 'n', mn: 0.2, mx: 3 },
    { k: 'enerjiAlim', l: 'Diyet enerji alımı (diyet kaydı)', u: 'kcal/kg/gün', t: 'n', mn: 5, mx: 70 },
    { k: 'sga', l: 'SGA', t: 's', o: ['A: iyi beslenmiş', 'B: hafif-orta malnütrisyon', 'C: ağır malnütrisyon'] },
    { k: 'mis', l: 'MIS', u: '0–30', t: 'n', mn: 0, mx: 30 },
    { k: 'istah', l: 'İştah', t: 's', o: ['Normal', 'Azalmış'] },
    { k: 'ons', l: 'Oral nutrisyonel destek', t: 's', c: 1, o: ['Yok', 'Var'] },
    { k: 'idpn', l: 'İntradiyalitik parenteral beslenme', t: 's', c: 1, o: ['Yok', 'Var'], only: 'HD' }
  ];
  var ODEM = ['Yok', '+', '++ / +++'];
  var SCHEMA = {
    HD: [
      { id: 'yet', t: 'Diyaliz yeterliliği', d: 'Ay ortası seansının kan örnekleri ve o seansın gerçekleşen süresi.', f: [
        { k: 'preU', l: 'Diyaliz öncesi üre veya BUN', u: 'mg/dL', t: 'n', mn: 5, mx: 400 },
        { k: 'postU', l: 'Diyaliz sonrası üre veya BUN', u: 'mg/dL', t: 'n', mn: 1, mx: 300, h: 'Giriş ile aynı birim; örnek yavaş akım veya pompa durdurma yöntemiyle' },
        { k: 'sure', l: 'Seans süresi', u: 'dk', t: 'n', c: 1, mn: 60, mx: 600 },
        { k: 'seans', l: 'Haftalık seans sayısı', u: '/hafta', t: 'n', c: 1, mn: 1, mx: 7 },
        { k: 'ktvlab', l: 'Kt/V (cihaz veya laboratuvar)', u: '', t: 'n', mn: 0.2, mx: 3.5, h: 'Üre değerleri girilmediyse kullanılır' },
        { k: 'idrar', l: 'İdrar volümü', u: 'mL/gün', t: 'n', mn: 0, mx: 5000, h: 'Anürik hastada 0' }
      ] },
      { id: 'rec', t: 'Diyaliz reçetesi', d: 'Reçete alanları yeni aya kendiliğinden taşınır; yalnız değişeni düzeltin.', f: [
        { k: 'qb', l: 'Kan akım hızı (Qb)', u: 'mL/dk', t: 'n', c: 1, mn: 100, mx: 600 },
        { k: 'qd', l: 'Diyalizat akım hızı (Qd)', u: 'mL/dk', t: 'n', c: 1, mn: 200, mx: 1000 },
        { k: 'membran', l: 'Yöntem / membran', t: 's', c: 1, o: ['HD, low-flux', 'HD, high-flux', 'HDF, post-dilüsyon', 'HDF, pre-dilüsyon'] },
        { k: 'yuzey', l: 'Diyalizör yüzey alanı', u: 'm²', t: 'n', c: 1, mn: 0.5, mx: 3 },
        { k: 'konv', l: 'Konveksiyon hacmi (HDF)', u: 'L/seans', t: 'n', c: 1, mn: 1, mx: 120 },
        { k: 'dK', l: 'Diyalizat potasyum', u: 'mmol/L', t: 'n', c: 1, mn: 0, mx: 4 },
        { k: 'dCa', l: 'Diyalizat kalsiyum', u: 'mmol/L', t: 's', c: 1, o: ['1.25', '1.5', '1.75'] },
        { k: 'dHCO3', l: 'Diyalizat bikarbonat', u: 'mmol/L', t: 'n', c: 1, mn: 20, mx: 42 },
        { k: 'dNa', l: 'Diyalizat sodyum', u: 'mmol/L', t: 'n', c: 1, mn: 125, mx: 150 },
        { k: 'dT', l: 'Diyalizat sıcaklığı', u: '°C', t: 'n', c: 1, mn: 34, mx: 38 },
        { k: 'antiko', l: 'Antikoagülasyon', t: 's', c: 1, o: ['Standart heparin', 'DMAH', 'Heparinsiz', 'Bölgesel sitrat'] },
        { k: 'antikoDoz', l: 'Antikoagülan dozu', t: 'x', c: 1, h: 'ör. 2000 IU bolus + 1000 IU/saat' }
      ] },
      { id: 'vol', t: 'Volüm ve kan basıncı', d: 'Ağırlık ve kan basıncı için ayın seans ortalamaları.', f: [
        { k: 'kuru', l: 'Hedef (kuru) ağırlık', u: 'kg', t: 'n', c: 1, mn: 25, mx: 250 },
        { k: 'preW', l: 'Ortalama giriş ağırlığı', u: 'kg', t: 'n', mn: 25, mx: 250 },
        { k: 'postW', l: 'Ortalama çıkış ağırlığı', u: 'kg', t: 'n', mn: 25, mx: 250 },
        { k: 'preS', l: 'Giriş sistolik KB', u: 'mmHg', t: 'n', mn: 60, mx: 260 },
        { k: 'preD', l: 'Giriş diyastolik KB', u: 'mmHg', t: 'n', mn: 30, mx: 150 },
        { k: 'postS', l: 'Çıkış sistolik KB', u: 'mmHg', t: 'n', mn: 60, mx: 260 },
        { k: 'postD', l: 'Çıkış diyastolik KB', u: 'mmHg', t: 'n', mn: 30, mx: 150 },
        { k: 'evS', l: 'Ev sistolik KB (diyaliz dışı gün)', u: 'mmHg', t: 'n', mn: 60, mx: 260 },
        { k: 'evD', l: 'Ev diyastolik KB', u: 'mmHg', t: 'n', mn: 30, mx: 150 },
        { k: 'idh', l: 'İntradiyalitik hipotansiyonlu seans', u: '/ay', t: 'n', mn: 0, mx: 31 },
        { k: 'nadir', l: 'En düşük intradiyalitik sistolik KB', u: 'mmHg', t: 'n', mn: 40, mx: 220 },
        { k: 'odem', l: 'Ödem', t: 's', o: ODEM },
        { k: 'ahSayi', l: 'Antihipertansif ilaç sayısı', u: '', t: 'n', c: 1, mn: 0, mx: 8 }
      ] },
      { id: 'kab', t: 'Potasyum ve asit-baz', d: 'Diyaliz öncesi K ve HCO₃; diyalizat potasyumu reçete bölümünde.', f: KAB },
      { id: 'ane', t: 'Anemi', d: 'Diyaliz öncesi Hb, ferritin ve TSAT; tedavi alanları yeni aya taşınır.', f: ANE },
      { id: 'mkb', t: 'KBH-MKB', d: 'Ca, P ve iPTH ile bağlayıcı, aktif D vitamini ve kalsimimetik tedavisi.', f: MKB },
      { id: 'nut', t: 'Nutrisyon', d: 'Albümin Diğer laboratuvar bölümünden alınır; kilo seyri aylık ağırlıklardan hesaplanır.', f: NUT },
      { id: 'eri', t: 'Damar erişimi', d: 'Erişim türü ve kateter bilgisi yeni aya taşınır; kan akımı reçete bölümünde.', f: ERI_HD },
      { id: 'enf', t: 'Enfeksiyon taraması ve aşı', d: 'Seroloji yapıldığı ayda girilir; aşı bilgileri yeni aya taşınır.', f: ENF },
      { id: 'lab', t: 'Diğer laboratuvar', d: 'Diyaliz öncesi değerler. Albümin düzeltilmiş kalsiyum için de kullanılır.', f: LAB }
    ],
    PD: [
      { id: 'yet', t: 'Diyaliz yeterliliği', d: '24 saatlik diyalizat ve idrar toplaması yapıldığı aylarda doldurulur.', f: [
        { k: 'dVol', l: '24 saatlik drenaj volümü', u: 'L', t: 'n', mn: 1, mx: 30 },
        { k: 'dUre', l: 'Diyalizat üre', u: 'mg/dL', t: 'n', mn: 1, mx: 400 },
        { k: 'pUre', l: 'Plazma üre', u: 'mg/dL', t: 'n', mn: 5, mx: 400, h: 'Diyalizat ile aynı birim (üre veya BUN)' },
        { k: 'uUre', l: 'İdrar üre', u: 'mg/dL', t: 'n', mn: 0, mx: 3000 },
        { k: 'dKre', l: 'Diyalizat kreatinin', u: 'mg/dL', t: 'n', mn: 0.1, mx: 25 },
        { k: 'pKre', l: 'Plazma kreatinin', u: 'mg/dL', t: 'n', mn: 0.5, mx: 30 },
        { k: 'uKre', l: 'İdrar kreatinin', u: 'mg/dL', t: 'n', mn: 0, mx: 400 },
        { k: 'idrar', l: 'İdrar volümü', u: 'mL/gün', t: 'n', mn: 0, mx: 5000, h: 'Anürik hastada 0' },
        { k: 'ktvlab', l: 'Haftalık toplam Kt/V (hazır sonuç)', u: '', t: 'n', mn: 0.3, mx: 5, h: 'Toplama değerleri girilmediyse kullanılır' },
        { k: 'pet', l: 'PET: 4. saat D/P kreatinin', u: '', t: 'n', c: 1, mn: 0.2, mx: 1.1 },
        { k: 'petUF', l: 'PET: 4 saatlik net UF (%3,86)', u: 'mL', t: 'n', c: 1, mn: -1000, mx: 2000 }
      ] },
      { id: 'rec', t: 'Diyaliz reçetesi', d: 'Her solüsyon için torba hacmi, bekleme süresi ve günlük değişim sayısını girin; kullanılmayan solüsyonu boş bırakın. APD’de torba hacmi × torba sayısı girilir. Alanlar yeni aya taşınır.', f: [
        { k: 'tip', l: 'Yöntem', t: 's', c: 1, o: ['SAPD', 'APD'] },
        { k: 's136V', l: '%1,36 glukoz: torba hacmi', u: 'L', t: 'n', c: 1, mn: 0.5, mx: 6, h: 'Excel: 2L-3H-3D = 2 L, 3 saat, 3 değişim' },
        { k: 's136H', l: '%1,36 glukoz: bekleme', u: 'saat', t: 'n', c: 1, mn: 0.5, mx: 16 },
        { k: 's136N', l: '%1,36 glukoz: değişim', u: 'adet/gün', t: 'n', c: 1, mn: 0, mx: 10 },
        { k: 's227V', l: '%2,27 glukoz: torba hacmi', u: 'L', t: 'n', c: 1, mn: 0.5, mx: 6 },
        { k: 's227H', l: '%2,27 glukoz: bekleme', u: 'saat', t: 'n', c: 1, mn: 0.5, mx: 16 },
        { k: 's227N', l: '%2,27 glukoz: değişim', u: 'adet/gün', t: 'n', c: 1, mn: 0, mx: 10 },
        { k: 's386V', l: '%3,86 glukoz: torba hacmi', u: 'L', t: 'n', c: 1, mn: 0.5, mx: 6 },
        { k: 's386H', l: '%3,86 glukoz: bekleme', u: 'saat', t: 'n', c: 1, mn: 0.5, mx: 16 },
        { k: 's386N', l: '%3,86 glukoz: değişim', u: 'adet/gün', t: 'n', c: 1, mn: 0, mx: 10 },
        { k: 'sikoV', l: 'İkodekstrin: torba hacmi', u: 'L', t: 'n', c: 1, mn: 0.5, mx: 6 },
        { k: 'sikoH', l: 'İkodekstrin: bekleme', u: 'saat', t: 'n', c: 1, mn: 0.5, mx: 16 },
        { k: 'sikoN', l: 'İkodekstrin: değişim', u: 'adet/gün', t: 'n', c: 1, mn: 0, mx: 10 },
        { k: 'saaV', l: 'Aminoasit: torba hacmi', u: 'L', t: 'n', c: 1, mn: 0.5, mx: 6 },
        { k: 'saaH', l: 'Aminoasit: bekleme', u: 'saat', t: 'n', c: 1, mn: 0.5, mx: 16 },
        { k: 'saaN', l: 'Aminoasit: değişim', u: 'adet/gün', t: 'n', c: 1, mn: 0, mx: 10 },
        { k: 'gunduz', l: 'Gündüz dolumu (APD)', u: 'L', t: 'n', c: 1, mn: 0, mx: 3.5 },
        { k: 'gece', l: 'Gece tedavi süresi (APD)', u: 'saat', t: 'n', c: 1, mn: 4, mx: 14 }
      ] },
      { id: 'vol', t: 'Volüm ve kan basıncı', d: '', f: [
        { k: 'hedef', l: 'Hedef ağırlık', u: 'kg', t: 'n', c: 1, mn: 25, mx: 250 },
        { k: 'kilo', l: 'Ağırlık (karın boş)', u: 'kg', t: 'n', mn: 25, mx: 250 },
        { k: 'uf', l: 'Günlük net ultrafiltrasyon', u: 'mL/gün', t: 'n', mn: -2000, mx: 5000 },
        { k: 'S', l: 'Sistolik KB', u: 'mmHg', t: 'n', mn: 60, mx: 260 },
        { k: 'D', l: 'Diyastolik KB', u: 'mmHg', t: 'n', mn: 30, mx: 150 },
        { k: 'evS', l: 'Ev sistolik KB', u: 'mmHg', t: 'n', mn: 60, mx: 260 },
        { k: 'evD', l: 'Ev diyastolik KB', u: 'mmHg', t: 'n', mn: 30, mx: 150 },
        { k: 'odem', l: 'Ödem', t: 's', o: ODEM },
        { k: 'furo', l: 'Furosemid', u: 'mg/gün', t: 'n', c: 1, mn: 0, mx: 1000 },
        { k: 'raas', l: 'RAAS blokeri', t: 's', c: 1, o: ['Yok', 'ACEİ', 'ARB'] },
        { k: 'ahSayi', l: 'Antihipertansif ilaç sayısı', u: '', t: 'n', c: 1, mn: 0, mx: 8 }
      ] },
      { id: 'kab', t: 'Potasyum ve asit-baz', d: 'Serum K ve HCO₃.', f: KAB },
      { id: 'ane', t: 'Anemi', d: 'Hb, ferritin ve TSAT; tedavi alanları yeni aya taşınır.', f: ANE },
      { id: 'mkb', t: 'KBH-MKB', d: 'Ca, P ve iPTH ile bağlayıcı, aktif D vitamini ve kalsimimetik tedavisi.', f: MKB },
      { id: 'nut', t: 'Nutrisyon', d: 'Albümin Diğer laboratuvar bölümünden alınır; kilo seyri aylık ağırlıklardan hesaplanır.', f: NUT.filter(function (f) { return f.only !== 'HD'; }) },
      { id: 'eri', t: 'PD kateteri ve peritonit', d: 'Peritonit atakları, çıkış yeri ve kateter işlevi.', f: ERI_PD },
      { id: 'enf', t: 'Enfeksiyon taraması ve aşı', d: 'Seroloji yapıldığı ayda girilir; aşı bilgileri yeni aya taşınır.', f: ENF },
      { id: 'lab', t: 'Diğer laboratuvar', d: 'Albümin düzeltilmiş kalsiyum için de kullanılır.', f: LAB }
    ]
  };
  var PFIELDS = [
    { k: 'kod', l: 'Hasta kodu', t: 'x', h: 'Ad-soyad yazmayın; kod veya baş harf kullanın' },
    { k: 'cins', l: 'Cinsiyet', t: 's', o: ['Erkek', 'Kadın'] },
    { k: 'dogum', l: 'Doğum yılı', t: 'n', mn: 1900, mx: 2030 },
    { k: 'boy', l: 'Boy', u: 'cm', t: 'n', mn: 100, mx: 220 },
    { k: 'basla', l: 'Diyalize başlama', t: 'm' },
    { k: 'dm', l: 'Diabetes mellitus', t: 's', o: ['Yok', 'Var'] },
    { k: 'nakil', l: 'Böbrek nakli değerlendirmesi', t: 's', o: ['Değerlendirilmedi', 'Nakil merkezine yönlendirildi', 'Bekleme listesinde', 'Nakle uygun değil', 'Hasta istemiyor'] },
    { k: 'pdgerekce', l: 'PD uygulanmama gerekçesi (HD raporu)', t: 'x', only: 'HD' },
    { k: 'not', l: 'Not', t: 'x' }
  ];
  function fieldsOf(mod) { var a = []; SCHEMA[mod].forEach(function (g) { g.f.forEach(function (f) { a.push(f); }); }); return a; }
  function fieldMap(mod) { var m = {}; fieldsOf(mod).forEach(function (f) { m[f.k] = f; }); return m; }
  /* Sayısal alanı güvenle oku: sınır dışı değer hesaba alınmaz */
  function val(mod, v, k) { var f = fieldMap(mod)[k]; if (!v) return null; if (!f || f.t !== 'n') return v[k] == null || v[k] === '' ? null : v[k]; var n = num(v[k]); if (n == null) return null; if ((f.mn != null && n < f.mn) || (f.mx != null && n > f.mx)) return null; return n; }
  function outOfRange(mod, v) { var a = []; fieldsOf(mod).forEach(function (f) { if (f.t !== 'n') return; var n = num(v[f.k]); if (n == null) return; if ((f.mn != null && n < f.mn) || (f.mx != null && n > f.mx)) a.push(f); }); return a; }

  /* ---------------- Formüller ---------------- */
  function watson(cins, yas, boy, kg) { if (boy == null || kg == null) return null; if (cins === 'Kadın') return -2.097 + 0.1069 * boy + 0.2466 * kg; if (yas == null) return null; return 2.447 - 0.09516 * yas + 0.1074 * boy + 0.3362 * kg; }
  function bsa(boy, kg) { return boy == null || kg == null ? null : 0.007184 * Math.pow(boy, 0.725) * Math.pow(kg, 0.425); }
  function spKtV(R, saat, ufL, postKg) { if (R == null || saat == null) return null; var a = R - 0.008 * saat; if (a <= 0) return null; var uf = ufL != null && postKg ? (4 - 3.5 * R) * ufL / postKg : 0; return -Math.log(a) + uf; }
  function eKtV(sp, dk) { return sp == null || dk == null ? null : sp * dk / (dk + 30.7); }
  function stdKtV(ekt, dk, n) { if (ekt == null || dk == null || n == null) return null; var e = 1 - Math.exp(-ekt); return (10080 * e / dk) / (e / ekt + 10080 / (n * dk) - 1); }
  function yas(p, ay) { var d = num(p.dogum); if (d == null) return null; var y = ay ? parseInt(ay.slice(0, 4), 10) : new Date().getFullYear(); return y - d; }
  function aylar(a, b) { if (!a || !b) return null; return (parseInt(b.slice(0, 4), 10) - parseInt(a.slice(0, 4), 10)) * 12 + (parseInt(b.slice(5, 7), 10) - parseInt(a.slice(5, 7), 10)); }

  function compute(p, v, ay) {
    var m = p.mod, g = function (k) { return val(m, v, k); }, c = {}, boy = num(p.boy), ya = yas(p, ay);
    if (m === 'HD') {
      var pre = g('preU'), post = g('postU'), dk = g('sure'), n = g('seans'), preW = g('preW'), postW = g('postW'), kuru = g('kuru');
      c.uf = preW != null && postW != null ? r2(preW - postW) : null;
      if (pre != null && post != null && pre > 0) { c.R = post / pre; c.urr = r1((1 - c.R) * 100); c.sp = r2(spKtV(c.R, dk != null ? dk / 60 : null, c.uf, postW)); }
      c.ktv = c.sp != null ? c.sp : g('ktvlab'); c.ktvSrc = c.sp != null ? 'Daugirdas II' : (c.ktv != null ? 'girilen değer' : null);
      c.ekt = r2(eKtV(c.ktv, dk)); c.std = r2(stdKtV(c.ekt, dk, n));
      c.V = r1(watson(p.cins, ya, boy, postW != null ? postW : kuru));
      var W = postW != null ? postW : kuru;
      if (c.uf != null && dk != null && W) { c.ufr = r1(c.uf * 1000 / (dk / 60) / W); c.t10 = Math.ceil(c.uf * 1000 / (10 * W) * 60 / 5) * 5; c.t13 = Math.ceil(c.uf * 1000 / (13 * W) * 60 / 5) * 5; }
      if (c.uf != null && kuru) c.idwg = r1(c.uf / kuru * 100);
      if (postW != null && kuru != null) c.dKuru = r1(postW - kuru);
      if (dk != null && n != null) c.haftaSaat = r1(dk * n / 60);
    } else {
      var kilo = g('kilo') != null ? g('kilo') : g('hedef'); c.V = r1(watson(p.cins, ya, boy, kilo)); c.bsa = r2(bsa(boy, kilo));
      var dV = g('dVol'), dU = g('dUre'), pU = g('pUre'), uU = g('uUre'), dK = g('dKre'), pK = g('pKre'), uK = g('uKre'), uV = g('idrar');
      if (dV != null && dU != null && pU && c.V) c.pKtV = r2(dU / pU * dV * 7 / c.V);
      if (uV != null && c.V && (uV === 0 || (uU != null && pU))) c.rKtV = r2(uV === 0 ? 0 : uU / pU * (uV / 1000) * 7 / c.V);
      if (c.pKtV != null) { c.tKtV = r2(c.pKtV + (c.rKtV || 0)); c.rEksik = c.rKtV == null; }
      c.ktv = c.tKtV != null ? c.tKtV : g('ktvlab'); c.ktvSrc = c.tKtV != null ? 'toplamadan hesap' : (c.ktv != null ? 'girilen değer' : null);
      var cu = uV != null && uV > 0 && uU != null && pU ? uU / pU * uV / 1440 : (uV === 0 ? 0 : null), cc = uV != null && uV > 0 && uK != null && pK ? uK / pK * uV / 1440 : (uV === 0 ? 0 : null);
      if (cu != null && cc != null) { var rk = (cu + cc) / 2; c.rkfRaw = rk; c.rkf = c.bsa ? r1(rk * 1.73 / c.bsa) : r1(rk); }
      if (dV != null && dK != null && pK && c.bsa) { var per = dK / pK * dV * 7; c.pCrCl = r1(per * 1.73 / c.bsa); if (c.rkfRaw != null) c.tCrCl = r1((per + c.rkfRaw * 10.08) * 1.73 / c.bsa); }
      /* Solüsyon başına günlük hacim = torba hacmi × değişim sayısı; eski kayıtlarda doğrudan L/gün değeri okunur */
      c.L = {}; c.recete = []; c.degisim = 0; var anySol = false;
      [['136', '%1,36'], ['227', '%2,27'], ['386', '%3,86'], ['iko', 'İkodekstrin'], ['aa', 'Aminoasit']].forEach(function (q) {
        var V = g('s' + q[0] + 'V'), N = g('s' + q[0] + 'N'), H = g('s' + q[0] + 'H'), leg = num(v[q[0] === 'iko' || q[0] === 'aa' ? q[0] : 's' + q[0]]);
        var L = V != null && N != null ? V * N : (leg != null ? leg : null); c.L[q[0]] = L; if (L != null) anySol = true;
        if (N != null && N > 0) { c.degisim += N; c.recete.push(q[1] + ': ' + (V != null ? tr(V, 1) + ' L' : '? L') + (H != null ? ' – ' + tr(H, 1) + ' sa' : '') + ' – ' + N + ' değişim'); }
      });
      c.recete = c.recete.join(' · ') || null; if (!c.degisim) c.degisim = null;
      var a = c.L['136'], b = c.L['227'], d = c.L['386'], ik = c.L.iko, aa = c.L.aa;
      if (a != null || b != null || d != null) { c.gluk = Math.round((a || 0) * 13.6 + (b || 0) * 22.7 + (d || 0) * 38.6); c.glukVol = (a || 0) + (b || 0) + (d || 0); c.hiper = ((b || 0) + (d || 0)); }
      if (a != null || b != null || d != null || ik != null || aa != null) c.topVol = r1((a || 0) + (b || 0) + (d || 0) + (ik || 0) + (aa || 0));
      var uf = g('uf'); if (uf != null && uV != null) c.cikis = uf + uV;
      if (g('kilo') != null && g('hedef') != null) c.dHedef = r1(g('kilo') - g('hedef'));
      var pet = g('pet'); if (pet != null) c.petTip = pet > 0.81 ? 'Hızlı (yüksek)' : pet >= 0.65 ? 'Yüksek-orta' : pet >= 0.5 ? 'Düşük-orta' : 'Yavaş (düşük)';
    }
    /* Anemi ve KBH-MKB: HD ve PD ortak */
    var hb = g('hb'), esa = v.esa, ed = g('esaDoz'), kg = m === 'HD' ? (g('postW') != null ? g('postW') : g('kuru')) : (g('kilo') != null ? g('kilo') : g('hedef'));
    c.esaVar = !!esa && esa !== 'Yok' && (ed == null || ed > 0);
    if (c.esaVar && ed != null && kg) { var iu = /Epoetin/.test(esa) ? ed : (/Darbe/.test(esa) ? ed * 200 : null); if (iu != null) { c.esaKg = r1(iu / kg); if (hb != null) c.eri = r1(iu / kg / hb); } }
    c.mod = m; var ust = g('pthUst') != null ? g('pthUst') : 65; c.pthUst = ust; c.pthUstVars = g('pthUst') == null;
    if (g('pth') != null) c.pthX = r1(g('pth') / ust);
    if (g('ca') != null && g('alb') != null) c.dca = r2(g('ca') + 0.8 * (4 - g('alb'))); else if (g('ca') != null) c.dca = g('ca');
    c.dcaAlb = g('ca') != null && g('alb') != null;
    /* Nutrisyon */
    var wk = m === 'HD' ? 'postW' : 'kilo', W = g(wk) != null ? g(wk) : (m === 'HD' ? g('kuru') : g('hedef'));
    if (W != null && boy) { var hm = boy / 100; c.bmi = r1(W / (hm * hm)); var ibw = 22 * hm * hm; if (g('alb') != null) c.gnri = r1(1.489 * g('alb') * 10 + 41.7 * Math.min(W / ibw, 1)); }
    function wAgo(lo, hi) { var best = null; sortedMonths(p).forEach(function (a) { var d = aylar(a, ay); if (d >= lo && d <= hi) { var w = val(m, p.visits[a], wk); if (w != null && (best == null || Math.abs(d - (lo + hi) / 2) < best.d)) best = { w: w, d: Math.abs(d - (lo + hi) / 2) }; } }); return best ? best.w : null; }
    if (g(wk) != null) { var w3 = wAgo(2, 4), w6 = wAgo(5, 7); if (w3) c.wl3 = r1((w3 - g(wk)) / w3 * 100); if (w6) c.wl6 = r1((w6 - g(wk)) / w6 * 100); }
    if (W != null) { var lo = m === 'HD' ? 1.2 : 1.2, hi = m === 'HD' ? 1.4 : 1.3; c.protHedef = Math.round(lo * W) + '–' + Math.round(hi * W); c.enerjiHedef = (ya != null && ya >= 60 ? Math.round(30 * W) + '–' + Math.round(35 * W) : String(Math.round(35 * W))); }
    if (m === 'PD' && c.gluk != null) c.glukKcal = Math.round(c.gluk * (v.tip === 'APD' ? 0.4 : 0.6) * 3.75);
    var pc = { bio: [], kitle: [], alim: [] }, old = ya != null && ya >= 65;
    if (g('alb') != null && g('alb') < 3.8) pc.bio.push('albümin ' + tr(g('alb'), 1)); if (g('prealb') != null && g('prealb') < 30) pc.bio.push('prealbümin ' + tr(g('prealb'))); if (g('kol') != null && g('kol') < 100) pc.bio.push('kolesterol ' + tr(g('kol')));
    if (c.bmi != null && c.bmi < (old ? 23 : 22)) pc.kitle.push('BMI ' + tr(c.bmi, 1)); if (c.wl3 != null && c.wl3 > 5) pc.kitle.push('3 ayda %' + tr(c.wl3, 1) + ' kilo kaybı'); if (c.wl6 != null && c.wl6 > 10) pc.kitle.push('6 ayda %' + tr(c.wl6, 1) + ' kilo kaybı');
    var np = g('npcr'), pa = g('protAlim'), ea = g('enerjiAlim'); if (np != null && np < 0.8) pc.alim.push('nPCR ' + tr(np, 2)); if (pa != null && pa < 0.8) pc.alim.push('protein alımı ' + tr(pa, 1)); if (ea != null && ea < 25) pc.alim.push('enerji alımı ' + tr(ea));
    c.pewDet = pc; c.pewN = (pc.bio.length ? 1 : 0) + (pc.kitle.length ? 1 : 0) + (pc.alim.length ? 1 : 0);
    return c;
  }

  /* ---------------- Kurallar ----------------
     s: düzey (bad | warn | info | ok) · k: koşul metni (kural tablosu) · o: öneri metni (öneri diliyle)
     src: dayanak · w: tetiklenme sınaması; true veya gerekçe metni döndürür */
  var KDOQI15 = 'KDOQI HD Yeterlilik 2015', KDOQI06 = 'KDOQI 2006', EBPG = 'EBPG/ERBP HD 2007', KDIGO_BP = 'KDIGO Tartışmalar Konferansı: diyalizde KB ve volüm (2020)', ISPD20 = 'ISPD 2020 (hedefe yönelik PD)', YON = 'Diyaliz Merkezleri Hakkında Yönetmelik (RG 13.11.2026, 33429)';
  var kat = function (x) { return x == null ? false : x; };
  var RULES = {
    HD: [
      { id: 'HD-Y01', g: 'yet', s: 'bad', k: 'Haftada 3 seans, spKt/V < 1,2', src: KDOQI15 + ' 3.1 (1B)', w: function (x) { return x.n('seans') === 3 && x.c.ktv != null && x.c.ktv < 1.2 && 'spKt/V ' + tr(x.c.ktv, 2); },
        o: 'Verilen doz asgari hedefin altında. Sırasıyla şunların gözden geçirilmesi önerilir: seansın gerçekleşen süresi ve erken sonlandırma, kan akım hızı ile damar erişimi (resirkülasyon, iğne yerleşimi ve çapı, kateter disfonksiyonu), diyaliz sonrası örnekleme tekniği, diyalizör yüzey alanı ve pıhtılaşma, diyalizat akımı. Düzeltilebilir neden yoksa seans süresinin uzatılması değerlendirilebilir.' },
      { id: 'HD-Y02', g: 'yet', s: 'warn', k: 'Haftada 3 seans, spKt/V 1,2–1,39', src: KDOQI15 + ' 3.1 (1B)', w: function (x) { return x.n('seans') === 3 && x.c.ktv != null && x.c.ktv >= 1.2 && x.c.ktv < 1.4 && 'spKt/V ' + tr(x.c.ktv, 2); },
        o: 'Asgari doz karşılanıyor, hedef değer olan 1,4 sağlanmıyor. Reçetenin (süre, Qb, diyalizör) hedefe göre gözden geçirilmesi önerilir.' },
      { id: 'HD-Y03', g: 'yet', s: 'ok', k: 'Haftada 3 seans, spKt/V ≥ 1,4', src: KDOQI15 + ' 3.1 (1B)', w: function (x) { return x.n('seans') === 3 && x.c.ktv != null && x.c.ktv >= 1.4 && 'spKt/V ' + tr(x.c.ktv, 2); }, o: 'Küçük solüt klirensi hedefte.' },
      { id: 'HD-Y04', g: 'yet', s: 'warn', k: 'URR < %65', src: KDOQI06, w: function (x) { return x.c.urr != null && x.c.urr < 65 && 'URR %' + tr(x.c.urr, 1); }, o: 'Üre azalma oranı %65 altında; spKt/V ile birlikte yorumlanması ve HD-Y01 basamaklarının izlenmesi önerilir.' },
      { id: 'HD-Y05', g: 'yet', s: 'bad', k: 'Haftada 3 dışı program, stdKt/V < 2,1', src: KDOQI15 + ' 3.2', w: function (x) { var n = x.n('seans'); return n != null && n !== 3 && x.c.std != null && x.c.std < 2.1 && 'stdKt/V ' + tr(x.c.std, 2); },
        o: 'Haftalık standart Kt/V asgari değer olan 2,1 altında. Seans sayısı veya süresinin artırılması; rezidüel böbrek fonksiyonu varsa idrar toplanarak hesaba katılması önerilir. Buradaki stdKt/V ultrafiltrasyon ve rezidüel fonksiyon katkısını içermez.' },
      { id: 'HD-Y06', g: 'yet', s: 'warn', k: 'Haftada 3 dışı program, stdKt/V 2,1–2,29', src: KDOQI15 + ' 3.2', w: function (x) { var n = x.n('seans'); return n != null && n !== 3 && x.c.std != null && x.c.std >= 2.1 && x.c.std < 2.3 && 'stdKt/V ' + tr(x.c.std, 2); }, o: 'Asgari değer karşılanıyor, hedef 2,3. Reçetenin hedefe göre gözden geçirilmesi önerilir.' },
      { id: 'HD-Y07', g: 'yet', s: 'warn', k: 'Haftada ≤ 2 seans', src: KDOQI06 + '; ' + KDOQI15 + ' 3.3', w: function (x) { var n = x.n('seans'); return n != null && n <= 2 && n + ' seans/hafta'; },
        o: 'Haftada iki seans yalnız anlamlı rezidüel böbrek fonksiyonu belgelenmiş hastada yeterli olabilir. İdrar toplanarak rezidüel üre klirensinin ölçülmesi ve düzenli aralıklarla yinelenmesi önerilir.' },
      { id: 'HD-Y08', g: 'yet', s: 'bad', k: 'Seans süresi < 180 dk ve idrar < 200 mL/gün', src: KDOQI15 + ' 4.1.1 (1D)', w: function (x) { var s = x.n('sure'), i = x.n('idrar'); return s != null && s < 180 && i != null && i < 200 && s + ' dk, idrar ' + i + ' mL/gün'; },
        o: 'Rezidüel fonksiyonu düşük hastada haftada üç seansta süre en az 3 saat olmalıdır. Seans süresinin uzatılması önerilir. (İdrar volümü, rezidüel klirens < 2 mL/dk yerine kullanılan yaklaşık göstergedir.)' },
      { id: 'HD-Y09', g: 'yet', s: 'info', k: 'Haftada 3 seans, süre 180–239 dk', src: EBPG, w: function (x) { var s = x.n('sure'); return x.n('seans') === 3 && s != null && s >= 180 && s < 240 && s + ' dk'; },
        o: 'Avrupa kılavuzu haftada en az 3 × 4 saat önerir. Kt/V yeterli olsa da volüm, fosfor ve kan basıncı kontrolü açısından 4 saate çıkılması değerlendirilebilir.' },
      { id: 'HD-Y10', g: 'yet', s: 'warn', k: 'Kt/V önceki aya göre ≥ 0,2 düşmüş', src: 'KDOQI Damar Erişimi 2019', w: function (x) { var a = x.pc && x.pc.ktv; return a != null && x.c.ktv != null && a - x.c.ktv >= 0.2 && tr(a, 2) + ' → ' + tr(x.c.ktv, 2); },
        o: 'Açıklanamayan Kt/V düşüşü damar erişimi disfonksiyonunun erken bulgusu olabilir. Erişimin fizik muayenesi, resirkülasyon ölçümü ve gerekirse görüntüleme önerilir.' },
      { id: 'HD-Y11', g: 'yet', s: 'warn', k: 'Çıkış/giriş üre oranı ≤ 0,10 veya ≥ 0,60', src: 'Veri denetimi', w: function (x) { return x.c.R != null && (x.c.R <= 0.1 || x.c.R >= 0.6) && 'oran ' + tr(x.c.R, 2); },
        o: 'Üre değerleri beklenen aralığın dışında. Örnekleme zamanı ve tekniğinin, giriş ve çıkış değerlerinin yer değiştirip değiştirmediğinin kontrol edilmesi önerilir.' },
      { id: 'HD-Y12', g: 'yet', s: 'info', k: 'Bu ay yeterlilik ölçümü girilmemiş', src: KDOQI06, w: function (x) { return x.c.ktv == null && x.any; }, o: 'Verilen diyaliz dozunun ayda bir ölçülmesi önerilir.' },

      { id: 'HD-R01', g: 'rec', s: 'warn', k: 'Kt/V < 1,4 ve Qb < 300 mL/dk', src: 'Uygulama pratiği', w: function (x) { var q = x.n('qb'); return x.c.ktv != null && x.c.ktv < 1.4 && q != null && q < 300 && 'Qb ' + q + ' mL/dk'; },
        o: 'Erişim izin veriyorsa kan akım hızının artırılması önerilir. İğne çapı akıma uygun seçilmelidir (yaklaşık: 17G < 300, 16G 300–350, 15G 350–450, 14G > 450 mL/dk).' },
      { id: 'HD-R02', g: 'rec', s: 'info', k: 'Kt/V < 1,2 ve Qd < 500 mL/dk', src: 'Uygulama pratiği', w: function (x) { var q = x.n('qd'); return x.c.ktv != null && x.c.ktv < 1.2 && q != null && q < 500 && 'Qd ' + q + ' mL/dk'; }, o: 'Diyalizat akımının 500 mL/dk düzeyine çıkarılması değerlendirilebilir.' },
      { id: 'HD-R03', g: 'kab', s: 'bad', k: 'Diyalizat K < 2 mmol/L', src: 'KDIGO Tartışmalar Konferansı: potasyum (2020)', w: function (x) { var d = x.n('dK'); return d != null && d < 2 && 'diyalizat K ' + tr(d, 1); },
        o: 'Düşük potasyumlu diyalizat ani kardiyak ölüm ve aritmi riskiyle ilişkilidir; 2 mmol/L altından kaçınılması önerilir.' },
      { id: 'HD-R04', g: 'kab', s: 'warn', k: 'Giriş K < 4,0 ve diyalizat K ≤ 2', src: 'KDIGO Tartışmalar Konferansı: potasyum (2020)', w: function (x) { var k = x.n('k'), d = x.n('dK'); return k != null && d != null && k < 4 && d <= 2 && d >= 2 && 'K ' + tr(k, 1) + ', diyalizat K ' + tr(d, 1); },
        o: 'Serum-diyalizat potasyum farkını azaltmak için diyalizat potasyumunun 3 mmol/L düzeyine çıkarılması değerlendirilebilir; beslenme durumu ve ishal gibi kayıplar gözden geçirilmelidir.' },
      { id: 'HD-R05', g: 'kab', s: 'warn', k: 'Giriş K 5,6–6,5 mmol/L', src: 'KDIGO Tartışmalar Konferansı: potasyum (2020)', w: function (x) { var k = x.n('k'); return k != null && k > 5.5 && k <= 6.5 && 'K ' + tr(k, 1); },
        o: 'Diyet ve ilaçların (RAAS blokeri, NSAİİ), diyaliz dozunun, erişim resirkülasyonunun, asidoz ve kabızlığın gözden geçirilmesi; yineleyen durumda potasyum bağlayıcı değerlendirilmesi önerilir. Diyalizat potasyumu 3 ise 2 mmol/L düzeyine inilebilir.' },
      { id: 'HD-R06', g: 'kab', s: 'bad', k: 'Giriş K > 6,5 mmol/L', src: 'KDIGO Tartışmalar Konferansı: potasyum (2020)', w: function (x) { var k = x.n('k'); return k != null && k > 6.5 && 'K ' + tr(k, 1); },
        o: 'Ciddi hiperpotasemi. Hemoliz dışlandıktan sonra EKG ile değerlendirme ve nedenin ivedilikle araştırılması önerilir; uzun diyaliz arası sonrası değerse program ve uyum gözden geçirilmelidir.' },
      { id: 'HD-R07', g: 'rec', s: 'warn', k: 'Diyalizat Ca 1,75 mmol/L', src: 'KDIGO KBH-MKB 2017, 4.1.4 (2C)', w: function (x) { return x.v.dCa === '1.75' && 'diyalizat Ca 1,75'; },
        o: 'Pozitif kalsiyum dengesinden kaçınmak için diyalizat kalsiyumunun 1,25–1,50 mmol/L aralığında tutulması önerilir.' },
      { id: 'HD-R08', g: 'rec', s: 'info', k: 'Düzeltilmiş Ca > 10,2 mg/dL ve diyalizat Ca 1,5', src: 'KDIGO KBH-MKB 2017, 4.1.3–4.1.4', w: function (x) { return x.v.dCa === '1.5' && x.c.dca != null && x.c.dca > 10.2 && 'düzeltilmiş Ca ' + tr(x.c.dca, 2); },
        o: 'Kalsiyum içeren bağlayıcı ve D vitamini dozları gözden geçirildikten sonra diyalizat kalsiyumunun 1,25 mmol/L düzeyine indirilmesi değerlendirilebilir.' },
      { id: 'HD-R09', g: 'kab', s: 'warn', k: 'Giriş bikarbonat < 22 mmol/L', src: 'KDOQI Nutrisyon 2020, 6.1', w: function (x) { var h = x.n('hco3'); return h != null && h < 22 && 'HCO₃ ' + tr(h, 1); },
        o: 'Metabolik asidoz. Diyaliz dozu, protein alımı ve interdiyalitik kilo alımı gözden geçirilerek diyalizat bikarbonatının artırılması veya oral bikarbonat eklenmesi değerlendirilebilir.' },
      { id: 'HD-R10', g: 'kab', s: 'info', k: 'Giriş bikarbonat > 27 mmol/L', src: 'DOPPS gözlemsel veriler', w: function (x) { var h = x.n('hco3'); return h != null && h > 27 && 'HCO₃ ' + tr(h, 1); },
        o: 'Diyaliz öncesi alkaloz yetersiz protein alımını düşündürebilir. Beslenme durumunun değerlendirilmesi ve diyalizat bikarbonatının azaltılması düşünülebilir.' },
      { id: 'HD-R11', g: 'rec', s: 'info', k: 'Diyalizat Na ≥ 140 ve kilo alımı > %4', src: KDIGO_BP, w: function (x) { var d = x.n('dNa'); return d != null && d >= 140 && x.c.idwg != null && x.c.idwg > 4 && 'diyalizat Na ' + d + ', kilo alımı %' + tr(x.c.idwg, 1); },
        o: 'Yüksek diyalizat sodyumu susama ve kilo alımını artırabilir. Diyalizat sodyumunun 137–138 mmol/L düzeyine indirilmesi değerlendirilebilir; sodyum profili önerilmez.' },
      { id: 'HD-R12', g: 'rec', s: 'info', k: 'HDF, konveksiyon hacmi < 23 L/seans', src: 'CONVINCE (NEJM 2023); ESHOL', w: function (x) { var m = x.v.membran || '', k = x.n('konv'); return m.indexOf('post') > 0 && k != null && k < 23 && tr(k, 1) + ' L/seans'; },
        o: 'Post-dilüsyon HDF’de sağkalım yararı yüksek konveksiyon hacmiyle (≥ 23 L/seans) gösterilmiştir. Kan akımı, süre ve filtrasyon fraksiyonunun gözden geçirilmesi önerilir.' },

      { id: 'HD-V01', g: 'vol', s: 'bad', k: 'Ultrafiltrasyon hızı > 13 mL/kg/saat', src: KDOQI15 + ' 4.2; Flythe 2011', w: function (x) { return x.c.ufr != null && x.c.ufr > 13 && tr(x.c.ufr, 1) + ' mL/kg/saat'; },
        o: function (x) { return 'Yüksek UF hızı mortalite ve intradiyalitik hipotansiyonla ilişkilidir. Tuz kısıtlaması (< 5 g/gün) ile kilo alımının azaltılması ve seans süresinin uzatılması önerilir' + (x.c.t10 ? ': bu kilo alımıyla 13 mL/kg/saat için en az ' + x.c.t13 + ' dk, 10 mL/kg/saat için ' + x.c.t10 + ' dk gerekir.' : '.') + ' Gerekirse ek seans değerlendirilebilir.'; } },
      { id: 'HD-V02', g: 'vol', s: 'warn', k: 'Ultrafiltrasyon hızı 10–13 mL/kg/saat', src: KDOQI15 + ' 4.2; ' + KDIGO_BP, w: function (x) { return x.c.ufr != null && x.c.ufr > 10 && x.c.ufr <= 13 && tr(x.c.ufr, 1) + ' mL/kg/saat'; },
        o: function (x) { return 'UF hızı sınırda yüksek. Kilo alımının azaltılması veya sürenin uzatılması değerlendirilebilir' + (x.c.t10 ? ' (10 mL/kg/saat için ' + x.c.t10 + ' dk).' : '.'); } },
      { id: 'HD-V03', g: 'vol', s: 'warn', k: 'İnterdiyalitik kilo alımı > kuru ağırlığın %4,5’i', src: EBPG, w: function (x) { return x.c.idwg != null && x.c.idwg > 4.5 && '%' + tr(x.c.idwg, 1) + ' (' + tr(x.c.uf, 1) + ' kg)'; },
        o: 'Sıvı kısıtlamasından önce tuz kısıtlamasının (< 5 g/gün) vurgulanması, diyalizat sodyumunun ve diyabetik hastada glisemi kontrolünün gözden geçirilmesi önerilir.' },
      { id: 'HD-V04', g: 'vol', s: 'warn', k: 'Çıkış ağırlığı kuru ağırlığın > 0,5 kg üstünde', src: KDIGO_BP, w: function (x) { return x.c.dKuru != null && x.c.dKuru > 0.5 && '+' + tr(x.c.dKuru, 1) + ' kg'; },
        o: 'Hedef ağırlığa ulaşılamıyor. Nedenin (hipotansiyon, kramp, kısa süre, yüksek kilo alımı) belirlenmesi; süre uzatılarak hedefe kademeli yaklaşılması önerilir.' },
      { id: 'HD-V05', g: 'vol', s: 'info', k: 'Çıkış ağırlığı kuru ağırlığın > 0,5 kg altında', src: KDIGO_BP, w: function (x) { return x.c.dKuru != null && x.c.dKuru < -0.5 && tr(x.c.dKuru, 1) + ' kg'; },
        o: 'Kuru ağırlığın klinik olarak yeniden belirlenmesi önerilir; gerçek kilo kaybı (malnütrisyon) veya gereğinden düşük hedef ayırt edilmelidir.' },
      { id: 'HD-V06', g: 'vol', s: 'warn', k: 'Giriş sistolik KB ≥ 160 mmHg', src: 'ERA-EDTA/ESH uzlaşısı (Sarafidis, NDT 2017); ' + KDIGO_BP, w: function (x) { var s = x.n('preS'); return s != null && s >= 160 && s + ' mmHg'; },
        o: 'Diyaliz girişi ölçümü tek başına tanı için yetersizdir; ev veya 44 saatlik ambulatuvar ölçümle doğrulanması önerilir. İlk basamak volüm kontrolüdür: kuru ağırlığın kademeli azaltılması ve tuz kısıtlaması. Yeterli olmazsa antihipertansif tedavinin düzenlenmesi önerilir.' },
      { id: 'HD-V07', g: 'vol', s: 'warn', k: 'Ev KB ≥ 135/85 mmHg', src: 'ERA-EDTA/ESH uzlaşısı (Sarafidis, NDT 2017)', w: function (x) { var s = x.n('evS'), d = x.n('evD'); return ((s != null && s >= 135) || (d != null && d >= 85)) && (s || '—') + '/' + (d || '—') + ' mmHg'; },
        o: 'Diyaliz dışı günlerde ev ölçümüyle hipertansiyon doğrulanıyor. Kuru ağırlığın yeniden değerlendirilmesi ve tuz kısıtlaması; ardından ilaç tedavisinin (beta bloker, kalsiyum kanal blokeri, RAAS blokeri) düzenlenmesi önerilir.' },
      { id: 'HD-V08', g: 'vol', s: 'info', k: 'Giriş sistolik KB < 110 mmHg', src: KDIGO_BP, w: function (x) { var s = x.n('preS'); return s != null && s < 110 && s + ' mmHg'; },
        o: 'Düşük diyaliz öncesi kan basıncı da kötü sonlanımla ilişkilidir. Antihipertansiflerin, kuru ağırlığın ve kardiyak fonksiyonun gözden geçirilmesi önerilir.' },
      { id: 'HD-V09', g: 'vol', s: 'warn', k: 'İntradiyalitik hipotansiyon var veya nadir sistolik KB < 90', src: EBPG + '; ' + KDIGO_BP, w: function (x) { var i = x.n('idh'), nd = x.n('nadir'); return ((i != null && i >= 1) || (nd != null && nd < 90)) && [(i != null ? i + ' seans/ay' : ''), (nd != null ? 'nadir ' + nd + ' mmHg' : '')].filter(Boolean).join(', '); },
        o: 'Basamaklı yaklaşım önerilir: kuru ağırlığın yeniden değerlendirilmesi, UF hızının düşürülmesi (süre uzatma, kilo alımını azaltma), seans öncesi antihipertansif zamanlamasının ve seans sırasında yemeğin gözden geçirilmesi, diyalizat sıcaklığının düşürülmesi (35,5–36 °C), diyalizat kalsiyumunun 1,5 mmol/L olması, gerekirse midodrin. Yineleyen olgularda kardiyak değerlendirme önerilir.' },
      { id: 'HD-V10', g: 'vol', s: 'warn', k: 'Ödem var', src: KDIGO_BP, w: function (x) { return x.v.odem && x.v.odem !== 'Yok' && 'ödem ' + x.v.odem; },
        o: 'Hedef ağırlığın kademeli olarak düşürülmesi önerilir (seans başına yaklaşık 0,1 kg/10 kg vücut ağırlığı). Klinik değerlendirme yetersiz kalırsa akciğer ultrasonu veya biyoimpedans yardımcı olabilir.' },
      { id: 'HD-V11', g: 'vol', s: 'info', k: 'İdrar volümü ≥ 500 mL/gün', src: KDOQI15 + '; ' + KDIGO_BP, w: function (x) { var i = x.n('idrar'); return i != null && i >= 500 && i + ' mL/gün'; },
        o: 'Rezidüel böbrek fonksiyonunun korunması önerilir: nefrotoksik ilaç ve kontrasttan, intradiyalitik hipotansiyondan ve aşırı ultrafiltrasyondan kaçınılması; loop diüretiğin sürdürülmesi değerlendirilebilir.' },
      { id: 'HD-V12', g: 'vol', s: 'warn', k: '≥ 3 antihipertansif ile KB kontrolsüz', src: 'ERA-EDTA/ESH uzlaşısı (Sarafidis, NDT 2017)', w: function (x) { var a = x.n('ahSayi'), s = x.n('preS'), e = x.n('evS'); return a != null && a >= 3 && ((s != null && s >= 160) || (e != null && e >= 135)) && a + ' ilaç'; },
        o: 'Dirençli hipertansiyonda en sık neden volüm fazlalığıdır. İlaç eklemeden önce kuru ağırlığın düşürülmesi, sürenin uzatılması ve tuz kısıtlaması; ilaç uyumu ve diyalizle uzaklaşan ilaçların zamanlaması gözden geçirilmelidir.' },

      { id: 'HD-L01', g: 'mev', s: 'info', k: 'Diyalizin ≥ 3. ayında nakil değerlendirmesi yapılmamış', src: YON + ', Madde 31', w: function (x) { var a = aylar(x.p.basla, x.ay); return (!x.p.nakil || x.p.nakil === 'Değerlendirilmedi') && a != null && a >= 3 && 'diyalizin ' + a + '. ayı'; },
        o: 'Yönetmelik, programlı diyalize yeni başlayan hastanın en geç üç ay içinde böbrek nakli açısından değerlendirilmek üzere kamuya ait organ nakil merkezine yönlendirilmesini öngörür. Yönetmelikten önce tanı almış hastalar için süre bir yıldır (Geçici Madde 2).' },
      { id: 'HD-L02', g: 'mev', s: 'info', k: 'HD raporunda PD uygulanmama gerekçesi kayıtlı değil', src: YON + ', Madde 22', w: function (x) { return !x.p.pdgerekce && x.any; },
        o: 'Programlı hemodiyaliz raporunda periton diyalizinin uygulanmama gerekçesi belirtilmelidir. Yönetmelikten önce tanı almış hastaların raporunda bu şart aranmaz (Geçici Madde 2).' }
    ],
    PD: [
      { id: 'PD-Y01', g: 'yet', s: 'warn', k: 'Haftalık toplam Kt/V < 1,7', src: KDOQI06 + '; ' + ISPD20, w: function (x) { return x.c.ktv != null && x.c.ktv < 1.7 && 'Kt/V ' + tr(x.c.ktv, 2); },
        o: 'Küçük solüt klirensi geleneksel alt sınırın altında. Üremik belirti, beslenme ve volüm durumuyla birlikte değerlendirilmesi önerilir. Uyum ve toplama doğruluğu denetlendikten sonra dolum volümünün (vücut yüzeyine göre), değişim sayısının veya APD’de döngü ve gündüz dolumunun transport tipine göre artırılması değerlendirilebilir.' },
      { id: 'PD-Y02', g: 'yet', s: 'ok', k: 'Haftalık toplam Kt/V ≥ 1,7', src: KDOQI06 + '; ' + ISPD20, w: function (x) { return x.c.ktv != null && x.c.ktv >= 1.7 && 'Kt/V ' + tr(x.c.ktv, 2); },
        o: 'Küçük solüt klirensi yeterli. ISPD 2020, Kt/V’nin tek başına hedef olarak değil; belirtiler, volüm, beslenme ve hasta hedefleriyle birlikte yorumlanmasını önerir.' },
      { id: 'PD-Y03', g: 'yet', s: 'info', k: 'Haftalık kreatinin klirensi < 45 L/1,73 m²', src: 'EBPG PD 2005', w: function (x) { return x.c.tCrCl != null && x.c.tCrCl < 45 && tr(x.c.tCrCl, 1) + ' L/hafta/1,73 m²'; },
        o: 'Özellikle APD uygulanan ve yavaş transport özelliği olan hastada orta molekül klirensi açısından uzun bekleme süreli değişim eklenmesi değerlendirilebilir.' },
      { id: 'PD-Y04', g: 'yet', s: 'warn', k: 'Anürik hasta (idrar < 100 mL/gün), günlük UF < 750 mL', src: 'EAPOS (JASN 2003); EBPG PD 2005', w: function (x) { var i = x.n('idrar'), u = x.n('uf'); return i != null && i < 100 && u != null && u < 750 && 'UF ' + u + ' mL/gün'; },
        o: 'Anürik hastada düşük ultrafiltrasyon kötü sağkalımla ilişkilidir. Tuz ve sıvı alımı, bekleme sürelerinin transport tipine uygunluğu, uzun beklemede ikodekstrin kullanımı ve mekanik nedenler (kateter disfonksiyonu, kaçak) gözden geçirilmelidir.' },
      { id: 'PD-Y05', g: 'yet', s: 'warn', k: 'İdrar volümü önceki ölçüme göre ≥ %30 azalmış', src: ISPD20, w: function (x) { var a = x.prevOf('idrar'), i = x.n('idrar'); return a != null && a >= 200 && i != null && i <= a * 0.7 && a + ' → ' + i + ' mL/gün'; },
        o: 'Rezidüel böbrek fonksiyonu azalıyor. Hipovolemi, nefrotoksik ilaç, kontrast ve peritonit gibi nedenlerin araştırılması; PD reçetesinin klirens ve UF açısından yeniden düzenlenmesi önerilir.' },
      { id: 'PD-Y06', g: 'yet', s: 'info', k: 'PET: D/P kreatinin > 0,81 (hızlı transport)', src: 'Twardowski 1987; ISPD 2021 (membran disfonksiyonu)', w: function (x) { var p = x.n('pet'); return p != null && p > 0.81 && 'D/P ' + tr(p, 2); },
        o: 'Hızlı transportta ozmotik gradiyent çabuk kaybolur. Kısa bekleme süreli değişimler (APD) ve uzun beklemede ikodekstrin önerilir; uzun süreli glukoz beklemelerinden kaçınılmalıdır.' },
      { id: 'PD-Y07', g: 'yet', s: 'info', k: 'PET: D/P kreatinin < 0,50 (yavaş transport)', src: 'Twardowski 1987', w: function (x) { var p = x.n('pet'); return p != null && p < 0.5 && 'D/P ' + tr(p, 2); },
        o: 'Yavaş transportta klirens için uzun bekleme süresi ve yeterli dolum volümü gerekir; SAPD veya az döngülü, uzun beklemeli APD uygundur.' },
      { id: 'PD-Y08', g: 'yet', s: 'warn', k: 'PET: %3,86 glukozla 4 saatlik net UF < 400 mL', src: 'ISPD 2021 (membran disfonksiyonu)', w: function (x) { var u = x.n('petUF'); return u != null && u < 400 && u + ' mL'; },
        o: 'Ultrafiltrasyon yetersizliği ölçütü karşılanıyor. Önce mekanik nedenlerin (kateter malpozisyonu, kaçak, rezidüel volüm artışı) dışlanması; ardından transport tipine göre reçete düzenlenmesi ve ikodekstrin kullanımı önerilir.' },
      { id: 'PD-Y09', g: 'yet', s: 'info', k: 'Son 6 ayda yeterlilik ölçümü yok', src: KDOQI06 + '; ' + ISPD20, w: function (x) { return x.c.ktv == null && x.any && !x.recent('ktv', 6); },
        o: 'Klirens ve rezidüel böbrek fonksiyonunun düzenli aralıklarla (en az 6 ayda bir; klinik değişiklikte daha erken) ölçülmesi önerilir.' },

      { id: 'PD-R01', g: 'rec', s: 'warn', k: '%3,86 glukoz düzenli kullanılıyor veya glukozlu hacmin ≥ yarısı hipertonik', src: 'ISPD 2015 (kardiyovasküler ve metabolik)', w: function (x) { var d = x.c.L['386']; return ((d != null && d > 0) || (x.c.glukVol > 0 && x.c.hiper / x.c.glukVol >= 0.5)) && 'glukoz yükü ' + x.c.gluk + ' g/gün'; },
        o: 'Periton glukoz maruziyetinin azaltılması önerilir: tuz kısıtlaması, rezidüel fonksiyon varsa loop diüretik, uzun beklemede ikodekstrin ve bekleme sürelerinin transport tipine uyarlanması ile hipertonik solüsyon gereksinimi azaltılabilir.' },
      { id: 'PD-R02', g: 'rec', s: 'info', k: 'İkodekstrin yok; hızlı/yüksek-orta transport, ödem veya düşük UF var', src: 'ISPD 2015 (kardiyovasküler ve metabolik), 2.2', w: function (x) { var ik = x.c.L.iko, p = x.n('pet'), u = x.n('uf'), od = x.v.odem && x.v.odem !== 'Yok'; if (ik == null || ik > 0) return false; var r = []; if (p != null && p >= 0.65) r.push('D/P ' + tr(p, 2)); if (od) r.push('ödem'); if (u != null && u < 500) r.push('UF ' + u + ' mL/gün'); return r.length ? r.join(', ') : false; },
        o: 'Uzun bekleme süreli değişimde günde bir kez ikodekstrin kullanımı ultrafiltrasyonu artırır ve glukoz maruziyetini azaltır; değerlendirilmesi önerilir.' },
      { id: 'PD-R03', g: 'rec', s: 'warn', k: 'İkodekstrin günde birden fazla değişim veya > 2,5 L/gün', src: 'Ürün bilgisi', w: function (x) { var ik = x.c.L.iko, n = x.n('sikoN'); return ((n != null && n > 1) || (ik != null && ik > 2.5)) && (n != null ? n + ' değişim, ' : '') + tr(ik, 1) + ' L/gün'; }, o: 'İkodekstrin günde tek değişim olarak onaylıdır; reçetenin gözden geçirilmesi önerilir.' },
      { id: 'PD-R04', g: 'kab', s: 'warn', k: 'Serum K < 3,5 mmol/L', src: 'ISPD Peritonit 2022; ' + ISPD20, w: function (x) { var k = x.n('k'); return k != null && k < 3.5 && 'K ' + tr(k, 1); },
        o: 'PD’de hipopotasemi sıktır ve peritonit ile mortalite riskiyle ilişkilidir. Beslenmenin değerlendirilmesi, potasyumdan zengin diyet veya oral potasyum, uygun hastada mineralokortikoid reseptör antagonisti değerlendirilebilir.' },
      { id: 'PD-R05', g: 'kab', s: 'warn', k: 'Serum K > 5,5 mmol/L', src: ISPD20, w: function (x) { var k = x.n('k'); return k != null && k > 5.5 && 'K ' + tr(k, 1); },
        o: 'Değişimlere uyumun, diyetin, RAAS blokeri gibi ilaçların ve klirensin gözden geçirilmesi; yineleyen durumda potasyum bağlayıcı değerlendirilmesi önerilir.' },
      { id: 'PD-R06', g: 'kab', s: 'info', k: 'Serum bikarbonat < 22 mmol/L', src: ISPD20, w: function (x) { var h = x.n('hco3'); return h != null && h < 22 && 'HCO₃ ' + tr(h, 1); }, o: 'Metabolik asidozun düzeltilmesi önerilir; klirens gözden geçirilmeli, oral bikarbonat eklenmesi değerlendirilebilir.' },
      { id: 'PD-R07', g: 'rec', s: 'info', k: 'APD, gündüz dolumu yok, anürik ve Kt/V < 1,7', src: 'EBPG PD 2005; ' + ISPD20, w: function (x) { var gd = x.n('gunduz'), i = x.n('idrar'); return x.v.tip === 'APD' && (gd == null || gd === 0) && i != null && i < 100 && x.c.ktv != null && x.c.ktv < 1.7 && 'kuru gündüz'; },
        o: 'Gündüz dolumu (transport tipine göre ikodekstrin veya glukoz) eklenmesi klirensi ve orta molekül uzaklaştırılmasını artırır; değerlendirilmesi önerilir.' },

      { id: 'PD-V01', g: 'vol', s: 'warn', k: 'Ödem var veya ağırlık hedefin > 1,5 kg üstünde', src: 'ISPD 2015 (kardiyovasküler ve metabolik); ' + ISPD20, w: function (x) { var od = x.v.odem && x.v.odem !== 'Yok', r = []; if (od) r.push('ödem ' + x.v.odem); if (x.c.dHedef != null && x.c.dHedef > 1.5) r.push('+' + tr(x.c.dHedef, 1) + ' kg'); return r.length ? r.join(', ') : false; },
        o: 'Volüm fazlalığında basamaklı yaklaşım önerilir: tuz ve sıvı kısıtlaması, değişimlere uyum, rezidüel fonksiyon varsa yüksek doz loop diüretik, bekleme sürelerinin transport tipine uyarlanması, uzun beklemede ikodekstrin, geçici olarak daha yüksek glukoz konsantrasyonu. Mekanik nedenler ve diyabetik hastada glisemi kontrolü gözden geçirilmelidir.' },
      { id: 'PD-V02', g: 'vol', s: 'warn', k: 'KB ≥ 140/90 mmHg veya ev KB ≥ 135/85', src: 'ISPD 2015 (kardiyovasküler ve metabolik)', w: function (x) { var s = x.n('S'), d = x.n('D'), es = x.n('evS'), ed = x.n('evD'); return ((s != null && s >= 140) || (d != null && d >= 90) || (es != null && es >= 135) || (ed != null && ed >= 85)) && [(s || d) ? (s || '—') + '/' + (d || '—') : '', (es || ed) ? 'ev ' + (es || '—') + '/' + (ed || '—') : ''].filter(Boolean).join(', ') + ' mmHg'; },
        o: 'İlk basamak volüm durumunun düzeltilmesidir. İlaç gerektiğinde rezidüel böbrek fonksiyonunu koruyucu etkisi nedeniyle ACE inhibitörü veya ARB tercih edilmesi önerilir.' },
      { id: 'PD-V03', g: 'vol', s: 'info', k: 'Ağırlık hedefin > 1,5 kg altında veya sistolik KB < 100', src: ISPD20, w: function (x) { var s = x.n('S'), r = []; if (x.c.dHedef != null && x.c.dHedef < -1.5) r.push(tr(x.c.dHedef, 1) + ' kg'); if (s != null && s < 100) r.push('SKB ' + s + ' mmHg'); return r.length ? r.join(', ') : false; },
        o: 'Hipovolemi rezidüel böbrek fonksiyonu kaybını hızlandırır. Hipertonik solüsyonların ve diüretik/antihipertansif dozlarının azaltılması, hedef ağırlığın yeniden belirlenmesi önerilir.' },
      { id: 'PD-V04', g: 'vol', s: 'info', k: 'İdrar ≥ 100 mL/gün, diüretik yok, volüm fazlalığı veya hipertansiyon var', src: 'Medcalf (Kidney Int 2001); ' + ISPD20, w: function (x) { var i = x.n('idrar'), f = x.n('furo'), s = x.n('S'), od = x.v.odem && x.v.odem !== 'Yok'; return i != null && i >= 100 && f === 0 && (od || (s != null && s >= 140)) && 'idrar ' + i + ' mL/gün'; },
        o: 'Loop diüretik idrar volümünü ve sodyum atılımını artırarak volüm kontrolüne yardım eder (çalışmada furosemid 250 mg/gün); başlanması değerlendirilebilir.' },
      { id: 'PD-V05', g: 'vol', s: 'info', k: 'İdrar ≥ 100 mL/gün ve RAAS blokeri yok', src: ISPD20 + '; KDOQI 2006', w: function (x) { var i = x.n('idrar'); return i != null && i >= 100 && x.v.raas === 'Yok' && 'idrar ' + i + ' mL/gün'; },
        o: 'Rezidüel böbrek fonksiyonunun korunması için, kontrendikasyon yoksa ACE inhibitörü veya ARB başlanması değerlendirilebilir; potasyum izlenmelidir.' },
      { id: 'PD-V06', g: 'vol', s: 'warn', k: 'Günlük net UF negatif', src: 'ISPD 2021 (membran disfonksiyonu)', w: function (x) { var u = x.n('uf'); return u != null && u < 0 && u + ' mL/gün'; },
        o: 'Net sıvı emilimi var. Uzun beklemede düşük glukozlu solüsyon kullanımı, hızlı transport ve mekanik nedenler (kateter, kaçak) açısından değerlendirme; gerekirse PET yinelenmesi önerilir.' },

      { id: 'PD-L01', g: 'mev', s: 'info', k: 'Diyalizin ≥ 3. ayında nakil değerlendirmesi yapılmamış', src: YON + ', Madde 31', w: function (x) { var a = aylar(x.p.basla, x.ay); return (!x.p.nakil || x.p.nakil === 'Değerlendirilmedi') && a != null && a >= 3 && 'diyalizin ' + a + '. ayı'; },
        o: 'Yönetmelik, programlı diyalize yeni başlayan hastanın en geç üç ay içinde böbrek nakli açısından değerlendirilmek üzere kamuya ait organ nakil merkezine yönlendirilmesini öngörür. Yönetmelikten önce tanı almış hastalar için süre bir yıldır (Geçici Madde 2).' }
    ]
  };
  /* ---------------- Anemi (KDIGO Anemi 2026) ve KBH-MKB (KDIGO 2017) ---------------- */
  var KA = 'KDIGO Anemi 2026', KM = 'KDIGO KBH-MKB 2017';
  var var_ = function (x, k) { return !!x.v[k] && x.v[k] !== 'Yok'; };
  function esaAd(x) { var e = x.v.esa || ''; return /Darbe/.test(e) ? 'D' : /CERA/.test(e) ? 'C' : 'E'; }
  function esaUp(x) { var t = esaAd(x); return t === 'D' ? 'darbepoetin dozunun %25 artırılması' : t === 'C' ? 'CERA dozunun 30–50 µg artırılması' : 'epoetin dozunun 25 IU/kg/doz artırılması'; }
  function esaDown(x) { var t = esaAd(x); return t === 'D' ? 'darbepoetin dozunun %25 azaltılması' : t === 'C' ? 'CERA dozunun 30–50 µg azaltılması' : 'epoetin dozunun 10–25 IU/kg/doz azaltılması'; }
  function dHb(x) { var a = x.n('hb'), b = x.pv ? val(x.p.mod, x.pv, 'hb') : null; return a != null && b != null ? r1(a - b) : null; }
  function esaOnceYok(x) { return !!x.pv && (!x.pv.esa || x.pv.esa === 'Yok' || num(x.pv.esaDoz) === 0); }
  function hipoRes(x) {
          if (!x.c.esaVar) return false; var h = x.n('hb'), ed = x.n('esaDoz'), b2 = x.back(2);
          if (b2 && b2.esa === x.v.esa && num(b2.esaDoz) > 0 && ed != null && ed >= 1.5 * num(b2.esaDoz) && h != null && val(x.p.mod, b2, 'hb') != null && h <= val(x.p.mod, b2, 'hb')) return 'doz ' + tr(num(b2.esaDoz)) + ' → ' + tr(ed) + ', Hb artmadı';
          var b1 = x.pv; if (b1 && b1.esa && b1.esa !== 'Yok' && x.back(2) && (!x.back(2).esa || x.back(2).esa === 'Yok')) { var d = dHb(x); if (d != null && d <= 0) return 'ilk ayda Hb artışı yok'; }
          return false;
  }
  function aneMkb(M) {
    var P = M + '-', pd = M === 'PD';
    return [
      { id: P + 'A01', g: 'ane', s: 'bad', k: 'ESA yok, Hb < 9,0 g/dL', src: KA + ', Öneri 3.2.1 (2D), 3.1.1 (2D)', w: function (x) { var h = x.n('hb'); return !x.c.esaVar && h != null && h < 9 && 'Hb ' + tr(h, 1); },
        o: 'ESA başlanması önerilir. Önce düzeltilebilir nedenlerin (demir eksikliği, enfeksiyon ve inflamasyon, kan kaybı, yetersiz diyaliz, hiperparatiroidi) değerlendirilmesi; ilk basamakta HIF-PHI yerine ESA tercih edilmesi önerilir.' },
      { id: P + 'A02', g: 'ane', s: 'warn', k: 'ESA yok, Hb 9,0–10,0 g/dL', src: KA + ', Öneri 3.2.1 (2D)', w: function (x) { var h = x.n('hb'); return !x.c.esaVar && h != null && h >= 9 && h <= 10 && 'Hb ' + tr(h, 1); },
        o: 'Diyaliz hastasında ESA başlama eşiği Hb ≤ 9,0–10,0 g/dL’dir. Belirtiler, transfüzyon gereksinimi ve demir durumu birlikte değerlendirilerek ESA başlanması değerlendirilebilir.' },
      { id: P + 'A03', g: 'ane', s: 'warn', k: 'ESA altında Hb > 11,5 g/dL', src: KA + ', Öneri 3.3.1 (1D); Uygulama noktası 3.4.3.2', w: function (x) { var h = x.n('hb'); return x.c.esaVar && h != null && h > 11.5 && 'Hb ' + tr(h, 1); },
        o: function (x) { return 'İdame tedavide Hb’nin 11,5 g/dL altında tutulması önerilir; ' + esaDown(x) + ' önerilir. Hızlı Hb düşüşünü önlemek için ESA’nın tümüyle kesilmesi yerine doz azaltılması tercih edilir; Hb belirgin yüksekse geçici ara verilmesi değerlendirilebilir.'; } },
      { id: P + 'A04', g: 'ane', s: 'warn', k: 'ESA başlangıcından sonra Hb artışı > 1,0 g/dL', src: KA + ', Uygulama noktası 3.4.1.2', w: function (x) { var d = dHb(x); return x.c.esaVar && esaOnceYok(x) && d != null && d > 1 && '+' + tr(d, 1) + ' g/dL'; },
        o: 'Başlangıçtan sonraki 2–4 haftada Hb artışı 1,0 g/dL’yi aşarsa ESA dozunun %25–50 azaltılması önerilir.' },
      { id: P + 'A05', g: 'ane', s: 'warn', k: 'ESA altında aylık Hb artışı > 2,0 g/dL', src: KA + ', Tablo 7', w: function (x) { var d = dHb(x); return x.c.esaVar && !esaOnceYok(x) && d != null && d > 2 && '+' + tr(d, 1) + ' g/dL'; },
        o: function (x) { return 'Hızlı Hb artışı; ' + esaDown(x) + ' önerilir.'; } },
      { id: P + 'A06', g: 'ane', s: 'info', k: 'ESA altında Hb ≤ 10,0 g/dL, aylık artış < 1,0 g/dL, direnç tanımı karşılanmıyor', src: KA + ', Tablo 7; Uygulama noktası 3.4.1.2', w: function (x) { var h = x.n('hb'), d = dHb(x); return x.c.esaVar && !esaOnceYok(x) && h != null && h <= 10 && d != null && d < 1 && !hipoRes(x) && 'Hb ' + tr(h, 1) + ' (' + (d >= 0 ? '+' : '') + tr(d, 1) + ')'; },
        o: function (x) { return 'Demir durumu, enfeksiyon ve inflamasyon, kan kaybı ve diyaliz yeterliliği gözden geçirildikten sonra ' + esaUp(x) + ' önerilir. Doz değişikliği 4 haftada birden sık yapılmamalıdır.'; } },
      { id: P + 'A07', g: 'ane', s: 'warn', k: 'ESA hiporesponsivitesi olasılığı', src: KA + ', Tablo 7, Tablo 10; Uygulama noktaları 3.4.1.2, 3.7.1–3.7.5', w: hipoRes,
        o: function (x) { return 'Hiporesponsivite: ilk ay sonunda Hb artışı olmaması veya stabil Hb için dozun stabil dozun %50 üzerine iki kez artırılması. Önce düzeltilebilir nedenlerin (demir eksikliği, enfeksiyon ve inflamasyon, yetersiz diyaliz, hiperparatiroidi, kan kaybı, hemoliz) araştırılması önerilir. ESA direncinde dozun artırılması önerilmez; mevcut dozla sürdürülerek nedenlerin giderilmesi önerilir. Başlangıç veya stabil dozun iki katının ötesine yinelenen artışlardan kaçınılmalıdır. Süren dirençte 3–4 aylık HIF-PHI denemesi değerlendirilebilir (aktif malignite, yakın kardiyovasküler olay veya tromboz varsa kullanılmaz).'; } },
      { id: P + 'A08', g: 'ane', s: 'bad', k: 'ESA ve HIF-PHI birlikte', src: KA + ', Uygulama noktası 3.5.1', w: function (x) { return x.c.esaVar && var_(x, 'hifphi') && 'ESA + HIF-PHI'; }, o: 'ESA ile HIF-PHI birlikte kullanılmamalıdır; birinin kesilmesi önerilir.' },
      { id: P + 'A09', g: 'ane', s: 'info', k: 'HIF-PHI kullanılıyor', src: KA + ', Öneri 3.1.1; Uygulama noktaları 3.1.3, 3.6.1, 3.7.4', w: function (x) { return var_(x, 'hifphi') && 'HIF-PHI'; },
        o: 'Kaçınılacak durumlar: aktif kanser veya tam remisyonda olmayan kanser öyküsü, ADPKD, proliferatif retinopati, pulmoner arteriyel hipertansiyon, gebelik, geçirilmiş kardiyovasküler veya tromboembolik olay, erişim trombozu, karaciğer hastalığı, nöbet öyküsü. Hb’nin 4 haftada bir izlenmesi; direnç nedeniyle başlandıysa 3–4 ayda yanıt yoksa kesilmesi önerilir.' },
      { id: P + 'A10', g: 'ane', s: 'bad', k: 'Hb < 7,0 g/dL', src: KA + ', Uygulama noktaları 4.1–4.5', w: function (x) { var h = x.n('hb'); return h != null && h < 7 && 'Hb ' + tr(h, 1); },
        o: function (x) { var ad = x.p.nakil && /Bekleme|yönlendirildi/.test(x.p.nakil); return 'Ağır anemi. Transfüzyon kararı sabit bir Hb eşiğine göre değil, aneminin belirti ve bulgularına göre verilmelidir; akut kanama veya hemodinamik instabilitede gecikmemelidir. Kan kaybı ve hemoliz araştırılması önerilir.' + (ad ? ' Hasta nakil adayıdır: HLA duyarlanmasını önlemek için transfüzyondan olabildiğince kaçınılmalıdır.' : ' Nakil adayı olup olmadığı transfüzyon kararında dikkate alınmalıdır.'); } },
      { id: P + 'A11', g: 'ane', s: 'info', k: 'ESA altında yeni tromboembolik olay veya erişim trombozu', src: KA + ', Uygulama noktası 3.4.3.4', w: function (x) { return x.c.esaVar && var_(x, 'tromboz') && 'tromboz'; },
        o: 'Akut inme, erişim trombozu veya tromboembolik olay nedeniyle hastanede yatış süresince ESA’ya ara verilmesi makuldür; Hb’nin hedefin üzerinde olup olmadığı gözden geçirilmelidir.' },
      { id: P + 'A12', g: 'ane', s: 'info', k: 'Kan kaybı / kanama bildirildi', src: KA, w: function (x) { return var_(x, 'kanama') && 'kanama'; },
        o: 'Kanama kaynağının araştırılması ve demir parametrelerinin daha sık izlenmesi önerilir; antikoagülan ve antiagregan tedavi gözden geçirilmelidir.' },
      pd ? { id: P + 'D01', g: 'ane', s: 'warn', k: 'Demir yok; ferritin < 100 ve TSAT < %40 veya ferritin 100–299 ve TSAT < %25', src: KA + ', Öneri 2.3 (2D), 2.4 (2D)', w: function (x) { var f = x.n('ferritin'), t = x.n('tsat'); return !var_(x, 'demir') && f != null && t != null && ((f < 100 && t < 40) || (f >= 100 && f <= 299 && t < 25)) && 'ferritin ' + tr(f) + ', TSAT %' + tr(t); },
          o: 'Demir tedavisi başlanması önerilir. PD’de oral veya IV demir seçimi; aneminin ve demir eksikliğinin derecesi, etkinlik, tolerabilite, hasta tercihi ve erişim göz önüne alınarak yapılır.' }
         : { id: P + 'D01', g: 'ane', s: 'warn', k: 'Demir yok; ferritin ≤ 500 ve TSAT ≤ %30', src: KA + ', Öneri 2.1 (2D), 2.2 (2D); Uygulama noktası 2.1', w: function (x) { var f = x.n('ferritin'), t = x.n('tsat'); return !var_(x, 'demir') && f != null && t != null && f <= 500 && t <= 30 && 'ferritin ' + tr(f) + ', TSAT %' + tr(t); },
          o: 'IV demir başlanması önerilir; HD’de oral yerine IV demir tercih edilir. İdamede proaktif düzenli dozlama uygundur (PIVOTAL örneği: ferritin > 700 ng/mL veya TSAT ≥ %40 olmadıkça ayda 400 mg IV demir sükroz).' },
      { id: P + 'D02', g: 'ane', s: 'warn', k: 'Demir altında ferritin > 700 ng/mL veya TSAT ≥ %40', src: KA + ', Uygulama noktası 2.2', w: function (x) { var f = x.n('ferritin'), t = x.n('tsat'); return var_(x, 'demir') && ((f != null && f > 700) || (t != null && t >= 40)) && [(f != null ? 'ferritin ' + tr(f) : ''), (t != null ? 'TSAT %' + tr(t) : '')].filter(Boolean).join(', '); },
        o: 'Rutin demir tedavisine ara verilmesi makuldür; değerler eşiğin altına inince yeniden başlanabilir.' },
      { id: P + 'D03', g: 'ane', s: 'warn', k: 'Aktif sistemik enfeksiyon sırasında demir tedavisi', src: KA + ', Uygulama noktası 2.8', w: function (x) { return var_(x, 'demir') && var_(x, 'enf') && 'enfeksiyon'; }, o: 'Sistemik enfeksiyon süresince demir tedavisine geçici olarak ara verilmesi düşünülmelidir.' },
      { id: P + 'D04', g: 'ane', s: 'info', k: 'Ferritin ve TSAT birlikte değil', src: KA + ', Öneri 2.1–2.3', w: function (x) { var f = x.n('ferritin'), t = x.n('tsat'); return (f == null) !== (t == null) && (f == null ? 'ferritin yok' : 'TSAT yok'); }, o: 'Demir başlama ve ara verme kararları ferritin ile TSAT’ın birlikte değerlendirilmesine dayanır; eksik olanın istenmesi önerilir.' },
      { id: P + 'D05', g: 'ane', s: 'info', k: 'Son 3 ayda ferritin/TSAT ölçümü yok', src: KA + ', Uygulama noktası 2.5', w: function (x) { return x.any && !x.seen('ferritin', 2) && !x.seen('tsat', 2); }, o: pd ? 'PD’de demir parametrelerinin 3 ayda bir ölçülmesi makuldür; ESA başlanması veya doz artışı, kan kaybı ve yatış sonrasında daha sık izlenmelidir.' : 'HD’de demir parametrelerinin 1–3 ayda bir ölçülmesi makuldür; ESA başlanması veya doz artışı, kan kaybı ve yatış sonrasında daha sık izlenmelidir.' },

      { id: P + 'M01', g: 'mkb', s: 'bad', k: 'Fosfor iki ardışık ölçümde > 5,5 mg/dL', src: KM + ', Öneri 4.1.2 (2C), 4.1.5, 4.1.6 (2B), 4.1.8 (2D), 4.1.9 (2C)', w: function (x) { var p = x.n('p'), q = x.prevOf('p'); return p != null && q != null && p > 5.5 && q > 5.5 && tr(q, 1) + ' → ' + tr(p, 1) + ' mg/dL'; },
        o: function (x) { return 'Israrcı hiperfosfatemi. Diyet fosfor kısıtlaması (fosfor kaynağına, özellikle katkı maddelerine dikkat), bağlayıcı uyumu ve dozunun gözden geçirilmesi; kalsiyum içeren bağlayıcı dozunun kısıtlı tutulması ve gerekirse kalsiyum içermeyen bağlayıcı eklenmesi; ' + (pd ? 'PD reçetesinin klirens açısından gözden geçirilmesi' : 'seans süresi veya sıklığının artırılarak diyalitik fosfor uzaklaştırılmasının artırılması') + ' önerilir.' + (var_(x, 'vitD') ? ' Aktif D vitamininin azaltılması veya kesilmesi önerilir.' : ''); } },
      { id: P + 'M02', g: 'mkb', s: 'warn', k: 'Fosfor iki ardışık ölçümde > 4,5 mg/dL', src: KM + ', Öneri 4.1.2 (2C), 4.1.5, 4.1.8 (2D)', w: function (x) { var p = x.n('p'), q = x.prevOf('p'); return p != null && q != null && p > 4.5 && q > 4.5 && !(p > 5.5 && q > 5.5) && tr(q, 1) + ' → ' + tr(p, 1) + ' mg/dL'; },
        o: 'Yüksek fosforun normal aralığa doğru düşürülmesi önerilir: diyet fosfor kısıtlaması, bağlayıcı uyumu ve dozu, diyaliz dozunun gözden geçirilmesi.' },
      { id: P + 'M03', g: 'mkb', s: 'info', k: 'Fosfor > 4,5 mg/dL (tek ölçüm)', src: KM + ', Öneri 4.1.5', w: function (x) { var p = x.n('p'), q = x.prevOf('p'); return p != null && p > 4.5 && (q == null || q <= 4.5) && tr(p, 1) + ' mg/dL'; },
        o: 'Tedavi kararı tek değere değil, ısrarcı veya ilerleyen yüksekliğe dayanmalıdır; bir sonraki ölçümle doğrulanması ve diyet öyküsünün alınması önerilir.' },
      { id: P + 'M04', g: 'mkb', s: 'warn', k: 'Hiperkalsemi (düzeltilmiş Ca > 10,2 mg/dL)', src: KM + ', Öneri 4.1.3 (2C), 4.1.6 (2B), 4.2.4 (1B)', w: function (x) { return x.c.dca != null && x.c.dca > 10.2 && (x.c.dcaAlb ? 'düzeltilmiş ' : '') + 'Ca ' + tr(x.c.dca, 2); },
        o: function (x) { var a = []; if (var_(x, 'vitD')) a.push('kalsitriol veya D vitamini analoğunun azaltılması ya da kesilmesi'); if (var_(x, 'caBag')) a.push('kalsiyum içeren bağlayıcının azaltılması veya kalsiyum içermeyene geçilmesi'); if (!pd) a.push('diyalizat kalsiyumunun 1,25 mmol/L olması'); return 'Hiperkalsemiden kaçınılması önerilir' + (a.length ? ': ' + a.join('; ') + '.' : '.') + ' Diğer nedenler (immobilizasyon, nutrisyonel D vitamini fazlalığı, granülomatöz hastalık, malignite) akla getirilmelidir.'; } },
      { id: P + 'M05', g: 'mkb', s: 'warn', k: 'Kalsiyum içeren bağlayıcı; hiperkalsemi veya iPTH < 2 × üst sınır', src: KM + ', Öneri 4.1.6 (2B)', w: function (x) { return var_(x, 'caBag') && ((x.c.dca != null && x.c.dca > 10.2) || (x.c.pthX != null && x.c.pthX < 2)) && (x.c.pthX != null && x.c.pthX < 2 ? 'iPTH ' + tr(x.c.pthX, 1) + ' × üst sınır' : 'Ca ' + tr(x.c.dca, 2)); },
        o: 'Kalsiyum içeren bağlayıcı dozunun kısıtlanması önerilir; hiperkalsemi veya baskılanmış PTH (adinamik kemik riski) varlığında kalsiyum içermeyen bağlayıcı tercih edilmelidir.' },
      { id: P + 'M06', g: 'mkb', s: 'info', k: 'Kalsiyum içeren bağlayıcı kullanılıyor', src: KM + ', Öneri 4.1.6 (2B)', w: function (x) { var e = x.n('caBagEl'); return var_(x, 'caBag') && !((x.c.dca != null && x.c.dca > 10.2) || (x.c.pthX != null && x.c.pthX < 2)) && (e != null ? 'elemental Ca ' + tr(e) + ' mg/gün' : x.v.caBag); },
        o: 'Fosfor düşürücü tedavi alan diyaliz hastasında kalsiyum içeren bağlayıcı dozunun kısıtlı tutulması önerilir.' },
      { id: P + 'M07', g: 'mkb', s: 'warn', k: 'Aktif D vitamini altında fosfor > 5,5 mg/dL', src: KM + ', Öneri 4.2.4 (2D)', w: function (x) { var p = x.n('p'); return var_(x, 'vitD') && p != null && p > 5.5 && 'P ' + tr(p, 1); }, o: 'Hiperfosfatemide kalsitriol veya D vitamini analoğunun azaltılması ya da kesilmesi önerilir.' },
      { id: P + 'M08', g: 'mkb', s: 'warn', k: 'Kalsimimetik altında düzeltilmiş Ca < 8,0 mg/dL', src: KM + ', Öneri 4.1.3, 4.2.4 (2D)', w: function (x) { return var_(x, 'kalsim') && x.c.dca != null && x.c.dca < 8 && 'Ca ' + tr(x.c.dca, 2); },
        o: 'Hafif ve asemptomatik hipokalsemi kalsiyum yüklemesinden kaçınmak için tolere edilebilir. Belirgin veya semptomatik hipokalsemide kalsimimetiğin şiddete, eşlik eden ilaçlara ve klinik belirtilere göre azaltılması veya kesilmesi; QT uzaması açısından EKG değerlendirilmesi önerilir.' },
      { id: P + 'M09', g: 'mkb', s: 'info', k: 'Kalsimimetik yok, düzeltilmiş Ca < 8,4 mg/dL', src: KM + ', Öneri 4.1.3', w: function (x) { return !var_(x, 'kalsim') && x.c.dca != null && x.c.dca < 8.4 && 'Ca ' + tr(x.c.dca, 2); }, o: 'Hipokalseminin nedenlerinin (25(OH)D eksikliği, hipomagnezemi, yetersiz alım) değerlendirilmesi ve belirtiye göre kişiselleştirilmiş tedavi önerilir.' },
      { id: P + 'M10', g: 'mkb', s: 'warn', k: 'iPTH > 9 × üst sınır', src: KM + ', Öneri 4.2.3 (2C), 4.2.4 (2B)', w: function (x) { return x.c.pthX != null && x.c.pthX > 9 && 'iPTH ' + tr(x.n('pth')) + ' pg/mL (' + tr(x.c.pthX, 1) + ' ×)'; },
        o: function (x) { var ca = x.c.dca, p = x.n('p'), s = 'PTH düşürücü tedavinin başlanması veya artırılması önerilir: kalsimimetik, kalsitriol veya D vitamini analoğu ya da kombinasyonu. İlk seçim Ca, P ve diğer MKB parametrelerine göre yapılır'; var e = []; if ((ca != null && ca >= 9.5) || (p != null && p > 5.5)) e.push('Ca veya P yüksek olduğundan kalsimimetik öne çıkar'); else if (ca != null && ca < 8.5) e.push('Ca düşük olduğundan kalsitriol veya D vitamini analoğu öne çıkar'); s += e.length ? ' (' + e.join('; ') + ').' : '.'; s += ' Hiperfosfatemi ve 25(OH)D eksikliği düzeltilmelidir.'; return s; } },
      { id: P + 'M11', g: 'mkb', s: 'warn', k: 'iPTH < 2 × üst sınır, PTH düşürücü tedavi altında', src: KM + ', Öneri 4.2.4 (2C)', w: function (x) { return x.c.pthX != null && x.c.pthX < 2 && (var_(x, 'vitD') || var_(x, 'kalsim')) && 'iPTH ' + tr(x.n('pth')) + ' pg/mL (' + tr(x.c.pthX, 1) + ' ×)'; }, o: 'Kalsitriol, D vitamini analoğu ve/veya kalsimimetiğin azaltılması ya da kesilmesi önerilir.' },
      { id: P + 'M12', g: 'mkb', s: 'info', k: 'iPTH hedef aralıkta, önceki ölçüme göre ≥ %30 değişim', src: KM + ', Öneri 4.2.3 (2C)', w: function (x) { var a = x.n('pth'), b = x.prevOf('pth'); return x.c.pthX != null && x.c.pthX >= 2 && x.c.pthX <= 9 && a != null && b && Math.abs(a - b) / b >= 0.3 && tr(b) + ' → ' + tr(a) + ' pg/mL'; },
        o: 'Hedef aralık (2–9 × üst sınır) içinde de belirgin değişimler, aralık dışına çıkmayı önlemek için tedavinin başlanmasını veya değiştirilmesini tetiklemelidir.' },
      { id: P + 'M13', g: 'mkb', s: 'info', k: 'iPTH iki ardışık ölçümde > 9 × üst sınır, kalsimimetik ve aktif D vitamini altında', src: KM + ', Öneri 4.2.5 (2B)', w: function (x) { var b = x.prevOf('pth'); return x.c.pthX != null && x.c.pthX > 9 && b != null && b / x.c.pthUst > 9 && var_(x, 'kalsim') && var_(x, 'vitD') && 'iPTH ' + tr(x.n('pth')) + ' pg/mL'; },
        o: 'Tıbbi tedaviye yanıtsız ağır hiperparatiroidide paratiroidektomi önerilir; cerrahi değerlendirme ve paratiroid görüntülemesi için yönlendirme değerlendirilebilir.' },
      { id: P + 'M14', g: 'mkb', s: 'info', k: '25(OH)D < 20 ng/mL, nutrisyonel D vitamini yok', src: KM + ', Öneri 3.1.3 (2C). Eşik genel popülasyon tanımıdır.', w: function (x) { var d = x.n('d25'); return d != null && d < 20 && !var_(x, 'natD') && tr(d, 1) + ' ng/mL'; }, o: 'D vitamini eksikliğinin genel popülasyon için önerilen stratejilerle (kolekalsiferol veya ergokalsiferol) düzeltilmesi önerilir.' },
      { id: P + 'M15', g: 'mkb', s: 'info', k: 'Son 3 ayda Ca/P veya son 6 ayda iPTH ölçümü yok', src: KM + ', Öneri 3.1.2', w: function (x) { if (!x.any) return false; var r = []; if (!x.seen('p', 2)) r.push('fosfor'); if (!x.seen('ca', 2)) r.push('kalsiyum'); if (!x.seen('pth', 5)) r.push('iPTH'); return r.length ? r.join(', ') + ' eksik' : false; },
        o: 'Diyaliz hastasında Ca ve P’nin 1–3 ayda bir, iPTH’nin 3–6 ayda bir, ALP’nin yılda bir (PTH yüksekse daha sık) ölçülmesi makuldür; tedavi alan hastada sıklık artırılabilir.' },
      { id: P + 'M16', g: 'mkb', s: 'info', k: 'iPTH üst sınırı girilmemiş', src: KM + ', Öneri 4.2.3', w: function (x) { return x.c.pthX != null && x.c.pthUstVars && 'varsayılan 65 pg/mL'; }, o: 'PTH hedefi testin üst sınırının katı olarak tanımlanır (2–9 ×). Laboratuvarınızın üst sınırının girilmesi önerilir; girilmezse 65 pg/mL kabul edilir.' }
    ];
  }
  /* ---------------- Potasyum ve asit-baz ---------------- */
  var KK = 'KDIGO Tartışmalar Konferansı: potasyum (2020)';
  function kab(M) {
    var P = M + '-', pd = M === 'PD';
    return [
      { id: P + 'K01', g: 'kab', s: 'warn', k: 'Potasyum bağlayıcı altında K < ' + (pd ? '3,5' : '4,0') + ' mmol/L', src: KK + '; ürün bilgileri', w: function (x) { var k = x.n('k'); return var_(x, 'kBag') && k != null && k < (pd ? 3.5 : 4) && 'K ' + tr(k, 1); }, o: 'Bağlayıcı dozunun azaltılması veya kesilmesi önerilir.' },
      { id: P + 'K02', g: 'kab', s: 'warn', k: 'İki ardışık ölçümde K > 5,5 mmol/L, bağlayıcı yok', src: KK + '; DIALIZE (CJASN 2021)', w: function (x) { var k = x.n('k'), q = x.prevOf('k'); return !var_(x, 'kBag') && k != null && q != null && k > 5.5 && q > 5.5 && tr(q, 1) + ' → ' + tr(k, 1); },
        o: pd ? 'Diyet, uyum ve ilaçlar gözden geçirildikten sonra potasyum bağlayıcı değerlendirilebilir (ör. sodyum zirkonyum siklosilikat 5 g/gün).' : 'Diyet, diyaliz dozu, resirkülasyon ve ilaçlar gözden geçirildikten sonra potasyum bağlayıcı değerlendirilebilir. Sodyum zirkonyum siklosilikat HD’de diyaliz dışı günlerde 5 g ile başlanır, 5 g basamaklarla en fazla 15 g’a çıkılabilir.' },
      { id: P + 'K03', g: 'kab', s: 'info', k: 'Sodyum polistiren sülfonat kullanılıyor', src: 'Ürün bilgisi; FDA uyarısı', w: function (x) { return x.v.kBag === 'Sodyum polistiren sülfonat' && 'SPS'; }, o: 'Özellikle sorbitolle birlikte kolon nekrozu bildirilmiştir; sodyum yükü volümü artırabilir. Uzun süreli kullanımda daha yeni bağlayıcılar değerlendirilebilir; diğer oral ilaçlarla arasında en az 3 saat bırakılmalıdır.' },
      { id: P + 'K04', g: 'kab', s: 'info', k: 'Sodyum zirkonyum siklosilikat ve volüm fazlalığı', src: 'Ürün bilgisi', w: function (x) { var od = x.v.odem && x.v.odem !== 'Yok'; return x.v.kBag === 'Sodyum zirkonyum siklosilikat' && (od || (x.c.idwg != null && x.c.idwg > 4.5)) && 'SZC + ' + (od ? 'ödem' : 'kilo alımı %' + tr(x.c.idwg, 1)); }, o: 'Her 5 g yaklaşık 400 mg sodyum içerir; ödem ve kilo alımı izlenmeli, gerekirse doz ve tuz alımı gözden geçirilmelidir.' },
      { id: P + 'K05', g: 'kab', s: 'info', k: 'Kabızlık ve K > 5,0 mmol/L', src: KK, w: function (x) { var k = x.n('k'); return x.v.kabiz === 'Var' && k != null && k > 5 && 'K ' + tr(k, 1); }, o: 'Kolonik potasyum atılımı diyaliz hastasında önemlidir; kabızlığın tedavi edilmesi önerilir.' },
      { id: P + 'K06', g: 'kab', s: 'info', k: 'K > 5,5 mmol/L ve RAAS blokeri / MRA kullanımı', src: KK, w: function (x) { var k = x.n('k'), i = x.v.kIlac || (x.v.raas && x.v.raas !== 'Yok' ? 'RAAS blokeri' : ''); return k != null && k > 5.5 && i && i !== 'Yok' && i !== 'Diğer' && i + ', K ' + tr(k, 1); }, o: 'Bu ilaçların kardiyovasküler ve rezidüel fonksiyon yararı göz önüne alınarak, kesmeden önce diyet, diyaliz ve bağlayıcı seçeneklerinin değerlendirilmesi önerilir.' },
      { id: P + 'K07', g: 'kab', s: 'info', k: 'Oral bikarbonat altında HCO₃ > 26 mmol/L', src: 'KDOQI Nutrisyon 2020, 6.1', w: function (x) { var h = x.n('hco3'); return var_(x, 'bikarb') && h != null && h > 26 && 'HCO₃ ' + tr(h, 1); }, o: 'Oral bikarbonat dozunun azaltılması önerilir; sodyum yükü volümü artırabilir.' }
    ];
  }
  /* ---------------- Damar erişimi / PD kateteri ve peritonit ---------------- */
  var KV = 'KDOQI Damar Erişimi 2019; Oxford Handbook of Dialysis; Interventional Nephrology', KP = 'ISPD Peritonit 2022; ISPD Kateter enfeksiyonu 2023; Oxford Handbook of Dialysis';
  var ERI_RULES_HD = [
    { id: 'HD-E01', g: 'eri', s: 'warn', k: 'Erişim akımı düşük (fistül < 500, greft < 600 mL/dk)', src: KV, w: function (x) { var q = x.n('qa'), e = x.v.erisim || ''; return q != null && ((/fistül/.test(e) && q < 500) || (/greft/.test(e) && q < 600)) && 'Qa ' + tr(q) + ' mL/dk'; }, o: 'Darlık açısından fizik muayene ve görüntüleme (Doppler ultrason veya fistülografi) ile girişimsel nefroloji ya da damar cerrahisi değerlendirmesi önerilir.' },
    { id: 'HD-E02', g: 'eri', s: 'warn', k: 'Erişim akımında önceki ölçüme göre > %25 düşüş', src: KV, w: function (x) { var q = x.n('qa'), b = x.prevOf('qa'); return q != null && b && (b - q) / b > 0.25 && tr(b) + ' → ' + tr(q) + ' mL/dk'; }, o: 'Belirgin akım düşüşü darlığı düşündürür; görüntüleme ile değerlendirme önerilir.' },
    { id: 'HD-E03', g: 'eri', s: 'warn', k: 'Resirkülasyon > %10', src: KV, w: function (x) { var r = x.n('resirk'); return r != null && r > 10 && '%' + tr(r); }, o: 'İğne yerleşimi (ters bağlanma, iğneler arası mesafe) kontrol edilmeli; düzeltilemiyorsa venöz çıkış darlığı açısından değerlendirme önerilir.' },
    { id: 'HD-E04', g: 'eri', s: 'warn', k: 'Dinamik venöz basınç > 150 mmHg', src: 'Oxford Handbook of Dialysis', w: function (x) { var v = x.n('venBas'); return v != null && v > 150 && tr(v) + ' mmHg'; }, o: 'Venöz çıkış darlığını düşündürür; fizik muayene ve görüntüleme önerilir.' },
    { id: 'HD-E05', g: 'eri', s: 'warn', k: 'Erişim fizik muayenesinde anormal bulgu', src: KV, w: function (x) { return x.v.fm && x.v.fm !== 'Normal' && x.v.fm; },
      o: function (x) { var f = x.v.fm; return (/Zayıf/.test(f) ? 'Zayıf thrill veya üfürüm giriş darlığını ya da tromboz riskini düşündürür.' : /Hiperpulsatil|çökmüyor/.test(f) ? 'Hiperpulsatilite ve kol kaldırmada venin çökmemesi çıkış darlığını düşündürür.' : /kanama/.test(f) ? 'Uzamış kanama artmış intraaksess basıncı, yani venöz darlığı düşündürür; antikoagülan dozu da gözden geçirilmelidir.' : 'Kol veya yüz ödemi santral ven darlığını düşündürür.') + ' Görüntüleme ve girişimsel değerlendirme önerilir.'; } },
    { id: 'HD-E06', g: 'eri', s: 'warn', k: 'Kateterde Qb < 300 mL/dk', src: KV + '; CDT Nephrology & Hypertension', w: function (x) { var q = x.n('qb'); return /kateter/i.test(x.v.erisim || '') && q != null && q < 300 && 'Qb ' + tr(q) + ' mL/dk'; }, o: 'Kateter disfonksiyonu. Hasta pozisyonu ve lümenlerin ters bağlanması denenebilir; trombotik tıkanıklıkta lümen başına 2 mg alteplaz 30–60 dk (yanıt yoksa interdiyalitik) bekletilebilir. Yineleyen disfonksiyonda fibrin kılıfı açısından değerlendirme ve kateter değişimi önerilir.' },
    { id: 'HD-E07', g: 'eri', s: 'info', k: 'Ayda ≥ 2 alteplaz uygulaması', src: KV, w: function (x) { var a = x.n('alteplaz'); return a != null && a >= 2 && a + ' kez'; }, o: 'Yineleyen trombotik disfonksiyon; kilit solüsyonu, kateter ucu konumu ve fibrin kılıfı değerlendirilmeli, kateter değişimi ve kalıcı erişim planı gözden geçirilmelidir.' },
    { id: 'HD-E08', g: 'eri', s: 'info', k: 'Kateterle diyaliz', src: KV, w: function (x) { var e = x.v.erisim || ''; if (!/kateter/i.test(e)) return false; var d = aylar(x.v.katBas, x.ay); return e + (d != null ? ', ' + d + '. ay' : ''); },
      o: function (x) { var d = aylar(x.v.katBas, x.ay); return 'Hastanın yaşam planına uygun kalıcı erişim (AV fistül veya greft) seçeneğinin değerlendirilmesi ve kateter süresinin kısaltılması önerilir.' + (d != null && d >= 3 ? ' Kateter 3 aydır ya da daha uzun süredir yerinde.' : '') + (x.v.erisim === 'Geçici kateter' ? ' Geçici kateter uzun süreli kullanım için uygun değildir; tünelli kateter veya kalıcı erişim planlanmalıdır.' : ''); } },
    { id: 'HD-E09', g: 'eri', s: 'bad', k: 'Kateter ilişkili kan dolaşımı enfeksiyonu', src: KV + '; CDT Nephrology & Hypertension; Interventional Nephrology', w: function (x) { return x.v.crbsi === 'Var' && (x.v.etken || 'etken bilinmiyor'); },
      o: function (x) { var e = x.v.etken || '', cik = /aureus|Pseudomonas|Candida/.test(e); return 'Kateter ve periferden kan kültürü alınarak ampirik Gram-pozitif (vankomisin veya sefazolin) ve Gram-negatif (seftazidim veya aminoglikozid) tedavi; komplike olmayan olguda sistemik tedaviye ek antibiyotik kilit önerilir. ' + (cik ? 'S. aureus, Pseudomonas veya Candida etkeninde kateterin çıkarılması önerilir. ' : 'Kateter çıkarma endikasyonları: S. aureus, Pseudomonas, Candida, 48–72 saatlik tedaviye rağmen süren ateş veya bakteriyemi, tünel enfeksiyonu, septik tromboflebit, endokardit, metastatik enfeksiyon. ') + 'Süre: komplike olmayan koagülaz negatif stafilokokta 10–14 gün; S. aureus, Pseudomonas ve komplike olgularda 3–4 hafta.'; } },
    { id: 'HD-E10', g: 'eri', s: 'warn', k: 'Kateter çıkış yeri enfeksiyonu', src: 'Oxford Handbook of Dialysis; Interventional Nephrology', w: function (x) { return x.v.esi === 'Enfekte' && x.v.tunel !== 'Var' && 'çıkış yeri'; }, o: 'Kültür alınarak topikal bakım ve oral antibiyotik (ör. sefaleksin) önerilir; yanıt yoksa veya bakteriyemi gelişirse kateter değişimi değerlendirilmelidir.' },
    { id: 'HD-E11', g: 'eri', s: 'bad', k: 'Tünel enfeksiyonu', src: 'Interventional Nephrology; CDT Nephrology & Hypertension', w: function (x) { return x.v.tunel === 'Var' && 'tünel'; }, o: 'Tünel enfeksiyonunda parenteral antibiyotik ve genellikle kateterin çıkarılması gerekir; yeni kateter farklı bir yerden takılmalıdır.' }
  ];
  var ERI_RULES_PD = [
    { id: 'PD-E01', g: 'eri', s: 'bad', k: 'Peritonit: diyalizat lökosit > 100/µL ve nötrofil > %50', src: KP, w: function (x) { var l = x.n('pLok'), p = x.n('pPmn'); return (l != null && l > 100 && p != null && p > 50 || x.v.perit === 'Var') && (l != null ? 'lökosit ' + tr(l) + '/µL' + (p != null ? ', nötrofil %' + tr(p) : '') : 'peritonit'); },
      o: 'Tanı için şu üç ölçütten ikisi gerekir: karın ağrısı ve/veya bulanık diyalizat, lökosit > 100/µL ve nötrofil > %50 (en az 2 saatlik bekleme sonrası), pozitif Gram boyama veya kültür. Kültür alındıktan sonra intraperitoneal ampirik tedavi önerilir: Gram-pozitif için sefazolin veya vankomisin, Gram-negatif için seftazidim veya aminoglikozid. Antibiyotik süresince fungal profilaksi (nistatin veya flukonazol) eklenmelidir.' },
    { id: 'PD-E02', g: 'eri', s: 'warn', k: 'Peritonit etkenine göre tedavi süresi', src: KP, w: function (x) { var e = x.v.pEtken; return e && e !== 'Kültür bekleniyor' && e !== 'Fungal' && e; },
      o: function (x) { var e = x.v.pEtken; return /Koagülaz|Streptokok|Kültür negatif/.test(e) ? 'Önerilen süre 2 haftadır (14 gün).' : /Pseudomonas/.test(e) ? 'Önerilen süre 3 haftadır; farklı mekanizmalı iki antibiyotik kullanılmalıdır. Eşlik eden çıkış yeri veya tünel enfeksiyonunda kateter çıkarılmalıdır.' : /Polimikrobiyal/.test(e) ? 'Enterik polimikrobiyal peritonitte cerrahi patoloji (perforasyon) araştırılmalıdır; süre 3 haftadır, anaerop kapsamı eklenmelidir.' : 'Önerilen süre 3 haftadır (21 gün).'; } },
    { id: 'PD-E03', g: 'eri', s: 'bad', k: 'Fungal peritonit', src: KP, w: function (x) { return x.v.pEtken === 'Fungal' && 'fungal'; }, o: 'Fungal peritonitte kateterin hemen çıkarılması ve antifungal tedavi önerilir.' },
    { id: 'PD-E04', g: 'eri', s: 'bad', k: 'Refrakter peritonit: 5. günde yanıt yok', src: KP, w: function (x) { return x.v.pYanit === 'Düzelmedi' && 'refrakter'; }, o: 'Uygun antibiyotiğe rağmen 5. günde diyalizat berraklaşmıyorsa peritonu korumak için kateterin çıkarılması önerilir.' },
    { id: 'PD-E05', g: 'eri', s: 'bad', k: 'Relaps peritonit', src: KP, w: function (x) { return x.v.pRelaps === 'Var' && 'relaps'; }, o: 'Tedavi bitiminden sonraki 4 hafta içinde aynı etkenle yineleyen peritonitte kateterin çıkarılması (veya diyalizat berraklaştıktan sonra eş zamanlı değişimi) önerilir.' },
    { id: 'PD-E06', g: 'eri', s: 'warn', k: 'Çıkış yeri enfeksiyonu', src: KP, w: function (x) { return x.v.esi === 'Enfekte' && 'enfekte'; }, o: 'Kültür alınarak oral antibiyotik önerilir (Gram-pozitif için sefaleksin, Pseudomonas riski varsa siprofloksasin); süre en az 14 gün, S. aureus ve Pseudomonas’ta 21 gün. Yanıtsızlıkta veya tünel tutulumunda kateter değişimi değerlendirilmelidir.' },
    { id: 'PD-E07', g: 'eri', s: 'info', k: 'Çıkış yerinde şüpheli bulgu', src: KP, w: function (x) { return x.v.esi === 'Şüpheli' && 'şüpheli'; }, o: 'Günlük çıkış yeri bakımının yoğunlaştırılması, kültür alınması ve kısa aralıkla yeniden değerlendirme önerilir.' },
    { id: 'PD-E08', g: 'eri', s: 'warn', k: 'Tünel enfeksiyonu', src: KP, w: function (x) { return x.v.tunel === 'Var' && 'tünel'; }, o: 'Ultrasonografi ile değerlendirme ve uzun süreli antibiyotik önerilir; peritonitle birlikte olan veya yanıtsız tünel enfeksiyonunda kateter çıkarılmalıdır.' },
    { id: 'PD-E09', g: 'eri', s: 'info', k: 'Çıkış yeri profilaksisi yok', src: KP, w: function (x) { return x.v.profil === 'Yok' && 'profilaksi yok'; }, o: 'Çıkış yerine günlük topikal antibiyotik (mupirosin veya gentamisin) uygulanması önerilir; çıkış yeri enfeksiyonu ve peritonit riskini azaltır.' },
    { id: 'PD-E10', g: 'eri', s: 'info', k: 'Son 12 ayda ≥ 2 peritonit atağı', src: 'ISPD Peritonit 2022 (ünite hedefi < 0,4 atak/hasta-yıl)', w: function (x) { var s = x.n('pSay'); return s != null && s >= 2 && s + ' atak'; }, o: 'Değişim tekniğinin yeniden değerlendirilmesi ve eğitimin yinelenmesi, burun S. aureus taşıyıcılığı, kabızlık ve hipopotaseminin gözden geçirilmesi önerilir.' },
    { id: 'PD-E11', g: 'eri', s: 'info', k: 'Kateter drenaj sorunu veya kaçak', src: 'Oxford Handbook of Dialysis; ISPD Kateter 2019', w: function (x) { return x.v.kFonk && x.v.kFonk !== 'Normal' && x.v.kFonk; }, o: function (x) { return x.v.kFonk === 'Kaçak' ? 'Kaçakta dolum volümünün azaltılması veya PD’ye geçici ara verilmesi, kaçak yerinin değerlendirilmesi önerilir.' : 'Kabızlığın tedavisi, kateter ucunun direkt grafiyle değerlendirilmesi ve fibrin tıkacı için intraperitoneal heparin önerilir; düzelmezse omentum sarılması açısından cerrahi değerlendirme gerekebilir.'; } }
  ];
  /* ---------------- Enfeksiyon taraması ve aşı ---------------- */
  var KE = 'CDC diyaliz enfeksiyon önlemleri; Oxford Handbook of Dialysis; Nephrology and Hypertension Board Review';
  function duyarli(x) { var s = x.n('antiHbs'), sp = s != null ? s : x.prevOf('antiHbs'), hb = x.v.hbsag || x.lastS('hbsag'); return hb !== 'Pozitif' && (sp == null || sp < 10); }
  function enf(M) {
    var P = M + '-', pd = M === 'PD';
    return [
      { id: P + 'S01', g: 'enf', s: 'warn', k: 'HBsAg pozitif', src: KE + '; Yönetmelik Madde 10/6', w: function (x) { return x.v.hbsag === 'Pozitif' && 'HBsAg +'; }, o: pd ? 'HBV DNA, karaciğer değerlendirmesi ve antiviral tedavi açısından hepatoloji ile birlikte izlem; aile bireylerinin taranması ve aşılanması önerilir.' : 'Ayrılmış cihaz ve alanda diyaliz (seropozitif cihaz), HBV DNA, karaciğer değerlendirmesi ve antiviral tedavi açısından hepatoloji ile birlikte izlem önerilir.' },
      { id: P + 'S02', g: 'enf', s: 'warn', k: 'Anti-HCV pozitif', src: 'KDIGO HCV 2022; ' + KE, w: function (x) { return (x.v.antiHcv === 'Pozitif' || x.v.hcvRna === 'Pozitif') && (x.v.hcvRna ? 'HCV RNA ' + x.v.hcvRna.toLocaleLowerCase('tr') : 'anti-HCV +'); }, o: 'HCV RNA ile aktif enfeksiyonun doğrulanması ve doğrudan etkili antiviral tedavi değerlendirmesi önerilir; nakil planlamasında tedavi zamanlaması nakil merkeziyle birlikte belirlenmelidir.' },
      { id: P + 'S03', g: 'enf', s: 'warn', k: 'Anti-HIV pozitif', src: KE, w: function (x) { return x.v.antiHiv === 'Pozitif' && 'anti-HIV +'; }, o: 'Doğrulama testi ve enfeksiyon hastalıkları ile birlikte antiretroviral tedavi planı; ilaç dozlarının diyalize göre ayarlanması önerilir.' },
      { id: P + 'S04', g: 'enf', s: 'warn', k: 'Hepatit B aşısız ve duyarlı', src: 'Oxford Handbook of Dialysis; ' + KE, w: function (x) { return x.v.hbvAsi === 'Aşısız' && duyarli(x) && 'aşısız'; }, o: 'Çift doz (40 µg) hepatit B aşısı önerilir: 0, 1, 2 ve 6. aylarda 40 µg (ör. 2 × 20 µg) ya da diyaliz formülasyonuyla 0, 1 ve 6. aylarda 40 µg. Seri bitiminden 1–2 ay sonra anti-HBs ölçülmelidir.' },
      { id: P + 'S05', g: 'enf', s: 'warn', k: 'Aşı serisi sonrası anti-HBs < 10 mIU/mL', src: 'Oxford Handbook of Dialysis; ' + KE, w: function (x) { var s = x.n('antiHbs'); return x.v.hbvAsi === 'Seri tamamlandı' && s != null && s < 10 && 'anti-HBs ' + tr(s, 1); },
        o: function (x) { var b = x.prevOf('antiHbs'); return b != null && b >= 10 ? 'Önceden yanıtlı hastada antikor 10 mIU/mL altına düşmüş; tek doz 40 µg rapel önerilir.' : 'Yanıt alınamamış; çift dozla tam serinin bir kez yinelenmesi önerilir. İki seri sonrası yanıtsız hasta duyarlı kabul edilir ve aylık HBsAg ile izlenir.'; } },
      { id: P + 'S06', g: 'enf', s: 'info', k: 'Duyarlı hastada bu ay HBsAg bakılmamış', src: 'CDC diyaliz enfeksiyon önlemleri', w: function (x) { return !pd && x.any && duyarli(x) && x.v.hbsag == null && 'duyarlı'; }, o: 'Hepatit B’ye duyarlı (anti-HBs < 10, HBsAg negatif) HD hastasında HBsAg’ın aylık izlenmesi önerilir.' },
      { id: P + 'S07', g: 'enf', s: 'info', k: 'Son 12 ayda anti-HBs ölçümü yok', src: 'CDC; Oxford Handbook of Dialysis', w: function (x) { return x.any && x.v.hbsag !== 'Pozitif' && x.lastS('hbsag') !== 'Pozitif' && !x.seen('antiHbs', 11) && 'anti-HBs yok'; }, o: 'Anti-HBs’nin yılda bir ölçülmesi ve 10 mIU/mL altına düştüğünde rapel yapılması önerilir.' },
      { id: P + 'S08', g: 'enf', s: 'info', k: pd ? 'Son 12 ayda anti-HCV ölçümü yok' : 'Son 6 ayda anti-HCV ölçümü yok', src: 'KDIGO HCV 2022' + (pd ? '; PD için aralık uygulama tercihidir' : ''), w: function (x) { return x.any && x.v.antiHcv !== 'Pozitif' && x.lastS('antiHcv') !== 'Pozitif' && !x.seenS('antiHcv', pd ? 11 : 5) && 'anti-HCV yok'; }, o: pd ? 'Anti-HCV’nin yılda bir ölçülmesi önerilir.' : 'HD hastasında anti-HCV’nin 6 ayda bir ölçülmesi önerilir; açıklanamayan transaminaz yüksekliğinde HCV RNA bakılmalıdır.' },
      { id: P + 'S09', g: 'enf', s: 'info', k: 'Son 12 ayda anti-HIV ölçümü yok', src: 'Uygulama tercihi; Yönetmelik Madde 23/2 (personel için yıllık tarama)', w: function (x) { return x.any && x.v.antiHiv !== 'Pozitif' && x.lastS('antiHiv') !== 'Pozitif' && !x.seenS('antiHiv', 11) && 'anti-HIV yok'; }, o: 'Anti-HIV’in yılda bir ölçülmesi önerilir.' },
      { id: P + 'S10', g: 'enf', s: 'info', k: 'Bu sezon influenza aşısı yapılmamış', src: 'Nephrology and Hypertension Board Review; CDC', w: function (x) { var ay = parseInt(x.ay.slice(5, 7), 10), y = parseInt(x.ay.slice(0, 4), 10); var sez = ay >= 9 ? y + '-09' : ay <= 3 ? (y - 1) + '-09' : null; if (!sez) return false; var g = x.v.gripAy; return (!g || g < sez) && 'sezon ' + sez.slice(0, 4); }, o: 'Yıllık inaktif influenza aşısı önerilir (sonbahar).' },
      { id: P + 'S11', g: 'enf', s: 'info', k: 'Pnömokok aşısı yok', src: 'Nephrology and Hypertension Board Review; CDC erişkin aşı takvimi', w: function (x) { return x.v.pnomo === 'Yok' && 'pnömokok'; }, o: 'PCV20 tek doz ya da PCV15 ve en az 8 hafta sonra PPSV23 önerilir.' },
      { id: P + 'S12', g: 'enf', s: 'info', k: '≥ 50 yaş, rekombinant zona aşısı tamamlanmamış', src: 'CDC erişkin aşı takvimi', w: function (x) { var y = x.yas; return y != null && y >= 50 && x.v.zona && x.v.zona !== 'İki doz tamamlandı' && x.v.zona; }, o: 'Rekombinant (inaktif) zona aşısı 2 doz (2–6 ay arayla) önerilir.' },
      { id: P + 'S13', g: 'enf', s: 'info', k: 'Td/Tdap 10 yıldan eski', src: 'CDC erişkin aşı takvimi', w: function (x) { var t = x.n('tdYil'); return t != null && parseInt(x.ay.slice(0, 4), 10) - t >= 10 && 'son ' + t; }, o: 'Td veya Tdap rapelinin yapılması önerilir.' },
      { id: P + 'S14', g: 'enf', s: 'info', k: 'Nakil adayı: canlı aşı ve seroloji', src: 'KDIGO Nakil Adayı 2020', w: function (x) { return x.p.nakil && /Bekleme|yönlendirildi/.test(x.p.nakil) && 'nakil adayı'; }, o: 'Nakil adayında aşıların nakilden önce tamamlanması önerilir. Kızamık-kızamıkçık-kabakulak ve varisella seronegatifse canlı aşıların nakilden en az 4 hafta önce yapılması önerilir; immünsüpresyon başladıktan sonra canlı aşı yapılmaz.' }
    ];
  }
  /* ---------------- Tetkik takvimi ---------------- */
  function TAKVIM(p) {
    var m = p.mod, hd = m === 'HD';
    return [
      { l: hd ? 'Kt/V ve URR' : 'Haftalık Kt/V ve kreatinin klirensi', k: hd ? ['preU', 'ktvlab'] : ['dVol', 'ktvlab'], i: hd ? 1 : 6, src: hd ? 'KDOQI 2006' : 'KDOQI 2006; ISPD 2020' },
      { l: 'İdrar volümü (rezidüel fonksiyon)', k: ['idrar'], i: hd ? 3 : 6, src: hd ? 'KDOQI 2015' : 'ISPD 2020', hd: hd },
      !hd ? { l: 'PET', k: ['pet'], i: 12, src: 'Uygulama tercihi; klinik değişiklikte daha erken' } : null,
      { l: 'Hemoglobin', k: ['hb'], i: function (v) { return hd || (v && v.esa && v.esa !== 'Yok') ? 1 : 3; }, src: 'KDIGO Anemi 2026' },
      { l: 'Ferritin ve TSAT', k: ['ferritin', 'tsat'], i: 3, src: 'KDIGO Anemi 2026 (HD 1–3 ay, PD 3 ay)' },
      { l: 'Kalsiyum ve fosfor', k: ['ca', 'p'], i: hd ? 1 : 3, src: 'KDIGO KBH-MKB 2017 (1–3 ay)' },
      { l: 'iPTH', k: ['pth'], i: function (v) { return v && ((v.vitD && v.vitD !== 'Yok') || (v.kalsim && v.kalsim !== 'Yok')) ? 3 : 6; }, src: 'KDIGO KBH-MKB 2017 (3–6 ay)' },
      { l: 'ALP', k: ['alp'], i: 12, src: 'KDIGO KBH-MKB 2017' },
      { l: '25(OH) D vitamini', k: ['d25'], i: 12, src: 'KDIGO KBH-MKB 2017; aralık uygulama tercihi' },
      { l: 'Potasyum ve bikarbonat', k: ['k', 'hco3'], i: 1, src: 'Uygulama pratiği' },
      { l: 'Albümin', k: ['alb'], i: 1, src: 'Nutrition in Kidney Disease; Oxford Handbook of Dialysis' },
      { l: hd ? 'nPCR' : 'nPNA', k: ['npcr'], i: hd ? 1 : 6, src: 'Oxford Handbook of Dialysis' },
      { l: 'SGA veya MIS', k: ['sga', 'mis'], i: 6, src: 'Nutrition in Kidney Disease (3–6 ay)' },
      { l: 'Kolesterol', k: ['kol'], i: 12, src: 'Uygulama tercihi' },
      p.dm === 'Var' ? { l: 'HbA1c', k: ['hba1c'], i: 3, src: 'KDIGO Diyabet 2022' } : null,
      { l: 'HBsAg', k: ['hbsag'], i: function (v, x) { return hd && duyarli(x) ? 1 : null; }, src: 'CDC (duyarlı HD hastasında aylık)' },
      { l: 'Anti-HBs', k: ['antiHbs'], i: function (v, x) { return (x.lastS('hbsag') === 'Pozitif') ? null : 12; }, src: 'CDC; Oxford Handbook of Dialysis' },
      { l: 'Anti-HCV', k: ['antiHcv'], i: function (v, x) { return x.lastS('antiHcv') === 'Pozitif' ? null : (hd ? 6 : 12); }, src: 'KDIGO HCV 2022' },
      { l: 'Anti-HIV', k: ['antiHiv'], i: function (v, x) { return x.lastS('antiHiv') === 'Pozitif' ? null : 12; }, src: 'Uygulama tercihi' },
      !hd ? null : { l: 'Erişim akımı (Qa)', k: ['qa'], i: function (v) { return v && /fistül|greft/.test(v.erisim || '') ? 3 : null; }, src: 'Uygulama tercihi; KDOQI 2019 rutin gözetimi zorunlu tutmaz' }
    ].filter(Boolean);
  }
  function takvim(p, ay) {
    var ms = sortedMonths(p).filter(function (a) { return a <= ay; }), v = p.visits[ay] || p.visits[ms[ms.length - 1]] || {};
    var x = { lastS: function (k) { for (var i = ms.length - 1; i >= 0; i--) { var q = p.visits[ms[i]][k]; if (q != null && q !== '') return q; } return null; }, n: function (k) { return val(p.mod, v, k); }, v: v, p: p };
    x.prevOf = function (k) { for (var i = ms.length - 1; i >= 0; i--) { var q = val(p.mod, p.visits[ms[i]], k); if (q != null) return q; } return null; };
    return TAKVIM(p).map(function (t) {
      var iv = typeof t.i === 'function' ? t.i(v, x) : t.i; if (iv == null) return null;
      var son = null; for (var i = ms.length - 1; i >= 0 && !son; i--) { var vv = p.visits[ms[i]]; if (t.k.some(function (k) { return vv[k] != null && vv[k] !== ''; })) son = ms[i]; }
      var d = son ? aylar(son, ay) : null, durum = son == null ? 'yok' : d >= iv ? 'gecikti' : 'guncel';
      var sonraki = null; if (son) { var y = parseInt(son.slice(0, 4), 10), mo = parseInt(son.slice(5, 7), 10) - 1 + iv; sonraki = (y + Math.floor(mo / 12)) + '-' + ('0' + (mo % 12 + 1)).slice(-2); }
      return { l: t.l, i: iv, son: son, sonraki: sonraki, durum: durum, src: t.src };
    }).filter(Boolean);
  }
  /* ---------------- Nutrisyon (ISRNM; eBook: Nutrition in Kidney Disease, Oxford Handbook of Dialysis, CDT Nephrology) ---------------- */
  var KN = 'ISRNM PEW uzlaşısı (Fouque 2008); Nutrition in Kidney Disease; Oxford Handbook of Dialysis';
  function nut(M) {
    var P = M + '-', pd = M === 'PD';
    var neden = 'yetersiz diyaliz, metabolik asidoz, inflamasyon ve enfeksiyon, depresyon, diş ve yutma sorunları, gastroparezi, ilaçlar' + (pd ? ', periton protein kaybı, peritonit' : '');
    return [
      { id: P + 'N01', g: 'nut', s: 'bad', k: 'PEW: ISRNM ölçütlerinde ≥ 3 kategori', src: KN, w: function (x) { return x.c.pewN >= 3 && [].concat(x.c.pewDet.bio, x.c.pewDet.kitle, x.c.pewDet.alim).join(', '); },
        o: 'Protein-enerji kaybı tanı ölçütleri karşılanıyor. Diyetisyen değerlendirmesi, ayrıntılı diyet kaydı, protein ve enerji hedeflerine göre plan, oral nutrisyonel destek ve nedenlerin (' + neden + ') araştırılması önerilir.' },
      { id: P + 'N02', g: 'nut', s: 'warn', k: 'PEW riski: ISRNM ölçütlerinde 2 kategori', src: KN, w: function (x) { return x.c.pewN === 2 && [].concat(x.c.pewDet.bio, x.c.pewDet.kitle, x.c.pewDet.alim).join(', '); },
        o: 'İki kategoride ölçüt var; kas kitlesi uygulamada değerlendirilmediğinden PEW dışlanamaz. Kas kitlesi (orta kol kas çevresi, kreatinin kinetiği, biyoimpedans) ve diyet alımının değerlendirilmesi; SGA veya MIS ile kapsamlı nutrisyonel değerlendirme önerilir.' },
      { id: P + 'N03', g: 'nut', s: 'warn', k: 'Albümin < 3,8 g/dL', src: KN + '; ISRNM (BCG yöntemi)', w: function (x) { var a = x.n('alb'); return a != null && a < 3.8 && 'albümin ' + tr(a, 1) + (x.n('crp') != null ? ', CRP ' + tr(x.n('crp'), 1) : ''); },
        o: function (x) { var c = x.n('crp'); return 'Düşük albümin beslenme yetersizliği kadar inflamasyon ve sıvı fazlalığını da yansıtır. Diyet alımı, ' + (c != null && c > 10 ? 'yüksek CRP nedeniyle enfeksiyon ve inflamasyon odağı, ' : 'CRP ile inflamasyon, ') + 'volüm durumu' + (pd ? ' ve periton protein kaybı' : '') + ' değerlendirilmelidir.'; } },
      { id: P + 'N04', g: 'nut', s: 'warn', k: 'nPCR < 1,0 g/kg/gün', src: 'Absolute Nephrology Review; Oxford Handbook of Dialysis; Nutrition in Kidney Disease', w: function (x) { var n = x.n('npcr'); return n != null && n < 1 && 'nPCR ' + tr(n, 2); },
        o: function (x) { var n = x.n('npcr'); return (n < 0.8 ? 'nPCR 0,8 g/kg/gün altında; yetersiz protein alımı ve artmış morbidite ile mortalite riskiyle ilişkilidir. ' : 'Protein alımı hedefin altında olabilir (hedef nPCR 1,0–1,2 g/kg/gün). ') + 'Protein hedefi ' + (pd ? '1,2–1,3' : '1,2–1,4') + ' g/kg/gün olup en az yarısının yüksek biyolojik değerli proteinden karşılanması önerilir. Diyetisyen görüşmesi ve gerekirse oral nutrisyonel destek değerlendirilebilir. Yetersiz diyaliz nPCR’yi düşürür; Kt/V birlikte yorumlanmalıdır.'; } },
      { id: P + 'N05', g: 'nut', s: 'warn', k: 'İstemsiz kilo kaybı: 3 ayda > %5 veya 6 ayda > %10', src: KN, w: function (x) { var r = []; if (x.c.wl3 != null && x.c.wl3 > 5) r.push('3 ayda %' + tr(x.c.wl3, 1)); if (x.c.wl6 != null && x.c.wl6 > 10) r.push('6 ayda %' + tr(x.c.wl6, 1)); return r.length ? r.join(', ') : false; },
        o: function (x) { return 'Belirgin kilo kaybı. Hedef ' + (pd ? '' : '(kuru) ') + 'ağırlığın yeniden değerlendirilmesi, diyet alımı ve nedenlerin (' + neden + ') araştırılması önerilir.' + (pd ? '' : ' Kuru ağırlık düşürülürken gerçek doku kaybı ile sıvı kaybı ayırt edilmelidir.'); } },
      { id: P + 'N06', g: 'nut', s: 'info', k: 'BMI < 22 kg/m² (< 65 yaş) veya < 23 kg/m² (≥ 65 yaş)', src: KN, w: function (x) { var y = x.yas; return x.c.bmi != null && x.c.bmi < (y != null && y >= 65 ? 23 : 22) && 'BMI ' + tr(x.c.bmi, 1); }, o: 'Düşük vücut kitle indeksi PEW ölçütlerinden biridir; kilo seyri ve diyet alımıyla birlikte değerlendirilmesi önerilir.' },
      { id: P + 'N07', g: 'nut', s: 'warn', k: 'SGA B veya C ya da MIS ≥ 8', src: 'Nutrition in Kidney Disease; Oxford Handbook of Dialysis', w: function (x) { var s = x.v.sga || '', m = x.n('mis'), r = []; if (/^[BC]/.test(s)) r.push('SGA ' + s.charAt(0)); if (m != null && m >= 8) r.push('MIS ' + m); return r.length ? r.join(', ') : false; },
        o: 'Kapsamlı nutrisyonel değerlendirmede malnütrisyon bulgusu. Diyetisyen değerlendirmesi, protein ve enerji hedeflerine göre plan ve oral nutrisyonel destek önerilir; MIS inflamasyon bileşenini de içerdiğinden CRP ve enfeksiyon odağı değerlendirilmelidir.' },
      { id: P + 'N08', g: 'nut', s: 'info', k: 'MIS 6–7', src: 'Nutrition in Kidney Disease', w: function (x) { var m = x.n('mis'); return m != null && m >= 6 && m < 8 && 'MIS ' + m; }, o: 'MIS 5–8 üzerindeki değerler artmış klinik riskle ilişkilidir; 3 ay içinde yinelenmesi ve diyet alımının değerlendirilmesi önerilir.' },
      { id: P + 'N09', g: 'nut', s: 'warn', k: 'Oral nutrisyonel destek yok; albümin < 3,8 ve yetersiz alım', src: 'Nutrition in Kidney Disease; CDT Nephrology & Hypertension; Oxford Handbook of Dialysis', w: function (x) { var a = x.n('alb'), n = x.n('npcr'), pa = x.n('protAlim'), ea = x.n('enerjiAlim'); var low = (n != null && n < 1) || (pa != null && pa < (pd ? 1.2 : 1.2)) || (ea != null && ea < 30) || x.v.istah === 'Azalmış'; return (!x.v.ons || x.v.ons === 'Yok') && a != null && a < 3.8 && low && 'albümin ' + tr(a, 1); },
        o: 'Diyet danışmanlığına rağmen hedeflere ulaşılamayan hastada böbreğe özgü (düşük potasyum ve fosforlu) oral nutrisyonel destek önerilir; ' + (pd ? 'günlük ek öğün olarak' : 'diyaliz seansı sırasında veya günlük ek öğün olarak') + ' verilebilir.' },
      pd ? { id: P + 'N10', g: 'nut', s: 'warn', k: 'Ağır PEW: albümin < 3,0 g/dL, aminoasit solüsyonu yok', src: 'Nutrition in Kidney Disease; Oxford Handbook of Dialysis', w: function (x) { var a = x.n('alb'), aa = x.c.L ? x.c.L.aa : null; return a != null && a < 3 && (aa == null || aa === 0) && 'albümin ' + tr(a, 1); },
          o: 'Oral yolla yeterli alım sağlanamayan ağır PEW’de günlük değişimlerden 1–2’sinin %1,1 aminoasit solüsyonuyla yapılması (intraperitoneal beslenme) değerlendirilebilir.' }
         : { id: P + 'N10', g: 'nut', s: 'warn', k: 'Oral destekle yetersiz yanıt ve ağır PEW bulgusu, IDPN yok', src: 'Nutrition in Kidney Disease; CDT Nephrology & Hypertension', w: function (x) { var a = x.n('alb'), n = x.n('npcr'), r = []; if (a != null && a < 3.5) r.push('albümin ' + tr(a, 1)); if (n != null && n < 0.8) r.push('nPCR ' + tr(n, 2)); if (x.c.wl6 != null && x.c.wl6 > 10) r.push('6 ayda %' + tr(x.c.wl6, 1) + ' kilo kaybı'); return x.v.ons === 'Var' && (!x.v.idpn || x.v.idpn === 'Yok') && r.length && r.join(', '); },
          o: 'Oral destek yetersiz kaldıysa veya kullanılamıyorsa intradiyalitik parenteral beslenme değerlendirilebilir. IDPN günlük beslenmenin yerini almaz; hastanın gereksiniminin en az yarısını ağızdan karşılayabilmesi gerekir.' },
      { id: P + 'N11', g: 'nut', s: 'info', k: 'Son 6 ayda SGA veya MIS değerlendirmesi yok', src: 'Nutrition in Kidney Disease; Oxford Handbook of Dialysis (KDOQI)', w: function (x) { return x.any && !x.seen('mis', 5) && !x.seenS('sga', 5); }, o: 'Albümin ve nPCR’nin aylık, SGA veya MIS ile antropometri ve diyet görüşmesini içeren kapsamlı değerlendirmenin 3–6 ayda bir yapılması önerilir.' },
      { id: P + 'N12', g: 'nut', s: 'info', k: 'Diyet önerileri (sodyum, potasyum, fosfor)', src: 'Nutrition in Kidney Disease; Oxford Handbook of Dialysis', w: function (x) { return (x.c.pewN > 0 || (x.n('p') != null && x.n('p') > 5.5) || (x.n('k') != null && (x.n('k') > 5.5 || x.n('k') < 3.5))) && 'diyet planı'; },
        o: pd ? 'PD: sodyum 2–4 g/gün (volüme göre), potasyum genellikle kısıtlamasız (3–4 g/gün), fosfor 800–1000 mg/gün. İnorganik fosfat katkılı işlenmiş gıdalardan kaçınılması önerilir; fosfor kısıtlaması protein hedefini düşürmemelidir.'
          : 'HD: sodyum 2–3 g/gün (tuz < 6 g), potasyum 2–3 g/gün, fosfor 800–1000 mg/gün. İnorganik fosfat katkılı işlenmiş gıdalardan kaçınılması önerilir; fosfor kısıtlaması protein hedefini düşürmemelidir.' }
    ];
  }
  RULES.HD = RULES.HD.concat(kab('HD'), aneMkb('HD'), nut('HD'), ERI_RULES_HD, enf('HD'));
  RULES.PD = RULES.PD.concat(kab('PD'), aneMkb('PD'), nut('PD'), ERI_RULES_PD, enf('PD'));
  var GRP = { yet: 'Diyaliz yeterliliği', rec: 'Diyaliz reçetesi', vol: 'Volüm ve kan basıncı', kab: 'Potasyum ve asit-baz', ane: 'Anemi', mkb: 'KBH-MKB', nut: 'Nutrisyon', eri: 'Damar erişimi / kateter', enf: 'Enfeksiyon ve aşı', lab: 'Diğer laboratuvar', mev: 'Mevzuat ve izlem' };

  function sortedMonths(p) { return Object.keys(p.visits || {}).sort(); }
  function prevMonth(p, ay) { var m = sortedMonths(p).filter(function (a) { return a < ay; }); return m.length ? m[m.length - 1] : null; }
  function evaluate(p, ay) {
    var v = (p.visits || {})[ay] || {}, m = p.mod, c = compute(p, v, ay), pm = prevMonth(p, ay), pv = pm ? p.visits[pm] : null, pc = pv ? compute(p, pv, pm) : null;
    var any = fieldsOf(m).some(function (f) { return !f.c && v[f.k] != null && v[f.k] !== ''; });
    var x = { p: p, v: v, c: c, pv: pv, pc: pc, ay: ay, any: any, n: function (k) { return val(m, v, k); },
      prevOf: function (k) { var ms = sortedMonths(p).filter(function (a) { return a < ay; }); for (var i = ms.length - 1; i >= 0; i--) { var n = val(m, p.visits[ms[i]], k); if (n != null) return n; } return null; },
      back: function (k) { var ms = sortedMonths(p).filter(function (a) { return a < ay; }); return ms.length >= k ? p.visits[ms[ms.length - k]] : null; },
      yas: yas(p, ay),
      lastS: function (k) { var ms = sortedMonths(p).filter(function (a) { return a <= ay; }); for (var i = ms.length - 1; i >= 0; i--) { var q = p.visits[ms[i]][k]; if (q != null && q !== '') return q; } return null; },
      seenS: function (k, n) { return sortedMonths(p).some(function (a) { var d = aylar(a, ay); return d != null && d >= 0 && d <= n && p.visits[a][k]; }); },
      seen: function (k, n) { return sortedMonths(p).some(function (a) { var d = aylar(a, ay); return d != null && d >= 0 && d <= n && val(m, p.visits[a], k) != null; }); },
      recent: function (ck, n) { return sortedMonths(p).some(function (a) { var d = aylar(a, ay); return d != null && d > 0 && d <= n && compute(p, p.visits[a], a)[ck] != null; }); } };
    var out = [];
    RULES[m].forEach(function (r) { var w; try { w = r.w(x); } catch (e) { w = false; } if (!w) return; out.push({ id: r.id, g: r.g, s: r.s, k: r.k, why: w === true ? '' : w, o: typeof r.o === 'function' ? r.o(x) : r.o, src: r.src }); });
    var ord = { bad: 0, warn: 1, info: 2, ok: 3 };
    out.sort(function (a, b) { return ord[a.s] - ord[b.s]; });
    return { c: c, recs: out, range: outOfRange(m, v), prev: pm, any: any };
  }
  function ANEMKB(add, c) {
    add('ane', 'ESA dozu / kg', c.esaKg, 'IU/kg/hafta', 1, 'darbepoetin 1 µg ≈ 200 IU kabulüyle');
    add('ane', 'ESA direnç indeksi (ERI)', c.eri, 'IU/kg/hafta/(g/dL)', 1, 'haftalık doz / kg / Hb');
    add('mkb', 'Düzeltilmiş kalsiyum', c.dcaAlb ? c.dca : null, 'mg/dL', 2, 'Ca + 0,8 × (4 − albümin); albümin Diğer laboratuvar bölümünden');
    add('nut', 'BMI', c.bmi, 'kg/m²', 1);
    add('nut', 'GNRI', c.gnri, '', 1, '1,489 × albümin (g/L) + 41,7 × (ağırlık / ideal ağırlık); ideal ağırlık BMI 22’ye göre; < 92 risk');
    add('nut', 'Kilo değişimi, 3 ay', c.wl3 != null ? -c.wl3 : null, '%', 1, 'eksi değer kilo kaybı'); add('nut', 'Kilo değişimi, 6 ay', c.wl6 != null ? -c.wl6 : null, '%', 1, 'eksi değer kilo kaybı');
    add('nut', 'PEW ölçütü karşılanan kategori', c.pewN, '/ 4', 0, 'ISRNM; ≥ 3 kategori PEW. Kas kitlesi kategorisi uygulamada ölçülmüyor');
    add('nut', 'Protein hedefi', c.protHedef, 'g/gün', null, c.mod === 'PD' ? '1,2–1,3 g/kg/gün' : '1,2–1,4 g/kg/gün');
    add('nut', 'Enerji hedefi', c.enerjiHedef, 'kcal/gün', null, '< 60 yaş 35, ≥ 60 yaş 30–35 kcal/kg/gün');
    add('nut', 'Diyalizattan emilen glukoz enerjisi', c.glukKcal, 'kcal/gün', 0, 'SAPD %60, APD %40 emilim kabulüyle; enerji hedefinden düşülür');
    add('mkb', 'iPTH / üst sınır', c.pthX, '×', 1, 'hedef 2–9 × (üst sınır ' + tr(c.pthUst) + ' pg/mL' + (c.pthUstVars ? ', varsayılan' : '') + ')');
  }
  /* Hesaplanan değerlerin görünen listesi */
  function derived(p, c) {
    var a = [];
    function add(g, l, v, u, d, note) { if (v != null) a.push({ g: g, l: l, v: v, u: u || '', d: d, note: note || '' }); }
    if (p.mod === 'HD') {
      add('yet', 'spKt/V', c.ktv, '', 2, c.ktvSrc === 'Daugirdas II' ? 'Daugirdas II; hedef 1,4, asgari 1,2' : 'girilen değer; hedef 1,4, asgari 1,2');
      add('yet', 'URR', c.urr, '%', 1, 'hedef ≥ %65'); add('yet', 'eKt/V', c.ekt, '', 2, 'uyarlanmış Tattersall'); add('yet', 'stdKt/V', c.std, '/hafta', 2, 'Leypoldt; UF ve rezidüel fonksiyon hariç. Hedef 2,3, asgari 2,1');
      add('yet', 'Haftalık diyaliz süresi', c.haftaSaat, 'saat', 1); add('yet', 'Üre dağılım hacmi (Watson)', c.V, 'L', 1);
      add('vol', 'Ultrafiltrasyon hacmi', c.uf, 'L/seans', 1, 'ortalama giriş − çıkış ağırlığı'); add('vol', 'Ultrafiltrasyon hızı', c.ufr, 'mL/kg/saat', 1, '≤ 10 hedeflenir; > 13 yüksek risk');
      add('vol', 'İnterdiyalitik kilo alımı', c.idwg, '% kuru ağırlık', 1, '≤ %4–4,5'); add('vol', 'Çıkış − kuru ağırlık', c.dKuru, 'kg', 1);
      ANEMKB(add, c);
    } else {
      add('yet', 'Haftalık toplam Kt/V', c.ktv, '', 2, c.ktvSrc === 'toplamadan hesap' ? (c.rEksik ? 'yalnız periton; idrar verisi eksik' : 'periton + renal') : 'girilen değer');
      add('yet', 'Periton Kt/V', c.pKtV, '/hafta', 2); add('yet', 'Renal Kt/V', c.rKtV, '/hafta', 2);
      add('yet', 'Haftalık kreatinin klirensi', c.tCrCl != null ? c.tCrCl : c.pCrCl, 'L/1,73 m²', 1, c.tCrCl != null ? 'periton + renal' : 'yalnız periton');
      add('yet', 'Rezidüel böbrek fonksiyonu', c.rkf, 'mL/dk/1,73 m²', 1, 'üre ve kreatinin klirensi ortalaması'); add('yet', 'PET transport tipi', c.petTip, '', null);
      add('yet', 'Üre dağılım hacmi (Watson)', c.V, 'L', 1); add('yet', 'Vücut yüzey alanı (DuBois)', c.bsa, 'm²', 2);
      add('rec', 'Reçete özeti', c.recete, '', null); add('rec', 'Günlük değişim sayısı', c.degisim, 'adet', 0);
      add('rec', 'Günlük toplam solüsyon', c.topVol, 'L/gün', 1, 'torba hacmi × değişim sayısı'); add('rec', 'Günlük glukoz yükü', c.gluk, 'g/gün', 0, 'torbadaki glukoz; emilen miktar daha düşüktür');
      add('vol', 'Toplam sıvı çıkışı (idrar + UF)', c.cikis, 'mL/gün', 0); add('vol', 'Ağırlık − hedef', c.dHedef, 'kg', 1);
      ANEMKB(add, c);
    }
    return a;
  }
  /* Ünite kalite göstergeleri: [etiket, sınama(c, n) -> true/false/null] */
  var KPI_ORT = [['Hb 10,0–11,5 g/dL', function (c, n) { return n('hb') == null ? null : n('hb') >= 10 && n('hb') <= 11.5; }], ['Hb ≥ 9,0 g/dL', function (c, n) { return n('hb') == null ? null : n('hb') >= 9; }],
    ['TSAT > %20', function (c, n) { return n('tsat') == null ? null : n('tsat') > 20; }], ['Fosfor ≤ 5,5 mg/dL', function (c, n) { return n('p') == null ? null : n('p') <= 5.5; }],
    ['Düzeltilmiş Ca ≤ 10,2 mg/dL', function (c) { return c.dca == null ? null : c.dca <= 10.2; }], ['iPTH 2–9 × üst sınır', function (c) { return c.pthX == null ? null : c.pthX >= 2 && c.pthX <= 9; }],
    ['Albümin ≥ 3,8 g/dL', function (c, n) { return n('alb') == null ? null : n('alb') >= 3.8; }], ['nPCR ≥ 1,0 g/kg/gün', function (c, n) { return n('npcr') == null ? null : n('npcr') >= 1; }], ['PEW ölçütü < 3 kategori', function (c) { return c.pewN == null || (!c.pewDet.bio.length && !c.pewDet.kitle.length && !c.pewDet.alim.length) ? null : c.pewN < 3; }]];
  var KPI = {
    HD: [['spKt/V ≥ 1,2', function (c) { return c.ktv == null ? null : c.ktv >= 1.2; }], ['spKt/V ≥ 1,4', function (c) { return c.ktv == null ? null : c.ktv >= 1.4; }], ['URR ≥ %65', function (c) { return c.urr == null ? null : c.urr >= 65; }],
      ['Seans süresi ≥ 240 dk', function (c, n) { return n('sure') == null ? null : n('sure') >= 240; }], ['UF hızı ≤ 13 mL/kg/saat', function (c) { return c.ufr == null ? null : c.ufr <= 13; }], ['UF hızı ≤ 10 mL/kg/saat', function (c) { return c.ufr == null ? null : c.ufr <= 10; }],
      ['Kilo alımı ≤ %4,5', function (c) { return c.idwg == null ? null : c.idwg <= 4.5; }], ['Giriş sistolik KB < 160', function (c, n) { return n('preS') == null ? null : n('preS') < 160; }], ['İntradiyalitik hipotansiyon yok', function (c, n) { return n('idh') == null ? null : n('idh') === 0; }],
      ['Giriş K 4,0–5,5', function (c, n) { return n('k') == null ? null : n('k') >= 4 && n('k') <= 5.5; }], ['Giriş HCO₃ ≥ 22', function (c, n) { return n('hco3') == null ? null : n('hco3') >= 22; }], ['Kalıcı erişim (fistül/greft)', function (c, n, v) { return !v.erisim ? null : /AV/.test(v.erisim); }]].concat(KPI_ORT),
    PD: [['Haftalık Kt/V ≥ 1,7', function (c) { return c.ktv == null ? null : c.ktv >= 1.7; }], ['KB < 140/90', function (c, n) { return n('S') == null ? null : n('S') < 140 && (n('D') == null || n('D') < 90); }], ['Ödem yok', function (c, n, v) { return !v.odem ? null : v.odem === 'Yok'; }],
      ['Toplam sıvı çıkışı ≥ 1000 mL/gün', function (c) { return c.cikis == null ? null : c.cikis >= 1000; }], ['Serum K 3,5–5,5', function (c, n) { return n('k') == null ? null : n('k') >= 3.5 && n('k') <= 5.5; }], ['Hipertonik (%3,86) kullanılmıyor', function (c) { return !c.L || c.L['386'] == null ? (c.recete ? true : null) : c.L['386'] === 0; }],
      ['Serum HCO₃ ≥ 22', function (c, n) { return n('hco3') == null ? null : n('hco3') >= 22; }], ['İdrar ≥ 100 mL/gün (rezidüel fonksiyon)', function (c, n) { return n('idrar') == null ? null : n('idrar') >= 100; }]].concat(KPI_ORT)
  };
  root.DR = { takvim: takvim, SCHEMA: SCHEMA, PFIELDS: PFIELDS, RULES: RULES, GRP: GRP, KPI: KPI, fieldsOf: fieldsOf, fieldMap: fieldMap, val: val, num: num, tr: tr, compute: compute, evaluate: evaluate, derived: derived, sortedMonths: sortedMonths, prevMonth: prevMonth, aylar: aylar,
    f: { watson: watson, bsa: bsa, spKtV: spKtV, eKtV: eKtV, stdKtV: stdKtV } };
})(typeof window !== 'undefined' ? window : globalThis);
