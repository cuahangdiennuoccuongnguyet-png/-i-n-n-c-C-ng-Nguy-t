import React from 'react';
import { 
  ShoppingCart, 
  Boxes, 
  Receipt, 
  Factory, 
  Cloud, 
  ChevronRight,
  TrendingUp,
  Truck,
  FileSpreadsheet,
  AlertTriangle,
  BadgeAlert
} from 'lucide-react';
import { ModuleType } from '../../types';

interface SidebarProps {
  activeModule: ModuleType;
  onSelectModule: (module: ModuleType) => void;
  inventoryAlertCount: number;
  creditAlertCount: number;
  pendingDeliveriesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  inventoryAlertCount,
  creditAlertCount,
  pendingDeliveriesCount,
}) => {
  const navItems = [
    {
      id: 'sales' as ModuleType,
      label: '1. Quản lý Bán hàng',
      sublabel: 'Báo giá, Đơn hàng, Giao hàng & Công nợ',
      icon: ShoppingCart,
      badge: pendingDeliveriesCount > 0 ? `${pendingDeliveriesCount} đơn nợ giao` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    {
      id: 'inventory' as ModuleType,
      label: '2. Mua hàng & Tồn kho',
      sublabel: 'Barcode, Đa kho, Cận date, FIFO & PO',
      icon: Boxes,
      badge: inventoryAlertCount > 0 ? `${inventoryAlertCount} sắp hết` : undefined,
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    },
    {
      id: 'accounting' as ModuleType,
      label: '3. Kế toán & Tài chính',
      sublabel: 'Sổ cái, Công nợ, Khấu hao TSCĐ, HĐĐT TT78',
      icon: Receipt,
      badge: creditAlertCount > 0 ? `${creditAlertCount} nợ cao` : undefined,
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
    },
    {
      id: 'production' as ModuleType,
      label: '4. Quản lý Sản xuất',
      sublabel: 'Lệnh SX, Định mức BOM, Giá thành 621-622-627',
      icon: Factory,
    },
    {
      id: 'google_sync' as ModuleType,
      label: '5. Google Site & Sheets',
      sublabel: 'Lưu dữ liệu Google, Mã nhúng Iframe & Sao lưu',
      icon: Cloud,
      badge: 'Đồng bộ',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
  ];

  return (
    <aside className="w-64 lg:w-72 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-57px)] border-r border-slate-800">
      {/* ERP System Branding Badge */}
      <div className="p-4 border-b border-slate-800/80">
        <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold text-slate-200">Phiên bản ERP Doanh Nghiệp</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono text-[10px]">v2.5 Pro</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Hạch toán chuẩn Thông tư 78/2021 & 200/2014/TT-BTC
          </p>
        </div>
      </div>

      {/* Navigation Modules */}
      <div className="p-3 space-y-1.5 flex-1">
        <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Phân Hệ Chức Năng
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              className={`w-full text-left p-3 rounded-xl transition-all flex items-start justify-between group cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg mt-0.5 transition-colors ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-blue-400 group-hover:bg-slate-700/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm leading-snug">{item.label}</div>
                  <div
                    className={`text-[11px] mt-0.5 leading-tight ${
                      isActive ? 'text-blue-100' : 'text-slate-400'
                    }`}
                  >
                    {item.sublabel}
                  </div>
                  {item.badge && (
                    <span
                      className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        isActive
                          ? 'bg-white/20 text-white border-white/30'
                          : item.badgeColor
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 mt-1 transition-transform ${
                  isActive ? 'text-white translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Quick Status Bar at bottom */}
      <div className="p-4 border-t border-slate-800 text-xs bg-slate-950/40">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span>Trạng thái kết nối Google:</span>
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Sẵn sàng
          </span>
        </div>
        <div className="text-[11px] text-slate-400 leading-snug">
          Hỗ trợ nhúng trực tiếp vào Google Sites & Xuất Sheet real-time.
        </div>
      </div>
    </aside>
  );
};
