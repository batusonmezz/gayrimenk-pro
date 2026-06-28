import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import HubSegmentBar from '../components/HubSegmentBar';
import KisilerScreen from './KisilerScreen';
import MalSahibiScreen from './MalSahibiScreen';
import SitelerScreen from './SitelerScreen';

export default function KisilerHub({ navigation }: any) {
  const { colors } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <HubSegmentBar
        tabs={['Kişiler', 'Mal Sahipleri', 'Mülkler']}
        activeIndex={activeIndex}
        onTabPress={setActiveIndex}
      />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {activeIndex === 0
          ? <KisilerScreen navigation={navigation} />
          : activeIndex === 1
          ? <MalSahibiScreen navigation={navigation} />
          : <SitelerScreen navigation={navigation} />
        }
      </View>
    </SafeAreaView>
  );
}
