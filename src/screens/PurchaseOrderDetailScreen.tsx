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
  Switch,
  Pressable,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import {
  getPurchaseOrder,
  updatePurchaseOrder,
  EditablePurchaseOrder,
  PO_STATUS_CHOICES,
  PO_ITEM_TYPE_CHOICES,
} from "../services/graphService";
import type { PurchaseOrdersStackParamList } from "../navigation/AppNavigator";

type DetailRouteProp = RouteProp<PurchaseOrdersStackParamList, "PurchaseOrderDetail">;
type DetailNavigationProp = NativeStackNavigationProp<
  PurchaseOrdersStackParamList,
  "PurchaseOrderDetail"
>;

const EMPTY_FORM: EditablePurchaseOrder = {
  poNumber: "",
  requesterName: "",
  requesterEmail: "",
  supplier: "",
  department: "",
  status: "",
  amount: "",
  notes: "",
  dateRaised: "",
  approverName: "",
  approverEmail: "",
  approvalDate: "",
  approvalComments: "",
  isRecharge: false,
  rechargeNotes: "",
  itemType: "",
  contract: "",
  proFormaUrl: "",
  rechargeName: "",
  rechargeDepartment: "",
  rechargeAdminCharge: "",
};

export default function PurchaseOrderDetailScreen() {
  const { getAccessToken } = useAuth();
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation<DetailNavigationProp>();
  const { id } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditablePurchaseOrder>(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const po = await getPurchaseOrder(getAccessToken, id);
      setForm({
        poNumber: po.poNumber,
        requesterName: po.requesterName,
        requesterEmail: po.requesterEmail,
        supplier: po.supplier,
        department: po.department,
        status: po.status,
        amount: po.amount !== null ? String(po.amount) : "",
        notes: po.notes,
        dateRaised: po.dateRaised,
        approverName: po.approverName,
        approverEmail: po.approverEmail,
        approvalDate: po.approvalDate,
        approvalComments: po.approvalComments,
        isRecharge: po.isRecharge,
        rechargeNotes: po.rechargeNotes,
        itemType: po.itemType,
        contract: po.contract,
        proFormaUrl: po.proFormaUrl,
        rechargeName: po.rechargeName,
        rechargeDepartment: po.rechargeDepartment,
        rechargeAdminCharge: po.rechargeAdminCharge !== null ? String(po.rechargeAdminCharge) : "",
      });
    } catch (err) {
      Alert.alert("Couldn't load this PO", err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, id]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = <K extends keyof EditablePurchaseOrder>(key: K) => (
    value: EditablePurchaseOrder[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await updatePurchaseOrder(getAccessToken, id, form);
      Alert.alert("Saved", "This purchase order has been updated.");
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
      <Field label="PO reference" value={form.poNumber} onChangeText={setField("poNumber")} />
      <Field label="Requester name" value={form.requesterName} onChangeText={setField("requesterName")} />
      <Field
        label="Requester email"
        value={form.requesterEmail}
        onChangeText={setField("requesterEmail")}
        keyboardType="email-address"
      />
      <Field label="Vendor" value={form.supplier} onChangeText={setField("supplier")} />
      <Field label="Department" value={form.department} onChangeText={setField("department")} />

      <View style={styles.field}>
        <Text style={styles.label}>Status</Text>
        <ChoiceChips
          choices={PO_STATUS_CHOICES}
          value={form.status}
          onChange={setField("status")}
        />
      </View>

      <Field
        label="Total amount (£)"
        value={form.amount}
        onChangeText={setField("amount")}
        keyboardType="decimal-pad"
      />
      <Field label="Notes" value={form.notes} onChangeText={setField("notes")} multiline />
      <Field
        label="Date raised (YYYY-MM-DD)"
        value={form.dateRaised}
        onChangeText={setField("dateRaised")}
      />
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

      <View style={styles.field}>
        <Text style={styles.label}>Item type</Text>
        <ChoiceChips
          choices={PO_ITEM_TYPE_CHOICES}
          value={form.itemType}
          onChange={setField("itemType")}
        />
      </View>

      <Field label="Contract" value={form.contract} onChangeText={setField("contract")} />
      <Field
        label="Pro forma URL"
        value={form.proFormaUrl}
        onChangeText={setField("proFormaUrl")}
        autoCapitalize="none"
      />

      <View style={[styles.field, styles.switchRow]}>
        <Text style={styles.label}>Is recharge</Text>
        <Switch value={form.isRecharge} onValueChange={setField("isRecharge")} />
      </View>

      {form.isRecharge ? (
        <>
          <Field label="Recharge name" value={form.rechargeName} onChangeText={setField("rechargeName")} />
          <Field
            label="Recharge department"
            value={form.rechargeDepartment}
            onChangeText={setField("rechargeDepartment")}
          />
          <Field
            label="Recharge admin charge (£)"
            value={form.rechargeAdminCharge}
            onChangeText={setField("rechargeAdminCharge")}
            keyboardType="decimal-pad"
          />
          <Field
            label="Recharge notes"
            value={form.rechargeNotes}
            onChangeText={setField("rechargeNotes")}
            multiline
          />
        </>
      ) : null}

      <View style={{ marginTop: 16 }}>
        <Button title={saving ? "Saving..." : "Save changes"} onPress={onSave} disabled={saving} />
      </View>
    </ScrollView>
  );
}

function ChoiceChips({
  choices,
  value,
  onChange,
}: {
  choices: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {choices.map((choice) => {
        const selected = choice === value;
        return (
          <Pressable
            key={choice}
            onPress={() => onChange(choice)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{choice}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "email-address" | "decimal-pad";
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences";
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
        autoCapitalize={autoCapitalize ?? "none"}
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
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: "#1c3d5a",
    borderColor: "#1c3d5a",
  },
  chipText: {
    fontSize: 13,
    color: "#333",
  },
  chipTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
});
