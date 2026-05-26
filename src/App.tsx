/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  UserRole, 
  InventoryItem, 
  Project, 
  BOQ, 
  BOQItem,
  Transaction, 
  AuditLog, 
  LineNotification 
} from './types';
import { 
  ROLE_PERMISSIONS, 
  INITIAL_WAREHOUSES, 
  INITIAL_ITEMS, 
  INITIAL_PROJECTS, 
  INITIAL_BOQS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_LINE_MESSAGES 
} from './data';

// Component Imports
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Projects from './components/Projects';
import Transactions from './components/Transactions';
import MobileScanner from './components/MobileScanner';
import LineSimulator from './components/LineSimulator';
import AuditLogs from './components/AuditLogs';
import AIForecasting from './components/AIForecasting';
import ProjectBOQReports from './components/ProjectBOQReports';

// Icons
import { 
  LayoutDashboard, 
  Boxes, 
  Building2, 
  ArrowLeftRight, 
  QrCode, 
  MessageSquare, 
  Terminal, 
  BrainCircuit, 
  User, 
  Users, 
  Menu, 
  X, 
  Info,
  Layers,
  Sparkles,
  Sun,
  Moon,
  Laptop,
  Bell,
  Search,
  ChevronsLeft,
  ChevronsRight,
  PlusCircle,
  ArrowUpRight,
  HelpCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<string>('dash');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('cargoboq_sidebar_collapsed');
    return saved === 'true';
  });

  // Enterprise Themes System: 'light' | 'dark' | 'auto'
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>(() => {
    const saved = localStorage.getItem('cargoboq_theme');
    return (saved as any) || 'light';
  });
  const [isSystemDark, setIsSystemDark] = useState(false);

  // Global Search & Notification Panel
  const [globalSearch, setGlobalSearch] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(true);

  // System Dark preference tracker
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    setIsSystemDark(media.matches);
    const handler = (e: MediaQueryListEvent) => setIsSystemDark(e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const isDark = theme === 'dark' || (theme === 'auto' && isSystemDark);

  useEffect(() => {
    localStorage.setItem('cargoboq_theme', theme);
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [theme, isDark]);

  useEffect(() => {
    localStorage.setItem('cargoboq_sidebar_collapsed', isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);

  // Core Persistent State
  const [items, setItems] = useState<InventoryItem[]>(() => {
    const local = localStorage.getItem('cargoboq_items');
    return local ? JSON.parse(local) : INITIAL_ITEMS;
  });
  
  const [projects, setProjects] = useState<Project[]>(() => {
    const local = localStorage.getItem('cargoboq_projects');
    return local ? JSON.parse(local) : INITIAL_PROJECTS;
  });

  const [boqs, setBoqs] = useState<BOQ[]>(() => {
    const local = localStorage.getItem('cargoboq_boqs');
    return local ? JSON.parse(local) : INITIAL_BOQS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const local = localStorage.getItem('cargoboq_transactions');
    return local ? JSON.parse(local) : INITIAL_TRANSACTIONS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const local = localStorage.getItem('cargoboq_audit_logs');
    return local ? JSON.parse(local) : INITIAL_AUDIT_LOGS;
  });

  const [lineNotifications, setLineNotifications] = useState<LineNotification[]>(() => {
    const local = localStorage.getItem('cargoboq_line_notifications');
    return local ? JSON.parse(local) : INITIAL_LINE_MESSAGES;
  });

  // Role Permissions
  const [currentRole, setCurrentRole] = useState<UserRole>('Super Admin');
  const [currentUserName, setCurrentUserName] = useState('สุรวุฒิ สิทธิโกศล');

  // Scanner parameter bridge
  const [scannedSkuTarget, setScannedSkuTarget] = useState<string | null>(null);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('cargoboq_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('cargoboq_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('cargoboq_boqs', JSON.stringify(boqs));
  }, [boqs]);

  useEffect(() => {
    localStorage.setItem('cargoboq_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('cargoboq_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('cargoboq_line_notifications', JSON.stringify(lineNotifications));
  }, [lineNotifications]);

  // Adjust current mock username based on role 선택
  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    switch (role) {
      case 'Super Admin':
        setCurrentUserName('สุรวุฒิ สิทธิโกศล');
        break;
      case 'Admin':
        setCurrentUserName('เกรียงไกร ชนะธรรม');
        break;
      case 'Store Manager':
        setCurrentUserName('สิทธิเจริญ พิทักษ์คลัง');
        break;
      case 'Project Manager':
        setCurrentUserName('สมศักดิ์ รักไทย');
        break;
      case 'Accounting':
        setCurrentUserName('ปิยะมาศ การเงินดี');
        break;
      case 'Approver':
        setCurrentUserName('ศิริชัย อนุมัติวาณิช');
        break;
      case 'Employee':
        setCurrentUserName('สมชาย ช่างเขียน');
        break;
    }
    
    // Log change activity
    addAuditLog(`เปลี่ยนสิทธิ์ทดสอบระบบเป็น ${role}`);
  };

  // Add Action Logging
  const addAuditLog = (desc: string) => {
    const newLog: AuditLog = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      user: `${currentUserName} (${currentRole})`,
      role: currentRole,
      action: desc,
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.1.55',
      device: 'Chrome v125 / Windows 11'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Handler helpers
  const handleAddItem = (item: InventoryItem) => {
    setItems(prev => [item, ...prev]);
    addAuditLog(`เพิ่มหมวดรายการวัสดุชิ้นใหม่: [${item.sku}] ${item.name}`);

    // Check near expiry or low stock warning right away
    if (item.stockLeft <= item.minStock) {
      pushLineNotification('LOW_STOCK', `🚨 สัญญานเตือนของใกล้หมดคลัง!\nสินค้ากล่องเตือน: [${item.sku}] ${item.name}\nจำนวนเหลือ: ${item.stockLeft} ${item.unit} (จุดย่อยปลอดภัยที่ตั้งค่า: ${item.minStock} ${item.unit})`);
    }
  };

  const handleUpdateItem = (sku: string, updated: InventoryItem) => {
    setItems(prev => prev.map(item => item.sku === sku ? updated : item));
    addAuditLog(`แก้ไขอัปเดตรายละเอียดวัสดุในคลัง: [${sku}] ${updated.name}`);
  };

  const handleDeleteItem = (sku: string) => {
    setItems(prev => prev.filter(item => item.sku !== sku));
    addAuditLog(`ลบสินค้าวัสดุวิศวกรรมออกจากระบบ: SKU ${sku}`);
  };

  const handleBulkImport = (importedItems: InventoryItem[]) => {
    setItems(prev => {
      // Overwrite if SKU exists, otherwise append
      const prevMap = new Map(prev.map(i => [i.sku, i]));
      importedItems.forEach(item => prevMap.set(item.sku, item));
      return Array.from(prevMap.values());
    });
    addAuditLog(`นำเข้าไฟล์สินค้าอัพเดตแบบกลุ่มจำนวน ${importedItems.length} รายการ`);
  };

  const handleAddProject = (project: Project) => {
    setProjects(prev => [project, ...prev]);
    addAuditLog(`เปิดสัญญากลั่นกรองโปรเจกต์งานก่อสร้างใหม่: ${project.name} (${project.code})`);
  };

  const handleAddBOQ = (boq: BOQ) => {
    setBoqs(prev => [boq, ...prev]);
    addAuditLog(`สร้างเล่ม BOQ คุมงวดงานก่อสร้าง: [${boq.code}] ${boq.name}`);
  };

  const handleImportBOQItems = (boqId: string, importedBOQItems: BOQItem[]) => {
    setBoqs(prev => prev.map(boq => {
      if (boq.id === boqId) {
        // Safe merge: if itemSku already exists, overwrite, else append
        const originalItemsMap = new Map<string, BOQItem>(boq.items.map(i => [i.itemSku, i]));
        importedBOQItems.forEach(item => {
          if (originalItemsMap.has(item.itemSku)) {
            const existing = originalItemsMap.get(item.itemSku)!;
            originalItemsMap.set(item.itemSku, {
              ...existing,
              quantityLimit: item.quantityLimit,
              standardPrice: item.standardPrice
            });
          } else {
            originalItemsMap.set(item.itemSku, item);
          }
        });

        return {
          ...boq,
          items: Array.from(originalItemsMap.values())
        };
      }
      return boq;
    }));
    addAuditLog(`ดาวน์โหลดนำเข้ารายการวัสดุโควตาเข้าเล่มสัญญางาน BOQ รหัสหลัก ${boqs.find(b => b.id === boqId)?.code}`);
  };

  // Push Live LINE Messaging Alerts
  const pushLineNotification = (type: 'RECEIVE' | 'ISSUE' | 'RETURN' | 'LOW_STOCK' | 'OVER_BOQ' | 'ADJUST', msg: string) => {
    const notify: LineNotification = {
      id: `LN-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
      type,
      message: msg,
      status: 'Sent'
    };
    setLineNotifications(prev => [notify, ...prev]);
  };

  // ----------------------------------------------------
  // IMPORTANT: Core Stock & BOQ Limit Operations Handler
  // ----------------------------------------------------
  const handleCommitTransaction = (tx: Transaction) => {
    // Add transaction to history list
    setTransactions(prev => [tx, ...prev]);

    // Track original quantities
    const itemSku = tx.itemSku;
    const qtyChange = tx.quantity; // positive for receive/return, negative for issue
    const matchedItem = items.find(i => i.sku === itemSku);
    const projName = projects.find(p => p.code === tx.projectCode)?.name || 'ทั่วไปย่อย';

    if (!matchedItem) return;

    // A. Modify actual stock level
    setItems(prev => prev.map(item => {
      if (item.sku === itemSku) {
        let finalStock = item.stockLeft;
        if (tx.type === 'RECEIVE') {
          finalStock += qtyChange;
        } else if (tx.type === 'ISSUE') {
          finalStock -= qtyChange; // Qty input is positive, we deduct for issue
        } else if (tx.type === 'RETURN') {
          finalStock += qtyChange; // Restoral add
        } else if (tx.type === 'ADJUST') {
          finalStock += qtyChange; // Qty change already signed (+/-)
        }
        
        // Safety low stock check on-the-fly
        if (finalStock <= item.minStock) {
          setTimeout(() => {
            pushLineNotification('LOW_STOCK', `🚨 ของเสี่ยงรันเอาท์ในสต๊อก!\nสินค้า: [${item.sku}] ${item.name}\nจำนวนเหลือจริง: ${finalStock} ${item.unit}\nจุดเตือนต่ำสุด: ${item.minStock} ${item.unit}`);
          }, 300);
        }

        return {
          ...item,
          stockLeft: Math.max(finalStock, 0)
        };
      }
      return item;
    }));

    // B. Modify linked BOQ matched items limits (Actual spent rates)
    if (tx.type === 'ISSUE' && tx.boqCode) {
      setBoqs(prev => prev.map(boq => {
        if (boq.code === tx.boqCode) {
          return {
            ...boq,
            items: boq.items.map(bi => {
              if (bi.itemSku === itemSku) {
                const totalUsed = bi.usedQuantity + qtyChange;
                
                // If this is an over-BOQ trigger line
                if (totalUsed > bi.quantityLimit) {
                  const overrunVolume = totalUsed - bi.quantityLimit;
                  setTimeout(() => {
                    pushLineNotification('OVER_BOQ', `⚠️ ตรวจพบการเบิกเกิน BOQ!\nโครงการ: ${projName}\nผู้เบิก: ${tx.requester}\nสินค้า: ${tx.itemName}\nจำนวนเบิกเพิ่ม: ${qtyChange} ${tx.unit}\nสถานะ: เบิกเกินโควตาผูกล่วงหน้าทั้งหมด ${overrunVolume} ${tx.unit} (คิดจริงเข้าต้นทุนโครงการ)`);
                  }, 500);
                }

                return {
                  ...bi,
                  usedQuantity: totalUsed
                };
              }
              return bi;
            })
          };
        }
        return boq;
      }));
    }

    // C. Decrease actual spend on RETURN to restore budget quota!
    if (tx.type === 'RETURN' && tx.boqCode) {
      setBoqs(prev => prev.map(boq => {
        if (boq.code === tx.boqCode) {
          return {
            ...boq,
            items: boq.items.map(bi => {
              if (bi.itemSku === itemSku) {
                return {
                  ...bi,
                  usedQuantity: Math.max(bi.usedQuantity - qtyChange, 0)
                };
              }
              return bi;
            })
          };
        }
        return boq;
      }));
    }

    // D. Log to Audit trail
    let logMsg = '';
    if (tx.type === 'RECEIVE') {
      logMsg = `ตรวจรับเข้าสินค้า [${tx.itemSku}] ${tx.itemName} จำนวน ${tx.quantity} ${tx.unit} เข้าคลัง`;
    } else if (tx.type === 'ISSUE') {
      logMsg = `เบิกจ่ายสับเปลี่ยนงวดวัสดุ [${tx.itemSku}] ${tx.itemName} จำนวน ${tx.quantity} ${tx.unit} ลงเขตโครงการ ${projName} (${tx.projectCode})`;
    } else if (tx.type === 'RETURN') {
      logMsg = `ส่งคืนวัสดุเหลือใช้นอกเศษกำไร [${tx.itemSku}] ${tx.itemName} จำนวน ${tx.quantity} ${tx.unit} จากโครงการ ${projName}`;
    } else if (tx.type === 'ADJUST') {
      logMsg = `ปรับปรุงยอดสต๊อกด้วยมือ [${tx.itemSku}] ${tx.itemName} ยอดเปลี่ยนแปลง ${tx.quantity} ${tx.unit}`;
    }

    addAuditLog(logMsg);
  };

  const handleScanResultBridge = (sku: string) => {
    setScannedSkuTarget(sku);
    setActiveTab('transactions');
    addAuditLog(`สแกนโค้ดสัญลักษณ์สำเร็จ รหัสคลังวัสดุ [${sku}] และระบบได้พาท่านเข้าสู่แบบฟอร์มเบิกจ่ายแบบอัตโนมัติ`);
  };

  // Extract Permission details for views
  const permission = ROLE_PERMISSIONS[currentRole] || ROLE_PERMISSIONS['Super Admin'];

  const breadcrumbs = getBreadcrumbs();

  function getBreadcrumbs() {
    const base = "ศูนย์พอร์ทัล";
    switch (activeTab) {
      case 'dash':
        return [base, "ภาพรวมระบบ (ERP Dashboard)", "รายงานงบและสต๊อกโครงการ"];
      case 'inventory':
        return [base, "วัสดุในคลัง (Inventory)", "พัสดุวัสดุก่อสร้างทั้งหมด บันทึกสะสมคลัง"];
      case 'projects':
        return [base, "บริหารกรอบสัญญา (Projects & BOQ)", "กรอบคุมวงเงินโครงการ"];
      case 'reports':
        return [base, "วิเคราะห์ระบบรายงาน (Reports Desk)", "รายงานโครงการและควบคุมงบ BOQ สด"];
      case 'transactions':
        return [base, "แบบฟอร์มนำส่ง (Log Forms)", "การเติมพัสดุและเบิกงวดวัสดุหน้างาน"];
      case 'scanner':
        return [base, "จำลองแอปกล้อง (Scanner)", "ระบบสแกนฉลากกล่องคิวอาร์"];
      case 'ai':
        return [base, "พยากรณ์อัจฉริยะ (AI Copilot)", "คำพยากรณ์ความปลอดภัยของคลัง"];
      case 'line':
        return [base, "แชร์สัญญาณโทรศัพท์", "ช่องส่งแชทจำลอง LINE Alerts"];
      case 'audit':
        return [base, "ศูนย์ข่าวความปลอดภัย", "ล็อกยืนยันการกระทำแอดมิน Audit Logs"];
      default:
        return [base];
    }
  }

  const searchResults = (() => {
    if (!globalSearch.trim()) return [];
    const q = globalSearch.toLowerCase();
    
    const matchedItems = items
      .filter(item => item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q) || item.category.toLowerCase().includes(q))
      .map(item => ({
        id: `it-${item.sku}`,
        title: item.name,
        subtitle: `SKU: ${item.sku} • ทำเลคลัง: ${item.storageLocation} • คงเหลือ: ${item.stockLeft} ${item.unit}`,
        category: 'วัสดุสต๊อกคลัง',
        tab: 'inventory'
      }));

    const matchedProjects = projects
      .filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.customer.toLowerCase().includes(q))
      .map(p => ({
        id: `pr-${p.id}`,
        title: p.name,
        subtitle: `รหัสแคมป์: ${p.code} • ผู้รับสิทธิ์ดูแล: ${p.supervisor}`,
        category: 'โครงการก่อสร้าง & BOQ',
        tab: 'projects'
      }));

    return [...matchedItems, ...matchedProjects].slice(0, 5);
  })();

  const handleSearchResultSelect = (result: any) => {
    setActiveTab(result.tab);
    setGlobalSearch('');
    setShowSearchResults(false);
    addAuditLog(`ใช้ช่องค้นหาอัจฉริยะนำทางไปเมนูข้อมูล [${result.title}]`);
  };

  const handleQuickAction = (tab: string, txType?: 'RECEIVE' | 'ISSUE' | 'RETURN') => {
    setActiveTab(tab);
    addAuditLog(`คลิกทางลัดการกระทำด่วน (Quick Action Shortcut): ${tab}${txType ? ` - ${txType}` : ''}`);
    // Special event bridge for transactions form
    if (txType) {
      setTimeout(() => {
        const btn = document.getElementById(`tx-tab-btn-${txType}`);
        if (btn) btn.click();
      }, 50);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200" id="applet-viewport">
      
      {/* Dynamic Unified Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-850 text-white shrink-0 sticky top-0 z-40 shadow-md">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          
          {/* Left section: Hamburger + Brand Title */}
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger menu */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:text-white cursor-pointer"
              id="mobile-menu-trigger"
            >
              {isMobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>

            {/* Logo Brand */}
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-orange-600/10 font-black text-sm tracking-wider text-orange-555 text-orange-450 border border-orange-500/30 flex items-center justify-center select-none shadow-inner">
                CB
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-bold flex items-center gap-1.5 leading-none">
                  <span>CargoBOQ Enterprise</span>
                  <span className="bg-blue-500/20 text-orange-450 text-orange-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-orange-500/20">PRO v4.5</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 font-sans block">ระบบบริการคลังพัสดุรับเหมาและวิเคราะห์ประเมินการเบิกเกินโควตา BOQ</span>
              </div>
            </div>
            
            {/* Desktop SideCollapse button */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:flex p-1.5 ml-2 rounded-lg bg-slate-800/50 border border-slate-700/60 text-slate-355 hover:text-white cursor-pointer transition-all"
              title={isSidebarCollapsed ? "ขยายเมนูถาวร" : "ย่อพับเมนูนิรภัย"}
            >
              {isSidebarCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Middle: Premium Global Autocomplete Search with Dropdown Results */}
          <div className="flex-1 max-w-sm md:max-w-md relative hidden md:block">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-450 pointer-events-none" />
              <input
                type="text"
                placeholder="พิมพ์ค้นหาวัสดุ, รหัสสินค้า, ชื่อโครงการก่อสร้าง..."
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                className="w-full bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-xs text-white rounded-lg pl-9 pr-4 py-2 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
              />
              {globalSearch && (
                <button 
                  onClick={() => { setGlobalSearch(''); setShowSearchResults(false); }}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-white text-xs font-bold cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Floating Search overlay block */}
            {showSearchResults && globalSearch.trim().length > 0 && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSearchResults(false)} />
                <div className="absolute top-[44px] left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden text-slate-800 dark:text-slate-100 font-sans animate-fade-in max-h-80 overflow-y-auto">
                  <div className="p-2 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    <span>ตารางดึงผลการค้นหาข้อมูลอัจฉริยะ ({searchResults.length})</span>
                    <Sparkles className="h-3 w-3 text-orange-500 animate-pulse" />
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      ไม่พบข้อมูลที่จับคู่ตรงกัน ค้นหาใหม่อีกครั้ง
                    </div>
                  ) : (
                    <div className="p-1 divide-y divide-slate-100 dark:divide-slate-800">
                      {searchResults.map((res: any) => (
                        <button
                          key={res.id}
                          onClick={() => handleSearchResultSelect(res)}
                          className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-lg flex items-center justify-between transition-colors cursor-pointer text-xs group"
                        >
                          <div>
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 px-1.5 py-0.5 rounded text-[9px] uppercase font-bold mr-2">
                              {res.category}
                            </span>
                            <strong className="text-slate-900 dark:text-slate-100 font-bold group-hover:text-orange-500 transition-colors">
                              {res.title}
                            </strong>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{res.subtitle}</p>
                          </div>
                          <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Section: Notifications Center, Themes Selector, RBAC Selector */}
          <div className="flex items-center gap-3">
            
            {/* Quick Actions Shortcuts Dock in Navbar */}
            <div className="hidden lg:flex items-center gap-1.5 border-r border-slate-800 pr-3.5 mr-1 font-sans">
              <button 
                onClick={() => handleQuickAction('transactions', 'ISSUE')}
                className="text-3xs font-semibold bg-red-655 bg-red-600 hover:bg-red-700 text-white shadow-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all select-none cursor-pointer"
                title="ออกใบเบิกพัสดุแคมป์งาน"
              >
                <ArrowLeftRight className="h-3 w-3" />
                <span>เบิกจ่ายไซท์</span>
              </button>
              <button 
                onClick={() => handleQuickAction('transactions', 'RECEIVE')}
                className="text-3xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all select-none cursor-pointer"
                title="ออกใบตรวจรับสินค้าเติมคลัง"
              >
                <PlusCircle className="h-3 w-3" />
                <span>รับพัสดุเข้า</span>
              </button>
            </div>

            {/* Enterprise Role Selector dropdown */}
            <div className="flex items-center gap-1.5 text-slate-300">
              <Users className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
              <select
                value={currentRole}
                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                className="bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl p-1.5 text-[10px] font-bold text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500/50"
              >
                {(Object.keys(ROLE_PERMISSIONS) as UserRole[]).map(role => (
                  <option key={role} value={role}>
                    {role === 'Employee' ? 'Employee/User' : role}
                  </option>
                ))}
              </select>
            </div>

            {/* Notification Bell Dropdown Panel */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setUnreadNotifications(false);
                }}
                className={`p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center relative ${
                  unreadNotifications && lineNotifications.length > 0 ? 'ring-1 ring-orange-500' : ''
                }`}
                title="รายงานผลส่งสัญญาณเตือน LINE Alerts"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadNotifications && lineNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full border border-slate-900 animate-pulse text-[8px] font-bold flex items-center justify-center text-white">
                    {lineNotifications.length}
                  </span>
                )}
              </button>

              {/* Notification Overlay Card */}
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-80 rounded-xl shadow-xl z-50 overflow-hidden font-sans text-slate-800 dark:text-slate-100 p-1">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ระบบเตือนภัย LINE Alerts ({lineNotifications.length})</span>
                      {lineNotifications.length > 0 && (
                        <button 
                          onClick={() => { setLineNotifications([]); setUnreadNotifications(false); }} 
                          className="text-[9px] font-bold text-orange-500 hover:text-orange-600 transition-colors cursor-pointer"
                        >
                          ล้างทั้งหมด
                        </button>
                      )}
                    </div>
                    {lineNotifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 flex flex-col items-center gap-1.5">
                        <CheckCircle className="h-6 w-6 text-emerald-500 opacity-60" />
                        <span>ไม่มีสัญญาณด่วนเตือนคลัง</span>
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-1 space-y-1">
                        {lineNotifications.slice(0, 5).map((noti) => (
                          <div key={noti.id} className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] leading-relaxed relative flex gap-2">
                            <span className={`block w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${
                              noti.type === 'LOW_STOCK' || noti.type === 'OVER_BOQ' ? 'bg-orange-500' : 'bg-blue-500'
                            }`} />
                            <div className="space-y-0.5">
                              <span className="text-[9px] font-bold text-slate-400 font-mono">
                                {new Date(noti.timestamp).toLocaleTimeString('th-TH')}
                              </span>
                              <p className="text-slate-600 dark:text-slate-300 font-medium whitespace-pre-line leading-relaxed">{noti.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="p-2 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 text-center rounded-b-lg">
                      <button 
                        onClick={() => { setActiveTab('line'); setShowNotifications(false); }}
                        className="text-[10px] text-blue-600 dark:text-orange-400 hover:underline font-bold cursor-pointer"
                      >
                        ดูผลตรวจจับจำลอง LINE ไลฟ์เซิร์ฟเวอร์
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Enterprise Multi-Theme Switcher Selector */}
            <div className="flex bg-slate-800/80 border border-slate-700/80 rounded-xl p-0.5">
              <button 
                onClick={() => setTheme('light')} 
                className={`p-1.5 rounded-lg cursor-pointer transition-all ${theme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                title="Light Mode"
              >
                <Sun className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={() => setTheme('dark')} 
                className={`p-1.5 rounded-lg cursor-pointer transition-all ${theme === 'dark' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                title="Dark Mode"
              >
                <Moon className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={() => setTheme('auto')} 
                className={`p-1.5 rounded-lg cursor-pointer transition-all ${theme === 'auto' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                title="Auto Theme"
              >
                <Laptop className="h-3.5 w-3.5" />
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* Profile HUD & Network indicators */}
      <section className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-2.5 px-4 sm:px-6 lg:px-8 shrink-0 transition-colors">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-[11px]">
          <div className="flex flex-wrap items-center gap-2 text-slate-650 dark:text-slate-350">
            <div className="h-5.5 w-5.5 rounded-full bg-blue-100 dark:bg-slate-800 text-blue-800 dark:text-blue-300 flex items-center justify-center font-bold text-xs select-none">
              👤
            </div>
            <span>ระบุพิกัดสิทธิ์ตรวจเช็ค: <strong className="text-slate-900 dark:text-white font-bold">{currentUserName}</strong></span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/30 font-bold px-2.5 py-0.5 rounded-full font-serif text-[9px] uppercase tracking-wider">
              {currentRole}
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-sans text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>เซิร์ฟเวอร์ออฟไลน์แซนบ็อกซ์เชื่อมต่ออยู่</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="font-mono text-slate-400 uppercase hidden sm:inline">LOC: คลังกลางหลักปูเจ้าฯ</span>
          </div>
        </div>
      </section>

      {/* Main Container Layout */}
      <div className="flex-grow flex flex-row overflow-hidden relative" id="navigation-sidebar-container">
        
        {/* Navigation Sidebar Drawer */}
        <nav 
          className={`shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-all duration-300 z-30 ${
            isSidebarCollapsed ? 'w-20' : 'w-64'
          } ${
            isMobileMenuOpen ? 'fixed inset-y-0 left-0 w-64' : 'hidden lg:flex'
          }`} 
          id="navigation-sidebar"
        >
          <div className="p-3 space-y-4 overflow-y-auto w-full">
            
            {/* Quick header inside Sidebar when expanded */}
            {!isSidebarCollapsed && (
              <div className="px-2.5 py-1 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none">
                ระบบจัดการและควบคุม
              </div>
            )}

            {/* Navigation buttons Group 1 */}
            <div className="space-y-1">
              
              {/* Dashboard */}
              <button
                onClick={() => { setActiveTab('dash'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold flex items-center transition-all cursor-pointer ${
                  activeTab === 'dash' 
                    ? 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-orange-400 font-bold border-l-4 border-blue-600 dark:border-orange-500' 
                    : 'text-slate-655 hover:bg-slate-50 hover:text-slate-905 dark:text-slate-400 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-white'
                } ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3'}`}
                title="ภาพรวมแผงควบคุมหลัก"
              >
                <LayoutDashboard className="h-4.5 w-4.5 shrink-0" />
                {!isSidebarCollapsed && <span>ภาพรวมและสถิติ (Dashboard)</span>}
              </button>

              {/* Inventory */}
              <button
                onClick={() => { setActiveTab('inventory'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold flex items-center transition-all cursor-pointer ${
                  activeTab === 'inventory' 
                    ? 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-orange-400 font-bold border-l-4 border-blue-600 dark:border-orange-500' 
                    : 'text-slate-655 hover:bg-slate-50 hover:text-slate-905 dark:text-slate-405 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-white'
                } ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3'}`}
                title="คลังวัสดุวิศวกรรม"
              >
                <Boxes className="h-4.5 w-4.5 shrink-0" />
                {!isSidebarCollapsed && <span>คลังวัสดุและโภคต (Inventory)</span>}
              </button>

              {/* Projects & BOQ */}
              <button
                onClick={() => { setActiveTab('projects'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold flex items-center transition-all cursor-pointer ${
                  activeTab === 'projects' 
                    ? 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-orange-400 font-bold border-l-4 border-blue-600 dark:border-orange-500' 
                    : 'text-slate-655 hover:bg-slate-50 hover:text-slate-905 dark:text-slate-400 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-white'
                } ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3'}`}
                title="งบโครงการคุม BOQ"
              >
                <Building2 className="h-4.5 w-4.5 shrink-0" />
                {!isSidebarCollapsed && <span>โครงการคุม BOQ (Projects)</span>}
              </button>

              {/* Reports Dashboard & Budget Control */}
              <button
                onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold flex items-center transition-all cursor-pointer ${
                  activeTab === 'reports' 
                    ? 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-orange-400 font-bold border-l-4 border-blue-600 dark:border-orange-500' 
                    : 'text-slate-655 hover:bg-slate-50 hover:text-slate-905 dark:text-slate-400 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-white'
                } ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3'}`}
                title="ระบบรายงานคุมงบ BOQ"
              >
                <Layers className="h-4.5 w-4.5 shrink-0" />
                {!isSidebarCollapsed && <span>รายงานพัสดุและคุมงบ (Reports Desk)</span>}
              </button>

              {/* Transactions Log Forms */}
              <button
                onClick={() => { setActiveTab('transactions'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold flex items-center transition-all cursor-pointer ${
                  activeTab === 'transactions' 
                    ? 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-orange-400 font-bold border-l-4 border-blue-600 dark:border-orange-500' 
                    : 'text-slate-655 hover:bg-slate-50 hover:text-slate-905 dark:text-slate-400 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-white'
                } ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3'}`}
                id="nav-btn-transactions"
                title="บันทึกใบเบิก / ใบพัสดุรับเข้า"
              >
                <ArrowLeftRight className="h-4.5 w-4.5 shrink-0" />
                {!isSidebarCollapsed && <span>บันทึกเติม/ดึงวัสดุ (Log Forms)</span>}
              </button>

              {/* Mobile Scanner Simulator */}
              <button
                onClick={() => { setActiveTab('scanner'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold flex items-center transition-all cursor-pointer ${
                  activeTab === 'scanner' 
                    ? 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-orange-400 font-bold border-l-4 border-blue-600 dark:border-orange-500' 
                    : 'text-slate-655 hover:bg-slate-50 hover:text-slate-905 dark:text-slate-105 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-white'
                } ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3'}`}
                title="สถานีสแกนโค้ด QR"
              >
                <QrCode className="h-4.5 w-4.5 shrink-0" />
                {!isSidebarCollapsed && <span>กล้องจำลองคิวอาร์ (Scanner)</span>}
              </button>

              {/* AI Forecasting Tool */}
              <button
                onClick={() => { setActiveTab('ai'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold flex items-center transition-all cursor-pointer ${
                  activeTab === 'ai' 
                    ? 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-orange-400 font-bold border-l-4 border-blue-600 dark:border-orange-500' 
                    : 'text-slate-655 hover:bg-slate-50 hover:text-slate-905 dark:text-slate-400 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-white'
                } ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3'}`}
                title="AI พยากรณ์ความปลอดภัย"
              >
                <BrainCircuit className="h-4.5 w-4.5 shrink-0 text-indigo-400" />
                {!isSidebarCollapsed && (
                  <span className="flex items-center gap-1.5 justify-between w-full">
                    <span>วิเคราะห์อัจฉริยะ (AI Advisor)</span>
                    <span className="h-2 w-2 rounded-full bg-orange-500 animate-ping" />
                  </span>
                )}
              </button>

            </div>

            {/* Section 2: Alerts Config */}
            <div className="space-y-1">
              {!isSidebarCollapsed && (
                <div className="px-2.5 py-1 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none">
                  สัญญาณ & ผลตรวจสอบ
                </div>
              )}

              {/* LINE Alerts Channel */}
              <button
                onClick={() => { setActiveTab('line'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold flex items-center transition-all cursor-pointer ${
                  activeTab === 'line' 
                    ? 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-orange-400 font-bold border-l-4 border-blue-600 dark:border-orange-500' 
                    : 'text-slate-655 hover:bg-slate-50 hover:text-slate-905 dark:text-slate-400 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-white'
                } ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3'}`}
                title="ดึงพิกัดแชทจำลอง LINE Alerts"
              >
                <MessageSquare className="h-4.5 w-4.5 shrink-0 text-[#06C755]" />
                {!isSidebarCollapsed && (
                  <div className="flex items-center justify-between w-full">
                    <span>แชทแจ้งเตือน (LINE Alerts)</span>
                    {lineNotifications.length > 0 && (
                      <span className="bg-[#06C755]/10 text-[#06C755] border border-[#06C755]/30 text-[9px] font-bold px-1.5 py-0.2 rounded-full font-mono">
                        {lineNotifications.length}
                      </span>
                    )}
                  </div>
                )}
              </button>

              {/* Audit Logs Trail */}
              <button
                onClick={() => { setActiveTab('audit'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold flex items-center transition-all cursor-pointer ${
                  activeTab === 'audit' 
                    ? 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-orange-400 font-bold border-l-4 border-blue-600 dark:border-orange-500' 
                    : 'text-slate-655 hover:bg-slate-50 hover:text-slate-905 dark:text-slate-400 dark:hover:bg-slate-850 hover:text-slate-905'
                } ${isSidebarCollapsed ? 'justify-center p-3' : 'gap-3'}`}
                title="ความโปร่งใสหลักประสงค์ Audit Trail"
              >
                <Terminal className="h-4.5 w-4.5 shrink-0" />
                {!isSidebarCollapsed && <span>ล็อกตรวจสอบ (Audit Logs)</span>}
              </button>

            </div>

          </div>

          {/* Collapsible Info Help Guide Tag */}
          {!isSidebarCollapsed && (
            <div className="p-4 m-3 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2 select-none text-[10px] shadow-xs">
              <span className="font-bold text-slate-805 dark:text-slate-150 flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-orange-400" />
                <span>ควบคุมวงเงินคลังธรรม :</span>
              </span>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-sans text-3xs">
                ท่านสามารถกด "สลับสิทธิ์ทดสอบ" บนแถบเพื่อทดลองดูสิทธิ์เปิด/ปิด ราคาทุนวัสดุและเงื่อนไขอนุมัติทันที
              </p>
            </div>
          )}
        </nav>

        {/* Mobile menu backdrop dismiss overlay */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/60 z-20 lg:hidden backdrop-blur-xs" 
          />
        )}

        {/* Workspace Working Canvas Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors">
          
          {/* Top Panel Breadcrumbs bar */}
          <div className="px-4 sm:px-6 lg:px-8 py-3.5 bg-slate-50 dark:bg-slate-950 flex items-center justify-between border-b border-slate-200 dark:border-slate-900 transition-colors">
            
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-sans font-semibold">
              <span>คลังพอร์ทัล / {breadcrumbs[0]}</span>
              <span>•</span>
              <span className="text-slate-800 dark:text-slate-200 bg-slate-200/50 dark:bg-slate-900 px-2.5 py-0.5 rounded-md font-bold">
                {breadcrumbs[1]}
              </span>
              {breadcrumbs[2] && (
                <>
                  <span>•</span>
                  <span className="text-orange-600 dark:text-orange-400">{breadcrumbs[2]}</span>
                </>
              )}
            </div>

            {/* Current Real Date and Stamp indicator */}
            <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 hidden md:block">
              สอดคล้องเวอร์ชั่น: 2569-05-26
            </div>
          </div>

          {/* Tab Canvas wrapper */}
          <div className="p-4 sm:p-6 lg:p-8 flex-grow">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 md:p-6 min-h-[75vh] flex flex-col relative transition-colors">
              
              {activeTab === 'dash' && (
                <Dashboard 
                  items={items} 
                  projects={projects} 
                  boqs={boqs} 
                  transactions={transactions} 
                  onNavigate={setActiveTab}
                  canViewCost={permission.canViewCost}
                />
              )}

              {activeTab === 'inventory' && (
                <Inventory 
                  items={items} 
                  warehouses={INITIAL_WAREHOUSES} 
                  currentUserRole={currentRole}
                  onAddItem={handleAddItem} 
                  onUpdateItem={handleUpdateItem} 
                  onDeleteItem={handleDeleteItem} 
                  onBulkImport={handleBulkImport}
                  canAddEdit={permission.canAddEditItems}
                  canViewCost={permission.canViewCost}
                />
              )}

              {activeTab === 'projects' && (
                <Projects 
                  projects={projects} 
                  boqs={boqs} 
                  items={items} 
                  currentUserRole={currentRole}
                  onAddProject={handleAddProject} 
                  onAddBOQ={handleAddBOQ} 
                  onImportBOQItems={handleImportBOQItems}
                  canViewCost={permission.canViewCost}
                />
              )}

              {activeTab === 'reports' && (
                <ProjectBOQReports 
                  projects={projects}
                  boqs={boqs}
                  items={items}
                  transactions={transactions}
                  currentUserRole={currentRole}
                  currentUserName={currentUserName}
                  onNavigate={setActiveTab}
                  canViewCost={permission.canViewCost}
                />
              )}

              {activeTab === 'transactions' && (
                <Transactions 
                  items={items} 
                  projects={projects} 
                  boqs={boqs} 
                  onCommitTransaction={handleCommitTransaction} 
                  currentUserRole={currentRole}
                  currentUserName={currentUserName}
                  scannedSkuTarget={scannedSkuTarget}
                  onClearScannedSkuTarget={() => setScannedSkuTarget(null)}
                />
              )}

              {activeTab === 'scanner' && (
                <MobileScanner 
                  items={items} 
                  onScanResult={handleScanResultBridge} 
                  onNavigate={setActiveTab}
                />
              )}

              {activeTab === 'line' && (
                <LineSimulator 
                  notifications={lineNotifications} 
                  onClear={() => {
                    setLineNotifications([]);
                    addAuditLog('ล้างประวัติจำลองแชท LINE Alerts');
                  }}
                />
              )}

              {activeTab === 'audit' && (
                <AuditLogs logs={auditLogs} />
              )}

              {activeTab === 'ai' && (
                <AIForecasting 
                  items={items} 
                  projects={projects} 
                  boqs={boqs} 
                  transactions={transactions} 
                  canViewCost={permission.canViewCost}
                />
              )}

            </div>
          </div>

          {/* Unified corporate mini footer */}
          <footer className="bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-900 py-3 shrink-0 text-[10px] text-center select-none mt-auto transition-colors">
            <p>© 2026 CargoBOQ Enterprise (Thailand) Co., Ltd. สงวนลิขสิทธิ์ระบบความปลอดภัยข้อมูลและควบคุมกรอบสัญญางวดงาน</p>
          </footer>

        </div>

      </div>

    </div>
  );
}