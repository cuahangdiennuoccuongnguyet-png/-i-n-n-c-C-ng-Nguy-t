export type ModuleType = 'sales' | 'inventory' | 'accounting' | 'production' | 'reports' | 'google_sync';

// --- SALES (QUẢN LÝ BÁN HÀNG) ---
export interface QuoteItem {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  vatPercent: number;
  amount: number;
}

export interface Quote {
  id: string;
  quoteCode: string; // BG-2024-xxx
  customerId: string;
  customerName: string;
  customerTaxCode?: string;
  customerPhone: string;
  customerAddress: string;
  salesRep: string;
  createdDate: string;
  validUntil: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
  items: QuoteItem[];
  subTotal: number;
  discountTotal: number;
  vatTotal: number;
  grandTotal: number;
  notes?: string;
  convertedOrderId?: string;
}

export type Quotation = Quote;

export interface SalesOrderItem extends QuoteItem {
  deliveredQuantity: number;
  remainingQuantity: number;
}

export interface SalesOrder {
  id: string;
  orderCode: string; // DH-2024-xxx
  quoteId?: string;
  customerId: string;
  customerName: string;
  salesRep: string;
  orderDate: string;
  expectedDeliveryDate: string;
  status: 'pending' | 'processing' | 'partial_delivered' | 'completed' | 'cancelled';
  deliveryStatus: 'chua_giao' | 'giao_mot_phan' | 'da_giao';
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paidAmount: number;
  items: SalesOrderItem[];
  subTotal: number;
  vatTotal: number;
  grandTotal: number;
  notes?: string;
  warehouseId: string;
}

export interface DeliveryNote {
  id: string;
  deliveryCode: string; // PXK-2024-xxx
  salesOrderId: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  deliveryDate: string;
  warehouseId: string;
  warehouseName: string;
  carrierName: string;
  status: 'draft' | 'shipping' | 'delivered' | 'returned';
  items: {
    itemId: string;
    itemName: string;
    sku: string;
    unit: string;
    orderedQty: number;
    deliverQty: number;
    remainQty: number;
    lotNumber?: string;
  }[];
  notes?: string;
}

export interface Customer {
  id: string;
  code: string; // KH-xxx
  name: string;
  taxCode?: string;
  phone: string;
  email: string;
  address: string;
  contactPerson: string;
  creditLimit: number; // Hạn mức tín dụng
  currentDebt: number; // Công nợ hiện tại
  paymentTermsDays: number; // Thời hạn thanh toán (ngày)
  salesRepAssigned: string;
}

// --- PURCHASE & INVENTORY (MUA HÀNG & TỒN KHO) ---
export interface Supplier {
  id: string;
  code: string; // NCC-xxx
  name: string;
  taxCode: string;
  phone: string;
  email: string;
  address: string;
  contactPerson: string;
  leadTimeDays: number; // Thời gian giao hàng trung bình (ngày)
  currentPayable: number; // Nợ phải trả
  rating: number; // 1-5 sao
  priceHistory: {
    itemId: string;
    itemName: string;
    unitPrice: number;
    updatedDate: string;
  }[];
}

export interface PurchaseOrderItem {
  itemId: string;
  itemName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  receivedQuantity: number;
}

export interface PurchaseOrder {
  id: string;
  poCode: string; // PO-2024-xxx
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDate: string;
  status: 'draft' | 'ordered' | 'in_transit' | 'received' | 'cancelled';
  items: PurchaseOrderItem[];
  totalAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paidAmount: number;
  notes?: string;
  warehouseId: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string;
  manager: string;
}

export interface ItemLot {
  id: string;
  lotNumber: string;
  serialNumber?: string;
  manufactureDate: string;
  expiryDate?: string; // Hạn sử dụng cho thực phẩm/dược phẩm
  warehouseId: string;
  quantity: number;
  costPrice: number; // Giá nhập
}

export interface InventoryItem {
  id: string;
  sku: string;
  barcode: string; // Mã vạch
  name: string;
  category: 'finished_good' | 'raw_material' | 'spare_part';
  unit: string;
  costMethod: 'fifo' | 'weighted_average' | 'specific_id'; // Phương pháp tính giá xuất kho
  standardCost: number; // Giá vốn chuẩn
  sellingPrice: number; // Giá bán
  minStockLevel: number; // Tồn kho tối thiểu (Điểm đặt hàng)
  maxStockLevel: number;
  totalQuantity: number;
  warehouses: {
    warehouseId: string;
    warehouseName: string;
    quantity: number;
  }[];
  lots: ItemLot[];
  hasExpiry: boolean; // Có hạn sử dụng hay không (thực phẩm/dược)
}

// --- ACCOUNTING & FINANCE (KẾ TOÁN & TÀI CHÍNH) ---
export interface JournalEntryLine {
  accountId: string; // Ví dụ: 111, 112, 131, 331, 156, 511, 632, ...
  accountName: string;
  debit: number; // Nợ
  credit: number; // Có
  description: string;
}

export interface JournalEntry {
  id: string;
  entryCode: string; // PKT-2024-xxx
  date: string;
  documentRef: string; // Số hóa đơn / Đơn hàng / Phiếu thu chi
  transactionType: 'ban_hang' | 'mua_hang' | 'thu_tien' | 'chi_tien' | 'khau_hao' | 'xuat_kho' | 'khac';
  description: string;
  lines: JournalEntryLine[];
  totalAmount: number;
  creator: string;
}

export interface FixedAsset {
  id: string;
  assetCode: string; // TSCĐ-xxx
  name: string;
  purchaseDate: string;
  originalCost: number; // Nguyên giá
  usefulLifeMonths: number; // Thời gian khấu hao (tháng)
  depreciationMethod: 'straight_line' | 'production_units'; // Khấu hao đường thẳng / theo sản lượng
  accumulatedDepreciation: number; // Hao mòn lũy kế
  monthlyDepreciation: number; // Khấu hao hàng tháng
  remainingValue: number; // Giá trị còn lại
  department: string;
  status: 'in_use' | 'disposed';
}

export interface EInvoiceTT78 {
  id: string;
  invoiceNumber: string; // Số hóa đơn
  invoiceSeries: string; // Ký hiệu: 1C24TBB, 1K24TMM...
  templateCode: string; // Mẫu số: 1/001
  issueDate: string;
  customerId: string;
  buyerName: string;
  buyerTaxCode: string;
  buyerAddress: string;
  paymentMethod: 'TM/CK' | 'TM' | 'CK';
  salesOrderId?: string;
  status: 'draft' | 'issued' | 'cqt_approved' | 'cancelled';
  cqtCode?: string; // Mã cơ quan thuế cấp
  digitalSignature: string; // Thông tin chữ ký số
  items: {
    name: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    vatPercent: number;
    vatAmount: number;
    totalAmount: number;
  }[];
  totalBeforeVat: number;
  totalVat: number;
  totalAmount: number;
  amountInWords: string; // Số tiền viết bằng chữ
}

// --- PRODUCTION MANAGEMENT (QUẢN LÝ SẢN XUẤT) ---
export interface BOMMaterial {
  materialId: string;
  materialName: string;
  sku: string;
  unit: string;
  standardQuantity: number; // Định mức cho 1 đơn vị thành phẩm
  unitCost: number;
  totalCost: number;
}

export interface BOM {
  id: string;
  bomCode: string; // BOM-xxx
  productId: string;
  productName: string;
  productSku: string;
  unit: string;
  standardBatchSize: number; // Quy mô mẻ chuẩn
  materials: BOMMaterial[];
  directLaborCost: number; // Chi phí nhân công trực tiếp (TK 622)
  overheadCost: number; // Chi phí sản xuất chung (TK 627)
  materialCostPerUnit: number; // Tổng chi phí NVL (TK 621)
  totalCostPerUnit: number; // Tổng giá thành đơn vị thành phẩm (TK 155)
  updatedDate: string;
}

export interface ProductionOrder {
  id: string;
  productionCode: string; // LSX-2024-xxx
  salesOrderId?: string; // Liên kết từ đơn hàng bán
  salesOrderCode?: string;
  productId: string;
  productName: string;
  targetQuantity: number;
  completedQuantity: number;
  startDate: string;
  dueDate: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  bomId: string;
  totalMaterialCost: number;
  totalLaborCost: number;
  totalOverheadCost: number;
  unitProductionCost: number;
  totalProductionCost: number;
  assignedTo: string;
  notes?: string;
}

// --- GOOGLE WORKSPACE & GOOGLE SITES SYNC ---
export interface GoogleSyncConfig {
  sheetWebhookUrl: string;
  googleSiteUrl: string;
  autoSync: boolean;
  lastSyncTime: string | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastError?: string;
}
