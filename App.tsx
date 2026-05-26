import 'react-native-gesture-handler';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import FormScreen from './src/screens/FormScreen';
import PreviewScreen from './src/screens/PreviewScreen';
import ResearchScreen from './src/screens/ResearchScreen';
import KayitlarScreen from './src/screens/KayitlarScreen';
import MalSahibiScreen from './src/screens/MalSahibiScreen';
import ListeScreen from './src/screens/ListeScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, height: '100vh' as any, overflow: 'auto' as any }}>
        <NavigationContainer style={{ flex: 1, height: '100vh' as any } as any}>
          <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { flex: 1, overflow: 'auto' as any } }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Form" component={FormScreen} />
            <Stack.Screen name="Preview" component={PreviewScreen} />
            <Stack.Screen name="Research" component={ResearchScreen} />
            <Stack.Screen name="Kayitlar" component={KayitlarScreen} />
            <Stack.Screen name="MalSahipleri" component={MalSahibiScreen} />
            <Stack.Screen name="Liste" component={ListeScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
}
