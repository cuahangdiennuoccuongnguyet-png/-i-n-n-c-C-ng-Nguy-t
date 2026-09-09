import React, { useState, useMemo } from 'react';
import {
  ProductionOrder,
  BOM,
  SalesOrder,
  InventoryItem,
  Warehouse,
} from '../../types';
import { formatVND, formatNumber, formatDateVN, generateId } from '../../utils/formatters';
import { exportToCSV } from '../../services/storage';
import {
  Factory,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRightCircle,
  FileSpreadsheet,
  Cpu,
  Layers,
  Calculator,
  UserCheck,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface ProductionModuleProps {
  productionOrders: ProductionOrder[];
  boms: BOM[];
  salesOrders: SalesOrder[];
  inventory: InventoryItem[];
  warehouses: Warehouse[];
  onAddProductionOrder: (order: ProductionOrder) => void;
  onCompleteProductionOrder: (orderId: string) => void;
  onAddBOM: (bom: BOM) => void;
}

export const ProductionModule: React.FC<ProductionModuleProps> = ({
  productionOrders,
  boms,
  salesOrders,
  inventory,
  warehouses,
  onAddProductionOrder,
  onCompleteProductionOrder,
  onAddBOM,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'bom' | 'costing'>('orders');

  // New Work Order Modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedSalesOrderId, setSelectedSalesOrderId] = useState<string>('');
  const [selectedBomId, setSelectedBomId] = useState<string>(boms[0]?.id || '');
  const [targetQuantity, setTargetQuantity] = useState<number>(20);
  const [assignedManager, setAssignedManager] = useState<string>('Quản đốc xưởng Phạm Văn Thao');
  const [orderNotes, setOrderNotes] = useState<string>('Lệnh sản xuất thành phẩm xuất xưởng');

  // Cost Allocation adjustment state
  const [laborPerUnit, setLaborPerUnit] = useState<number>(850000);
  const [overheadPerUnit, setOverheadPerUnit] = useState<number>(650000);

  // Selected BOM for details
  const [selectedBOMForView, setSelectedBOMForView] = useState<BOM | null>(boms[0] || null);

  // Filter pending sales orders that can trigger production
  const eligibleSalesOrders = useMemo(() => {
    return salesOrders.filter(o => o.deliveryStatus !== 'da_giao');
  }, [salesOrders]);

  // Handle Save Work Order
  const handleCreateWorkOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const bom = boms.find(b => b.id === selectedBomId);
    if (!bom) return;

    const so = salesOrders.find(s => s.id === selectedSalesOrderId);

    const totalMat = bom.materialCostPerUnit * targetQuantity;
    const totalLab = laborPerUnit * targetQuantity;
    const totalOver = overheadPerUnit * targetQuantity;
    const totalCost = totalMat + totalLab + totalOver;
    const unitCost = Math.round(totalCost / targetQuantity);

    const newOrder: ProductionOrder = {
      id: generateId('lsx'),
      productionCode: `LSX-2024-${String(productionOrders.length + 19).padStart(3, '0')}`,
      salesOrderId: so ? so.id : undefined,
      salesOrderCode: so ? so.orderCode : undefined,
      productId: bom.productId,
      productName: bom.productName,
      targetQuantity,
      completedQuantity: 0,
      startDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: 'in_progress',
      bomId: bom.id,
      totalMaterialCost: totalMat,
      totalLaborCost: totalLab,
      totalOverheadCost: totalOver,
      unitProductionCost: unitCost,
      totalProductionCost: totalCost,
      assignedTo: assignedManager,
      notes: orderNotes,
    };

    onAddProductionOrder(newOrder);
    setShowOrderModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tổng Lệnh Sản Xuất
            </span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Factory className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">
            {productionOrders.length} lệnh
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Đang chạy xưởng: {productionOrders.filter(p => p.status === 'in_progress').length} lệnh
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Định Mức BOM Đã Thiết Lập
            </span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Cpu className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-purple-700 mt-2">
            {boms.length} sản phẩm
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Định mức tự động trừ kho nguyên liệu
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Giá Thành Đơn Vị (TK 155)
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Calculator className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-2">
            {formatVND(boms[0]?.totalCostPerUnit || 2850000)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Máy lọc nước RO 9 cấp Cường Nguyệt
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Đơn Bán Hàng Cần Sản Xuất
            </span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-amber-700 mt-2">
            {eligibleSalesOrders.length} đơn hàng
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Có thể lập lệnh sản xuất ngay
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="bg-white p-1 rounded-xl border border-slate-200 flex flex-wrap gap-1 shadow-xs">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'orders'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Factory className="w-3.5 h-3.5" />
          Lệnh Sản Xuất (Work Orders) ({productionOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('bom')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'bom'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          Định Mức Nguyên Vật Liệu (BOM) ({boms.length})
        </button>

        <button
          onClick={() => setActiveTab('costing')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'costing'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          Phân Bổ & Tính Giá Thành Sản Xuất (TK 621, 622, 627)
        </button>
      </div>

      {/* TAB 1: LỆNH SẢN XUẤT */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Theo Dõi Tiến Độ Lệnh Sản Xuất Xưởng (Work Orders)
              </h3>
              <p className="text-xs text-slate-500">
                Tạo lệnh từ đơn hàng bán (SO), theo dõi số lượng hoàn thành và tự động trừ kho NVL khi nghiệm thu
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const rows = productionOrders.map(p => ({
                    'Mã Lệnh': p.productionCode,
                    'Đơn Hàng Bán': p.salesOrderCode || 'Kế hoạch bổ sung kho',
                    'Thành Phẩm': p.productName,
                    'Mục Tiêu': p.targetQuantity,
                    'Đã Hoàn Thành': p.completedQuantity,
                    'Tổng Giá Thành': p.totalProductionCost,
                    'Quản Đốc': p.assignedTo,
                    'Trạng Thái': p.status === 'completed' ? 'Đã hoàn thành' : 'Đang thực hiện',
                  }));
                  exportToCSV('Lenh-San-Xuat-Cuong-Nguyet', rows);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Xuất Sheets
              </button>

              <button
                onClick={() => setShowOrderModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Tạo Lệnh Sản Xuất Mới
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/75 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Mã Lệnh / Ngày</th>
                  <th className="px-4 py-3">Thành Phẩm Sản Xuất</th>
                  <th className="px-4 py-3">Liên Kết Đơn Hàng</th>
                  <th className="px-4 py-3 text-center">Số Lượng KH / Đã Đạt</th>
                  <th className="px-4 py-3 text-right">Tổng Chi Phí SX</th>
                  <th className="px-4 py-3">Quản Đốc Phụ Trách</th>
                  <th className="px-4 py-3 text-center">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {productionOrders.map((p) => {
                  const isDone = p.status === 'completed';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-blue-700">{p.productionCode}</div>
                        <div className="text-[11px] text-slate-500">Hạn xong: {formatDateVN(p.dueDate)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{p.productName}</div>
                        <div className="text-[11px] text-slate-500">{p.notes}</div>
                      </td>
                      <td className="px-4 py-3">
                        {p.salesOrderCode ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-semibold text-[11px]">
                            {p.salesOrderCode}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Bổ sung kho</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="font-bold text-slate-900">
                          {p.completedQuantity} / {p.targetQuantity} bộ
                        </div>
                        <div className="w-24 bg-slate-200 rounded-full h-1.5 mx-auto mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isDone ? 'bg-emerald-600' : 'bg-blue-600'}`}
                            style={{
                              width: `${Math.round((p.completedQuantity / p.targetQuantity) * 100)}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-bold text-slate-900">{formatVND(p.totalProductionCost)}</div>
                        <div className="text-[10px] text-slate-500">Đơn vị: {formatVND(p.unitProductionCost)}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {p.assignedTo}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!isDone ? (
                          <button
                            onClick={() => onCompleteProductionOrder(p.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] transition-colors cursor-pointer shadow-xs"
                            title="Xác nhận hoàn thành: Tự động trừ kho NVL và nhập kho thành phẩm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Hoàn Thành & Nhập Kho
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Đã nhập kho
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ĐỊNH MỨC NGUYÊN VẬT LIỆU (BOM) */}
      {activeTab === 'bom' && (
        <div className="space-y-6">
          {boms.map((bom) => (
            <div key={bom.id} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                      {bom.bomCode}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {bom.productName}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Định mức tiêu hao kỹ thuật cho 1 {bom.unit} thành phẩm • Cập nhật: {formatDateVN(bom.updatedDate)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Tổng chi phí định mức 1 đơn vị:</div>
                  <div className="text-base font-bold text-emerald-700">{formatVND(bom.totalCostPerUnit)}</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100/75 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">STT</th>
                      <th className="px-4 py-3">Tên Nguyên Vật Liệu Cấu Thành</th>
                      <th className="px-4 py-3">Mã SKU</th>
                      <th className="px-4 py-3 text-center">ĐVT</th>
                      <th className="px-4 py-3 text-center">Định Mức / 1 TP</th>
                      <th className="px-4 py-3 text-right">Đơn Giá NVL Chuẩn</th>
                      <th className="px-4 py-3 text-right">Thành Tiền NVL (621)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {bom.materials.map((mat, idx) => (
                      <tr key={mat.materialId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{mat.materialName}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{mat.sku}</td>
                        <td className="px-4 py-3 text-center">{mat.unit}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-900">{mat.standardQuantity}</td>
                        <td className="px-4 py-3 text-right">{formatVND(mat.unitCost)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">{formatVND(mat.totalCost)}</td>
                      </tr>
                    ))}
                    {/* Summary row */}
                    <tr className="bg-slate-50 font-bold text-slate-900">
                      <td colSpan={6} className="px-4 py-3 text-right">
                        Tổng Chi Phí Nguyên Vật Liệu Trực Tiếp (TK 621):
                      </td>
                      <td className="px-4 py-3 text-right text-blue-700 font-mono text-sm">
                        {formatVND(bom.materialCostPerUnit)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: TÍNH GIÁ THÀNH SẢN XUẤT (TK 621, 622, 627) */}
      {activeTab === 'costing' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <h4 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              Bảng Phân Bổ & Tính Giá Thành Sản Xuất Chuẩn Kế Toán (Mẫu TK 154)
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Hệ thống tự động tập hợp 3 khoản mục chi phí: Chi phí Nguyên vật liệu trực tiếp (TK 621), Chi phí Nhân công trực tiếp (TK 622), Chi phí Sản xuất chung (TK 627) kết chuyển sang TK 154 để hình thành Giá thành đơn vị nhập kho (TK 155).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 621 NVL */}
              <div className="border border-blue-200 rounded-xl p-4 bg-blue-50/50">
                <div className="font-bold text-blue-900 text-sm mb-1">1. Chi Phí NVL Trực Tiếp (TK 621)</div>
                <div className="text-2xl font-bold text-blue-700 my-2">
                  {formatVND(boms[0]?.materialCostPerUnit || 1350000)}
                </div>
                <p className="text-xs text-slate-600">
                  Tập hợp tự động theo định mức cấu thành BOM khi xuất kho vật tư cho lệnh sản xuất.
                </p>
              </div>

              {/* 622 NCTT */}
              <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50/50">
                <div className="font-bold text-emerald-900 text-sm mb-1">2. Chi Phí Nhân Công Trực Tiếp (TK 622)</div>
                <div className="text-2xl font-bold text-emerald-700 my-2">
                  {formatVND(laborPerUnit)}
                </div>
                <p className="text-xs text-slate-600 mb-2">
                  Lương công nhân phân bổ theo thời gian hoặc số lượng sản phẩm hoàn thành.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-slate-600">Điều chỉnh:</span>
                  <input
                    type="number"
                    value={laborPerUnit}
                    onChange={(e) => setLaborPerUnit(Number(e.target.value))}
                    className="border border-emerald-300 rounded px-2 py-0.5 text-xs font-bold w-28 bg-white"
                  />
                </div>
              </div>

              {/* 627 SXC */}
              <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/50">
                <div className="font-bold text-purple-900 text-sm mb-1">3. Chi Phí Sản Xuất Chung (TK 627)</div>
                <div className="text-2xl font-bold text-purple-700 my-2">
                  {formatVND(overheadPerUnit)}
                </div>
                <p className="text-xs text-slate-600 mb-2">
                  Khấu hao máy xưởng, điện năng, phụ liệu bôi trơn phân bổ.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-slate-600">Điều chỉnh:</span>
                  <input
                    type="number"
                    value={overheadPerUnit}
                    onChange={(e) => setOverheadPerUnit(Number(e.target.value))}
                    className="border border-purple-300 rounded px-2 py-0.5 text-xs font-bold w-28 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Total Result */}
            <div className="mt-6 p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs text-blue-300 font-semibold uppercase tracking-wider">
                  Tổng Giá Thành Đơn Vị Thành Phẩm (TK 155)
                </span>
                <h3 className="text-2xl font-bold text-white mt-0.5">
                  {formatVND((boms[0]?.materialCostPerUnit || 1350000) + laborPerUnit + overheadPerUnit)}
                </h3>
              </div>
              <div className="text-xs text-slate-300 text-right">
                <div>Giá bán niêm yết: <strong className="text-white">4,650,000 ₫</strong></div>
                <div>Tỷ suất lợi nhuận gộp biên: <strong className="text-emerald-400">38.7%</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TẠO LỆNH SẢN XUẤT */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Lập Lệnh Sản Xuất Xưởng Mới
              </h3>
              <button
                onClick={() => setShowOrderModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWorkOrder} className="mt-4 space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Liên Kết Từ Đơn Bán Hàng (Tùy chọn)
                </label>
                <select
                  value={selectedSalesOrderId}
                  onChange={(e) => {
                    setSelectedSalesOrderId(e.target.value);
                    const so = salesOrders.find(s => s.id === e.target.value);
                    if (so && so.items[0]) {
                      setTargetQuantity(so.items[0].remainingQuantity || 10);
                    }
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                >
                  <option value="">-- Sản xuất kế hoạch bổ sung kho --</option>
                  {eligibleSalesOrders.map(so => (
                    <option key={so.id} value={so.id}>
                      {so.orderCode} - {so.customerName} (Còn nợ giao)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Định Mức Sản Phẩm (BOM)
                </label>
                <select
                  value={selectedBomId}
                  onChange={(e) => setSelectedBomId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                >
                  {boms.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bomCode} - {b.productName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Số Lượng Kế Hoạch Sản Xuất
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={targetQuantity}
                  onChange={(e) => setTargetQuantity(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2 font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Quản Đốc / Trưởng Ca Phụ Trách
                </label>
                <input
                  type="text"
                  value={assignedManager}
                  onChange={(e) => setAssignedManager(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Ghi Chú Kỹ Thuật
                </label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg cursor-pointer shadow-xs"
                >
                  Khởi Tạo Lệnh Sản Xuất
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
