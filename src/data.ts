/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, BOQ, Warehouse, InventoryItem, Transaction, AuditLog, LineNotification, RolePermission } from './types';

// Role Permissions configurations
export const ROLE_PERMISSIONS: Record<string, RolePermission> = {
  'Super Admin': {
    role: 'Super Admin',
    canViewCost: true,
    canAddEditItems: true,
    canApproveIssues: true,
    canIssueItems: true,
    canReturnItems: true,
    canAdjustStock: true,
    canExportReport: true,
  },
  'Admin': {
    role: 'Admin',
    canViewCost: true,
    canAddEditItems: true,
    canApproveIssues: true,
    canIssueItems: true,
    canReturnItems: true,
    canAdjustStock: true,
    canExportReport: true,
  },
  'Store Manager': {
    role: 'Store Manager',
    canViewCost: false,
    canAddEditItems: true,
    canApproveIssues: false,
    canIssueItems: true,
    canReturnItems: true,
    canAdjustStock: true,
    canExportReport: true,
  },
  'Project Manager': {
    role: 'Project Manager',
    canViewCost: true,
    canAddEditItems: false,
    canApproveIssues: false,
    canIssueItems: true,
    canReturnItems: true,
    canAdjustStock: false,
    canExportReport: true,
  },
  'Accounting': {
    role: 'Accounting',
    canViewCost: true,
    canAddEditItems: false,
    canApproveIssues: true,
    canIssueItems: false,
    canReturnItems: false,
    canAdjustStock: false,
    canExportReport: true,
  },
  'Approver': {
    role: 'Approver',
    canViewCost: true,
    canAddEditItems: false,
    canApproveIssues: true,
    canIssueItems: false,
    canReturnItems: false,
    canAdjustStock: false,
    canExportReport: false,
  },
  'Employee': {
    role: 'Employee',
    canViewCost: false,
    canAddEditItems: false,
    canApproveIssues: false,
    canIssueItems: true,
    canReturnItems: true,
    canAdjustStock: false,
    canExportReport: false,
  },
};

// Default Warehouses
export const INITIAL_WAREHOUSES: Warehouse[] = [
  { id: 'WH01', name: 'คลังสินค้าหลัก (ลาดกระบัง)', location: 'ตึก A ชั้น 1 พิกัด LK-01' },
  { id: 'WH02', name: 'คลังสินค้าชั่วคราว (กรุงเทพกรีฑา)', location: 'ตู้คอนเทนเนอร์ 02 ไซต์งานโครงการ' },
  { id: 'WH03', name: 'คลังวัสดุฟิตติ้ง (พุทธมณฑล)', location: 'ตึก B ชั้น คลังวัสดุย่อย' },
];

// Initial Items
export const INITIAL_ITEMS: InventoryItem[] = [
  {
    sku: 'CON-001',
    name: 'ปูนซิเมนต์ถุงมิล่า (50 กก.)',
    category: 'งานโครงสร้าง',
    unit: 'ถุง',
    costPrice: 155,
    standardPrice: 160,
    stockLeft: 120,
    minStock: 50,
    latestSupplier: 'Siam Cement Group (SCG)',
    storageLocation: 'WH01-A1',
    warehouseId: 'WH01',
    qrCodeUrl: 'CON-001-QR',
  },
  {
    sku: 'CON-002',
    name: 'เหล็กเส้นกลม SR24 ขนาด 9 มม.',
    category: 'งานโครงสร้าง',
    unit: 'เส้น',
    costPrice: 110,
    standardPrice: 125,
    stockLeft: 300,
    minStock: 80,
    latestSupplier: 'TATA Steel Thailand',
    storageLocation: 'WH01-B2',
    warehouseId: 'WH01',
    qrCodeUrl: 'CON-002-QR',
  },
  {
    sku: 'ELE-001',
    name: 'สายไฟ VAF 2x2.5 Sq.mm. (100 เมตร)',
    category: 'งานไฟฟ้า',
    unit: 'ม้วน',
    costPrice: 950,
    standardPrice: 1050,
    stockLeft: 8, // Low Stock! (min is 15)
    minStock: 15,
    latestSupplier: 'Phelps Dodge Co.',
    storageLocation: 'WH01-E1',
    warehouseId: 'WH01',
    qrCodeUrl: 'ELE-001-QR',
  },
  {
    sku: 'ELE-002',
    name: 'ท่อร้อยสายไฟ PVC สีเหลือง ขนาด 1/2 นิ้ว',
    category: 'งานไฟฟ้า',
    unit: 'เส้น',
    costPrice: 28,
    standardPrice: 32,
    stockLeft: 220,
    minStock: 50,
    latestSupplier: 'Thai Pipe Industry',
    storageLocation: 'WH02-C1',
    warehouseId: 'WH02',
    qrCodeUrl: 'ELE-002-QR',
  },
  {
    sku: 'SAN-001',
    name: 'ท่อน้ำดี PVC สีฟ้า ชั้น 13.5 ขนาด 1 นิ้ว',
    category: 'งานสุขาภิบาล',
    unit: 'เส้น',
    costPrice: 75,
    standardPrice: 85,
    stockLeft: 95,
    minStock: 30,
    latestSupplier: 'Thai Pipe Industry',
    storageLocation: 'WH02-D1',
    warehouseId: 'WH02',
    qrCodeUrl: 'SAN-001-QR',
  },
  {
    sku: 'SAN-002',
    name: 'กาวทาท่อ PVC แปรงในตัว (250 กรัม)',
    category: 'งานสุขาภิบาล',
    unit: 'กระป๋อง',
    costPrice: 85,
    standardPrice: 95,
    stockLeft: 4, // Low Stock! (min is 10)
    minStock: 10,
    latestSupplier: 'Siam Joint Co.',
    storageLocation: 'WH01-D3',
    warehouseId: 'WH01',
    expiryDate: '2026-07-20', // Near expiry!
    qrCodeUrl: 'SAN-002-QR',
  },
  {
    sku: 'FIN-001',
    name: 'สีกัลวาไนซ์ โจตัน (Jotun) สีเทา (3.6 ลิตร)',
    category: 'งานตกแต่งผิว',
    unit: 'ถัง',
    costPrice: 650,
    standardPrice: 700,
    stockLeft: 25,
    minStock: 10,
    latestSupplier: 'Jotun Thailand',
    storageLocation: 'WH03-G1',
    warehouseId: 'WH03',
    expiryDate: '2027-12-01',
    qrCodeUrl: 'FIN-001-QR',
  },
  {
    sku: 'FIN-002',
    name: 'กระเบื้องแกรนิตโต้ 60x60 ซม. ลายขาวคาราร่า',
    category: 'งานตกแต่งผิว',
    unit: 'กล่อง',
    costPrice: 420,
    standardPrice: 480,
    stockLeft: 140,
    minStock: 30,
    latestSupplier: 'Cotto Center',
    storageLocation: 'WH01-K1',
    warehouseId: 'WH01',
    qrCodeUrl: 'FIN-002-QR',
  }
];

// Initial Projects
export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'PRJ101',
    code: 'PRJ-2026-01',
    name: 'อาคารสำนักงาน อาร์คาเดีย ทาวเวอร์',
    customer: 'บจก. อาร์คาเดีย พร็อพเพอร์ตี้',
    startDate: '2026-01-10',
    endDate: '2026-12-25',
    budget: 45000000,
    status: 'Active',
    supervisor: 'วิศวกรสมศักดิ์ รักไทย',
  },
  {
    id: 'PRJ102',
    code: 'PRJ-2026-02',
    name: 'วิลล่าพรีเมี่ยม ซีนิค ฮิลล์',
    customer: 'คุณทวี พูนสมบัติ',
    startDate: '2026-03-01',
    endDate: '2026-11-30',
    budget: 18000000,
    status: 'Active',
    supervisor: 'วิศวกรธัญญา มีธรรม',
  },
  {
    id: 'PRJ103',
    code: 'PRJ-2026-03',
    name: 'ทาวน์โฮม มินิมอล ฮาเวน (สามวา)',
    customer: 'บจก. โฮม แลนด์ เกทเวย์',
    startDate: '2026-05-15',
    endDate: '2027-02-28',
    budget: 8500000,
    status: 'Active',
    supervisor: 'วิศวกรกิตติ มีเจริญ',
  },
  {
    id: 'PRJ104',
    code: 'PRJ-2026-04',
    name: 'คอนโด โฟลว เลควิว ภูเก็ต',
    customer: 'แกรนด์ เอสเตท เทรดดิ้ง',
    startDate: '2026-08-01',
    endDate: '2028-01-15',
    budget: 125000000,
    status: 'Planning',
    supervisor: 'วิศวกรพีระพล ทองคำ',
  }
];

// Initial BOQs with items binding
export const INITIAL_BOQS: BOQ[] = [
  {
    id: 'BOQ-01',
    projectId: 'PRJ101',
    code: 'BOQ-101-STR',
    name: 'งานโครงสร้าง - Arcadia',
    category: 'Structural',
    items: [
      {
        id: 'BQI-001',
        itemSku: 'CON-001',
        itemName: 'ปูนซิเมนต์ถุงมิล่า (50 กก.)',
        quantityLimit: 500,
        standardPrice: 160,
        usedQuantity: 380,
      },
      {
        id: 'BQI-002',
        itemSku: 'CON-002',
        itemName: 'เหล็กเส้นกลม SR24 ขนาด 9 มม.',
        quantityLimit: 1200,
        standardPrice: 125,
        usedQuantity: 920,
      }
    ]
  },
  {
    id: 'BOQ-02',
    projectId: 'PRJ101',
    code: 'BOQ-101-ELE',
    name: 'งานระบบไฟฟ้า - Arcadia',
    category: 'Electrical',
    items: [
      {
        id: 'BQI-003',
        itemSku: 'ELE-001',
        itemName: 'สายไฟ VAF 2x2.5 Sq.mm. (100 เมตร)',
        quantityLimit: 80,
        standardPrice: 1050,
        usedQuantity: 82, // Over-allocated! (82 / 80)
      },
      {
        id: 'BQI-004',
        itemSku: 'ELE-002',
        itemName: 'ท่อร้อยสายไฟ PVC สีเหลือง ขนาด 1/2 นิ้ว',
        quantityLimit: 600,
        standardPrice: 32,
        usedQuantity: 410,
      }
    ]
  },
  {
    id: 'BOQ-03',
    projectId: 'PRJ102',
    code: 'BOQ-102-ELE',
    name: 'งานติดตั้งระบบสติเกอร์และสัญญาร - Scenic Hill',
    category: 'Electrical',
    items: [
      {
        id: 'BQI-005',
        itemSku: 'ELE-001',
        itemName: 'สายไฟ VAF 2x2.5 Sq.mm. (100 เมตร)',
        quantityLimit: 30,
        standardPrice: 1050,
        usedQuantity: 15,
      },
      {
        id: 'BQI-006',
        itemSku: 'ELE-002',
        itemName: 'ท่อร้อยสายไฟ PVC สีเหลือง ขนาด 1/2 นิ้ว',
        quantityLimit: 200,
        standardPrice: 32,
        usedQuantity: 95,
      }
    ]
  },
  {
    id: 'BOQ-04',
    projectId: 'PRJ102',
    code: 'BOQ-102-SAN',
    name: 'งานสุขาภิบาลและประปา - Scenic Hill',
    category: 'Sanitary',
    items: [
      {
        id: 'BQI-007',
        itemSku: 'SAN-001',
        itemName: 'ท่อน้ำดี PVC สีฟ้า ชั้น 13.5 ขนาด 1 นิ้ว',
        quantityLimit: 150,
        standardPrice: 85,
        usedQuantity: 110,
      },
      {
        id: 'BQI-008',
        itemSku: 'SAN-002',
        itemName: 'กาวทาท่อ PVC แปรงในตัว (250 กรัม)',
        quantityLimit: 40,
        standardPrice: 95,
        usedQuantity: 18,
      }
    ]
  }
];

// Initial stock transactions / movements
export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'TX-2026-001',
    date: '2026-05-10T10:30:00Z',
    type: 'RECEIVE',
    itemSku: 'CON-001',
    itemName: 'ปูนซิเมนต์ถุงมิล่า (50 กก.)',
    category: 'งานโครงสร้าง',
    quantity: 100,
    unit: 'ถุง',
    costPrice: 155,
    operator: 'ผู้ดูแลคลัง สิทธิเจริญ',
    status: 'APPROVED',
    reason: 'สั่งซื้อรับเข้าคลัง ล็อตการผลิต C102',
    lot: 'LOT-C102-0526'
  },
  {
    id: 'TX-2026-002',
    date: '2026-05-12T09:12:00Z',
    type: 'ISSUE',
    projectCode: 'PRJ-2026-01',
    boqCode: 'BOQ-101-STR',
    itemSku: 'CON-002',
    itemName: 'เหล็กเส้นกลม SR24 ขนาด 9 มม.',
    category: 'งานโครงสร้าง',
    quantity: 150,
    unit: 'เส้น',
    costPrice: 110,
    operator: 'ผู้ดูแลคลัง สิทธิเจริญ',
    requester: 'สมชาย ช่างเขียน',
    status: 'APPROVED',
    isOutsideBOQ: false,
    signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><path d="M 10 30 Q 30 5 50 30 T 90 20" fill="none" stroke="black" stroke-width="2"/></svg>'
  },
  {
    id: 'TX-2026-015',
    date: '2026-05-15T14:45:00Z',
    type: 'ISSUE',
    projectCode: 'PRJ-2026-01',
    boqCode: 'BOQ-101-ELE',
    itemSku: 'ELE-001',
    itemName: 'สายไฟ VAF 2x2.5 Sq.mm. (100 เมตร)',
    category: 'งานไฟฟ้า',
    quantity: 3, // This pushed it to 82, which is > 80 (limit)!
    unit: 'ม้วน',
    costPrice: 950,
    operator: 'ผู้ดูแลคลัง สิทธิเจริญ',
    requester: 'สมเกียรติ ยอดฝีมือ',
    approver: 'ประธานกรรมการ เกรียงไกร',
    status: 'APPROVED',
    isOutsideBOQ: true, // Tagged as outside/over budget BOQ limit!
    approverNote: 'อนุญาตให้เบิกเพิ่มเนื่องจากปรับปรุงตึกปรับแบบชั้น 3 พิเศษ',
    signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><path d="M 5 20 Q 25 25 50 8 T 95 30" fill="none" stroke="red" stroke-width="2"/></svg>'
  },
  {
    id: 'TX-2026-018',
    date: '2026-05-18T11:00:00Z',
    type: 'RETURN',
    projectCode: 'PRJ-2026-01',
    boqCode: 'BOQ-101-STR',
    itemSku: 'CON-001',
    itemName: 'ปูนซิเมนต์ถุงมิล่า (50 กก.)',
    category: 'งานโครงสร้าง',
    quantity: 15,
    unit: 'ถุง',
    costPrice: 155,
    operator: 'ผู้ดูแลคลัง สิทธิเจริญ',
    requester: 'สมชาย ช่างเขียน',
    status: 'APPROVED',
    reason: 'ปูนเหลือจากการเทพื้นชั้น 2 สภาพสมบูรณ์และเก็บในที่แห้ง'
  },
  {
    id: 'TX-2026-022',
    date: '2026-05-22T16:20:00Z',
    type: 'ADJUST',
    itemSku: 'SAN-002',
    itemName: 'กาวทาท่อ PVC แปรงในตัว (250 กรัม)',
    category: 'งานสุขาภิบาล',
    quantity: -2, // Discovered 2 cans dried out
    unit: 'กระป๋อง',
    costPrice: 85,
    operator: 'ผู้ดูแลคลัง สิทธิเจริญ',
    status: 'APPROVED',
    reason: 'ตรวจพบแปรงชำรุดทำให้ฝาปิดไม่สนิท เนื้อกาวแห้งแข็งหนืด 2 กระป๋อง ปรับสต๊อกตัดจำหน่าย'
  }
];

// Initial Audit logs
export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'AUD-001',
    user: 'สุรวุฒิ สิทธิโกศล (Super Admin)',
    role: 'Super Admin',
    action: 'เข้าสู่ระบบบริหารจัดการหลัก',
    timestamp: '2026-05-26T01:10:00Z',
    ipAddress: '192.168.1.144',
    device: 'Chrome v125 / macOS Sonoma'
  },
  {
    id: 'AUD-002',
    user: 'สมศักดิ์ รักไทย (Project Manager)',
    role: 'Project Manager',
    action: 'นำเข้าไฟล์ข้อมูล BOQ โครงการอาคารสำนักงานอาร์คาเดีย ทาวเวอร์',
    timestamp: '2026-05-26T01:12:00Z',
    ipAddress: '171.96.12.89',
    device: 'Safari Mobile / iPadOS'
  },
  {
    id: 'AUD-003',
    user: 'สิทธิเจริญ พิทักษ์คลัง (Store Manager)',
    role: 'Store Manager',
    action: 'ปรับยอดคลังสินค้าคงเหลือ CON-002 ชนิดเหล็กเส้นกลม',
    timestamp: '2026-05-26T01:30:15Z',
    ipAddress: '192.168.1.189',
    device: 'Chrome Mobile / Android 14'
  },
  {
    id: 'AUD-004',
    user: 'ปิยะมาศ การเงินดี (Accounting)',
    role: 'Accounting',
    action: 'ส่งออกรายงานสรุปงานงบประมาณโครงการ (BOQ vs Actual) ประจำเดือน พฤษภาคม 2026',
    timestamp: '2026-05-26T01:40:00Z',
    ipAddress: '101.51.8.22',
    device: 'Edge / Windows 11'
  }
];

// Initial Live line messages mock bank
export const INITIAL_LINE_MESSAGES: LineNotification[] = [
  {
    id: 'LN-001',
    timestamp: '2026-05-12T09:12:00Z',
    projectCode: 'PRJ-2026-01',
    type: 'ISSUE',
    message: '📦 มีการเบิกสินค้า\nโครงการ: อาคารสำนักงาน อาร์คาเดีย ทาวเวอร์\nผู้เบิก: สมชาย ช่างเขียน\nสินค้า: เหล็กเส้นกลม SR24 ขนาด 9 มม.\nจำนวน: 150 เส้น\nสถานะ: ใน BOQ (คงเหลือสิทธิ์เบิก: 130 เส้น)',
    status: 'Sent'
  },
  {
    id: 'LN-002',
    timestamp: '2026-05-15T14:45:00Z',
    projectCode: 'PRJ-2026-01',
    type: 'OVER_BOQ',
    message: '⚠️ ตรวจพบการเบิกเกิน BOQ!\nโครงการ: อาคารสำนักงาน อาร์คาเดีย ทาวเวอร์\nผู้เบิก: สมเกียรติ ยอดฝีมือ\nสินค้า: สายไฟ VAF 2x2.5 Sq.mm.\nจำนวนเบิก: 3 ม้วน (เกินโควตาผูก 2 ม้วน)\nสถานะ: ได้รับอนุมัติเป็นกรณีพิเศษโดย ประธานกรรมการ เกรียงไกร\nข้อเหตุ: นอกงบ / นอก BOQ (คิดต้นทุนเข้าโปรเจกต์)',
    status: 'Sent'
  },
  {
    id: 'LN-003',
    timestamp: '2026-05-22T16:20:00Z',
    type: 'ADJUST',
    message: '⚙️ มีการปรับปรุงยอดคลังสินค้าย่อย\nสินค้า: กาวทาท่อ PVC แปรงในตัว\nจำนวนปรับ: -2 กระป๋อง\nผู้ลงรายการ: ผู้ดูแลคลัง สิทธิเจริญ\nสาเหตุ: ตรวจพบแปรงชำรุดทำให้ฝาปิดไม่สนิท เนื้อกาวแห้งแข็งหนืด 2 กระป๋อง ปรับสต๊อกตัดจำหน่าย',
    status: 'Sent'
  }
];
