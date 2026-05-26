/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuditLog, UserRole } from '../types';
import { Shield, Search, Filter, ShieldCheck, Terminal, Calendar } from 'lucide-react';

interface AuditLogsProps {
  logs: AuditLog[];
}

export default function AuditLogs({ logs }: AuditLogsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.user.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.action.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.ipAddress.includes(searchQuery);
    const matchesRole = selectedRole === 'ALL' || log.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const roles: UserRole[] = ['Super Admin', 'Admin', 'Store Manager', 'Project Manager', 'Accounting', 'Approver', 'Employee'];

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-2xs p-5 space-y-6" id="audit-trail-pane">
      {/* Module Title */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-50 pb-3">
        <div className="space-y-0.5">
          <h2 className="text-base font-bold text-slate-900 inline-flex items-center gap-1.5">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            <span>สมุดบันทึกธุรกรรมความปลอดภัยคลัง (Audit Trails)</span>
          </h2>
          <p className="text-3xs text-slate-500">ติดตามเก็บบันทึกทรานแซกชั่นทุกอย่าง ใครเข้าปรับปรุงสต๊อก, แนบลายมือชื่อ และไอพีอุปกรณ์ย้อนหลังเพื่อความโปร่งใสสูงสุด</p>
        </div>
        <Terminal className="h-5 w-5 text-slate-350 shrink-0 hidden sm:block" />
      </div>

      {/* Grid Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
        {/* Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-3.5 w-3.5" />
          </span>
          <input 
            type="text" 
            placeholder="ค้นหาตามชื่อผู้ปฏิบัติการ, คำอธิบายกิจกรรม, ไอพีแอดเดรส..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-hidden text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Roles filter */}
        <div className="relative">
          <select 
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-3 pr-8 text-xs text-slate-700 focus:outline-hidden appearance-none cursor-pointer"
          >
            <option value="ALL">👮 ค้นด้วยสิทธิ์ใช้งานทั้งหมด</option>
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            <Filter className="h-3 w-3" />
          </span>
        </div>
      </div>

      {/* Table log */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs text-slate-700">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-3xs uppercase text-slate-400 tracking-wider">
              <th className="py-2.5 px-3 font-semibold">เวลาประทับ (Timestamp)</th>
              <th className="py-2.5 px-3 font-semibold">ผู้บันทึกรายการ / ตรวจสิทธิ์</th>
              <th className="py-2.5 px-3 font-semibold">รายละเอียดกิจกรรม (Action)</th>
              <th className="py-2.5 px-3 font-semibold font-mono">IP Address</th>
              <th className="py-2.5 px-3 font-semibold">อุปกรณ์ใช้งาน (Device Agent)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 italic text-2xs">
                  ไม่พบรายการล็อกกิจกรรมที่ตรงตามเงื่อนไขค้นหา
                </td>
              </tr>
            ) : (
              [...filteredLogs]
                .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map(log => {
                  let roleColor = 'bg-slate-100 text-slate-700';
                  if (log.role === 'Super Admin') roleColor = 'bg-indigo-50 text-indigo-700 border border-indigo-150';
                  else if (log.role === 'Project Manager') roleColor = 'bg-blue-50 text-blue-700 border border-blue-150';
                  else if (log.role === 'Store Manager') roleColor = 'bg-teal-50 text-teal-700 border border-teal-150';
                  else if (log.role === 'Accounting') roleColor = 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-150';

                  const formatTimestamp = (ts: string) => {
                    const date = new Date(ts);
                    return date.toLocaleString('th-TH', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit',
                      second: '2-digit'
                    });
                  };

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/55 transition-colors font-sans">
                      <td className="py-3 px-3 text-3xs text-slate-400 font-mono">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{log.user}</div>
                        <span className={`inline-block text-[9px] px-1 rounded-sm mt-0.5 font-bold ${roleColor}`}>
                          {log.role}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700 line-clamp-2 max-w-xs" title={log.action}>
                        {log.action}
                      </td>
                      <td className="py-3 px-3 font-mono text-3xs text-slate-500">
                        {log.ipAddress}
                      </td>
                      <td className="py-3 px-3 text-3xs text-slate-400 truncate max-w-[140px]" title={log.device}>
                        {log.device}
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
}
