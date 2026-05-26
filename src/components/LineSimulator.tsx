/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React from 'react';
import { LineNotification } from '../types';
import { MessageSquare, Bell, Shield, Send, Check } from 'lucide-react';

interface LineSimulatorProps {
  notifications: LineNotification[];
  onClear: () => void;
}

export default function LineSimulator({ notifications, onClear }: LineSimulatorProps) {
  const lineBrandColor = 'bg-[#06C755]';

  return (
    <div className="bg-[#566e94] rounded-2xl border-4 border-slate-800 shadow-xl overflow-hidden max-w-sm mx-auto h-[540px] flex flex-col justify-between" id="line-simulator-panel">
      {/* Phone status bar */}
      <div className="bg-slate-900 text-slate-400 text-4xs px-4 py-1.5 flex justify-between items-center font-mono select-none">
        <span>09:41 AM LTE</span>
        <div className="flex items-center gap-1">
          <span>LINE OA LIVE</span>
          <span className="h-2 w-2 rounded-full bg-[#06C755]"></span>
        </div>
      </div>

      {/* Line chat header */}
      <div className="bg-[#243040] text-white p-3 flex items-center gap-2.5 border-b border-slate-750 shrink-0">
        <div className="h-9 w-9 rounded-full bg-[#06C755] flex items-center justify-center font-bold text-white text-xs shadow-inner">
          📦
        </div>
        <div>
          <div className="text-xs font-bold flex items-center gap-1">
            <span>CargoBOQ Alerts</span>
            <span className="bg-[#06C755] text-white text-[9px] px-1 rounded-full font-bold">บัญชีทางการ</span>
          </div>
          <span className="text-4xs text-slate-400">ระบบคลังและเปรียบเทียบงบประมาณผู้รักษาการหน้างาน</span>
        </div>
      </div>

      {/* Messages body */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3.5 flex flex-col-reverse justify-start">
        {notifications.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-350 my-auto">
            <MessageSquare className="h-8 w-8 text-slate-400 animate-bounce" />
            <div>
              <p className="text-2xs font-bold">ไม่มีการแจ้งเตือนสัญญานเตือน</p>
              <p className="text-4xs text-slate-300">เมื่อทดลองเบิกของออกคลัง, ส่งคืนวัสดุ, หรือของเซฟตี้สต็อกรันเอาท์ คลาวด์ LINE จะเชื่อมโยงดันข้อความส่งพุชตรงนี้ทันที</p>
            </div>
          </div>
        ) : (
          // Reverse notifications to show latest on bottom
          [...notifications].map(notif => {
            const dateStr = new Date(notif.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            
            // Format line breaks as nice bubble
            return (
              <div key={notif.id} className="flex gap-2 items-end justify-start animate-fade-in text-[11px]">
                {/* OA Avatar */}
                <span className="h-6 w-6 rounded-full bg-[#06C755] flex items-center justify-center text-3xs shrink-0 select-none">
                  👷
                </span>

                <div className="max-w-[75%] space-y-0.5">
                  <span className="text-4xs text-slate-200 block pl-1 font-serif">ระบบแจ้งข้อมูลคลัง</span>
                  <div className="bg-white text-slate-800 p-2.5 rounded-xl rounded-tl-xs shadow-md leading-relaxed whitespace-pre-wrap select-all font-sans relative">
                    {notif.message}
                  </div>
                  {/* Timestamp */}
                  <span className="text-[9px] text-slate-350 block pl-1 font-mono text-right">{dateStr} • อ่านแล้ว</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Chat input footer (Disabled placeholder for simulation) */}
      <div className="bg-slate-900 border-t border-slate-800 p-2 text-3xs text-slate-400 flex items-center justify-between shrink-0">
        <span className="pl-2">คีย์บอร์ดถูกปิดไว้ ปริ้นท์ระบบโต้ตอบในฐานะแอดมิน</span>
        <button 
          onClick={onClear}
          className="bg-slate-750 hover:bg-slate-700 text-white px-2 py-1 rounded-sm border border-slate-650 cursor-pointer text-4xs font-bold uppercase transition-all"
        >
          ล้างประวัติแชท
        </button>
      </div>
    </div>
  );
}
