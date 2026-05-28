/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Project, 
  BOQ, 
  InventoryItem, 
  PurchaseRequisition, 
  PRItem, 
  UserRole,
  Transaction
} from '../types';
import { 
  FileText, 
  Check, 
  X, 
  Plus, 
  Search, 
  AlertCircle, 
  CheckCircle,
  Truck, 
  UserCheck, 
  Trash2, 
  ArrowUpRight, 
  Percent, 
  Printer, 
  PlusCircle,
  Boxes,
  Briefcase,
  Layers,
  HelpCircle
} from 'lucide-react';

interface PRREngineProps {
  projects: Project[];
  boqs: BOQ[];
  items: InventoryItem[];
  prs: PurchaseRequisition[];
  currentRole: UserRole;
  currentUserName: string;
  canViewCost: boolean;
  onAddPR: (pr: PurchaseRequisition) => void;
  onUpdatePR: (id: string, updated: PurchaseRequisition) => void;
  onCommitReceiveItems: (prId: string, itemsToReceive: { sku: string; qty: number; costPrice: number }[]) => void;
}

export default function PRREngine({
  projects,
  boqs,
  items,
  prs,
  currentRole,
  currentUserName,
  canViewCost,
  onAddPR,
  onUpdatePR,
  onCommitReceiveItems
}: PRREngineProps) {
  // Navigation & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'PR' | 'SR'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');

  // Modal control
  const [isNewPRModalOpen, setIsNewPRModalOpen] = useState(false);
  const [viewingPR, setViewingPR] = useState<PurchaseRequisition | null>(null);
  const [isReceivingModalOpen, setIsReceivingModalOpen] = useState(false);
  const [receivingQuantities, setReceivingQuantities] = useState<Record<string, number>>({});

  // Core Form State (For creating a new PR/SR)
  const [reqType, setReqType] = useState<'PR' | 'SR'>('PR');
  const [formProjectId, setFormProjectId] = useState('');
  const [formBoqId, setFormBoqId] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [cartItems, setCartItems] = useState<PRItem[]>([]);
  const [formApproverNote, setFormApproverNote] = useState('');

  // Cart editing item state
  const [currentSku, setCurrentSku] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [customItemUnit, setCustomItemUnit] = useState('');
  const [currentQty, setCurrentQty] = useState(1);
  const [currentPrice, setCurrentPrice] = useState(0);

  // Filter project BOQs
  const filteredFormBOQs = boqs.filter(b => b.projectId === formProjectId);

  // Check budget constraints helper
  const getBOQQuotaInfo = (sku: string, boqId: string) => {
    if (!boqId) return { isOutside: true, maxQty: 0, currentUsed: 0 };
    const boq = boqs.find(b => b.id === boqId);
    if (!boq) return { isOutside: true, maxQty: 0, currentUsed: 0 };
    const boqItem = boq.items.find(bi => bi.itemSku === sku);
    if (!boqItem) return { isOutside: true, maxQty: 0, currentUsed: 0 };
    return {
      isOutside: false,
      maxQty: boqItem.quantityLimit,
      currentUsed: boqItem.usedQuantity,
      quotaLeft: Math.max(0, boqItem.quantityLimit - boqItem.usedQuantity)
    };
  };

  // Switch SKU auto-filling standard price
  const handleSkuChange = (sku: string) => {
    setCurrentSku(sku);
    if (sku === 'CUSTOM') {
      setCustomItemName('');
      setCustomItemUnit('');
      setCurrentPrice(0);
      return;
    }
    const targetItem = items.find(i => i.sku === sku);
    if (targetItem) {
      setCustomItemName(targetItem.name);
      setCustomItemUnit(targetItem.unit);
      setCurrentPrice(targetItem.standardPrice);
    }
  };

  // Add Item to Requisition Cart
  const handleAddToCart = () => {
    if (!currentSku) return;
    
    let skuCode = currentSku;
    let name = customItemName;
    let unit = customItemUnit;
    let type: 'MATERIAL' | 'SERVICE' = reqType === 'PR' ? 'MATERIAL' : 'SERVICE';

    if (currentSku === 'CUSTOM') {
      skuCode = `CST-${Math.floor(1000 + Math.random() * 9000)}`;
      if (!name || !unit) {
        alert('กรุณากรอกชื่อเรื่อง/บริการ และหน่วยนับ');
        return;
      }
    }

    // Check BOQ status
    let isOutside = true;
    if (formBoqId) {
      const quota = getBOQQuotaInfo(skuCode, formBoqId);
      isOutside = quota.isOutside;
    }

    const newItem: PRItem = {
      itemSku: skuCode,
      itemName: name,
      itemType: type,
      quantity: currentQty,
      unit: unit,
      estimatedPrice: currentPrice,
      isOutsideBOQ: isOutside,
      receivedQuantity: 0
    };

    setCartItems(prev => [...prev, newItem]);
    
    // Reset item input
    setCurrentSku('');
    setCustomItemName('');
    setCustomItemUnit('');
    setCurrentQty(1);
    setCurrentPrice(0);
  };

  // Remove Item from Cart
  const handleRemoveFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  // Save the complete Requisition
  const handleSubmitPR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProjectId) {
      alert('กรุณาเลือกโครงการก่อสร้าง');
      return;
    }
    if (cartItems.length === 0) {
      alert('กรุณาเพิ่มรายการสินค้าหรือบริการอย่างน้อย 1 รายการ');
      return;
    }

    const project = projects.find(p => p.id === formProjectId);
    const boq = boqs.find(b => b.id === formBoqId);

    const hasOutsideItems = cartItems.some(i => i.isOutsideBOQ);
    const total = cartItems.reduce((acc, curr) => acc + (curr.quantity * curr.estimatedPrice), 0);

    const newPR: PurchaseRequisition = {
      id: `${reqType}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      type: reqType,
      projectCode: project?.code || 'GEN',
      boqCode: boq?.code || undefined,
      requester: currentUserName,
      purpose: formPurpose,
      items: cartItems,
      totalAmount: total,
      status: 'PENDING',
      isOutsideBOQ: hasOutsideItems
    };

    onAddPR(newPR);
    setIsNewPRModalOpen(false);

    // Reset Form
    setFormProjectId('');
    setFormBoqId('');
    setFormPurpose('');
    setCartItems([]);
  };

  // Handle PR/SR approval
  const handleApproveReject = (pr: PurchaseRequisition, isApprove: boolean) => {
    const updated: PurchaseRequisition = {
      ...pr,
      status: isApprove ? 'APPROVED' : 'REJECTED',
      approvedBy: `${currentUserName} (${currentRole})`,
      approvedDate: new Date().toISOString(),
      approverNote: formApproverNote
    };
    onUpdatePR(pr.id, updated);
    setFormApproverNote('');
    setViewingPR(null);
  };

  // Form open initialization helper
  const handleOpenNewPR = (type: 'PR' | 'SR') => {
    setReqType(type);
    setIsNewPRModalOpen(true);
  };

  // Open receiving panel for approved PR
  const handleOpenReceive = (pr: PurchaseRequisition) => {
    setViewingPR(pr);
    const initialQtys: Record<string, number> = {};
    pr.items.forEach(item => {
      // Calculate remaining quantity
      const received = item.receivedQuantity || 0;
      const left = Math.max(0, item.quantity - received);
      initialQtys[item.itemSku] = left;
    });
    setReceivingQuantities(initialQtys);
    setIsReceivingModalOpen(true);
  };

  // Confirm and commit receiving
  const handleConfirmReceive = () => {
    if (!viewingPR) return;

    const itemsToRec = viewingPR.items.map(item => {
      const qtyToRec = Number(receivingQuantities[item.itemSku] || 0);
      return {
        sku: item.itemSku,
        qty: qtyToRec,
        costPrice: item.estimatedPrice
      };
    }).filter(i => i.qty > 0);

    if (itemsToRec.length === 0) {
      alert('ระบุจำนวนรายการย่อยที่จะดำเนินการรับเข้าคลังสินค้าอย่างน้อย 1 รายการ');
      return;
    }

    onCommitReceiveItems(viewingPR.id, itemsToRec);
    setIsReceivingModalOpen(false);
    setViewingPR(null);
  };

  // Filtered lists of existing PR/SRs
  const processedPRs = prs.filter(pr => {
    const matchesSearch = pr.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          pr.requester.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          pr.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          pr.projectCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'ALL' || pr.type === filterType;
    const matchesStatus = filterStatus === 'ALL' || pr.status === filterStatus;
    const matchesProject = selectedProjectId === 'ALL' || pr.projectCode === selectedProjectId;

    return matchesSearch && matchesType && matchesStatus && matchesProject;
  });

  return (
    <div className="space-y-6" id="pr-sr-engine">
      
      {/* Title block with custom PR/SR action buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Truck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            ระบบขอซื้อขอจ้าง & คุมงบอนุมัติ (PR / SR Engine)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            บันทึกการขอสั่งซื้อพัสดุ ดำเนินการจ้างเหมางานบริการบริการ (ค่าแรง, ค่ารถ) พร้อมติดตามและรับสินค้าเชื่อมโยง BOQ
          </p>
        </div>

        {/* Create Requisition actions */}
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenNewPR('PR')}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-3xs"
          >
            <Plus className="h-4 w-4" />
            ขอซื้อวัสดุ (PR Form)
          </button>
          <button
            type="button"
            onClick={() => handleOpenNewPR('SR')}
            className="inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-3xs"
          >
            <PlusCircle className="h-4 w-4" />
            ขอจ้างบริการ/ค่ารถ (SR Form)
          </button>
        </div>
      </div>

      {/* Filter and Searching Row */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-3xs">
        <div className="flex flex-wrap items-center gap-2 flex-grow">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="ค้นหาใบขอซื้อ เลขที่, ผู้ขอ, ความประสงค์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white pl-9 pr-4 py-2 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs p-2 focus:outline-hidden"
          >
            <option value="ALL">ประเภททั้งหมด</option>
            <option value="PR">PR (จัดซื้อพัสดุ)</option>
            <option value="SR">SR (การจัดจ้างบริการ)</option>
          </select>

          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs p-2 focus:outline-hidden"
          >
            <option value="ALL">สถานะอนุมัติทั้งหมด</option>
            <option value="PENDING">รอการอนุมัติ (PENDING)</option>
            <option value="APPROVED">อนุมัติแล้ว (APPROVED)</option>
            <option value="REJECTED">ไม่อนุมัติ (REJECTED)</option>
            <option value="RECEIVED">รับสินค้าเสร็จสิ้น (RECEIVED)</option>
            <option value="PARTIALLY_RECEIVED">รับบางส่วน (PARTIALLY)</option>
          </select>

          <select 
            value={selectedProjectId} 
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs p-2 focus:outline-hidden max-w-[200px]"
          >
            <option value="ALL">โครงการทั้งหมด</option>
            {projects.map(p => (
              <option key={p.id} value={p.code}>{p.code} - {p.name.substring(0, 15)}...</option>
            ))}
          </select>
        </div>

        <div className="text-3xs text-slate-400 font-mono shrink-0">
          พบรายการค้นหา: {processedPRs.length} แฟ้ม
        </div>
      </div>

      {/* Main Grid/Table displaying PR/SR records */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold h-10 select-none">
                <th className="px-4 w-[110px]">ประเภท / เลขที่</th>
                <th className="px-3">วันที่ขอเบิก</th>
                <th className="px-3">โครงการ / รหัสคุม</th>
                <th className="px-3 min-w-[220px]">วัตถุประสงค์ความประสงค์ใบขอซื้อ</th>
                <th className="px-3 text-right">ยอดรวมประเมิน (฿)</th>
                <th className="px-3 text-center">งบประมาณ</th>
                <th className="px-3">สถานะ</th>
                <th className="px-3 w-[150px] text-center">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {processedPRs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    ไม่มีเอกสารขอจัดซื้อ/จ้างบริการที่ถูกบันทึกในระบบในขณะนี้
                  </td>
                </tr>
              ) : (
                processedPRs.map(pr => {
                  const isSR = pr.type === 'SR';
                  
                  return (
                    <tr key={pr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                      <td className="px-4 py-3 font-semibold">
                        <div className="flex flex-col gap-1">
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded text-center w-fit ${isSR ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'}`}>
                            {pr.type === 'PR' ? '📦 PR จัดซื้อ' : '⚙️ SR จัดจ้าง'}
                          </span>
                          <span className="font-mono text-xs text-slate-800 dark:text-slate-200">{pr.id}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-500 font-mono">
                        {new Date(pr.date).toLocaleDateString('th-TH')}
                      </td>
                      <td className="px-3 py-3 text-slate-700 dark:text-slate-300">
                        <div className="font-bold">{pr.projectCode}</div>
                        <div className="text-[10px] text-slate-400 shrink-0 font-mono">{pr.boqCode || 'นอก BOQ อนุมัติพิเศษ'}</div>
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-900 dark:text-white prose prose-sm max-w-[280px] truncate" title={pr.purpose}>
                        <div>{pr.purpose}</div>
                        <div className="text-[11px] text-slate-400 font-sans mt-0.5">โดย: {pr.requester}</div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-slate-800 dark:text-slate-250">
                        {canViewCost ? `฿${pr.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '••••••'}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {pr.isOutsideBOQ ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200">
                            นอกงบ BOQ
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200">
                            ผ่านโควตาปกติ
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 rounded-sm text-[10px] font-extrabold uppercase font-mono ${
                          pr.status === 'PENDING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' :
                          pr.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' :
                          pr.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400' :
                          pr.status === 'RECEIVED' ? 'bg-stone-200 text-stone-700 dark:bg-zinc-800 dark:text-zinc-300' :
                          'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400'
                        }`}>
                          {pr.status === 'PENDING' ? 'รออนุมัติ' :
                           pr.status === 'APPROVED' ? 'อนุมัติแล้ว' :
                           pr.status === 'REJECTED' ? 'ปฏิเสธคำขอ' :
                           pr.status === 'RECEIVED' ? 'รับพัสดุครบแล้ว' :
                           'รับพัสดุบางส่วน'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => setViewingPR(pr)}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded text-2xs font-semibold cursor-pointer transition-all"
                          >
                            เปิดตรวจสอบ
                          </button>
                          
                          {/* Receive Items Action for approved PRs */}
                          {(pr.status === 'APPROVED' || pr.status === 'PARTIALLY_RECEIVED') && (
                            <button
                              onClick={() => handleOpenReceive(pr)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded text-2xs font-bold cursor-pointer transition-all flex items-center gap-0.5"
                            >
                              <Boxes className="h-3 w-3" /> รับงาน/สต็อก
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: View and Approve PR/SR */}
      {viewingPR && !isReceivingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-100 dark:border-slate-800">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div>
                <span className="text-[10px] text-slate-500 font-mono block">DOCUMENT VIEW • REQUISITION DESK</span>
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  ใบนำเสนอ{viewingPR.type === 'PR' ? 'ขอซื้อพัสดุก่อสร้าง' : 'ขอจ้างเหมาบริการ'} #{viewingPR.id}
                </h3>
              </div>
              <button 
                onClick={() => setViewingPR(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Request Meta Details */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-850 p-4 rounded-xl text-xs text-slate-600 dark:text-slate-300">
              <div>
                <p><span className="font-semibold select-none">ผู้เสนอรายการ:</span> {viewingPR.requester}</p>
                <p className="mt-1"><span className="font-semibold select-none">วันที่จัดทำ:</span> {new Date(viewingPR.date).toLocaleString('th-TH')}</p>
                <p className="mt-1"><span className="font-semibold select-none">ความประสงค์:</span> {viewingPR.purpose}</p>
              </div>
              <div>
                <p><span className="font-semibold select-none">รหัสโครงการ:</span> {viewingPR.projectCode}</p>
                <p className="mt-1"><span className="font-semibold select-none">รหัสงบ BOQ:</span> {viewingPR.boqCode || 'นอกบัญชีงบเป้าหมาย (-)'}</p>
                <p className="mt-1"><span className="font-semibold select-none">ควบคุมผ่านเกณฑ์:</span> {viewingPR.isOutsideBOQ ? '🔴 มีรายการนอกงบ BOQ' : '🟢 ภายในวงเงินจำกัด BOQ'}</p>
              </div>
            </div>

            {/* Items Table inside PR */}
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">ตารางรายการเสนอขอซื้อ / ขอจ้าง:</p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-zinc-800 text-slate-500 font-semibold h-8 border-b">
                      <th className="px-3">รหัส SKU</th>
                      <th className="px-2">รายละเอียดรายการสินค้าหรือจ้างบริการ</th>
                      <th className="px-2 text-right">จำนวน</th>
                      <th className="px-2 text-center">หน่วย</th>
                      <th className="px-2 text-right">ราคาต่อหน่วย</th>
                      <th className="px-2 text-center">รับแล้ว</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700 dark:text-slate-300">
                    {viewingPR.items.map((item, idx) => (
                      <tr key={idx} className="h-8">
                        <td className="px-3 font-mono text-[10px]">{item.itemSku}</td>
                        <td className="px-2 font-bold select-all">
                          {item.itemName} 
                          {item.isOutsideBOQ && <span className="text-[9px] ml-1 bg-red-100 text-red-700 px-1 rounded">นอกงบ</span>}
                        </td>
                        <td className="px-2 text-right font-mono">{item.quantity.toLocaleString()}</td>
                        <td className="px-2 text-center text-slate-500">{item.unit}</td>
                        <td className="px-2 text-right font-mono">฿{item.estimatedPrice.toLocaleString()}</td>
                        <td className="px-2 text-center text-indigo-600 font-bold font-mono">{item.receivedQuantity || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-right mt-3 text-xs">
                <span className="text-slate-500">ยอดรวมสัญญากลาง:</span> 
                <span className="text-sm font-bold font-mono text-slate-900 dark:text-zinc-100 ml-2">
                  ฿{viewingPR.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Approval info or actions */}
            <div className="border-t pt-4 mt-4">
              {viewingPR.status === 'PENDING' ? (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                    🔒 สิทธิ์การเปลี่ยนผ่านสถานะ (Approver Interface):
                  </p>
                  
                  <textarea 
                    placeholder="บันทึกข้อความจากผู้อนุมัติ (ถ้ามี)..."
                    value={formApproverNote}
                    onChange={(e) => setFormApproverNote(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white border border-slate-200 p-2 text-xs rounded-lg placeholder-slate-400 focus:outline-hidden"
                    rows={2}
                  />

                  {/* Approve reject buttons */}
                  <div className="flex justify-end gap-2 text-xs font-bold pt-1">
                    <button
                      type="button"
                      onClick={() => handleApproveReject(viewingPR, false)}
                      className="bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 px-4 py-2 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <X className="h-4 w-4" /> ปฏิเสธ (Reject)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveReject(viewingPR, true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="h-4 w-4" /> อนุมัติเอกสาร (Approve)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-850 rounded-xl text-2xs text-slate-500">
                  <p><span className="font-bold text-slate-700 dark:text-zinc-300">ผู้อนุมัติ:</span> {viewingPR.approvedBy}</p>
                  <p><span className="font-bold text-slate-700 dark:text-zinc-300">วันที่อนุมัติ:</span> {viewingPR.approvedDate ? new Date(viewingPR.approvedDate).toLocaleString('th-TH') : '-'}</p>
                  {viewingPR.approverNote && (
                    <p><span className="font-bold text-slate-700 dark:text-zinc-300">บันทึกหมายเหตุ:</span> {viewingPR.approverNote}</p>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Receive goods directly from approved Requisition */}
      {isReceivingModalOpen && viewingPR && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div>
                <span className="text-[10px] text-emerald-600 font-bold block">Fulfillment Manager • Receiving Module</span>
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Boxes className="h-5 w-5 text-emerald-600" />
                  ตรวจรับวัสดุ/ผลงานส่งงวดเข้าคลัง จากใบเสนอ #{viewingPR.id}
                </h3>
              </div>
              <button 
                onClick={() => { setIsReceivingModalOpen(false); setViewingPR(null); }}
                className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg border">
              ทำการระบุปริมาณที่รับได้จริงในรอบนี้ ระบบจะเพิ่มเข้ารายการคลังสะสมอัตโนมัติและบันทึกราคาทุนสัญญาร่วมไปในประวัติคลังหลัก
            </p>

            <div className="space-y-4">
              {viewingPR.items.map((item, idx) => {
                const totalOrdered = item.quantity;
                const prevReceived = item.receivedQuantity || 0;
                const outstanding = Math.max(0, totalOrdered - prevReceived);

                return (
                  <div key={item.itemSku} className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3 text-xs">
                    <div className="max-w-[300px]">
                      <span className="text-3xs font-mono text-zinc-400 block">{item.itemSku} ({item.itemType === 'SERVICE' ? 'งานจัดจ้าง/บริการ' : 'สินค้าคงคลัง'})</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{item.itemName}</span>
                      <div className="text-3xs text-slate-400 mt-0.5">
                        จองซื้อทั้งหมด: {totalOrdered} {item.unit} | ตรวจรับแล้ว: {prevReceived} {item.unit}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-3xs shrink-0">ค้างรับ: {outstanding}</span>
                      <input 
                        type="number" 
                        min={0}
                        max={outstanding}
                        value={receivingQuantities[item.itemSku] || 0}
                        onChange={(e) => {
                          const val = Math.min(outstanding, Math.max(0, Number(e.target.value)));
                          setReceivingQuantities(prev => ({
                            ...prev,
                            [item.itemSku]: val
                          }));
                        }}
                        className="w-24 bg-slate-100 dark:bg-zinc-800 font-mono text-semibold border text-center p-1.5 rounded-lg text-slate-800 dark:text-white font-bold"
                      />
                      <span className="text-slate-400 text-3xs w-8">{item.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 font-bold text-xs border-t pt-4 mt-4">
              <button
                type="button"
                onClick={() => { setIsReceivingModalOpen(false); setViewingPR(null); }}
                className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg cursor-pointer text-slate-600"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmReceive}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg cursor-pointer"
              >
                ยืนยันการรับเข้าคลังสินค้า/ตรวจงานงวดเงิน
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: Create New PR/SR requisition requisition */}
      {isNewPRModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-40">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-100 dark:border-slate-800 overflow-y-auto max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4 mb-4 select-none">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#059669] block">
                  {reqType === 'PR' ? '📦 Purchase Requisition Engine' : '⚙️ Service Hire / Subcontract Engine'}
                </span>
                <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5 text-base">
                  สร้างและจัดทำใบเสนอขอ {reqType === 'PR' ? 'จัดซื้อวัสดุก่อสร้างพัสดุ (PR)' : 'จัดจ้างบริการ ค่าแรง-ค่ารถ (SR)'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsNewPRModalOpen(false)}
                className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer focus:outline-hidden"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPR}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Field 1: Project select */}
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[11px] font-bold text-slate-550 mr-2 select-none">1. โครงการปลายน้ำผูกงบสัญญา:</label>
                  <select
                    required
                    value={formProjectId}
                    onChange={(e) => {
                      setFormProjectId(e.target.value);
                      setFormBoqId('');
                      setCartItems([]);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white border border-slate-200 dark:border-zinc-700 rounded-lg p-2.5 text-xs outline-hidden focus:border-emerald-500"
                  >
                    <option value="">-- กรุณาเลือกโครงการ --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Field 2: BOQ select */}
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[11px] font-bold text-slate-550 mr-2 select-none">2. แฟ้มงบประมาณและควบคุม BOQ:</label>
                  <select
                    value={formBoqId}
                    onChange={(e) => {
                      setFormBoqId(e.target.value);
                      setCartItems([]);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white border border-slate-200 dark:border-zinc-700 rounded-lg p-2.5 text-xs outline-hidden focus:border-emerald-500"
                  >
                    <option value="">-- ดำเนินการ นอกงบประมาณโครงการพิเศษ (Outside BOQ) --</option>
                    {filteredFormBOQs.map(b => (
                      <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Field 3: Purpose */}
                <div className="col-span-full flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-550 mr-2 select-none">3. ความประสงค์/วัตถุประสงค์:</label>
                  <input
                    type="text"
                    required
                    maxLength={140}
                    placeholder="เช่น เพื่อใช้ปัดกวาดฐานรากตึก A, สั่งจ้างผู้รับเหมาถมตอกเสาเข็มงวดงานเดือนสาม"
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-white border border-slate-200 dark:border-zinc-700 rounded-lg p-2.5 text-xs outline-hidden focus:border-emerald-500"
                  />
                </div>

              </div>

              {/* SECTION: BUILD THE CART */}
              <div className="bg-slate-50 dark:bg-slate-850 border rounded-xl p-4 mt-6">
                <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2.5 flex items-center gap-1">
                  <Plus className="h-4 w-4 text-emerald-600" />
                  เพิ่มพัสดุหรือรายการสั่งจ้างบริการเข้าใบคำขอ:
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs">
                  
                  {/* Select Item to Purchase/Hire */}
                  <div className="md:col-span-5 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400">เลือกสินค้า/บริการหรือคลิกรายการใหม่</span>
                    <select
                      value={currentSku}
                      onChange={(e) => handleSkuChange(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-800 border p-2 rounded-lg text-xs"
                    >
                      <option value="">-- ค้นหาผลิตภัณฑ์ในคลัง --</option>
                      <option value="CUSTOM">🆕 กรอกรายการพัสดุหรือบริการค่าง้างขึ้นใหม่ภายนอก</option>
                      {items
                        .filter(i => reqType === 'PR' ? (i.itemType !== 'SERVICE') : (i.itemType === 'SERVICE'))
                        .map(i => (
                          <option key={i.sku} value={i.sku}>[{i.sku}] {i.name} ({i.unit})</option>
                        ))}
                    </select>
                  </div>

                  {/* If custom, type name manually */}
                  {currentSku === 'CUSTOM' ? (
                    <div className="md:col-span-4 flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400">ชื่อรายงานวัสดุ / ขอบข่ายภารกิจที่จะจ้าง</span>
                      <input 
                        type="text"
                        placeholder="กรอกชื่อวัสดุ หรือคำบรรยายงานบริการ"
                        className="w-full bg-white dark:bg-zinc-800 border p-2 rounded-lg text-xs font-bold"
                        value={customItemName}
                        onChange={(e) => setCustomItemName(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="md:col-span-4 flex flex-col gap-1 bg-slate-100 dark:bg-zinc-800 p-2 rounded-lg text-slate-500 italic flex justify-center">
                      {customItemName ? `วัสดุ: ${customItemName}` : 'ไม่มีการเลือกวัตถุดิบ'}
                    </div>
                  )}

                  {/* Quantity */}
                  <div className="md:col-span-1.5 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 text-center">จำนวน</span>
                    <input 
                      type="number"
                      min={1}
                      className="w-full bg-white dark:bg-zinc-800 border p-2 rounded-lg text-xs text-center font-mono font-bold"
                      value={currentQty}
                      onChange={(e) => setCurrentQty(Math.max(1, Number(e.target.value)))}
                    />
                  </div>

                  {/* Unit if Custom */}
                  {currentSku === 'CUSTOM' ? (
                    <div className="md:col-span-1.5 flex flex-col gap-1">
                      <span className="text-[10px] text-slate-400 text-center">หน่วย</span>
                      <input 
                        type="text"
                        placeholder="เที่ยว/ถุง"
                        className="w-full bg-white dark:bg-zinc-800 border p-2 rounded-lg text-xs text-center"
                        value={customItemUnit}
                        onChange={(e) => setCustomItemUnit(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="md:col-span-1.5 flex flex-col justify-center items-center font-bold text-slate-600 bg-slate-100 dark:bg-zinc-800 p-2 rounded-lg">
                      {customItemUnit || '-'}
                    </div>
                  )}

                  {/* Estimated Price Unit */}
                  <div className="md:col-span-2 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-400 text-right">ราคาประเมิน/หน่วย</span>
                    <input 
                      type="number"
                      min={0}
                      className="w-full bg-white dark:bg-zinc-800 border p-2 rounded-lg text-xs text-right font-mono font-bold"
                      value={currentPrice}
                      onChange={(e) => setCurrentPrice(Math.max(0, Number(e.target.value)))}
                    />
                  </div>

                  {/* Add button inside CART builder */}
                  <div className="md:col-span-full text-right mt-2">
                    <button
                      type="button"
                      disabled={!currentSku}
                      onClick={handleAddToCart}
                      className={`inline-flex items-center gap-1 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer ${!currentSku ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                    >
                      <Plus className="h-3.5 w-3.5" /> บรรจุสินค้าลงตะกร้าเบิกขอซื้อ
                    </button>
                  </div>

                </div>

                {/* CURRENT ITEMS REQUISITION LIST (IN THE CART) */}
                <div className="mt-4 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                  <div className="bg-slate-100 dark:bg-zinc-850 px-3 py-1.5 font-bold text-slate-600 dark:text-zinc-400 text-[11px] select-none">
                    รายการปัจจุบันพัสดุที่จะส่งตรวจสอบเสนอราคากลางภายในตั๋วใบนี้:
                  </div>
                  {cartItems.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 italic text-3xs">
                      ขณะนี้ยังไม่มีพัสดุในตั๋วจัดเตรียมของ กรุณาเลือกรหัสสินค้าแล้วกด บรรจุผลิตภัณฑ์ เพื่อทำรายการ
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {cartItems.map((item, index) => {
                        let quotaMessage = '';
                        let isOver = false;

                        if (formBoqId && item.itemSku) {
                          const quota = getBOQQuotaInfo(item.itemSku, formBoqId);
                          if (quota.isOutside) {
                            quotaMessage = '⚠️ รายการนอกกรอบสัญญา BOQ (โควตาเกินงบเป็นกรณีพิจารณาพิเศษ)';
                            isOver = true;
                          } else {
                            if (item.quantity > (quota.quotaLeft || 0)) {
                              quotaMessage = `🚨 เกินโควตาหน้างาน (โควตาคงเหลือสิทธิ์ที่เบิกได้: ${quota.quotaLeft} ${item.unit})`;
                              isOver = true;
                            } else {
                              quotaMessage = `✓ โควตางบปลอดภัยปกติ (โควตาคงเหลือสิทธิ์: ${quota.quotaLeft} ${item.unit})`;
                            }
                          }
                        }

                        return (
                          <div key={index} className="p-3 flex items-center justify-between text-xs">
                            <div className="flex-1">
                              <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <span className="font-mono text-[10px] text-zinc-400">[{item.itemSku}]</span>
                                <span>{item.itemName}</span>
                                {item.isOutsideBOQ && (
                                  <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-sm">
                                    Over-Budget
                                  </span>
                                )}
                              </div>
                              {quotaMessage && (
                                <p className={`text-5xs font-semibold ${isOver ? 'text-red-500' : 'text-emerald-500'} mt-0.5`}>
                                  {quotaMessage}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-6">
                              <span className="font-mono text-slate-800 font-bold">
                                {item.quantity} x ฿{item.estimatedPrice.toLocaleString()} = ฿{(item.quantity * item.estimatedPrice).toLocaleString()}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFromCart(index)}
                                className="text-rose-500 hover:text-red-700 p-1 rounded hover:bg-slate-100 transition-all cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="text-right mt-3 font-extrabold text-xs text-slate-800 dark:text-zinc-200">
                  ยอดรวมประมาณการสั่งซื้อสุทธิวงเงิน: ฿{cartItems.reduce((acc, curr) => acc + (curr.quantity * curr.estimatedPrice), 0).toLocaleString()}
                </div>

              </div>

              {/* Action operations and submission submit */}
              <div className="flex justify-end gap-2 text-xs font-bold mt-6 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setIsNewPRModalOpen(false)}
                  className="bg-slate-100 text-slate-650 hover:bg-slate-200 px-4 py-2.5 rounded-lg cursor-pointer transition-all"
                >
                  ย้อนกลับ/ปิดฟอร์ม
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg cursor-pointer transition-all flex items-center gap-1 select-none"
                >
                  <Check className="h-4 w-4" /> ส่งคำขอเข้าสู่การพิจารณาตรวจสอบสิทธิ์อนุมัติ
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
