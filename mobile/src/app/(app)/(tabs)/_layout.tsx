 import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { cores } from '@/constants/tema';

// As cores das abas são sempre texto fixo (cores.*); o RN permite cor dinâmica (podendo
// resolver para null/number), mas o Ionicons só aceita string. Aqui nunca chega outra coisa.
function corDoIcone(color: unknown): string | undefined {
  return typeof color === 'string' ? color : undefined;
}

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
            <Ionicons name="restaurant-outline" size={size} color={corDoIcone(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="insumos"
        options={{
          title: 'Insumos',
          tabBarIcon: ({ color, size }) => <Ionicons name="basket-outline" size={size} color={corDoIcone(color)} />,
        }}
      />
      <Tabs.Screen
        name="conta"
        options={{
          title: 'Conta',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={corDoIcone(color)} />,
        }}
      />
    </Tabs>
  );
}
