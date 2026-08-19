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
import { getLeaveRequests, submitLeaveRequest, LeaveRequest } from "../services/graphService";
import type { AnnualLeaveStackParamList } from "../navigation/AppNavigator";

type NavigationProp = NativeStackNavigationProp<AnnualLeaveStackParamList, "AnnualLeaveList">;

export default function AnnualLeaveScreen() {
  const { getAccessToken } = useAuth();
  const navigation = useNavigation<NavigationProp>();
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

  // Also refreshes whenever this screen comes back into focus — e.g. after
  // saving changes on a request's detail screen and navigating back.
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
      <Text style={styles.hint}>Tap a request to view or edit its details.</Text>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => navigation.navigate("LeaveRequestDetail", { id: item.id })}
          >
            <View>
              <Text style={styles.rowTitle}>
                {item.startDate} → {item.endDate}
              </Text>
              {item.employeeName ? (
                <Text style={styles.rowSubtitle}>{item.employeeName}</Text>
              ) : null}
            </View>
            <Text style={styles.rowStatus}>{item.status || "—"}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No leave requests yet.</Text>}
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
  rowSubtitle: { fontSize: 12, color: "#999", marginTop: 2 },
  rowStatus: { fontSize: 13, color: "#888" },
  empty: { color: "#999", marginTop: 8 },
});
