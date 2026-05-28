/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Project, 
  BOQ, 
  InventoryItem, 
  MultiItemIssueRequest, 
  MultiItemIssueItem, 
  UserRole 
} from '../types';
import { 
  FileText, 
  Check, 
  X, 
  Plus, 
  Search, 
  AlertCircle, 
  Printer, 
  Trash2, 
  Grid, 
  User, 
  Briefcase, 
  CheckCircle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Signature
} from 'lucide-react';

interface MultiItemRequisitionProps {
  projects: Project[];
  boqs: BOQ[];
  items: InventoryItem[];
  multiReqs: MultiItemIssueRequest[];
  currentRole: UserRole;
  currentUserName: string;
  onAddMultiReq: (req: MultiItemIssueRequest) => void;
  onUpdateMultiReq: (id: string, updated: MultiItemIssueRequest) => void;
  onCommitIssueMultiple: (req: MultiItemIssueRequest) => void;
}

export default function MultiItemRequisition({
  projects,
  boqs,
  items,
  multiReqs,
  currentRole,
  currentUserName,
  onAddMultiReq,
  onUpdateMultiReq,
  onCommitIssueMultiple
}: MultiItemRequisitionProps) {
  // Navigation & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');

  // Modals & Active items
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
  const [viewingReq, setViewingReq] = useState<MultiItemIssueRequest | null>(null);
  const [printingReq, setPrintingReq] = useState<MultiItemIssueRequest | null>(null);

  // New Requisition Form State
  const [formProjectId, setFormProjectId] = useState('');
  const [formBoqId, setFormBoqId] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [cartItems, setCartItems] = useState<MultiItemIssueItem[]>([]);
  
  // Cart Item Selector States
  const [selectedSku, setSelectedSku] = useState('');
  const [issueQty, setIssueQty] = useState(1);

  // Signature / Approval
  const [formApproverNote, setFormApproverNote] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const filteredFormBOQs = boqs.filter(b => b.projectId === formProjectId);

  // Get BOQ Quota details for material selection
  const getMaterialQuotaInfo = (sku: string, boqId: string) => {
    if (!boqId) return { isOutside: true, maxQty: 0, usedQty: 0, left: 0 };
    const boq = boqs.find(b => b.id === boqId);
    if (!boq) return { isOutside: true, maxQty: 0, usedQty: 0, left: 0 };
    const boqItem = boq.items.find(bi => bi.itemSku === sku);
    if (!boqItem) return { isOutside: true, maxQty: 0, usedQty: 0, left: 0 };
    
    return {
      isOutside: false,
      maxQty: boqItem.quantityLimit,
      usedQty: boqItem.usedQuantity,
      left: Math.max(0, boqItem.quantityLimit - boqItem.usedQuantity)
    };
  };

  // Add item into the multi requisition cart
  const handleAddToCart = () => {
    if (!selectedSku) return;
    
    const targetItem = items.find(i => i.sku === selectedSku);
    if (!targetItem) return;

    // Check if item already exists in current draft requisition cart
    if (cartItems.some(i => i.itemSku === selectedSku)) {
      alert('รายการสินค้านี้ได้ถูกแนะนำใส่ตะกร้าเบิกแล้ว กรุณาลบออกแล้วสร้างปริมาณใหม่แทน');
      return;
    }

    // Check inventory stock limits
    if (issueQty > targetItem.stockLeft) {
      alert(`⚠️ ปริมาณการเบิก (${issueQty}) เกินสต๊อกคงคลังจริงสะสม (${targetItem.stockLeft} ${targetItem.unit})! ไม่สามารถดำเนินการบรรจุได้`);
      return;
    }

    let isOutside = true;
    if (formBoqId) {
      const quota = getMaterialQuotaInfo(selectedSku, formBoqId);
      isOutside = quota.isOutside;
    }

    const newCartItem: MultiItemIssueItem = {
      itemSku: targetItem.sku,
      itemName: targetItem.name,
      category: targetItem.category,
      quantity: issueQty,
      unit: targetItem.unit,
      costPrice: targetItem.costPrice,
      isOutsideBOQ: isOutside
    };

    setCartItems(prev => [...prev, newCartItem]);
    setSelectedSku('');
    setIssueQty(1);
  };

  // Remove item from cart draft
  const handleRemoveFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  // Submit and lock the Multi-item Requisition
  const handleSubmitRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProjectId) {
      alert('กรุณากรอกโครงการก่อสร้างเป้าหมาย');
      return;
    }
    if (cartItems.length === 0) {
      alert('กรุณากรอกรายการพัสดุที่จะเบิกจ่ายอย่างน้อย 1 รายการ');
      return;
    }

    const project = projects.find(p => p.id === formProjectId);
    const boq = boqs.find(b => b.id === formBoqId);

    const newReq: MultiItemIssueRequest = {
      id: `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString(),
      projectCode: project?.code || 'GEN-PRJ',
      boqCode: boq?.code || undefined,
      requester: currentUserName,
      purpose: formPurpose,
      items: cartItems,
      status: 'PENDING'
    };

    onAddMultiReq(newReq);
    setIsNewRequestModalOpen(false);

    // Reset fields
    setFormProjectId('');
    setFormBoqId('');
    setFormPurpose('');
    setCartItems([]);
  };

  // Signature Canvas Drawing methods
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawingSignature(true);
  };

  const drawSignature = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingSignature) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawingSignature(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl(null);
  };

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    setSignatureDataUrl(dataUrl);
    alert('บันทึกลายมือชื่อจำลองเรียบร้อยแล้ว!');
  };

  // Approve multi item request
  const handleApproveRequest = (req: MultiItemIssueRequest) => {
    // Commit adjustments and stock reduction
    onCommitIssueMultiple({
      ...req,
      status: 'APPROVED',
      approvedBy: `${currentUserName} (${currentRole})`,
      approvedDate: new Date().toISOString(),
      approverNote: formApproverNote,
      signature: signatureDataUrl || undefined
    });
    setFormApproverNote('');
    setSignatureDataUrl(null);
    setViewingReq(null);
  };

  // Reject multi item request
  const handleRejectRequest = (req: MultiItemIssueRequest) => {
    onUpdateMultiReq(req.id, {
      ...req,
      status: 'REJECTED',
      approvedBy: `${currentUserName} (${currentRole})`,
      approvedDate: new Date().toISOString(),
      approverNote: formApproverNote
    });
    setFormApproverNote('');
    setSignatureDataUrl(null);
    setViewingReq(null);
  };

  // Print command
  const triggerPrint = () => {
    window.print();
  };

  // Filter main log
  const filteredReqs = multiReqs.filter(r => {
    const matchesSearch = r.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.requester.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.projectCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    const matchesProject = selectedProjectId === 'ALL' || r.projectCode === selectedProjectId;

    return matchesSearch && matchesStatus && matchesProject;
  });

  return (
    <div className="space-y-6" id="multi-item-requisition-workspace">
      
      {/* Title Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            ระบบเบิกวัสดุแบบหมู่ (Multi-item Requisition Form)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ยื่นขอออกใบงานเบิกวัสดุทีละหลายๆ รายการพร้อมตารางตรวจสอบ BOQ อนุมัติเบิก และการพิมพ์เอกสารราชการพิมพ์
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsNewRequestModalOpen(true)}
          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-3xs cursor-pointer transition-all self-start md:self-auto"
        >
          <Plus className="h-4 w-4" /> สร้างใบขอเบิกพัสดุ (Multi-Item Slip)
        </button>
      </div>

      {/* Filter panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-3xs select-none">
        <div className="flex flex-wrap items-center gap-2 flex-grow">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="ค้นหารหัสใบขอเบิก, ชื่อผู้เสนอเบิก, วัตถุประสงค์งาน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden"
            />
          </div>

          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs p-2 focus:outline-hidden"
          >
            <option value="ALL">สถานะทั้งหมด</option>
            <option value="PENDING">รอการอนุมัติ (PENDING)</option>
            <option value="APPROVED">อนุมัติเรียบร้อย (APPROVED)</option>
            <option value="REJECTED">ไม่ผ่านการอนุมัติ (REJECTED)</option>
          </select>

          <select 
            value={selectedProjectId} 
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs p-2 focus:outline-hidden max-w-[200px]"
          >
            <option value="ALL">โครงการทั้งหมด</option>
            {projects.map(p => (
              <option key={p.id} value={p.code}>{p.code} - {p.name.substring(0, 15)}...</option>
            ))}
          </select>
        </div>

        <span className="text-3xs text-slate-400 font-mono">
          พบรายการ: {filteredReqs.length} เอกสาร
        </span>
      </div>

      {/* Requisition Lists Grid/Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 text-slate-550 font-bold border-b h-10 select-none text-[11px]">
                <th className="px-4 w-[120px]">เลขที่ใบเบิก</th>
                <th className="px-3">วันที่ขอเบิก</th>
                <th className="px-3">โครงการ / BOQ</th>
                <th className="px-3">ผู้เสนอเบิกพัสดุ</th>
                <th className="px-3">ความประสงค์งาน</th>
                <th className="px-3 text-center">จำนวนที่เบิกจ่าย</th>
                <th className="px-3">สถานะใบเบิก</th>
                <th className="px-4 text-center">แผงคำสั่ง</th>
              </tr>
            </thead>
            <tbody className="divide-y text-slate-700 dark:text-slate-300">
              {filteredReqs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    ไม่พบหน้าประวัติสรุปการยื่นคำขอเบิกรายการประเภทกลุ่มในระบบในขณะนี้
                  </td>
                </tr>
              ) : (
                filteredReqs.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                    <td className="px-4 py-3 font-semibold font-mono text-slate-900 dark:text-zinc-200">
                      {req.id}
                    </td>
                    <td className="px-3 py-3 text-slate-500 font-mono">
                      {new Date(req.date).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-800 dark:text-zinc-200">
                      <div>{req.projectCode}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{req.boqCode || 'ภายนอกงบแผนงาน'}</div>
                    </td>
                    <td className="px-3 py-3 font-medium">
                      {req.requester}
                    </td>
                    <td className="px-3 py-3 max-w-[200px] truncate" title={req.purpose}>
                      {req.purpose}
                    </td>
                    <td className="px-3 py-3 text-center font-bold font-mono">
                      {req.items.length} รายการ
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold font-mono ${
                        req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                        req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {req.status === 'PENDING' ? 'กำลังรออนุมัติ' :
                         req.status === 'APPROVED' ? 'อนุมัติเรียบร้อย' :
                         'ผ่านการปฏิเสธ'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center select-none">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => setViewingReq(req)}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded text-2xs font-semibold cursor-pointer"
                        >
                          ตรวจสอบ/จัดการ
                        </button>
                        <button
                          onClick={() => setPrintingReq(req)}
                          className="bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 text-white px-2 py-1 rounded text-2xs font-semibold cursor-pointer flex items-center gap-0.5"
                          title="พิมพ์ใบขอเสนอเบิก"
                        >
                          <Printer className="h-3 w-3" /> ใบขอเบิก
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRINT DIALOGUE MODAL */}
      {printingReq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-4xl p-6 shadow-2xl relative border">
            
            {/* Control Bar */}
            <div className="flex items-center justify-between border-b pb-3 mb-6 print:hidden">
              <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-bold">
                <Printer className="h-4 w-4" />
                <span>ตัวแสดงแบบฟอร์มเอกสารก่อสร้างทางการ (Print Preview Sandbox)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={triggerPrint}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1"
                >
                  <Printer className="h-4 w-4" /> ดำเนินการสั่งพิมพ์หรือจัดเซฟแบบ PDF
                </button>
                <button
                  onClick={() => setPrintingReq(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-705 text-xs px-3.5 py-2 rounded-lg cursor-pointer"
                >
                  ปิดตัวแสดงแบบฟอร์ม
                </button>
              </div>
            </div>

            {/* FORM BODY FOR PRINTING */}
            <div className="bg-white p-8 border border-neutral-300 mx-auto max-w-[760px] text-zinc-900 font-sans print:border-0 print:p-0" id="requisition-print-doc">
              
              {/* Layout Doc Head */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-sm font-extrabold uppercase tracking-wide text-neutral-800">CARGOBOQ CONSTRUCTION GROUP CO., LTD.</h1>
                  <p className="text-3xs text-neutral-500 font-light mt-0.5">บริษัท คาร์โกบีโอคิว วิศวกรรมก่อสร้างอินเตอร์แนชันนัล จำกัด</p>
                  <p className="text-4xs text-neutral-550">122/4 อาคารสำนักงานนวัตกรรม, ถนนลาดกระบัง กรุงเทพมหานคร 10520</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black border-2 border-slate-900 px-3 py-1 bg-slate-50 inline-block rotate-1 tracking-wider">
                    ใบเบิกวัสดุคงคลัง
                  </span>
                  <p className="text-3xs text-neutral-500 mt-2 font-mono">No. {printingReq.id}</p>
                </div>
              </div>

              {/* Title Form name */}
              <div className="text-center my-4 select-none">
                <h2 className="text-base font-extrabold tracking-wide text-neutral-850">ใบขอเบิกพัสดุและรายการออกสินค้าหน้างานก่อสร้าง (Material Requisition Voucher)</h2>
              </div>

              {/* Form Metadata info grid */}
              <div className="grid grid-cols-2 gap-y-1.5 border border-slate-400 p-3 rounded text-3xs mb-4 leading-relaxed">
                <p><strong className="select-none">รหัสโครงการเป้าหมาย:</strong> {printingReq.projectCode}</p>
                <p><strong className="select-none">วันที่จัดทําเอกสาร:</strong> {new Date(printingReq.date).toLocaleDateString('th-TH')} {new Date(printingReq.date).toLocaleTimeString('th-TH')}</p>
                <p><strong className="select-none">แฟ้มงบ BOQ คุม:</strong> {printingReq.boqCode || 'นอกบัญชีรับสิทธิ์อนุมัติพิเศษ'}</p>
                <p><strong className="select-none">ผู้ยื่นเสนอขอเบิกพัสดุ:</strong> {printingReq.requester}</p>
                <p className="col-span-2"><strong className="select-none">พื้นที่/เพื่อวัตถุประสงค์งาน:</strong> {printingReq.purpose}</p>
              </div>

              {/* Items Detail Table */}
              <div>
                <table className="w-full text-left text-3xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-neutral-800 font-bold border border-slate-400 h-7 text-center">
                      <th className="px-2 border border-slate-400 w-10 text-center select-none">#</th>
                      <th className="px-2 border border-slate-400 w-24">รหัส SKU</th>
                      <th className="px-2 border border-slate-400 py-1">ชื่อรายการวัสดุกรรมาธิการ</th>
                      <th className="px-2 border border-slate-400 w-16 text-right">จำนวนเบิก</th>
                      <th className="px-2 border border-slate-400 w-16 text-center">หน่วยนับ</th>
                      <th className="px-2 border border-slate-400 w-20 text-center">ประเภทโควตา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printingReq.items.map((item, idx) => (
                      <tr key={idx} className="h-7 hover:bg-slate-50/20 text-center border">
                        <td className="px-2 border border-slate-350 select-none font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-2 border border-slate-350 text-left font-mono">{item.itemSku}</td>
                        <td className="px-3 border border-slate-350 text-left font-bold text-neutral-800">{item.itemName}</td>
                        <td className="px-2 border border-slate-350 text-right font-mono font-bold text-neutral-850">{item.quantity.toLocaleString()}</td>
                        <td className="px-2 border border-slate-350 text-center text-slate-500">{item.unit}</td>
                        <td className="px-2 border border-slate-350 text-center font-bold">
                          {item.isOutsideBOQ ? (
                            <span className="text-red-700 bg-red-50 px-1 rounded">นอกงบ BOQ</span>
                          ) : (
                            <span className="text-emerald-700 bg-emerald-50 px-1 rounded">ใน BOQ</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {/* Filler rows */}
                    {[...Array(Math.max(0, 5 - printingReq.items.length))].map((_, i) => (
                      <tr key={`filler-${i}`} className="h-7 border select-none">
                        <td className="px-2 border border-slate-350"></td>
                        <td className="px-2 border border-slate-350"></td>
                        <td className="px-3 border border-slate-350"></td>
                        <td className="px-2 border border-slate-350"></td>
                        <td className="px-2 border border-slate-350"></td>
                        <td className="px-2 border border-slate-350"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Status and Notes */}
              <div className="mt-4 text-3xs border p-3 border-dotted rounded-sm border-slate-400 leading-relaxed">
                <div>
                  <span className="font-bold select-none text-neutral-800">สถานะปัจจุบันใบเบิก:</span> 
                  <span className="ml-1 uppercase font-bold text-blue-800">{printingReq.status}</span>
                </div>
                {printingReq.approvedBy && (
                  <div className="mt-1">
                    <span className="font-bold select-none text-neutral-850">ผู้อนุมัติเอกสาร:</span> {printingReq.approvedBy} | วันอนุมัติ: {new Date(printingReq.approvedDate || '').toLocaleDateString('th-TH')}
                  </div>
                )}
                {printingReq.approverNote && (
                  <div className="mt-1 text-slate-500">
                    <span className="font-bold select-none text-neutral-850">บันทึกผู้อนุมัติ:</span> "{printingReq.approverNote}"
                  </div>
                )}
              </div>

              {/* Corporate signature authorization signatures blocks */}
              <div className="grid grid-cols-3 gap-6 mt-12 text-center text-4xs leading-relaxed select-none">
                
                <div className="space-y-4 flex flex-col items-center">
                  <div className="w-32 border-b-2 border-slate-300 h-10 flex items-end justify-center">
                    <span className="font-serif italic text-slate-400 text-5xs">สมชาย ช่างเขียน</span>
                  </div>
                  <div>
                    <label className="font-bold text-slate-800">ผู้ขอเบิกพัสดุ (Requester)</label>
                    <p className="text-slate-400 font-light mt-0.5">ช่างชํนาญการก่อสร้าง</p>
                  </div>
                </div>

                <div className="space-y-4 flex flex-col items-center">
                  <div className="w-32 border-b-2 border-slate-300 h-10 flex items-center justify-center">
                    {printingReq.signature ? (
                      <img src={printingReq.signature} alt="Signature mock" className="h-8 max-w-full object-contain" />
                    ) : (
                      <span className="text-slate-300 text-5xs leading-none">ยังไม่ลงทะเบียนลายมือ</span>
                    )}
                  </div>
                  <div>
                    <label className="font-bold text-slate-800">ผู้จ่ายและดูแลคลัง (Store Manager)</label>
                    <p className="text-slate-400 font-light mt-0.5">ผู้จัดการดูแลคลังสินค้า</p>
                  </div>
                </div>

                <div className="space-y-4 flex flex-col items-center">
                  <div className="w-32 border-b-2 border-slate-300 h-10 flex items-end justify-center">
                    {printingReq.status === 'APPROVED' ? (
                      <span className="font-semibold text-emerald-700 border border-emerald-500 text-5xs px-1 rounded uppercase tracking-wider animate-pulse leading-none mb-1">
                        APPROVED ✓
                      </span>
                    ) : (
                      <span className="text-slate-300 text-5xs leading-none">PENDING APPROVAL</span>
                    )}
                  </div>
                  <div>
                    <label className="font-bold text-slate-800">ผู้อนุมัติโครงการ (Approver/PM)</label>
                    <p className="text-slate-400 font-light mt-0.5">ผู้อํานวยการควบคุมแผนงบประมาณ</p>
                  </div>
                </div>

              </div>

              {/* Footer Legal Code for printing */}
              <div className="mt-12 text-center border-t border-slate-100 pt-2 text-[8px] font-mono text-slate-400 select-none">
                DOC_REF ID: F-INV-MReq-V04 | SECURELY PERSISTED IN BOQONLINE_SMART ENGINE
              </div>

            </div>

          </div>
        </div>
      )}

      {/* VIEW AND MANAGE REQUISITION MODAL */}
      {viewingReq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            
            <div className="flex items-center justify-between border-b pb-4 mb-4 select-none">
              <div>
                <span className="text-[10px] text-indigo-600 font-bold block">VERIFICATION & APPROVAL WORKSPACE</span>
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  จัดการคำขอเบิกพัสดุกลุ่ม #{viewingReq.id}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => { setViewingReq(null); setSignatureDataUrl(null); }}
                className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-850 p-4 rounded-xl text-2xs text-slate-600 dark:text-slate-300">
              <div>
                <p><span className="font-semibold select-none">ผู้มีสิทธิ์เบิกเบิก:</span> {viewingReq.requester}</p>
                <p className="mt-1"><span className="font-semibold select-none">วันที่ยื่นเรื่อง:</span> {new Date(viewingReq.date).toLocaleString('th-TH')}</p>
                <p className="mt-1"><span className="font-semibold select-none">ความประสงค์ใช้:</span> {viewingReq.purpose}</p>
              </div>
              <div>
                <p><span className="font-semibold select-none">โครงการ:</span> {viewingReq.projectCode}</p>
                <p className="mt-1"><span className="font-semibold select-none">คุม BOQ:</span> {viewingReq.boqCode || 'นอกสิทธิ์บัญชีงบเป้าหมาย'}</p>
                <p className="mt-1"><span className="font-semibold select-none">สถานะปัจจุบัน:</span> <span className="font-bold uppercase text-indigo-600">{viewingReq.status}</span></p>
              </div>
            </div>

            {/* List of items inside req */}
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">ตารางพัสดุก่อสร้างขอเบิก:</p>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-[160px] overflow-y-auto">
                <table className="w-full text-2xs text-left">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-zinc-800 text-slate-500 font-bold h-7 border-b">
                      <th className="px-3">SKU</th>
                      <th className="px-2">ชื่อรายการสินค้า</th>
                      <th className="px-2 text-right">จำนวนเบิก</th>
                      <th className="px-2 text-center">หน่วยนับ</th>
                      <th className="px-2 text-center">สถานะงบควบคุม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700 dark:text-slate-300">
                    {viewingReq.items.map((item, idx) => (
                      <tr key={idx} className="h-8">
                        <td className="px-3 font-mono text-[9px]">{item.itemSku}</td>
                        <td className="px-2 font-bold">{item.itemName}</td>
                        <td className="px-2 text-right font-mono font-bold">{item.quantity}</td>
                        <td className="px-2 text-center text-slate-500">{item.unit}</td>
                        <td className="px-2 text-center">
                          {item.isOutsideBOQ ? (
                            <span className="text-[9px] bg-red-100 text-red-700 px-1 rounded font-bold">นอกงบ BOQ</span>
                          ) : (
                            <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 rounded font-bold">ผ่านโควตา</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Approval workspace */}
            <div className="border-t pt-4 mt-4 text-xs select-none">
              {viewingReq.status === 'PENDING' ? (
                <div className="space-y-4">
                  <p className="font-bold text-slate-850 dark:text-zinc-205 flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-indigo-600" />
                    ยืนยันการทำความเห็นอนุมัติเบิกพัสดุเป็นกลุ่ม:
                  </p>
                  
                  <textarea 
                    placeholder="ใส่หมายเหตุบันทึกความเห็นอนุมัติจ่ายพัสดุ..."
                    value={formApproverNote}
                    onChange={(e) => setFormApproverNote(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 text-slate-800 border border-slate-250 p-2 text-xs rounded-lg"
                    rows={2}
                  />

                  {/* Draw Signature Block inside Requisition Approval */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-3xs font-bold text-slate-500 block">ลงนามลายมือชื่อผู้จ่ายสินค้า (Store Signature Pad):</label>
                      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 shadow-inner">
                        <canvas
                          ref={canvasRef}
                          width={280}
                          height={100}
                          onMouseDown={startDrawing}
                          onMouseMove={drawSignature}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          className="w-full h-[100px] cursor-crosshair bg-slate-50"
                        />
                      </div>
                      <div className="flex gap-1 pt-1 justify-end">
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="text-4xs text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer"
                        >
                          ล้างกระดาน
                        </button>
                        <button
                          type="button"
                          onClick={saveCanvas}
                          className="text-4xs text-white bg-blue-600 hover:bg-blue-700 px-2' py-0.5 px-2 rounded cursor-pointer"
                        >
                          ล็อคลายชื่อ
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col justify-end text-right space-y-2 mt-4 md:mt-0 font-bold">
                      <p className="text-3xs text-slate-400">
                        สิทธิ์ปัจจุบันของคุณ: <b className="text-slate-700 dark:text-zinc-250">{currentRole}</b>
                      </p>
                      
                      <div className="flex gap-2 justify-end text-xs">
                        <button
                          type="button"
                          onClick={() => handleRejectRequest(viewingReq)}
                          className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-2 rounded-lg cursor-pointer"
                        >
                          ปฏิเสธคำเบิก (Reject)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveRequest(viewingReq)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg cursor-pointer flex items-center gap-0.5"
                        >
                          <Check className="h-4 w-4" /> อนุมัติเบิกพัสดุกลุ่ม (Approve)
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl text-3xs text-slate-500 space-y-1">
                  <p><span className="font-bold text-slate-700 dark:text-zinc-300">ผู้เปลี่ยนผ่านสถานะ:</span> {viewingReq.approvedBy}</p>
                  <p><span className="font-bold text-slate-700 dark:text-zinc-300">วันเวลาอนุมัติจ่าย:</span> {viewingReq.approvedDate ? new Date(viewingReq.approvedDate).toLocaleString('th-TH') : '-'}</p>
                  {viewingReq.approverNote && (
                    <p><span className="font-bold text-slate-700 dark:text-zinc-300">บันทึกผู้อนุมัติ:</span> "{viewingReq.approverNote}"</p>
                  )}
                  {viewingReq.signature && (
                    <div className="pt-2">
                      <span className="font-bold text-slate-700 dark:text-zinc-300 block select-none">ลายมือชื่อผู้ลงทะเบียน:</span>
                      <img src={viewingReq.signature} alt="Sign" className="h-[50px] object-contain border bg-white mt-1 rounded p-1" />
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* NEW REQUEST MULTI ITEM SLIP REQUISITION MODAL */}
      {isNewRequestModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-40">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b pb-4 mb-4 select-none">
              <div>
                <span className="text-[10px] text-indigo-600 font-bold block">Material Slip Drafter</span>
                <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1 text-base">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  เขียนขอเบิกจ่ายสินค้าคลังกรณีกลุ่ม (Multi-Item Slip Draft)
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsNewRequestModalOpen(false)}
                className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequisition} className="space-y-4 text-xs font-medium">
              
              <div className="grid grid-cols-2 gap-4">
                
                {/* Field 1: Project code */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-550 select-none">1. สำหรับโครงการก่อสร้างปลายทาง:</label>
                  <select
                    required
                    value={formProjectId}
                    onChange={(e) => {
                      setFormProjectId(e.target.value);
                      setFormBoqId('');
                      setCartItems([]);
                    }}
                    className="w-full bg-slate-50 border p-2 text-xs rounded-lg outline-hidden"
                  >
                    <option value="">-- กรุณาเลือกโครงการ --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Field 2: BOQ Code */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-550 select-none">2. ยึดบัญชีงบเป้าหมาย BOQ:</label>
                  <select
                    value={formBoqId}
                    onChange={(e) => {
                      setFormBoqId(e.target.value);
                      setCartItems([]);
                    }}
                    className="w-full bg-slate-50 border p-2 text-xs rounded-lg outline-hidden"
                  >
                    <option value="">-- นอกฝาโควตาแผนงาน (นอกงบ BOQ พิจารณาแยก) --</option>
                    {filteredFormBOQs.map(b => (
                      <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Field 3: Purpose info */}
                <div className="col-span-full flex flex-col gap-1">
                  <label className="font-bold text-slate-550 select-none">3. รายละเอียดเหตุผล/วัตถุประสงค์งานเบิก:</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น เพื่อนำไปประกอบแผงวงจรไฟฟ้าชั้น 2"
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value)}
                    className="w-full bg-slate-50 border p-2 text-xs rounded-lg outline-hidden"
                  />
                </div>

              </div>

              {/* DRAFTING ENGINE CONTAINER */}
              <div className="bg-slate-50 border p-4 rounded-xl space-y-3">
                <p className="font-bold text-slate-750 flex items-center gap-1 select-none">
                  <Plus className="h-4 w-4 text-indigo-600" />
                  เลือกพัสดุเพื่อจัดบรรจุใส่ตั๋วขอเบิกหมู่:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-2xs">
                  
                  {/* Item select */}
                  <div className="md:col-span-8 flex flex-col gap-1">
                    <span className="text-[#64748b]">สินค้าคงคลังที่มีให้เบิกจ่าย</span>
                    <select
                      value={selectedSku}
                      onChange={(e) => setSelectedSku(e.target.value)}
                      className="w-full bg-white border p-1.5 rounded text-2xs"
                    >
                      <option value="">-- โปรดเลือกรหัสพัสดุที่มีระบบจัดเก็บ --</option>
                      {items
                        .filter(i => i.itemType !== 'SERVICE' && i.stockLeft > 0)
                        .map(i => (
                          <option key={i.sku} value={i.sku}>[{i.sku}] {i.name} (สต๊อกเหลือ: {i.stockLeft} {i.unit})</option>
                        ))}
                    </select>
                  </div>

                  {/* Quantity to request */}
                  <div className="md:col-span-2 flex flex-col gap-1">
                    <span className="text-[#64748b]" id="stock-left-label">จำนวน</span>
                    <input 
                      type="number"
                      min={1}
                      className="w-full bg-white border text-center p-1.5 rounded text-2xs font-mono font-bold"
                      value={issueQty}
                      onChange={(e) => setIssueQty(Math.max(1, Number(e.target.value)))}
                    />
                  </div>

                  {/* Button addToCart */}
                  <div className="md:col-span-2 flex items-end">
                    <button
                      type="button"
                      disabled={!selectedSku}
                      onClick={handleAddToCart}
                      className={`w-full text-white font-bold p-1.5 rounded text-2xs text-center cursor-pointer transition-all ${
                        !selectedSku ? 'bg-slate-300' : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      + บรรจุ
                    </button>
                  </div>

                </div>

                {/* VISUAL CURRENT LIST IN THE CART */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <div className="bg-slate-100 px-3 py-1 text-slate-500 text-3xs font-semibold select-none">
                    ตะกร้ารายการพัสดุที่จะออกส่งอนุมัติ:
                  </div>
                  {cartItems.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 italic text-4xs">
                      ยังไม่มีรายการบรรจุลงตะกร้าขอเบิกพัสดุทีละหลายรายการ
                    </div>
                  ) : (
                    <div className="divide-y max-h-[140px] overflow-y-auto">
                      {cartItems.map((item, index) => {
                        let quotaMessage = '';
                        let isOver = false;

                        if (formBoqId && item.itemSku) {
                          const quota = getMaterialQuotaInfo(item.itemSku, formBoqId);
                          if (quota.isOutside) {
                            quotaMessage = '⚠️ รายการพายนอกพิมพาสิทธิสัญญา BOQ คงบัญชีเสริมพิเศษ';
                            isOver = true;
                          } else {
                            if (item.quantity > (quota.left || 0)) {
                              quotaMessage = `🚨 เกินโควตาหน้างาน (สิทธิ์คงเหลือเบิกได้ปกติ: ${quota.left} ${item.unit})`;
                              isOver = true;
                            } else {
                              quotaMessage = `✓ โควตาระดับควบคุมสัญญาสมบูรณ์ (สิทธิ์เหลือเบิกปลอดภัย: ${quota.left} ${item.unit})`;
                            }
                          }
                        }

                        return (
                          <div key={index} className="p-2.5 flex items-center justify-between text-2xs hover:bg-slate-50/20">
                            <div>
                              <div className="font-bold text-slate-800">
                                <span className="font-mono text-[9px] text-zinc-400 mr-1">[{item.itemSku}]</span>
                                {item.itemName} ({item.quantity} {item.unit})
                              </div>
                              {quotaMessage && (
                                <p className={`text-[9px] font-bold ${isOver ? 'text-red-500' : 'text-emerald-500'} mt-0.5`}>
                                  {quotaMessage}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(index)}
                              className="text-rose-500 hover:text-red-700 p-1 rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* Submit panel */}
              <div className="flex justify-end gap-2 text-xs font-bold border-t pt-4">
                <button
                  type="button"
                  onClick={() => setIsNewRequestModalOpen(false)}
                  className="bg-slate-100 text-slate-650 hover:bg-slate-100 px-4 py-2 rounded-lg cursor-pointer"
                >
                  ยกเลิกเขียนแผน
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg cursor-pointer"
                >
                  ส่งตั๋วเสนอขออนุมัติเบิกจ่าย (Submit Multi-Item Slip)
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
