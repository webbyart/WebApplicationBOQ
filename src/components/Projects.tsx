/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project, BOQ, BOQItem, InventoryItem, UserRole } from '../types';
import { 
  Building2, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  FileCheck, 
  DollarSign, 
  AlertTriangle, 
  User, 
  PieChart, 
  FileSpreadsheet, 
  CheckCircle,
  TrendingDown,
  X,
  PackageCheck
} from 'lucide-react';

interface ProjectsProps {
  projects: Project[];
  boqs: BOQ[];
  items: InventoryItem[];
  currentUserRole: UserRole;
  onAddProject: (project: Project) => void;
  onAddBOQ: (boq: BOQ) => void;
  onImportBOQItems: (boqId: string, boqItems: BOQItem[]) => void;
  canViewCost: boolean;
}

export default function Projects({
  projects,
  boqs,
  items,
  currentUserRole,
  onAddProject,
  onAddBOQ,
  onImportBOQItems,
  canViewCost
}: ProjectsProps) {
  
  const [expandedProjectID, setExpandedProjectID] = useState<string | null>('PRJ101');
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isAddBoqOpen, setIsAddBoqOpen] = useState(false);
  const [selectedProjectIdForBoq, setSelectedProjectIdForBoq] = useState('');
  
  // Create Project form state
  const [projCode, setProjCode] = useState('');
  const [projName, setProjName] = useState('');
  const [projCustomer, setProjCustomer] = useState('');
  const [projBudget, setProjBudget] = useState(5000000);
  const [projStart, setProjStart] = useState('2026-06-01');
  const [projEnd, setProjEnd] = useState('2027-06-01');
  const [projSupervisor, setProjSupervisor] = useState('วิศวกรสมเกียรติ ยอดฝีมือ');

  // Create BOQ form state
  const [boqCode, setBoqCode] = useState('');
  const [boqName, setBoqName] = useState('');
  const [boqCategory, setBoqCategory] = useState<'Structural' | 'Sanitary' | 'Electrical' | 'Finishing'>('Structural');

  // Excel / CSV BOQ items import state
  const [isBoqImportOpen, setIsBoqImportOpen] = useState(false);
  const [targetBoqIdForImport, setTargetBoqIdForImport] = useState('');
  const [boqCsvText, setBoqCsvText] = useState('');

  // Project budget calculations
  const getProjectBOQBudget = (projId: string) => {
    const projectBoqs = boqs.filter(b => b.projectId === projId);
    return projectBoqs.reduce((sum, boq) => {
      return sum + boq.items.reduce((bSum, item) => bSum + (item.quantityLimit * item.standardPrice), 0);
    }, 0);
  };

  const getProjectActualSpent = (projId: string) => {
    // Look up the project's linked BOQs
    const projectBoqs = boqs.filter(b => b.projectId === projId);
    return projectBoqs.reduce((sum, boq) => {
      return sum + boq.items.reduce((bSum, item) => bSum + (item.usedQuantity * item.standardPrice), 0);
    }, 0);
  };

  // Safe checks for permissions to modify
  const canModify = currentUserRole === 'Super Admin' || currentUserRole === 'Admin' || currentUserRole === 'Project Manager';

  // Submit project
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const newProj: Project = {
      id: `PRJ${Math.floor(105 + Math.random() * 800)}`,
      code: projCode || `PRJ-2026-${Math.floor(10 + Math.random() * 90)}`,
      name: projName,
      customer: projCustomer,
      startDate: projStart,
      endDate: projEnd,
      budget: Number(projBudget),
      status: 'Active',
      supervisor: projSupervisor
    };
    onAddProject(newProj);
    setIsAddProjectOpen(false);
    setProjCode('');
    setProjName('');
    setProjCustomer('');
    setExpandedProjectID(newProj.id);
  };

  // Submit BOQ template
  const handleCreateBOQ = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectIdForBoq) return;

    // Build the template with mock items based on the material catalog corresponding to category
    // This pre-adds some stock items into this BOQ so the user doesn't have to map everything manually
    const matchedItems = items.filter(item => {
      if (boqCategory === 'Structural') return item.category.includes('โครงสร้าง');
      if (boqCategory === 'Electrical') return item.category.includes('ไฟฟ้า');
      if (boqCategory === 'Sanitary') return item.category.includes('สุขาภิบาล');
      if (boqCategory === 'Finishing') return item.category.includes('ตกแต่ง');
      return false;
    });

    const standardItems: BOQItem[] = matchedItems.map((item, index) => ({
      id: `BQI-${Math.floor(150 + Math.random() * 800)}-${index}`,
      itemSku: item.sku,
      itemName: item.name,
      quantityLimit: 100, // Standard limit
      standardPrice: item.standardPrice,
      usedQuantity: 0
    }));

    const newBoq: BOQ = {
      id: `BOQ-${Math.floor(100 + Math.random() * 900)}`,
      projectId: selectedProjectIdForBoq,
      code: boqCode || `BOQ-${Math.floor(100 + Math.random() * 900)}-GEN`,
      name: boqName,
      category: boqCategory,
      items: standardItems
    };

    onAddBOQ(newBoq);
    setIsAddBoqOpen(false);
    setBoqCode('');
    setBoqName('');
  };

  // Map and parse the Excel-import BOQ list
  const handleImportBOQSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBoqIdForImport || !boqCsvText.trim()) return;

    try {
      const lines = boqCsvText.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length < 2) throw new Error('กรุณาวางเนื้อหาตามเทมเพลตอย่างน้อย 1 แถว');

      const importedItems: BOQItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length >= 2) {
          const sku = cols[0];
          const qty = Number(cols[1]) || 50;
          const standardP = Number(cols[2]) || 100;

          // Find product name if exits in inventory
          const invItem = items.find(item => item.sku === sku);
          const name = invItem ? invItem.name : `วัสดุนำเข้าพาร์ทเนอร์ (${sku})`;
          const finalPrice = invItem ? invItem.standardPrice : standardP;

          importedItems.push({
            id: `BQI-IMP-${Math.floor(1000 + Math.random()*9000)}-${i}`,
            itemSku: sku,
            itemName: name,
            quantityLimit: qty,
            standardPrice: finalPrice,
            usedQuantity: 0
          });
        }
      }

      if (importedItems.length > 0) {
        onImportBOQItems(targetBoqIdForImport, importedItems);
        alert(`✔ นำเข้าสำเร็จ ${importedItems.length} รายการวัสดุเข้าสัญญางาน BOQ แล้ว!`);
        setIsBoqImportOpen(false);
        setBoqCsvText('');
      } else {
        throw new Error('ไม่พบรายการที่เข้าเงื่อนไข');
      }

    } catch (err: any) {
      alert('❌ โครงสร้าง CSV ไม่ถูกต้อง: ' + err.message);
    }
  };

  return (
    <div className="space-y-6" id="projects-module-root">
      {/* Upper header action panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">ผูกโครงการและโควตาควบคุมงบประมาณ (Project BOQ Controller)</h2>
          <p className="text-3xs text-slate-500">
            ตั้งงบประมาณ แผนงวด และผูกกลุ่มรายการวัสดุป้องกันการเบิกจ่ายเกินวงเงิน (BOQ Target Controls)
          </p>
        </div>

        {canModify && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setIsAddProjectOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>สร้างโครงการใหม่</span>
            </button>
          </div>
        )}
      </div>

      {/* Projects List cards layout */}
      <div className="space-y-4" id="projects-accordions">
        {projects.map(proj => {
          const isExpanded = expandedProjectID === proj.id;
          const matchedBoqs = boqs.filter(b => b.projectId === proj.id);
          const totalBudgetLimit = getProjectBOQBudget(proj.id);
          const totalSpent = getProjectActualSpent(proj.id);
          const spendPercent = totalBudgetLimit > 0 ? (totalSpent / totalBudgetLimit) * 100 : 0;
          const isOverrun = totalSpent > totalBudgetLimit;

          return (
            <div 
              key={proj.id} 
              className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${
                isExpanded ? 'border-blue-200 ring-2 ring-blue-500/5 shadow-md' : 'border-slate-100 shadow-3xs'
              }`}
            >
              {/* Accordion trigger row */}
              <div 
                onClick={() => setExpandedProjectID(isExpanded ? null : proj.id)}
                className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 select-none"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`mt-0.5 h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    proj.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-3xs font-semibold font-mono text-slate-400 uppercase">{proj.code}</span>
                      <span className={`inline-flex items-center px-1.5 py-0.2 rounded-sm text-4xs font-bold ${
                        proj.status === 'Active' ? 'bg-indigo-50 text-indigo-700' :
                        proj.status === 'Planning' ? 'bg-slate-100 text-slate-650' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {proj.status === 'Active' ? 'กำลังดำเนินการ' :
                         proj.status === 'Planning' ? 'แผนเสนอราคา' : 'ส่งมอบงานแล้ว'}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 truncate mt-0.5">{proj.name}</h3>
                    <p className="text-3xs text-slate-400 mt-0.5">ลูกค้าผู้พัฒนา: <span className="font-semibold text-slate-600">{proj.customer}</span></p>
                  </div>
                </div>

                {/* Performance stats summary */}
                <div className="flex flex-wrap items-center gap-6 text-2xs">
                  {canViewCost && (
                    <div className="space-y-0.5 min-w-[120px]">
                      <span className="text-4xs text-slate-400 block font-sans">งบประมาณเบิกจ่ายสะสม (Actual)</span>
                      <div className="flex items-baseline gap-1">
                        <span className={`font-mono font-bold font-semibold text-xs ${isOverrun ? 'text-red-500' : 'text-slate-800'}`}>
                          ฿{totalSpent.toLocaleString()}
                        </span>
                        <span className="text-3xs text-slate-400">/ ฿{totalBudgetLimit.toLocaleString()}</span>
                      </div>
                      <div className="w-24 bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${isOverrun ? 'bg-red-500' : 'bg-blue-500'}`} 
                          style={{ width: `${Math.min(spendPercent, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-0.5">
                    <span className="text-4xs text-slate-400 block">ผู้รับผิดชอบหน้างาน</span>
                    <span className="font-semibold text-slate-700 text-3xs flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      {proj.supervisor}
                    </span>
                  </div>

                  <div className="space-y-0.5 hidden md:block">
                    <span className="text-4xs text-slate-400 block">ระยะเวลาสัญญา</span>
                    <span className="text-slate-600 text-3xs font-medium font-mono">
                      {proj.startDate} ~ {proj.endDate}
                    </span>
                  </div>

                  <div className="text-slate-400 hover:text-slate-700 p-1 bg-slate-50 rounded-lg">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </div>

              {/* Expandable sub-module (linked BOQs and materials breakdown) */}
              {isExpanded && (
                <div className="bg-slate-50/50 border-t border-slate-100 p-5 space-y-6">
                  {/* Operations bar under expanded panel */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                      <PieChart className="h-4 w-4 text-blue-600" />
                      <span>รายการจำลองโครงสร้าง BOQ ({matchedBoqs.length} หมวดงานจำแนก)</span>
                    </div>

                    {canModify && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button 
                          onClick={() => {
                            setSelectedProjectIdForBoq(proj.id);
                            setIsAddBoqOpen(true);
                          }}
                          className="px-2.5 py-1.5 hover:bg-slate-100 border border-slate-200 text-slate-700 bg-white rounded-lg text-3xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" /> เพิ่มกลุ่มหมวด BOQ
                        </button>
                      </div>
                    )}
                  </div>

                  {/* BOQ Loop */}
                  {matchedBoqs.length === 0 ? (
                    <div className="py-10 text-center bg-white border border-slate-100 rounded-xl space-y-3">
                      <FileCheck className="h-8 w-8 text-slate-350 mx-auto" />
                      <div>
                        <p className="text-xs font-semibold text-slate-700">ยังไม่มีงบประมาณ BOQ ผูกกับโครงการนี้</p>
                        <p className="text-3xs text-slate-400">กรุณาคลิก "เพิ่มกลุ่มหมวด BOQ" เพื่อปักฐานหมวดงานโครงสร้าง งานไฟฟ้า หรือนำเข้าผ่าน Excel</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {matchedBoqs.map(boq => {
                        // Calculations
                        const boqLimitVal = boq.items.reduce((sum, i) => sum + (i.quantityLimit * i.standardPrice), 0);
                        const boqSpentVal = boq.items.reduce((sum, i) => sum + (i.usedQuantity * i.standardPrice), 0);
                        const boqlPct = boqLimitVal > 0 ? (boqSpentVal / boqLimitVal) * 100 : 0;
                        const isOverBoqLimit = boqSpentVal > boqLimitVal;

                        return (
                          <div key={boq.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden" id={`boq-panel-${boq.id}`}>
                            {/* BOQ category header */}
                            <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs font-bold">
                              <div className="flex items-center gap-2">
                                <span className="bg-blue-600 text-white rounded-xs p-1 font-mono text-3xs leading-none">
                                  {boq.code}
                                </span>
                                <h4 className="text-slate-800 font-bold">{boq.name}</h4>
                              </div>

                              <div className="flex flex-wrap items-center gap-4 text-2xs">
                                {canViewCost && (
                                  <div className="flex items-baseline gap-1 font-mono text-slate-500">
                                    <span>ใช้จริง:</span>
                                    <span className={`font-semibold ${isOverBoqLimit ? 'text-red-500 font-bold' : 'text-slate-700'}`}>
                                      ฿{boqSpentVal.toLocaleString()}
                                    </span>
                                    <span>/ วงเงินโควตา: ฿{boqLimitVal.toLocaleString()} ({boqlPct.toFixed(1)}%)</span>
                                  </div>
                                )}

                                {canModify && (
                                  <button 
                                    onClick={() => {
                                      setTargetBoqIdForImport(boq.id);
                                      setIsBoqImportOpen(true);
                                    }}
                                    className="px-2.5 py-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-100 text-4xs font-bold transition-all inline-flex items-center gap-0.5"
                                  >
                                    <FileSpreadsheet className="h-3 w-3" /> นำเข้า Excel/CSV รายการ
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Linked BOQ items list */}
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs text-slate-700">
                                <thead>
                                  <tr className="bg-slate-50/30 border-b border-slate-100 text-3xs uppercase text-slate-400">
                                    <th className="py-2.5 px-4 font-semibold">SKU สินค้า</th>
                                    <th className="py-2.5 px-4 font-semibold">รายการวัสดุวิศวกรรม</th>
                                    <th className="py-2.5 px-4 text-right font-semibold">โควตาจำกัด (BOQ)</th>
                                    <th className="py-2.5 px-4 text-right font-semibold">ใช้จริง (Actual)</th>
                                    <th className="py-2.5 px-4 text-right font-semibold">สิทธิ์คงเหลือเบิก</th>
                                    <th className="py-2.5 px-4 text-right font-semibold">ราคากลางประเมิน</th>
                                    <th className="py-2.5 px-4 text-right font-semibold">มูลค่ารวมในโควตา</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {boq.items.length === 0 ? (
                                    <tr>
                                      <td colSpan={7} className="py-8 text-center text-slate-400 text-3xs italic">
                                        ยังไม่มีไอเทมวัสดุในโควตาสัญญางานนี้ กรุณาอัพโหลด CSV หรือคลิกเพิ่มสินค้า
                                      </td>
                                    </tr>
                                  ) : (
                                    boq.items.map(item => {
                                      const leftQty = Math.max(item.quantityLimit - item.usedQuantity, 0);
                                      const isExceeded = item.usedQuantity > item.quantityLimit;
                                      const inventoryUnit = items.find(i => i.sku === item.itemSku)?.unit || 'หน่วย';

                                      return (
                                        <tr key={item.id} className={`hover:bg-slate-50/30 font-medium ${isExceeded ? 'bg-red-50/30' : ''}`}>
                                          <td className="py-3 px-4 font-mono text-3xs uppercase font-bold text-slate-400">
                                            {item.itemSku}
                                          </td>
                                          <td className="py-3 px-4">
                                            <div className="font-semibold text-slate-800">{item.itemName}</div>
                                          </td>
                                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-600">
                                            {item.quantityLimit.toLocaleString()} <span className="text-4xs text-slate-405 font-sans font-normal">{inventoryUnit}</span>
                                          </td>
                                          <td className="py-3 px-4 text-right font-mono font-bold">
                                            <span className={`${isExceeded ? 'text-rose-600' : 'text-slate-800'}`}>
                                              {item.usedQuantity.toLocaleString()}
                                            </span>
                                            <span className="text-4xs text-slate-400 font-sans font-normal"> {inventoryUnit}</span>
                                          </td>
                                          <td className="py-3 px-4 text-right font-semibold">
                                            {isExceeded ? (
                                              <span className="text-3xs text-rose-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded-sm inline-block">
                                                🚨 เกิน {Math.abs(item.quantityLimit - item.usedQuantity)} {inventoryUnit}
                                              </span>
                                            ) : (
                                              <span className="text-3xs text-slate-650 bg-slate-100 px-1.5 py-0.5 rounded-sm inline-block font-mono font-bold">
                                                {leftQty.toLocaleString()} {inventoryUnit}
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-3 px-4 text-right font-mono text-slate-500">
                                            ฿{item.standardPrice.toLocaleString()}
                                          </td>
                                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                                            ฿{(item.quantityLimit * item.standardPrice).toLocaleString()}
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL 1: Create New Project */}
      {isAddProjectOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">🏗️ จัดตั้งบันทึกโครงการพัฒนาใหม่</h3>
              <button 
                onClick={() => setIsAddProjectOpen(false)}
                className="p-1 px-1.5 bg-slate-50 rounded-md hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Code */}
                <div>
                  <label className="text-3xs font-bold text-slate-500 uppercase block mb-1">รหัสโครงการควบคุม <span className="text-red-500">*</span></label>
                  <input 
                    type="text"
                    required
                    placeholder="เช่น PRJ-2026-05"
                    value={projCode}
                    onChange={(e) => setProjCode(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden text-slate-800 font-mono"
                  />
                </div>

                {/* Supervisor */}
                <div>
                  <label className="text-3xs font-bold text-slate-500 uppercase block mb-1">วิศวกรผู้ควบคุมโครงการ (Supervisor)</label>
                  <input 
                    type="text"
                    placeholder="สุรชัย วงศ์ดี"
                    value={projSupervisor}
                    onChange={(e) => setProjSupervisor(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden text-slate-800"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-3xs font-bold text-slate-500 uppercase block mb-1">ชื่อโครงการก่อสร้างหลัก <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  required
                  placeholder="เช่น โครงการคอนโด ไฮส์วิว รัชดา"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Customer */}
                <div>
                  <label className="text-3xs font-bold text-slate-500 uppercase block mb-1">ลูกค้า / เจ้าของโครงการ</label>
                  <input 
                    type="text"
                    placeholder="บจก. แสนดี ดีเวลลอปเม้นท์"
                    value={projCustomer}
                    onChange={(e) => setProjCustomer(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden text-slate-800"
                  />
                </div>

                {/* Estimate Limit */}
                <div>
                  <label className="text-3xs font-bold text-slate-500 uppercase block mb-1">ประมาณการงบก่อสร้างหลัก (บาท)</label>
                  <input 
                    type="number"
                    min="1"
                    required
                    value={projBudget}
                    onChange={(e) => setProjBudget(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Date start */}
                <div>
                  <label className="text-3xs font-bold text-slate-500 uppercase block mb-1">วันที่เริ่มสัญญา</label>
                  <input 
                    type="date"
                    value={projStart}
                    onChange={(e) => setProjStart(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden font-mono text-slate-800"
                  />
                </div>

                {/* Date end */}
                <div>
                  <label className="text-3xs font-bold text-slate-500 uppercase block mb-1">วันที่ส่งมอบสิ้นสุดกระบวนการ</label>
                  <input 
                    type="date"
                    value={projEnd}
                    onChange={(e) => setProjEnd(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsAddProjectOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  เปิดโครงการจริง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create New BOQ Group */}
      {isAddBoqOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">📂 เพิ่มกลุ่มหมวดสัญญางาน BOQ</h3>
              <button 
                onClick={() => setIsAddBoqOpen(false)}
                className="p-1 px-1.5 bg-slate-50 rounded-md hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBOQ} className="space-y-4 text-xs">
              {/* Target Project ID (disabled selection since it's targeted) */}
              <div>
                <label className="text-3xs font-bold text-slate-500 block mb-1">โครงการเป้าหมาย</label>
                <input 
                  type="text" 
                  disabled
                  value={projects.find(p => p.id === selectedProjectIdForBoq)?.name || ''}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-slate-655" 
                />
              </div>

              {/* Code */}
              <div>
                <label className="text-3xs font-bold text-slate-500 block mb-1">รหัสแฟ้ม BOQ ของหมวดงาน <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  required
                  placeholder="เช่น BOQ-104-ELE"
                  value={boqCode}
                  onChange={(e) => setBoqCode(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-3xs font-bold text-slate-500 block mb-1">หมวดวิศวกรรมสัญญางาน</label>
                <select
                  value={boqCategory}
                  onChange={(e) => setBoqCategory(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 p-2 rounded-lg cursor-pointer focus:outline-hidden"
                >
                  <option value="Structural">งานวิศวกรรมโครงสร้าง (Structural Work)</option>
                  <option value="Electrical">งานสว่างระบบไฟฟ้า (Electrical Work)</option>
                  <option value="Sanitary">งานสระน้ำดินประปา (Sanitary Work)</option>
                  <option value="Finishing">งานปูกระเบื้องตกแต่งสถาปัตย์ (Finishing Work)</option>
                </select>
              </div>

              {/* Display Name */}
              <div>
                <label className="text-3xs font-bold text-slate-500 block mb-1">ชื่อรายการจัดแสดง <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  required
                  placeholder="เช่น งานประปาเฟสโครงสร้างย่อย C"
                  value={boqName}
                  onChange={(e) => setBoqName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-150 text-[11px] text-blue-700 leading-relaxed">
                📢 ระบบจะทำการลิงก์จัดสรรกลุ่มวัสดุในคลังที่เป็นหมวดหมู่เดียวกันเข้ามาใน BOQ ใหม่นี้เป็นค่าตั้งต้นให้อัตโนมัติ!
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsAddBoqOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-550 rounded-lg font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  สร้าง Template BOQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Excel BOQ Import Items mapper */}
      {isBoqImportOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> นำเข้ารายการโควตาวัสดุเข้าสัญญางาน BOQ
              </h3>
              <button 
                onClick={() => setIsBoqImportOpen(false)}
                className="p-1 px-1.5 bg-slate-50 rounded-md hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-3xs text-slate-500">
              <p>กรุณาวางเนื้อหาแถวข้อมูล CSV แยกตามจุลภาค (รหัสสินค้า SKU และจำนวนจำกัดลิมิตสิทธิ์ในโควตาสัญญา):</p>
              <div className="bg-slate-50 p-2.5 rounded-lg font-mono text-[10px] break-all border border-slate-250 select-all overflow-x-auto">
                {"รหัสวัสดุ(SKU),สิทธิ์เบิกสูงสุด(Limit),ราคากลางประเมิน(Option)\n"}
                {"CON-001,800,160\n"}
                {"CON-002,1500,125"}
              </div>
              <p className="text-amber-700">⚠️ มั่นใจว่ารหัสสินค้าแมตช์เข้าสต๊อกในบัญชีเพื่อดึงชื่อเรียกของผลิตภัณฑ์ใช้งานจริง</p>
            </div>

            <form onSubmit={handleImportBOQSubmit} className="space-y-4">
              <textarea 
                rows={5}
                required
                placeholder="วางแถวข้อมูลรายการสินค้า และ Limit โควตาเบิก"
                value={boqCsvText}
                onChange={(e) => setBoqCsvText(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-2xs font-mono text-slate-700 focus:outline-hidden"
              />

              <div className="flex justify-end gap-2 pt-2.5 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsBoqImportOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg font-semibold cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
                <button 
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold cursor-pointer"
                >
                  นำโควตาเข้าโครงการ BOQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
