import React, { useState, useMemo } from 'react';
import {
  Quote,
  SalesOrder,
  DeliveryNote,
  Customer,
  InventoryItem,
  Warehouse,
  SalesOrderItem,
} from '../../types';
import { formatVND, formatNumber, formatDateVN, generateId } from '../../utils/formatters';
import { exportToCSV } from '../../services/storage';
import {
  Plus,
  ArrowRightCircle,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Search,
  DollarSign,
  TrendingUp,
  UserCheck,
  Package,
  Layers,
  FileText,
  CreditCard,
  Building2,
  ChevronRight,
  Printer,
  Trash2,
  Eye,
} from 'lucide-react';

interface SalesModuleProps {
  quotes: Quote[];
  orders: SalesOrder[];
  deliveryNotes: DeliveryNote[];
  customers: Customer[];
  inventory: InventoryItem[];
  warehouses: Warehouse[];
  onAddQuote: (quote: Quote) => void;
  onConvertQuoteToOrder: (quoteId: string) => void;
  onCreateDeliveryNote: (deliveryNote: DeliveryNote) => void;
  onRecordCustomerPayment: (customerId: string, amount: number, note: string) => void;
  onGenerateInvoiceFromOrder: (order: SalesOrder) => void;
}

export const SalesModule: React.FC<SalesModuleProps> = ({
  quotes,
  orders,
  deliveryNotes,
  customers,
  inventory,
  warehouses,
  onAddQuote,
  onConvertQuoteToOrder,
  onCreateDeliveryNote,
  onRecordCustomerPayment,
  onGenerateInvoiceFromOrder,
}) => {
  const [activeTab, setActiveTab] = useState<'quotes' | 'orders' | 'delivery' | 'receivables' | 'analytics'>('quotes');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedQuoteForView, setSelectedQuoteForView] = useState<Quote | null>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState<SalesOrder | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<Customer | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<number>(0);
  const [paymentNoteInput, setPaymentNoteInput] = useState<string>('Khách hàng thanh toán chuyển khoản');

  // Form State for new quote
  const [quoteForm, setQuoteForm] = useState({
    customerId: customers[0]?.id || '',
    salesRep: 'Trần Minh Tuấn',
    validDays: 30,
    notes: '',
    items: [
      {
        itemId: inventory[0]?.id || '',
        sku: inventory[0]?.sku || 'DN-01',
        itemName: inventory[0]?.name || '',
        unit: inventory[0]?.unit || 'Cái',
        unitPrice: inventory[0]?.sellingPrice || 50000,
        quantity: 5,
        discountPercent: 0,
        vatPercent: 8,
      },
    ],
  });

  // Helpers for Quote Items list
  const handleAddQuoteItemRow = () => {
    const defaultItem = inventory[0];
    setQuoteForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemId: defaultItem?.id || '',
          sku: defaultItem?.sku || '',
          itemName: defaultItem?.name || '',
          unit: defaultItem?.unit || 'Cái',
          unitPrice: defaultItem?.sellingPrice || 0,
          quantity: 1,
          discountPercent: 0,
          vatPercent: 8,
        },
      ],
    }));
  };

  const handleRemoveQuoteItemRow = (index: number) => {
    if (quoteForm.items.length <= 1) return;
    setQuoteForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const handleUpdateQuoteItemField = (index: number, field: string, value: any) => {
    setQuoteForm((prev) => {
      const updated = [...prev.items];
      if (field === 'itemId') {
        const found = inventory.find((i) => i.id === value);
        if (found) {
          updated[index] = {
            ...updated[index],
            itemId: found.id,
            sku: found.sku,
            itemName: found.name,
            unit: found.unit,
            unitPrice: found.sellingPrice,
          };
        } else {
          updated[index] = { ...updated[index], itemId: value };
        }
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...prev, items: updated };
    });
  };

  // Calculate totals for Analytics
  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, o) => sum + o.grandTotal, 0);
  }, [orders]);

  const totalCollected = useMemo(() => {
    return orders.reduce((sum, o) => sum + o.paidAmount, 0);
  }, [orders]);

  const totalReceivables = useMemo(() => {
    return customers.reduce((sum, c) => sum + c.currentDebt, 0);
  }, [customers]);

  const pendingDeliveryCount = useMemo(() => {
    return orders.filter(o => o.deliveryStatus !== 'da_giao').length;
  }, [orders]);

  // Delivery filter
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'chua_giao' | 'giao_mot_phan' | 'da_giao'>('all');

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchSearch =
        o.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.salesRep.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDelivery = deliveryFilter === 'all' || o.deliveryStatus === deliveryFilter;
      return matchSearch && matchDelivery;
    });
  }, [orders, searchTerm, deliveryFilter]);

  // Handle quote creation
  const handleSaveQuote = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === quoteForm.customerId);
    if (!cust) return;

    let subTotal = 0;
    let discountTotal = 0;
    let vatTotal = 0;

    const items = quoteForm.items.map((it, idx) => {
      const invItem = inventory.find(i => i.id === it.itemId);
      const unitPrice = Number(it.unitPrice) >= 0 ? Number(it.unitPrice) : (invItem ? invItem.sellingPrice : 0);
      const sku = it.sku?.trim() || (invItem ? invItem.sku : 'SKU-01');
      const itemName = it.itemName?.trim() || (invItem ? invItem.name : 'Sản phẩm');
      const unit = it.unit?.trim() || (invItem ? invItem.unit : 'Cái');
      const rawAmount = unitPrice * it.quantity;
      const discount = (rawAmount * it.discountPercent) / 100;
      const taxable = rawAmount - discount;
      const vat = (taxable * it.vatPercent) / 100;
      const amount = taxable + vat;

      subTotal += rawAmount;
      discountTotal += discount;
      vatTotal += vat;

      return {
        id: `qi-${Date.now()}-${idx}`,
        itemId: it.itemId,
        itemName,
        sku,
        unit,
        quantity: it.quantity,
        unitPrice,
        discountPercent: it.discountPercent,
        vatPercent: it.vatPercent,
        amount,
      };
    });

    const grandTotal = subTotal - discountTotal + vatTotal;
    const now = new Date();
    const validUntil = new Date(now.getTime() + quoteForm.validDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const newQuote: Quote = {
      id: generateId('quote'),
      quoteCode: `BG-2024-${String(quotes.length + 101).padStart(3, '0')}`,
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      customerAddress: cust.address,
      customerTaxCode: cust.taxCode,
      salesRep: quoteForm.salesRep,
      createdDate: now.toISOString().slice(0, 10),
      validUntil,
      status: 'sent',
      items,
      subTotal,
      discountTotal,
      vatTotal,
      grandTotal,
      notes: quoteForm.notes,
    };

    onAddQuote(newQuote);
    setShowQuoteModal(false);
  };

  // Handle Delivery creation
  const handleCreateDeliverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForDelivery) return;

    // Delivery items based on user inputs
    const deliveryItems = selectedOrderForDelivery.items
      .filter(it => it.remainingQuantity > 0)
      .map(it => ({
        itemId: it.itemId,
        itemName: it.itemName,
        sku: it.sku,
        unit: it.unit,
        orderedQty: it.quantity,
        deliverQty: it.remainingQuantity, // giao nốt phần còn lại
        remainQty: 0,
        lotNumber: 'LOT-' + new Date().toISOString().slice(2, 7).replace('-', ''),
      }));

    const wh = warehouses.find(w => w.id === selectedOrderForDelivery.warehouseId) || warehouses[0];

    const newDelivery: DeliveryNote = {
      id: generateId('pxk'),
      deliveryCode: `PXK-2024-${String(deliveryNotes.length + 56).padStart(3, '0')}`,
      salesOrderId: selectedOrderForDelivery.id,
      orderCode: selectedOrderForDelivery.orderCode,
      customerId: selectedOrderForDelivery.customerId,
      customerName: selectedOrderForDelivery.customerName,
      deliveryDate: new Date().toISOString().slice(0, 10),
      warehouseId: wh.id,
      warehouseName: wh.name,
      carrierName: 'Đội Vận Chuyển Cường Nguyệt Express',
      status: 'delivered',
      items: deliveryItems,
      notes: `Xuất kho giao cho đơn hàng ${selectedOrderForDelivery.orderCode}`,
    };

    onCreateDeliveryNote(newDelivery);
    setShowDeliveryModal(false);
    setSelectedOrderForDelivery(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tổng Doanh Số Đơn Hàng
            </span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">
            {formatVND(totalRevenue)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-600 font-medium font-mono">{orders.length}</span> đơn hàng đã phát sinh
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Đã Thu Tiền Thực Tế
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-2">
            {formatVND(totalCollected)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Đạt {totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0}% giá trị đơn hàng
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Công Nợ Phải Thu (131)
            </span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-amber-700 mt-2">
            {formatVND(totalReceivables)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Tổng nợ của {customers.length} khách hàng
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Đơn Chưa Giao / Còn Nợ
            </span>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <Truck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-rose-600 mt-2">
            {pendingDeliveryCount} đơn hàng
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Cần lập phiếu xuất kho giao hàng
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="bg-white p-1 rounded-xl border border-slate-200 flex flex-wrap gap-1 shadow-xs">
        <button
          onClick={() => setActiveTab('quotes')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'quotes'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Quản Lý Báo Giá ({quotes.length})
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'orders'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          Đơn Hàng Bán ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('delivery')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'delivery'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          Giao Hàng & Xuất Kho ({deliveryNotes.length})
        </button>

        <button
          onClick={() => setActiveTab('receivables')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'receivables'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Công Nợ & Hạn Mức Tín Dụng
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'analytics'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Phân Tích Doanh Số Đa Chiều
        </button>
      </div>

      {/* TAB 1: QUOTES (QUẢN LÝ BÁO GIÁ) */}
      {activeTab === 'quotes' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Danh Sách Báo Giá Khách Hàng
              </h3>
              <p className="text-xs text-slate-500">
                Tạo báo giá chuyên nghiệp và chuyển đổi tự động 1-click thành Đơn hàng
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const exportData = quotes.map(q => ({
                    'Mã Báo Giá': q.quoteCode,
                    'Khách Hàng': q.customerName,
                    'Điện Thoại': q.customerPhone,
                    'Ngày Lập': q.createdDate,
                    'Hiệu Lực Đến': q.validUntil,
                    'Tổng Tiền (VNĐ)': q.grandTotal,
                    'Trạng Thái': q.status === 'converted' ? 'Đã chuyển đơn hàng' : 'Đang hiệu lực',
                    'NVKD': q.salesRep,
                  }));
                  exportToCSV('Bao-Gia-Kinh-Doanh-Cuong-Nguyet', exportData);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Xuất Excel / Sheets
              </button>

              <button
                onClick={() => setShowQuoteModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Tạo Báo Giá Mới
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/75 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Mã Báo Giá</th>
                  <th className="px-4 py-3">Khách Hàng</th>
                  <th className="px-4 py-3">Ngày Lập / Hết Hạn</th>
                  <th className="px-4 py-3 text-right">Tổng Giá Trị</th>
                  <th className="px-4 py-3">NVKD Phụ Trách</th>
                  <th className="px-4 py-3 text-center">Trạng Thái</th>
                  <th className="px-4 py-3 text-center">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-700">
                      {q.quoteCode}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{q.customerName}</div>
                      <div className="text-[11px] text-slate-500">{q.customerPhone} • {q.customerAddress}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{formatDateVN(q.createdDate)}</div>
                      <div className="text-[11px] text-slate-500">Đến: {formatDateVN(q.validUntil)}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatVND(q.grandTotal)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {q.salesRep}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {q.status === 'converted' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Đã tạo Đơn hàng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                          <Clock className="w-3 h-3" /> Đang chờ duyệt
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedQuoteForView(q)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-colors cursor-pointer border border-slate-300"
                          title="Xem chi tiết bảng hàng hóa, mã hàng và đơn giá"
                        >
                          <Eye className="w-3 h-3 text-slate-600" />
                          Chi Tiết
                        </button>

                        {q.status !== 'converted' ? (
                          <button
                            onClick={() => onConvertQuoteToOrder(q.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition-colors cursor-pointer shadow-xs"
                            title="Tự động chuyển báo giá thành Đơn hàng bán"
                          >
                            <ArrowRightCircle className="w-3.5 h-3.5" />
                            Tạo ĐH
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">
                            Mã ĐH: {orders.find(o => o.quoteId === q.id)?.orderCode || 'DH-2024-xxx'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SALES ORDERS (QUẢN LÝ ĐƠN HÀNG) */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Danh Sách Đơn Hàng Bán (Sales Orders)
              </h3>
              <p className="text-xs text-slate-500">
                Theo dõi tiến độ thực hiện, giao hàng còn nợ và tự động xuất hóa đơn GTGT
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Filter delivery status */}
              <select
                value={deliveryFilter}
                onChange={(e) => setDeliveryFilter(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium"
              >
                <option value="all">Tất cả tình trạng giao</option>
                <option value="chua_giao">Chưa giao</option>
                <option value="giao_mot_phan">Còn nợ (giao một phần)</option>
                <option value="da_giao">Đã giao đủ</option>
              </select>

              <button
                onClick={() => {
                  const exportData = orders.map(o => ({
                    'Mã Đơn Hàng': o.orderCode,
                    'Khách Hàng': o.customerName,
                    'Ngày Đặt': o.orderDate,
                    'Tổng Tiền': o.grandTotal,
                    'Đã Thanh Toán': o.paidAmount,
                    'Tình Trạng Giao': o.deliveryStatus === 'da_giao' ? 'Đã giao đủ' : o.deliveryStatus === 'giao_mot_phan' ? 'Giao một phần (Còn nợ)' : 'Chưa giao',
                    'Thanh Toán': o.paymentStatus === 'paid' ? 'Đã thanh toán' : o.paymentStatus === 'partial' ? 'Một phần' : 'Chưa thu',
                  }));
                  exportToCSV('Don-Hang-Ban-Cuong-Nguyet', exportData);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Xuất Sheets
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/75 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Mã Đơn Hàng</th>
                  <th className="px-4 py-3">Khách Hàng</th>
                  <th className="px-4 py-3">Ngày Đặt Hàng</th>
                  <th className="px-4 py-3 text-right">Tổng Tiền / Đã Thu</th>
                  <th className="px-4 py-3">Tình Trạng Giao Hàng</th>
                  <th className="px-4 py-3 text-center">Hóa Đơn / Xuất Kho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-700">
                      {o.orderCode}
                      {o.quoteId && (
                        <div className="text-[10px] text-slate-500 font-normal">Từ: {quotes.find(q => q.id === o.quoteId)?.quoteCode}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{o.customerName}</div>
                      <div className="text-[11px] text-slate-500">NVKD: {o.salesRep}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{formatDateVN(o.orderDate)}</div>
                      <div className="text-[11px] text-slate-500">Hạn giao: {formatDateVN(o.expectedDeliveryDate)}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-bold text-slate-900">{formatVND(o.grandTotal)}</div>
                      <div className="text-[11px] text-emerald-600 font-medium">
                        Đã thu: {formatVND(o.paidAmount)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {o.deliveryStatus === 'da_giao' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Đã giao đủ
                        </span>
                      )}
                      {o.deliveryStatus === 'giao_mot_phan' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertCircle className="w-3 h-3" /> Còn nợ giao hàng
                        </span>
                      )}
                      {o.deliveryStatus === 'chua_giao' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                          <Clock className="w-3 h-3" /> Chưa giao hàng
                        </span>
                      )}
                      {/* Detailed item delivery progress */}
                      <div className="mt-1 space-y-0.5">
                        {o.items.map((it, idx) => (
                          <div key={idx} className="text-[11px] text-slate-500">
                            • {it.itemName.slice(0, 30)}...: Đã giao{' '}
                            <strong className="text-slate-800">{it.deliveredQuantity}</strong>/{it.quantity} {it.unit}
                            {it.remainingQuantity > 0 && (
                              <span className="text-rose-600 font-medium ml-1">
                                (Còn nợ: {it.remainingQuantity})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {o.deliveryStatus !== 'da_giao' && (
                          <button
                            onClick={() => {
                              setSelectedOrderForDelivery(o);
                              setShowDeliveryModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium text-[11px] transition-colors cursor-pointer shadow-xs"
                          >
                            <Truck className="w-3 h-3" />
                            Lập Phiếu Xuất Kho
                          </button>
                        )}
                        <button
                          onClick={() => onGenerateInvoiceFromOrder(o)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-colors cursor-pointer border border-slate-300"
                        >
                          <FileText className="w-3 h-3 text-purple-600" />
                          Xuất HĐĐT TT78
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DELIVERY & WAREHOUSE OUT (QUẢN LÝ GIAO HÀNG & PHIẾU XUẤT KHO) */}
      {activeTab === 'delivery' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Lịch Sử Phiếu Xuất Kho & Tình Trạng Giao Hàng
                </h3>
                <p className="text-xs text-slate-500">
                  Theo dõi số lượng đã giao, hàng còn nợ khách và giảm trừ tồn kho tự động
                </p>
              </div>
              <button
                onClick={() => {
                  const rows = deliveryNotes.map(d => ({
                    'Mã Phiếu': d.deliveryCode,
                    'Mã Đơn': d.orderCode,
                    'Khách Hàng': d.customerName,
                    'Ngày Giao': d.deliveryDate,
                    'Kho Xuất': d.warehouseName,
                    'Vận Chuyển': d.carrierName,
                    'Trạng Thái': d.status === 'delivered' ? 'Đã giao' : 'Đang giao',
                  }));
                  exportToCSV('Phieu-Xuat-Kho-Giao-Hang', rows);
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
                    <th className="px-4 py-3">Mã Phiếu Xuất</th>
                    <th className="px-4 py-3">Đơn Hàng / Khách Hàng</th>
                    <th className="px-4 py-3">Ngày Xuất / Kho</th>
                    <th className="px-4 py-3">Hàng Hóa Xuất Kho & Lô</th>
                    <th className="px-4 py-3">Đơn Vị Vận Chuyển</th>
                    <th className="px-4 py-3 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {deliveryNotes.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-blue-700">
                        {d.deliveryCode}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{d.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">Đơn: {d.orderCode}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{formatDateVN(d.deliveryDate)}</div>
                        <div className="text-[11px] text-slate-500">{d.warehouseName}</div>
                      </td>
                      <td className="px-4 py-3">
                        {d.items.map((it, idx) => (
                          <div key={idx} className="text-slate-800">
                            • {it.itemName}: <span className="font-semibold">{it.deliverQty}</span> {it.unit}
                            {it.remainQty > 0 ? (
                              <span className="text-rose-600 font-medium ml-1">
                                (Còn nợ: {it.remainQty})
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-medium ml-1">
                                (Đã giao đủ)
                              </span>
                            )}
                            {it.lotNumber && (
                              <span className="text-[10px] text-slate-500 font-mono block">
                                Lô: {it.lotNumber}
                              </span>
                            )}
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {d.carrierName}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Đã hoàn thành
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RECEIVABLES & CREDIT LIMIT (CÔNG NỢ PHẢI THU & HẠN MỨC TÍN DỤNG) */}
      {activeTab === 'receivables' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Quản Lý Công Nợ Phải Thu & Hạn Mức Tín Dụng Khách Hàng (TK 131)
                </h3>
                <p className="text-xs text-slate-500">
                  Tự động cập nhật công nợ khi phát sinh hóa đơn, cảnh báo rủi ro khi vượt quá hạn mức tín dụng
                </p>
              </div>
              <button
                onClick={() => {
                  const rows = customers.map(c => ({
                    'Mã KH': c.code,
                    'Tên Khách Hàng': c.name,
                    'Số Điện Thoại': c.phone,
                    'Hạn Mức Tín Dụng': c.creditLimit,
                    'Công Nợ Hiện Tại': c.currentDebt,
                    'Còn Lại Được Nợ': c.creditLimit - c.currentDebt,
                    'Tỷ Lệ Sử Dụng Nợ (%)': Math.round((c.currentDebt / c.creditLimit) * 100),
                    'NVKD': c.salesRepAssigned,
                  }));
                  exportToCSV('Cong-No-Phai-Thu-Khach-Hang-131', rows);
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
                    <th className="px-4 py-3">Mã KH</th>
                    <th className="px-4 py-3">Tên Doanh Nghiệp / Khách Hàng</th>
                    <th className="px-4 py-3 text-right">Hạn Mức Tín Dụng</th>
                    <th className="px-4 py-3 text-right">Công Nợ Hiện Tại</th>
                    <th className="px-4 py-3 text-center">Tỷ Lệ & Cảnh Báo</th>
                    <th className="px-4 py-3 text-center">Hạn Nợ</th>
                    <th className="px-4 py-3 text-center">Thu Tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {customers.map((c) => {
                    const usagePercent = Math.round((c.currentDebt / c.creditLimit) * 100);
                    const isOver = usagePercent >= 100;
                    const isWarning = usagePercent >= 80 && !isOver;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                          {c.code}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{c.name}</div>
                          <div className="text-[11px] text-slate-500">
                            {c.contactPerson} • {c.phone}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">
                          {formatVND(c.creditLimit)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {formatVND(c.currentDebt)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center">
                            <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden mb-1">
                              <div
                                className={`h-full rounded-full ${
                                  isOver
                                    ? 'bg-rose-600'
                                    : isWarning
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(usagePercent, 100)}%` }}
                              />
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isOver
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : isWarning
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {usagePercent}% {isOver ? 'VƯỢT HẠN MỨC' : isWarning ? 'CẢNH BÁO CAO' : 'AN TOÀN'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-700 font-medium">
                          {c.paymentTermsDays} ngày
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedCustomerForPayment(c);
                              setPaymentAmountInput(c.currentDebt > 0 ? c.currentDebt : 10000000);
                              setShowPaymentModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] transition-colors cursor-pointer shadow-xs"
                          >
                            <DollarSign className="w-3 h-3" />
                            Lập Phiếu Thu
                          </button>
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

      {/* TAB 5: SALES ANALYTICS (PHÂN TÍCH DOANH SỐ ĐA CHIỀU) */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales by Customer */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Doanh Số Theo Từng Khách Hàng
                </h4>
                <span className="text-xs text-slate-500">Top đối tác lớn</span>
              </div>
              <div className="space-y-3">
                {customers.map((c) => {
                  const custOrders = orders.filter(o => o.customerId === c.id);
                  const custTotal = custOrders.reduce((sum, o) => sum + o.grandTotal, 0);
                  const percent = totalRevenue > 0 ? Math.round((custTotal / totalRevenue) * 100) : 0;

                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-800">{c.name}</span>
                        <span className="font-bold text-slate-900">{formatVND(custTotal)} ({percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sales by Sales Representative */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  Hiệu Quả Nhân Viên Kinh Doanh (Sales Rep)
                </h4>
                <span className="text-xs text-slate-500">Doanh số thực tế</span>
              </div>
              <div className="space-y-3">
                {['Trần Minh Tuấn', 'Lê Thu Trang', 'Đỗ Hải Đăng'].map((rep) => {
                  const repOrders = orders.filter(o => o.salesRep === rep);
                  const repTotal = repOrders.reduce((sum, o) => sum + o.grandTotal, 0);
                  const percent = totalRevenue > 0 ? Math.round((repTotal / totalRevenue) * 100) : 0;

                  return (
                    <div key={rep} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-800">{rep} ({repOrders.length} đơn)</span>
                        <span className="font-bold text-slate-900">{formatVND(repTotal)} ({percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sales by Product Item */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h4 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" />
              Doanh Số Theo Từng Mặt Hàng (Real-Time Item Performance)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px]">
                  <tr>
                    <th className="px-4 py-2.5">Tên Mặt Hàng</th>
                    <th className="px-4 py-2.5">Mã SKU</th>
                    <th className="px-4 py-2.5 text-center">ĐVT</th>
                    <th className="px-4 py-2.5 text-right">Số Lượng Đã Bán</th>
                    <th className="px-4 py-2.5 text-right">Doanh Thu Thuần</th>
                    <th className="px-4 py-2.5 text-center">Tỷ Trọng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {inventory.filter(i => i.category === 'finished_good').map(item => {
                    let totalQtySold = 0;
                    let totalRevenueItem = 0;

                    orders.forEach(o => {
                      o.items.forEach(it => {
                        if (it.itemId === item.id) {
                          totalQtySold += it.quantity;
                          totalRevenueItem += it.amount;
                        }
                      });
                    });

                    const pct = totalRevenue > 0 ? Math.round((totalRevenueItem / totalRevenue) * 100) : 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-900">{item.name}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-600">{item.sku}</td>
                        <td className="px-4 py-2.5 text-center">{item.unit}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-800">{formatNumber(totalQtySold)}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-blue-700">{formatVND(totalRevenueItem)}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[11px]">
                            {pct}%
                          </span>
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

      {/* MODAL: TẠO BÁO GIÁ MỚI (HỖ TRỢ NHẬP MÃ HÀNG & ĐƠN GIÁ THỦ CÔNG) */}
      {showQuoteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Lập Báo Giá Bán Hàng Mới
                </h3>
                <p className="text-xs text-slate-500">
                  Hỗ trợ chọn từ kho hoặc nhập trực tiếp Mã Hàng (SKU) và Đơn Giá bán theo yêu cầu
                </p>
              </div>
              <button
                onClick={() => setShowQuoteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuote} className="mt-4 space-y-4 text-xs">
              {/* Thông tin chung */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Khách Hàng <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={quoteForm.customerId}
                    onChange={(e) => setQuoteForm({ ...quoteForm, customerId: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-medium"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">NVKD Phụ Trách</label>
                  <input
                    type="text"
                    value={quoteForm.salesRep}
                    onChange={(e) => setQuoteForm({ ...quoteForm, salesRep: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Hiệu Lực Báo Giá (Số ngày)</label>
                  <input
                    type="number"
                    min={1}
                    value={quoteForm.validDays}
                    onChange={(e) => setQuoteForm({ ...quoteForm, validDays: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>

              {/* BẢNG DANH SÁCH MẶT HÀNG BÁO GIÁ: MÃ HÀNG & ĐƠN GIÁ */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="p-3 bg-slate-100/80 border-b border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-800 text-xs">
                      Danh Sách Mặt Hàng Báo Giá
                    </span>
                    <span className="text-slate-500 text-[11px] ml-2">
                      (Có thể sửa trực tiếp Mã SKU và Đơn giá)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddQuoteItemRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm Dòng Hàng Hóa
                  </button>
                </div>

                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-semibold text-[11px] border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="p-2.5 w-10 text-center">#</th>
                        <th className="p-2.5 min-w-[180px]">Mặt Hàng (Kho)</th>
                        <th className="p-2.5 w-28">Mã Hàng (SKU)</th>
                        <th className="p-2.5 w-20">ĐVT</th>
                        <th className="p-2.5 w-32 text-right">Đơn Giá Bán (VNĐ)</th>
                        <th className="p-2.5 w-20 text-center">SL</th>
                        <th className="p-2.5 w-16 text-center">CK (%)</th>
                        <th className="p-2.5 w-16 text-center">VAT (%)</th>
                        <th className="p-2.5 w-28 text-right">Thành Tiền</th>
                        <th className="p-2.5 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {quoteForm.items.map((row, idx) => {
                        const rowPrice = Number(row.unitPrice) || 0;
                        const rowQty = Number(row.quantity) || 0;
                        const raw = rowPrice * rowQty;
                        const disc = (raw * (Number(row.discountPercent) || 0)) / 100;
                        const vat = ((raw - disc) * (Number(row.vatPercent) || 0)) / 100;
                        const lineTotal = raw - disc + vat;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="p-2 text-center text-slate-400 font-medium">{idx + 1}</td>

                            {/* Chọn từ kho */}
                            <td className="p-2">
                              <select
                                value={row.itemId}
                                onChange={(e) => handleUpdateQuoteItemField(idx, 'itemId', e.target.value)}
                                className="w-full border border-slate-300 rounded p-1 text-xs bg-white"
                              >
                                <option value="">-- Chọn sản phẩm có sẵn --</option>
                                {inventory.map((inv) => (
                                  <option key={inv.id} value={inv.id}>
                                    [{inv.sku}] {inv.name} ({formatVND(inv.sellingPrice)})
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="Hoặc nhập tên mặt hàng..."
                                value={row.itemName}
                                onChange={(e) => handleUpdateQuoteItemField(idx, 'itemName', e.target.value)}
                                className="w-full border border-slate-200 rounded p-1 mt-1 text-[11px] text-slate-700 font-medium"
                              />
                            </td>

                            {/* Mã Hàng (SKU) - Nhập tay */}
                            <td className="p-2">
                              <input
                                type="text"
                                required
                                placeholder="Mã SKU"
                                value={row.sku}
                                onChange={(e) => handleUpdateQuoteItemField(idx, 'sku', e.target.value)}
                                className="w-full border border-slate-300 rounded p-1 text-xs font-mono font-bold text-blue-700 bg-blue-50/30"
                              />
                            </td>

                            {/* Đơn vị tính */}
                            <td className="p-2">
                              <input
                                type="text"
                                placeholder="ĐVT"
                                value={row.unit}
                                onChange={(e) => handleUpdateQuoteItemField(idx, 'unit', e.target.value)}
                                className="w-full border border-slate-300 rounded p-1 text-xs text-center"
                              />
                            </td>

                            {/* Đơn Giá Bán (VNĐ) - Nhập tay */}
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                min={0}
                                step={1000}
                                required
                                value={row.unitPrice}
                                onChange={(e) =>
                                  handleUpdateQuoteItemField(idx, 'unitPrice', Math.max(0, Number(e.target.value)))
                                }
                                className="w-full border border-slate-300 rounded p-1 text-xs font-bold text-slate-900 text-right bg-amber-50/20 focus:bg-white"
                              />
                              <div className="text-[10px] text-blue-600 font-medium mt-0.5">
                                {formatVND(rowPrice)}
                              </div>
                            </td>

                            {/* Số Lượng */}
                            <td className="p-2">
                              <input
                                type="number"
                                min={1}
                                required
                                value={row.quantity}
                                onChange={(e) =>
                                  handleUpdateQuoteItemField(idx, 'quantity', Math.max(1, Number(e.target.value)))
                                }
                                className="w-full border border-slate-300 rounded p-1 text-xs font-bold text-center"
                              />
                            </td>

                            {/* Chiết Khấu % */}
                            <td className="p-2">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={row.discountPercent}
                                onChange={(e) =>
                                  handleUpdateQuoteItemField(idx, 'discountPercent', Number(e.target.value))
                                }
                                className="w-full border border-slate-300 rounded p-1 text-xs text-center"
                              />
                            </td>

                            {/* VAT % */}
                            <td className="p-2">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={row.vatPercent}
                                onChange={(e) =>
                                  handleUpdateQuoteItemField(idx, 'vatPercent', Number(e.target.value))
                                }
                                className="w-full border border-slate-300 rounded p-1 text-xs text-center"
                              />
                            </td>

                            {/* Thành Tiền */}
                            <td className="p-2 text-right font-bold text-slate-900">
                              {formatVND(lineTotal)}
                            </td>

                            {/* Xóa dòng */}
                            <td className="p-2 text-center">
                              {quoteForm.items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveQuoteItemRow(idx)}
                                  className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                  title="Xóa dòng"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TỔNG KẾT TÀI CHÍNH */}
              {(() => {
                let subTotal = 0;
                let discountTotal = 0;
                let vatTotal = 0;
                quoteForm.items.forEach((it) => {
                  const raw = (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0);
                  const disc = (raw * (Number(it.discountPercent) || 0)) / 100;
                  const vat = ((raw - disc) * (Number(it.vatPercent) || 0)) / 100;
                  subTotal += raw;
                  discountTotal += disc;
                  vatTotal += vat;
                });
                const grandTotal = subTotal - discountTotal + vatTotal;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        Ghi Chú Điều Khoản Thương Mại
                      </label>
                      <textarea
                        rows={3}
                        value={quoteForm.notes}
                        onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                        placeholder="Điều khoản giao nhận tại công trình, bảo hành thiết bị, phương thức thanh toán chuyển khoản..."
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                      />
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Tiền hàng (chưa thuế):</span>
                        <span className="font-semibold text-slate-900">{formatVND(subTotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Chiết khấu thương mại:</span>
                        <span className="font-semibold text-rose-600">- {formatVND(discountTotal)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Tiền thuế GTGT (VAT):</span>
                        <span className="font-semibold text-slate-900">+ {formatVND(vatTotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                        <span>Tổng Giá Trị Báo Giá:</span>
                        <span className="text-blue-700 font-mono text-base">{formatVND(grandTotal)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowQuoteModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  Lưu & Gửi Báo Giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: XEM CHI TIẾT BÁO GIÁ (HIỂN THỊ ĐẦY ĐỦ MÃ HÀNG & ĐƠN GIÁ) */}
      {selectedQuoteForView && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-slate-200">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                  BÁO GIÁ THƯƠNG MẠI
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  Báo Giá: {selectedQuoteForView.quoteCode}
                </h2>
                <div className="text-xs text-slate-500">
                  Cửa Hàng Điện Nước Cường Nguyệt • Ngày lập: {formatDateVN(selectedQuoteForView.createdDate)} • Hiệu lực đến: {formatDateVN(selectedQuoteForView.validUntil)}
                </div>
              </div>
              <button
                onClick={() => setSelectedQuoteForView(null)}
                className="text-slate-400 hover:text-slate-600 text-xl cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Thông tin đối tác */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Bên Mua (Khách Hàng):</span>
                  <div className="font-bold text-slate-900 text-sm">{selectedQuoteForView.customerName}</div>
                  <div className="text-slate-600 text-[11px] mt-0.5">SĐT: {selectedQuoteForView.customerPhone}</div>
                  <div className="text-slate-600 text-[11px]">Địa chỉ: {selectedQuoteForView.customerAddress}</div>
                  {selectedQuoteForView.customerTaxCode && (
                    <div className="text-slate-600 text-[11px]">MST: {selectedQuoteForView.customerTaxCode}</div>
                  )}
                </div>
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Đơn Vị Báo Giá:</span>
                  <div className="font-bold text-blue-900">CỬA HÀNG ĐIỆN NƯỚC CƯỜNG NGUYỆT</div>
                  <div className="text-slate-600 text-[11px] mt-0.5">NVKD: {selectedQuoteForView.salesRep}</div>
                  <div className="text-slate-600 text-[11px]">Hotline: 0988.123.456 • 0912.789.012</div>
                  <div className="text-slate-600 text-[11px]">Trạng thái: {selectedQuoteForView.status === 'converted' ? 'Đã duyệt chuyển đơn hàng' : 'Đang hiệu lực'}</div>
                </div>
              </div>

              {/* Bảng chi tiết mặt hàng: Mã Hàng, Đơn Giá */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-2">Bảng Chi Tiết Sản Phẩm & Đơn Giá</h4>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[10px]">
                      <tr>
                        <th className="p-2.5 text-center w-10">STT</th>
                        <th className="p-2.5">Mã Hàng (SKU)</th>
                        <th className="p-2.5">Tên Mặt Hàng</th>
                        <th className="p-2.5 text-center">ĐVT</th>
                        <th className="p-2.5 text-center">Số Lượng</th>
                        <th className="p-2.5 text-right">Đơn Giá (VNĐ)</th>
                        <th className="p-2.5 text-center">CK (%)</th>
                        <th className="p-2.5 text-center">VAT</th>
                        <th className="p-2.5 text-right">Thành Tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {selectedQuoteForView.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-mono font-bold text-blue-700">{it.sku}</td>
                          <td className="p-2.5 font-semibold text-slate-900">{it.itemName}</td>
                          <td className="p-2.5 text-center text-slate-600">{it.unit}</td>
                          <td className="p-2.5 text-center font-bold text-slate-900">{it.quantity}</td>
                          <td className="p-2.5 text-right font-medium text-slate-900">{formatVND(it.unitPrice)}</td>
                          <td className="p-2.5 text-center text-slate-600">{it.discountPercent}%</td>
                          <td className="p-2.5 text-center text-slate-600">{it.vatPercent}%</td>
                          <td className="p-2.5 text-right font-bold text-slate-900">{formatVND(it.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tổng cộng & ghi chú */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 block mb-1">Điều Khoản Thương Mại:</span>
                  <p className="text-slate-600 italic">
                    {selectedQuoteForView.notes || 'Hàng chính hãng 100%, bảo hành theo tiêu chuẩn nhà sản xuất.'}
                  </p>
                </div>

                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Tổng tiền hàng:</span>
                    <span className="font-semibold text-slate-900">{formatVND(selectedQuoteForView.subTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Chiết khấu thương mại:</span>
                    <span className="font-semibold text-rose-600">- {formatVND(selectedQuoteForView.discountTotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tiền thuế GTGT (VAT):</span>
                    <span className="font-semibold text-slate-900">+ {formatVND(selectedQuoteForView.vatTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-blue-200">
                    <span>Tổng Thanh Toán:</span>
                    <span className="text-blue-700 font-mono text-base">{formatVND(selectedQuoteForView.grandTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center gap-1.5 font-medium"
                >
                  <Printer className="w-4 h-4" />
                  In Báo Giá
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedQuoteForView(null)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Đóng
                  </button>
                  {selectedQuoteForView.status !== 'converted' && (
                    <button
                      type="button"
                      onClick={() => {
                        onConvertQuoteToOrder(selectedQuoteForView.id);
                        setSelectedQuoteForView(null);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <ArrowRightCircle className="w-4 h-4" />
                      Chuyển Thành Đơn Hàng Bán
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LẬP PHIẾU XUẤT KHO CHO ĐƠN HÀNG */}
      {showDeliveryModal && selectedOrderForDelivery && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Lập Phiếu Xuất Kho Giao Hàng
                </h3>
                <p className="text-xs text-slate-500">
                  Đơn hàng: <strong className="font-mono text-blue-700">{selectedOrderForDelivery.orderCode}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowDeliveryModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDeliverySubmit} className="mt-4 space-y-4 text-xs">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="font-semibold text-blue-900">Khách hàng nhận:</div>
                <div className="text-slate-800">{selectedOrderForDelivery.customerName}</div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-slate-800">Các mặt hàng sẽ xuất kho giao đợt này:</div>
                {selectedOrderForDelivery.items.map((it, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-slate-800">{it.itemName}</span>
                      <span className="text-slate-500 text-[11px] block">
                        Đã giao: {it.deliveredQuantity}/{it.quantity} {it.unit}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-rose-600 font-bold">Xuất nốt: {it.remainingQuantity} {it.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg cursor-pointer shadow-xs"
                >
                  Xác Nhận Xuất Kho & Cập Nhật Đã Giao
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LẬP PHIẾU THU TIỀN KHÁCH HÀNG */}
      {showPaymentModal && selectedCustomerForPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Lập Phiếu Thu Tiền Khách Hàng
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="font-semibold text-slate-800">{selectedCustomerForPayment.name}</div>
                <div className="text-slate-500 mt-1">
                  Công nợ hiện tại: <strong className="text-amber-700">{formatVND(selectedCustomerForPayment.currentDebt)}</strong>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Số Tiền Thu (VNĐ)</label>
                <input
                  type="number"
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nội Dung Thu Tiền</label>
                <input
                  type="text"
                  value={paymentNoteInput}
                  onChange={(e) => setPaymentNoteInput(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRecordCustomerPayment(selectedCustomerForPayment.id, paymentAmountInput, paymentNoteInput);
                    setShowPaymentModal(false);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg cursor-pointer shadow-xs"
                >
                  Lưu & Hạch Toán Nợ 112 / Có 131
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
