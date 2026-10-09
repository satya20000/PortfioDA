import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { unpack, filterRows, buildModel, saasModel, cohortMatrix, mean } from '../src/lib/analytics.mjs';

function source(id) {
  const data = JSON.parse(fs.readFileSync(new URL(`../public/data/${id}.json`, import.meta.url)));
  data.rows = unpack(data);
  if (data.accounts) data.accounts = unpack(data.accounts);
  return data;
}
const within = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} does not match ${expected}`);

test('Olist lead metrics reconcile to published SQL controls', () => {
  const data = source('revenue-funnel');
  const model = buildModel(data.id, data.rows, data, {});
  assert.equal(model.kpis[0].value, 8000);
  within(model.kpis[1].value, 842 / 8000);
  assert.equal(model.kpis[2].value, 376);
  within(model.kpis[3].value, 664858, 1e-6);
  assert.equal(model.funnel[3].value, 295);
  within(model.segments.reduce((n, r) => n + r.gmv, 0), model.kpis[3].value, 1e-6);
});

test('Olist orders and delivery rates reconcile without category fanout', () => {
  const data = source('customer-experience');
  const model = buildModel(data.id, data.rows, data, {});
  assert.equal(model.kpis[0].value, 99441);
  within(model.kpis[1].value, 0.9322690992018244);
  within(model.kpis[2].value, 4.07079574823262);
  within(model.kpis[3].value, 12.558217098051976, 1e-6);
  const category = data.rows.find(r => r.categories.length > 1).categories[0];
  const selected = filterRows(data.rows, { category });
  assert.equal(selected.length, new Set(selected.map(r => r.record)).size);
  assert.equal(model.segments.reduce((n, r) => n + r.orders, 0), 99441);
});

test('Credit outcomes use resolved denominators and funding-weighted return', () => {
  const data = source('credit-portfolio');
  const model = buildModel(data.id, data.rows, data, {});
  assert.equal(data.rows.length, 39717);
  assert.equal(model.kpis[0].value, 434810325);
  within(model.kpis[1].value, 5627 / 38577);
  within(model.kpis[2].value, 0.09923343144589196, 1e-8);
  assert.equal(model.segments.reduce((n, r) => n + r.resolved, 0), 38577);
  assert.equal(model.segments.reduce((n, r) => n + r.funded, 0), 434810325);
});

test('SaaS latest balances and December ratios reconcile to source controls', () => {
  const data = source('saas-retention');
  const december = { from: '2025-12', to: '2025-12' };
  const model = buildModel(data.id, filterRows(data.rows, december), data, december);
  assert.equal(model.kpis[0].value, 1387441);
  assert.equal(model.kpis[1].value, 16649292);
  within(model.kpis[2].value, 44 / 4079);
  within(model.kpis[3].value, 0.9902971731612701);
  assert.equal(model.riskMRR, 396533);
  assert.equal(model.riskAccounts, 1165);
  const whole = buildModel(data.id, data.rows, data, { to: '2025-12' });
  assert.equal(whole.kpis[0].value, model.kpis[0].value, 'MRR is a latest balance, never a sum of monthly balances');
});

test('Every SaaS segment-month preserves the account and MRR bridges', () => {
  const data = source('saas-retention');
  for (const r of data.rows) {
    assert.equal(r.active, r.beginning + r.new - r.churned);
    within(r.mrr, r.beginMRR + r.newMRR - r.churnMRR);
    assert.ok(r.riskMRR <= r.mrr && r.riskAccounts <= r.active);
  }
});

test('Cohort month zero reflects end-month survival and future ages stay null', () => {
  const accounts = [{ start: '2025-01-04', end: '2025-01-25' }, { start: '2025-01-05', end: null }];
  const cohort = cohortMatrix(accounts, { from: '2025-01', to: '2025-02' })[0];
  assert.equal(cohort.size, 2);
  assert.equal(cohort.cells[0], 0.5);
  assert.equal(cohort.cells[1], 0.5);
  assert.equal(cohort.cells[2], null);
  assert.equal(mean([{ review: null }], 'review'), null);
});

test('Cross-filters intersect, and returning to All restores the full population', () => {
  for (const [id, key, value] of [['revenue-funnel', 'channel', 'organic_search'], ['customer-experience', 'state', 'SP'], ['credit-portfolio', 'grade', 'A'], ['saas-retention', 'plan', 'Starter']]) {
    const data = source(id);
    const selected = filterRows(data.rows, { [key]: value });
    assert.ok(selected.length > 0 && selected.length < data.rows.length);
    const months = data.rows.map(r => r.month).sort();
    const crossed = filterRows(data.rows, { [key]: value, from: months.at(-1), to: months.at(-1) });
    assert.ok(crossed.every(r => r[key] === value && r.month === months.at(-1)));
    assert.equal(filterRows(data.rows, { [key]: '' }).length, data.rows.length);
  }
});
