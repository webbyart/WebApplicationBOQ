/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole =
  | 'Super Admin'
  | 'Admin'
  | 'Store Manager'
  | 'Project Manager'
  | 'Accounting'
  | 'Approver'
  | 'Employee';

export interface RolePermission {
  role: UserRole;
  canViewCost: boolean;
  canAddEditItems: boolean;
  canApproveIssues: boolean;
  canIssueItems: boolean;
  canReturnItems: boolean;
  canAdjustStock: boolean;
  canExportReport: boolean;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  customer: string;
  startDate: string;
  endDate: string;
  budget: number;
  status: 'Planning' | 'Active' | 'Completed' | 'Suspended';
  supervisor: string;
}

export interface BOQItem {
  id: string;
  itemSku: string;
  itemName: string;
  quantityLimit: number;
  standardPrice: number;
  usedQuantity: number;
}

export interface BOQ {
  id: string;
  projectId: string;
  code: string;
  name: string; // e.g., "BOQ-งานโครงสร้าง", "BOQ-งานไฟฟ้า"
  category: 'Structural' | 'Sanitary' | 'Electrical' | 'Finishing' | 'Temporary';
  items: BOQItem[];
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export interface InventoryItem {
  sku: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number; // Actual Cost
  standardPrice: number; // BOQ Standard Cost
  stockLeft: number;
  minStock: number;
  latestSupplier: string;
  storageLocation: string;
  expiryDate?: string;
  warehouseId: string;
  qrCodeUrl?: string;
  imageUrl?: string;
  itemType?: 'MATERIAL' | 'SERVICE'; // MATERIAL (สินค้า) or SERVICE (งานบริการ/ค่าแรง/ค่ารถ)
}

export type TransactionType = 'RECEIVE' | 'ISSUE' | 'RETURN' | 'ADJUST';

export interface PRItem {
  itemSku: string;
  itemName: string;
  itemType: 'MATERIAL' | 'SERVICE';
  quantity: number;
  unit: string;
  estimatedPrice: number; // ราคาประเมินต่อหน่วย
  isOutsideBOQ?: boolean;
  receivedQuantity?: number; // จำนวนที่รับแล้ว
}

export interface PurchaseRequisition {
  id: string; // e.g. PR-2026-001
  date: string;
  type: 'PR' | 'SR'; // PR = ขอซื้อสินค้า, SR = ขอจ้างบริการ (ค่าแรง/ค่ารถ/บริการอื่นๆ)
  projectCode: string;
  boqCode?: string;
  requester: string;
  purpose: string;
  items: PRItem[];
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'PARTIALLY_RECEIVED';
  approvedBy?: string;
  approvedDate?: string;
  approverNote?: string;
  isOutsideBOQ?: boolean;
}

export interface MultiItemIssueItem {
  itemSku: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  costPrice: number;
  isOutsideBOQ?: boolean;
}

export interface MultiItemIssueRequest {
  id: string; // e.g. REQ-2026-001
  date: string;
  projectCode: string;
  boqCode?: string;
  requester: string;
  purpose: string;
  items: MultiItemIssueItem[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedDate?: string;
  approverNote?: string;
  signature?: string; // base64 signature
}

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  projectCode?: string;
  boqCode?: string;
  itemSku: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  costPrice: number;
  operator: string;
  requester?: string;
  approver?: string;
  approverNote?: string;
  isOutsideBOQ?: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  signature?: string; // Base64 data url
  reason?: string; // For adjustment or issue
  lot?: string;
}

export interface AuditLog {
  id: string;
  user: string;
  role: UserRole;
  action: string;
  timestamp: string;
  ipAddress: string;
  device: string;
}

export interface LineNotification {
  id: string;
  timestamp: string;
  projectCode?: string;
  type: 'RECEIVE' | 'ISSUE' | 'RETURN' | 'LOW_STOCK' | 'OVER_BOQ' | 'ADJUST';
  message: string;
  status: 'Sent';
}
