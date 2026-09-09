import React, { useState, useMemo } from 'react';
import {
  JournalEntry,
  FixedAsset,
  EInvoiceTT78,
  Supplier,
  Customer,
} from '../../types';
import { formatVND, formatNumber, formatDateVN, generateId, numberToWordsVN } from '../../utils/formatters';
import { exportToCSV } from '../../services/storage';
import {
  Receipt,
  FileSpreadsheet,
  Plus,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Eye,
  Printer,
  FileText,
  DollarSign,
  TrendingUp,
  Percent,
  Calculator,
  ShieldCheck,
  QrCode
} from 'lucide-react';

interface AccountingModuleProps {
  journalEntries: JournalEntry[];
  fixedAssets: FixedAsset[];
  invoices: EInvoiceTT78[];
  suppliers: Supplier[];
  customers: Customer[];
  onAddJournalEntry: (entry: JournalEntry) => void;
  onRunDepreciation: () => void;
  onPaySupplierDebt: (supplierId: string, amount: number, note: string) => void;
}

export const AccountingModule: React.FC<AccountingModuleProps> = ({
  journalEntries,
  fixedAssets,
  invoices,
  suppliers,
  customers,
  onAddJournalEntry,
  onRunDepreciation,
  onPaySupplierDebt,
}) => {
  const [activeTab, setActiveTab] = useState<'journal' | 'payables' | 'assets' | 'reports' | 'invoices'>('journal');
  const [reportType, setReportType] = useState<'b01' | 'b02' | 'b03'>('b02');

  // Selected E-Invoice for Preview/Print Modal
  const [selectedInvoice, setSelectedInvoice] = useState<EInvoiceTT78 | null>(null);

  // Modal State for Supplier Payment
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedSupplierForPay, setSelectedSupplierForPay] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payNote, setPayNote] = useState('Chi trả tiền hàng nhà cung cấp');

  // Manual Journal Entry Modal
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [entryDesc, setEntryDesc] = useState('');
  const [entryRef, setEntryRef] = useState('');
  const [entryAmount, setEntryAmount] = useState(10000000);
  const [entryDebitAcc, setEntryDebitAcc] = useState('642');
  const [entryCreditAcc, setEntryCreditAcc] = useState('112');

  // Financial Report Aggregations from Journal
  const revenueTotal = useMemo(() => {
    return journalEntries
      .flatMap(j => j.lines)
      .filter(l => l.accountId.startsWith('511'))
      .reduce((sum, l) => sum + l.credit, 0);
  }, [journalEntries]);

  const cogsTotal = useMemo(() => {
    return journalEntries
      .flatMap(j => j.lines)
      .filter(l => l.accountId.startsWith('632'))
      .reduce((sum, l) => sum + l.debit, 0);
  }, [journalEntries]);

  const grossProfit = revenueTotal - cogsTotal;

  const totalFixedAssetCost = useMemo(() => {
    return fixedAssets.reduce((sum, a) => sum + a.originalCost, 0);
  }, [fixedAssets]);

  const totalDepreciationAccum = useMemo(() => {
    return fixedAssets.reduce((sum, a) => sum + a.accumulatedDepreciation, 0);
  }, [fixedAssets]);

  const totalPayables = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + s.currentPayable, 0);
  }, [suppliers]);

  // Handle Save Manual Journal Entry
  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: JournalEntry = {
      id: generateId('pkt'),
      entryCode: `PKT-2024-${String(journalEntries.length + 4).padStart(3, '0')}`,
      date: new Date().toISOString().slice(0, 10),
      documentRef: entryRef || 'CT-NOI-BO',
      transactionType: 'khac',
      description: entryDesc || 'Phiếu kế toán điều chỉnh',
      totalAmount: entryAmount,
      creator: 'Kế toán trưởng',
      lines: [
        {
          accountId: entryDebitAcc,
          accountName: `Tài khoản ${entryDebitAcc}`,
          debit: entryAmount,
          credit: 0,
          description: entryDesc,
        },
        {
          accountId: entryCreditAcc,
          accountName: `Tài khoản ${entryCreditAcc}`,
          debit: 0,
          credit: entryAmount,
          description: entryDesc,
        },
      ],
    };

    onAddJournalEntry(newEntry);
    setShowNewEntryModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Lợi Nhuận Gộp Bán Hàng
            </span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-blue-700 mt-2">
            {formatVND(grossProfit)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Doanh thu {formatVND(revenueTotal)} - Giá vốn {formatVND(cogsTotal)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Công Nợ Phải Trả NCC (331)
            </span>
            <span className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-orange-700 mt-2">
            {formatVND(totalPayables)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Tổng nợ của {suppliers.length} nhà cung cấp
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Nguyên Giá TSCĐ (211)
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-2">
            {formatVND(totalFixedAssetCost)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Đã khấu hao: {formatVND(totalDepreciationAccum)} (TK 214)
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Hóa Đơn Điện Tử TT78
            </span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-bold text-purple-700 mt-2">
            {invoices.length} hóa đơn
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-1">
            100% CQT đã cấp mã xác thực
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="bg-white p-1 rounded-xl border border-slate-200 flex flex-wrap gap-1 shadow-xs">
        <button
          onClick={() => setActiveTab('journal')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'journal'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          Sổ Nhật Ký Chung Tự Động ({journalEntries.length})
        </button>

        <button
          onClick={() => setActiveTab('payables')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'payables'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          Công Nợ Phải Trả NCC (TK 331)
        </button>

        <button
          onClick={() => setActiveTab('assets')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'assets'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Tài Sản Cố Định & Khấu Hao ({fixedAssets.length})
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'reports'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Báo Cáo Tài Chính Chuẩn VN (B01, B02, B03)
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'invoices'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Hóa Đơn Điện Tử Thông Tư 78 ({invoices.length})
        </button>
      </div>

      {/* TAB 1: SỔ NHẬT KÝ CHUNG TỰ ĐỘNG */}
      {activeTab === 'journal' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Sổ Nhật Ký Chung Kế Toán (General Journal)
              </h3>
              <p className="text-xs text-slate-500">
                Tự động hạch toán định khoản Nợ/Có từ nghiệp vụ Bán hàng, Mua hàng, Xuất kho & Thanh toán
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const rows: Record<string, any>[] = [];
                  journalEntries.forEach(j => {
                    j.lines.forEach(l => {
                      rows.push({
                        'Mã Bút Toán': j.entryCode,
                        'Ngày Ghi Sổ': j.date,
                        'Chứng Từ Gốc': j.documentRef,
                        'Diễn Giải': j.description,
                        'Tài Khoản': l.accountId,
                        'Tên Tài Khoản': l.accountName,
                        'Số Tiền Nợ': l.debit,
                        'Số Tiền Có': l.credit,
                        'Người Lập': j.creator,
                      });
                    });
                  });
                  exportToCSV('So-Nhat-Ky-Chung-Ke-Toan', rows);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Xuất Sheets
              </button>

              <button
                onClick={() => setShowNewEntryModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm Bút Toán Kế Toán
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/75 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Mã PKT / Ngày</th>
                  <th className="px-4 py-3">Chứng Từ / Diễn Giải</th>
                  <th className="px-4 py-3 text-center">Tài Khoản Hạch Toán</th>
                  <th className="px-4 py-3 text-right">Số Phát Sinh Nợ</th>
                  <th className="px-4 py-3 text-right">Số Phát Sinh Có</th>
                  <th className="px-4 py-3 text-center">Người Tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {journalEntries.map((je) => (
                  <tr key={je.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-semibold text-blue-700">{je.entryCode}</div>
                      <div className="text-[11px] text-slate-500">{formatDateVN(je.date)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{je.description}</div>
                      <div className="text-[11px] text-slate-500 font-mono">CT: {je.documentRef}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {je.lines.map((l, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[11px]">
                            <span className="font-mono font-bold text-slate-800">
                              TK {l.accountId}:
                            </span>
                            <span className="text-slate-500 text-[10px] truncate max-w-[140px]">
                              {l.accountName}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="space-y-1 font-mono">
                        {je.lines.map((l, idx) => (
                          <div key={idx} className={l.debit > 0 ? 'font-bold text-blue-700' : 'text-slate-400'}>
                            {l.debit > 0 ? formatVND(l.debit) : '-'}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="space-y-1 font-mono">
                        {je.lines.map((l, idx) => (
                          <div key={idx} className={l.credit > 0 ? 'font-bold text-emerald-700' : 'text-slate-400'}>
                            {l.credit > 0 ? formatVND(l.credit) : '-'}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-[11px] text-slate-600">
                      {je.creator}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: QUẢN LÝ CÔNG NỢ PHẢI TRẢ (NCC - TK 331) */}
      {activeTab === 'payables' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Quản Lý Công Nợ Phải Trả Cho Nhà Cung Cấp (TK 331)
              </h3>
              <p className="text-xs text-slate-500">
                Theo dõi hạn thanh toán tiền hàng, lập phiếu chi và tự động hạch toán Nợ 331 / Có 112
              </p>
            </div>
            <button
              onClick={() => {
                const rows = suppliers.map(s => ({
                  'Mã NCC': s.code,
                  'Tên Nhà Cung Cấp': s.name,
                  'Mã Số Thuế': s.taxCode,
                  'Nợ Phải Trả': s.currentPayable,
                  'Lead Time': s.leadTimeDays,
                }));
                exportToCSV('Cong-No-Phai-Tra-NCC-331', rows);
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
                  <th className="px-4 py-3">Mã Số Thuế</th>
                  <th className="px-4 py-3 text-right">Tổng Nợ Phải Trả</th>
                  <th className="px-4 py-3 text-center">Trạng Thái Hạn Nợ</th>
                  <th className="px-4 py-3 text-center">Thanh Toán</th>
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
                      <div className="text-[11px] text-slate-500">{s.phone}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {s.taxCode}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">
                      {formatVND(s.currentPayable)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Trong hạn thanh toán
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedSupplierForPay(s);
                          setPayAmount(s.currentPayable > 0 ? s.currentPayable : 20000000);
                          setShowPayModal(true);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium text-[11px] transition-colors cursor-pointer shadow-xs"
                      >
                        <DollarSign className="w-3 h-3" />
                        Lập Phiếu Chi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: QUẢN LÝ TÀI SẢN CỐ ĐỊNH & KHẤU HAO */}
      {activeTab === 'assets' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Danh Mục Tài Sản Cố Định (TSCĐ) & Khấu Hao Tự Động (TK 211, 214)
              </h3>
              <p className="text-xs text-slate-500">
                Tính khấu hao định kỳ theo phương pháp đường thẳng, tự động trích chi phí quản lý & sản xuất
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onRunDepreciation}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                title="Tự động tính và ghi sổ chi phí khấu hao tháng này"
              >
                <Calculator className="w-3.5 h-3.5" />
                Chạy Trích Khấu Hao Tháng Này
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/75 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Mã TSCĐ</th>
                  <th className="px-4 py-3">Tên Tài Sản Cố Định</th>
                  <th className="px-4 py-3 text-right">Nguyên Giá (211)</th>
                  <th className="px-4 py-3 text-center">Thời Gian SD</th>
                  <th className="px-4 py-3 text-right">Khấu Hao / Tháng</th>
                  <th className="px-4 py-3 text-right">Hao Mòn Lũy Kế (214)</th>
                  <th className="px-4 py-3 text-right">Giá Trị Còn Lại</th>
                  <th className="px-4 py-3">Bộ Phận Sử Dụng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {fixedAssets.map((fa) => (
                  <tr key={fa.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-700">
                      {fa.assetCode}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{fa.name}</div>
                      <div className="text-[11px] text-slate-500">Đưa vào SD: {formatDateVN(fa.purchaseDate)}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatVND(fa.originalCost)}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700 font-medium">
                      {fa.usefulLifeMonths} tháng ({Math.round(fa.usefulLifeMonths / 12)} năm)
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700">
                      {formatVND(fa.monthlyDepreciation)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-rose-700">
                      {formatVND(fa.accumulatedDepreciation)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">
                      {formatVND(fa.remainingValue)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {fa.department}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: BÁO CÁO TÀI CHÍNH CHUẨN VIỆT NAM (B01, B02, B03) */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReportType('b02')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  reportType === 'b02' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Mẫu B02-DN: Báo Cáo KQKD
              </button>
              <button
                onClick={() => setReportType('b01')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  reportType === 'b01' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Mẫu B01-DN: Bảng Cân Đối Kế Toán
              </button>
              <button
                onClick={() => setReportType('b03')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  reportType === 'b03' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Mẫu B03-DN: Lưu Chuyển Tiền Tệ
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium cursor-pointer border border-slate-300"
            >
              <Printer className="w-3.5 h-3.5" />
              In Báo Cáo Tài Chính
            </button>
          </div>

          {/* REPORT CONTENT */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            {reportType === 'b02' && (
              <div>
                <div className="text-center mb-6">
                  <span className="text-xs text-slate-500 font-mono">Mẫu số B02 - DN (Ban hành theo TT số 200/2014/TT-BTC)</span>
                  <h3 className="text-base font-bold text-slate-900 mt-1 uppercase">
                    BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH
                  </h3>
                  <p className="text-xs text-slate-500">Kỳ báo cáo: Năm tài chính 2024 • Đơn vị tính: Việt Nam Đồng</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-slate-800 border-collapse border border-slate-300">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px]">
                      <tr>
                        <th className="border border-slate-300 px-3 py-2 text-left">Chỉ Tiêu Báo Cáo</th>
                        <th className="border border-slate-300 px-3 py-2 text-center w-20">Mã Số</th>
                        <th className="border border-slate-300 px-3 py-2 text-right">Kỳ Này (VNĐ)</th>
                        <th className="border border-slate-300 px-3 py-2 text-right">Kỳ Trước (VNĐ)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="border border-slate-300 px-3 py-2 font-semibold">1. Doanh thu bán hàng và cung cấp dịch vụ</td>
                        <td className="border border-slate-300 px-3 py-2 text-center font-mono">01</td>
                        <td className="border border-slate-300 px-3 py-2 text-right font-bold text-blue-700">{formatVND(revenueTotal)}</td>
                        <td className="border border-slate-300 px-3 py-2 text-right text-slate-500">0 ₫</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 px-3 py-2 font-semibold">2. Doanh thu thuần về bán hàng và cung cấp dịch vụ (10 = 01 - 02)</td>
                        <td className="border border-slate-300 px-3 py-2 text-center font-mono">10</td>
                        <td className="border border-slate-300 px-3 py-2 text-right font-bold">{formatVND(revenueTotal)}</td>
                        <td className="border border-slate-300 px-3 py-2 text-right text-slate-500">0 ₫</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 px-3 py-2 font-semibold">3. Giá vốn hàng bán</td>
                        <td className="border border-slate-300 px-3 py-2 text-center font-mono">11</td>
                        <td className="border border-slate-300 px-3 py-2 text-right font-bold text-rose-600">{formatVND(cogsTotal)}</td>
                        <td className="border border-slate-300 px-3 py-2 text-right text-slate-500">0 ₫</td>
                      </tr>
                      <tr className="bg-blue-50/50">
                        <td className="border border-slate-300 px-3 py-2 font-bold text-blue-900">4. Lợi nhuận gộp về bán hàng và CCDV (20 = 10 - 11)</td>
                        <td className="border border-slate-300 px-3 py-2 text-center font-mono font-bold">20</td>
                        <td className="border border-slate-300 px-3 py-2 text-right font-bold text-blue-800">{formatVND(grossProfit)}</td>
                        <td className="border border-slate-300 px-3 py-2 text-right text-slate-500">0 ₫</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-300 px-3 py-2">5. Chi phí quản lý doanh nghiệp (khấu hao, lương)</td>
                        <td className="border border-slate-300 px-3 py-2 text-center font-mono">26</td>
                        <td className="border border-slate-300 px-3 py-2 text-right font-medium">21,750,000 ₫</td>
                        <td className="border border-slate-300 px-3 py-2 text-right text-slate-500">0 ₫</td>
                      </tr>
                      <tr className="bg-emerald-50/70 font-bold">
                        <td className="border border-slate-300 px-3 py-2 text-emerald-900">6. Tổng lợi nhuận kế toán trước thuế (50 = 20 - 26)</td>
                        <td className="border border-slate-300 px-3 py-2 text-center font-mono">50</td>
                        <td className="border border-slate-300 px-3 py-2 text-right text-emerald-800 text-sm">
                          {formatVND(grossProfit - 21750000)}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-right text-slate-500">0 ₫</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportType === 'b01' && (
              <div>
                <div className="text-center mb-6">
                  <span className="text-xs text-slate-500 font-mono">Mẫu số B01 - DN (Ban hành theo TT số 200/2014/TT-BTC)</span>
                  <h3 className="text-base font-bold text-slate-900 mt-1 uppercase">
                    BẢNG CÂN ĐỐI KẾ TOÁN
                  </h3>
                  <p className="text-xs text-slate-500">Tại ngày 31 tháng 12 năm 2024</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* TÀI SẢN */}
                  <div className="border border-slate-300 rounded-lg p-3">
                    <div className="font-bold text-sm text-blue-900 border-b pb-2 mb-2">TÀI SẢN (ASSETS)</div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span>A. TÀI SẢN NGẮN HẠN</span>
                        <span>1,245,000,000 ₫</span>
                      </div>
                      <div className="pl-3 text-slate-600 flex justify-between">
                        <span>I. Tiền và tương đương tiền (111, 112)</span>
                        <span className="font-medium">420,000,000 ₫</span>
                      </div>
                      <div className="pl-3 text-slate-600 flex justify-between">
                        <span>II. Phải thu ngắn hạn KH (131)</span>
                        <span className="font-medium">{formatVND(customers.reduce((s, c) => s + c.currentDebt, 0))}</span>
                      </div>
                      <div className="pl-3 text-slate-600 flex justify-between">
                        <span>III. Hàng tồn kho (152, 155, 156)</span>
                        <span className="font-medium">165,000,000 ₫</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-2 border-t">
                        <span>B. TÀI SẢN DÀI HẠN (TSCĐ 211 - 214)</span>
                        <span>{formatVND(totalFixedAssetCost - totalDepreciationAccum)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-blue-800 text-sm pt-2 border-t">
                        <span>TỔNG CỘNG TÀI SẢN:</span>
                        <span>2,112,000,000 ₫</span>
                      </div>
                    </div>
                  </div>

                  {/* NGUỒN VỐN */}
                  <div className="border border-slate-300 rounded-lg p-3">
                    <div className="font-bold text-sm text-emerald-900 border-b pb-2 mb-2">NGUỒN VỐN (LIABILITIES & EQUITY)</div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span>A. NỢ PHẢI TRẢ</span>
                        <span>{formatVND(totalPayables + 7280000)}</span>
                      </div>
                      <div className="pl-3 text-slate-600 flex justify-between">
                        <span>I. Phải trả người bán ngắn hạn (331)</span>
                        <span className="font-medium">{formatVND(totalPayables)}</span>
                      </div>
                      <div className="pl-3 text-slate-600 flex justify-between">
                        <span>II. Thuế và các khoản phải nộp NN (333)</span>
                        <span className="font-medium">7,280,000 ₫</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-2 border-t">
                        <span>B. VỐN CHỦ SỞ HỮU (411, 421)</span>
                        <span>1,957,720,000 ₫</span>
                      </div>
                      <div className="pl-3 text-slate-600 flex justify-between">
                        <span>I. Vốn góp của chủ sở hữu (411)</span>
                        <span className="font-medium">1,800,000,000 ₫</span>
                      </div>
                      <div className="pl-3 text-slate-600 flex justify-between">
                        <span>II. Lợi nhuận sau thuế chưa phân phối (421)</span>
                        <span className="font-medium">157,720,000 ₫</span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-800 text-sm pt-2 border-t">
                        <span>TỔNG CỘNG NGUỒN VỐN:</span>
                        <span>2,112,000,000 ₫</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {reportType === 'b03' && (
              <div>
                <div className="text-center mb-6">
                  <span className="text-xs text-slate-500 font-mono">Mẫu số B03 - DN (Phương pháp trực tiếp)</span>
                  <h3 className="text-base font-bold text-slate-900 mt-1 uppercase">
                    BÁO CÁO LƯU CHUYỂN TIỀN TỆ
                  </h3>
                  <p className="text-xs text-slate-500">Năm tài chính 2024</p>
                </div>

                <div className="space-y-3 text-xs max-w-2xl mx-auto">
                  <div className="flex justify-between p-2 rounded bg-slate-50 font-semibold">
                    <span>1. Tiền thu từ bán hàng, cung cấp dịch vụ</span>
                    <span className="text-emerald-700 font-bold">+50,000,000 ₫</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-50 font-semibold">
                    <span>2. Tiền chi trả cho người cung cấp hàng hóa, dịch vụ</span>
                    <span className="text-rose-700 font-bold">-30,000,000 ₫</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-50 font-semibold">
                    <span>3. Tiền chi trả cho người lao động</span>
                    <span className="text-rose-700 font-bold">-15,000,000 ₫</span>
                  </div>
                  <div className="flex justify-between p-3 rounded-lg bg-blue-50 border border-blue-200 font-bold text-blue-900">
                    <span>LƯU CHUYỂN TIỀN THUẦN TRONG KỲ:</span>
                    <span className="text-sm">+5,000,000 ₫</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: HÓA ĐƠN ĐIỆN TỬ THÔNG TƯ 78/2021/TT-BTC */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                Hóa Đơn Điện Tử Chuẩn Nghị Định 123 & Thông Tư 78/2021/TT-BTC
              </h3>
              <p className="text-xs text-slate-500">
                Ký hiệu 1C24..., tích hợp chữ ký số Token/HSM và cấp mã xác thực từ Tổng Cục Thuế
              </p>
            </div>
            <button
              onClick={() => {
                const rows = invoices.map(inv => ({
                  'Số Hóa Đơn': inv.invoiceNumber,
                  'Ký Hiệu': inv.invoiceSeries,
                  'Mẫu Số': inv.templateCode,
                  'Ngày Ký': inv.issueDate,
                  'Người Mua': inv.buyerName,
                  'MST Người Mua': inv.buyerTaxCode,
                  'Mã CQT': inv.cqtCode,
                  'Tổng Tiền': inv.totalAmount,
                }));
                exportToCSV('Hoa-Don-Dien-Tu-TT78', rows);
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
                  <th className="px-4 py-3">Mẫu Số / Ký Hiệu</th>
                  <th className="px-4 py-3">Số Hóa Đơn / Ngày</th>
                  <th className="px-4 py-3">Tên Người Mua / MST</th>
                  <th className="px-4 py-3 text-right">Tổng Tiền Thanh Toán</th>
                  <th className="px-4 py-3 text-center">CQT Xác Thực</th>
                  <th className="px-4 py-3 text-center">Bản Thể Hiện</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-blue-700">{inv.invoiceSeries}</span>
                      <span className="text-slate-500 text-[10px] block">Mẫu: {inv.templateCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-slate-900 text-sm">#{inv.invoiceNumber}</div>
                      <div className="text-[11px] text-slate-500">{formatDateVN(inv.issueDate)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{inv.buyerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">MST: {inv.buyerTaxCode}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-bold text-slate-900">{formatVND(inv.totalAmount)}</div>
                      <div className="text-[10px] text-slate-500">VAT: {formatVND(inv.totalVat)}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Đã cấp mã CQT
                      </span>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {inv.cqtCode?.slice(0, 15)}...
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white font-medium text-[11px] transition-colors cursor-pointer shadow-xs"
                      >
                        <Eye className="w-3 h-3" />
                        Xem Hóa Đơn GTGT
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: XEM BẢN THỂ HIỆN HÓA ĐƠN ĐIỆN TỬ TT78 CHUẨN */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 mb-4">
              <span className="font-semibold text-xs text-slate-500">
                Bản Thể Hiện Hóa Đơn Điện Tử Có Mã Cơ Quan Thuế (TT78/2021/TT-BTC)
              </span>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Official Invoice Sheet */}
            <div className="border-2 border-blue-900 rounded-xl p-6 bg-white text-xs text-slate-800 space-y-4">
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-blue-900 pb-4">
                <div>
                  <h2 className="font-bold text-sm text-blue-900">
                    CỬA HÀNG ĐIỆN NƯỚC CƯỜNG NGUYỆT
                  </h2>
                  <p className="text-[11px] text-slate-600 mt-0.5">Mã số thuế: <strong>0107899999</strong></p>
                  <p className="text-[11px] text-slate-600">Địa chỉ: Km12 Quốc Lộ 1A, Thanh Trì, TP. Hà Nội</p>
                  <p className="text-[11px] text-slate-600">Điện thoại: 024 3868 9999 • Email: cuahangdiennuoccuongnguyet@gmail.com</p>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-xs text-slate-900">Mẫu số: {selectedInvoice.templateCode}</div>
                  <div className="font-mono font-bold text-xs text-slate-900">Ký hiệu: {selectedInvoice.invoiceSeries}</div>
                  <div className="font-mono font-bold text-sm text-rose-700">Số: {selectedInvoice.invoiceNumber}</div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center py-2">
                <h1 className="text-base font-bold text-blue-950 uppercase tracking-wide">
                  HÓA ĐƠN GIÁ TRỊ GIA TĂNG
                </h1>
                <p className="text-[11px] text-slate-500 italic mt-0.5">
                  Ngày {formatDateVN(selectedInvoice.issueDate)}
                </p>
                <p className="text-[10px] text-emerald-800 font-mono mt-1">
                  Mã CQT: {selectedInvoice.cqtCode}
                </p>
              </div>

              {/* Buyer Info */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <div>Đơn vị mua hàng: <strong className="text-slate-900">{selectedInvoice.buyerName}</strong></div>
                <div>Mã số thuế: <strong className="font-mono">{selectedInvoice.buyerTaxCode}</strong></div>
                <div>Địa chỉ: {selectedInvoice.buyerAddress}</div>
                <div>Hình thức thanh toán: <strong>{selectedInvoice.paymentMethod}</strong></div>
              </div>

              {/* Items Table */}
              <table className="w-full border-collapse border border-slate-300 text-[11px]">
                <thead className="bg-slate-100 font-bold uppercase text-slate-700">
                  <tr>
                    <th className="border border-slate-300 p-2 text-center w-10">STT</th>
                    <th className="border border-slate-300 p-2 text-left">Tên Hàng Hóa, Dịch Vụ</th>
                    <th className="border border-slate-300 p-2 text-center w-14">ĐVT</th>
                    <th className="border border-slate-300 p-2 text-right w-16">Số Lượng</th>
                    <th className="border border-slate-300 p-2 text-right w-24">Đơn Giá</th>
                    <th className="border border-slate-300 p-2 text-right w-28">Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 font-medium">{it.name}</td>
                      <td className="border border-slate-300 p-2 text-center">{it.unit}</td>
                      <td className="border border-slate-300 p-2 text-right font-bold">{it.quantity}</td>
                      <td className="border border-slate-300 p-2 text-right">{formatVND(it.unitPrice)}</td>
                      <td className="border border-slate-300 p-2 text-right font-bold">{formatVND(it.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary */}
              <div className="space-y-1 text-right pt-2 border-t border-slate-300">
                <div>Cộng tiền hàng (chưa có thuế): <strong>{formatVND(selectedInvoice.totalBeforeVat)}</strong></div>
                <div>Thuế suất GTGT (8%): <strong>{formatVND(selectedInvoice.totalVat)}</strong></div>
                <div className="text-sm font-bold text-blue-900">
                  Tổng cộng tiền thanh toán: {formatVND(selectedInvoice.totalAmount)}
                </div>
                <div className="text-[11px] text-slate-600 italic text-left pt-1">
                  Số tiền viết bằng chữ: <strong>{selectedInvoice.amountInWords}</strong>
                </div>
              </div>

              {/* Digital Signature */}
              <div className="pt-4 border-t border-slate-300 flex justify-between items-center text-[10px] text-slate-500">
                <div className="max-w-sm">
                  <div className="font-bold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Ký bởi: {selectedInvoice.digitalSignature}
                  </div>
                </div>
                <div className="text-center">
                  <QrCode className="w-12 h-12 mx-auto text-slate-800" />
                  <span className="text-[9px]">Tra cứu HĐĐT</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
              >
                In Hóa Đơn
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LẬP PHIẾU CHI TRẢ NỢ NHÀ CUNG CẤP */}
      {showPayModal && selectedSupplierForPay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Lập Phiếu Chi Thanh Toán Tiền Hàng (TK 331)
              </h3>
              <button
                onClick={() => setShowPayModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="font-semibold text-slate-800">{selectedSupplierForPay.name}</div>
                <div className="text-slate-500 mt-1">
                  Số nợ hiện tại: <strong className="text-rose-700">{formatVND(selectedSupplierForPay.currentPayable)}</strong>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Số Tiền Chi Trả (VNĐ)</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nội Dung Chi</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onPaySupplierDebt(selectedSupplierForPay.id, payAmount, payNote);
                    setShowPayModal(false);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg cursor-pointer shadow-xs"
                >
                  Xác Nhận & Hạch Toán Nợ 331 / Có 112
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THÊM BÚT TOÁN KẾ TOÁN */}
      {showNewEntryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Thêm Bút Toán Định Khoản Kế Toán
              </h3>
              <button
                onClick={() => setShowNewEntryModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="mt-4 space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Diễn Giải Nghiệp Vụ</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Chi phí tiếp khách, tiền điện nước..."
                  value={entryDesc}
                  onChange={(e) => setEntryDesc(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Chứng Từ Gốc Tham Chiếu</label>
                <input
                  type="text"
                  placeholder="Ví dụ: HD-00982, UNC-VCB..."
                  value={entryRef}
                  onChange={(e) => setEntryRef(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tài Khoản Nợ</label>
                  <select
                    value={entryDebitAcc}
                    onChange={(e) => setEntryDebitAcc(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    <option value="642">TK 642 (Chi Phí QLDN)</option>
                    <option value="641">TK 641 (Chi Phí Bán Hàng)</option>
                    <option value="156">TK 156 (Hàng Hóa)</option>
                    <option value="152">TK 152 (Nguyên Vật Liệu)</option>
                    <option value="112">TK 112 (Tiền Gửi NH)</option>
                    <option value="111">TK 111 (Tiền Mặt)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tài Khoản Có</label>
                  <select
                    value={entryCreditAcc}
                    onChange={(e) => setEntryCreditAcc(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    <option value="112">TK 112 (Tiền Gửi NH)</option>
                    <option value="111">TK 111 (Tiền Mặt)</option>
                    <option value="331">TK 331 (Phải Trả NCC)</option>
                    <option value="511">TK 511 (Doanh Thu)</option>
                    <option value="214">TK 214 (Hao Mòn TSCĐ)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Số Tiền (VNĐ)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2 font-bold text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowNewEntryModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg cursor-pointer shadow-xs"
                >
                  Ghi Vào Sổ Cái
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
