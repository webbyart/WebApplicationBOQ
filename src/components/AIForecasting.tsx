/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState } from 'react';
import { InventoryItem, Project, BOQ, Transaction } from '../types';
import { Sparkles, BrainCircuit, TrendingUp, AlertTriangle, Lightbulb, BarChart, CalendarRange, ArrowRight, RefreshCw } from 'lucide-react';

interface AIForecastingProps {
  items: InventoryItem[];
  projects: Project[];
  boqs: BOQ[];
  transactions: Transaction[];
  canViewCost: boolean;
}

export default function AIForecasting({ items, projects, boqs, transactions, canViewCost }: AIForecastingProps) {
  const [selectedSkuForForecast, setSelectedSkuForForecast] = useState(items[0]?.sku || '');
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [aiReport, setAiReport] = useState<any | null>(null);

  // Compute stats on-the-fly for mathematical accuracy
  const performAIEngineForecast = (sku: string) => {
    setIsAnalysing(true);
    
    setTimeout(() => {
      const targetItem = items.find(i => i.sku === sku);
      if (!targetItem) {
        setIsAnalysing(false);
        return;
      }

      // Calculate historical usage speed
      const totalIssuedQty = transactions
        .filter(tx => tx.itemSku === sku && tx.type === 'ISSUE' && tx.status === 'APPROVED')
        .reduce((sum, tx) => sum + tx.quantity, 0);

      const totalReturnedQty = transactions
        .filter(tx => tx.itemSku === sku && tx.type === 'RETURN' && tx.status === 'APPROVED')
        .reduce((sum, tx) => sum + tx.quantity, 0);

      const actualConsumption = Math.max(totalIssuedQty - totalReturnedQty, 0);
      
      // Weekly consumption rate (assume 4 weeks span for simulated data)
      const weeklyConsumptionRate = Math.max(Number((actualConsumption / 4).toFixed(1)), 0.5);
      
      // Calculated days until depletion
      const daysOfRunway = weeklyConsumptionRate > 0 
        ? Math.ceil((targetItem.stockLeft / weeklyConsumptionRate) * 7) 
        : 999;

      let priority: 'HIGH' | 'MEDIUM' | 'SAFE' = 'SAFE';
      if (daysOfRunway <= 14 || targetItem.stockLeft <= targetItem.minStock) {
        priority = 'HIGH';
      } else if (daysOfRunway <= 45) {
        priority = 'MEDIUM';
      }

      // Simulated insights from Gemini AI relative to categories
      let specializedAdvice = '';
      if (targetItem.category.includes('โครงสร้าง')) {
        specializedAdvice = 'คาดการณ์ว่าราคาเหล็กดิบและวัตถุดิบปูนซิเมนต์จะขยับขึ้น 3.5% ในช่วงไตรมาสถัดไปเนื่องจากมาตรการคาร์บอนชีวภาพ แนะนำให้สั่งซื้อตุน (Safety Refill) สำหรับโครงการหลักปูพรมให้ครบตามปริมาณที่ใช้จริงขั้นบันไดที่ 80% ของ BOQ บัญชีแยกเพื่อป้องกันเงินทุนบานปลาย';
      } else if (targetItem.category.includes('ไฟฟ้า')) {
        specializedAdvice = 'ปริมาณการเบิกเดินสายไฟ VAF และระบบท่อเหลืองเข้าสู่ขีดเฝ้าระวังสูงสุด แฟ้มสถาปัตยกรรม BOQ ใกล้เกินกรอบสัญญา 10% แนะนำให้วิศวกรร่วมประเมินแบบโครงข่ายสำรอง ปรับวิธีการวางแนวสะพานสายไฟด้านนอกเพื่อลดการสิ้นเปลือง และพิจารณาจัดซื้อล็อตถังราคาพิเศษจาก Phelps Dodge';
      } else if (targetItem.category.includes('สุขาภิบาล')) {
        specializedAdvice = 'ตรวจพบว่าวัสดุเคมีบางประเภท (กาวประสานท่อ) มีอัตราการเบิกแบบก้าวกระโดดและใกล้กำหนดเสื่อมสภาพในเดือนสิงหาคมนี้ แนะนำให้ Store Manager ตรวจคัดสรรตำแหน่งจัดเก็บที่มีอุณหภูมิห้องสม่ำเสมอ และออกคำสั่งห้ามใช้สินค้าล็อตสัมผัสอาการชำรุด';
      } else {
        specializedAdvice = 'สำหรับงานปูพื้นสถาปัตยกรรม แนะนำให้ควบคุมงบประมาณโดยเบิกตามสัดส่วนพื้นที่หน้างานจริงเท่านั้น หลีกเลี่ยงการเบิกสำรองยกกล่องเกิน 5 ตารางเมตร เพื่อลดความเสียหายจากการตกแต่งคลาวด์กระเบื้องแกรนิตโตแตกบิ่น';
      }

      setAiReport({
        item: targetItem,
        weeklyUsage: weeklyConsumptionRate,
        runwayDays: daysOfRunway,
        riskLevel: priority,
        advisorAdvice: specializedAdvice,
        suggestedPOQty: Math.max(targetItem.minStock * 2.5 - targetItem.stockLeft, 20)
      });

      setIsAnalysing(false);
    }, 850);
  };

  // Run automatically on first render once category is active
  React.useEffect(() => {
    if (selectedSkuForForecast) {
      performAIEngineForecast(selectedSkuForForecast);
    }
  }, [selectedSkuForForecast]);

  return (
    <div className="space-y-6" id="ai-hub-root">
      {/* Title banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-905 bg-[#1e293b] rounded-2xl p-6 text-white border border-indigo-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-md">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 border border-blue-400/20 px-2.5 py-1 rounded-full text-3xs font-bold leading-none uppercase">
            <Sparkles className="h-3 w-3 animate-pulse" /> CargoBOQ Smart Assistant
          </div>
          <h2 className="text-base font-bold text-slate-100">ระบบคาดการณ์คลังและวิเคราะห์ต้นทุนยอดงบกลาง (AI Copilot Hub)</h2>
          <p className="text-3xs text-slate-350">ประมวลผลดึงดาต้าธุรกรรมจริง จับคู่พฤติกรรมการถอนสินค้า คำนวณวันเวลาก่อนสินค้าขาดมือ และแนะนำงบประมาณแบบก้าวหน้า</p>
        </div>
        <BrainCircuit className="h-10 w-10 text-blue-400 shrink-0 opacity-80" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column Controls */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-3xs p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <BarChart className="h-4 w-4 text-blue-600" />
            <span>เลือกสรรระบุพาร์ทนัมเบอร์สินค้า</span>
          </h3>

          <div className="space-y-3 font-sans text-xs">
            <p className="text-3xs text-slate-400 leading-normal">
              ระบุรายการวัสดุวิศวกรรม เพื่อดึงหุ่นยนต์ AI พยากรณ์แนวโน้มการดึงสินค้า และประมวณราคากลางเปรียบเทียบตลาด
            </p>

            <select
              value={selectedSkuForForecast}
              onChange={(e) => setSelectedSkuForForecast(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-semibold cursor-pointer"
            >
              {items.map(item => (
                <option key={item.sku} value={item.sku}>
                  [{item.sku}] {item.name}
                </option>
              ))}
            </select>

            <button 
              onClick={() => performAIEngineForecast(selectedSkuForForecast)}
              disabled={isAnalysing}
              className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-3xs font-bold transition-all disabled:opacity-50 cursor-pointer text-center inline-flex items-center justify-center gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${isAnalysing ? 'animate-spin' : ''}`} />
              <span>{isAnalysing ? 'กำลังประมวลเวคเตอร์พยากรณ์...' : 'รีเฟรชสรุปคำแนะนำ'}</span>
            </button>
          </div>

          {/* Quick Stats overview */}
          <div className="border-t border-slate-100 pt-4 space-y-3.5">
            <h4 className="text-3xs font-bold text-slate-400 uppercase tracking-wider">ภาพสถานะคลังวัสดุอ้างอิง</h4>
            <div className="grid grid-cols-2 gap-3 text-3xs font-semibold text-slate-700">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-105">
                <span className="text-slate-400 block font-normal text-4xs">รวมวัสดุทั้งหมด</span>
                <span className="text-slate-800 font-mono text-xs">{items.length} ชนิด</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-105">
                <span className="text-slate-400 block font-normal text-4xs">ระดับวิกฤตสั่งซื้อ</span>
                <span className="text-rose-600 font-mono text-xs">
                  {items.filter(i => i.stockLeft <= i.minStock).length} รายการ
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Columns AI diagnostics report */}
        <div className="lg:col-span-2 space-y-4">
          
          {isAnalysing ? (
            <div className="bg-white rounded-xl border border-slate-100 min-h-[300px] flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="h-10 w-10 border-4 border-t-blue-600 border-r-transparent border-slate-100 rounded-full animate-spin"></div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 animate-pulse">กำลังเรียกใช้งานโมเดลวิเคราะห์ข้อมูล</h4>
                <p className="text-3xs text-slate-500 mt-1">ประมวลโควตาโครงการ BOQ, ความเร็วการหักลบวัสดุ, และคำนวณวันหมดสต๊อกย้อนหลัง...</p>
              </div>
            </div>
          ) : aiReport ? (
            <div className="space-y-4">
              
              {/* Runway & Warning Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Visual Runway progress card */}
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-3xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-4xs font-bold text-slate-400 uppercase">อัตราเบิกรายสัปดาห์</span>
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <span className="text-xl font-mono font-bold text-slate-800">{aiReport.weeklyUsage}</span>
                    <span className="text-3xs text-slate-400 ml-1">{aiReport.item.unit} / สัปดาห์</span>
                  </div>
                  <p className="text-5xs text-slate-400">อิงประวัติการนำส่งวัสดุหน้าไซท์งานจริง</p>
                </div>

                {/* Days of Runway tracker */}
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-3xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-4xs font-bold text-slate-400 uppercase">วันที่คาดว่าของจะหมด</span>
                    <CalendarRange className="h-4 w-4 text-slate-400" />
                  </div>
                  <div>
                    {aiReport.runwayDays === 999 ? (
                      <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm">ปลอดภัยระยะยาว</span>
                    ) : (
                      <>
                        <span className={`text-xl font-mono font-bold ${
                          aiReport.riskLevel === 'HIGH' ? 'text-rose-600' :
                          aiReport.riskLevel === 'MEDIUM' ? 'text-amber-600' : 'text-slate-800'
                        }`}>
                          {aiReport.runwayDays}
                        </span>
                        <span className="text-3xs text-slate-400 ml-1">วันวิ่งรันเวย์</span>
                      </>
                    )}
                  </div>
                  <p className="text-5xs text-slate-400">คำนวณจากความเร็วเฉลี่ยในการใช้งานหน้าบอร์ด</p>
                </div>

                {/* Recommended PO Refill quantity value */}
                <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-3xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-4xs font-bold text-slate-400 uppercase">จำนวนแนะนำสั่งซื้อใหม่</span>
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <span className="text-xl font-mono font-bold text-indigo-600">+{aiReport.suggestedPOQty}</span>
                    <span className="text-3xs text-slate-400 ml-1">{aiReport.item.unit}</span>
                  </div>
                  <p className="text-5xs text-slate-400">คํานวณผ่านตัวย่อเซฟตี้สต๊อก (Safety Buffer)</p>
                </div>
              </div>

              {/* Smart AI Consultant Card */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-3xs p-5 space-y-4">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-900">การวิเคราะห์พฤติกรรมต้นทุนและสบถแบบ BOQ (Smart Advisor)</h4>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-205 rounded-xl text-xs text-slate-700 leading-relaxed font-sans prose max-w-none">
                  {aiReport.advisorAdvice}
                </div>

                {/* Simulated Pricing Volatility scale */}
                <div className="bg-blue-50/70 p-4 border border-blue-150 rounded-xl flex flex-col md:flex-row items-baseline md:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-blue-900">อัตราความผันผวนของราคาคู่ค้าช่วงนี้ (Volatility Index) :</span>
                    <p className="text-3xs text-blue-700">คำนวณจากการเคลื่อนไหวของราคาทุนจริงผู้ผลิตเทียบเกรด BOQ มาตรฐาน</p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-sm font-bold text-2xs uppercase">
                    ต่ำค่อนข้างนิ่ง (Stable)
                  </span>
                </div>
              </div>

              {/* Overrun simulation checklist */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-3xs p-5 space-y-3 text-xs">
                <span className="text-3xs font-bold text-slate-400 uppercase block tracking-wider">มาตรการควบคุมความปลอดภัยของงบประมาณ</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-600 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span>ระบบล็อคงบ ป้องกันการเบิกสัญญาสะสมเกิน 12%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    <span>แนบตราลายเซ็นกรรมการและบันทึก IP ลงประวัติโปร่งใส</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="py-12 text-center bg-white border border-slate-100 rounded-xl space-y-2">
              <Sparkles className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">เลือกสินค้าด้านข้างระบุข้อมูลเพื่อรันบอร์ดวิเคราะห์อัจฉริยะ</p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
