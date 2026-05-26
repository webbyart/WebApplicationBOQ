/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { InventoryItem, Warehouse, UserRole } from '../types';
import { 
  PackageSearch, 
  Plus, 
  FileSpreadsheet, 
  Download, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  QrCode, 
  MapPin, 
  TrendingDown, 
  Calendar,
  AlertOctagon,
  X,
  FileText,
  Table,
  LayoutGrid
} from 'lucide-react';

interface InventoryProps {
  items: InventoryItem[];
  warehouses: Warehouse[];
  currentUserRole: UserRole;
  onAddItem: (item: InventoryItem) => void;
  onUpdateItem: (sku: string, updated: InventoryItem) => void;
  onDeleteItem: (sku: string) => void;
  onBulkImport: (items: InventoryItem[]) => void;
  canAddEdit: boolean;
  canViewCost: boolean;
}

export default function Inventory({ 
  items, 
  warehouses, 
  currentUserRole,
  onAddItem, 
  onUpdateItem, 
  onDeleteItem, 
  onBulkImport,
  canAddEdit,
  canViewCost
}: InventoryProps) {
  
  const currentDate = new Date('2026-05-26');

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
  const [stockStatus, setStockStatus] = useState<'ALL' | 'LOW' | 'EXPIRING'>('ALL');
  
  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  // Form fields
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formUnit, setFormUnit] = useState('ถุง');
  const [formCostPrice, setFormCostPrice] = useState(0);
  const [formStandardPrice, setFormStandardPrice] = useState(0);
  const [formStockLeft, setFormStockLeft] = useState(0);
  const [formMinStock, setFormMinStock] = useState(10);
  const [formSupplier, setFormSupplier] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formWarehouse, setFormWarehouse] = useState('WH01');
  const [formExpiryDate, setFormExpiryDate] = useState('');

  // CSV Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // QR Display modal
  const [selectedQrCodeItem, setSelectedQrCodeItem] = useState<InventoryItem | null>(null);

  // Google Sheets layout & formula bar states
  const [viewMode, setViewMode] = useState<'sheet' | 'cards'>('sheet');
  const [activeRowIdx, setActiveRowIdx] = useState<number | null>(null);
  const [activeColIndex, setActiveColIndex] = useState<string>('A');

  // Categories list
  const categories = Array.from(new Set(items.map(i => i.category)));

  // Filter logic
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.latestSupplier.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesWarehouse = selectedWarehouse === 'ALL' || item.warehouseId === selectedWarehouse;
    
    let matchesStatus = true;
    if (stockStatus === 'LOW') {
      matchesStatus = item.stockLeft <= item.minStock;
    } else if (stockStatus === 'EXPIRING') {
      if (!item.expiryDate) {
        matchesStatus = false;
      } else {
        const exp = new Date(item.expiryDate);
        const diffTime = exp.getTime() - currentDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        matchesStatus = diffDays > 0 && diffDays <= 90; // Expiring in 90 days
      }
    }

    return matchesSearch && matchesCategory && matchesWarehouse && matchesStatus;
  });

  // Open add modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormSku(`SKU-${Math.floor(100 + Math.random() * 900)}`);
    setFormName('');
    setFormCategory(categories[0] || 'งานโครงสร้าง');
    setFormUnit('ถุง');
    setFormCostPrice(100);
    setFormStandardPrice(120);
    setFormStockLeft(50);
    setFormMinStock(10);
    setFormSupplier('');
    setFormLocation('G1-A');
    setFormWarehouse('WH01');
    setFormExpiryDate('');
    setIsAddEditModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormSku(item.sku);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormUnit(item.unit);
    setFormCostPrice(item.costPrice);
    setFormStandardPrice(item.standardPrice);
    setFormStockLeft(item.stockLeft);
    setFormMinStock(item.minStock);
    setFormSupplier(item.latestSupplier);
    setFormLocation(item.storageLocation);
    setFormWarehouse(item.warehouseId);
    setFormExpiryDate(item.expiryDate || '');
    setIsAddEditModalOpen(true);
  };

  // Submit add/edit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: InventoryItem = {
      sku: formSku,
      name: formName,
      category: formCategory,
      unit: formUnit,
      costPrice: Number(formCostPrice),
      standardPrice: Number(formStandardPrice),
      stockLeft: Number(formStockLeft),
      minStock: Number(formMinStock),
      latestSupplier: formSupplier || 'ไม่ได้ระบุ',
      storageLocation: formLocation || 'คลังทั่วไป',
      warehouseId: formWarehouse,
      expiryDate: formExpiryDate ? formExpiryDate : undefined,
    };

    if (editingItem) {
      onUpdateItem(editingItem.sku, payload);
    } else {
      // Check duplicate sku
      if (items.some(item => item.sku === payload.sku)) {
        alert('❌ รหัสสินค้านี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น');
        return;
      }
      onAddItem(payload);
    }
    setIsAddEditModalOpen(false);
  };

  // CSV Exporter
  const handleExportCSV = () => {
    // Generate headers
    const headers = ['รหัสสินค้า(SKU)', 'ชื่อวัสดุสินค้า', 'หมวดหมู่', 'หน่วยนับ', 'ราคาทุนจริง', 'ราคากลาง(BOQ)', 'คงเหลือในสต๊อก', 'จุดสั่งซื้อขั้นต่ำ', 'ผู้จำหน่ายล่าสุด', 'ตำแหน่งจัดเก็บคลัง', 'วันหมดอายุ'];
    const rows = filteredItems.map(item => [
      item.sku,
      item.name,
      item.category,
      item.unit,
      canViewCost ? item.costPrice : 'CONFIDENTIAL',
      item.standardPrice,
      item.stockLeft,
      item.minStock,
      item.latestSupplier,
      item.storageLocation,
      item.expiryDate || 'N/A'
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inventory_Report_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle mock CSV import
  const handleCsvImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;

    try {
      const lines = csvText.split('\n').map(line => line.trim()).filter(l => l);
      if (lines.length < 2) throw new Error('ข้อมูลไม่ครบถ้วน');

      const imported: InventoryItem[] = [];
      // Skip header line
      for(let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length >= 8) {
          imported.push({
            sku: cols[0] || `SKU-IMP-${Math.floor(100+Math.random()*900)}`,
            name: cols[1],
            category: cols[2] || 'งานทั่วไป',
            unit: cols[3] || 'ถุง',
            costPrice: Number(cols[4]) || 100,
            standardPrice: Number(cols[5]) || 120,
            stockLeft: Number(cols[6]) || 50,
            minStock: Number(cols[7]) || 10,
            latestSupplier: cols[8] || 'นำเข้าผ่านไฟล์',
            storageLocation: cols[9] || 'WH01-G',
            warehouseId: cols[10] || 'WH01',
            expiryDate: cols[11] || undefined
          });
        }
      }

      if (imported.length > 0) {
        onBulkImport(imported);
        setImportStatus(`✔ นำเข้าสำเร็จ ${imported.length} รายการแล้ว!`);
        setTimeout(() => {
          setIsImportModalOpen(false);
          setImportStatus(null);
          setCsvText('');
        }, 1500);
      } else {
        throw new Error('ไม่พบข้อมูลวัสดุที่ถูกต้อง');
      }
    } catch(err: any) {
      alert('❌ เกิดข้อผิดพลาดในโครงสร้าง CSV: ' + err.message);
    }
  };

  return (
    <div className="space-y-6" id="inventory-module-root">
      {/* Header and command bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">คลังสินค้าและโควตาเก็บสะสม (Inventory Storage)</h2>
          <p className="text-3xs text-slate-500">จัดการรายชื่อวัสดุก่อสร้าง, จุดสั่งซื้อขั้นต่ำ และดูรายละเอียดผูก QR Code สำหรับการสแกนเบิกออกด่วน</p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto whitespace-nowrap">
          {/* Layout Mode Toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200 mr-2 select-none" id="view-mode-toggle">
            <button 
              type="button"
              onClick={() => setViewMode('sheet')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${viewMode === 'sheet' ? 'bg-white text-slate-800 shadow-3xs font-bold' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800'}`}
              title="แสดงแบบตาราง Google Sheet"
            >
              <Table className="h-3.5 w-3.5 text-emerald-600" />
              <span>ตาราง Google Sheet</span>
            </button>
            <button 
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${viewMode === 'cards' ? 'bg-white text-slate-800 shadow-3xs font-bold' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-800'}`}
              title="แสดงแบบดั้งเดิมการ์ดวัสดุ"
            >
              <LayoutGrid className="h-3.5 w-3.5 text-blue-600" />
              <span>การ์ดวัสดุ</span>
            </button>
          </div>

          {/* CSV Import */}
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>นำเข้า Excel/CSV</span>
          </button>
          
          {/* CSV Export */}
          <button 
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <Download className="h-4 w-4 text-blue-600" />
            <span>ดาวน์โหลดรายงาน</span>
          </button>

          {/* Add Item Button */}
          {canAddEdit && (
            <button 
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer"
              id="btn-add-inventory-item"
            >
              <Plus className="h-4 w-4" />
              <span>เพิ่มสินค้าใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Hub */}
      <div className="bg-slate-50/70 p-4 border border-slate-100 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-3.5 w-3.5" />
          </span>
          <input 
            type="text" 
            placeholder="ค้นหาชื่อสินค้า, SKU, Supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg placeholder-slate-400 text-slate-700 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-3 pr-8 text-xs text-slate-700 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            <option value="ALL">📂 ทุกหมวดงานก่อสร้าง ({categories.length})</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            <Filter className="h-3 w-3" />
          </span>
        </div>

        {/* Warehouse Filter */}
        <div className="relative">
          <select 
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-3 pr-8 text-xs text-slate-700 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            <option value="ALL">🏢 ทุกคลังย่อย ({warehouses.length})</option>
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>{wh.name}</option>
            ))}
          </select>
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            <MapPin className="h-3 w-3" />
          </span>
        </div>

        {/* Status Alarm Filter */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button 
            onClick={() => setStockStatus('ALL')}
            className={`flex-1 py-1 text-4xs font-bold rounded-md transition-all truncate text-center cursor-pointer ${stockStatus === 'ALL' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
          >
            ทั้งหมด
          </button>
          <button 
            onClick={() => setStockStatus('LOW')}
            className={`flex-1 py-1 text-4xs font-bold rounded-md transition-all truncate text-center cursor-pointer ${stockStatus === 'LOW' ? 'bg-white text-rose-600 shadow-2xs' : 'text-slate-500 hover:text-rose-500'}`}
          >
            ของใกล้หมด 🚨
          </button>
          <button 
            onClick={() => setStockStatus('EXPIRING')}
            className={`flex-1 py-1 text-4xs font-bold rounded-md transition-all truncate text-center cursor-pointer ${stockStatus === 'EXPIRING' ? 'bg-white text-amber-600 shadow-2xs' : 'text-slate-500 hover:text-amber-500'}`}
          >
            ใกล้เคลม ⏳
          </button>
        </div>
      </div>

      {/* Google Sheets Formula Bar */}
      {viewMode === 'sheet' && (
        <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center gap-2 shadow-xs" id="sheets-formula-bar">
          <div className="bg-slate-100 border border-slate-300 px-2.5 py-1 text-2xs font-mono font-bold text-slate-600 rounded-md min-w-[70px] text-center select-none shadow-3xs">
            {activeRowIdx !== null ? `${activeColIndex}${activeRowIdx + 2}` : `A1:N${filteredItems.length + 1}`}
          </div>
          <div className="h-5 w-[1px] bg-slate-200"></div>
          <button 
            type="button"
            className="font-serif italic text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 border border-slate-300 rounded-md select-none"
          >
            fx
          </button>
          <div className="flex-1">
            <input 
              type="text" 
              readOnly
              value={
                activeRowIdx !== null && filteredItems[activeRowIdx] 
                  ? `=INVENTORY_ROW(SKU="${filteredItems[activeRowIdx].sku}", NAME="${filteredItems[activeRowIdx].name}", CATEGORY="${filteredItems[activeRowIdx].category}", WH="${warehouses.find(w => w.id === filteredItems[activeRowIdx].warehouseId)?.name.split(' ')[0] || filteredItems[activeRowIdx].warehouseId}", STOCK_QTY=${filteredItems[activeRowIdx].stockLeft}, UNIT="${filteredItems[activeRowIdx].unit}", VALUE_BOQ=฿${(filteredItems[activeRowIdx].stockLeft * filteredItems[activeRowIdx].standardPrice).toLocaleString()})`
                  : `=TOTAL_SUMMARY(ITEMS_FOUND=${filteredItems.length} SKUs, TOTAL_IN_STOCK=${filteredItems.reduce((acc, curr) => acc + curr.stockLeft, 0).toLocaleString()} UNITS, LOW_ALERTS=${filteredItems.filter(i => i.stockLeft <= i.minStock).length} SKUs)`
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-md py-1 px-3 font-mono text-[11px] text-slate-700 outline-hidden select-all cursor-text"
            />
          </div>
        </div>
      )}

      {/* Spreadsheet / Grid conditional render */}
      {viewMode === 'sheet' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs" id="sheets-table-container">
          {/* Virtual Spreadsheet Header Accent */}
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-sans font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <span>เชื่อมต่อฐานข้อมูลวัสดุแบบ Real-time • โหมดตารางวิเคราะห์สูตร (Google Sheets Sandbox)</span>
            </div>
            <div className="font-mono text-slate-400 text-3xs">
              CELL_GRID: {filteredItems.length} rows x 14 columns
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs border-collapse min-w-[1300px]">
              {/* Spreadsheet headers */}
              <thead>
                {/* Letters Header Row (A, B, C...) */}
                <tr className="bg-slate-100/90 text-center text-slate-400 text-3xs font-mono font-semibold h-6 divide-x divide-slate-250 border-b border-slate-250 select-none">
                  <th className="w-10 bg-slate-100 border-r border-slate-250"></th>
                  <th className="px-2">A</th>
                  <th className="px-2">B</th>
                  <th className="px-2">C</th>
                  <th className="px-2">D</th>
                  <th className="px-2">E</th>
                  <th className="px-2">F</th>
                  <th className="px-2">G</th>
                  <th className="px-2">H</th>
                  <th className="px-2">I</th>
                  <th className="px-2">J</th>
                  <th className="px-2">K</th>
                  <th className="px-2">L</th>
                  <th className="px-2">M</th>
                  <th className="px-2">N</th>
                </tr>
                {/* Actual Labels Header Row */}
                <tr className="bg-slate-50/70 text-slate-600 font-bold border-b border-slate-200 divide-x divide-slate-200 select-none text-[11px] h-8">
                  <th className="w-10 text-center text-slate-400 font-mono text-3xs bg-slate-100 border-r border-slate-200">#</th>
                  <th className="px-3 min-w-[105px]">รหัสสินค้า (SKU)</th>
                  <th className="px-3 min-w-[240px]">ชื่อวัสดุ / อุปกรณ์ก่อสร้าง</th>
                  <th className="px-3 min-w-[130px]">หมวดหมู่พัสดุ</th>
                  <th className="px-3 min-w-[100px]">คลังย่อยจัดเก็บ</th>
                  <th className="px-3 min-w-[100px]">พิกัดชั้นจัดเก็บ</th>
                  <th className="px-3 text-right min-w-[110px]">ราคาทุนจริง (Cost)</th>
                  <th className="px-3 text-right min-w-[110px]">ราคากลาง BOQ</th>
                  <th className="px-3 text-right min-w-[100px]">สต๊อกจริงคงเหลือ</th>
                  <th className="px-3 text-center min-w-[65px]">หน่วยนับ</th>
                  <th className="px-3 text-right min-w-[90px]">จุดเตือนสั่งซื้อ</th>
                  <th className="px-3 min-w-[140px]">ผู้จำหน่ายล่าสุด</th>
                  <th className="px-3 min-w-[95px]">วันหมดอายุเคมี</th>
                  <th className="px-3 text-center min-w-[130px]">สถานะแจ้งเตือน</th>
                  <th className="px-3 text-center min-w-[95px]">แผงคำสั่ง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="py-16 text-center text-slate-400 font-medium">
                      ไม่พบวัสดุที่ค้นหาในระบบคลัง กรุณาลองปรับเปลี่ยนตัวกรองค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isLow = item.stockLeft <= item.minStock;
                    
                    // Expiry calculation
                    let isExpiringSoon = false;
                    let daysToExpiry = 0;
                    if (item.expiryDate) {
                      const exp = new Date(item.expiryDate);
                      const diffTime = exp.getTime() - currentDate.getTime();
                      daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      isExpiringSoon = daysToExpiry > 0 && daysToExpiry <= 90;
                    }

                    const isRowSelected = activeRowIdx === idx;

                    return (
                      <tr 
                        key={item.sku}
                        onClick={() => setActiveRowIdx(idx)}
                        className={`transition-all duration-100 hover:bg-slate-100/70 border-b border-rose-50/5 min-h-[38px] ${isRowSelected ? 'bg-blue-50/40' : ''}`}
                      >
                        {/* Row Index Number Column (Google Sheets style row headers) */}
                        <td className="w-10 bg-slate-50 text-center text-slate-400 font-mono text-[10px] border-r border-slate-200 font-bold select-none">
                          {idx + 2}
                        </td>

                        {/* Col A: SKU */}
                        <td 
                          onClick={() => { setActiveRowIdx(idx); setActiveColIndex('A'); }}
                          className={`px-3 py-2 font-mono text-3xs font-semibold text-slate-700 truncate cursor-cell border-r border-slate-100 ${isRowSelected && activeColIndex === 'A' ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-50/5' : ''}`}
                        >
                          {item.sku}
                        </td>

                        {/* Col B: Name */}
                        <td 
                          onClick={() => { setActiveRowIdx(idx); setActiveColIndex('B'); }}
                          className={`px-3 py-2 font-bold text-slate-800 text-xs cursor-cell border-r border-slate-100 ${isRowSelected && activeColIndex === 'B' ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-50/5' : ''}`}
                          title={item.name}
                        >
                          {item.name}
                        </td>

                        {/* Col C: Category */}
                        <td 
                          onClick={() => { setActiveRowIdx(idx); setActiveColIndex('C'); }}
                          className={`px-3 py-2 text-slate-500 cursor-cell border-r border-slate-100 ${isRowSelected && activeColIndex === 'C' ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-50/5' : ''}`}
                        >
                          {item.category}
                        </td>

                        {/* Col D: Warehouse */}
                        <td 
                          onClick={() => { setActiveRowIdx(idx); setActiveColIndex('D'); }}
                          className={`px-3 py-2 text-slate-600 font-medium cursor-cell border-r border-slate-100 ${isRowSelected && activeColIndex === 'D' ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-50/5' : ''}`}
                        >
                          {warehouses.find(w => w.id === item.warehouseId)?.name.split(' ')[0] || item.warehouseId}
                        </td>

                        {/* Col E: Location */}
                        <td 
                          onClick={() => { setActiveRowIdx(idx); setActiveColIndex('E'); }}
                          className={`px-3 py-2 font-mono text-3xs text-slate-500 text-center cursor-cell border-r border-slate-100 ${isRowSelected && activeColIndex === 'E' ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-50/5' : ''}`}
                        >
                          {item.storageLocation || '-'}
                        </td>

                        {/* Col F: Cost Price */}
                        <td 
                          onClick={() => { setActiveRowIdx(idx); setActiveColIndex('F'); }}
                          className={`px-3 py-2 text-right font-mono text-xs cursor-cell border-r border-slate-100 ${isRowSelected && activeColIndex === 'F' ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-50/5' : ''}`}
                        >
                          {canViewCost ? `฿${item.costPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
                        </td>

                        {/* Col G: Standard Price */}
                        <td 
                          onClick={() => { setActiveRowIdx(idx); setActiveColIndex('G'); }}
                          className={`px-3 py-2 text-right font-mono text-xs cursor-cell border-r border-slate-100 ${isRowSelected && activeColIndex === 'G' ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-50/5' : ''}`}
                        >
                          ฿{item.standardPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Col H: Stock Left */}
                        <td 
                          onClick={() => { setActiveRowIdx(idx); setActiveColIndex('H'); }}
                          className={`px-3 py-2 text-right cursor-cell border-r border-slate-100 ${isRowSelected && activeColIndex === 'H' ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-50/5' : ''}`}
                        >
                          <span className={`font-mono text-xs font-bold ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
                            {item.stockLeft.toLocaleString()}
                          </span>
                        </td>

                        {/* Col I: Unit */}
                        <td 
                          onClick={() => { setActiveRowIdx(idx); setActiveColIndex('I'); }}
                          className={`px-3 py-2 text-center text-slate-500 font-medium cursor-cell border-r border-slate-100 ${isRowSelected && activeColIndex === 'I' ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-50/5' : ''}`}
                        >
                          {item.unit}
                        </td>

                        {/* Col J: Min Stock */}
                        <td 
                          onClick={() => { setActiveRowIdx(idx); setActiveColIndex('J'); }}
                          className={`px-3 py-2 text-right font-mono text-slate-500 text-xs cursor-cell border-r border-slate-100 ${isRowSelected && activeColIndex === 'J' ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-50/5' : ''}`}
                        >
                          {item.minStock.toLocaleString()}
                        </td>

                        {/* Col K: Supplier */}
                        <td 
                          onClick={() => { setActiveRowIdx(idx); setActiveColIndex('K'); }}
                          className={`px-3 py-2 text-slate-600 truncate max-w-[120px] cursor-cell border-r border-slate-100 ${isRowSelected && activeColIndex === 'K' ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-50/5' : ''}`}
                          title={item.latestSupplier}
                        >
                          {item.latestSupplier || '-'}
                        </td>

                        {/* Col L: Expiry Date */}
                        <td 
                          onClick={() => { setActiveRowIdx(idx); setActiveColIndex('L'); }}
                          className={`px-3 py-2 font-mono text-3xs text-slate-500 cursor-cell border-r border-slate-100 ${isRowSelected && activeColIndex === 'L' ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-50/5' : ''}`}
                        >
                          {item.expiryDate || '-'}
                        </td>

                        {/* Col M: Status Alert Signals */}
                        <td className="px-3 py-2 text-center border-r border-slate-100">
                          {isLow ? (
                            <span className="text-[10px] text-red-700 font-bold bg-red-50/90 px-2 py-0.5 rounded border border-red-200 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 block animate-ping shrink-0"></span>
                              ต่ำกว่าจุดวิกฤต 🚨
                            </span>
                          ) : isExpiringSoon ? (
                            <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-250 inline-flex items-center gap-1">
                              เหลือ {daysToExpiry} วัน ⏳
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-250 inline-flex items-center gap-1">
                              ปกติ (Safe) ✓
                            </span>
                          )}
                        </td>

                        {/* Col N: Quick Action Pane */}
                        <td className="px-2 py-1 text-center select-none">
                          <div className="flex items-center justify-center gap-0.5">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedQrCodeItem(item); }}
                              className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600 transition-all cursor-pointer"
                              title="ดูบาร์โค้ดสติกเกอร์"
                            >
                              <QrCode className="h-3.5 w-3.5" />
                            </button>
                            {canAddEdit && (
                              <>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleOpenEditModal(item); }}
                                  className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition-all cursor-pointer"
                                  title="แก้ไขวัสดุสินค้า"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`คุณมั่นใจที่จะลบสินค้า SKU: ${item.sku} ชื่อ: ${item.name} ออกจากระบบ?`)) {
                                      onDeleteItem(item.sku);
                                    }
                                  }}
                                  className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-rose-600 transition-all cursor-pointer"
                                  title="ลบรายงาน"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
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

          {/* Spreadsheet Status Footer */}
          <div className="bg-[#f8f9fa] border-t border-slate-200 px-4 py-2 flex items-center justify-between text-4xs font-sans text-slate-500">
            <div>
              <span>สถานะแผ่นงาน: </span>
              <span className="text-slate-800 font-bold font-mono">READY</span> | ผลรวมมูลค่าราคากลางคลัง (BOQ Active): <span className="text-emerald-600 font-bold font-mono">฿{filteredItems.reduce((acc, curr) => acc + curr.stockLeft * curr.standardPrice, 0).toLocaleString()}</span>
              {canViewCost && (
                <>
                  <span className="mx-2">|</span>
                  <span>ผลรวมมูลค่าราคาทุนจริง: <span className="text-blue-600 font-bold font-mono">฿{filteredItems.reduce((acc, curr) => acc + curr.stockLeft * curr.costPrice, 0).toLocaleString()}</span></span>
                </>
              )}
            </div>
            <div>
              <span>แผ่นที่ 1 (Inventory_Storage)</span>
            </div>
          </div>
        </div>
      ) : (
        /* Grid: Material Catalog with premium cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" id="inventory-items-grid">
          {filteredItems.length === 0 ? (
            <div className="col-span-full py-16 bg-white border border-slate-100 rounded-xl text-center space-y-3">
              <PackageSearch className="h-10 w-10 text-slate-300 mx-auto" />
              <div>
                <p className="text-sm font-semibold text-slate-800">ไม่พบวัสดุที่ค้นหาในคลังนี้</p>
                <p className="text-xs text-slate-500">กรุณาลองเปลี่ยนคำค้นหา คลังผู้จัดเก็บ หรือสร้างผลิตภัณฑ์ใหม่</p>
              </div>
              {canAddEdit && (
                <button 
                  onClick={handleOpenAddModal}
                  className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> สร้างผลิตภัณฑ์สินค้าชิ้นแรก
                </button>
              )}
            </div>
          ) : (
            filteredItems.map(item => {
              const isLow = item.stockLeft <= item.minStock;
              
              // Expiry alarm logic
              let isExpiringSoon = false;
              let daysToExpiry = 0;
              if (item.expiryDate) {
                const exp = new Date(item.expiryDate);
                const diffTime = exp.getTime() - currentDate.getTime();
                daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                isExpiringSoon = daysToExpiry > 0 && daysToExpiry <= 90;
              }

              return (
                <div 
                  key={item.sku} 
                  className={`bg-white rounded-xl shadow-2xs border transition-all duration-200 hover:shadow-xs flex flex-col justify-between ${
                    isLow ? 'border-rose-150 ring-1 ring-rose-500/5' : 
                    isExpiringSoon ? 'border-amber-150 ring-1 ring-amber-500/5' :
                    'border-slate-100 hover:border-slate-300'
                  }`}
                  id={`item-card-${item.sku}`}
                >
                  {/* Image & Head */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-1.5">
                      <div>
                        <span className="text-4xs font-bold text-slate-400 bg-slate-100/90 px-1.5 py-0.5 rounded-xs uppercase tracking-wider font-mono">
                          {item.sku}
                        </span>
                        <span className="text-4xs font-semibold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-xs ml-1 font-mono">
                          {warehouses.find(w => w.id === item.warehouseId)?.name.split(' ')[0] || item.warehouseId}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* QR View trigger */}
                        <button 
                          onClick={() => setSelectedQrCodeItem(item)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all cursor-pointer"
                          title="ดูฉลากและ Barcode"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                        
                        {canAddEdit && (
                          <>
                            <button 
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all cursor-pointer"
                              title="แก้ไขสินค้า"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm(`คุณมั่นใจที่จะลบสินค้า SKU: ${item.sku} ชื่อ: ${item.name} ออกจากระบบ?`)) {
                                  onDeleteItem(item.sku);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
                              title="ลบสินค้า"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-2 min-h-[32px]" title={item.name}>
                        {item.name}
                      </h4>
                      <p className="text-3xs text-slate-400 mt-0.5 flex items-center gap-1 font-sans">
                        <span>{item.category}</span>
                        <span>•</span>
                        <span>สต๊อกต่ำสุด {item.minStock} {item.unit}</span>
                      </p>
                    </div>

                    {/* Stock Status Progress & Visuals */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between items-baseline text-2xs">
                        <span className="text-slate-500">สต๊อกจริงคงคลัง :</span>
                        <span>
                          <span className={`font-mono font-bold text-sm ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
                            {item.stockLeft}
                          </span>
                          <span className="text-slate-400 font-medium ml-1">{item.unit}</span>
                        </span>
                      </div>

                      {/* Stock level bar indicator */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${isLow ? 'bg-rose-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min((item.stockLeft / (item.minStock * 3)) * 100, 100)}%` }}
                        ></div>
                      </div>

                      {isLow && (
                        <span className="text-4xs text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded-xs inline-flex items-center gap-0.5">
                          <AlertOctagon className="h-2.5 w-2.5 shrink-0" />
                          สินค้าต่ำกว่าเซฟตี้สต๊อกแล้ว!
                        </span>
                      )}

                      {isExpiringSoon && (
                        <span className="text-4xs text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded-xs inline-flex items-center gap-0.5">
                          <Calendar className="h-2.5 w-2.5 shrink-0" />
                          ใกล้หมดอายุใน {daysToExpiry} วัน
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pricing and vendor footer */}
                  <div className="bg-slate-50 p-3.5 rounded-b-xl border-t border-slate-100 flex items-center justify-between text-4xs">
                    <div>
                      <span className="text-slate-400 block font-sans">ราคาจัดซื้อ (Cost)</span>
                      <span className="text-slate-700 font-semibold font-mono text-xs">
                        {canViewCost ? `฿${item.costPrice.toLocaleString()}` : '••••••'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block font-sans">ราคากลาง BOQ</span>
                      <span className="text-slate-700 font-semibold font-mono text-xs">
                        ฿{item.standardPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL 1: Add or Edit Item */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="modal-add-edit">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-lg w-full max-h-[90vh] flex flex-col justify-between">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingItem ? '✏️ แก้ไขข้อมูลวัสดุในคลัง' : '📦 เพิ่มรายการวัสดุใหม่เข้าระบบ'}
              </h3>
              <button 
                onClick={() => setIsAddEditModalOpen(false)}
                className="p-1 px-1.5 bg-slate-50 rounded-md hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                {/* SKU Code */}
                <div>
                  <label className="text-3xs font-bold text-slate-500 uppercase block mb-1">รหัสสินค้า (SKU) <span className="text-red-500">*</span></label>
                  <input 
                    type="text"
                    required
                    disabled={!!editingItem}
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 disabled:opacity-60 focus:outline-hidden"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-3xs font-bold text-slate-500 uppercase block mb-1">หมวดหมู่งานก่อสร้าง <span className="text-red-500">*</span></label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden cursor-pointer"
                  >
                    <option value="งานโครงสร้าง">งานโครงสร้าง (Concrete & Steel)</option>
                    <option value="งานไฟฟ้า">งานไฟฟ้าส่องสว่าง (Electrical System)</option>
                    <option value="งานสุขาภิบาล">งานประปาสุขาภิบาล (Plumbing)</option>
                    <option value="งานตกแต่งผิว">งานสถาปัตย์ตกแต่ง (Finishing)</option>
                    <option value="งานชั่วคราว">งานชั่วคราวย่อย (Temporary)</option>
                  </select>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-3xs font-bold text-slate-500 uppercase block mb-1">ชื่อเรียกวัสดุมาตรฐาน <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  required
                  placeholder="ตัวอย่าง: เหล็กกล่อง มอก. ขนาด 3x3 นิ้ว แท้"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* Unit */}
                <div>
                  <label className="text-3xs font-bold text-slate-500 uppercase block mb-1">หน่วยนับ</label>
                  <input 
                    type="text"
                    required
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
                  />
                </div>

                {/* Stock Left */}
                <div>
                  <label className="text-3xs font-bold text-slate-500 uppercase block mb-1">จำนวนตั้งต้นสต๊อก <span className="text-red-500">*</span></label>
                  <input 
                    type="number"
                    min="0"
                    required
                    value={formStockLeft}
                    onChange={(e) => setFormStockLeft(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden font-mono"
                  />
                </div>

                {/* Safe Min Stock */}
                <div>
                  <label className="text-3xs font-bold text-slate-500 uppercase block mb-1">จุดเตือนสต๊อกต่ำ <span className="text-red-500">*</span></label>
                  <input 
                    type="number"
                    min="1"
                    required
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Cost Price */}
                <div>
                  <label className="text-3xs font-bold text-slate-500 uppercase block mb-1">ราคาทุนจริงผู้จัดหา (บาท)</label>
                  <input 
                    type="number"
                    min="0"
                    required
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-80 dependence-cost font-mono text-slate-800 focus:outline-hidden"
                  />
                </div>

                {/* Standard Price */}
                <div>
                  <label className="text-3xs font-bold text-slate-500 uppercase block mb-1">ราคากลางประเมิน BOQ (บาท)</label>
                  <input 
                    type="number"
                    min="0"
                    required
                    value={formStandardPrice}
                    onChange={(e) => setFormStandardPrice(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Safe warehouse coordinate */}
                <div>
                  <label className="text-3xs font-bold text-slate-500 uppercase block mb-1">พิกัดชั้นวาง/ตู้เก็บ</label>
                  <input 
                    type="text"
                    placeholder="เช่น Zone B2-R1"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden"
                  />
                </div>

                {/* Warehouse code */}
                <div>
                  <label className="text-3xs font-bold text-slate-500 uppercase block mb-1">คลังจัดเก็บหลัก</label>
                  <select
                    value={formWarehouse}
                    onChange={(e) => setFormWarehouse(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden cursor-pointer"
                  >
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Expiry limit */}
                <div>
                  <label className="text-3xs font-bold text-slate-500 uppercase block mb-1">วันหมดอายุสารเคมี (ถ้ามี)</label>
                  <input 
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden font-mono"
                  />
                </div>

                {/* Supplier */}
                <div>
                  <label className="text-3xs font-bold text-slate-500 uppercase block mb-1">ผู้ค้าวัสดุSupplierล่าสุด</label>
                  <input 
                    type="text"
                    placeholder="เช่น SCG Retail Co."
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-end gap-2 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  บันทึกลงฐานข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Excel / CSV Importer */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="modal-import-csv">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> นำเข้าข้อมูลวัสดุผ่านโครงสร้าง CSV
              </h3>
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 px-1.5 bg-slate-50 rounded-md hover:bg-slate-100 text-slate-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-3xs text-slate-500">
              <p>กรุณาวางเนื้อหาข้อมูลแยกด้วยจุลภาค (Comma Seeded) ของข้อมูลวัสดุใหม่ตามลำดับ คอลัมน์ดังนี้:</p>
              <div className="bg-slate-50 p-2.5 rounded-lg font-mono text-[10px] break-all border border-slate-200 select-all overflow-x-auto">
                {"รหัส(SKU),ชื่อวัสดุ,หมวดหมู่,หน่วยนับ,ทุนจริง,ราคากลาง,คงเหลือคลัง,จุดสั่งซื้อต่ำสุด,คู่ค้า,แถวจัดเก็บ,รหัสคลัง,วันหมดอายุ\n"}
                {"CON-003,ทรายก่อสร้างคิวใหญ่,งานโครงสร้าง,คิว,550,600,10,2,โฮมเซ็นเตอร์,WH01-G5,WH01,"}
              </div>
              <p className="text-amber-600 font-bold">⚠️ รหัสสินค้า (SKU) ซ้ำ ระบบจะทำการเขียนทับยอดข้อมูเดิม</p>
            </div>

            <form onSubmit={handleCsvImport} className="space-y-4">
              <textarea 
                rows={6}
                required
                placeholder="วางแถวข้อมูล CSV ตรงนี้โดยจำกัดบรรทัดแรกเป็น Header ประจำหมวด"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-2xs font-mono text-slate-700 focus:outline-hidden"
              />

              {importStatus && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-3xs font-semibold rounded-lg text-center animate-bounce">
                  {importStatus}
                </div>
              )}

              <div className="flex justify-between items-center shrink-0">
                <a 
                  href="data:text/csv;charset=utf-8,%EF%BB%BF%E0%B8%A3%E0%B8%AB%E0%B8%B1%E0%B8%AA(SKU)%2C%E0%B8%8A%E0%B8%B4%E0%B9%89%E0%B8%99%E0%B8%AA%E0%B9%8B%E0%B8%A7%E0%B8%99%E0%B8%A7%E0%B8%B1%E0%B8%AA%E0%B8%94%E0%B8%B8%2C%E0%B8%AB%E0%B8%A1%E0%B8%A7%E0%B8%94%E0%B8%AB%E0%B8%A1%E0%B8%B9%E0%B9%88%2C%E0%B8%AB%E0%B8%99%E0%B9%88%E0%B8%A7%E0%B8%A2%E0%B8%99%E0%B8%B1%E0%B8%9A%2C%E0%B8%A3%E0%B8%B2%E0%B8%82%E0%B8%B2%E0%B8%97%E0%B8%B8%E0%B8%99%E0%B8%88%E0%B8%A3%E0%B8%B4%E0%B8%87%2C%E0%B8%A3%E0%B8%B2%E0%B8%82%E0%B8%B2BOQ%E0%B8%81%E0%B8%A5%E0%B8%B2%E0%B8%87%2C%E0%B8%AA%E0%B8%95%E0%B9%8๊%E0%B8%AD%E0%B8%81%E0%B8%84%E0%B8%87%E0%B9%80%E0%B8%AB%E0%B8%A5%E0%B8%B7%E0%B8%AD%2C%E0%B8%88%E0%B8%B8%E0%B8%94%E0%B8%AA%E0%B8%B1%E0%B9%88%E0%B8%87%E0%B8%8B%E0%B8%B7%E0%B9%89%E0%B8%AD%2C%E0%B8%84%E0%B8%B9%E0%B9%88%E0%B8%84%E0%B9%89%E0%B8%B2%2C%E0%B8%9E%E0%B8%Bิ%E0%B8%81%E0%B8%B1%E0%B8%94%2C%E0%B8%A3%E0%B8%AB%E0%B8%B1%E0%B8%AA%E0%B8%84%E0%B8%A5%E0%B8%B1%E0%B8%87%2C%E0%B8%A7%E0%B8%B1%E0%B8%99%E0%B8%AB%E0%B8%A1%E0%B8%94%E0%B8%AD%E0%B8%B2%E0%B8%A2%E0%B8%B8%0ACON-010%2C%E0%B8%AB%E0%B8%B4%E0%B8%99%E0%B8%84%E0%B8%A5%E0%B8%B8%E0%B8%81%E0%B8%81%E0%B9%88%E0%B8%AD%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%2C%E0%B8%87%E0%B8%B2%E0%B8%99%E0%B9%82%E0%B8%84%E0%B8%A3%E0%B8%87%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87%2C%E0%B8%84%E0%B8%B4%E0%B8%A7%2C420%2C450%2C200%2C20%2CTATA%20Materials%2CWH01-G9%2CWH01%2C"
                  download="Template_Inventory_Import.csv"
                  className="text-3xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Download className="h-3.5 w-3.5" /> โหลดไฟล์ตัวอย่างสำเร็จรูป
                </a>

                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    ปิด
                  </button>
                  <button 
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    นำข้อมูลลงระบบ
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: QR Code & Detailed Product Barcode Label */}
      {selectedQrCodeItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50" id="modal-qr-display">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5 text-center relative border border-slate-100">
            <button 
              onClick={() => setSelectedQrCodeItem(null)}
              className="absolute top-4 right-4 p-1 bg-slate-50 rounded-md hover:bg-slate-100 text-slate-400 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div>
              <h3 className="text-sm font-bold text-slate-900">ป้ายสติกเกอร์คิวอาร์โค้ดประจำสินค้า</h3>
              <p className="text-4xs text-slate-400">สำหรับติดข้างกล่อง/เหล็กโครงสร้าง ปริ้นท์สแกนด้วย Mobile Scanner ได้ทันที</p>
            </div>

            {/* Simulated Label Visual Card (Premium Design) */}
            <div className="bg-white border-2 border-dashed border-slate-200 p-5 rounded-xl space-y-4 flex flex-col items-center">
              <span className="text-4xs tracking-widest text-slate-400 uppercase">CargoBOQ Smart Label System</span>
              
              {/* QR Code generator box */}
              <div className="h-40 w-40 bg-gradient-to-tr from-slate-50 to-slate-100 border border-slate-200 rounded-xl flex items-center justify-center relative p-3">
                {/* Visual Custom QR code simulation using pixels inside SVG */}
                <svg className="w-full h-full text-slate-800" viewBox="0 0 100 100">
                  {/* Outer borders and positioning boxes */}
                  <rect x="5" y="5" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                  <rect x="11" y="11" width="13" height="13" fill="currentColor" />
                  <rect x="70" y="5" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                  <rect x="76" y="11" width="13" height="13" fill="currentColor" />
                  <rect x="5" y="70" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                  <rect x="11" y="76" width="13" height="13" fill="currentColor" />
                  
                  {/* Center branding */}
                  <rect x="42" y="42" width="16" height="16" fill="currentColor" rx="2" />
                  <circle cx="50" cy="50" r="3" fill="white" />

                  {/* Random pixels around to simulate code block */}
                  <rect x="35" y="10" width="8" height="5" fill="currentColor" />
                  <rect x="52" y="7" width="5" height="11" fill="currentColor" />
                  <rect x="45" y="25" width="12" height="6" fill="currentColor" />
                  <rect x="12" y="40" width="15" height="4" fill="currentColor" />
                  <rect x="15" y="50" width="8" height="9" fill="currentColor" />
                  <rect x="80" y="40" width="12" height="7" fill="currentColor" />
                  <rect x="75" y="58" width="14" height="6" fill="currentColor" />
                  <rect x="40" y="72" width="15" height="5" fill="currentColor" />
                  <rect x="58" y="80" width="8" height="12" fill="currentColor" />
                  <rect x="42" y="62" width="8" height="6" fill="currentColor" />
                </svg>
              </div>

              {/* Barcode visual underneath */}
              <div className="space-y-1 w-full text-center">
                <div className="flex justify-center gap-0.5 h-6 w-full max-w-[200px] mx-auto overflow-hidden">
                  {[1,3,1,2,4,1,3,2,1,1,3,2,4,1,1,2,3,1,1,4,2,1,1,3,1,2].map((w, idx) => (
                    <div 
                      key={idx} 
                      className={`h-full bg-slate-800 shrink-0 ${
                        w === 1 ? 'w-0.5' : 
                        w === 2 ? 'w-1' : 
                        w === 3 ? 'w-1.5' : 'w-2'
                      }`}
                    ></div>
                  ))}
                </div>
                <span className="text-3xs font-mono font-bold tracking-widest text-slate-700 block uppercase">
                  *{selectedQrCodeItem.sku}*
                </span>
              </div>

              {/* Tag information details */}
              <div className="text-left w-full border-t border-slate-100 pt-2.5 space-y-1 text-2xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">วัสดุ:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[200px]">{selectedQrCodeItem.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ประเภท:</span>
                  <span className="text-slate-600 font-semibold">{selectedQrCodeItem.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ขนาด / บรรจุ:</span>
                  <span className="text-slate-600 font-mono font-bold">1 {selectedQrCodeItem.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">คลังเก็บสินค้า:</span>
                  <span className="text-slate-600 font-semibold">Zone {selectedQrCodeItem.storageLocation} ({selectedQrCodeItem.warehouseId})</span>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-1.5">
              <button 
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                🖨️ สั่งปริ้นท์ป้ายสติกเกอร์
              </button>
              <button 
                onClick={() => setSelectedQrCodeItem(null)}
                className="px-4 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg text-xs font-semibold cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
