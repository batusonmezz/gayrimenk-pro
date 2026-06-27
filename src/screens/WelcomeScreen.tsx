import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

type RoleOption = {
  role: 'emlakci' | 'mal_sahibi' | 'kiraci';
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
};

const ROLES: RoleOption[] = [
  {
    role: 'emlakci',
    icon: 'grid-outline',
    title: 'Gayrimenkul Yöneticisi',
    desc: 'Portföy ve operasyon yönetimi',
  },
  {
    role: 'mal_sahibi',
    icon: 'business-outline',
    title: 'Gayrimenkul Sahibi',
    desc: 'Mülklerimi ve gelir durumumu gör',
  },
  {
    role: 'kiraci',
    icon: 'person-outline',
    title: 'Kiracı',
    desc: 'Sözleşme ve ödemelerimi görüntüle',
  },
];

type Props = { navigation: any };

export default function WelcomeScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoArea}>
          <Text style={styles.brand}>GAYRİMENK PRO</Text>
          <Text style={styles.heading}>Hoş geldiniz</Text>
          <Text style={styles.subheading}>
            Devam etmek için hesap tipinizi seçin
          </Text>
        </View>

        <View style={styles.cards}>
          {ROLES.map((item) => (
            <TouchableOpacity
              key={item.role}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Login', { role: item.role })}
            >
              <View style={styles.cardIcon}>
                <Ionicons name={item.icon} size={24} color={colors.primaryAccent} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.footer}>
          Hesabınız yok mu? Yöneticinizden davet isteyin
        </Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 36,
  },
  brand: {
    fontSize: 11,
    letterSpacing: 2,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 16,
  },
  heading: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  cards: {
    gap: 10,
    marginBottom: 36,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.accentSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.textMuted,
  },
  cardArrow: {
    fontSize: 22,
    color: colors.border,
    marginLeft: 8,
  },
  footer: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
