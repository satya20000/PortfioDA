export const pct = value => value == null ? '—' : `${(value * 100).toFixed(2)}%`;
export const human = value => String(value ?? 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, x => x.toUpperCase());
export const number = (value, digits = 0) => value == null ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
export const money = (value, unit = 'USD', compact = false) => {
  if (value == null) return '—';
  const n = new Intl.NumberFormat('en-US', { maximumFractionDigits: compact ? 2 : 0, notation: compact ? 'compact' : 'standard' }).format(value);
  return `${unit === 'USD' ? '$' : unit === 'BRL' ? 'R$ ' : 'CU '}${n}`;
};
export const ratio = (n, d) => d > 0 ? n / d : null;
export const sum = (rows, key) => rows.reduce((a, r) => a + (r[key] ?? 0), 0);
export const mean = (rows, key) => {
  let total = 0, count = 0;
  for (const r of rows) if (r[key] != null && Number.isFinite(r[key])) { total += r[key]; count++; }
  return count ? total / count : null;
};
export function unpack(table) {
  return table.rows.map(row => Object.fromEntries(table.columns.map((c, i) => [c, row[i]])));
}
export function filterRows(rows, filters) {
  return rows.filter(r => {
    if (filters.from && r.month < filters.from) return false;
    if (filters.to && r.month > filters.to) return false;
    return Object.entries(filters).every(([key, value]) => !value || key === 'from' || key === 'to' || (key === 'category' ? r.categories?.includes(value) : String(r[key]) === value));
  });
}
export function group(rows, key, compute) {
  const groups = new Map();
  for (const r of rows) {
    const v = r[key] ?? 'Unknown';
    if (!groups.has(v)) groups.set(v, []);
    groups.get(v).push(r);
  }
  return [...groups].map(([name, rs]) => ({ name, ...compute(rs) }));
}
function metric(label, value, kind, description, definition) {
  return { label, value, kind, description, definition: definition || description };
}
export function funnelModel(rows) {
  const leads = rows.length, won = sum(rows, 'converted'), active = sum(rows, 'active'), repeated = sum(rows, 'repeat'), gmv = sum(rows, 'gmv');
  const calc = rs => ({ leads: rs.length, won: sum(rs, 'converted'), active: sum(rs, 'active'), gmv: sum(rs, 'gmv'),
    conversion: ratio(sum(rs, 'converted'), rs.length), activation: ratio(sum(rs, 'active'), sum(rs, 'converted')), gmvPerLead: ratio(sum(rs, 'gmv'), rs.length) });
  const channels = group(rows, 'channel', calc).sort((a, b) => b.gmv - a.gmv);
  const sellers = rows.filter(r => r.active).sort((a, b) => b.gmv - a.gmv);
  const top = sellers.slice(0, Math.ceil(sellers.length * 0.1));
  return {
    kpis: [metric('Marketing qualified leads', leads, 'count', `${number(won)} won deals`, 'Number of selected lead-acquisition records.'),
      metric('Lead-to-win conversion', ratio(won, leads), 'percent', 'Won leads / qualified leads'),
      metric('Activated sellers', active, 'count', `${pct(ratio(active, won))} of won deals`, 'Won sellers with at least one observed post-close delivered order.'),
      metric('Attributed item GMV', gmv, 'money', 'BRL · observed post-close sales', 'Marketplace delivered item value, excluding freight and platform take rate.')],
    trend: group(rows, 'month', calc).sort((a, b) => a.name.localeCompare(b.name)),
    segments: channels, secondary: group(rows.filter(r => r.converted), 'segment', calc).sort((a, b) => b.gmv - a.gmv),
    funnel: [{ name: 'Qualified leads', value: leads }, { name: 'Won deals', value: won }, { name: 'Activated sellers', value: active }, { name: 'Repeat sellers', value: repeated }],
    insight: `The top ${number(top.length)} activated sellers account for ${pct(ratio(sum(top, 'gmv'), gmv))} of selected GMV. Acquisition volume and seller value tell different stories.`,
    detail: rows,
  };
}
function cxCalc(rs) {
  const eligible = rs.filter(r => r.eligible), reviewed = rs.filter(r => r.review != null);
  const late = sum(eligible, 'late');
  return { orders: rs.length, eligible: eligible.length, late, lateRate: ratio(late, eligible.length),
    review: mean(rs, 'review'), low: ratio(reviewed.filter(r => r.review <= 2).length, reviewed.length), delivery: mean(rs, 'delivery'),
    processing: mean(rs, 'processing'), shipping: mean(rs, 'shipping') };
}
export function experienceModel(rows) {
  const c = cxCalc(rows);
  const onTime = rows.filter(r => r.eligible && !r.late), late = rows.filter(r => r.eligible && r.late);
  return {
    kpis: [metric('Orders analyzed', rows.length, 'count', `${number(rows.filter(r => r.status === 'delivered').length)} delivered`, 'Distinct selected orders; category membership never duplicates orders.'),
      metric('On-time delivery', c.eligible ? 1 - c.lateRate : null, 'percent', `${number(c.eligible)} eligible deliveries`, '(Eligible deliveries − late deliveries) / eligible deliveries.'),
      metric('Average review', c.review, 'score', 'Selected review · out of 5', 'Mean latest selected review per order, excluding nulls.'),
      metric('Average delivery', c.delivery, 'days', 'Purchase to customer delivery', 'Mean valid elapsed days; negative/invalid durations remain excluded.')],
    trend: group(rows, 'month', cxCalc).sort((a, b) => a.name.localeCompare(b.name)),
    segments: group(rows, 'state', cxCalc).sort((a, b) => b.orders - a.orders),
    secondary: group(rows, 'status', rs => ({ orders: rs.length })),
    reviews: [1, 2, 3, 4, 5].map(n => ({ name: `${n} star${n > 1 ? 's' : ''}`, orders: rows.filter(r => r.review === n).length })),
    comparison: [{ name: 'On time', review: mean(onTime, 'review'), orders: onTime.length }, { name: 'Late', review: mean(late, 'review'), orders: late.length }],
    stages: [{ name: 'Processing', days: c.processing }, { name: 'Shipping', days: c.shipping }],
    insight: `Selected late orders average ${number(mean(late, 'review'), 2)}/5 versus ${number(mean(onTime, 'review'), 2)}/5 for on-time orders. This association helps prioritize investigation; it does not establish cause.`,
    detail: rows,
  };
}
function loanCalc(rs) {
  const resolved = rs.filter(r => r.resolved);
  return { loans: rs.length, funded: sum(rs, 'funded'), resolved: resolved.length, defaults: sum(resolved, 'default'),
    defaultRate: ratio(sum(resolved, 'default'), resolved.length), return: ratio(sum(resolved, 'netCash'), sum(resolved, 'funded')), interest: mean(rs, 'interest') };
}
export function lendingModel(rows) {
  const c = loanCalc(rows);
  return {
    kpis: [metric('Funded principal', c.funded, 'money', `${number(rows.length)} accepted loans`, 'Selected funded principal; not investor allocation.'),
      metric('Resolved default rate', c.defaultRate, 'percent', `${number(c.defaults)} / ${number(c.resolved)} resolved`, 'Charged-off/default loans / resolved loans. Current loans excluded.'),
      metric('Net cash return', c.return, 'percent', 'Cumulative · not annualized', 'Funding-weighted resolved net cash / resolved funded principal; total payments already include recoveries.'),
      metric('Average coupon', c.interest == null ? null : c.interest / 100, 'percent', 'Unweighted loan average', 'Arithmetic average annual stated interest rate across selected loans.')],
    trend: group(rows, 'month', loanCalc).sort((a, b) => a.name.localeCompare(b.name)),
    segments: group(rows, 'grade', loanCalc).sort((a, b) => a.name.localeCompare(b.name)),
    secondary: group(rows, 'purpose', loanCalc).sort((a, b) => b.funded - a.funded),
    distribution: group(rows, 'status', rs => ({ loans: rs.length })),
    insight: `${number(rows.length - c.resolved)} selected loans are unresolved and excluded from default and return calculations. Compare grades alongside funded exposure before interpreting the risk–return trade-off.`,
    detail: rows,
  };
}
export function filterAccounts(accounts, filters) {
  return accounts.filter(r => ['plan', 'region', 'segment', 'channel'].every(k => !filters[k] || r[k] === filters[k]));
}
export function monthEnd(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}
export function cohortMatrix(accounts, filters) {
  const cutoff = monthEnd(filters.to || '2025-12');
  const selected = accounts.filter(r => (!filters.from || r.start.slice(0, 7) >= filters.from) && r.start.slice(0, 7) <= (filters.to || '2025-12'));
  return group(selected.map(r => ({ ...r, cohort: r.start.slice(0, 7) })), 'cohort', rs => {
    const [year, month] = rs[0].start.slice(0, 7).split('-').map(Number);
    const cells = Array.from({ length: 13 }, (_, age) => {
      const end = new Date(Date.UTC(year, month + age, 0)).toISOString().slice(0, 10);
      if (end > cutoff) return null;
      return ratio(rs.filter(r => !r.end || r.end > end).length, rs.length);
    });
    return { size: rs.length, cells };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
function saasCalc(rs) {
  return { mrr: sum(rs, 'mrr'), active: sum(rs, 'active'), beginning: sum(rs, 'beginning'), new: sum(rs, 'new'), churned: sum(rs, 'churned'),
    churn: ratio(sum(rs, 'churned'), sum(rs, 'beginning')), beginMRR: sum(rs, 'beginMRR'), churnMRR: sum(rs, 'churnMRR'),
    grr: sum(rs, 'beginMRR') ? 1 - sum(rs, 'churnMRR') / sum(rs, 'beginMRR') : null,
    riskMRR: sum(rs, 'riskMRR'), riskAccounts: sum(rs, 'riskAccounts') };
}
export function saasModel(rows, accounts, filters) {
  const timeline = group(rows, 'month', saasCalc).sort((a, b) => a.name.localeCompare(b.name));
  const latest = timeline.at(-1), total = saasCalc(rows), latestRows = rows.filter(r => r.month === latest?.name);
  return {
    kpis: [metric('Ending MRR', latest?.mrr ?? null, 'money', `${number(latest?.active)} active customers`, 'Active contracted monthly value at the latest selected month-end; monthly balances are never summed.'),
      metric('ARR run rate', latest ? latest.mrr * 12 : null, 'money', '12 × ending MRR', 'Annualized run rate, not recognized accounting revenue.'),
      metric('Logo churn', total.churn, 'percent', `${number(total.churned)} cancellations / ${number(total.beginning)} exposures`, 'Summed cancellations / summed beginning customer-month exposures over the selected period.'),
      metric('Gross revenue retention', total.grr, 'percent', 'Cancellation-only proxy', '1 − summed cancelled MRR / summed beginning MRR; contraction and expansion are unavailable.')],
    trend: timeline, segments: group(latestRows, 'plan', saasCalc).sort((a, b) => b.mrr - a.mrr),
    secondary: group(latestRows, 'region', saasCalc).sort((a, b) => b.mrr - a.mrr),
    cohorts: cohortMatrix(accounts, filters),
    riskMRR: latest?.riskMRR ?? null, riskAccounts: latest?.riskAccounts ?? null,
    insight: `${money(latest?.riskMRR, 'CU')} of selected ending MRR across ${number(latest?.riskAccounts)} active accounts meets the billing-risk indicator at ${latest?.name || 'the selected month-end'}. This is an operational signal, not a forecast of loss.`,
    detail: accounts.filter(r => r.start <= monthEnd(filters.to || '2025-12')),
  };
}
export function buildModel(id, rows, data, filters) {
  if (id === 'revenue-funnel') return funnelModel(rows);
  if (id === 'customer-experience') return experienceModel(rows);
  if (id === 'credit-portfolio') return lendingModel(rows);
  return saasModel(rows, filterAccounts(data.accounts, filters), filters);
}
export function toCSV(rows, columns) {
  const quote = v => {
    let s = Array.isArray(v) ? v.join('; ') : v == null ? '' : String(v);
    if (/^[=+@\-]/.test(s) && typeof v === 'string') s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  return [columns.map(quote).join(','), ...rows.map(r => columns.map(c => quote(r[c])).join(','))].join('\r\n');
}
