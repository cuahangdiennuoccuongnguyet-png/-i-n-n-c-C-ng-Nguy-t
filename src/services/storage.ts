export const STORAGE_KEYS = {
  CUSTOMERS: 'erp_customers_v1',
  SUPPLIERS: 'erp_suppliers_v1',
  WAREHOUSES: 'erp_warehouses_v1',
  INVENTORY: 'erp_inventory_v1',
  QUOTES: 'erp_quotes_v1',
  ORDERS: 'erp_orders_v1',
  DELIVERY_NOTES: 'erp_delivery_notes_v1',
  POS: 'erp_pos_v1',
  JOURNAL: 'erp_journal_v1',
  ASSETS: 'erp_assets_v1',
  INVOICES: 'erp_invoices_v1',
  BOMS: 'erp_boms_v1',
  PRODUCTION: 'erp_production_v1',
  GOOGLE_SYNC: 'erp_google_sync_v1',
};

export function loadFromLocalStorage<T>(key: string, fallback: T): T {
  try {
    let item = localStorage.getItem(key);
    if (!item) return fallback;
    if (item.includes('ĐẠI PHÁT') || item.includes('Đại Phát') || item.includes('daiphat')) {
      item = item
        .replace(/CÔNG TY TNHH SẢN XUẤT & THƯƠNG MẠI QUỐC TẾ ĐẠI PHÁT/g, 'CỬA HÀNG ĐIỆN NƯỚC CƯỜNG NGUYỆT')
        .replace(/CÔNG TY TNHH SẢN XUẤT & TM QUỐC TẾ ĐẠI PHÁT/g, 'CỬA HÀNG ĐIỆN NƯỚC CƯỜNG NGUYỆT')
        .replace(/CÔNG TY TNHH SX & TM QUỐC TẾ ĐẠI PHÁT/g, 'CỬA HÀNG ĐIỆN NƯỚC CƯỜNG NGUYỆT')
        .replace(/Đại Phát/g, 'Cường Nguyệt')
        .replace(/daiphat-erp-portal/g, 'cuongnguyet-erp-portal')
        .replace(/ketoan@daiphatcorp\.vn/g, 'cuahangdiennuoccuongnguyet@gmail.com');
      localStorage.setItem(key, item);
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`Lỗi đọc LocalStorage [${key}]:`, error);
    return fallback;
  }
}

export function saveToLocalStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Lỗi lưu LocalStorage [${key}]:`, error);
  }
}

// Export CSV for Google Sheets
export function exportToCSV(filename: string, rows: Record<string, any>[]): void {
  if (!rows || !rows.length) return;

  const headers = Object.keys(rows[0]);
  const csvContent = [
    // UTF-8 BOM for Excel and Google Sheets to display Vietnamese properly
    '\uFEFF' + headers.join(','),
    ...rows.map(row =>
      headers
        .map(header => {
          let cell = row[header] ?? '';
          if (typeof cell === 'object') {
            cell = JSON.stringify(cell);
          }
          cell = String(cell).replace(/"/g, '""');
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            cell = `"${cell}"`;
          }
          return cell;
        })
        .join(',')
    ),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export full ERP database as JSON backup
export function exportDatabaseJSON(fullData: Record<string, any>): void {
  const jsonStr = JSON.stringify(fullData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Sao-Luu-ERP-Cuong-Nguyet-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Aliases for storage convenience
export const loadFromStorage = loadFromLocalStorage;
export const saveToStorage = saveToLocalStorage;
export const exportAllDataJSON = exportDatabaseJSON;

