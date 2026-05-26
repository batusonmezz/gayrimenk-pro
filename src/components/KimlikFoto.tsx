import { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface Props {
  label: string;
  onFotoSecildi: (on: string, arka: string) => void;
}

export default function KimlikFoto({ label, onFotoSecildi }: Props) {
  const [on, setOn] = useState('');
  const [arka, setArka] = useState('');

  const secFoto = async (taraf: 'on' | 'arka') => {
    const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!izin.granted) {
      Alert.alert('İzin gerekli', 'Fotoğraf seçmek için galeri izni gerekli.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      exif: false,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0].base64) {
      const base64 = result.assets[0].base64;
      if (taraf === 'on') {
        setOn(base64);
        onFotoSecildi(base64, arka);
      } else {
        setArka(base64);
        onFotoSecildi(on, base64);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TouchableOpacity style={styles.fotoBtn} onPress={() => secFoto('on')}>
          {on ? (
            <Image source={{ uri: `data:image/jpeg;base64,${on}` }} style={styles.foto} />
          ) : (
            <Text style={styles.fotoBtnText}>📷 Ön Yüz</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.fotoBtn} onPress={() => secFoto('arka')}>
          {arka ? (
            <Image source={{ uri: `data:image/jpeg;base64,${arka}` }} style={styles.foto} />
          ) : (
            <Text style={styles.fotoBtnText}>📷 Arka Yüz</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  label: { fontSize: 11, color: '#888', fontWeight: '500', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8 },
  fotoBtn: { flex: 1, height: 80, backgroundColor: '#f5f5f0', borderRadius: 8, borderWidth: 0.5, borderColor: '#e0e0e0', alignItems: 'center', justifyContent: 'center' },
  fotoBtnText: { fontSize: 12, color: '#888' },
  foto: { width: '100%', height: '100%', borderRadius: 8 },
});
