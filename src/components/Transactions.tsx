/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { InventoryItem, Project, BOQ, Transaction, UserRole } from '../types';
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  RotateCcw, 
  Settings, 
  Signature, 
  CheckCircle, 
  AlertTriangle,
  ClipboardList,
  Building,
  User,
  AlertCircle,
  Clock,
  Camera,
  X
} from 'lucide-react';

interface TransactionsProps {
  items: InventoryItem[];
  projects: Project[];
  boqs: BOQ[];
  onCommitTransaction: (tx: Transaction) => void;
  currentUserRole: UserRole;
  currentUserName: string;
  scannedSkuTarget?: string | null;
  onClearScannedSkuTarget?: () => void;
}

export default function Transactions({
  items,
  projects,
  boqs,
  onCommitTransaction,
  currentUserRole,
  currentUserName,
  scannedSkuTarget,
  onClearScannedSkuTarget
}: TransactionsProps) {
  const [activeTab, setActiveTab] = useState<'RECEIVE' | 'ISSUE' | 'RETURN' | 'ADJUST'>('ISSUE');

  // Form States - Common
  const [selectedSku, setSelectedSku] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');

  // Tab: RECEIVE
  const [supplier, setSupplier] = useState('');
  const [receivePrice, setReceivePrice] = useState(0);
  const [lotCode, setLotCode] = useState('');

  // Tab: ISSUE
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedBoqId, setSelectedBoqId] = useState('');
  const [requester, setRequester] = useState('');
  const [issuePrice, setIssuePrice] = useState(0);
  const [isSignOpen, setIsSignOpen] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Signature canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Tab: RETURN
  const [selectedReturnProjId, setSelectedReturnProjId] = useState('');
  const [selectedReturnBoqId, setSelectedReturnBoqId] = useState('');

  // Tab: ADJUST
  const [adjustType, setAdjustType] = useState<'INCREASE' | 'DECREASE'>('DECREASE');
  
  // Custom alerts for BOQ verification UI
  const [boqStatusMsg, setBoqStatusMsg] = useState<{
    status: 'OK' | 'EXCEEDED' | 'OUTSIDE';
    message: string;
    quotaLeft?: number;
  } | null>(null);

  // Auto-select scanned SKU if available
  useEffect(() => {
    if (scannedSkuTarget) {
      setSelectedSku(scannedSkuTarget);
      if (onClearScannedSkuTarget) {
        onClearScannedSkuTarget();
      }
    }
  }, [scannedSkuTarget, onClearScannedSkuTarget]);

  // Auto-fill pricing and run BOQ validation checks as fields change
  useEffect(() => {
    if (!selectedSku) {
      setBoqStatusMsg(null);
      return;
    }

    const item = items.find(i => i.sku === selectedSku);
    if (!item) return;

    setReceivePrice(item.costPrice);
    setIssuePrice(item.costPrice);

    // If we are issuing, double check BOQ status
    if (activeTab === 'ISSUE' && selectedProjectId && selectedBoqId) {
      const boq = boqs.find(b => b.id === selectedBoqId);
      if (!boq) return;

      const boqItem = boq.items.find(bi => bi.itemSku === selectedSku);
      if (!boqItem) {
        setBoqStatusMsg({
          status: 'OUTSIDE',
          message: `⚠️ วัสดุ "${item.name}" ไม่อยู่ในโควตา BOQ แฟ้มนี้! หากดำเนินการเบิก จะคิดเป็นยอด นอกงบประมาณโครงการพิเศษ`
        });
      } else {
        const quotaLeft = boqItem.quantityLimit - boqItem.usedQuantity;
        if (quantity > quotaLeft) {
          setBoqStatusMsg({
            status: 'EXCEEDED',
            status_code: 400,
            quotaLeft,
            message: `🚨 ปริมาณเบิก ${quantity} ${item.unit} เกินโควตาที่กำหนดใน BOQ สัญญางวดงานนี้ (โควตาเหลือเบิกได้: ${quotaLeft} ${item.unit})`
          } as any);
        } else {
          setBoqStatusMsg({
            status: 'OK',
            quotaLeft,
            message: `✔ ควบคุมวงเงินปกติ ผูกอยู่ในงบ BOQ สัญญาก่อสร้าง (โควตาเหลือเบิกได้: ${quotaLeft} ${item.unit})`
          });
        }
      }
    } else {
      setBoqStatusMsg(null);
    }

  }, [selectedSku, quantity, selectedProjectId, selectedBoqId, activeTab]);

  // Handle signature canvas drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#0284c7'; // Sky-600
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';

    const rect = canvas.getBoundingClientRect();
    const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
    const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
    const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setSignatureData(null);
  };

  const saveSignature = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const base64 = canvas.toDataURL('image/png');
    setSignatureData(base64);
    setIsSignOpen(false);
  };

  // Submit transaction commit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSku) return;

    const item = items.find(i => i.sku === selectedSku);
    if (!item) return;

    // Guard stock constraints on ISSUE
    if (activeTab === 'ISSUE') {
      if (item.stockLeft < quantity) {
        alert(`❌ ของไม่เพียงพอกับยอดเบิก! (เหลืออยู่ในสต๊อกจริงเพียง ${item.stockLeft} ${item.unit})`);
        return;
      }
      if (!signatureData) {
        alert('❌ กรุณาเซ็นชื่อรับวัสดุโครงการ (Digital Signature) เพื่ออนุมัติเบิกจ่าย');
        return;
      }
    }

    const rxProject = projects.find(p => p.id === selectedProjectId);
    const rxReturnProject = projects.find(p => p.id === selectedReturnProjId);
    const activeDocNo = `TX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random()*9000)}`;

    const freshTx: Transaction = {
      id: activeDocNo,
      date: new Date().toISOString(),
      type: activeTab,
      itemSku: selectedSku,
      itemName: item.name,
      category: item.category,
      quantity: activeTab === 'ADJUST' && adjustType === 'DECREASE' ? -quantity : quantity,
      unit: item.unit,
      costPrice: activeTab === 'RECEIVE' ? receivePrice : item.costPrice,
      operator: currentUserName,
      requester: activeTab === 'ISSUE' ? requester : undefined,
      projectCode: activeTab === 'ISSUE' ? rxProject?.code 
                  : activeTab === 'RETURN' ? rxReturnProject?.code : undefined,
      boqCode: activeTab === 'ISSUE' ? boqs.find(b => b.id === selectedBoqId)?.code 
              : activeTab === 'RETURN' ? boqs.find(b => b.id === selectedReturnBoqId)?.code : undefined,
      isOutsideBOQ: activeTab === 'ISSUE' && boqStatusMsg?.status === 'OUTSIDE',
      status: activeTab === 'ISSUE' && boqStatusMsg?.status !== 'OK' ? 'APPROVED' : 'APPROVED', // Keep pre-authorized simplicity,
      signature: activeTab === 'ISSUE' ? signatureData || undefined : undefined,
      reason: activeTab === 'ADJUST' ? reason : activeTab === 'RETURN' ? `คืนวัสดุเหลือล้นไซท์: ${reason}` : undefined,
      lot: activeTab === 'RECEIVE' ? lotCode || `Refill-Lot-${new Date().getTime().toString().slice(-4)}` : undefined
    };

    onCommitTransaction(freshTx);
    alert(`✔ ลงบันทึกรายการตรวจสอบเอกสาร ${freshTx.id} ในสต๊อกเรียบร้อยแล้ว!`);
    
    // Clear form
    setSelectedSku('');
    setQuantity(1);
    setReason('');
    setRequester('');
    setSignatureData(null);
    setLotCode('');
  };

  // Switch role-perm indicators
  const matchedProjectBoqs = boqs.filter(b => b.projectId === selectedProjectId);
  const matchedReturnProjectBoqs = boqs.filter(b => b.projectId === selectedReturnProjId);

  return (
    <div className="bg-white rounded-xl border border-slate-105 shadow-xs overflow-hidden" id="transactions-module">
      
      {/* Upper Navigation Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50 p-2 gap-1.5 overflow-x-auto whitespace-nowrap">
        <button 
          onClick={() => {
            setActiveTab('ISSUE');
            setSelectedSku('');
          }}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all text-center inline-flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'ISSUE' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-600'
          }`}
          id="tab-issue"
        >
          <ArrowUpCircle className="h-4 w-4" />
          <span>📤 เบิกใช้วัสดุก่อสร้าง (Issue)</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('RECEIVE');
            setSelectedSku('');
          }}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all text-center inline-flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'RECEIVE' ? 'bg-emerald-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-600'
          }`}
          id="tab-receive"
        >
          <ArrowDownCircle className="h-4 w-4" />
          <span>📥 รับใหม่เติมคลัง (Receive)</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('RETURN');
            setSelectedSku('');
          }}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all text-center inline-flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'RETURN' ? 'bg-teal-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-600'
          }`}
          id="tab-return"
        >
          <RotateCcw className="h-4 w-4" />
          <span>🔁 คืนของงวดงาน (Return)</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('ADJUST');
            setSelectedSku('');
          }}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all text-center inline-flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'ADJUST' ? 'bg-amber-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-600'
          }`}
          id="tab-adjust"
        >
          <Settings className="h-4 w-4" />
          <span>⚙️ ปรับลดเพิ่มสต๊อกเสียหาย (Adjust)</span>
        </button>
      </div>

      {/* Main Core Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        
        {/* Step Header */}
        <div className="border-b border-slate-50 pb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-slate-400" />
            <span>กรอกรายละเอียดข้อมูลทำเรื่องระบบโอนย้าย ({activeTab})</span>
          </h3>
          <p className="text-3xs text-slate-500 mt-0.5">ระบบจะหักลบและเติมคลังรวมถึงปรับมูลค่างบโครงการแบบอัตโนมัติ Real-time</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column Fields */}
          <div className="space-y-4">
            
            {/* Project / BOQ bindings (ONLY for Issue / Return tabs) */}
            {(activeTab === 'ISSUE' || activeTab === 'RETURN') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Project selector */}
                <div>
                  <label className="text-3xs font-bold text-slate-500 block mb-1">เลือกโครงการไซต์งานก่อสร้าง <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={activeTab === 'ISSUE' ? selectedProjectId : selectedReturnProjId}
                    onChange={(e) => {
                      if (activeTab === 'ISSUE') {
                        setSelectedProjectId(e.target.value);
                        setSelectedBoqId('');
                      } else {
                        setSelectedReturnProjId(e.target.value);
                        setSelectedReturnBoqId('');
                      }
                      setSelectedSku('');
                    }}
                    className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    <option value="">-- เลือกโครงการ --</option>
                    {projects.map(proj => (
                      <option key={proj.id} value={proj.id}>{proj.name} ({proj.code})</option>
                    ))}
                  </select>
                </div>

                {/* BOQ category bind selector */}
                <div>
                  <label className="text-3xs font-bold text-slate-500 block mb-1">เลือกแฟ้มสัญญางวดงาน (BOQ) <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={activeTab === 'ISSUE' ? selectedBoqId : selectedReturnBoqId}
                    disabled={activeTab === 'ISSUE' ? !selectedProjectId : !selectedReturnProjId}
                    onChange={(e) => {
                      if (activeTab === 'ISSUE') {
                        setSelectedBoqId(e.target.value);
                      } else {
                        setSelectedReturnBoqId(e.target.value);
                      }
                      setSelectedSku('');
                    }}
                    className="w-full bg-slate-50 disabled:opacity-50 border border-slate-200 p-2 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    <option value="">-- เลือกแฟ้ม BOQ --</option>
                    {activeTab === 'ISSUE' ? (
                      matchedProjectBoqs.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))
                    ) : (
                      matchedReturnProjectBoqs.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))
                    )}
                  </select>
                </div>

              </div>
            )}

            {/* Material Product selecting dropdown */}
            <div>
              <label className="text-3xs font-bold text-slate-500 block mb-1 block">
                เลือกสินค้าวัสดุ <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedSku}
                disabled={(activeTab === 'ISSUE' && !selectedBoqId) || (activeTab === 'RETURN' && !selectedReturnBoqId)}
                onChange={(e) => setSelectedSku(e.target.value)}
                className="w-full bg-white border border-slate-200 p-2.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <option value="">-- เลือกสินค้าจากบัญชี --</option>
                {/* Under issue tab we can select any item since we allow OUT-OF-BOQ with warning alerts */}
                {items.map(item => (
                  <option key={item.sku} value={item.sku}>
                    [{item.sku}] {item.name} (คงเหลือในตู้เก็บ: {item.stockLeft} {item.unit})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-3xs font-bold text-slate-500 block mb-1">ระบุจำนวนที่ต้องการ <span className="text-red-500">*</span></label>
                <input 
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs text-slate-800 font-mono font-bold"
                />
              </div>

              {/* Unit display */}
              <div>
                <label className="text-3xs font-bold text-slate-500 block mb-1">หน่วยของสินค้า</label>
                <input 
                  type="text"
                  disabled
                  value={items.find(i => i.sku === selectedSku)?.unit || '-'}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs font-semibold text-slate-550"
                />
              </div>
            </div>

            {/* Adjust Tab options */}
            {activeTab === 'ADJUST' && (
              <div className="space-y-3">
                <label className="text-3xs font-bold text-slate-500 block">รูปแบบทิศทางการทำบัญชีปรับสต๊อก</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-rose-600 font-sans cursor-pointer">
                    <input 
                      type="radio" 
                      name="adj_type"
                      checked={adjustType === 'DECREASE'}
                      onChange={() => setAdjustType('DECREASE')} 
                    />
                    <span>🔴 ปรับลดคลัง (ของสูญหาย, วัสดุเสียหายจากการขนส่ง)</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 font-sans cursor-pointer">
                    <input 
                      type="radio" 
                      name="adj_type"
                      checked={adjustType === 'INCREASE'}
                      onChange={() => setAdjustType('INCREASE')}
                    />
                    <span>🟢 ปรับเพิ่มคลัง (พบสินค้าเกินใบสั่งซื้อ, ตรวจนับเพิ่มรายปี)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Lot Code for RECEIVE */}
            {activeTab === 'RECEIVE' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-3xs font-bold text-slate-500 block mb-1">ผู้จัดหา / Supplier นำเข้า</label>
                  <input 
                    type="text"
                    placeholder="SCG Outlet"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-3xs font-bold text-slate-500 block mb-1">แทรกรหัส Lot / PO อ้างอิง</label>
                  <input 
                    type="text"
                    placeholder="LOT-X2026"
                    value={lotCode}
                    onChange={(e) => setLotCode(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {/* Reasons or notes */}
            <div>
              <label className="text-3xs font-bold text-slate-500 block mb-1">เหตุผลความต้องการ / หมายเหตุของรายการ</label>
              <textarea 
                rows={3}
                placeholder={
                  activeTab === 'ADJUST' ? "สาเหตุเช่น ตรวจนับเสื่อมสภาพประจำงวด ชำรุดแตกหัก" 
                  : activeTab === 'RETURN' ? "สภาพที่ส่งคืน เช่น ปูนคงสภาพถุงแห้งสมบูรณ์ คืนเข้าสต๊อกสะสมลดต้นทุน" 
                  : "กรอกรายละเอียดความจำเป็นประกอบ เช่น ใช้ปูแนวเดินท่อปรับแบบชั้น 1"
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs"
              />
            </div>

          </div>

          {/* Right Column: BOQ Verifiers & Digital Signature Pad */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 flex flex-col justify-between space-y-4">
            
            {/* Visual real-time verification alerts */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 inline-flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span>ตัวช่วยคำนวณและตรวจสอบ BOQ เบิกจ่ายอัจฉริยะ</span>
              </h4>

              {!selectedSku ? (
                <div className="py-8 text-center text-xs text-slate-400 italic bg-white border border-dashed border-slate-200 rounded-lg">
                  เลือกสินค้าและแฟ้มโครงการเพื่อรายงานสถานะของขีดจำกัดสิทธิ์เบิก
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Detailed item profile snippet */}
                  <div className="bg-white p-3 rounded-lg border border-slate-100 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-3xs text-slate-400 block font-mono">SELECTED ITEM SKU</span>
                      <span className="font-bold text-slate-800">{(items.find(i => i.sku === selectedSku))?.name}</span>
                    </div>
                    <div className="text-right font-mono font-bold text-slate-700">
                      <span>สต๊อกรวม: {(items.find(i => i.sku === selectedSku))?.stockLeft} </span>
                      <span className="text-3xs text-slate-455 font-normal">{(items.find(i => i.sku === selectedSku))?.unit}</span>
                    </div>
                  </div>

                  {/* Real-time BOQ verification result label */}
                  {boqStatusMsg && (
                    <div className={`p-4 rounded-xl border text-xs leading-relaxed space-y-2 ${
                      boqStatusMsg.status === 'OK' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                      boqStatusMsg.status === 'EXCEEDED' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                      'bg-amber-50 border-amber-200 text-amber-800'
                    }`}>
                      <div className="flex gap-2">
                        {boqStatusMsg.status === 'OK' && <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />}
                        {boqStatusMsg.status === 'EXCEEDED' && <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />}
                        {boqStatusMsg.status === 'OUTSIDE' && <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />}
                        <span className="font-bold">{boqStatusMsg.message}</span>
                      </div>

                      {boqStatusMsg.status === 'OUTSIDE' && (
                        <p className="text-3xs text-amber-700 font-medium pl-6">
                          * ระบบจะทำการเปิดสิทธิ์เบิกนอกงวดเพื่อไม่ให้งานล่าช้า แต่จะส่งสัญญานเตือนเข้าไลน์ผู้มีอำนาจ (Approvers) ทันทีเพื่อลงนามอนุมัติ
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Signature & Submitting Controls */}
            <div className="pt-4 border-t border-slate-200/60 space-y-3 shrink-0">
              
              {activeTab === 'ISSUE' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-3xs font-bold text-slate-500 uppercase block">ผู้นำความจำนงค์เบิกจ่าย <span className="text-red-500">*</span></label>
                    <span className="text-4xs text-slate-400">กรุณาลงลายมือชื่อ</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="text"
                      required
                      placeholder="ชื่อผู้เบิก เช่น สมชาย รักงาน"
                      value={requester}
                      onChange={(e) => setRequester(e.target.value)}
                      className="bg-white border border-slate-200 p-2 rounded-lg text-xs font-medium focus:outline-hidden text-slate-800"
                    />
                    
                    <button 
                      type="button"
                      onClick={() => setIsSignOpen(true)}
                      className="px-2.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-3xs font-bold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Signature className="h-3.5 w-3.5 text-blue-400" />
                      <span>{signatureData ? '✓ ลงชื่อเรียบร้อย' : '✍ เซ็นลายมือกรรมการ'}</span>
                    </button>
                  </div>

                  {signatureData && (
                    <div className="p-2 border border-slate-250 bg-white rounded-lg flex items-center justify-between">
                      <span className="text-4xs text-slate-400">ภาพลายเซ็น:</span>
                      <img src={signatureData} alt="Signature preview" className="h-8 max-w-[120px] object-contain border border-slate-100 p-0.5" />
                      <button 
                        type="button" 
                        onClick={() => setSignatureData(null)}
                        className="text-4xs text-rose-500 hover:underline"
                      >
                        ล้างลายเซ็น
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button 
                type="submit"
                disabled={!selectedSku}
                className={`w-full py-2.5 font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer ${
                  !selectedSku ? 'bg-slate-200 text-slate-400 cursor-not-allowed' :
                  activeTab === 'RECEIVE' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/10' :
                  activeTab === 'RETURN' ? 'bg-teal-600 hover:bg-teal-700 text-white' :
                  activeTab === 'ADJUST' ? 'bg-amber-600 hover:bg-amber-700 text-white' :
                  'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10'
                }`}
                id="btn-commit-tx"
              >
                บันทึกอนุมัติลงบัญชีสต๊อก ({activeTab})
              </button>
            </div>

          </div>

        </div>

      </form>

      {/* SIGNATURE MODAL CANVAS */}
      {isSignOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Signature className="h-4 w-4 text-blue-500" /> ผูกลายเซ็นอนุมัติอิเล็กทรอนิกส์ (Digital Pad)
              </h3>
              <button 
                onClick={() => setIsSignOpen(false)}
                className="p-1 px-1.5 bg-slate-50 rounded-md hover:bg-slate-100 text-slate-405 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-3xs text-slate-500 leading-relaxed">
              กวาดนิ้วมือถือ หรือ แดรกเมาส์ เพื่อป้อนลายเซ็นยืนยันรับความรับผิดชอบวัสดุตามวงเงินสัญญางาน BOQ
            </p>

            {/* Signature Area drawing pad */}
            <div className="border border-slate-200 rounded-xl bg-slate-55 flex flex-col justify-between overflow-hidden">
              <canvas 
                ref={canvasRef}
                width={340}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full bg-slate-50 border-b border-slate-100 cursor-crosshair touch-none"
              />
              <div className="flex justify-between items-center p-2.5 bg-white text-3xs text-slate-400">
                <span>ปากกาสีน้ำเงินสว่าง</span>
                <button 
                  type="button" 
                  onClick={clearCanvas}
                  className="font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  ล้างสีปากกา
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs font-semibold">
              <button 
                type="button" 
                onClick={() => setIsSignOpen(false)}
                className="py-1.5 px-3 border border-slate-200 rounded-lg text-slate-500 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button 
                type="button" 
                onClick={saveSignature}
                className="py-1.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
              >
                บันทึกลายเซ็นอนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
