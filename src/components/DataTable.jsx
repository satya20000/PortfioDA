import { useDeferredValue, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { human, money, number, pct } from '../lib/analytics.mjs';
export function valueFormat(v, kind, unit) {
  if (v == null) return '—';
  if (kind === 'percent') return pct(v);
  if (kind === 'money') return money(v, unit);
  if (kind === 'days') return `${number(v, 1)} d`;
  if (kind === 'score') return number(v, 2);
  if (kind === 'decimal') return number(v, 2);
  if (kind === 'count') return number(v);
  if (kind === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.map(human).join(', ');
  return human(v);
}
export default function DataTable({ rows, columns, unit, pageSize = 12, searchable = true, label = 'Selected records' }) {
  const [search, setSearch] = useState(''), [page, setPage] = useState(0), [sort, setSort] = useState({ key: null, direction: 1 });
  const query = useDeferredValue(search.toLowerCase().trim());
  const selected = useMemo(() => {
    let found = query ? rows.filter(r => columns.some(c => String(r[c.key] ?? '').toLowerCase().includes(query))) : rows;
    if (sort.key) found = [...found].sort((a, b) => {
      const x = a[sort.key], y = b[sort.key];
      if (x == null) return y == null ? 0 : 1;
      if (y == null) return -1;
      return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * sort.direction;
    });
    return found;
  }, [rows, columns, query, sort]);
  const lastPage = Math.max(0, Math.ceil(selected.length / pageSize) - 1), effectivePage = Math.min(page, lastPage);
  function changeSort(key) { setSort(s => ({ key, direction: s.key === key ? -s.direction : 1 })); setPage(0); }
  return <div className="data-table-wrap">{searchable && <div className="table-toolbar"><p>{number(selected.length)} <span>{label.toLowerCase()}</span></p><label className="table-search"><Search size={15} /><input aria-label={`Search ${label.toLowerCase()}`} placeholder="Search this table…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></label></div>}<div className="table-scroll"><table><caption className="sr-only">{label}. Column headers sort the table.</caption><thead><tr>{columns.map(c => <th key={c.key}><button onClick={() => changeSort(c.key)} aria-label={`Sort by ${c.label}`}><span>{c.label}</span>{sort.key === c.key ? (sort.direction === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowDown size={11} className="sort-muted" />}</button></th>)}</tr></thead><tbody>{selected.slice(effectivePage * pageSize, (effectivePage + 1) * pageSize).map((r, i) => <tr key={r.record ?? r.name ?? i}>{columns.map(c => <td key={c.key}>{valueFormat(r[c.key], c.kind, unit)}</td>)}</tr>)}</tbody></table>{!selected.length && <div className="table-empty">No matching records. Try another filter or search.</div>}</div><div className="table-pagination"><span>{selected.length ? `${number(effectivePage * pageSize + 1)}–${number(Math.min((effectivePage + 1) * pageSize, selected.length))} of ${number(selected.length)}` : '0 records'}</span><div><button disabled={effectivePage === 0} onClick={() => setPage(effectivePage - 1)} aria-label="Previous table page"><ChevronLeft size={16} /></button><span>{effectivePage + 1} / {lastPage + 1}</span><button disabled={effectivePage === lastPage} onClick={() => setPage(effectivePage + 1)} aria-label="Next table page"><ChevronRight size={16} /></button></div></div></div>;
}
