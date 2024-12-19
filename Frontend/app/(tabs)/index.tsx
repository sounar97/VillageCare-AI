import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { signInWithNameAndEmail } from "../../lib/appwrite";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    if (!username || !email) {
      Alert.alert("Missing Input", "Please enter both name and email.");
      return;
    }

    try {
      const user = await signInWithNameAndEmail(username, email);
      Alert.alert("Success", `Welcome ${user.username || "User"}!`);
      router.push("/health"); // Redirect to HealthScreen
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to login.");
    }
  };

  const handleSkip = () => {
    router.push("/health"); // Navigate directly without login
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipButtonText}>Skip for Now</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16, backgroundColor: "#FFFFFF"},
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20,color: "#333",},
  input: {
    width: "100%",
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    marginBottom: 20,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f9f9f9", // Slightly off-white input background
    color: "#333", // Dark text for input
  },
  button: { backgroundColor: "#1e88e5", padding: 15, borderRadius: 8, alignItems: "center", width: "100%" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  skipButton: { marginTop: 10 },
  skipButtonText: { color: "#1e88e5", fontSize: 16 },
});
