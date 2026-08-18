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
import { getLeaveRequests, submitLeaveRequest, LeaveRequest } from "../services/graphService";

export default function AnnualLeaveScreen() {
  const { getAccessToken } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await getLeaveRequests(getAccessToken);
      setRequests(data);
    } catch (err) {
      Alert.alert("Couldn't load leave requests", err instanceof Error ? err.message : String(err));
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
    if (!startDate || !endDate) {
      Alert.alert("Missing dates", "Enter a start and end date (YYYY-MM-DD).");
      return;
    }
    try {
      await submitLeaveRequest(getAccessToken, { startDate, endDate });
      setStartDate("");
      setEndDate("");
      await load();
    } catch (err) {
      Alert.alert("Couldn't submit request", err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>New request</Text>
      <TextInput
        style={styles.input}
        placeholder="Start date (YYYY-MM-DD)"
        value={startDate}
        onChangeText={setStartDate}
      />
      <TextInput
        style={styles.input}
        placeholder="End date (YYYY-MM-DD)"
        value={endDate}
        onChangeText={setEndDate}
      />
      <Button title="Submit request" onPress={onSubmit} />

      <Text style={[styles.heading, { marginTop: 24 }]}>Your requests</Text>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>
              {item.startDate} → {item.endDate}
            </Text>
            <Text style={styles.rowStatus}>{item.status}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No leave requests yet.</Text>}
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
