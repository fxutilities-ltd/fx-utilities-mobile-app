import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Button,
  TextInput,
  RefreshControl,
  Alert,
  Pressable,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { getPurchaseOrders, createPurchaseOrder, PurchaseOrder } from "../services/graphService";
import type { PurchaseOrdersStackParamList } from "../navigation/AppNavigator";

type NavigationProp = NativeStackNavigationProp<PurchaseOrdersStackParamList, "PurchaseOrdersList">;

export default function PurchaseOrdersScreen() {
  const { getAccessToken } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [amount, setAmount] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await getPurchaseOrders(getAccessToken);
      setOrders(data);
    } catch (err) {
      Alert.alert("Couldn't load purchase orders", err instanceof Error ? err.message : String(err));
    }
  }, [getAccessToken]);

  // Also refreshes whenever this screen comes back into focus — e.g. after
  // saving changes on a PO's detail screen and navigating back.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!supplier || Number.isNaN(parsedAmount)) {
      Alert.alert("Missing details", "Enter a supplier name and a valid amount.");
      return;
    }
    try {
      await createPurchaseOrder(getAccessToken, { supplier, amount: parsedAmount });
      setSupplier("");
      setAmount("");
      await load();
    } catch (err) {
      Alert.alert("Couldn't raise PO", err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Raise a PO</Text>
      <TextInput
        style={styles.input}
        placeholder="Supplier"
        value={supplier}
        onChangeText={setSupplier}
      />
      <TextInput
        style={styles.input}
        placeholder="Amount"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />
      <Button title="Raise PO" onPress={onSubmit} />

      <Text style={[styles.heading, { marginTop: 24 }]}>Recent POs</Text>
      <Text style={styles.hint}>Tap a PO to view or edit its details.</Text>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => navigation.navigate("PurchaseOrderDetail", { id: item.id })}
          >
            <Text style={styles.rowTitle}>
              {item.poNumber || item.id} · {item.supplier}
            </Text>
            <Text style={styles.rowStatus}>
              £{typeof item.amount === "number" ? item.amount.toFixed(2) : "—"} · {item.status || "—"}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No purchase orders yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  hint: { fontSize: 12, color: "#999", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowPressed: {
    backgroundColor: "#f5f5f5",
  },
  rowTitle: { fontSize: 15 },
  rowStatus: { fontSize: 13, color: "#888" },
  empty: { color: "#999", marginTop: 8 },
});
