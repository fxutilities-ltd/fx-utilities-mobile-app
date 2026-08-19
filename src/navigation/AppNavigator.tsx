import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import AnnualLeaveScreen from "../screens/AnnualLeaveScreen";
import PurchaseOrdersScreen from "../screens/PurchaseOrdersScreen";
import LeaveRequestDetailScreen from "../screens/LeaveRequestDetailScreen";
import PurchaseOrderDetailScreen from "../screens/PurchaseOrderDetailScreen";

// Each of these tabs now has its own little stack (list screen -> detail
// screen) instead of being a single screen, so tapping a row can push a
// full "view and edit everything" screen. Param lists are exported so the
// screens themselves can type their navigation/route hooks correctly.
export type AnnualLeaveStackParamList = {
  AnnualLeaveList: undefined;
  LeaveRequestDetail: { id: string };
};

export type PurchaseOrdersStackParamList = {
  PurchaseOrdersList: undefined;
  PurchaseOrderDetail: { id: string };
};

const Tab = createBottomTabNavigator();
const AnnualLeaveStack = createNativeStackNavigator<AnnualLeaveStackParamList>();
const PurchaseOrdersStack = createNativeStackNavigator<PurchaseOrdersStackParamList>();

function AnnualLeaveStackNavigator() {
  return (
    <AnnualLeaveStack.Navigator>
      <AnnualLeaveStack.Screen
        name="AnnualLeaveList"
        component={AnnualLeaveScreen}
        options={{ title: "Annual Leave" }}
      />
      <AnnualLeaveStack.Screen
        name="LeaveRequestDetail"
        component={LeaveRequestDetailScreen}
        options={{ title: "Leave Request" }}
      />
    </AnnualLeaveStack.Navigator>
  );
}

function PurchaseOrdersStackNavigator() {
  return (
    <PurchaseOrdersStack.Navigator>
      <PurchaseOrdersStack.Screen
        name="PurchaseOrdersList"
        component={PurchaseOrdersScreen}
        options={{ title: "Purchase Orders" }}
      />
      <PurchaseOrdersStack.Screen
        name="PurchaseOrderDetail"
        component={PurchaseOrderDetailScreen}
        options={{ title: "Purchase Order" }}
      />
    </PurchaseOrdersStack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: true }} />
        <Tab.Screen name="Annual Leave" component={AnnualLeaveStackNavigator} />
        <Tab.Screen name="Purchase Orders" component={PurchaseOrdersStackNavigator} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
