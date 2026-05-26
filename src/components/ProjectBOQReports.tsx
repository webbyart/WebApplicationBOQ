/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Project, BOQ, BOQItem, InventoryItem, Transaction, UserRole, LineNotification } from '../types';
import { 
  Building2, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  ArrowUpRight, 
  DollarSign, 
  PieChart, 
  Activity, 
  Layers, 
  ArrowLeftRight, 
  ChevronRight, 
  ChevronDown,
  Search, 
  FileSpreadsheet, 
  Download, 
  Printer, 
  BarChart, 
  MessageSquare, 
  Mail, 
  RefreshCw, 
  Calendar, 
  Eye, 
  FileCheck, 
  QrCode, 
  User,
  ShieldCheck,
  CheckCircle,
  Clock
} from 'lucide-react';

interface ProjectBOQReportsProps {
  projects: Project[];
  boqs: BOQ[];
  items: InventoryItem[];
  transactions: Transaction[];
  currentUserRole: UserRole;
  currentUserName: string;
  onNavigate: (tab: string) => void;
  canViewCost?: boolean;
}

export default function ProjectBOQReports({
  projects,
  boqs,
  items,
  transactions,
  currentUserRole,
  currentUserName,
  onNavigate,
  canViewCost = true
}: ProjectBOQReportsProps) {
  // Filters & Settings States
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [valuationMethod, setValuationMethod] = useState<'AVERAGE' | 'FIFO' | 'LAST'>('AVERAGE');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [alertDismissed, setAlertDismissed] = useState<Record<string, boolean>>({});

  // Navigation Drill-Down States
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>('PRJ101');
  const [expandedBoqId, setExpandedBoqId] = useState<string | null>('BOQ-01');
  const [selectedMaterialSku, setSelectedMaterialSku] = useState<string | null>(null);

  // Simulated Alert Outputs (Line & Email Toast)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'warning' | 'info'; text: string } | null>(null);

  // Simple Notification banner list
  const [systemAlerts, setSystemAlerts] = useState<Array<{ id: string; type: 'warning' | 'danger'; message: string; code: string }>>([]);

  // Auto Dismiss Toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Pricing engine calculations: Average, FIFO, Last Cost per SKU
  const calculateUnitCost = (sku: string, method: 'AVERAGE' | 'FIFO' | 'LAST'): number => {
    const item = items.find(i => i.sku === sku);
    if (!item) return 0;

    const receives = transactions.filter(
      t => t.itemSku === sku && t.type === 'RECEIVE' && t.status === 'APPROVED'
    );

    switch (method) {
      case 'LAST':
        // Last receipt cost seen in Transactions, fallback to item cost
        if (receives.length > 0) {
          // Sort chronologically and take newest
          const sorted = [...receives].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          return sorted[0].costPrice;
        }
        return item.costPrice;

      case 'AVERAGE':
        // Weighted Average: (Initial Qty * Initial Cost + Receives sum) / (Initial Qty + Receives Qty)
        // Assume historical safety stock baseline of 50 units for the standard average formula
        if (receives.length === 0) return item.costPrice;
        const initialStockQty = 50;
        const initialVal = initialStockQty * item.costPrice;
        const receivesVal = receives.reduce((sum, r) => sum + r.quantity * r.costPrice, 0);
        const receivesQty = receives.reduce((sum, r) => sum + r.quantity, 0);
        return Math.round((initialVal + receivesVal) / (initialStockQty + receivesQty));

      case 'FIFO':
        // FIFO implementation simulation - queues older stock first
        if (receives.length === 0) return item.costPrice;
        // Collect all receives sorted chronologically (oldest first)
        const sortedReceives = [...receives].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        // For the current valuation display, the cost is driven by the oldest available receipt batch
        return sortedReceives[0]?.costPrice || item.costPrice;

      default:
        return item.costPrice;
    }
  };

  // Helper properties calculators for Projects
  const getProjectStats = (projId: string) => {
    const project = projects.find(p => p.id === projId);
    if (!project) return { budget: 0, actualSpent: 0, remaining: 0, percentSpent: 0, boqc: 0, itemsCount: 0, txCount: 0, status: 'Normal' };

    const projectBoqs = boqs.filter(b => b.projectId === projId);
    let totalProjectBOQBudget = 0;
    let actualSpent = 0;

    projectBoqs.forEach(boq => {
      boq.items.forEach(bi => {
        const unitCost = calculateUnitCost(bi.itemSku, valuationMethod);
        totalProjectBOQBudget += bi.quantityLimit * unitCost;
        // Total actual spent based on issued quantities
        actualSpent += bi.usedQuantity * unitCost;
      });
    });

    const remaining = Math.max(totalProjectBOQBudget - actualSpent, 0);
    const percentSpent = totalProjectBOQBudget > 0 ? (actualSpent / totalProjectBOQBudget) * 100 : 0;

    // Items and transactions count under project code
    const pCode = project.code;
    const projectTxs = transactions.filter(t => t.projectCode === pCode && t.status === 'APPROVED');

    let status: 'Normal' | 'Warning' | 'Danger' = 'Normal';
    if (percentSpent > 100) status = 'Danger';
    else if (percentSpent >= 80) status = 'Warning';

    return {
      budget: totalProjectBOQBudget || project.budget * 0.15, // Fallback if BOQs empty, map to assigned budget portion
      actualSpent,
      remaining: Math.max((totalProjectBOQBudget || project.budget * 0.15) - actualSpent, 0),
      percentSpent: Math.min(percentSpent || (actualSpent / (project.budget * 0.15)) * 100, 150),
      boqc: projectBoqs.length,
      itemsCount: projectBoqs.reduce((s, b) => s + b.items.length, 0),
      txCount: projectTxs.length,
      status
    };
  };

  // Project aggregate totals across all projects or chosen one
  const getAggregatedCostContext = () => {
    let rawBudget = 0;
    let rawSpent = 0;
    let totalBoqs = 0;
    let totalItems = 0;
    let totalTxs = 0;

    if (selectedProjectId === 'ALL') {
      projects.forEach(p => {
        const stat = getProjectStats(p.id);
        rawBudget += stat.budget;
        rawSpent += stat.actualSpent;
        totalBoqs += stat.boqc;
        totalItems += stat.itemsCount;
        totalTxs += stat.txCount;
      });
    } else {
      const stat = getProjectStats(selectedProjectId);
      rawBudget = stat.budget;
      rawSpent = stat.actualSpent;
      totalBoqs = stat.boqc;
      totalItems = stat.itemsCount;
      totalTxs = stat.txCount;
    }

    const rawRemaining = Math.max(rawBudget - rawSpent, 0);
    const percent = rawBudget > 0 ? (rawSpent / rawBudget) * 100 : 0;

    return {
      totalBudget: rawBudget,
      totalSpent: rawSpent,
      totalRemaining: rawRemaining,
      percentSpent: percent,
      totalBoqs,
      totalItems,
      totalTxs
    };
  };

  const currentStats = getAggregatedCostContext();

  // Load and evaluate warnings
  useEffect(() => {
    const alertsList: Array<{ id: string; type: 'warning' | 'danger'; message: string; code: string }> = [];

    projects.forEach(proj => {
      const stats = getProjectStats(proj.id);
      if (stats.percentSpent >= 100) {
        alertsList.push({
          id: `alert-budget-over-${proj.id}`,
          type: 'danger',
          message: `❌ โครงการ: [${proj.code}] ${proj.name} ใช้เงินคลังและวัสดุเกินงบควบคุม BOQ ทะลุเกณฑ์ไปแล้ว (${stats.percentSpent.toFixed(1)}%)`,
          code: proj.code
        });
      } else if (stats.percentSpent >= 80) {
        alertsList.push({
          id: `alert-budget-warn-${proj.id}`,
          type: 'warning',
          message: `⚠️ โครงการ: [${proj.code}] ${proj.name} ใช้พัสดุก่อสร้างใกล้หมดเหลือไม่ถึง 20% ของงบโควตา (${stats.percentSpent.toFixed(1)}%)`,
          code: proj.code
        });
      }
    });

    // Check material overs
    boqs.forEach(boq => {
      const proj = projects.find(p => p.id === boq.projectId);
      boq.items.forEach(bi => {
        const item = items.find(i => i.sku === bi.itemSku);
        if (bi.usedQuantity > bi.quantityLimit) {
          alertsList.push({
            id: `alert-item-over-${boq.id}-${bi.itemSku}`,
            type: 'danger',
            message: `🚨 สินค้าวัสดุ [${bi.itemSku}] ${bi.itemName} ใน ${boq.name} ถูกเบิกเกินโควตากรอบสัญญา BOQ ไปแล้ว ${bi.usedQuantity - bi.quantityLimit} ${item?.unit || 'หน่วย'}!`,
            code: proj?.code || 'GEN'
          });
        }
      });
    });

    // Check low stock uniquely per global item
    items.forEach(item => {
      if (item.stockLeft <= item.minStock) {
        alertsList.push({
          id: `alert-item-low-${item.sku}`,
          type: 'warning',
          message: `⚠️ ระดับตุนปลอดภัยแจ้งเตือน: สินค้า [${item.sku}] ${item.name} คลังหลักคงเหลือต่ำกว่าเกณฑ์ความปลอดภัย (${item.stockLeft} / ${item.minStock} ${item.unit})`,
          code: 'SYSTEM'
        });
      }
    });

    setSystemAlerts(alertsList);
  }, [projects, boqs, items, transactions, valuationMethod]);

  // Simulator Triggers
  const handleSimulateLineAlert = (message: string) => {
    // Add toast confirmation
    setToastMessage({
      type: 'success',
      text: '📲 ส่งสัณญาณจำลอง LINE OA สำเร็จ: ระบบได้แจ้งเตือนความคืบหน้างบประมาณเข้าสู่กลุ่มทีมวิศวกรโครงข่ายแล้ว!'
    });
  };

  const handleSimulateEmail = (subject: string, body: string) => {
    setToastMessage({
      type: 'info',
      text: `📨 จำลองการส่งรายงานทาง Email เป็นทางการสำเร็จ ไปยังผู้เกี่ยวข้อง: ${currentUserName}`
    });
  };

  // Export Data arrays Generator
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'รหัสโครงการ,ชื่อโครงการ,งบควบคุม (BOQ),ยอดเบิกจริง,ยอดคงเหลือ,% การใช้\n';

    projects.forEach(p => {
      const s = getProjectStats(p.id);
      csvContent += `"${p.code}","${p.name}",${s.budget},${s.actualSpent},${s.remaining},"${s.percentSpent.toFixed(1)}%"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Project_BOQ_Cost_Report_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMessage({
      type: 'success',
      text: '📥 บันทึกไฟล์ CSV ลงเครื่องคอมพิวเตอร์ของคุณสำเร็จแล้ว!'
    });
  };

  // Render variables for Charts
  const filteredProjectsForCharts = selectedProjectId === 'ALL' 
    ? projects 
    : projects.filter(p => p.id === selectedProjectId);

  // Material usage top consumed items
  const getTopConsumedMaterials = () => {
    const consumptionMap: Record<string, { sku: string; name: string; qty: number; unit: string; totalCost: number }> = {};
    
    // Scan standard transaction issues
    transactions
      .filter(t => t.type === 'ISSUE' && t.status === 'APPROVED')
      .forEach(tx => {
        const unitCost = calculateUnitCost(tx.itemSku, valuationMethod);
        if (consumptionMap[tx.itemSku]) {
          consumptionMap[tx.itemSku].qty += tx.quantity;
          consumptionMap[tx.itemSku].totalCost += tx.quantity * unitCost;
        } else {
          consumptionMap[tx.itemSku] = {
            sku: tx.itemSku,
            name: tx.itemName,
            qty: tx.quantity,
            unit: tx.unit,
            totalCost: tx.quantity * unitCost
          };
        }
      });

    // Match empty ones in catalog so we have full bar
    items.forEach(itm => {
      if (!consumptionMap[itm.sku]) {
        consumptionMap[itm.sku] = {
          sku: itm.sku,
          name: itm.name,
          qty: 0,
          unit: itm.unit,
          totalCost: 0
        };
      }
    });

    return Object.values(consumptionMap)
      .sort((a,b) => b.qty - a.qty)
      .slice(0, 6);
  };

  const topMaterials = getTopConsumedMaterials();

  // Monthly summary aggregation (Jan to Dec 2026 based on transaction dates and seed benchmarks)
  const getMonthlyBudgetValue = () => {
    const months = [
      { num: '01', name: 'มกราคม', budget: 500000, spent: 430000 },
      { num: '02', name: 'กุมภาพันธ์', budget: 500000, spent: 410000 },
      { num: '03', name: 'มีนาคม', budget: 750000, spent: 630000 },
      { num: '04', name: 'เมษายน', budget: 400000, spent: 390000 },
      { num: '05', name: 'พฤษภาคม', budget: 1200000, spent: 1050000 },
      { num: '06', name: 'มิถุนายน', budget: 850000, spent: 0 },
    ];

    // Read real transactions from index to update May 2026 actualspent dynamically
    const currentMonthTxs = transactions.filter(t => t.status === 'APPROVED');
    let mayTotal = 150 * 110 + 3 * 950 + 15 * 155; // default precalculated base
    
    // Add any live issue total spent
    currentMonthTxs.forEach(t => {
      if (t.type === 'ISSUE') {
        const cost = t.quantity * calculateUnitCost(t.itemSku, valuationMethod);
        mayTotal += cost;
      } else if (t.type === 'RETURN') {
        const refundCost = t.quantity * calculateUnitCost(t.itemSku, valuationMethod);
        mayTotal -= refundCost;
      }
    });

    const updatedMonths = months.map(m => {
      if (m.num === '05') {
        return { ...m, spent: Math.round(mayTotal) };
      }
      return m;
    });

    return updatedMonths;
  };

  const monthlyReport = getMonthlyBudgetValue();

  // Trigger print reports
  const handlePrintCommand = () => {
    window.print();
  };

  return (
    <div className="space-y-6 flex-grow font-sans text-slate-800" id="project-boq-reports-root">
      
      {/* Toast Alert Simulator */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-55 flex items-center gap-3 bg-slate-900 border border-slate-700 text-white rounded-xl shadow-2xl p-4 animate-bounce max-w-sm">
          <div className={`p-1.5 rounded-lg ${toastMessage.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}>
            <ShieldCheck className="h-4 w-4" />
          </div>
          <p className="text-3xs font-semibold">{toastMessage.text}</p>
        </div>
      )}

      {/* Header Widget */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 text-white rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row items-stretch justify-between gap-6 shadow-md transition-all">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2.5 py-1 rounded-full text-3xs font-bold leading-none uppercase">
            <Layers className="h-3.5 w-3.5" />
            <span>Project Cost Controller Engine</span>
          </div>
          <h2 className="text-base font-bold tracking-tight text-slate-100 font-sans">
            ระบบติดตามต้นทุนสัญญาร่วม & ควบคุมงบ BOQ แยกโครงการ (Real-time Report Desk)
          </h2>
          <p className="text-3xs text-slate-400 font-sans leading-relaxed">
            ผูกตารางวัสดุกับงานจัดแบ่งงวด วินิจฉัยต้นทุนจริงต่อหน่วยผ่านแบบจำลองราคาสามรูปแบบ ตรวจจับปริมาณเบิกเกินกรอบ และวิเคราะห์พฤติกรรมพัสดุรั่วไหลแบบก้าวหน้า
          </p>
        </div>
        <div className="flex flex-row md:flex-col items-end gap-2 justify-between md:justify-center bg-slate-800/40 p-4 border border-slate-700/30 rounded-xl shrink-0 min-w-[200px]">
          <div className="text-left md:text-right font-sans">
            <span className="text-4xs text-slate-400 block font-bold tracking-wide uppercase">ระดับสิทธิ์ปัจจุบัน</span>
            <span className="text-blue-400 text-xs font-black font-sans">{currentUserRole}</span>
          </div>
          <div className="text-right font-mono text-3xs text-slate-300 bg-slate-900/60 p-1.5 rounded border border-slate-800">
            {new Date().toISOString().substring(0, 10)} คลังควบคุม 
          </div>
        </div>
      </div>

      {/* Advanced Global Filters Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-3xs transition-colors">
        
        {/* Project Selector filter */}
        <div className="space-y-1.5">
          <label className="text-3xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">เลือกโครงการติดตาม</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-9 pr-3 text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">📂 แสดงรวมทุกโครงการโครงข่าย</option>
              {projects.map(proj => (
                <option key={proj.id} value={proj.id}>
                  🏗️ [{proj.code}] {proj.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Valuation Strategies selection */}
        <div className="space-y-1.5">
          <label className="text-3xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">โมเดลประเมินต้นทุนสินค้า (Valuation)</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-green-500" />
            <select
              value={valuationMethod}
              onChange={(e) => {
                setValuationMethod(e.target.value as any);
                addAuditLog(`ปรับกลยุทธ์คิดต้นทุนจริงต่อหน่วยในรายงานเป็นระบบ: ${e.target.value}`);
              }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-9 pr-3 text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer focus:ring-2 focus:ring-blue-500"
            >
              <option value="AVERAGE">📈 Weighted Average (ราคาเฉลี่ยรวมล็อต)</option>
              <option value="FIFO">⏳ FIFO Method (เข้าก่อน-ออกก่อนสินค้าแรก)</option>
              <option value="LAST">🔋 Last Purchase Cost (ต้นทุนซื้อล็อตหลังสุด)</option>
            </select>
          </div>
        </div>

        {/* Global Catalog search input */}
        <div className="space-y-1.5">
          <label className="text-3xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">ค้นหาวัสดุหรือ BOQ รหัสสินค้า</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ระบุชื่อย่อวัสดุ / ตู้คลัง / SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-9 pr-3 text-xs font-medium text-slate-850 dark:text-slate-105 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Instant Export Command Hub */}
        <div className="space-y-1.5">
          <label className="text-3xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">กองการส่งออกเอกสารราชการ</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportCSV}
              className="py-2.2 text-3xs font-bold inline-flex items-center justify-center gap-1.5 bg-green-50/70 border border-green-200 text-green-700 hover:bg-green-100 rounded-lg transition-all cursor-pointer shadow-3xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
              <span>ดึงยอด CSV</span>
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="py-2.2 text-3xs font-bold inline-flex items-center justify-center gap-1.5 bg-blue-50/70 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg transition-all cursor-pointer shadow-3xs"
            >
              <Printer className="h-3.5 w-3.5 text-blue-600" />
              <span>พิมพ์ใบสเปก</span>
            </button>
          </div>
        </div>

      </div>

      {/* Warning Center - Displays alert list if threshold triggered */}
      {systemAlerts.some(a => !alertDismissed[a.id]) && (
        <div className="bg-orange-50/70 dark:bg-slate-900 border border-orange-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-3xs font-black text-orange-800 dark:text-orange-400 uppercase tracking-widest flex items-center gap-1.5">
              <AlertTriangle className="h-4.5 w-4.5 text-orange-500" />
              <span>แผงควบคุมระบบแจ้งเตือนและระวังภัยคลังวิศวกรรม ({systemAlerts.filter(a => !alertDismissed[a.id]).length})</span>
            </h4>
            <span className="text-[10px] text-slate-450 italic">สอดคล้องนโยบายงบจำกัดสัญญางวด 2569</span>
          </div>
          
          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
            {systemAlerts.map(alert => {
              if (alertDismissed[alert.id]) return null;
              return (
                <div 
                  key={alert.id}
                  className={`flex items-start justify-between gap-3 text-3xs p-2 rounded-lg border leading-relaxed ${
                    alert.type === 'danger' 
                      ? 'bg-red-500/5 border-red-200/50 text-red-700 dark:text-red-400' 
                      : 'bg-yellow-500/5 border-yellow-200/55 text-yellow-800 dark:text-yellow-400'
                  }`}
                >
                  <span className="font-semibold">{alert.message}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSimulateLineAlert(alert.message)}
                      className="px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all text-4xs font-bold inline-flex items-center gap-0.5"
                      title="ยิงจำลอง LINE Alerts ไปสถาปนิกและผู้ตานี้"
                    >
                      <MessageSquare className="h-2.5 w-2.5 text-[#06C755]" />
                      <span>ยิง LINE</span>
                    </button>
                    <button
                      onClick={() => handleSimulateEmail(`[คลังด่วน] แจ้งเตือนงบประมาณควบคุมโครงการ ${alert.code}`, alert.message)}
                      className="px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all text-4xs font-bold inline-flex items-center gap-0.5"
                    >
                      <Mail className="h-2.5 w-2.5 text-blue-500" />
                      <span>ส่งเมล</span>
                    </button>
                    <button 
                      onClick={() => setAlertDismissed(prev => ({ ...prev, [alert.id]: true }))}
                      className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-450 text-4xs font-bold uppercase"
                    >
                      ซ่อน
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Cards section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-reports-panel">
        
        {/* KPI 1 Budget */}
        <div className="bg-white dark:bg-slate-900 border border-slate-250/70 p-5 rounded-2xl shadow-3xs relative overflow-hidden transition-all hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-450 tracking-wider uppercase">งบควบคุมจัดตั้ง BOQ</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3.5 space-y-1">
            <div className="text-base lg:text-lg font-black font-sans tracking-tight text-slate-900 dark:text-slate-100">
              {currentStats.totalBudget.toLocaleString()} <span className="text-xs">บาท</span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              ผูกยอดตาม {selectedProjectId === 'ALL' ? 'ทุกโครงการข่วง' : 'โครงการระบุรายละเอียด'}
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-550" />
        </div>

        {/* KPI 2 Actual Spent */}
        <div className="bg-white dark:bg-slate-900 border border-slate-250/70 p-5 rounded-2xl shadow-3xs relative overflow-hidden transition-all hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-450 tracking-wider uppercase">ดึงใช้พัสดุจริง (Actual)</span>
            <div className="p-1.5 rounded-lg bg-green-50 text-green-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3.5 space-y-1">
            <div className="text-base lg:text-lg font-black font-sans tracking-tight text-slate-900 dark:text-slate-100">
              {currentStats.totalSpent.toLocaleString()} <span className="text-xs">บาท</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
              <span className={`px-1.5 py-0.2 rounded-full font-bold font-mono text-[9px] ${
                currentStats.percentSpent > 100 ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'
              }`}>
                {currentStats.percentSpent.toFixed(1)}%
              </span>
              <span>ของกองงวดแฝง</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500" />
        </div>

        {/* KPI 3 Balanced Limit */}
        <div className="bg-white dark:bg-slate-900 border border-slate-250/70 p-5 rounded-2xl shadow-3xs relative overflow-hidden transition-all hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-450 tracking-wider uppercase">งบคงพัสดุนอกกรง (Remaining)</span>
            <div className="p-1.5 rounded-lg bg-orange-50 text-orange-700">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3.5 space-y-1">
            <div className="text-base lg:text-lg font-black font-sans tracking-tight text-slate-900 dark:text-slate-100">
              {currentStats.totalRemaining.toLocaleString()} <span className="text-xs">บาท</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1 mt-1">
              <div 
                className={`h-1 rounded-full ${currentStats.percentSpent >= 80 ? 'bg-orange-500' : 'bg-blue-600'}`}
                style={{ width: `${Math.max(100 - currentStats.percentSpent, 0)}%` }}
              />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500" />
        </div>

        {/* KPI 4 Documents Stats */}
        <div className="bg-white dark:bg-slate-900 border border-slate-250/70 p-5 rounded-2xl shadow-3xs relative overflow-hidden transition-all hover:shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-450 tracking-wider uppercase">แฟ้มหลักฐานเบิกคลัง</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3.5 space-y-1">
            <div className="text-base lg:text-lg font-black font-sans tracking-tight text-slate-900 dark:text-slate-100">
              {currentStats.totalTxs} <span className="text-xs">เอกสาร</span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              ประกอบด้วย {currentStats.totalBoqs} แผนหลัก และ {currentStats.totalItems} รายการวัสดุ
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-500" />
        </div>

      </div>

      {/* Interactive Charts Hub (Budget Usage + Consumption + Trend) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-charts-deck">
        
        {/* Chart 1: Budget Usage Side-by-side Visual Columns */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-205 dark:border-slate-800 shadow-3xs space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold leading-none text-slate-805 dark:text-slate-105">สเปกงบเปรียบเทียบตามงวดสัญญา (Budget Usage)</h3>
              <p className="text-[10px] text-slate-450">งบ BOQ เปรียบเทียบกับพัสดุหยิบใช้จริง</p>
            </div>
            <span className="p-1 bg-slate-50 rounded-md text-slate-400 text-3xs font-bold leading-none">บาท</span>
          </div>

          <div className="space-y-3.5 h-[240px] flex flex-col justify-end pt-4">
            {filteredProjectsForCharts.map(proj => {
              const stats = getProjectStats(proj.id);
              return (
                <div key={proj.id} className="space-y-1.5 text-3xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="truncate max-w-[170px]" title={proj.name}>{proj.name}</span>
                    <span className="font-mono text-slate-450">{stats.percentSpent.toFixed(0)}%</span>
                  </div>
                  <div className="relative h-5 bg-slate-100 dark:bg-slate-950 rounded-md overflow-hidden flex">
                    {/* Budget background line / spent line */}
                    <div 
                      className={`h-full flex items-center pl-2 text-white font-mono font-black text-[9px] transition-all duration-500 shrink-0 ${
                        stats.percentSpent > 100 
                          ? 'bg-red-500' 
                          : stats.percentSpent >= 80 
                          ? 'bg-orange-500' 
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.min(stats.percentSpent, 100)}%` }}
                    >
                      {stats.actualSpent >= 200000 ? `${(stats.actualSpent/1000).toFixed(0)}k` : ''}
                    </div>
                    {/* Buffer empty area */}
                    <div className="flex-1 h-full flex items-center justify-end pr-2 text-slate-500 font-mono text-[9px]">
                      {stats.budget >= 200000 ? `${(stats.budget/1000).toFixed(0)}k BOQ` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between text-[10px] font-bold text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-blue-600 block" />
              <span>เบิกใช้งานจริง</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-slate-205 dark:bg-slate-800 block border border-slate-300" />
              <span>โควตางบเดี่ยว BOQ</span>
            </div>
          </div>
        </div>

        {/* Chart 2: Top Material Consumption Meter */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-205 dark:border-slate-800 shadow-3xs space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold leading-none text-slate-805 dark:text-slate-105">วัสดุก่อสร้างที่เบิกมากที่สุด (Materials)</h3>
              <p className="text-[10px] text-slate-450">เรียงตามปริมาณหน่วยเบิกตัดค้างออกคลัง</p>
            </div>
            <span className="p-1 bg-slate-50 rounded-md text-slate-400 text-3xs font-bold leading-none">Qty</span>
          </div>

          <div className="space-y-3 pt-3 h-[240px] overflow-y-auto pr-1">
            {topMaterials.map((mat, idx) => {
              const maxVal = Math.max(...topMaterials.map(m => m.qty), 1);
              const barWidth = (mat.qty / maxVal) * 100;
              return (
                <div key={mat.sku} className="space-y-1 text-3xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold truncate max-w-[190px]" title={mat.name}>
                      {idx + 1}. {mat.name}
                    </span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {mat.qty} {mat.unit}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-350"
                      style={{ width: `${Math.max(barWidth, 6)}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono text-right">
                    มูลค่าสุทธิคิดจริง: {mat.totalCost.toLocaleString()} บาท
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 3: Monthly Progress Expense Chart / Budget Trendline */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-205 dark:border-slate-800 shadow-3xs space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold leading-none text-slate-805 dark:text-slate-105">กระแสงวดจ่ายสะสมรายเดือน (Financial Trend)</h3>
              <p className="text-[10px] text-slate-450 font-sans">เทียบงบรวมรายเดือนกับรายงานเบิกจริง</p>
            </div>
            <span className="text-[10px] text-blue-600 font-black font-sans">2026/2569</span>
          </div>

          <div className="space-y-2 h-[240px] flex flex-col justify-between pt-2">
            <div className="flex items-end justify-between h-[180px] border-b border-slate-200 dark:border-slate-800 pb-2 relative">
              
              {/* Plot bars */}
              {monthlyReport.map((m, idx) => {
                const maxVal = 1300000;
                const budgetHeight = (m.budget / maxVal) * 100;
                const spentHeight = (m.spent / maxVal) * 100;
                return (
                  <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end group cursor-pointer relative px-0.5">
                    
                    {/* Popover Tooltip */}
                    <div className="absolute bottom-full mb-1 bg-slate-900 text-white text-[9px] rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none border border-slate-700">
                      <div>งบ: {m.budget.toLocaleString()}</div>
                      <div>เบิก: {m.spent.toLocaleString()}</div>
                      <div>ต่าง: {(m.budget - m.spent).toLocaleString()}</div>
                    </div>

                    <div className="flex items-end gap-1 h-full w-full justify-center">
                      {/* Budget reference bar */}
                      <div 
                        className="w-2 md:w-3 bg-slate-200 dark:bg-slate-800 rounded-t-sm hover:opacity-80 transition-all"
                        style={{ height: `${budgetHeight}%` }}
                      />
                      {/* Real spent bar overlay */}
                      <div 
                        className={`w-2.5 md:w-3.5 bg-indigo-500 rounded-t-sm hover:opacity-85 transition-all ${
                          m.spent > m.budget ? 'bg-rose-500' : 'bg-indigo-500'
                        }`}
                        style={{ height: `${spentHeight}%` }}
                      />
                    </div>
                    
                    {/* Month code label */}
                    <span className="text-[9px] font-mono mt-1 text-slate-400">{m.name.substring(0, 3)}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded bg-slate-200 dark:bg-slate-800 block" /> วงเงินสำแดง (BOQ)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded bg-indigo-500 block" /> จ่ายจริง (Actual)
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Deep-dive Interactive Drill-down Node Manager Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl shadow-3xs overflow-hidden transition-colors">
        
        {/* Panel Banner */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-4.5 w-4.5 text-blue-600" />
              <span>ตารางแจกแจงโครงสร้าง Drill down (Project ➔ BOQ ➔ Materials catalog)</span>
            </h3>
            <p className="text-[10px] text-slate-400">
              กดแตะเลือกแถบโครงการเพื่อขยาย BOQ ภายใน จากนั้นกดเปิดดูสถิติและประวัติสไลด์อย่างละเอียดรายวิศวกรรม
            </p>
          </div>
          <span className="text-3xs text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-slate-900 px-3 py-1 border border-emerald-100 rounded-full font-bold">
            🟢 ระบบประมวลยอดแบบสด Real-Time
          </span>
        </div>

        {/* List of Projects (Level 1) */}
        <div className="p-4 space-y-4">
          {projects.map(proj => {
            const isExpanded = expandedProjectId === proj.id;
            const stats = getProjectStats(proj.id);
            const projectBoqList = boqs.filter(b => b.projectId === proj.id);

            return (
              <div 
                key={proj.id}
                className={`border rounded-xl transition-all ${
                  isExpanded 
                    ? 'border-blue-200 dark:border-slate-705 bg-slate-50/20 dark:bg-slate-900/10 shadow-3xs' 
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {/* Project Bar Header */}
                <div 
                  onClick={() => setExpandedProjectId(isExpanded ? null : proj.id)}
                  className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 text-slate-600 bg-slate-100 rounded-lg shrink-0 flex items-center justify-center font-bold">
                      🏗️
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-slate-200 text-slate-800 text-[10px] font-bold px-2 py-0.2 rounded-md font-mono">
                          {proj.code}
                        </span>
                        <h4 className="text-xs font-bold text-slate-877 dark:text-slate-100">{proj.name}</h4>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        ผู้ควบคุมงาน: {proj.supervisor} • วันส่งส่งมอบงาน: {proj.endDate}
                      </p>
                    </div>
                  </div>

                  {/* Pricing Progress mini report details */}
                  <div className="flex flex-row md:flex-col items-end gap-3 md:gap-0 font-sans">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-normal">ยอดรวมเบิกใช้จริง / ขอบ BOQ</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100 font-mono">
                        {stats.actualSpent.toLocaleString()} / {stats.budget.toLocaleString()} บาท
                      </span>
                    </div>
                    
                    {/* Progress Ring / Bar */}
                    <div className="flex items-center gap-2 mt-1 w-full max-w-[200px]">
                      <div className="bg-slate-200 dark:bg-slate-800 w-24 h-1.5 rounded-full overflow-hidden block">
                        <div 
                          className={`h-1.5 rounded-full ${
                            stats.percentSpent > 100 
                              ? 'bg-rose-500' 
                              : stats.percentSpent >= 80 
                              ? 'bg-orange-500' 
                              : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(stats.percentSpent, 100)}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-black font-mono ${
                        stats.percentSpent > 100 ? 'text-red-600' : 'text-slate-600 dark:text-slate-300'
                      }`}>
                        {stats.percentSpent.toFixed(0)}%
                      </span>
                    </div>

                  </div>
                </div>

                {/* BOQs under Project (Level 2) */}
                {isExpanded && (
                  <div className="border-t border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-4 space-y-4 font-sans">
                    {projectBoqList.length === 0 ? (
                      <div className="text-center py-4 bg-white dark:bg-slate-900 border text-slate-400 rounded-lg text-3xs italic">
                        ❌ ยังไม่มีเอกสารงวดงาน (BOQ Templates) ถูกนำรข้าผูกในโครงการนี้
                      </div>
                    ) : (
                      projectBoqList.map(boq => {
                        const isBoqExpanded = expandedBoqId === boq.id;
                        
                        // Calculate cost metrics of this specific BOQ
                        let boqBudget = 0;
                        let boqSpent = 0;
                        boq.items.forEach(bi => {
                          const unitCost = calculateUnitCost(bi.itemSku, valuationMethod);
                          boqBudget += bi.quantityLimit * unitCost;
                          boqSpent += bi.usedQuantity * unitCost;
                        });

                        const boqPercent = boqBudget > 0 ? (boqSpent / boqBudget) * 100 : 0;
                        const boqRemaining = Math.max(boqBudget - boqSpent, 0);

                        return (
                          <div 
                            key={boq.id}
                            className="bg-white dark:bg-slate-900 rounded-lg border border-slate-201 dark:border-slate-800 overflow-hidden shadow-4xs"
                          >
                            {/* BOQ Header Action Bar */}
                            <div 
                              onClick={() => setExpandedBoqId(isBoqExpanded ? null : boq.id)}
                              className="px-4 py-3 bg-slate-100/50 dark:bg-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="bg-blue-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.2 rounded">
                                  {boq.code}
                                </span>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{boq.name}</span>
                                <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 rounded-full font-medium">
                                  หมวดสินค้า: {boq.category}
                                </span>
                              </div>

                              <div className="flex items-center gap-4 text-3xs font-semibold">
                                <span className="text-slate-500">
                                  เบิกใช้จริง: <strong className="text-slate-800 dark:text-white font-mono">{boqSpent.toLocaleString()} / {boqBudget.toLocaleString()} บาท</strong>
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                  boqPercent > 100 
                                    ? 'bg-rose-50 text-rose-700' 
                                    : boqPercent >= 80 
                                    ? 'bg-amber-50 text-amber-700' 
                                    : 'bg-green-50 text-green-700'
                                }`}>
                                  {boqPercent > 100 ? 'เกิน BOQ 🚨' : boqPercent >= 80 ? 'ใช้ไปกว่า 80% ⚠️' : 'ปกติ 🟢'} ({boqPercent.toFixed(0)}%)
                                </span>
                                {isBoqExpanded ? <ChevronDown className="h-4.5 w-4.5 text-slate-400 shrink-0" /> : <ChevronRight className="h-4.5 w-4.5 text-slate-400 shrink-0" />}
                              </div>
                            </div>

                            {/* Materials in BOQ Table (Level 3) */}
                            {isBoqExpanded && (
                              <div className="border-t border-slate-100 dark:border-slate-800 overflow-x-auto text-3xs font-sans">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-950 font-black tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                      <th className="p-3">รหัสและรายละเอียดพัสดุก่อสร้าง</th>
                                      <th className="p-3 text-right">โควตา BOQ (ม้วน/เส้น/ถุง)</th>
                                      <th className="p-3 text-right">จำนวนเบิกจริง</th>
                                      <th className="p-3 text-right">โควตายืดหยุ่นคงเหลือ</th>
                                      <th className="p-3 text-right">ทุนต่อหน่วยจริง ({valuationMethod})</th>
                                      <th className="p-3 text-right">ยอดรวมจัดสรร BOQ</th>
                                      <th className="p-3 text-right">ตัวเงินดึงใช้จริง</th>
                                      <th className="p-3">สถานะรายการเบิกจำแนก</th>
                                      <th className="p-3 text-center">สืบค้นประวัติ</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                                    {boq.items
                                      .filter(bi => bi.itemName.toLowerCase().includes(searchQuery.toLowerCase()) || bi.itemSku.toLowerCase().includes(searchQuery.toLowerCase()))
                                      .map(bi => {
                                        const unitCost = calculateUnitCost(bi.itemSku, valuationMethod);
                                        const boqTotalCost = bi.quantityLimit * unitCost;
                                        const actualTotalCost = bi.usedQuantity * unitCost;
                                        const remainingQty = bi.quantityLimit - bi.usedQuantity;
                                        const isOverLimit = bi.usedQuantity > bi.quantityLimit;
                                        const isFullyConsumed = bi.usedQuantity === bi.quantityLimit;

                                        return (
                                          <tr 
                                            key={bi.id}
                                            className={`hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors ${
                                              selectedMaterialSku === bi.itemSku ? 'bg-blue-50/40 dark:bg-slate-800/20' : ''
                                            }`}
                                          >
                                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                                              <span className="block font-mono text-[10px] text-blue-600 dark:text-blue-400">
                                                {bi.itemSku}
                                              </span>
                                              <span>{bi.itemName}</span>
                                            </td>
                                            <td className="p-3 text-right font-mono font-bold text-slate-500">
                                              {bi.quantityLimit.toLocaleString()}
                                            </td>
                                            <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                                              {bi.usedQuantity.toLocaleString()}
                                            </td>
                                            <td className={`p-3 text-right font-mono font-bold ${
                                              remainingQty < 0 ? 'text-red-600' : 'text-emerald-600'
                                            }`}>
                                              {remainingQty.toLocaleString()}
                                            </td>
                                            <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-350">
                                              {unitCost.toLocaleString()} บาท
                                            </td>
                                            <td className="p-3 text-right font-mono text-slate-500">
                                              {boqTotalCost.toLocaleString()} บาท
                                            </td>
                                            <td className="p-3 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                                              {actualTotalCost.toLocaleString()} บาท
                                            </td>
                                            <td className="p-3 font-sans font-bold">
                                              {isOverLimit ? (
                                                <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[10px] px-2 py-0.2 rounded-full border border-red-200">
                                                  เกิน BOQ 🚨
                                                </span>
                                              ) : isFullyConsumed ? (
                                                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[10px] px-2 py-0.2 rounded-full border border-blue-200">
                                                  เบิกครบสมบูรณ์ ✔
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-[10px] px-2 py-0.2 rounded-full border border-green-200">
                                                  ปกติ 🟢
                                                </span>
                                              )}
                                            </td>
                                            <td className="p-3 text-center">
                                              <button
                                                onClick={() => {
                                                  setSelectedMaterialSku(selectedMaterialSku === bi.itemSku ? null : bi.itemSku);
                                                  addAuditLog(`เลือกกดเรียกดูประวัติความเคลื่อนไหวพัสดุรายย่อย: SKU ${bi.itemSku}`);
                                                }}
                                                className="p-1 px-2.5 rounded bg-slate-150 hover:bg-slate-205 border hover:text-slate-900 text-slate-600 font-bold transition-all inline-flex items-center gap-1"
                                                title="คลิกดูประวัติธุรกรรมเอกสารใบเบิกคู่วัสดุ"
                                              >
                                                <Eye className="h-3.5 w-3.5" />
                                                <span>{selectedMaterialSku === bi.itemSku ? 'ปิดแฟ้ม' : 'เปิดดูผล'}</span>
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Sub level (Level 4): Chronological Material History */}
                            {isBoqExpanded && selectedMaterialSku && (
                              <div className="bg-slate-500/5 dark:bg-slate-950/40 p-4 border-t border-slate-100 dark:border-slate-800">
                                <h5 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                  <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" />
                                  <span>แฟ้มใบคำเบิกจ่ายพัสดุย่อย (Audit transaction trail) สำหรับรหัส: {selectedMaterialSku}</span>
                                </h5>

                                <div className="space-y-2 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                                  {transactions
                                    .filter(t => t.itemSku === selectedMaterialSku && t.projectCode === proj.code && t.status === 'APPROVED')
                                    .map(tx => {
                                      return (
                                        <div 
                                          key={tx.id}
                                          className="p-3.5 rounded-xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-4xs text-3xs font-sans leading-relaxed relative overflow-hidden"
                                        >
                                          {/* Banner bar decoration */}
                                          <div className={`absolute top-0 right-0 left-0 h-1 ${tx.type === 'ISSUE' ? 'bg-indigo-500' : 'bg-green-500'}`} />

                                          <div className="flex items-center justify-between font-bold mb-2 pt-1">
                                            <span className="bg-slate-100 text-slate-800 text-[9px] px-1.5 py-0.2 rounded font-mono">
                                              เลขที่เอกสาร: {tx.id}
                                            </span>
                                            <span className="text-slate-400 font-sans font-normal">
                                              {new Date(tx.date).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                          </div>

                                          <p className="font-semibold text-slate-800 dark:text-slate-250">
                                            กระทำธุรกรรม: {tx.type === 'ISSUE' ? '📤 เบิกจ่ายไปโครงการ' : '📥 รับคืนพัสดุเข้าโครงการ'} เป็นพัสดุ 
                                            [<strong>{tx.itemSku}</strong>] {tx.itemName} จำนวน <strong>{tx.quantity} {tx.unit}</strong> ด้วยราคาต่อหน่วย <strong>{tx.costPrice} บาท/ชิ้น</strong>
                                          </p>

                                          <div className="mt-3.5 border-t border-slate-100 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                            <div className="space-y-0.5 text-slate-400 leading-none">
                                              <div>ลงวิศวกรรมสิทธิโดย: {tx.operator}</div>
                                              {tx.requester && <div>ผู้ร่วมใบขอเบิก: {tx.requester}</div>}
                                              {tx.approver && <div className="text-blue-600 font-semibold">อนุมัติเป็นกรณีพิเศษ: {tx.approver}</div>}
                                            </div>

                                            {/* Signature visual validation */}
                                            {tx.signature ? (
                                              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 px-2.5 border border-slate-200 dark:border-slate-800 rounded">
                                                <span className="text-[8px] font-black tracking-wide text-green-700 uppercase">ลายเซ็นได้รับการยืนยัน</span>
                                                <img 
                                                  src={tx.signature}
                                                  alt="Signature trace verification digital" 
                                                  className="h-6 w-14 object-contain filter dark:invert"
                                                  referrerPolicy="no-referrer"
                                                />
                                              </div>
                                            ) : (
                                              <span className="text-[9px] italic text-slate-400">พวงสัญญาระบบคลาวด์อัตโนมัติ</span>
                                            )}
                                          </div>

                                          {tx.approverNote && (
                                            <p className="mt-2 text-[9px] text-orange-600 bg-orange-50/50 p-1 px-2 rounded border border-orange-100">
                                              📝 บันทึกวิศวกร: {tx.approverNote}
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  
                                  {transactions.filter(t => t.itemSku === selectedMaterialSku && t.projectCode === proj.code && t.status === 'APPROVED').length === 0 && (
                                    <div className="col-span-2 text-center py-6 text-slate-400 italic">
                                      ❌ ไม่พบธุรกรรมเบิกรับสินค้าของอุปกรณ์ {selectedMaterialSku} ภายใต้โครงการนี้ในประวัติ
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                          </div>
                        );
                      })
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>

      {/* AI Smart Cost Analysis and Trend Forecasting Engine */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-905 bg-[#0f172a] text-white p-6 rounded-2xl border border-indigo-950" id="ai-smart-budget-analysis">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-5 pb-4 border-b border-indigo-900/50">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 bg-indigo-500/20 text-indigo-300 border border-indigo-400/20 px-2.5 py-1 rounded-full text-4xs font-bold leading-none uppercase">
              🧠 Smart Analytic Copilot Helper
            </span>
            <h3 className="text-xs font-bold font-sans text-slate-100">วิเคราะห์อัจฉริยะสเปกงบประมาณและแนวโน้มสูญเสีย (Cognitive Analytics Grid)</h3>
            <p className="text-3xs text-indigo-200">
              วิเคราะห์คัดกรองข้อมูลธุรกรรมจริง คั่นประวัติแบบเฉียบพลัน เพื่อจับหาพฤติกรรมยอดบานปลายและพยากรณ์ความเสี่ยงต้นทุนบานปลาย
            </p>
          </div>
          <RefreshCw className="h-10 w-10 text-indigo-400 shrink-0 opacity-80 animate-pulse" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-3xs font-sans">
          
          {/* Card 1: Over Budget Frequency */}
          <div className="bg-slate-900/40 p-4 border border-indigo-950/50 rounded-xl space-y-2.5">
            <h4 className="font-bold text-indigo-305 flex items-center gap-1">
              <span>⚠️ บัญชีตรวจสอบ BOQ บานปลายบ่อย</span>
            </h4>
            <p className="text-slate-350 leading-relaxed text-3xs">
              ระบบสุ่มประมวลพบว่า <strong className="text-white font-mono text-xs">BOQ-101-ELE</strong> (วิศวกรรมไฟฟ้า) มียอดยืดหยุ่นในกรอบต่ำสุด และมีความเสี่ยงพัสดุสายไฟรั่วไหลสูงสุด
            </p>
            <span className="text-[9px] block text-orange-400 italic font-mono">ระดับลานความเสี่ยง: สูงสุด (High Danger)</span>
          </div>

          {/* Card 2: Stock Speed Alert */}
          <div className="bg-slate-900/40 p-4 border border-indigo-950/50 rounded-xl space-y-2.5">
            <h4 className="font-bold text-indigo-305 flex items-center gap-1">
              <span>⚡ สินค้าที่มีความถี่การขอเบิกผิดปกติ</span>
            </h4>
            <p className="text-slate-350 leading-relaxed text-3xs">
              สินค้า <strong className="text-white font-mono text-xs">ELE-001 (สายไฟ VAF)</strong> มีอัตราเบิกจำเพาะสะสม 82 ม้วน จากเป้า 80 ม้วน ซึ่งสถาปนิกคำนวณพบอัตราเสี่ยงขอบเบลท์หน้างานพังทลาย
            </p>
            <span className="text-[9px] block text-teal-400 italic font-mono">แนะนำ: พิจารณาสั่งทำความสะอาดบอร์ดวงจร</span>
          </div>

          {/* Card 3: Inflation project drivers */}
          <div className="bg-slate-900/40 p-4 border border-indigo-950/50 rounded-xl space-y-2.5">
            <h4 className="font-bold text-indigo-305 flex items-center gap-1">
              <span>💰 ปัจจัยขับเคลื่อนราคาผันแปรจริง</span>
            </h4>
            <p className="text-slate-350 leading-relaxed text-3xs">
              ภายใต้แนวคิด <strong className="text-white font-mono text-xs">{valuationMethod}</strong> การสลับคลังไปไซต์ภูเก็ตสร้างสมดุลราคาได้คงที่ ทุนเฉลี่ยเหล็กเส้นกลมพุ่งแรงกว่าราคาทะเล 4.5%
            </p>
            <span className="text-[9px] block text-purple-300 italic font-mono">แนวโน้มราคาตลาด: ปล่อยลอยตัวสูงขึ้น 3%</span>
          </div>

          {/* Card 4: Runout forecasting projections */}
          <div className="bg-slate-900/40 p-4 border border-indigo-950/50 rounded-xl space-y-2.5">
            <h4 className="font-bold text-indigo-305 flex items-center gap-1">
              <span>🔮 เวลาคาดการณ์งบส่วนกลางหมด</span>
            </h4>
            <p className="text-slate-350 leading-relaxed text-3xs">
              จากการเผาเกล็ดงวดงานเฉลี่ยรายเดือน 1.05 ล้านบาท งบประมาณรวมจะยังคงอำนวยความสะดวกปลอดภัยให้การก่อสร้างดำเนินการต่อไปได้อีก <strong className="text-white font-mono text-xs">182 วัน</strong>
            </p>
            <span className="text-[9px] block text-green-300 italic font-mono">สถานะการณ์โดยรวม: มีปริมาณปลอดภัยสูง</span>
          </div>

        </div>
      </div>

      {/* Corporate Audit Logs addition */}
      <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-201 dark:border-slate-800 rounded-xl text-3xs font-mono text-slate-450 dark:text-slate-500 leading-relaxed flex items-center gap-2">
        <Layers className="h-4 w-4 text-blue-500 shrink-0" />
        <span>ระบบจำลองคิดราคาสินค้าอิงสูตร {valuationMethod} บนข้อมูลที่ดึง Real-time จากฟลักซ์ความเคลื่อนไหวภายในตาราง local storage ประมวลผลลอยตัวอย่างสมบูรณ์</span>
      </div>

      {/* FULL PRINT ACTION MODAL / OFFICIAL PDF EXPORT SUITE */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Controls */}
            <div className="bg-slate-100 hover:bg-slate-100 p-4 flex justify-between items-center border-b border-slate-200">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                <FileText className="h-4.5 w-4.5 text-blue-600" />
                <span>ตัวอย่างใบส่งออกเอกสารตรวจสอบและคุมงบ BOQ สัญญาร่วมสากล (Official Report Preview)</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintCommand}
                  className="px-3.5 py-1.8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-3xs font-bold inline-flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>สั่งพิมพ์ / โหลด PDF</span>
                </button>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-3 py-1.8 bg-slate-200 hover:bg-slate-305 text-slate-700 hover:text-slate-900 rounded-lg text-3xs font-medium cursor-pointer"
                >
                  ปิดหน้านี้
                </button>
              </div>
            </div>

            {/* Print canvas Area */}
            <div className="p-8 overflow-y-auto space-y-6 flex-1 print-area bg-white text-slate-900" id="official-print-desk">
              
              {/* Report Header Logo & Details */}
              <div className="flex justify-between items-start gap-5 border-b-2 border-slate-900 pb-5">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg bg-slate-900 text-white px-2.5 py-1.2 font-sans font-black tracking-tighter text-center shadow-md">
                      CargoBOQ
                    </span>
                    <span className="text-base font-black uppercase tracking-widest text-slate-900">
                      Enterprise Suite
                    </span>
                  </div>
                  <p className="text-4xs text-slate-500 font-sans leading-relaxed">
                    บจก. คาร์โก้บีโอคิว เอ็นเตอร์ไพรส์ (ประเทศไทย) • 456 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110 <br/>
                    โทร: +66 (0) 2-123-4567 • Email: support@cargoboq.co.th
                  </p>
                </div>
                
                <div className="text-right space-y-1 text-3xs">
                  <h4 className="text-xs font-black text-rose-700 tracking-tight uppercase">ใบบันทึกลายเซ็นอนุมัติเปรียบเทียบ</h4>
                  <div>รหัสรายงาน: <strong className="font-mono">RPT-2569-05-26</strong></div>
                  <div>ออกระบบ ณ วันที่: <strong>{new Date().toLocaleDateString('th-TH')}</strong></div>
                  <div>แผงประเมิน: <strong>{valuationMethod} Method</strong></div>
                </div>
              </div>

              {/* Company Logo and barcode verifier */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg text-3xs font-sans">
                <div className="space-y-1">
                  <span className="font-black text-slate-500 block">ข้อมูลผู้ออกเอกสารและเจ้าพนักงาน:</span>
                  <div>ผู้ดำเนินการ: <strong>{currentUserName}</strong></div>
                  <div>ฐานะของเจ้าหน้าที่: <strong>{currentUserRole} / คณะกรรมการบัญชียอดงบกลาง</strong></div>
                  <div>ขอบโครงการวิเคราะห์: <strong>{selectedProjectId === 'ALL' ? 'ทุกโครงการวิศวกรรมร่วม' : projects.find(p => p.id === selectedProjectId)?.name}</strong></div>
                </div>
                <div className="flex justify-end items-center gap-3">
                  <div className="text-right">
                    <span className="text-slate-450 block text-4xs font-bold">แอปพลิเคชันระบบตรวจจับคลาวด์</span>
                    <span className="text-blue-600 font-black">ผ่านการตรวจประเมินระบบแล้ว</span>
                  </div>
                  <div className="p-1 bg-white border border-slate-300 rounded shrink-0" title="QR Code ยืนยันพิกัดสัญญางาน">
                    <QrCode className="h-11 w-11 text-slate-900" />
                  </div>
                </div>
              </div>

              {/* Summary table */}
              <div className="space-y-2">
                <h4 className="text-3xs font-black uppercase tracking-wider text-slate-800">ตารางวิเคราะห์งบแยกรายโครงการ (Project Budget Overview)</h4>
                <table className="w-full text-left border-collapse text-3xs text-slate-905">
                  <thead>
                    <tr className="bg-slate-100 font-black border-b border-slate-400">
                      <th className="p-2">รหัสโครงการ</th>
                      <th className="p-2">ชื่อโครงการวิศวกรรม</th>
                      <th className="p-2 text-right">งบประมาณสถาปนา BOQ (บาท)</th>
                      <th className="p-2 text-right">ดึงจริงหักยอด (บาท)</th>
                      <th className="p-2 text-right text-orange-700">งบคงเหลือ (บาท)</th>
                      <th className="p-2 text-right">% การใช้งบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {projects
                      .filter(p => selectedProjectId === 'ALL' || p.id === selectedProjectId)
                      .map(p => {
                        const s = getProjectStats(p.id);
                        return (
                          <tr key={p.id}>
                            <td className="p-2 font-mono font-bold text-blue-600">{p.code}</td>
                            <td className="p-2 font-bold">{p.name}</td>
                            <td className="p-2 text-right font-mono">{s.budget.toLocaleString()}</td>
                            <td className="p-2 text-right font-mono">{s.actualSpent.toLocaleString()}</td>
                            <td className="p-2 text-right font-mono text-orange-600 font-bold">{s.remaining.toLocaleString()}</td>
                            <td className="p-2 text-right font-mono font-bold">{s.percentSpent.toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
                      <td className="p-2" colSpan={2}>สรุปผลรวมงบประมาณสุทธิสะสม</td>
                      <td className="p-2 text-right font-mono">{currentStats.totalBudget.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono">{currentStats.totalSpent.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono text-orange-600 font-bold">{currentStats.totalRemaining.toLocaleString()}</td>
                      <td className="p-2 text-right font-mono font-bold">{currentStats.percentSpent.toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Drill-down Material lists under BOQ */}
              <div className="space-y-4 pt-2">
                <h4 className="text-3xs font-black uppercase tracking-wider text-slate-800">รายการวัสดุและปริมาณเบิกใช้สเปก BOQ (Detailed Material Allocations & Spent)</h4>
                <div className="space-y-4">
                  {boqs
                    .filter(b => selectedProjectId === 'ALL' || b.projectId === selectedProjectId)
                    .map(b => {
                      return (
                        <div key={b.id} className="space-y-1 bg-slate-50/50 p-3 rounded-lg border">
                          <div className="flex justify-between items-center font-bold text-[10px] text-slate-800 border-b pb-1">
                            <span>[{b.code}] {b.name} ({b.category})</span>
                            <span className="font-mono">หมวดแยกจ่ายคลัง</span>
                          </div>
                          
                          <table className="w-full text-left font-sans text-3xs border-none mt-1">
                            <thead>
                              <tr className="text-slate-500 font-bold">
                                <th className="py-1">รหัสสินค้า / รายละเอียดพัสดุก่อสร้าง</th>
                                <th className="py-1 text-right">จำนวนสิทธิ BOQ</th>
                                <th className="py-1 text-right">จำนวนเบิกจริง</th>
                                <th className="py-1 text-right">โควตาคงเหลือ</th>
                                <th className="py-1 text-right">ราคาต่อหน่วยจริง ({valuationMethod})</th>
                                <th className="py-1 text-right">ตัวเงินจริงเบิกใช้</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {b.items.map(bi => {
                                const unitCost = calculateUnitCost(bi.itemSku, valuationMethod);
                                const actualTotalCost = bi.usedQuantity * unitCost;
                                const rem = bi.quantityLimit - bi.usedQuantity;
                                return (
                                  <tr key={bi.id}>
                                    <td className="py-1">[{bi.itemSku}] {bi.itemName}</td>
                                    <td className="py-1 text-right font-mono">{bi.quantityLimit}</td>
                                    <td className="py-1 text-right font-mono text-slate-900 font-bold">{bi.usedQuantity}</td>
                                    <td className={`py-1 text-right font-mono font-bold ${rem < 0 ? 'text-rose-600' : 'text-slate-600'}`}>{rem}</td>
                                    <td className="py-1 text-right font-mono">{unitCost.toLocaleString()}</td>
                                    <td className="py-1 text-right font-mono font-extrabold text-slate-900">{actualTotalCost.toLocaleString()}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Official Signatures blocks */}
              <div className="pt-10 grid grid-cols-3 gap-8 text-center text-3xs font-sans">
                <div className="space-y-6">
                  <div className="h-10 flex items-end justify-center">
                    <span className="border-b border-dashed border-slate-400 w-full max-w-[150px]"></span>
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-805">({currentUserName})</h5>
                    <p className="text-slate-400 text-4xs">เจ้าพนักงานควบคุมโครงการ / ผู้ตรวจการคลังพัสดุ</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="h-10 flex items-end justify-center">
                    <img 
                      src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='40'><path d='M 10 30 Q 30 5 50 30 T 90 20' fill='none' stroke='black' stroke-width='2'/></svg>"
                      alt="Signature Manager" 
                      className="h-8 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-805">(วิศวกรสมศักดิ์ รักไทย)</h5>
                    <p className="text-slate-400 text-4xs">ผู้ควบคุมงานหลักวิภาควิชาหน้างาน (Project Manager)</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="h-10 flex items-end justify-center">
                    <img 
                      src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='40'><path d='M 5 20 Q 25 25 50 8 T 95 30' fill='none' stroke='black' stroke-width='2'/></svg>"
                      alt="Signature Accountant" 
                      className="h-8 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-805">(คุณปิยะมาศ การเงินดี)</h5>
                    <p className="text-slate-400 text-4xs">ผู้ตรวจการประเมินภาษีและกรอบการควบคุมกระแสสัญสัญญา (Accounting)</p>
                  </div>
                </div>
              </div>

              {/* Quick warning Footer */}
              <div className="pt-8 text-center text-[8px] text-slate-450 border-t border-slate-200 uppercase font-mono tracking-wider">
                เอกสารนี้ได้รับการลงทะเบียนดิจิทัลและปกป้องอย่างเคร่งครัดตามข้อกำหนดมาตรการก่อสร้าง BOQ มาตรฐานประเทศไทย (AR-2026-EN)
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Simple internal handler logger block
function addAuditLog(desc: string) {
  // Utility logging block trigger fallback
  console.log(`[RPT LOG]: ${desc}`);
}
