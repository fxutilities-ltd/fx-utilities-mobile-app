import { appConfig } from "../config/appConfig";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/**
 * Shared authenticated fetch helper. Pass the token getter from AuthContext
 * (`getAccessToken`) so every call here goes through the silent refresh
 * logic in AuthContext.
 */
async function graphFetch<T>(
  getAccessToken: () => Promise<string>,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Graph request failed (${res.status}): ${body}`);
  }

  // 204 No Content (e.g. after a DELETE, and some PATCH responses) has no
  // body to parse.
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const text = await res.text();
  if (!text) {
    return undefined as unknown as T;
  }
  return JSON.parse(text) as T;
}

// ---------------------------------------------------------------------------
// Current user
// ---------------------------------------------------------------------------

export interface GraphUser {
  displayName: string;
  mail: string;
  jobTitle?: string;
}

export function getMe(getAccessToken: () => Promise<string>) {
  return graphFetch<GraphUser>(getAccessToken, "/me");
}

interface ListItemResponse<TFields> {
  value: Array<{ id: string; fields: TFields }>;
}

// ---------------------------------------------------------------------------
// Annual Leave list
//
// Field names below were confirmed against the real "Leave Requests"
// SharePoint list via Graph Explorer (GET .../lists/{list-id}/columns) —
// they are the list's actual internal column names, which is why they
// don't all match the original guesses (there's no "RequestedBy" column,
// for example — the real one is "EmployeeName").
// ---------------------------------------------------------------------------

export interface LeaveRequest {
  id: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  startDate: string;
  endDate: string;
  /** Kept as a string so it binds directly to a text input; parsed to a number on save. */
  daysRequested: string;
  status: string;
  approverName: string;
  approverEmail: string;
  approvalDate: string;
  approvalComments: string;
  notes: string;
  dateRequested: string;
}

interface LeaveRequestFields {
  Title?: string;
  EmployeeName?: string;
  EmployeeEmail?: string;
  Department?: string;
  StartDate?: string;
  EndDate?: string;
  DaysRequested?: number | null;
  Status?: string;
  ApproverName?: string;
  ApproverEmail?: string;
  ApprovalDate?: string;
  ApprovalComments?: string;
  Notes?: string;
  DateRequested?: string;
}

function mapLeaveFields(id: string, fields: LeaveRequestFields): LeaveRequest {
  return {
    id,
    employeeName: fields.EmployeeName ?? "",
    employeeEmail: fields.EmployeeEmail ?? "",
    department: fields.Department ?? "",
    startDate: fields.StartDate ?? "",
    endDate: fields.EndDate ?? "",
    daysRequested:
      fields.DaysRequested !== undefined && fields.DaysRequested !== null
        ? String(fields.DaysRequested)
        : "",
    status: fields.Status ?? "",
    approverName: fields.ApproverName ?? "",
    approverEmail: fields.ApproverEmail ?? "",
    approvalDate: fields.ApprovalDate ?? "",
    approvalComments: fields.ApprovalComments ?? "",
    notes: fields.Notes ?? "",
    dateRequested: fields.DateRequested ?? "",
  };
}

export async function getLeaveRequests(
  getAccessToken: () => Promise<string>
): Promise<LeaveRequest[]> {
  const { siteId, listId } = appConfig.annualLeave;
  const data = await graphFetch<ListItemResponse<LeaveRequestFields>>(
    getAccessToken,
    `/sites/${siteId}/lists/${listId}/items?expand=fields`
  );
  return data.value.map((item) => mapLeaveFields(item.id, item.fields));
}

export async function getLeaveRequest(
  getAccessToken: () => Promise<string>,
  id: string
): Promise<LeaveRequest> {
  const { siteId, listId } = appConfig.annualLeave;
  const item = await graphFetch<{ id: string; fields: LeaveRequestFields }>(
    getAccessToken,
    `/sites/${siteId}/lists/${listId}/items/${id}?expand=fields`
  );
  return mapLeaveFields(item.id, item.fields);
}

export async function submitLeaveRequest(
  getAccessToken: () => Promise<string>,
  request: { startDate: string; endDate: string; notes?: string }
): Promise<LeaveRequest> {
  const { siteId, listId } = appConfig.annualLeave;
  const created = await graphFetch<{ id: string; fields: LeaveRequestFields }>(
    getAccessToken,
    `/sites/${siteId}/lists/${listId}/items`,
    {
      method: "POST",
      body: JSON.stringify({
        fields: {
          StartDate: request.startDate,
          EndDate: request.endDate,
          Status: "Pending",
          Notes: request.notes ?? "",
        },
      }),
    }
  );
  return mapLeaveFields(created.id, created.fields);
}

/** Everything on a leave request that the detail screen lets you edit. */
export interface EditableLeaveRequest {
  employeeName: string;
  employeeEmail: string;
  department: string;
  startDate: string;
  endDate: string;
  /** Numeric string; leave blank to clear the field. */
  daysRequested: string;
  status: string;
  approverName: string;
  approverEmail: string;
  approvalDate: string;
  approvalComments: string;
  notes: string;
}

export async function updateLeaveRequest(
  getAccessToken: () => Promise<string>,
  id: string,
  edited: EditableLeaveRequest
): Promise<void> {
  const { siteId, listId } = appConfig.annualLeave;
  const daysRequestedTrimmed = edited.daysRequested.trim();
  const parsedDays = daysRequestedTrimmed === "" ? null : parseFloat(daysRequestedTrimmed);

  await graphFetch<unknown>(
    getAccessToken,
    `/sites/${siteId}/lists/${listId}/items/${id}/fields`,
    {
      method: "PATCH",
      body: JSON.stringify({
        EmployeeName: edited.employeeName,
        EmployeeEmail: edited.employeeEmail,
        Department: edited.department,
        StartDate: edited.startDate,
        EndDate: edited.endDate,
        DaysRequested: parsedDays !== null && Number.isNaN(parsedDays) ? null : parsedDays,
        Status: edited.status,
        ApproverName: edited.approverName,
        ApproverEmail: edited.approverEmail,
        ApprovalDate: edited.approvalDate,
        ApprovalComments: edited.approvalComments,
        Notes: edited.notes,
      }),
    }
  );
}

// ---------------------------------------------------------------------------
// Purchase Order (PO) list
//
// Field names below were confirmed against the real "Purchase Orders"
// SharePoint list via Graph Explorer. Notably there's no dedicated PO-number
// column — the list uses SharePoint's built-in "Title" field for that — and
// "Status"/"ItemType" are fixed dropdown (choice) columns in the real list,
// not free text.
// ---------------------------------------------------------------------------

/** The exact choices configured on the real "Status" column for this list. */
export const PO_STATUS_CHOICES = [
  "Draft",
  "Submitted",
  "Approved",
  "Rejected",
  "Ordered",
  "Received",
  "Cancelled",
  "Delivered",
] as const;

/** The exact choices configured on the real "ItemType" column for this list. */
export const PO_ITEM_TYPE_CHOICES = ["Consumable", "Asset"] as const;

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  requesterName: string;
  requesterEmail: string;
  supplier: string;
  department: string;
  status: string;
  amount: number | null;
  notes: string;
  dateRaised: string;
  approverName: string;
  approverEmail: string;
  approvalDate: string;
  approvalComments: string;
  isRecharge: boolean;
  rechargeNotes: string;
  itemType: string;
  contract: string;
  proFormaUrl: string;
  rechargeName: string;
  rechargeDepartment: string;
  rechargeAdminCharge: number | null;
}

interface PurchaseOrderFields {
  Title?: string;
  RequesterName?: string;
  RequesterEmail?: string;
  Vendor?: string;
  Department?: string;
  Status?: string;
  TotalAmount?: number | null;
  Notes?: string;
  DateRaised?: string;
  ApproverName?: string;
  ApproverEmail?: string;
  ApprovalDate?: string;
  ApprovalComments?: string;
  IsRecharge?: boolean;
  RechargeNotes?: string;
  ItemType?: string;
  Contract?: string;
  ProFormaUrl?: string;
  RechargeName?: string;
  RechargeDepartment?: string;
  RechargeAdminCharge?: number | null;
}

function mapPoFields(id: string, fields: PurchaseOrderFields): PurchaseOrder {
  return {
    id,
    poNumber: fields.Title ?? "",
    requesterName: fields.RequesterName ?? "",
    requesterEmail: fields.RequesterEmail ?? "",
    supplier: fields.Vendor ?? "",
    department: fields.Department ?? "",
    status: fields.Status ?? "",
    amount:
      fields.TotalAmount !== undefined && fields.TotalAmount !== null
        ? fields.TotalAmount
        : null,
    notes: fields.Notes ?? "",
    dateRaised: fields.DateRaised ?? "",
    approverName: fields.ApproverName ?? "",
    approverEmail: fields.ApproverEmail ?? "",
    approvalDate: fields.ApprovalDate ?? "",
    approvalComments: fields.ApprovalComments ?? "",
    isRecharge: fields.IsRecharge ?? false,
    rechargeNotes: fields.RechargeNotes ?? "",
    itemType: fields.ItemType ?? "",
    contract: fields.Contract ?? "",
    proFormaUrl: fields.ProFormaUrl ?? "",
    rechargeName: fields.RechargeName ?? "",
    rechargeDepartment: fields.RechargeDepartment ?? "",
    rechargeAdminCharge:
      fields.RechargeAdminCharge !== undefined && fields.RechargeAdminCharge !== null
        ? fields.RechargeAdminCharge
        : null,
  };
}

export async function getPurchaseOrders(
  getAccessToken: () => Promise<string>
): Promise<PurchaseOrder[]> {
  const { siteId, listId } = appConfig.purchaseOrders;
  const data = await graphFetch<ListItemResponse<PurchaseOrderFields>>(
    getAccessToken,
    `/sites/${siteId}/lists/${listId}/items?expand=fields`
  );
  return data.value.map((item) => mapPoFields(item.id, item.fields));
}

export async function getPurchaseOrder(
  getAccessToken: () => Promise<string>,
  id: string
): Promise<PurchaseOrder> {
  const { siteId, listId } = appConfig.purchaseOrders;
  const item = await graphFetch<{ id: string; fields: PurchaseOrderFields }>(
    getAccessToken,
    `/sites/${siteId}/lists/${listId}/items/${id}?expand=fields`
  );
  return mapPoFields(item.id, item.fields);
}

export async function createPurchaseOrder(
  getAccessToken: () => Promise<string>,
  po: { supplier: string; amount: number }
): Promise<PurchaseOrder> {
  const { siteId, listId } = appConfig.purchaseOrders;
  const created = await graphFetch<{ id: string; fields: PurchaseOrderFields }>(
    getAccessToken,
    `/sites/${siteId}/lists/${listId}/items`,
    {
      method: "POST",
      body: JSON.stringify({
        fields: {
          // "Title" is required by SharePoint and doubles as the PO
          // reference in this list. There's no auto-numbering set up yet,
          // so this is a readable placeholder you can edit afterwards from
          // the PO's detail screen — replace with a real PO numbering
          // scheme later if you want sequential PO numbers.
          Title: `${po.supplier} — ${new Date().toLocaleDateString("en-GB")}`,
          Vendor: po.supplier,
          TotalAmount: po.amount,
          Status: "Draft",
        },
      }),
    }
  );
  return mapPoFields(created.id, created.fields);
}

/** Everything on a PO that the detail screen lets you edit. */
export interface EditablePurchaseOrder {
  poNumber: string;
  requesterName: string;
  requesterEmail: string;
  supplier: string;
  department: string;
  status: string;
  /** Numeric string; leave blank to clear the field. */
  amount: string;
  notes: string;
  dateRaised: string;
  approverName: string;
  approverEmail: string;
  approvalDate: string;
  approvalComments: string;
  isRecharge: boolean;
  rechargeNotes: string;
  itemType: string;
  contract: string;
  proFormaUrl: string;
  rechargeName: string;
  rechargeDepartment: string;
  /** Numeric string; leave blank to clear the field. */
  rechargeAdminCharge: string;
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = parseFloat(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function updatePurchaseOrder(
  getAccessToken: () => Promise<string>,
  id: string,
  edited: EditablePurchaseOrder
): Promise<void> {
  const { siteId, listId } = appConfig.purchaseOrders;

  await graphFetch<unknown>(
    getAccessToken,
    `/sites/${siteId}/lists/${listId}/items/${id}/fields`,
    {
      method: "PATCH",
      body: JSON.stringify({
        Title: edited.poNumber,
        RequesterName: edited.requesterName,
        RequesterEmail: edited.requesterEmail,
        Vendor: edited.supplier,
        Department: edited.department,
        Status: edited.status,
        TotalAmount: parseOptionalNumber(edited.amount),
        Notes: edited.notes,
        DateRaised: edited.dateRaised,
        ApproverName: edited.approverName,
        ApproverEmail: edited.approverEmail,
        ApprovalDate: edited.approvalDate,
        ApprovalComments: edited.approvalComments,
        IsRecharge: edited.isRecharge,
        RechargeNotes: edited.rechargeNotes,
        ItemType: edited.itemType,
        Contract: edited.contract,
        ProFormaUrl: edited.proFormaUrl,
        RechargeName: edited.rechargeName,
        RechargeDepartment: edited.rechargeDepartment,
        RechargeAdminCharge: parseOptionalNumber(edited.rechargeAdminCharge),
      }),
    }
  );
}
