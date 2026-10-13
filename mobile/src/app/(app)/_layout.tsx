import { Stack } from 'expo-router';

// Área logada. Só é alcançada com sessão válida (ver a proteção em src/app/_layout.tsx).
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
