import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Login" }} />
      <Stack.Screen name="health" options={{ title: "Health Dashboard" }} />
      <Stack.Screen name="save-records" options={{ title: "Save Records" }} />
    </Stack>
  );
}
