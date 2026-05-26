/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';
import { Camera, RefreshCw, QrCode, Sparkles, Check, Play } from 'lucide-react';

interface MobileScannerProps {
  items: InventoryItem[];
  onScanResult: (sku: string) => void;
  onNavigate: (tab: string) => void;
}

export default function MobileScanner({ items, onScanResult, onNavigate }: MobileScannerProps) {
  const [activeItemIdx, setActiveItemIdx] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);

  const handleSimulateScan = () => {
    if (items.length === 0) return;
    setIsScanning(true);
    setScanStatus('⏳ กำลังเปิดกล้องมือถือ คาดเดาหาตำแหน่งระบุระนาบฉลาก...');

    setTimeout(() => {
      setScanStatus('⚡ ค้นเจอรอยเลเซอร์ Barcode... กำลังคำนวณถอดรหัสบิตข้อมูล...');
    }, 1200);

    setTimeout(() => {
      const selectedItem = items[activeItemIdx];
      setIsScanning(false);
      setScanStatus(`✔ สแกนตรวจพบสินค้าสำเร็จ! : [${selectedItem.sku}] ${selectedItem.name}`);
      onScanResult(selectedItem.sku);
      
      // Auto redirect to Transactions
      setTimeout(() => {
        onNavigate('transactions');
      }, 1500);

    }, 2800);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-xs p-5 max-w-md mx-auto space-y-6 text-center" id="mobile-scanner-module">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-slate-900 inline-flex items-center gap-1.5">
          <Camera className="h-4 w-4 text-blue-600" />
          <span>จำลองเปิดกล้องมือถือสแกนคิวอาร์ (Mobile QR & Barcode)</span>
        </h3>
        <p className="text-3xs text-slate-500">ทดสอบสถาปัตยกรรมกล้องผ่านไซท์จำลอง ปริ้นท์ป้ายหน้าขดลวดเหล็ก สแกนดึงข้อมูลลงฟอร์มทันใจ</p>
      </div>

      {/* Camera Simulator Layout */}
      <div className="relative h-64 bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 flex flex-col items-center justify-center p-4">
        {/* Animated laser grid scanning line */}
        {isScanning && (
          <div className="absolute top-0 inset-x-0 h-1 bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)] animate-bounce z-10"></div>
        )}

        {/* Viewfinder Target box corners */}
        <div className="absolute h-36 w-36 border-2 border-dashed border-sky-400 rounded-xl flex items-center justify-center">
          {isScanning ? (
            <QrCode className="h-10 w-10 text-sky-400/40 animate-pulse" />
          ) : (
            <div className="text-center text-slate-500 text-5xs p-2">
              เล็งเลนส์กล้องให้คิวอาร์โค้ด อยู่กึ่งกลางช่องนี้
            </div>
          )}
        </div>

        {/* Outer corners decoration */}
        <div className="absolute top-10 left-10 h-4 w-4 border-t-2 border-l-2 border-sky-400"></div>
        <div className="absolute top-10 right-10 h-4 w-4 border-t-2 border-r-2 border-sky-400"></div>
        <div className="absolute bottom-10 left-10 h-4 w-4 border-b-2 border-l-2 border-sky-400"></div>
        <div className="absolute bottom-10 right-10 h-4 w-4 border-b-2 border-r-2 border-sky-400"></div>

        {/* Simulated Camera Video background */}
        <div className="absolute inset-0 bg-radial from-slate-900/60 to-slate-950/90 z-0"></div>
        <div className="text-slate-600 text-4xs font-mono z-5 font-bold absolute top-3 left-3 flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-600 animate-ping"></span>
          <span>LIVE HD FEED 60FPS</span>
        </div>

        {isScanning && (
          <div className="z-10 text-center text-4xs text-slate-300 bg-black/50 px-4 py-2 rounded-lg max-w-[80%] leading-relaxed">
            {scanStatus}
          </div>
        )}

        {!isScanning && scanStatus && (
          <div className="z-10 text-center text-4xs text-emerald-400 bg-black/60 px-4 py-2 rounded-lg max-w-[80%] leading-relaxed flex items-center gap-1.5 font-bold">
            <Check className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>{scanStatus}</span>
          </div>
        )}
      </div>

      {/* Target item selector dropdown (to mock which tag we are pointing at) */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3 text-left">
        <label className="text-3xs font-bold text-slate-500 block">เลือกแผ่นแท็กป้ายเหล็กที่ต้องการทาบเลนส์เล็ง :</label>
        
        <div className="flex gap-2">
          <select
            disabled={isScanning}
            value={activeItemIdx}
            onChange={(e) => setActiveItemIdx(Number(e.target.value))}
            className="flex-1 bg-white border border-slate-200 text-xs p-2 rounded-lg font-semibold cursor-pointer"
          >
            {items.map((item, idx) => (
              <option key={item.sku} value={idx}>
                [{item.sku}] {item.name}
              </option>
            ))}
          </select>

          <button 
            type="button"
            disabled={isScanning || items.length === 0}
            onClick={handleSimulateScan}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer inline-flex items-center gap-1"
          >
            <Play className="h-3 w-3" /> ยิงเลเซอร์สแกน
          </button>
        </div>

        <p className="text-[11px] text-slate-400 leading-normal font-sans">
          💡 สแกนเนอร์ตัวนี้ถูกผูกเข้ากับ Module ใบเบิกจ่ายวัสดุ เมื่อสแกนเสร็จระบบจะจัดหน้า นำตัวเลขรหัส SKU และกรอกข้อมูลวัสดุในฟอร์มเบิกจ่ายให้อัตโนมัติทันที
        </p>
      </div>
    </div>
  );
}
