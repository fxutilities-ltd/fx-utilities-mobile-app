import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/HomeScreen";
import AnnualLeaveScreen from "../screens/AnnualLeaveScreen";
import PurchaseOrdersScreen from "../screens/PurchaseOrdersScreen";

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: true }}>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Annual Leave" component={AnnualLeaveScreen} />
        <Tab.Screen name="Purchase Orders" component={PurchaseOrdersScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
