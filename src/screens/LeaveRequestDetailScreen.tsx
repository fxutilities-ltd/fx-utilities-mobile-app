import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Button,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import {
  getLeaveRequest,
  updateLeaveRequest,
  EditableLeaveRequest,
} from "../services/graphService";
import type { AnnualLeaveStackParamList } from "../navigation/AppNavigator";

type DetailRouteProp = RouteProp<AnnualLeaveStackParamList, "LeaveRequestDetail">;
type DetailNavigationProp = NativeStackNavigationProp<
  AnnualLeaveStackParamList,
  "LeaveRequestDetail"
>;

const EMPTY_FORM: EditableLeaveRequest = {
  employeeName: "",
  employeeEmail: "",
  department: "",
  startDate: "",
  endDate: "",
  daysRequested: "",
  status: "",
  approverName: "",
  approverEmail: "",
  approvalDate: "",
  approvalComments: "",
  notes: "",
};

export default function LeaveRequestDetailScreen() {
  const { getAccessToken } = useAuth();
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation<DetailNavigationProp>();
  const { id } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // "Date requested" reads like an audit/system field (similar to
  // SharePoint's built-in "Created" date) rather than something you'd
  // normally hand-edit, so it's shown read-only rather than as an input.
  const [dateRequested, setDateRequested] = useState("");
  const [form, setForm] = useState<EditableLeaveRequest>(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const request = await getLeaveRequest(getAccessToken, id);
      setForm({
        employeeName: request.employeeName,
        employeeEmail: request.employeeEmail,
        department: request.department,
        startDate: request.startDate,
        endDate: request.endDate,
        daysRequested: request.daysRequested,
        status: request.status,
        approverName: request.approverName,
        approverEmail: request.approverEmail,
        approvalDate: request.approvalDate,
        approvalComments: request.approvalComments,
        notes: request.notes,
      });
      setDateRequested(request.dateRequested);
    } catch (err) {
      Alert.alert("Couldn't load this request", err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, id]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (key: keyof EditableLeaveRequest) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await updateLeaveRequest(getAccessToken, id, form);
      Alert.alert("Saved", "This leave request has been updated.");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Couldn't save changes", err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Field label="Employee name" value={form.employeeName} onChangeText={setField("employeeName")} />
      <Field
        label="Employee email"
        value={form.employeeEmail}
        onChangeText={setField("employeeEmail")}
        keyboardType="email-address"
      />
      <Field label="Department" value={form.department} onChangeText={setField("department")} />
      <Field
        label="Start date (YYYY-MM-DD)"
        value={form.startDate}
        onChangeText={setField("startDate")}
      />
      <Field label="End date (YYYY-MM-DD)" value={form.endDate} onChangeText={setField("endDate")} />
      <Field
        label="Days requested"
        value={form.daysRequested}
        onChangeText={setField("daysRequested")}
        keyboardType="decimal-pad"
      />
      <Field label="Status" value={form.status} onChangeText={setField("status")} />
      <Field label="Approver name" value={form.approverName} onChangeText={setField("approverName")} />
      <Field
        label="Approver email"
        value={form.approverEmail}
        onChangeText={setField("approverEmail")}
        keyboardType="email-address"
      />
      <Field
        label="Approval date (YYYY-MM-DD)"
        value={form.approvalDate}
        onChangeText={setField("approvalDate")}
      />
      <Field
        label="Approval comments"
        value={form.approvalComments}
        onChangeText={setField("approvalComments")}
        multiline
      />
      <Field label="Notes" value={form.notes} onChangeText={setField("notes")} multiline />

      {dateRequested ? (
        <View style={styles.readOnlyRow}>
          <Text style={styles.readOnlyLabel}>Date requested</Text>
          <Text style={styles.readOnlyValue}>{dateRequested}</Text>
        </View>
      ) : null}

      <View style={{ marginTop: 16 }}>
        <Button title={saving ? "Saving..." : "Save changes"} onPress={onSave} disabled={saving} />
      </View>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "email-address" | "decimal-pad";
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  field: { marginBottom: 14 },
  label: { fontSize: 13, color: "#666", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  readOnlyRow: {
    marginTop: 8,
    marginBottom: 8,
  },
  readOnlyLabel: { fontSize: 13, color: "#999" },
  readOnlyValue: { fontSize: 15, color: "#444" },
});
