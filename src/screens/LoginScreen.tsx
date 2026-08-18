import React, { useState } from "react";
import { View, Text, Button, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useAuth } from "../auth/AuthContext";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signIn();
    } catch (err) {
      Alert.alert("Sign-in failed", err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FX Utilities</Text>
      <Text style={styles.subtitle}>Annual Leave & Purchase Orders</Text>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <Button title="Sign in with Microsoft 365" onPress={handleSignIn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 16, color: "#555", marginBottom: 32 },
});
