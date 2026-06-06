import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import KimlikFoto from '../components/KimlikFoto';
import PersonPicker from '../components/PersonPicker';

const KIRA_FIELDS = [
  { section: 'TAŞINMAZ BİLGİLERİ', fields: [
    { key: 'il_ilce', label: 'İl / İlçe', placeholder: 'İstanbul / Kadıköy' },
    { key: 'mahalle', label: 'Mahalle', placeholder: 'Moda Mahallesi' },
    { key: 'cadde_sokak', label: 'Cadde / Sokak', placeholder: 'Bahariye Caddesi' },
    { key: 'kapi_no', label: 'Kapı / Ada Parsel No', placeholder: 'No:12 / Ada:100 Parsel:5' },
    { key: 'tasinmaz_cinsi', label: 'Taşınmazın Cinsi', placeholder: 'Daire / Dükkan / Arsa' },
    { key: 'kiralama_amaci', label: 'Kiralanma Amacı', placeholder: 'Konut / İşyeri' },
  ]},
  { section: 'KİRAYA VEREN', fields: [
    { key: 'kiraya_veren_ad', label: 'Ad Soyad / Ticari Ünvan', placeholder: 'Mehmet Demir' },
    { key: 'kiraya_veren_tc', label: 'TC / Vergi Kimlik No', placeholder: '12345678901' },
    { key: 'kiraya_veren_adres', label: 'Ev / İş Adresi', placeholder: 'Tam adres...' },
    { key: 'kiraya_veren_tel', label: 'Telefon', placeholder: '0532 xxx xx xx', keyboardType: 'phone-pad', maxLength: 14 },
  ]},
  { section: 'KİRACI', fields: [
    { key: 'kiraci_ad', label: 'Ad Soyad / Ticari Ünvan', placeholder: 'Ahmet Yılmaz' },
    { key: 'kiraci_tc', label: 'TC / Vergi Kimlik No', placeholder: '98765432109' },
    { key: 'kiraci_adres', label: 'Ev / İş Adresi', placeholder: 'Tam adres...' },
    { key: 'kiraci_tel', label: 'Telefon', placeholder: '0533 xxx xx xx', keyboardType: 'phone-pad', maxLength: 14 },
  ]},
  { section: 'KİRA BİLGİLERİ', fields: [
    { key: 'aylik_kira', label: 'Aylık Kira Bedeli (TL)', placeholder: '15.000', keyboardType: 'numeric' },
    { key: 'depozito', label: 'Depozito (TL)', placeholder: '45.000', keyboardType: 'numeric' },
    { key: 'odeme_sekli', label: 'Ödeme Şekli / Banka Bilgisi', placeholder: 'Ziraat Bankası TR00...' },
    { key: 'odeme_gunu', label: 'Ödeme Günü', placeholder: '5', keyboardType: 'numeric' },
    { key: 'baslangic_tarihi', label: 'Kira Başlangıç Tarihi', placeholder: '01.06.2026' },
    { key: 'bitis_tarihi', label: 'Kira Bitiş Tarihi', placeholder: '01.06.2027' },
    { key: 'sure', label: 'Kira Süresi (yıl)', placeholder: '1', keyboardType: 'numeric' },
    { key: 'yetkili_mahkeme', label: 'Yetkili Mahkeme / İcra', placeholder: 'İstanbul' },
  ]},
];

export default function FormScreen({ navigation, route }: any) {
  const { type, title, formData: mevcutFormData, kayitId, fotograflar: mevcutFotograflar, esyaListesi: mevcutEsyaListesi, kiraciPersonId: mevcutKiraciPersonId } = route.params;
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState<Record<string, string>>(mevcutFormData || {});
  const [loading, setLoading] = useState(false);
  const [fotograflar, setFotograflar] = useState<Record<string, string>>(mevcutFotograflar ?? {});
  const [esyaListesi, setEsyaListesi] = useState<{ ad: string; marka: string; adet: string }[]>(mevcutEsyaListesi ?? []);
  const [yeniEsya, setYeniEsya] = useState({ ad: '', marka: '', adet: '1' });
  const [kiraciPersonId, setKiraciPersonId] = useState<string | null>(mevcutKiraciPersonId ?? null);
  const [personPickerVisible, setPersonPickerVisible] = useState(false);

  const kefilVar = formData.kefil_var === 'Evet';
  const kefilSayisi = parseInt(formData.kefil_sayisi || '1');

  const onFotoKirayanSecildi = useCallback(
    (on: string, arka: string) => setFotograflar(prev => ({ ...prev, kirayanOn: on, kirayanArka: arka })),
    []
  );
  const onFotoKiraciSecildi = useCallback(
    (on: string, arka: string) => setFotograflar(prev => ({ ...prev, kiraciOn: on, kiraciArka: arka })),
    []
  );
  const onFotoKefil1Secildi = useCallback(
    (on: string, arka: string) => setFotograflar(prev => ({ ...prev, kefil1On: on, kefil1Arka: arka })),
    []
  );
  const onFotoKefil2Secildi = useCallback(
    (on: string, arka: string) => setFotograflar(prev => ({ ...prev, kefil2On: on, kefil2Arka: arka })),
    []
  );

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { sozlesmeOlustur } = await import('../services/anthropic');
      const sozlesme = await sozlesmeOlustur(title, formData);
      navigation.navigate('Preview', { sozlesme, title, formData, kayitId, ozelMaddeler: [], fotograflar, esyaListesi, kiraciPersonId });
    } catch (e: any) {
      alert('Hata: ' + (e?.message || JSON.stringify(e)));
    } finally {
      setLoading(false);
    }
  };

  const formatTelefon = (text: string) => {
    const sadece = text.replace(/\D/g, '').slice(0, 11);
    if (sadece.length <= 4) return sadece;
    if (sadece.length <= 7) return sadece.slice(0, 4) + ' ' + sadece.slice(4);
    if (sadece.length <= 9) return sadece.slice(0, 4) + ' ' + sadece.slice(4, 7) + ' ' + sadece.slice(7);
    return sadece.slice(0, 4) + ' ' + sadece.slice(4, 7) + ' ' + sadece.slice(7, 9) + ' ' + sadece.slice(9);
  };

  const handleChangeText = (key: string, val: string) => {
    if (key === 'aylik_kira' || key === 'depozito') {
      const temiz = val.replace(/\./g, '');
      const formatli = temiz.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      setFormData(prev => ({ ...prev, [key]: formatli }));
    } else if (key === 'kiraya_veren_tel' || key === 'kiraci_tel') {
      setFormData(prev => ({ ...prev, [key]: formatTelefon(val) }));
    } else {
      setFormData(prev => ({ ...prev, [key]: val }));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingBottom: insets.bottom }]}
      behavior="padding"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSub}>Bilgileri girin</Text>
        </View>
      </View>
      <ScrollView style={styles.content} scrollEnabled={true} nestedScrollEnabled={true} showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">
        <PersonPicker
          visible={personPickerVisible}
          onClose={() => setPersonPickerVisible(false)}
          onSelect={(p) => {
            setFormData(prev => ({
              ...prev,
              kiraci_ad: p.ad_soyad ?? '',
              kiraci_tc: p.tc_kimlik ?? '',
              kiraci_adres: p.adres ?? '',
              kiraci_tel: p.telefon ?? '',
            }));
            setKiraciPersonId(p.id);
          }}
        />
        {KIRA_FIELDS.map((section) => (
          <View key={section.section} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.section}</Text>
            {section.section === 'KİRACI' && (
              <TouchableOpacity
                style={{ margin: 10, backgroundColor: '#1a2e1a', borderRadius: 8, padding: 10, alignItems: 'center' }}
                onPress={() => setPersonPickerVisible(true)}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500' }}>Kayıtlı kiracıdan seç</Text>
              </TouchableOpacity>
            )}
            {section.fields.map((field, idx) => (
              <React.Fragment key={field.key}>
                <View style={[styles.fieldRow, idx === section.fields.length - 1 && !( field.key === 'depozito') && { borderBottomWidth: 0 }]}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder={field.placeholder}
                    placeholderTextColor="#999"
                    value={formData[field.key] || ''}
                    onChangeText={(val) => handleChangeText(field.key, val)}
                    keyboardType={(field as any).keyboardType || 'default'}
                    maxLength={(field as any).maxLength || undefined}
                  />
                </View>
                {field.key === 'depozito' && (
                  <>
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Depozito türü</Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        {['TL', 'Dolar', 'Euro', 'Altın'].map(opt => (
                          <TouchableOpacity
                            key={opt}
                            style={{
                              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
                              backgroundColor: formData.depozito_tur === opt ? '#1a2e1a' : '#f0f0f0',
                              borderWidth: 0.5, borderColor: formData.depozito_tur === opt ? '#1a2e1a' : '#ddd',
                            }}
                            onPress={() => setFormData(prev => ({ ...prev, depozito_tur: opt }))}
                          >
                            <Text style={{ color: formData.depozito_tur === opt ? '#fff' : '#555', fontSize: 13 }}>{opt}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    {(formData.depozito_tur === 'Dolar' || formData.depozito_tur === 'Euro' || formData.depozito_tur === 'Altın') && (
                      <View style={styles.fieldRow}>
                        <Text style={styles.fieldLabel}>
                          {formData.depozito_tur === 'Altın' ? 'Altın miktarı (örn: 2 adet tam altın, 5 gram altın)' :
                           formData.depozito_tur === 'Dolar' ? 'Dolar miktarı (örn: 200 USD)' :
                           'Euro miktarı (örn: 200 EUR)'}
                        </Text>
                        <TextInput
                          style={styles.fieldInput}
                          placeholder={
                            formData.depozito_tur === 'Altın' ? '2 adet tam altın' :
                            formData.depozito_tur === 'Dolar' ? '200 USD' : '200 EUR'
                          }
                          placeholderTextColor="#bbb"
                          value={formData.depozito_miktar || ''}
                          onChangeText={val => setFormData(prev => ({ ...prev, depozito_miktar: val }))}
                        />
                      </View>
                    )}
                  </>
                )}
              </React.Fragment>
            ))}
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TAŞINMAZ DURUMU</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Taşınmazın Durumu</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {['Boş', 'Eşyalı', 'Eşyasız'].map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
                    backgroundColor: formData.simdiki_durum === opt ? '#1a2e1a' : '#f0f0f0',
                    borderWidth: 0.5, borderColor: formData.simdiki_durum === opt ? '#1a2e1a' : '#ddd',
                  }}
                  onPress={() => setFormData(prev => ({ ...prev, simdiki_durum: opt }))}
                >
                  <Text style={{ color: formData.simdiki_durum === opt ? '#fff' : '#555', fontSize: 13 }}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {formData.simdiki_durum === 'Eşyalı' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EŞYA LİSTESİ</Text>
            <View style={{ padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' }}>
              <Text style={styles.fieldLabel}>Eşya Adı</Text>
              <TextInput style={styles.fieldInput} placeholder="Buzdolabı" placeholderTextColor="#bbb"
                value={yeniEsya.ad}
                onChangeText={v => setYeniEsya(prev => ({ ...prev, ad: v }))} />
            </View>
            <View style={{ padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' }}>
              <Text style={styles.fieldLabel}>Marka / Model</Text>
              <TextInput style={styles.fieldInput} placeholder="Arçelik / No-Frost" placeholderTextColor="#bbb"
                value={yeniEsya.marka}
                onChangeText={v => setYeniEsya(prev => ({ ...prev, marka: v }))} />
            </View>
            <View style={{ padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' }}>
              <Text style={styles.fieldLabel}>Adet</Text>
              <TextInput style={styles.fieldInput} placeholder="1" placeholderTextColor="#bbb"
                keyboardType="numeric"
                value={yeniEsya.adet}
                onChangeText={v => setYeniEsya(prev => ({ ...prev, adet: v }))} />
            </View>
            <TouchableOpacity
              style={{ margin: 12, backgroundColor: '#1a2e1a', borderRadius: 8, padding: 10, alignItems: 'center' }}
              onPress={() => {
                if (!yeniEsya.ad) return;
                setEsyaListesi(prev => [...prev, yeniEsya]);
                setYeniEsya({ ad: '', marka: '', adet: '1' });
              }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500' }}>+ Eşya Ekle</Text>
            </TouchableOpacity>
            {esyaListesi.length > 0 && (
              <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>Eklenen Eşyalar ({esyaListesi.length})</Text>
                {esyaListesi.map((esya, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#f5f5f5' }}>
                    <Text style={{ flex: 1, fontSize: 12, color: '#333' }}>{i + 1}. {esya.ad}{esya.marka ? ` (${esya.marka})` : ''} — {esya.adet} adet</Text>
                    <TouchableOpacity onPress={() => setEsyaListesi(prev => prev.filter((_, idx) => idx !== i))}>
                      <Text style={{ color: '#dc2626', fontSize: 12, fontWeight: '500' }}>Sil</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VEKALET BİLGİLERİ</Text>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Kiraya veren vekaleten mi işlem yapıyor?</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {['Hayır', 'Evet'].map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
                    backgroundColor: formData.kirayan_vekalet === opt ? '#1a2e1a' : '#f0f0f0',
                    borderWidth: 0.5, borderColor: formData.kirayan_vekalet === opt ? '#1a2e1a' : '#ddd',
                  }}
                  onPress={() => setFormData(prev => ({ ...prev, kirayan_vekalet: opt }))}
                >
                  <Text style={{ color: formData.kirayan_vekalet === opt ? '#fff' : '#555', fontSize: 13 }}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {formData.kirayan_vekalet === 'Evet' && (
            <>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Vekilin Adı Soyadı</Text>
                <TextInput style={styles.fieldInput} placeholder="Ali Veli" placeholderTextColor="#bbb"
                  value={formData.kirayan_vekil_ad || ''}
                  onChangeText={val => setFormData(prev => ({ ...prev, kirayan_vekil_ad: val }))} />
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Vekilin TC No</Text>
                <TextInput style={styles.fieldInput} placeholder="12345678901" placeholderTextColor="#bbb"
                  value={formData.kirayan_vekil_tc || ''}
                  onChangeText={val => setFormData(prev => ({ ...prev, kirayan_vekil_tc: val }))} />
              </View>
            </>
          )}

          <View style={[styles.fieldRow, { marginTop: 8 }]}>
            <Text style={styles.fieldLabel}>Kiracı vekaleten mi işlem yapıyor?</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {['Hayır', 'Evet'].map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
                    backgroundColor: formData.kiraci_vekalet === opt ? '#1a2e1a' : '#f0f0f0',
                    borderWidth: 0.5, borderColor: formData.kiraci_vekalet === opt ? '#1a2e1a' : '#ddd',
                  }}
                  onPress={() => setFormData(prev => ({ ...prev, kiraci_vekalet: opt }))}
                >
                  <Text style={{ color: formData.kiraci_vekalet === opt ? '#fff' : '#555', fontSize: 13 }}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {formData.kiraci_vekalet === 'Evet' && (
            <>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Vekilin Adı Soyadı</Text>
                <TextInput style={styles.fieldInput} placeholder="Ayşe Yılmaz" placeholderTextColor="#bbb"
                  value={formData.kiraci_vekil_ad || ''}
                  onChangeText={val => setFormData(prev => ({ ...prev, kiraci_vekil_ad: val }))} />
              </View>
              <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.fieldLabel}>Vekilin TC No</Text>
                <TextInput style={styles.fieldInput} placeholder="98765432109" placeholderTextColor="#bbb"
                  value={formData.kiraci_vekil_tc || ''}
                  onChangeText={val => setFormData(prev => ({ ...prev, kiraci_vekil_tc: val }))} />
              </View>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KEFİL BİLGİLERİ</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Kefil olacak mı?</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              {['Hayır', 'Evet'].map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
                    backgroundColor: formData.kefil_var === opt ? '#1a2e1a' : '#f0f0f0',
                    borderWidth: 0.5, borderColor: formData.kefil_var === opt ? '#1a2e1a' : '#ddd',
                  }}
                  onPress={() => setFormData(prev => ({ ...prev, kefil_var: opt }))}
                >
                  <Text style={{ color: formData.kefil_var === opt ? '#fff' : '#555', fontSize: 13 }}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {kefilVar && (
            <>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Kaç kefil?</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {['1', '2'].map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={{
                        paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8,
                        backgroundColor: formData.kefil_sayisi === opt ? '#1a2e1a' : '#f0f0f0',
                        borderWidth: 0.5, borderColor: formData.kefil_sayisi === opt ? '#1a2e1a' : '#ddd',
                      }}
                      onPress={() => setFormData(prev => ({ ...prev, kefil_sayisi: opt }))}
                    >
                      <Text style={{ color: formData.kefil_sayisi === opt ? '#fff' : '#555', fontSize: 13 }}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>1. Kefil Ad Soyad</Text>
                <TextInput style={styles.fieldInput} placeholder="Ali Veli" placeholderTextColor="#bbb"
                  value={formData.kefil1_ad || ''}
                  onChangeText={val => setFormData(prev => ({ ...prev, kefil1_ad: val }))} />
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>1. Kefil TC No</Text>
                <TextInput style={styles.fieldInput} placeholder="12345678901" placeholderTextColor="#bbb"
                  value={formData.kefil1_tc || ''}
                  onChangeText={val => setFormData(prev => ({ ...prev, kefil1_tc: val }))} />
              </View>

              {kefilSayisi === 2 && (
                <>
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>2. Kefil Ad Soyad</Text>
                    <TextInput style={styles.fieldInput} placeholder="Ayşe Yılmaz" placeholderTextColor="#bbb"
                      value={formData.kefil2_ad || ''}
                      onChangeText={val => setFormData(prev => ({ ...prev, kefil2_ad: val }))} />
                  </View>
                  <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.fieldLabel}>2. Kefil TC No</Text>
                    <TextInput style={styles.fieldInput} placeholder="98765432109" placeholderTextColor="#bbb"
                      value={formData.kefil2_tc || ''}
                      onChangeText={val => setFormData(prev => ({ ...prev, kefil2_tc: val }))} />
                  </View>
                </>
              )}
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KİMLİK FOTOĞRAFLARI</Text>
          <KimlikFoto
            label="Kiraya Veren Kimlik"
            onFotoSecildi={onFotoKirayanSecildi}
          />
          <KimlikFoto
            label="Kiracı Kimlik"
            onFotoSecildi={onFotoKiraciSecildi}
          />
          {kefilVar && kefilSayisi >= 1 && (
            <KimlikFoto
              label="1. Kefil Kimlik"
              onFotoSecildi={onFotoKefil1Secildi}
            />
          )}
          {kefilVar && kefilSayisi >= 2 && (
            <KimlikFoto
              label="2. Kefil Kimlik"
              onFotoSecildi={onFotoKefil2Secildi}
            />
          )}
        </View>

        <TouchableOpacity style={[styles.generateBtn, { marginBottom: insets.bottom + 8 }]} onPress={handleGenerate} disabled={loading} activeOpacity={0.8}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.generateText}>✦ Sözleşme Oluştur</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0', overflow: 'auto' as any },
  header: { backgroundColor: '#fff', paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0' },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: '#555', lineHeight: 32 },
  headerTitle: { fontSize: 16, fontWeight: '500', color: '#1a1a1a' },
  headerSub: { fontSize: 12, color: '#888' },
  content: { flex: 1, padding: 12 },
  section: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, borderWidth: 0.5, borderColor: '#e0e0e0', overflow: 'hidden' },
  sectionTitle: { fontSize: 11, letterSpacing: 1.5, color: '#888', fontWeight: '500', padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  fieldRow: { padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  fieldLabel: { fontSize: 11, color: '#888', fontWeight: '500', marginBottom: 4 },
  fieldInput: { fontSize: 14, color: '#1a1a1a', backgroundColor: 'transparent' },
  generateBtn: { backgroundColor: '#1a2e1a', borderRadius: 12, padding: 16, alignItems: 'center', margin: 4, marginBottom: 32 },
  generateText: { color: '#fff', fontSize: 16, fontWeight: '500' },
});
