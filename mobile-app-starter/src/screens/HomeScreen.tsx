import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { getMe, GraphUser } from "../services/graphService";

export default function HomeScreen() {
  const { getAccessToken, signOut } = useAuth();
  const [user, setUser] = useState<GraphUser | null>(null);

  useEffect(() => {
    getMe(getAccessToken)
      .then(setUser)
      .catch((err) => console.warn("Failed to load profile:", err));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>
        {user ? `Hi, ${user.displayName}` : "Loading your profile..."}
      </Text>
      <Text style={styles.hint}>
        Use the tabs below to view Annual Leave or Purchase Orders.
      </Text>
      <View style={styles.signOut}>
        <Button title="Sign out" onPress={signOut} color="#a33" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  greeting: { fontSize: 22, fontWeight: "600", marginBottom: 8 },
  hint: { fontSize: 14, color: "#666" },
  signOut: { marginTop: "auto", marginBottom: 24 },
});
