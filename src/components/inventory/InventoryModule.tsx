import React, { useState, useMemo } from 'react';
import {
  InventoryItem,
  Supplier,
  PurchaseOrder,
  Warehouse,
  ItemLot,
} from '../../types';
import { formatVND, formatNumber, formatDateVN, generateId } from '../../utils/formatters';
import { exportToCSV } from '../../services/storage';
import {
  Boxes,
  Barcode,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Truck,
  Plus,
  ArrowDownToLine,
  FileSpreadsheet,
  Calculator,
  Calendar,
  Layers,
  History,
  Building2,
  Tag,
  Eye,
  ScanLine,
  Pencil,
  PackagePlus,
  DollarSign,
  Sparkles,
} from 'lucide-react';

interface InventoryModuleProps {
  inventory: InventoryItem[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  warehouses: Warehouse[];
  onAddPurchaseOrder: (po: PurchaseOrder) => void;
  onReceivePurchaseOrder: (poId: string) => void;
  onUpdateCostMethod: (itemId: string, method: 'fifo' | 'weighted_average' | 'specific_id') => void;
  onAdjustStock: (itemId: string, warehouseId: string, delta: number, reason: string) => void;
  onAddInventoryItem?: (item: InventoryItem) => void;
  onUpdateInventoryItem?: (item: InventoryItem) => void;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  inventory,
  suppliers,
  purchaseOrders,
  warehouses,
  onAddPurchaseOrder,
  onReceivePurchaseOrder,
  onUpdateCostMethod,
  onAdjustStock,
  onAddInventoryItem,
  onUpdateInventoryItem,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'pos' | 'suppliers' | 'costing'>('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'finished_good' | 'raw_material'>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Barcode View Modal
  const [selectedItemForBarcode, setSelectedItemForBarcode] = useState<InventoryItem | null>(null);

  // Add Item Modal & Form
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemSku, setNewItemSku] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemBarcode, setNewItemBarcode] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<'finished_good' | 'raw_material' | 'spare_part'>('finished_good');
  const [newItemUnit, setNewItemUnit] = useState('Cái');
  const [newItemStandardCost, setNewItemStandardCost] = useState<number>(0);
  const [newItemSellingPrice, setNewItemSellingPrice] = useState<number>(0);
  const [newItemInitialQty, setNewItemInitialQty] = useState<number>(10);
  const [newItemWarehouseId, setNewItemWarehouseId] = useState(warehouses[0]?.id || 'wh-1');
  const [newItemMinStock, setNewItemMinStock] = useState<number>(5);
  const [newItemCostMethod, setNewItemCostMethod] = useState<'fifo' | 'weighted_average' | 'specific_id'>('weighted_average');

  // Edit Item Modal (Mã hàng & Đơn giá)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editSku, setEditSku] = useState('');
  const [editName, setEditName] = useState('');
  const [editStandardCost, setEditStandardCost] = useState<number>(0);
  const [editSellingPrice, setEditSellingPrice] = useState<number>(0);
  const [editMinStock, setEditMinStock] = useState<number>(0);
  const [editUnit, setEditUnit] = useState('');

  // New PO Modal (Đơn mua hàng có Mã hàng và Đơn giá mua)
  const [showPoModal, setShowPoModal] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState(suppliers[0]?.id || '');
  const [poItemId, setPoItemId] = useState(inventory[0]?.id || '');
  const [poQuantity, setPoQuantity] = useState(20);
  const [poUnitPrice, setPoUnitPrice] = useState<number>(inventory[0]?.standardCost || 0);
  const [poNotes, setPoNotes] = useState('Đơn mua hàng bổ sung tồn kho');

  const generateRandomSku = (cat: 'finished_good' | 'raw_material' | 'spare_part' = newItemCategory) => {
    const prefix = cat === 'finished_good' ? 'SP-DN' : 'VT-DN';
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${rand}`;
  };

  const generateBarcode = () => {
    const rand = Math.floor(100000000 + Math.random() * 900000000);
    return `893${rand}`;
  };

  // Filtered inventory list
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.barcode.includes(searchTerm);

      const matchCategory = categoryFilter === 'all' || item.category === categoryFilter;

      const matchWarehouse =
        warehouseFilter === 'all' ||
        item.warehouses.some(w => w.warehouseId === warehouseFilter && w.quantity > 0);

      const isLowStock = item.totalQuantity <= item.minStockLevel;
      const matchLowStock = !showLowStockOnly || isLowStock;

      return matchSearch && matchCategory && matchWarehouse && matchLowStock;
    });
  }, [inventory, searchTerm, categoryFilter, warehouseFilter, showLowStockOnly]);

  // Items needing replenishment (below min stock level)
  const lowStockItems = useMemo(() => {
    return inventory.filter(i => i.totalQuantity <= i.minStockLevel);
  }, [inventory]);

  // Expiring items (within next 6 months)
  const expiringLots = useMemo(() => {
    const list: { item: InventoryItem; lot: ItemLot }[] = [];
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 6 months

    inventory.forEach(item => {
      if (item.hasExpiry && item.lots) {
        item.lots.forEach(lot => {
          if (lot.expiryDate) {
            const exp = new Date(lot.expiryDate);
            if (exp <= thresholdDate) {
              list.push({ item, lot });
            }
          }
        });
      }
    });
    return list;
  }, [inventory]);

  // Handle PO Creation with custom unit price & SKU
  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find(s => s.id === poSupplierId);
    const item = inventory.find(i => i.id === poItemId);
    if (!sup || !item) return;

    const unitPrice = Number(poUnitPrice) > 0 ? Number(poUnitPrice) : item.standardCost;
    const amount = unitPrice * poQuantity;
    const orderDate = new Date().toISOString().slice(0, 10);
    const expectedDate = new Date(Date.now() + sup.leadTimeDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const newPO: PurchaseOrder = {
      id: generateId('po'),
      poCode: `PO-2024-${String(purchaseOrders.length + 43).padStart(3, '0')}`,
      supplierId: sup.id,
      supplierName: sup.name,
      orderDate,
      expectedDate,
      status: 'in_transit', // hàng đang trên đường về
      warehouseId: warehouses[0].id,
      totalAmount: amount,
      paymentStatus: 'unpaid',
      paidAmount: 0,
      notes: poNotes,
      items: [
        {
          itemId: item.id,
          itemName: item.name,
          sku: item.sku,
          unit: item.unit,
          quantity: poQuantity,
          unitPrice,
          amount,
          receivedQuantity: 0,
        },
      ],
    };

    onAddPurchaseOrder(newPO);
    setShowPoModal(false);
  };

  // Handle Add New Inventory Item
  const handleCreateItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const sku = newItemSku.trim() || generateRandomSku();
    const barcode = newItemBarcode.trim() || generateBarcode();
    const targetWh = warehouses.find(w => w.id === newItemWarehouseId) || warehouses[0];
    const qty = Math.max(0, Number(newItemInitialQty) || 0);
    const cost = Math.max(0, Number(newItemStandardCost) || 0);
    const price = Math.max(0, Number(newItemSellingPrice) || 0);

    const newItem: InventoryItem = {
      id: generateId('item'),
      sku,
      barcode,
      name: newItemName.trim(),
      category: newItemCategory,
      unit: newItemUnit.trim() || 'Cái',
      costMethod: newItemCostMethod,
      standardCost: cost,
      sellingPrice: price,
      minStockLevel: Math.max(0, Number(newItemMinStock) || 0),
      maxStockLevel: (Math.max(0, Number(newItemMinStock) || 0) || 1) * 5,
      totalQuantity: qty,
      warehouses: [
        {
          warehouseId: targetWh.id,
          warehouseName: targetWh.name,
          quantity: qty,
        },
      ],
      lots: qty > 0 ? [
        {
          id: generateId('lot'),
          lotNumber: `LOT-${new Date().toISOString().slice(2, 7).replace('-', '')}`,
          manufactureDate: new Date().toISOString().slice(0, 10),
          warehouseId: targetWh.id,
          quantity: qty,
          costPrice: cost,
        }
      ] : [],
      hasExpiry: false,
    };

    if (onAddInventoryItem) {
      onAddInventoryItem(newItem);
    }
    setShowAddItemModal(false);
    setNewItemName('');
    setNewItemSku('');
    setNewItemBarcode('');
    setNewItemStandardCost(0);
    setNewItemSellingPrice(0);
  };

  // Open Edit Item
  const handleOpenEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setEditSku(item.sku);
    setEditName(item.name);
    setEditStandardCost(item.standardCost);
    setEditSellingPrice(item.sellingPrice);
    setEditMinStock(item.minStockLevel);
    setEditUnit(item.unit);
  };

  // Save Edit Item
  const handleSaveEditItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updated: InventoryItem = {
      ...editingItem,
      sku: editSku.trim() || editingItem.sku,
      name: editName.trim() || editingItem.name,
      standardCost: Math.max(0, Number(editStandardCost) || 0),
      sellingPrice: Math.max(0, Number(editSellingPrice) || 0),
      minStockLevel: Math.max(0, Number(editMinStock) || 0),
      unit: editUnit.trim() || editingItem.unit,
    };

    if (onUpdateInventoryItem) {
      onUpdateInventoryItem(updated);
    }
    setEditingItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tổng Mặt Hàng Quản Lý
            </span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Boxes className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">
            {inventory.length} mặt hàng
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Gồm {inventory.filter(i => i.category === 'finished_good').length} thành phẩm & {inventory.filter(i => i.category === 'raw_material').length} nguyên vật liệu
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cảnh Báo Tồn Dưới Định Mức
            </span>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-rose-600 mt-2">
            {lowStockItems.length} mặt hàng
          </div>
          <div className="text-xs text-rose-700 mt-1 font-medium">
            Cần lên kế hoạch mua hàng ngay
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Hàng Đang Trên Đường Về
            </span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Truck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-amber-700 mt-2">
            {purchaseOrders.filter(p => p.status === 'in_transit').length} đơn PO
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Theo dõi tiến độ từ nhà cung cấp
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Lô Cận Date (Dược/Thực Phẩm)
            </span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-purple-700 mt-2">
            {expiringLots.length} lô hàng
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Hạn sử dụng dưới 6 tháng
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="bg-white p-1 rounded-xl border border-slate-200 flex flex-wrap gap-1 shadow-xs">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'inventory'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          Kiểm Kê Tồn Kho & Barcode ({inventory.length})
        </button>

        <button
          onClick={() => setActiveTab('pos')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'pos'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          Đơn Mua Hàng & Hàng Đang Về ({purchaseOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'suppliers'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Quản Lý Nhà Cung Cấp ({suppliers.length})
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
          Phương Pháp Tính Giá Xuất Kho (FIFO / BQGQ / Đích Danh)
        </button>
      </div>

      {/* TAB 1: INVENTORY & BARCODE & LOTS */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Quick barcode search & filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Quét Barcode hoặc tìm tên, SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium"
              >
                <option value="all">Tất cả chủng loại</option>
                <option value="finished_good">Thành phẩm</option>
                <option value="raw_material">Nguyên vật liệu</option>
              </select>

              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium"
              >
                <option value="all">Tất cả các kho</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>

              <button
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  showLowStockOnly
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Dưới Tồn Tối Thiểu ({lowStockItems.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setNewItemSku(generateRandomSku());
                  setNewItemBarcode(generateBarcode());
                  setShowAddItemModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm Hàng Hóa Mới
              </button>

              <button
                onClick={() => {
                  const rows = inventory.map(item => ({
                    'Mã SKU': item.sku,
                    'Mã Vạch Barcode': item.barcode,
                    'Tên Hàng Hóa': item.name,
                    'Phân Loại': item.category === 'finished_good' ? 'Thành phẩm' : 'Nguyên vật liệu',
                    'ĐVT': item.unit,
                    'Tồn Thực Tế': item.totalQuantity,
                    'Tồn Tối Thiểu': item.minStockLevel,
                    'Giá Vốn (VNĐ)': item.standardCost,
                    'Giá Bán (VNĐ)': item.sellingPrice,
                    'Phương Pháp Giá': item.costMethod.toUpperCase(),
                  }));
                  exportToCSV('Kiem-Ke-Ton-Kho-Thoi-Gian-Thuc', rows);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Xuất Sheets
              </button>
            </div>
          </div>

          {/* Table of Inventory */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100/75 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Mã Hàng (SKU) / Barcode</th>
                    <th className="px-4 py-3">Tên Sản Phẩm / Vật Tư</th>
                    <th className="px-4 py-3 text-center">ĐVT</th>
                    <th className="px-4 py-3 text-right">Đơn Giá Bán & Vốn</th>
                    <th className="px-4 py-3 text-right">Tổng Tồn Kho</th>
                    <th className="px-4 py-3">Phân Bổ Theo Kho</th>
                    <th className="px-4 py-3">Lô & Hạn Dùng (EXP)</th>
                    <th className="px-4 py-3 text-center">Phương Pháp Giá</th>
                    <th className="px-4 py-3 text-center">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredInventory.map((item) => {
                    const isLow = item.totalQuantity <= item.minStockLevel;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {item.sku}
                            </span>
                            <button
                              onClick={() => setSelectedItemForBarcode(item)}
                              className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Xem mã vạch"
                            >
                              <Barcode className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Mã vạch: {item.barcode}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px]">
                              {item.category === 'finished_good' ? 'Thành phẩm' : 'Nguyên vật liệu / Phụ kiện'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-700 font-medium">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-800 text-[11px] font-semibold">
                            {item.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-bold text-slate-900 text-xs">
                            {formatVND(item.sellingPrice)}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Giá vốn: <span className="font-medium text-slate-700">{formatVND(item.standardCost)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className={`text-sm font-bold ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                            {formatNumber(item.totalQuantity)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Tối thiểu: {item.minStockLevel}
                          </div>
                          {isLow && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              SẮP HẾT HÀNG
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            {item.warehouses.map(w => (
                              <div key={w.warehouseId} className="text-[11px] text-slate-600 flex justify-between gap-3">
                                <span>{w.warehouseName}:</span>
                                <strong className="text-slate-900">{w.quantity}</strong>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {item.lots && item.lots.length > 0 ? (
                            <div className="space-y-1">
                              {item.lots.map(l => (
                                <div key={l.id} className="text-[11px]">
                                  <span className="font-mono font-medium text-slate-800">{l.lotNumber}</span>
                                  <span className="text-slate-500 ml-1">({l.quantity} {item.unit})</span>
                                  {l.expiryDate && (
                                    <div className="text-[10px] text-purple-700 font-medium flex items-center gap-1">
                                      <Calendar className="w-3 h-3" /> HSD: {formatDateVN(l.expiryDate)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Không có lô</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <select
                            value={item.costMethod}
                            onChange={(e) => onUpdateCostMethod(item.id, e.target.value as any)}
                            className="text-[11px] font-semibold bg-slate-100 border border-slate-300 rounded px-2 py-1 text-slate-800 cursor-pointer"
                          >
                            <option value="fifo">FIFO (Nhập trước)</option>
                            <option value="weighted_average">BQ Gia Quyền</option>
                            <option value="specific_id">Đích Danh</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditItem(item)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-[11px] transition-colors cursor-pointer border border-blue-200"
                              title="Chỉnh sửa mã hàng (SKU) và đơn giá"
                            >
                              <Pencil className="w-3 h-3 text-blue-600" />
                              Sửa Mã/Giá
                            </button>

                            {isLow ? (
                              <button
                                onClick={() => {
                                  setPoItemId(item.id);
                                  setPoUnitPrice(item.standardCost);
                                  setPoQuantity(item.minStockLevel * 2);
                                  setShowPoModal(true);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium text-[11px] transition-colors cursor-pointer shadow-xs"
                              >
                                <Plus className="w-3 h-3" /> Mua
                              </button>
                            ) : (
                              <button
                                onClick={() => setSelectedItemForBarcode(item)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-colors cursor-pointer border border-slate-300"
                                title="In tem mã vạch"
                              >
                                <Barcode className="w-3 h-3 text-slate-600" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PURCHASE ORDERS (QUẢN LÝ ĐƠN MUA HÀNG & HÀNG ĐANG VỀ) */}
      {activeTab === 'pos' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Kế Hoạch Mua Hàng & Đơn Hàng Đang Trên Đường Về (PO)
              </h3>
              <p className="text-xs text-slate-500">
                Tự động tính toán nhu cầu đặt hàng dựa trên tồn kho tối thiểu, theo dõi tiến độ giao hàng của nhà cung cấp
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const rows = purchaseOrders.map(p => ({
                    'Mã PO': p.poCode,
                    'Nhà Cung Cấp': p.supplierName,
                    'Ngày Đặt': p.orderDate,
                    'Dự Kiến Về': p.expectedDate,
                    'Tổng Tiền': p.totalAmount,
                    'Trạng Thái': p.status === 'in_transit' ? 'Hàng đang trên đường về' : p.status === 'received' ? 'Đã nhập kho' : 'Mới lập',
                  }));
                  exportToCSV('Don-Mua-Hang-PO-Cuong-Nguyet', rows);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Xuất Sheets
              </button>

              <button
                onClick={() => setShowPoModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Tạo Đơn Mua Hàng Mới
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/75 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Mã Đơn PO</th>
                  <th className="px-4 py-3">Nhà Cung Cấp</th>
                  <th className="px-4 py-3">Ngày Đặt / Dự Kiến Về</th>
                  <th className="px-4 py-3">Mặt Hàng & Số Lượng</th>
                  <th className="px-4 py-3 text-right">Tổng Tiền Đơn Mua</th>
                  <th className="px-4 py-3 text-center">Tiến Độ / Nhập Kho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {purchaseOrders.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-700">
                      {p.poCode}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{p.supplierName}</div>
                      <div className="text-[11px] text-slate-500">{p.notes}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{formatDateVN(p.orderDate)}</div>
                      <div className="text-[11px] text-amber-700 font-medium">Về dự kiến: {formatDateVN(p.expectedDate)}</div>
                    </td>
                    <td className="px-4 py-3">
                      {p.items.map((it, idx) => (
                        <div key={idx} className="text-slate-800">
                          • {it.itemName}: <span className="font-bold">{it.quantity}</span> {it.unit}
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatVND(p.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.status === 'in_transit' ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            <Truck className="w-3 h-3" /> Đang trên đường về
                          </span>
                          <button
                            onClick={() => onReceivePurchaseOrder(p.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] cursor-pointer shadow-xs"
                          >
                            <ArrowDownToLine className="w-3 h-3" />
                            Xác Nhận Nhập Kho
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Đã nhập kho đủ
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SUPPLIERS (QUẢN LÝ NHÀ CUNG CẤP & LỊCH SỬ GIÁ) */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Danh Sách Nhà Cung Cấp & Lịch Sử Biến Động Giá
              </h3>
              <p className="text-xs text-slate-500">
                Lưu trữ thời gian giao hàng (Lead time), lịch sử đơn giá nhập khẩu và công nợ phải trả (TK 331)
              </p>
            </div>
            <button
              onClick={() => {
                const rows = suppliers.map(s => ({
                  'Mã NCC': s.code,
                  'Tên Nhà Cung Cấp': s.name,
                  'Mã Số Thuế': s.taxCode,
                  'Số Điện Thoại': s.phone,
                  'Thời Gian Giao (Ngày)': s.leadTimeDays,
                  'Công Nợ Phải Trả': s.currentPayable,
                }));
                exportToCSV('Nha-Cung-Cap-Cuong-Nguyet', rows);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Xuất Sheets
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/75 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Mã NCC</th>
                  <th className="px-4 py-3">Tên Nhà Cung Cấp</th>
                  <th className="px-4 py-3">Người Liên Hệ</th>
                  <th className="px-4 py-3 text-center">Lead Time (Giao Hàng)</th>
                  <th className="px-4 py-3 text-right">Công Nợ Phải Trả (331)</th>
                  <th className="px-4 py-3">Lịch Sử Giá Mua Gần Nhất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                      {s.code}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{s.name}</div>
                      <div className="text-[11px] text-slate-500">MST: {s.taxCode} • {s.address}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{s.contactPerson}</div>
                      <div className="text-[11px] text-slate-500">{s.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                        <Clock className="w-3 h-3" /> {s.leadTimeDays} ngày
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatVND(s.currentPayable)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {s.priceHistory.map((ph, idx) => (
                          <div key={idx} className="text-[11px] bg-slate-50 p-1.5 rounded border border-slate-200">
                            <div className="font-medium text-slate-800">{ph.itemName}</div>
                            <div className="text-slate-500 flex justify-between gap-2 mt-0.5">
                              <span>Giá: <strong className="text-blue-700">{formatVND(ph.unitPrice)}</strong></span>
                              <span>Ngày: {formatDateVN(ph.updatedDate)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: INVENTORY COSTING METHODS (TÍNH GIÁ XUẤT KHO) */}
      {activeTab === 'costing' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <h4 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              Các Phương Pháp Tính Giá Xuất Kho Hỗ Trợ Chuẩn Kế Toán Việt Nam
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Hệ thống hỗ trợ linh hoạt 3 phương pháp tính giá xuất kho theo Thông tư 200/2014/TT-BTC và Thông tư 133/2016/TT-BTC, tự động tính toán giá vốn hàng bán (TK 632) và hạch toán vào sổ sách.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-blue-900">1. FIFO (Nhập Trước Xuất Trước)</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-200 text-blue-800 font-bold rounded">Khuyên Dùng</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Lô hàng nào nhập kho trước sẽ được ưu tiên xuất kho trước theo đúng đơn giá của lô đó.
                </p>
                <div className="mt-3 pt-3 border-t border-blue-200/80 text-[11px] text-slate-600">
                  <strong>Phù hợp:</strong> Thực phẩm, dược phẩm có hạn dùng, linh kiện công nghệ cao.
                </div>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-emerald-900">2. Bình Quân Gia Quyền</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-200 text-emerald-800 font-bold rounded">Phổ Biến</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Đơn giá xuất kho = (Giá trị tồn đầu + Giá trị nhập trong kỳ) / (Số lượng tồn đầu + Số lượng nhập).
                </p>
                <div className="mt-3 pt-3 border-t border-emerald-200/80 text-[11px] text-slate-600">
                  <strong>Phù hợp:</strong> Vật tư, hàng hóa có số lượng lớn, biến động giá liên tục.
                </div>
              </div>

              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-purple-900">3. Giá Đích Danh (Specific ID)</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-purple-200 text-purple-800 font-bold rounded">Chính Xác</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Xuất kho theo đúng đơn giá của chiếc/số serial hoặc lô hàng cụ thể được chỉ định khi xuất.
                </p>
                <div className="mt-3 pt-3 border-t border-purple-200/80 text-[11px] text-slate-600">
                  <strong>Phù hợp:</strong> Máy móc thiết bị giá trị cao, sản phẩm đặt hàng theo dự án.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TẠO ĐƠN MUA HÀNG PO */}
      {showPoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Lập Đơn Đặt Mua Hàng (PO)
              </h3>
              <button
                onClick={() => setShowPoModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nhà Cung Cấp</label>
                <select
                  value={poSupplierId}
                  onChange={(e) => setPoSupplierId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name} (Giao trong {s.leadTimeDays} ngày)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Mặt Hàng Cần Mua</label>
                <select
                  value={poItemId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setPoItemId(selectedId);
                    const found = inventory.find(i => i.id === selectedId);
                    if (found) {
                      setPoUnitPrice(found.standardCost);
                    }
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                >
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>
                      [{item.sku}] {item.name} (Tồn: {item.totalQuantity} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Mã Hàng & Đơn Giá Mua */}
              {(() => {
                const curItem = inventory.find(i => i.id === poItemId);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <label className="block text-slate-600 text-[11px] font-semibold mb-1">
                        Mã Hàng (SKU)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={curItem?.sku || ''}
                        className="w-full bg-slate-100 border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-blue-700 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 text-[11px] font-semibold mb-1">
                        Đơn Giá Mua (VNĐ / {curItem?.unit || 'ĐVT'})
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={poUnitPrice}
                        onChange={(e) => setPoUnitPrice(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-bold text-slate-900 text-xs"
                      />
                      <div className="text-[10px] text-blue-600 font-semibold mt-0.5">
                        ≈ {formatVND(poUnitPrice)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Số Lượng Đặt Mua</label>
                  <input
                    type="number"
                    min={1}
                    value={poQuantity}
                    onChange={(e) => setPoQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tổng Tiền Dự Kiến</label>
                  <div className="p-2 bg-slate-100 border border-slate-200 rounded-lg font-bold text-sm text-emerald-700">
                    {formatVND(poQuantity * poUnitPrice)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Ghi Chú Đơn Hàng</label>
                <input
                  type="text"
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPoModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg cursor-pointer shadow-xs"
                >
                  Tạo Đơn & Chuyển Trạng Thái Đang Về
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM MẶT HÀNG / VẬT TƯ MỚI (NHẬP MÃ HÀNG & ĐƠN GIÁ) */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PackagePlus className="w-5 h-5 text-blue-600" />
                  Thêm Mặt Hàng / Vật Tư Mới Vào Kho
                </h3>
                <p className="text-xs text-slate-500">
                  Nhập thông tin mã hàng (SKU), mã vạch barcode, đơn giá vốn và đơn giá bán
                </p>
              </div>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateItemSubmit} className="space-y-4 text-xs">
              {/* Tên hàng hóa */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Tên Sản Phẩm / Hàng Hóa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Ống nhựa PVC Tiền Phong D27, Cáp điện Cadivi 2x2.5, Vòi lavabo INAX..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden"
                />
              </div>

              {/* Mã Hàng & Mã Vạch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-700 font-semibold">
                      Mã Hàng (Mã SKU) <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewItemSku(generateRandomSku())}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Tự sinh mã
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="VD: SP-DN-1025 hoặc ONG-PVC-D27"
                    value={newItemSku}
                    onChange={(e) => setNewItemSku(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-700 font-semibold">
                      Mã Vạch (Barcode EAN-13)
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewItemBarcode(generateBarcode())}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Tự tạo mã 893
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="VD: 893888999001"
                    value={newItemBarcode}
                    onChange={(e) => setNewItemBarcode(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Phân loại & Đơn vị tính */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phân Loại Hàng</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  >
                    <option value="finished_good">Thành phẩm / Sản phẩm hoàn thiện</option>
                    <option value="raw_material">Nguyên vật liệu / Phụ kiện</option>
                    <option value="spare_part">Vật tư thay thế / Linh kiện</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Đơn Vị Tính (ĐVT)</label>
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  >
                    <option value="Cái">Cái</option>
                    <option value="Bộ">Bộ</option>
                    <option value="Mét">Mét</option>
                    <option value="Cuộn">Cuộn</option>
                    <option value="Cây">Cây</option>
                    <option value="Ống">Ống</option>
                    <option value="Hộp">Hộp</option>
                    <option value="Thùng">Thùng</option>
                    <option value="Kg">Kg</option>
                  </select>
                </div>
              </div>

              {/* ĐƠN GIÁ VỐN & ĐƠN GIÁ BÁN */}
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
                <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Thiết Lập Đơn Giá (VNĐ)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Đơn Giá Vốn / Giá Nhập (VNĐ) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      required
                      placeholder="VD: 50000"
                      value={newItemStandardCost}
                      onChange={(e) => setNewItemStandardCost(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
                    />
                    <div className="text-[10px] text-slate-600 font-semibold mt-0.5">
                      Bằng chữ: {formatVND(newItemStandardCost)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Đơn Giá Bán Niêm Yết (VNĐ) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      required
                      placeholder="VD: 75000"
                      value={newItemSellingPrice}
                      onChange={(e) => setNewItemSellingPrice(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-blue-700"
                    />
                    <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                      Bằng chữ: {formatVND(newItemSellingPrice)}
                    </div>
                  </div>
                </div>

                {newItemSellingPrice > 0 && newItemStandardCost > 0 && (
                  <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-blue-100">
                    <span>Lợi nhuận gộp dự kiến / ĐVT:</span>
                    <strong className="text-emerald-700">
                      {formatVND(newItemSellingPrice - newItemStandardCost)} ({(((newItemSellingPrice - newItemStandardCost) / newItemSellingPrice) * 100).toFixed(1)}%)
                    </strong>
                  </div>
                )}
              </div>

              {/* Tồn ban đầu & Kho */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tồn Kho Ban Đầu</label>
                  <input
                    type="number"
                    min={0}
                    value={newItemInitialQty}
                    onChange={(e) => setNewItemInitialQty(Math.max(0, Number(e.target.value)))}
                    className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Kho Lưu Trữ</label>
                  <select
                    value={newItemWarehouseId}
                    onChange={(e) => setNewItemWarehouseId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tồn Tối Thiểu (Min)</label>
                  <input
                    type="number"
                    min={0}
                    value={newItemMinStock}
                    onChange={(e) => setNewItemMinStock(Math.max(0, Number(e.target.value)))}
                    className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>

              {/* Phương pháp giá xuất kho */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Phương Pháp Tính Giá Xuất Kho</label>
                <select
                  value={newItemCostMethod}
                  onChange={(e) => setNewItemCostMethod(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                >
                  <option value="weighted_average">Bình quân gia quyền (Phổ biến)</option>
                  <option value="fifo">Nhập trước - Xuất trước (FIFO)</option>
                  <option value="specific_id">Giá đích danh theo từng lô</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <PackagePlus className="w-4 h-4" />
                  Lưu Mặt Hàng Vào Kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHỈNH SỬA MÃ HÀNG & ĐƠN GIÁ (QUICK EDIT SKU & PRICE) */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-blue-600" />
                  Chỉnh Sửa Mã Hàng & Đơn Giá
                </h3>
                <p className="text-[11px] text-slate-500">
                  Cập nhật mã SKU, giá vốn và giá bán cho hàng hóa
                </p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditItem} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Mã Hàng (Mã SKU) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editSku}
                  onChange={(e) => setEditSku(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Tên Mặt Hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Đơn Giá Vốn (VNĐ)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={editStandardCost}
                    onChange={(e) => setEditStandardCost(Math.max(0, Number(e.target.value)))}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {formatVND(editStandardCost)}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Đơn Giá Bán (VNĐ)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={editSellingPrice}
                    onChange={(e) => setEditSellingPrice(Math.max(0, Number(e.target.value)))}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                  <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                    {formatVND(editSellingPrice)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Đơn Vị Tính</label>
                  <input
                    type="text"
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tồn Tối Thiểu (Min)</label>
                  <input
                    type="number"
                    min={0}
                    value={editMinStock}
                    onChange={(e) => setEditMinStock(Math.max(0, Number(e.target.value)))}
                    className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg cursor-pointer shadow-xs"
                >
                  Cập Nhật Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: XEM VÀ IN MÃ VẠCH (BARCODE) */}
      {selectedItemForBarcode && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl text-center">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Tem Nhãn Mã Vạch (Barcode)
              </h3>
              <button
                onClick={() => setSelectedItemForBarcode(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="border border-slate-300 rounded-xl p-4 bg-white shadow-xs inline-block w-full">
              <div className="font-bold text-xs text-slate-800 line-clamp-1">{selectedItemForBarcode.name}</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {selectedItemForBarcode.sku}</div>

              {/* Simulated crisp SVG Barcode */}
              <div className="my-3 flex justify-center">
                <svg className="w-56 h-14" viewBox="0 0 200 60">
                  {Array.from({ length: 45 }).map((_, i) => {
                    const width = (i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1);
                    const x = i * 4.3 + 5;
                    return <rect key={i} x={x} y="5" width={width} height="40" fill="#0f172a" />;
                  })}
                  <text x="100" y="56" textAnchor="middle" fontSize="11" fontFamily="monospace" fill="#0f172a" fontWeight="bold">
                    {selectedItemForBarcode.barcode}
                  </text>
                </svg>
              </div>

              <div className="text-[11px] text-slate-700 font-semibold">
                Giá niêm yết: {formatVND(selectedItemForBarcode.sellingPrice)}
              </div>
            </div>

            <div className="mt-4 flex gap-2 justify-center">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 cursor-pointer shadow-xs"
              >
                In Tem Mã Vạch (Barcode)
              </button>
              <button
                onClick={() => setSelectedItemForBarcode(null)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
