import React from 'react';
import { test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Dashboard from '../src/pages/Dashboard.jsx';

// Interaction tests isolate the route/filter/table layer. Actual browser chart
// rendering remains a separate visual check, not something these mocks claim.
vi.mock('../src/components/Charts.jsx', () => ({
  ChartCard: ({ title, children }) => <section><h2>{title}</h2>{children}</section>,
  TrendChart: ({ data }) => <div data-testid="trend-count">{data.length}</div>,
  ComparisonChart: ({ data }) => <div>{data.length} comparison segments</div>,
  DonutChart: ({ data }) => <div>{data.length} composition segments</div>,
}));
afterEach(cleanup);
function open(id, query = '') {
  return render(<MemoryRouter initialEntries={[`/dashboard/${id}${query}`]}><Routes><Route path="/dashboard/:projectId" element={<Dashboard />} /></Routes></MemoryRouter>);
}
const kpiValue = index => document.querySelectorAll('.kpi-card>strong')[index].textContent;

test('All four dashboard routes load their published source populations', async () => {
  for (const [id, value] of [['revenue-funnel', '8,000'], ['customer-experience', '99,441'], ['credit-portfolio', '$434.81M'], ['saas-retention', 'CU 1.39M']]) {
    open(id);
    await screen.findByRole('tab', { name: 'Overview' });
    expect(kpiValue(0)).toBe(value);
    expect(screen.getAllByTestId('trend-count').every(node => node.textContent !== '0')).toBe(true);
    cleanup();
  }
});

test('Channel selection changes rendered counts, dates narrow history, reset restores All', async () => {
  open('revenue-funnel');
  await screen.findByRole('tab', { name: 'Overview' });
  const all = kpiValue(0);
  fireEvent.change(screen.getByRole('combobox', { name: 'Acquisition channel' }), { target: { value: 'organic_search' } });
  expect(kpiValue(0)).not.toBe(all);
  fireEvent.change(screen.getByLabelText('From month'), { target: { value: '2018-05' } });
  expect(Number(screen.getByTestId('trend-count').textContent)).toBe(1);
  fireEvent.click(screen.getByTitle('Reset all dashboard filters'));
  expect(kpiValue(0)).toBe(all);
  expect(screen.getByRole('combobox', { name: 'Acquisition channel' }).value).toBe('');
});

test('State/category/status filters intersect and empty selections have an explicit reset', async () => {
  open('customer-experience');
  await screen.findByRole('tab', { name: 'Overview' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Customer state' }), { target: { value: 'SP' } });
  expect(kpiValue(0)).not.toBe('99,441');
  fireEvent.change(screen.getByRole('combobox', { name: 'Product category' }), { target: { value: 'bed_bath_table' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Order status' }), { target: { value: 'delivered' } });
  expect(kpiValue(0)).not.toBe('99,441');
  fireEvent.change(screen.getByLabelText('From month'), { target: { value: '2099-01' } });
  expect(screen.getByText('Start month is after end month.')).toBeTruthy();
});

test('SaaS dates change balances and cohorts use observed acquisition months', async () => {
  open('saas-retention');
  await screen.findByRole('tab', { name: 'Overview' });
  fireEvent.change(screen.getByLabelText('To month'), { target: { value: '2024-12' } });
  expect(kpiValue(0)).not.toBe('CU 1.39M');
  fireEvent.change(screen.getByRole('combobox', { name: 'Subscription plan' }), { target: { value: 'Starter' } });
  fireEvent.click(screen.getByRole('tab', { name: 'Cohorts & segments' }));
  const cells = document.querySelectorAll('.cohort-cell');
  expect(cells.length).toBeGreaterThan(0);
  expect(document.querySelectorAll('.unobserved').length).toBeGreaterThan(0);
});

test('Loan deep dive, record search, sorting, pagination and source dialog work', async () => {
  open('credit-portfolio');
  await screen.findByRole('tab', { name: 'Overview' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Credit grade' }), { target: { value: 'A' } });
  fireEvent.click(screen.getByRole('tab', { name: 'Segment deep dive' }));
  expect(screen.getByRole('heading', { name: 'Grade-level risk–return comparison' })).toBeTruthy();
  fireEvent.click(screen.getByRole('tab', { name: /Source records/ }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Search source records' }), { target: { value: 'debt_consolidation' } });
  const count = document.querySelectorAll('tbody tr').length;
  expect(count).toBe(15);
  fireEvent.click(screen.getByRole('button', { name: 'Sort by Funded' }));
  const first = document.querySelector('tbody tr td:first-child').textContent;
  fireEvent.click(screen.getByRole('button', { name: 'Next table page' }));
  expect(document.querySelector('tbody tr td:first-child').textContent).not.toBe(first);
  fireEvent.click(screen.getByRole('button', { name: 'Data & definitions' }));
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(screen.getByText('Behind the numbers')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Close source details' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('Unknown project routes and malformed date parameters fail gracefully', async () => {
  open('unknown');
  expect(screen.getByText('This project could not be found.')).toBeTruthy();
  cleanup();
  open('saas-retention', '?to=not-a-date');
  await screen.findByRole('tab', { name: 'Overview' });
  expect(kpiValue(0)).toBe('CU 1.39M');
});
