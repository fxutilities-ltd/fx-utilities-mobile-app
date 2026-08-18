import React from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import AppNavigator from "./src/navigation/AppNavigator";

function Root() {
  const { account, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return account ? <AppNavigator /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
