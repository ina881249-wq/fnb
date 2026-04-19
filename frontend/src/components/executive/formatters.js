export const formatCurrency = (val, opts = {}) => {
  const { compact = true, currency = 'Rp' } = opts;
  if (val === null || val === undefined || isNaN(val)) return `${currency} 0`;
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (compact) {
    if (abs >= 1_000_000_000) return `${sign}${currency} ${(abs / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000) return `${sign}${currency} ${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sign}${currency} ${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}${currency} ${abs.toLocaleString('id-ID')}`;
};

export const formatCurrencyFull = (val, currency = 'Rp') => {
  if (val === null || val === undefined || isNaN(val)) return `${currency} 0`;
  return `${currency} ${Math.round(val).toLocaleString('id-ID')}`;
};

export const formatNumber = (val, decimals = 0) => {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return Number(val).toLocaleString('id-ID', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
};

export const formatPercent = (val, decimals = 1) => {
  if (val === null || val === undefined || isNaN(val)) return '0%';
  return `${val > 0 ? '+' : ''}${Number(val).toFixed(decimals)}%`;
};

export const formatDate = (isoDate, opts = { month: 'short', day: '2-digit' }) => {
  if (!isoDate) return '-';
  try {
    return new Date(isoDate).toLocaleDateString('en-US', opts);
  } catch { return isoDate; }
};
