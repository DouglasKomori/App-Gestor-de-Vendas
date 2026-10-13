import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { cores } from '@/constants/tema';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: cores.primaria,
        tabBarInactiveTintColor: cores.textoSuave,
        headerTitleStyle: { color: cores.texto },
        sceneStyle: { backgroundColor: cores.fundo },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Receitas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="insumos"
        options={{
          title: 'Insumos',
          tabBarIcon: ({ color, size }) => <Ionicons name="basket-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="conta"
        options={{
          title: 'Conta',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
