import React from 'react';
import { 
  Building2, 
  Search, 
  Bell, 
  Cloud, 
  RefreshCw, 
  ExternalLink,
  Layers,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { Warehouse, GoogleSyncConfig } from '../../types';

interface HeaderProps {
  warehouses: Warehouse[];
  selectedWarehouseId: string;
  onSelectWarehouse: (id: string) => void;
  googleSyncConfig: GoogleSyncConfig;
  onOpenGoogleSync: () => void;
  onGlobalSearch?: (term: string) => void;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  warehouses,
  selectedWarehouseId,
  onSelectWarehouse,
  googleSyncConfig,
  onOpenGoogleSync,
  unreadCount = 3,
}) => {
  const currentDate = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Organization Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white font-bold shadow-sm shadow-blue-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                CỬA HÀNG ĐIỆN NƯỚC CƯỜNG NGUYỆT
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                ERP Pro VN
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {currentDate}
              </span>
              <span>•</span>
              <span className="text-slate-600 font-medium">MST: 0107899999</span>
            </div>
          </div>
        </div>

        {/* Center: Warehouse selector */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
          <Layers className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-slate-700">Kho thao tác:</span>
          <select
            value={selectedWarehouseId}
            onChange={(e) => onSelectWarehouse(e.target.value)}
            className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Tất cả các kho ({warehouses.length} kho)</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
              </option>
            ))}
          </select>
        </div>

        {/* Right: Actions & Google Sync Integration Status */}
        <div className="flex items-center gap-2.5">
          {/* Google Site & Sheets Integration Badge Button */}
          <button
            onClick={onOpenGoogleSync}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors text-xs font-medium cursor-pointer shadow-xs"
            title="Đồng bộ dữ liệu vào Google Sheets và mã nhúng Google Sites"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Google Sites / Sheets</span>
            <ExternalLink className="w-3 h-3 text-emerald-600" />
          </button>

          {/* Notification bell */}
          <div className="relative">
            <button 
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative cursor-pointer"
              title="Thông báo cảnh báo tồn kho và công nợ"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
              )}
            </button>
          </div>

          {/* User profile badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white text-xs font-semibold flex items-center justify-center">
              AD
            </div>
            <div className="hidden md:block text-left text-xs">
              <p className="font-semibold text-slate-800">Admin Quản Trị</p>
              <p className="text-slate-500 text-[11px]">Toàn quyền (CEO/CFO)</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
