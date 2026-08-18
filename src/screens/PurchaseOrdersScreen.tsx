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
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../auth/AuthContext";
import { getPurchaseOrders, createPurchaseOrder, PurchaseOrder } from "../services/graphService";

export default function PurchaseOrdersScreen() {
  const { getAccessToken } = useAuth();
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
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>
              {item.poNumber || item.id} · {item.supplier}
            </Text>
            <Text style={styles.rowStatus}>
              £{item.amount.toFixed(2)} · {item.status}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No purchase orders yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowTitle: { fontSize: 15 },
  rowStatus: { fontSize: 13, color: "#888" },
  empty: { color: "#999", marginTop: 8 },
});
