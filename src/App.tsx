import React, { useState, useEffect, useMemo } from 'react';
import {
  ModuleType,
  Customer,
  Supplier,
  Quote,
  Quotation,
  SalesOrder,
  DeliveryNote,
  InventoryItem,
  PurchaseOrder,
  Warehouse,
  JournalEntry,
  FixedAsset,
  EInvoiceTT78,
  BOM,
  ProductionOrder,
  GoogleSyncConfig,
} from './types';
import { initialERPData } from './data/initialData';
import { loadFromStorage, saveToStorage, exportAllDataJSON } from './services/storage';
import { generateId, formatVND, numberToWordsVN } from './utils/formatters';

import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { SalesModule } from './components/sales/SalesModule';
import { InventoryModule } from './components/inventory/InventoryModule';
import { AccountingModule } from './components/accounting/AccountingModule';
import { ProductionModule } from './components/production/ProductionModule';
import { GoogleSyncModule } from './components/google/GoogleSyncModule';
import { CheckCircle2, AlertTriangle, Sparkles, X } from 'lucide-react';

export default function App() {
  // Master State with LocalStorage Caching
  const [activeModule, setActiveModule] = useState<ModuleType>('sales');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');

  const [customers, setCustomers] = useState<Customer[]>(() =>
    loadFromStorage('customers', initialERPData.customers)
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>(() =>
    loadFromStorage('suppliers', initialERPData.suppliers)
  );
  const [quotes, setQuotes] = useState<Quote[]>(() =>
    loadFromStorage('quotes', initialERPData.quotes)
  );
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(() =>
    loadFromStorage('salesOrders', initialERPData.salesOrders)
  );
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>(() =>
    loadFromStorage('deliveryNotes', initialERPData.deliveryNotes)
  );
  const [inventory, setInventory] = useState<InventoryItem[]>(() =>
    loadFromStorage('inventory', initialERPData.inventory)
  );
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() =>
    loadFromStorage('purchaseOrders', initialERPData.purchaseOrders)
  );
  const [warehouses, setWarehouses] = useState<Warehouse[]>(() =>
    loadFromStorage('warehouses', initialERPData.warehouses)
  );
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() =>
    loadFromStorage('journalEntries', initialERPData.journalEntries)
  );
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>(() =>
    loadFromStorage('fixedAssets', initialERPData.fixedAssets)
  );
  const [invoices, setInvoices] = useState<EInvoiceTT78[]>(() =>
    loadFromStorage('invoices', initialERPData.invoices)
  );
  const [boms, setBoms] = useState<BOM[]>(() =>
    loadFromStorage('boms', initialERPData.boms)
  );
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>(() =>
    loadFromStorage('productionOrders', initialERPData.productionOrders)
  );
  const [googleSyncConfig, setGoogleSyncConfig] = useState<GoogleSyncConfig>(() =>
    loadFromStorage('googleSyncConfig', initialERPData.googleSyncConfig)
  );

  // Toast Notification State
  const [notification, setNotification] = useState<{
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning';
  } | null>(null);

  const showToast = (title: string, message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setNotification({ title, message, type });
    setTimeout(() => {
      setNotification((prev) => (prev?.title === title ? null : prev));
    }, 4500);
  };

  // Sync to localStorage
  useEffect(() => {
    saveToStorage('customers', customers);
    saveToStorage('suppliers', suppliers);
    saveToStorage('quotes', quotes);
    saveToStorage('salesOrders', salesOrders);
    saveToStorage('deliveryNotes', deliveryNotes);
    saveToStorage('inventory', inventory);
    saveToStorage('purchaseOrders', purchaseOrders);
    saveToStorage('warehouses', warehouses);
    saveToStorage('journalEntries', journalEntries);
    saveToStorage('fixedAssets', fixedAssets);
    saveToStorage('invoices', invoices);
    saveToStorage('boms', boms);
    saveToStorage('productionOrders', productionOrders);
    saveToStorage('googleSyncConfig', googleSyncConfig);
  }, [
    customers,
    suppliers,
    quotes,
    salesOrders,
    deliveryNotes,
    inventory,
    purchaseOrders,
    warehouses,
    journalEntries,
    fixedAssets,
    invoices,
    boms,
    productionOrders,
    googleSyncConfig,
  ]);

  // Combined data bundle for Google Sites/Sheets export
  const allDataBundle = useMemo(() => ({
    customers,
    suppliers,
    quotes,
    salesOrders,
    deliveryNotes,
    inventory,
    purchaseOrders,
    warehouses,
    journalEntries,
    fixedAssets,
    invoices,
    boms,
    productionOrders,
    googleSyncConfig,
  }), [
    customers,
    suppliers,
    quotes,
    salesOrders,
    deliveryNotes,
    inventory,
    purchaseOrders,
    warehouses,
    journalEntries,
    fixedAssets,
    invoices,
    boms,
    productionOrders,
    googleSyncConfig,
  ]);

  // KPI Alerts for Sidebar Badges
  const inventoryAlertCount = useMemo(() => {
    return inventory.filter(
      (item) => item.totalQuantity <= item.minStockLevel
    ).length;
  }, [inventory]);

  const creditAlertCount = useMemo(() => {
    return customers.filter((c) => c.currentDebt > c.creditLimit * 0.8).length;
  }, [customers]);

  const pendingDeliveriesCount = useMemo(() => {
    return salesOrders.filter((o) => o.deliveryStatus !== 'da_giao').length;
  }, [salesOrders]);

  // ==========================================
  // 1. SALES MODULE WORKFLOWS
  // ==========================================

  // Add quotation
  const handleAddQuote = (quote: Quote) => {
    setQuotes((prev) => [quote, ...prev]);
    showToast('Tạo Báo Giá Thành Công', `Mã báo giá ${quote.quoteCode} đã được lưu.`);
  };

  // Convert Quotation -> Sales Order (Tự động chuyển đổi)
  const handleConvertQuoteToOrder = (quoteId: string) => {
    const quote = quotes.find((q) => q.id === quoteId);
    if (!quote) return;

    // 1. Update Quote status
    setQuotes((prev) =>
      prev.map((q) => (q.id === quoteId ? { ...q, status: 'converted' as const, convertedOrderId: `DH-2024-${String(salesOrders.length + 1).padStart(3, '0')}` } : q))
    );

    // 2. Create Sales Order
    const newOrderCode = `DH-2024-${String(salesOrders.length + 1).padStart(3, '0')}`;
    const newSalesOrder: SalesOrder = {
      id: generateId('so'),
      orderCode: newOrderCode,
      quoteId: quote.id,
      customerId: quote.customerId,
      customerName: quote.customerName,
      salesRep: quote.salesRep,
      orderDate: new Date().toISOString().slice(0, 10),
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: 'pending',
      deliveryStatus: 'chua_giao',
      paymentStatus: 'unpaid',
      paidAmount: 0,
      subTotal: quote.subTotal,
      vatTotal: quote.vatTotal,
      grandTotal: quote.grandTotal,
      warehouseId: warehouses[0]?.id || 'wh-1',
      items: quote.items.map((it) => ({
        ...it,
        deliveredQuantity: 0,
        remainingQuantity: it.quantity,
      })),
      notes: `Chuyển đổi tự động từ báo giá ${quote.quoteCode}`,
    };

    setSalesOrders((prev) => [newSalesOrder, ...prev]);

    // 3. Update Customer debt
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === quote.customerId) {
          return {
            ...c,
            currentDebt: c.currentDebt + quote.grandTotal,
          };
        }
        return c;
      })
    );

    // 4. Auto-Post Journal Entry (Doanh thu & Phải thu khách hàng)
    const newEntry: JournalEntry = {
      id: generateId('pkt'),
      entryCode: `PKT-2024-${String(journalEntries.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      documentRef: newOrderCode,
      transactionType: 'ban_hang',
      description: `Ghi nhận doanh thu bán hàng & thuế GTGT đơn hàng ${newOrderCode}`,
      totalAmount: quote.grandTotal,
      creator: 'Hệ thống ERP tự động',
      lines: [
        {
          accountId: '131',
          accountName: 'Phải thu của khách hàng',
          debit: quote.grandTotal,
          credit: 0,
          description: `Phải thu ${quote.customerName}`,
        },
        {
          accountId: '511',
          accountName: 'Doanh thu bán hàng và CCDV',
          debit: 0,
          credit: quote.subTotal - quote.discountTotal,
          description: `Doanh thu thuần ${newOrderCode}`,
        },
        {
          accountId: '3331',
          accountName: 'Thuế GTGT phải nộp',
          debit: 0,
          credit: quote.vatTotal,
          description: `Thuế GTGT đầu ra 8%`,
        },
      ],
    };

    setJournalEntries((prev) => [newEntry, ...prev]);

    showToast(
      'Chuyển Đổi Thành Công Đơn Hàng!',
      `Đơn hàng ${newOrderCode} đã tạo. Tự động ghi nợ TK 131 và ghi có TK 511, TK 3331 vào Sổ nhật ký chung.`
    );
  };

  // Create Delivery Note (Xuất kho, trừ kho & hạch toán giá vốn 632)
  const handleCreateDeliveryNote = (deliveryNote: DeliveryNote) => {
    // 1. Update sales order item delivery status
    const order = salesOrders.find((o) => o.id === deliveryNote.salesOrderId);
    if (!order) return;

    let allDelivered = true;
    const updatedOrderItems = order.items.map((it) => {
      const deliveredLine = deliveryNote.items.find((d) => d.itemId === it.itemId || d.sku === it.sku);
      if (deliveredLine) {
        const newDelivered = it.deliveredQuantity + deliveredLine.deliverQty;
        const newRemaining = Math.max(0, it.quantity - newDelivered);
        if (newRemaining > 0) allDelivered = false;
        return {
          ...it,
          deliveredQuantity: newDelivered,
          remainingQuantity: newRemaining,
        };
      } else {
        if (it.remainingQuantity > 0) allDelivered = false;
        return it;
      }
    });

    const newDeliveryStatus = allDelivered ? ('da_giao' as const) : ('giao_mot_phan' as const);

    setSalesOrders((prev) =>
      prev.map((o) =>
        o.id === deliveryNote.salesOrderId
          ? {
              ...o,
              deliveryStatus: newDeliveryStatus,
              items: updatedOrderItems,
            }
          : o
      )
    );

    // 2. Deduct physical inventory
    let totalCogs = 0;
    setInventory((prev) =>
      prev.map((invItem) => {
        const deliveredLine = deliveryNote.items.find((d) => d.itemId === invItem.id || d.sku === invItem.sku);
        if (deliveredLine && deliveredLine.deliverQty > 0) {
          const qty = deliveredLine.deliverQty;
          totalCogs += qty * invItem.standardCost;
          const newTotal = Math.max(0, invItem.totalQuantity - qty);

          // Update warehouse specific stock
          const updatedWarehouses = invItem.warehouses.map((w) =>
            w.warehouseId === deliveryNote.warehouseId
              ? { ...w, quantity: Math.max(0, w.quantity - qty) }
              : w
          );

          return {
            ...invItem,
            totalQuantity: newTotal,
            warehouses: updatedWarehouses,
          };
        }
        return invItem;
      })
    );

    // 3. Save Delivery Note
    setDeliveryNotes((prev) => [deliveryNote, ...prev]);

    // 4. Auto-post Journal Entry (Giá vốn Nợ 632 / Có 155, 156)
    const costEntry: JournalEntry = {
      id: generateId('pkt'),
      entryCode: `PKT-2024-${String(journalEntries.length + 2).padStart(3, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      documentRef: deliveryNote.deliveryCode,
      transactionType: 'xuat_kho',
      description: `Xuất kho ghi nhận giá vốn hàng bán cho phiếu ${deliveryNote.deliveryCode} (${order.orderCode})`,
      totalAmount: totalCogs,
      creator: 'Hệ thống ERP tự động',
      lines: [
        {
          accountId: '632',
          accountName: 'Giá vốn hàng bán',
          debit: totalCogs,
          credit: 0,
          description: `Giá vốn xuất kho ${deliveryNote.deliveryCode}`,
        },
        {
          accountId: '155',
          accountName: 'Thành phẩm',
          debit: 0,
          credit: totalCogs,
          description: `Xuất kho thành phẩm ${deliveryNote.warehouseName}`,
        },
      ],
    };

    setJournalEntries((prev) => [costEntry, ...prev]);

    showToast(
      'Xuất Kho & Hạch Toán Giá Vốn Thành Công',
      `Đã lập phiếu ${deliveryNote.deliveryCode}, tự động trừ tồn kho và hạch toán Nợ TK 632 / Có TK 155 (${formatVND(
        totalCogs
      )}).`
    );
  };

  // Record Customer Payment (Thu tiền KH -> Trừ nợ 131, Nợ 112)
  const handleRecordCustomerPayment = (customerId: string, amount: number, note: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId ? { ...c, currentDebt: Math.max(0, c.currentDebt - amount) } : c
      )
    );

    const ref = `PT-2024-${Date.now().toString().slice(-4)}`;
    const payEntry: JournalEntry = {
      id: generateId('pkt'),
      entryCode: `PKT-2024-${String(journalEntries.length + 3).padStart(3, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      documentRef: ref,
      transactionType: 'thu_tien',
      description: `Thu tiền bán hàng từ khách hàng ${customer.name}: ${note}`,
      totalAmount: amount,
      creator: 'Kế toán thanh toán',
      lines: [
        {
          accountId: '112',
          accountName: 'Tiền gửi ngân hàng (VCB)',
          debit: amount,
          credit: 0,
          description: `Báo có VCB từ ${customer.name}`,
        },
        {
          accountId: '131',
          accountName: 'Phải thu của khách hàng',
          debit: 0,
          credit: amount,
          description: `Giảm công nợ ${customer.name}`,
        },
      ],
    };

    setJournalEntries((prev) => [payEntry, ...prev]);

    showToast(
      'Thu Tiền Khách Hàng Thành Công',
      `Đã thu ${formatVND(amount)}, giảm công nợ khách hàng ${customer.name} và ghi Nợ 112 / Có 131.`
    );
  };

  // Generate E-Invoice TT78 from Sales Order
  const handleGenerateInvoiceFromOrder = (order: SalesOrder) => {
    const invNumber = String(invoices.length + 102).padStart(7, '0');
    const newInvoice: EInvoiceTT78 = {
      id: generateId('inv'),
      invoiceNumber: invNumber,
      invoiceSeries: '1C24TBB',
      templateCode: '1/001',
      issueDate: new Date().toISOString().slice(0, 10),
      customerId: order.customerId,
      buyerName: order.customerName,
      buyerTaxCode: '0102345678',
      buyerAddress: 'Số 45 Trần Duy Hưng, Cầu Giấy, Hà Nội',
      paymentMethod: 'TM/CK',
      salesOrderId: order.id,
      status: 'cqt_approved',
      cqtCode: `00${Date.now().toString().slice(-8)}CQT78`,
      digitalSignature: 'Chữ ký số Viettel-CA: CỬA HÀNG ĐIỆN NƯỚC CƯỜNG NGUYỆT',
      items: order.items.map((it) => {
        const lineVat = (it.unitPrice * it.quantity * it.vatPercent) / 100;
        return {
          name: it.itemName,
          unit: it.unit,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          vatPercent: it.vatPercent,
          vatAmount: lineVat,
          totalAmount: it.amount,
        };
      }),
      totalBeforeVat: order.subTotal,
      totalVat: order.vatTotal,
      totalAmount: order.grandTotal,
      amountInWords: numberToWordsVN(order.grandTotal),
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    showToast(
      'Xuất Hóa Đơn Điện Tử TT78 Thành Công',
      `Hóa đơn số ${invNumber} ký hiệu 1C24TBB đã được cấp mã CQT thành công.`
    );
  };

  // ==========================================
  // 2. INVENTORY & PURCHASE WORKFLOWS
  // ==========================================

  // Add Purchase Order
  const handleAddPurchaseOrder = (po: PurchaseOrder) => {
    setPurchaseOrders((prev) => [po, ...prev]);
    showToast('Tạo Đơn Mua Hàng Thành Công', `Đơn mua hàng PO ${po.poCode} đã được lập.`);
  };

  // Receive Purchase Order (Nhập kho hàng đang về)
  const handleReceivePurchaseOrder = (poId: string) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po) return;

    // 1. Mark PO as received
    setPurchaseOrders((prev) =>
      prev.map((p) => (p.id === poId ? { ...p, status: 'received' as const } : p))
    );

    // 2. Update stock & add lot
    setInventory((prev) => {
      return prev.map((item) => {
        const poItem = po.items.find((i) => i.sku === item.sku || i.itemId === item.id);
        if (poItem) {
          const addQty = poItem.quantity;
          const newQty = item.totalQuantity + addQty;

          // Update warehouse
          const updatedWarehouses = item.warehouses.map((w) =>
            w.warehouseId === po.warehouseId ? { ...w, quantity: w.quantity + addQty } : w
          );

          // Add lot
          const newLot = {
            id: generateId('lot'),
            lotNumber: `LOT-PO-${po.poCode.slice(-4)}`,
            manufactureDate: new Date().toISOString().slice(0, 10),
            warehouseId: po.warehouseId,
            quantity: addQty,
            costPrice: poItem.unitPrice,
          };

          return {
            ...item,
            totalQuantity: newQty,
            warehouses: updatedWarehouses,
            lots: [newLot, ...item.lots],
          };
        }
        return item;
      });
    });

    // 3. Update Supplier Payable
    setSuppliers((prev) =>
      prev.map((s) =>
        s.id === po.supplierId ? { ...s, currentPayable: s.currentPayable + po.totalAmount } : s
      )
    );

    // 4. Auto-post Journal Entry (Nợ 152/156, Nợ 133, Có 331)
    const vatVal = Math.round(po.totalAmount * 0.08 / 1.08);
    const beforeVat = po.totalAmount - vatVal;

    const entry: JournalEntry = {
      id: generateId('pkt'),
      entryCode: `PKT-2024-${String(journalEntries.length + 4).padStart(3, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      documentRef: `NK-${po.poCode}`,
      transactionType: 'mua_hang',
      description: `Nhập kho theo đơn mua hàng ${po.poCode} từ ${po.supplierName}`,
      totalAmount: po.totalAmount,
      creator: 'Hệ thống ERP tự động',
      lines: [
        {
          accountId: '152',
          accountName: 'Nguyên liệu, vật liệu',
          debit: beforeVat,
          credit: 0,
          description: `Nhập kho theo ${po.poCode}`,
        },
        {
          accountId: '1331',
          accountName: 'Thuế GTGT được khấu trừ',
          debit: vatVal,
          credit: 0,
          description: `Thuế GTGT đầu vào được khấu trừ`,
        },
        {
          accountId: '331',
          accountName: 'Phải trả cho người bán',
          debit: 0,
          credit: po.totalAmount,
          description: `Công nợ NCC ${po.supplierName}`,
        },
      ],
    };

    setJournalEntries((prev) => [entry, ...prev]);

    showToast(
      'Nhập Kho Đơn Mua Hàng Thành Công',
      `Đã tăng tồn kho thực tế, tăng công nợ NCC và ghi Nợ 152, 1331 / Có 331 (${formatVND(
        po.totalAmount
      )}).`
    );
  };

  // Update Inventory Costing Method (FIFO, Bình quân gia quyền, Đích danh)
  const handleUpdateCostMethod = (
    itemId: string,
    method: 'fifo' | 'weighted_average' | 'specific_id'
  ) => {
    setInventory((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, costMethod: method } : i))
    );
    showToast(
      'Cập Nhật Phương Pháp Tính Giá',
      `Đã chuyển phương pháp tính giá thành công (${method.toUpperCase()}).`
    );
  };

  // Adjust Stock (Kiểm kê điều chỉnh kho)
  const handleAdjustStock = (
    itemId: string,
    warehouseId: string,
    delta: number,
    reason: string
  ) => {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;

    const diffValue = Math.abs(delta) * item.standardCost;

    setInventory((prev) =>
      prev.map((i) => {
        if (i.id === itemId) {
          const newTotal = Math.max(0, i.totalQuantity + delta);
          const updatedWhs = i.warehouses.map((w) =>
            w.warehouseId === warehouseId ? { ...w, quantity: Math.max(0, w.quantity + delta) } : w
          );
          return {
            ...i,
            totalQuantity: newTotal,
            warehouses: updatedWhs,
          };
        }
        return i;
      })
    );

    // Auto-post adjustment
    const adjEntry: JournalEntry = {
      id: generateId('pkt'),
      entryCode: `PKT-2024-${String(journalEntries.length + 5).padStart(3, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      documentRef: `KK-${item.sku}`,
      transactionType: 'khac',
      description: `Điều chỉnh kiểm kê tồn kho ${item.name} (${delta > 0 ? '+' : ''}${delta} ${
        item.unit
      }): ${reason}`,
      totalAmount: diffValue,
      creator: 'Thủ kho trưởng',
      lines:
        delta < 0
          ? [
              {
                accountId: '632',
                accountName: 'Giá vốn hàng bán (Hao hụt kiểm kê)',
                debit: diffValue,
                credit: 0,
                description: `Hao hụt kiểm kê ${item.name}`,
              },
              {
                accountId: '156',
                accountName: 'Hàng hóa / Thành phẩm',
                debit: 0,
                credit: diffValue,
                description: `Giảm kho kiểm kê`,
              },
            ]
          : [
              {
                accountId: '156',
                accountName: 'Hàng hóa / Thành phẩm',
                debit: diffValue,
                credit: 0,
                description: `Tăng kho kiểm kê thừa`,
              },
              {
                accountId: '711',
                accountName: 'Thu nhập khác',
                debit: 0,
                credit: diffValue,
                description: `Tồn kho thừa phát hiện sau kiểm kê`,
              },
            ],
    };

    setJournalEntries((prev) => [adjEntry, ...prev]);

    showToast(
      'Điều Chỉnh Tồn Kho Thành Công',
      `Đã cập nhật số lượng tồn kho và hạch toán chênh lệch kiểm kê vào Sổ cái.`
    );
  };

  // Add new inventory item (Thêm mới mặt hàng & đơn giá)
  const handleAddInventoryItem = (newItem: InventoryItem) => {
    setInventory((prev) => [newItem, ...prev]);
    showToast(
      'Thêm Mặt Hàng Mới Thành Công',
      `Mặt hàng "${newItem.name}" (Mã: ${newItem.sku}) - Đơn giá bán: ${formatVND(newItem.sellingPrice)} đã được thêm vào kho.`
    );
  };

  // Update existing inventory item (Sửa mã hàng & đơn giá)
  const handleUpdateInventoryItem = (updated: InventoryItem) => {
    setInventory((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    showToast(
      'Cập Nhật Mặt Hàng Thành Công',
      `Đã cập nhật thông tin mã hàng ${updated.sku} và đơn giá.`
    );
  };

  // ==========================================
  // 3. ACCOUNTING MODULE WORKFLOWS
  // ==========================================

  // Add manual Journal Entry
  const handleAddJournalEntry = (entry: JournalEntry) => {
    setJournalEntries((prev) => [entry, ...prev]);
    showToast('Đã Ghi Sổ Nhật Ký Chung', `Bút toán ${entry.entryCode} đã được lưu.`);
  };

  // Run Monthly Depreciation for Fixed Assets (Khấu hao TSCĐ Nợ 642, Có 214)
  const handleRunDepreciation = () => {
    let totalDepreciationThisMonth = 0;

    setFixedAssets((prev) =>
      prev.map((fa) => {
        const newAccum = Math.min(fa.originalCost, fa.accumulatedDepreciation + fa.monthlyDepreciation);
        const newRem = fa.originalCost - newAccum;
        totalDepreciationThisMonth += fa.monthlyDepreciation;
        return {
          ...fa,
          accumulatedDepreciation: newAccum,
          remainingValue: newRem,
        };
      })
    );

    // Auto-post depreciation entry
    const depEntry: JournalEntry = {
      id: generateId('pkt'),
      entryCode: `PKT-2024-${String(journalEntries.length + 6).padStart(3, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      documentRef: `KH-THANG-${new Date().getMonth() + 1}`,
      transactionType: 'khau_hao',
      description: `Trích khấu hao TSCĐ định kỳ tháng (Phương pháp đường thẳng)`,
      totalAmount: totalDepreciationThisMonth,
      creator: 'Kế toán tài sản',
      lines: [
        {
          accountId: '642',
          accountName: 'Chi phí quản lý doanh nghiệp (Khấu hao)',
          debit: totalDepreciationThisMonth,
          credit: 0,
          description: `Khấu hao máy móc & TSCĐ văn phòng`,
        },
        {
          accountId: '214',
          accountName: 'Hao mòn tài sản cố định',
          debit: 0,
          credit: totalDepreciationThisMonth,
          description: `Ghi tăng hao mòn lũy kế TK 214`,
        },
      ],
    };

    setJournalEntries((prev) => [depEntry, ...prev]);

    showToast(
      'Chạy Khấu Hao TSCĐ Thành Công',
      `Đã tính khấu hao ${formatVND(
        totalDepreciationThisMonth
      )} cho toàn bộ tài sản và hạch toán Nợ 642 / Có 214.`
    );
  };

  // Pay Supplier Debt (Chi tiền trả nợ NCC -> Nợ 331, Có 112)
  const handlePaySupplierDebt = (supplierId: string, amount: number, note: string) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) return;

    setSuppliers((prev) =>
      prev.map((s) =>
        s.id === supplierId ? { ...s, currentPayable: Math.max(0, s.currentPayable - amount) } : s
      )
    );

    const ref = `PC-2024-${Date.now().toString().slice(-4)}`;
    const payEntry: JournalEntry = {
      id: generateId('pkt'),
      entryCode: `PKT-2024-${String(journalEntries.length + 7).padStart(3, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      documentRef: ref,
      transactionType: 'chi_tien',
      description: `Chi tiền thanh toán nợ cho nhà cung cấp ${supplier.name}: ${note}`,
      totalAmount: amount,
      creator: 'Kế toán thanh toán',
      lines: [
        {
          accountId: '331',
          accountName: 'Phải trả cho người bán',
          debit: amount,
          credit: 0,
          description: `Thanh toán công nợ ${supplier.name}`,
        },
        {
          accountId: '112',
          accountName: 'Tiền gửi ngân hàng (VCB)',
          debit: 0,
          credit: amount,
          description: `Chuyển khoản thanh toán tiền hàng`,
        },
      ],
    };

    setJournalEntries((prev) => [payEntry, ...prev]);

    showToast(
      'Lập Phiếu Chi Thanh Toán NCC Thành Công',
      `Đã thanh toán ${formatVND(amount)} cho ${supplier.name} và ghi Nợ 331 / Có 112.`
    );
  };

  // ==========================================
  // 4. PRODUCTION MODULE WORKFLOWS
  // ==========================================

  // Add Production Order
  const handleAddProductionOrder = (order: ProductionOrder) => {
    setProductionOrders((prev) => [order, ...prev]);
    showToast('Tạo Lệnh Sản Xuất Thành Công', `Lệnh sản xuất ${order.productionCode} đã khởi tạo.`);
  };

  // Complete Production Order: Trừ kho NVL theo BOM & Nhập kho Thành phẩm (Nợ 155 / Có 154)
  const handleCompleteProductionOrder = (orderId: string) => {
    const po = productionOrders.find((p) => p.id === orderId);
    if (!po) return;

    const bom = boms.find((b) => b.id === po.bomId);
    if (!bom) {
      alert('Không tìm thấy định mức BOM của sản phẩm này!');
      return;
    }

    const qty = po.targetQuantity;

    // 1. Trừ kho nguyên liệu theo BOM & Nhập kho thành phẩm
    setInventory((prev) => {
      return prev.map((item) => {
        const bomMaterial = bom.materials.find((m) => m.sku === item.sku || m.materialId === item.id);
        if (bomMaterial) {
          const totalDeduct = bomMaterial.standardQuantity * qty;
          return {
            ...item,
            totalQuantity: Math.max(0, item.totalQuantity - totalDeduct),
          };
        }
        // Tăng thành phẩm hoàn thành
        if (item.id === po.productId || item.sku === bom.productSku) {
          return {
            ...item,
            totalQuantity: item.totalQuantity + qty,
          };
        }
        return item;
      });
    });

    // 2. Mark Production Order complete
    setProductionOrders((prev) =>
      prev.map((p) =>
        p.id === orderId
          ? {
              ...p,
              status: 'completed' as const,
              completedQuantity: qty,
            }
          : p
      )
    );

    // 3. Auto-post Production Costing (Nợ 155 / Có 154)
    const costEntry: JournalEntry = {
      id: generateId('pkt'),
      entryCode: `PKT-2024-${String(journalEntries.length + 8).padStart(3, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      documentRef: po.productionCode,
      transactionType: 'khac',
      description: `Nghiệm thu hoàn thành sản xuất & nhập kho thành phẩm theo ${po.productionCode}`,
      totalAmount: po.totalProductionCost,
      creator: 'Kế toán giá thành xưởng',
      lines: [
        {
          accountId: '155',
          accountName: 'Thành phẩm',
          debit: po.totalProductionCost,
          credit: 0,
          description: `Nhập kho ${qty} bộ ${po.productName}`,
        },
        {
          accountId: '154',
          accountName: 'Chi phí sản xuất, kinh doanh dở dang',
          debit: 0,
          credit: po.totalProductionCost,
          description: `Kết chuyển chi phí hoàn thành (621 + 622 + 627)`,
        },
      ],
    };

    setJournalEntries((prev) => [costEntry, ...prev]);

    showToast(
      'Hoàn Thành Lệnh Sản Xuất & Nhập Kho',
      `Tự động trừ kho vật tư theo BOM, nhập kho ${qty} bộ thành phẩm và hạch toán Nợ 155 / Có 154 (${formatVND(
        po.totalProductionCost
      )}).`
    );
  };

  const handleAddBOM = (newBom: BOM) => {
    setBoms((prev) => [newBom, ...prev]);
    showToast('Tạo Định Mức BOM Mới Thành Công', `Định mức ${newBom.bomCode} đã được lưu.`);
  };

  // Restore State from JSON
  const handleRestoreData = (restored: any) => {
    if (!restored) return;
    if (restored.customers) setCustomers(restored.customers);
    if (restored.suppliers) setSuppliers(restored.suppliers);
    if (restored.quotes) setQuotes(restored.quotes);
    if (restored.salesOrders) setSalesOrders(restored.salesOrders);
    if (restored.deliveryNotes) setDeliveryNotes(restored.deliveryNotes);
    if (restored.inventory) setInventory(restored.inventory);
    if (restored.purchaseOrders) setPurchaseOrders(restored.purchaseOrders);
    if (restored.warehouses) setWarehouses(restored.warehouses);
    if (restored.journalEntries) setJournalEntries(restored.journalEntries);
    if (restored.fixedAssets) setFixedAssets(restored.fixedAssets);
    if (restored.invoices) setInvoices(restored.invoices);
    if (restored.boms) setBoms(restored.boms);
    if (restored.productionOrders) setProductionOrders(restored.productionOrders);
    showToast('Khôi Phục Dữ Liệu Thành Công', 'Toàn bộ dữ liệu ERP đã được phục hồi từ tệp.');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      {/* Top Application Header */}
      <Header
        warehouses={warehouses}
        selectedWarehouseId={selectedWarehouseId}
        onSelectWarehouse={setSelectedWarehouseId}
        googleSyncConfig={googleSyncConfig}
        onOpenGoogleSync={() => setActiveModule('google_sync')}
        unreadCount={inventoryAlertCount + creditAlertCount}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeModule={activeModule}
          onSelectModule={setActiveModule}
          inventoryAlertCount={inventoryAlertCount}
          creditAlertCount={creditAlertCount}
          pendingDeliveriesCount={pendingDeliveriesCount}
        />

        {/* Dynamic Main Workspace Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Module 1: Sales Management */}
            {activeModule === 'sales' && (
              <SalesModule
                quotes={quotes}
                orders={salesOrders}
                deliveryNotes={deliveryNotes}
                customers={customers}
                warehouses={warehouses}
                inventory={inventory}
                onAddQuote={handleAddQuote}
                onConvertQuoteToOrder={handleConvertQuoteToOrder}
                onCreateDeliveryNote={handleCreateDeliveryNote}
                onRecordCustomerPayment={handleRecordCustomerPayment}
                onGenerateInvoiceFromOrder={handleGenerateInvoiceFromOrder}
              />
            )}

            {/* Module 2: Purchase & Inventory */}
            {activeModule === 'inventory' && (
              <InventoryModule
                inventory={inventory}
                warehouses={warehouses}
                suppliers={suppliers}
                purchaseOrders={purchaseOrders}
                onAddPurchaseOrder={handleAddPurchaseOrder}
                onReceivePurchaseOrder={handleReceivePurchaseOrder}
                onUpdateCostMethod={handleUpdateCostMethod}
                onAdjustStock={handleAdjustStock}
                onAddInventoryItem={handleAddInventoryItem}
                onUpdateInventoryItem={handleUpdateInventoryItem}
              />
            )}

            {/* Module 3: Accounting & Finance */}
            {activeModule === 'accounting' && (
              <AccountingModule
                journalEntries={journalEntries}
                fixedAssets={fixedAssets}
                invoices={invoices}
                suppliers={suppliers}
                customers={customers}
                onAddJournalEntry={handleAddJournalEntry}
                onRunDepreciation={handleRunDepreciation}
                onPaySupplierDebt={handlePaySupplierDebt}
              />
            )}

            {/* Module 4: Production Management */}
            {activeModule === 'production' && (
              <ProductionModule
                productionOrders={productionOrders}
                boms={boms}
                salesOrders={salesOrders}
                inventory={inventory}
                warehouses={warehouses}
                onAddProductionOrder={handleAddProductionOrder}
                onCompleteProductionOrder={handleCompleteProductionOrder}
                onAddBOM={handleAddBOM}
              />
            )}

            {/* Module 5: Google Workspace / Google Sites Sync */}
            {activeModule === 'google_sync' && (
              <GoogleSyncModule
                data={allDataBundle}
                onRestoreData={handleRestoreData}
              />
            )}
          </div>
        </main>
      </div>

      {/* Floating System Notification Toast */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md w-full bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700 flex items-start justify-between gap-3 animate-slide-up">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl mt-0.5 ${
                notification.type === 'warning'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {notification.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h4 className="text-xs font-bold text-white tracking-wide uppercase">
                {notification.title}
              </h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {notification.message}
              </p>
            </div>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white text-base cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
