import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';

interface HubSegmentBarProps {
  tabs: string[];
  activeIndex: number;
  onTabPress: (index: number) => void;
}

export default function HubSegmentBar({ tabs, activeIndex, onTabPress }: HubSegmentBarProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
      {tabs.map((tab, i) => (
        <TouchableOpacity
          key={tab}
          onPress={() => onTabPress(i)}
          style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}
          activeOpacity={0.7}
        >
          <Text style={{
            fontWeight: i === activeIndex ? '700' : '400',
            color: i === activeIndex ? colors.primaryAccent : colors.textMuted,
            fontSize: 14,
          }}>
            {tab}
          </Text>
          {i === activeIndex && (
            <View style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 2,
              backgroundColor: colors.primaryAccent,
            }} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}
