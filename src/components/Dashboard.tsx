/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { InventoryItem, Project, BOQ, Transaction } from '../types';
import { 
  Building2, 
  Layers, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  TrendingDown, 
  ArrowRight, 
  Activity, 
  Clock, 
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';

interface DashboardProps {
  items: InventoryItem[];
  projects: Project[];
  boqs: BOQ[];
  transactions: Transaction[];
  onNavigate: (tab: string) => void;
  canViewCost: boolean;
}

export default function Dashboard({ items, projects, boqs, transactions, onNavigate, canViewCost }: DashboardProps) {
  // Calculations
  const totalItems = items.length;
  const lowStockItems = items.filter(item => item.stockLeft <= item.minStock);
  const lowStockCount = lowStockItems.length;

  // Expiry check: within 90 days from current date (2026-05-26)
  const currentDate = new Date('2026-05-26');
  const nearExpiryCount = items.filter(item => {
    if (!item.expiryDate) return false;
    const exp = new Date(item.expiryDate);
    const diffTime = exp.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 90;
  }).length;

  const totalStockValue = items.reduce((sum, item) => sum + (item.stockLeft * item.costPrice), 0);
  const totalStandardValue = items.reduce((sum, item) => sum + (item.stockLeft * item.standardPrice), 0);

  const activeProjectsCount = projects.filter(p => p.status === 'Active').length;

  // Project budgets calculations
  // Actual spent per project (from APPROVED ISSUE transactions cost price, plus OUTSIDE BOQ issues)
  const getProjectActualSpent = (projCode: string) => {
    return transactions
      .filter(tx => tx.projectCode === projCode && tx.type === 'ISSUE' && tx.status === 'APPROVED')
      .reduce((sum, tx) => sum + (tx.quantity * tx.costPrice), 0) -
      transactions
      .filter(tx => tx.projectCode === projCode && tx.type === 'RETURN' && tx.status === 'APPROVED')
      .reduce((sum, tx) => sum + (tx.quantity * tx.costPrice), 0);
  };

  // Standard allocated BOQ budgets per project
  const getProjectBOQBudget = (projId: string) => {
    const projectBoqs = boqs.filter(b => b.projectId === projId);
    return projectBoqs.reduce((sum, boq) => {
      return sum + boq.items.reduce((bSum, item) => bSum + (item.quantityLimit * item.standardPrice), 0);
    }, 0);
  };

  const overallBudgetAllocated = projects.reduce((sum, p) => sum + getProjectBOQBudget(p.id), 0);
  const overallActualSpent = projects.reduce((sum, p) => sum + getProjectActualSpent(p.code), 0);

  // Over-BOQ detections
  const overBoqTransactions = transactions.filter(tx => tx.isOutsideBOQ && tx.type === 'ISSUE');

  // Top fast moving items by frequency of ISSUE
  const issueCounts: Record<string, { count: number; name: string; category: string; quantity: number }> = {};
  transactions.filter(tx => tx.type === 'ISSUE').forEach(tx => {
    if (!issueCounts[tx.itemSku]) {
      issueCounts[tx.itemSku] = { count: 0, name: tx.itemName, category: tx.category, quantity: 0 };
    }
    issueCounts[tx.itemSku].count += 1;
    issueCounts[tx.itemSku].quantity += tx.quantity;
  });

  const topMaterials = Object.entries(issueCounts)
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, 5);

  // Recents Transactions (limit 5)
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Category distributions
  const categoryBudgets: Record<string, number> = {};
  boqs.forEach(boq => {
    boq.items.forEach(item => {
      const cat = boq.category; // 'Structural' | 'Sanitary' | 'Electrical' | 'Finishing' | 'Temporary'
      const thaiCat = cat === 'Structural' ? 'งานโครงสร้าง' 
                     : cat === 'Electrical' ? 'งานไฟฟ้าระบบ' 
                     : cat === 'Sanitary' ? 'งานดินระบายประปา' 
                     : cat === 'Finishing' ? 'งานสถาปัตย์ตกแต่ง' 
                     : 'งานชั่วคราวอื่น';
      categoryBudgets[thaiCat] = (categoryBudgets[thaiCat] || 0) + (item.quantityLimit * item.standardPrice);
    });
  });

  const categoryShares = Object.entries(categoryBudgets).sort((a, b) => b[1] - a[1]);
  const totalCategoryBudget = Object.values(categoryBudgets).reduce((sum, v) => sum + v, 0) || 1;

  return (
    <div className="space-y-6" id="dashboard-root">
      {/* Overview Head Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5 flex items-center justify-between transition-all hover:border-blue-200 hover:shadow-md" id="card-total-stock">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">มูลค่าสินค้าในคลังสินค้า</span>
            <div className="text-2xl font-semibold tracking-tight text-slate-900">
              {canViewCost ? `฿${totalStockValue.toLocaleString()}` : '••••••'}
            </div>
            <p className="text-2xs text-slate-400">
              สินค้าทั้งหมด <span className="font-semibold text-slate-600">{totalItems} รายการ</span>
            </p>
          </div>
          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Package className="h-6 w-6" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5 flex items-center justify-between transition-all hover:border-red-200 hover:shadow-md" id="card-low-stock">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">วัสดุใกล้หมดคลัง (Low Stock)</span>
            <div className="flex items-center gap-1.5">
              <div className={`text-2xl font-bold tracking-tight ${lowStockCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {lowStockCount}
              </div>
              <span className="text-xs text-slate-500">จุดสั่งซื้อ</span>
            </div>
            <p className="text-2xs text-rose-500 flex items-center gap-0.5">
              {nearExpiryCount > 0 && (
                <span>⚠️ สารเคมีใกล้หมดอายุ {nearExpiryCount} รายการ</span>
              )}
            </p>
          </div>
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${lowStockCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'}`}>
            <AlertTriangle className="h-6 w-6 animate-pulse" />
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5 flex items-center justify-between transition-all hover:border-emerald-200 hover:shadow-md" id="card-budget">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">รวมงบประมาณ BOQ ทุกโครงการ</span>
            <div className="text-2xl font-semibold tracking-tight text-emerald-600 font-mono">
              {canViewCost ? `฿${overallBudgetAllocated.toLocaleString()}` : '••••••'}
            </div>
            <p className="text-2xs text-slate-400">
              ผูกโครงการจริง <span className="font-semibold text-slate-600">{activeProjectsCount} ไซต์งาน</span>
            </p>
          </div>
          <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-5 flex items-center justify-between transition-all hover:border-amber-200 hover:shadow-md" id="card-actual-spent">
          <div className="space-y-1">
            <span className="text-xs text-slate-500 font-medium">ต้นทุนจริงเบิกวัสดุ (Actual Cost)</span>
            <div className="text-2xl font-semibold tracking-tight text-slate-900 font-mono">
              {canViewCost ? `฿${overallActualSpent.toLocaleString()}` : '••••••'}
            </div>
            <div className="text-2xs text-slate-500 flex items-center gap-1">
              <span className="font-semibold text-slate-700">
                {overallBudgetAllocated > 0 ? ((overallActualSpent / overallBudgetAllocated) * 100).toFixed(1) : 0}%
              </span>
              <span>ของงบ BOQ รวม</span>
            </div>
          </div>
          <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Activity className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Warnings Banner for Overbudget / Out of BOQ withdrawals */}
      {overBoqTransactions.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4" id="alert-over-boq-banner">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 p-1.5 bg-amber-100 text-amber-800 rounded-lg">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-900">ตรวจพบการดึงวัสดุด่วน นอกเหนืองบประมาณ BOQ!</h4>
              <p className="text-xs text-amber-700 mt-1">
                มี {overBoqTransactions.length} รายการเบิกที่เป็นสินค้า "นอก BOQ" หรือปริมาณเกินกำหนดที่ผู้ควบคุมไซต์รายงาน ความเสียหายหรือส่วนต่างเหล่านี้ถูกเพิ่มเข้าไปในต้นทุนจริงของโปรเจกต์แล้ว
              </p>
            </div>
          </div>
          <button 
            onClick={() => onNavigate('projects')}
            className="text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1"
          >
            วิเคราะห์งบโครงการ <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Chart: Actual Spent vs Budgeted BOQ for top projects */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-xs p-5" id="chart-project-budgets">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">ต้นทุนสะสมเปรียบเทียบงบประมาณตามป้าย BOQ</h3>
              <p className="text-2xs text-slate-500">เปรียบเทียบโควตาวัสดุทางทฤษฎี (Budget) และปริมาณทีเบิกลงไซต์จริง (Actual Cost)</p>
            </div>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </div>

          <div className="space-y-4 pt-2">
            {!canViewCost ? (
              <div className="h-48 flex flex-col items-center justify-center bg-slate-50 rounded-lg text-slate-400 text-xs">
                <span>กรุณาเปลี่ยนบทบาทเป็น Admin / PM / Accounting เพื่อดูต้นทุนโครงการ</span>
              </div>
            ) : (
              projects.slice(0, 3).map(proj => {
                const b = getProjectBOQBudget(proj.id);
                const act = getProjectActualSpent(proj.code);
                const percent = b > 0 ? (act / b) * 100 : 0;
                const isOver = act > b;

                return (
                  <div key={proj.id} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 truncate max-w-[200px]">{proj.name}</span>
                      <span className="text-2xs font-mono text-slate-400">{proj.code}</span>
                    </div>

                    <div className="space-y-1">
                      {/* Bar graph (Actual vs BOQ limit) */}
                      <div className="relative h-6 bg-slate-100 rounded-lg overflow-hidden">
                        {/* Standard budget segment */}
                        <div className="absolute top-0 left-0 bottom-0 bg-sky-100 border-r border-sky-300 transition-all duration-500" style={{ width: '100%' }}></div>
                        {/* Actual spent progress */}
                        <div className={`absolute top-0 left-0 bottom-0 transition-all duration-500 ${isOver ? 'bg-rose-500/80' : 'bg-blue-600/90'}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                        
                        {/* If spent over budget overlay extra segment */}
                        {isOver && (
                          <div className="absolute top-0 bottom-0 bg-red-600 animate-pulse" style={{ left: '100%', width: `${percent - 100}%` }}></div>
                        )}

                        <div className="absolute inset-0 flex items-center justify-between px-3 text-2xs font-semibold z-10">
                          <span className={`${percent > 40 ? 'text-white' : 'text-slate-800'}`}>
                            เบิกจริง: ฿{act.toLocaleString()}
                          </span>
                          <span className="text-slate-600">
                            งบ BOQ: ฿{b.toLocaleString()} ({percent.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div className="flex items-center justify-center gap-6 text-2xs text-slate-500 pt-2 border-t border-slate-50">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 bg-blue-600 rounded-xs"></span>
                <span>ต้นทุนหน้างานปกติ (ในงบ)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 bg-rose-500 rounded-xs"></span>
                <span>เบิกเกินโควตาผูกในสัญญางาน</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 bg-sky-100 border border-sky-300 rounded-xs"></span>
                <span>วงเงิน BOQ สูงสุด</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Chart: BOQ Spent Category Shares (using pure CSS/SVG circular progress or bento breakdown) */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-xs p-5" id="chart-category-allocated">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">สัดส่วนวงเงินงบประมาณตามหมวดหมู่ BOQ</h3>
              <p className="text-2xs text-slate-500">จำแนกตามประเภทงานไฟฟ้า งานประปาสุขาภิบาล และงานฐานรากโครงสร้าง</p>
            </div>
            <Layers className="h-4 w-4 text-slate-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 pt-2">
            {!canViewCost ? (
              <div className="h-48 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 text-xs">
                <span>กรุณาเปลี่ยนสิทธิ์บทบาทเพื่อเข้าถึงข้อมูล</span>
              </div>
            ) : (
              <div className="space-y-3">
                {categoryShares.map(([catName, budgetVal]) => {
                  const pct = (budgetVal / totalCategoryBudget) * 100;
                  // Color assignment based on category
                  const colorClass = catName.includes('โครงสร้าง') ? 'bg-slate-700' 
                                   : catName.includes('ไฟฟ้า') ? 'bg-amber-500'
                                   : catName.includes('ประปา') ? 'bg-sky-500'
                                   : 'bg-emerald-500';

                  const textIcon = catName.includes('โครงสร้าง') ? '🏗️' 
                                 : catName.includes('ไฟฟ้า') ? '⚡'
                                 : catName.includes('ประปา') ? '💧'
                                 : '🎨';

                  return (
                    <div key={catName} className="space-y-1.5">
                      <div className="flex items-center justify-between text-2xs font-medium">
                        <span className="text-slate-700 flex items-center gap-1">
                          <span>{textIcon}</span> {catName}
                        </span>
                        <div className="space-x-1.5 text-slate-500">
                          <span className="font-mono text-slate-800">฿{budgetVal.toLocaleString()}</span>
                          <span className="bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded-sm">{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${colorClass} transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Grid: Fast Moving Stocks + Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Fast Moving (Top issued materials) */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-xs p-5 lg:col-span-1" id="dash-fast-moving">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">เกรดสินค้าพรีเมี่ยมเบิกบ่อย</h3>
              <p className="text-2xs text-slate-500">จัดอันดับวัสดุที่มีปริมาณเบิกลงหน้างานสูงสุดในเวลานี้</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          </div>

          <div className="space-y-3.5 pt-1">
            {topMaterials.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                ยังไม่มีข้อมูลการเบิกจ่ายสินค้าคงคลัง
              </div>
            ) : (
              topMaterials.map(([sku, info], index) => {
                const medalColors = ['bg-amber-100 text-amber-700', 'bg-slate-100 text-slate-700', 'bg-orange-100 text-orange-700'];
                return (
                  <div key={sku} className="flex items-center gap-3 justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${index < 3 ? medalColors[index] : 'bg-slate-50 text-slate-400'}`}>
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-800 truncate" title={info.name}>{info.name}</h4>
                        <span className="text-3xs font-mono text-slate-400 bg-slate-50 px-1 rounded-sm uppercase">{sku}</span>
                        <span className="text-3xs text-slate-400 ml-1.5">{info.category}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-blue-600 font-mono">
                        {info.quantity.toLocaleString()}
                      </div>
                      <span className="text-4xs text-slate-400 uppercase">โอนออก ({info.count} ครั้ง)</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2 & 3: Recent Transactions list */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-xs p-5 lg:col-span-2" id="dash-recent-transactions">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">ประวัติการเคลื่อนไหววัสดุล่าสุด (Movement Hub)</h3>
              <p className="text-2xs text-slate-500">บันทึกตรวจรับเข้า (Receive), เบิกกองงาน (Issue) และส่งคืนวัสดุเหลือค้าง</p>
            </div>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-3xs uppercase text-slate-400 tracking-wider">
                  <th className="py-2.5 font-semibold">ประเภท</th>
                  <th className="py-2.5 font-semibold">วันที่/เวลา</th>
                  <th className="py-2.5 font-semibold">รายการวัสดุ</th>
                  <th className="py-2.5 font-semibold">จำนวนโอนย้าย</th>
                  <th className="py-2.5 font-semibold">ผู้ดำเนินการ/ไซต์โครงการ</th>
                  <th className="py-2.5 font-semibold">สถานะ BOQ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentTransactions.map(tx => {
                  let typeBadge = '';
                  switch(tx.type) {
                    case 'RECEIVE':
                      typeBadge = 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10';
                      break;
                    case 'ISSUE':
                      typeBadge = 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10';
                      break;
                    case 'RETURN':
                      typeBadge = 'bg-teal-50 text-teal-700 ring-1 ring-teal-600/10';
                      break;
                    case 'ADJUST':
                      typeBadge = 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10';
                      break;
                  }

                  const formatTime = (ts: string) => {
                    const d = new Date(ts);
                    return d.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                  };

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors text-xs text-slate-700">
                      <td className="py-3">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-3xs font-medium ${typeBadge}`}>
                          {tx.type === 'RECEIVE' ? 'รับเข้า' 
                           : tx.type === 'ISSUE' ? 'เบิกออก' 
                           : tx.type === 'RETURN' ? 'คืนคลัง' 
                           : 'บำรุงสต๊อก'}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-3xs text-slate-400">
                        {formatTime(tx.date)}
                      </td>
                      <td className="py-3">
                        <div className="font-semibold text-slate-800 line-clamp-1">{tx.itemName}</div>
                        <div className="text-3xs text-slate-400 font-mono uppercase">{tx.itemSku}</div>
                      </td>
                      <td className="py-3">
                        <span className={`font-semibold ${tx.quantity < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                          {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                        </span>
                        <span className="text-3xs text-slate-400 ml-1">{tx.unit}</span>
                      </td>
                      <td className="py-3">
                        <div className="font-medium text-slate-700 truncate max-w-[150px]">{tx.requester || tx.operator}</div>
                        <div className="text-3xs text-slate-400 truncate max-w-[150px]">{tx.projectCode || '-'}</div>
                      </td>
                      <td className="py-3">
                        {tx.type === 'ISSUE' && (
                          <span className={`inline-flex px-1.5 py-0.5 rounded-sm text-3xs font-medium ${tx.isOutsideBOQ ? 'bg-amber-100 text-amber-800' : 'bg-sky-150 text-sky-800 bg-sky-50'}`}>
                            {tx.isOutsideBOQ ? 'นอก BOQ' : 'ตรงตามโควตา'}
                          </span>
                        )}
                        {tx.type === 'RECEIVE' && <span className="text-3xs text-slate-400 italic">ไม่ระบุ</span>}
                        {tx.type === 'RETURN' && <span className="text-3xs text-teal-600 font-medium">คืนต้นทุน</span>}
                        {tx.type === 'ADJUST' && <span className="text-3xs text-amber-600 font-medium font-mono">ADJ</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end pt-3 text-xs border-t border-slate-50">
            <button 
              onClick={() => onNavigate('transactions')}
              className="font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              ดูรายการโอนย้ายทั้งหมด <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
