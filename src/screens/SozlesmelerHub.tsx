import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import HubSegmentBar from '../components/HubSegmentBar';
import KayitlarScreen from './KayitlarScreen';
import ListeScreen from './ListeScreen';

export default function SozlesmelerHub({ navigation }: any) {
  const { colors } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <HubSegmentBar
        tabs={['Kayıtlı', 'Liste']}
        activeIndex={activeIndex}
        onTabPress={setActiveIndex}
      />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {activeIndex === 0
          ? <KayitlarScreen navigation={navigation} />
          : <ListeScreen navigation={navigation} />
        }
      </View>
    </SafeAreaView>
  );
}
