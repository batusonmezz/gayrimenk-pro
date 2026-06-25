import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface HubSegmentBarProps {
  tabs: string[];
  activeIndex: number;
  onTabPress: (index: number) => void;
}

const PRIMARY = '#0f6e56'; // colors.primaryAccent

export default function HubSegmentBar({ tabs, activeIndex, onTabPress }: HubSegmentBarProps) {
  return (
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
      {tabs.map((tab, i) => (
        <TouchableOpacity
          key={tab}
          onPress={() => onTabPress(i)}
          style={{ flex: 1, alignItems: 'center', paddingVertical: 10 }}
          activeOpacity={0.7}
        >
          <Text style={{
            fontWeight: i === activeIndex ? '700' : '400',
            color: i === activeIndex ? PRIMARY : '#6B7280',
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
              backgroundColor: PRIMARY,
            }} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}
