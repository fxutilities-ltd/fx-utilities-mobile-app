import { appConfig } from "../config/appConfig";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/**
 * Shared authenticated fetch helper. Pass the token getter from AuthContext
 * (`getAccessToken`) so every call here goes through MSAL's silent refresh.
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

  // 204 No Content (e.g. after a DELETE) has no body to parse.
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return (await res.json()) as T;
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

// ---------------------------------------------------------------------------
// Annual Leave list
//
// TODO: replace the field names below (`StartDate`, `EndDate`, `Status`, ...)
// with the actual internal column names from your Annual Leave SharePoint
// list. Internal names often differ from the display names you see in the
// browser — see README §3 for how to check them (Graph Explorer or the
// column's "Edit column > internal name" in list settings).
// ---------------------------------------------------------------------------

export interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  requestedBy: string;
  notes?: string;
}

interface ListItemResponse<TFields> {
  value: Array<{ id: string; fields: TFields }>;
}

interface LeaveRequestFields {
  StartDate: string;
  EndDate: string;
  Status: string;
  RequestedBy: string;
  Notes?: string;
}

function mapLeaveFields(id: string, fields: LeaveRequestFields): LeaveRequest {
  return {
    id,
    startDate: fields.StartDate,
    endDate: fields.EndDate,
    status: fields.Status,
    requestedBy: fields.RequestedBy,
    notes: fields.Notes,
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

// ---------------------------------------------------------------------------
// Purchase Order (PO) list
//
// TODO: same as above — replace field names with your real PO list columns.
// ---------------------------------------------------------------------------

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  amount: number;
  status: string;
  raisedBy: string;
}

interface PurchaseOrderFields {
  PONumber: string;
  Supplier: string;
  Amount: number;
  Status: string;
  RaisedBy: string;
}

function mapPoFields(id: string, fields: PurchaseOrderFields): PurchaseOrder {
  return {
    id,
    poNumber: fields.PONumber,
    supplier: fields.Supplier,
    amount: fields.Amount,
    status: fields.Status,
    raisedBy: fields.RaisedBy,
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
          Supplier: po.supplier,
          Amount: po.amount,
          Status: "Draft",
        },
      }),
    }
  );
  return mapPoFields(created.id, created.fields);
}
