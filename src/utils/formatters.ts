// Format Vietnamese Dong
export function formatVND(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format plain number with thousand separator
export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return new Intl.NumberFormat('vi-VN').format(num);
}

// Format date DD/MM/YYYY
export function formatDateVN(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

// Convert numbers into Vietnamese words (Ví dụ: 120.000.000 -> Một trăm hai mươi triệu đồng chẵn)
export function numberToWordsVN(total: number): string {
  if (total === 0) return 'Không đồng.';
  if (total < 0) return 'Âm ' + numberToWordsVN(Math.abs(total)).toLowerCase();

  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readThree(num: number, hasHigher: boolean): string {
    const h = Math.floor(num / 100);
    const t = Math.floor((num % 100) / 10);
    const u = num % 10;
    let res = '';

    if (h > 0 || hasHigher) {
      res += digits[h] + ' trăm ';
    }

    if (t > 1) {
      res += digits[t] + ' mươi ';
      if (u === 1) res += 'mốt ';
      else if (u === 5) res += 'lăm ';
      else if (u > 0) res += digits[u] + ' ';
    } else if (t === 1) {
      res += 'mười ';
      if (u === 5) res += 'lăm ';
      else if (u > 0) res += digits[u] + ' ';
    } else if (t === 0 && u > 0) {
      if (h > 0 || hasHigher) res += 'lẻ ';
      res += digits[u] + ' ';
    }

    return res.trim();
  }

  let sNumber = Math.round(total).toString();
  const groups: number[] = [];
  while (sNumber.length > 0) {
    const chunk = sNumber.slice(-3);
    groups.push(parseInt(chunk, 10));
    sNumber = sNumber.slice(0, -3);
  }

  let result = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g > 0) {
      const chunkText = readThree(g, i < groups.length - 1);
      result += chunkText + ' ' + units[i] + ' ';
    }
  }

  result = result.trim();
  if (!result) return 'Không đồng.';

  // Capitalize first letter
  result = result.charAt(0).toUpperCase() + result.slice(1);
  return result + ' đồng chẵn.';
}

// Simple unique ID generator
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
}
