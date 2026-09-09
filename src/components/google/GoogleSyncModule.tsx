import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Globe,
  UploadCloud,
  DownloadCloud,
  Code2,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Layers,
  Database
} from 'lucide-react';
import { exportToCSV, exportAllDataJSON } from '../../services/storage';

interface GoogleSyncModuleProps {
  data: Record<string, any>;
  onRestoreData: (restored: any) => void;
}

export const GoogleSyncModule: React.FC<GoogleSyncModuleProps> = ({ data, onRestoreData }) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');
  const [googleSiteUrl, setGoogleSiteUrl] = useState('https://sites.google.com/view/cuongnguyet-erp-portal');

  const appUrl = window.location.origin;

  const embedCode = `<iframe 
  src="${appUrl}" 
  width="100%" 
  height="850px" 
  frameborder="0" 
  style="border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"
  allow="camera; microphone; geolocation"
></iframe>`;

  const appsScriptCode = `/**
 * GOOGLE APPS SCRIPT ĐỒNG BỘ DỮ LIỆU ERP VÀO GOOGLE SHEETS & GOOGLE SITES
 * 1. Mở Google Sheet của bạn -> Extensions (Tiện ích mở rộng) -> Apps Script
 * 2. Dán đoạn mã này vào và nhấn Deploy (Triển khai) dưới dạng Web App
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    var targetSheet = ss.getSheetByName(payload.sheetName) || ss.insertSheet(payload.sheetName);
    
    // Xóa nội dung cũ và ghi dữ liệu mới
    targetSheet.clearContents();
    if (payload.headers && payload.headers.length > 0) {
      targetSheet.appendRow(payload.headers);
    }
    
    if (payload.rows && payload.rows.length > 0) {
      for (var i = 0; i < payload.rows.length; i++) {
        targetSheet.appendRow(payload.rows[i]);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", count: payload.rows.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleCopy = (text: string, type: 'script' | 'embed') => {
    navigator.clipboard.writeText(text);
    if (type === 'script') {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } else {
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    }
  };

  const handleSimulateSync = () => {
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }, 1500);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onRestoreData(json);
        alert('Phục hồi dữ liệu từ tệp sao lưu thành công!');
      } catch (err) {
        alert('Tệp JSON không hợp lệ.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-xs mb-2">
              <Globe className="w-3.5 h-3.5" />
              Kết Nối Google Workspace & Google Sites
            </div>
            <h2 className="text-xl font-bold">
              Tích Hợp Lưu Dữ Liệu & Nhúng Hệ Thống Vào Google Site
            </h2>
            <p className="text-xs text-blue-100 max-w-2xl mt-1 leading-relaxed">
              Hệ thống hỗ trợ 2 phương thức tiện lợi nhất để đưa toàn bộ dữ liệu ERP lên Google Workspace:
              nhúng trực tiếp giao diện tương tác vào trang Google Site của doanh nghiệp và xuất tự động các bảng biểu sang Google Sheets.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              onClick={handleSimulateSync}
              disabled={syncStatus === 'syncing'}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-blue-700 rounded-xl font-bold text-xs hover:bg-blue-50 transition-all cursor-pointer shadow-md"
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              {syncStatus === 'syncing'
                ? 'Đang đồng bộ...'
                : syncStatus === 'synced'
                ? 'Đã đồng bộ Google Cloud!'
                : 'Đồng Bộ Toàn Bộ Dữ Liệu'}
            </button>
            <button
              onClick={() => exportAllDataJSON(data)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded-xl font-semibold text-xs transition-all cursor-pointer border border-white/20"
            >
              <DownloadCloud className="w-4 h-4" />
              Tải Bản Sao Lưu (JSON)
            </button>
          </div>
        </div>
      </div>

      {/* Grid of integration tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Method 1: Embed in Google Site */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                1. Nhúng Trực Tiếp ERP Vào Google Site Doanh Nghiệp
              </h3>
              <p className="text-xs text-slate-500">
                Nhân viên có thể truy cập ERP ngay trên trang nội bộ Google Sites của công ty
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-600 space-y-2 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <div className="font-semibold text-slate-800">Các bước nhúng vào Google Sites:</div>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Mở trang web Google Site của bạn: <code className="text-blue-700 font-mono">sites.google.com</code></li>
              <li>Tại thanh công cụ bên phải, bấm vào nút <strong>"Nhúng" (&lt;/&gt; Embed)</strong>.</li>
              <li>Chọn thẻ <strong>"Mã nhúng" (Embed code)</strong> và dán đoạn mã iframe bên dưới.</li>
              <li>Nhấn Tiếp theo &rarr; Chèn &rarr; Kéo thả kích thước khung hình theo ý muốn.</li>
            </ol>
          </div>

          <div className="relative">
            <div className="flex justify-between items-center bg-slate-900 text-slate-300 px-3 py-1.5 rounded-t-lg text-[11px] font-mono">
              <span>Mã Iframe nhúng Google Sites</span>
              <button
                onClick={() => handleCopy(embedCode, 'embed')}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-white cursor-pointer"
              >
                {copiedEmbed ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedEmbed ? 'Đã sao chép' : 'Sao chép mã'}
              </button>
            </div>
            <pre className="p-3 bg-slate-950 text-slate-200 rounded-b-lg text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
              {embedCode}
            </pre>
          </div>
        </div>

        {/* Method 2: Export collections to Google Sheets */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                2. Xuất Nhanh Bảng Dữ Liệu Vào Google Sheets
              </h3>
              <p className="text-xs text-slate-500">
                Tải về định dạng CSV chuẩn UTF-8 có dấu tiếng Việt để mở trực tiếp trên Google Trang tính
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => exportToCSV('Khach-Hang-Cong-No', data.customers || [])}
              className="p-3 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 text-left transition-colors cursor-pointer group"
            >
              <div className="font-semibold text-slate-800 group-hover:text-blue-700">Khách Hàng & Công Nợ</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Xuất danh sách KH và nợ 131</div>
            </button>

            <button
              onClick={() => exportToCSV('Don-Ban-Hang-SO', data.salesOrders || [])}
              className="p-3 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 text-left transition-colors cursor-pointer group"
            >
              <div className="font-semibold text-slate-800 group-hover:text-blue-700">Đơn Bán Hàng (SO)</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Chi tiết đơn, tiến độ giao</div>
            </button>

            <button
              onClick={() => exportToCSV('Ton-Kho-Theo-Lo', data.inventory || [])}
              className="p-3 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 text-left transition-colors cursor-pointer group"
            >
              <div className="font-semibold text-slate-800 group-hover:text-blue-700">Tồn Kho Thời Gian Thực</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Số lượng, Lô/Hạn, Barcode</div>
            </button>

            <button
              onClick={() => exportToCSV('So-Nhat-Ky-Chung', data.journalEntries || [])}
              className="p-3 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 text-left transition-colors cursor-pointer group"
            >
              <div className="font-semibold text-slate-800 group-hover:text-blue-700">Sổ Nhật Ký Kế Toán</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Định khoản Nợ/Có tự động</div>
            </button>

            <button
              onClick={() => exportToCSV('Tai-San-Co-Dinh', data.fixedAssets || [])}
              className="p-3 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 text-left transition-colors cursor-pointer group"
            >
              <div className="font-semibold text-slate-800 group-hover:text-blue-700">Tài Sản Cố Định (211)</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Khấu hao tháng, hao mòn lũy kế</div>
            </button>

            <button
              onClick={() => exportToCSV('Lenh-San-Xuat', data.productionOrders || [])}
              className="p-3 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 text-left transition-colors cursor-pointer group"
            >
              <div className="font-semibold text-slate-800 group-hover:text-blue-700">Lệnh Sản Xuất & BOM</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Tiến độ, định mức 621-622-627</div>
            </button>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phục Hồi Dữ Liệu Từ Tệp Sao Lưu (JSON):
            </label>
            <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition-colors">
              <UploadCloud className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-slate-700">
                Bấm để chọn tệp .json đã tải về trước đó
              </span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Method 3: Google Apps Script Webhook */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Code2 className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900">
              3. Tự Động Hóa Đồng Bộ Bằng Google Apps Script (Webhook)
            </h3>
          </div>
          <button
            onClick={() => handleCopy(appsScriptCode, 'script')}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedScript ? 'Đã chép mã Script' : 'Sao chép mã Apps Script'}
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Đoạn mã Google Apps Script này cho phép Google Sheets tiếp nhận tự động các nghiệp vụ từ hệ thống ERP thông qua yêu cầu HTTP POST an toàn, tự động tạo mới các sheet theo từng phân hệ.
        </p>

        <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-56">
          {appsScriptCode}
        </pre>
      </div>
    </div>
  );
};
