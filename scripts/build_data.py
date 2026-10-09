"""Build anonymous browser snapshots from the four pinned analytics repositories.

No metrics are invented. Rows retain the natural analytical grain; keys used only
to join public source tables are discarded after the joins. Run data:build after
cloning the source repos next to the portfolio (see README.md).
"""
import argparse
import csv
import gzip
import hashlib
import json
import subprocess
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    opener = gzip.open if path.suffix == '.gz' else open
    with opener(path, 'rt', encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream))


def number(value, precision=6):
    if value in ('', None):
        return None
    v = float(value)
    return int(v) if v.is_integer() else round(v, precision)


def integer(value):
    return int(float(value or 0))


def pack(columns, rows):
    return {'columns': columns, 'rows': [[r.get(c) for c in columns] for r in rows]}


def provenance(repo, paths, label, classification):
    commit = subprocess.check_output(['git', '-C', str(repo), 'rev-parse', 'HEAD'], text=True).strip()
    return {
        'label': label, 'classification': classification,
        'repository': f'https://github.com/satya20000/{repo.name}', 'commit': commit,
        'files': [{'path': p, 'sha256': hashlib.sha256((repo / p).read_bytes()).hexdigest(),
                   'url': f'https://github.com/satya20000/{repo.name}/blob/{commit}/{p}'} for p in paths],
    }


def funnel(sources):
    repo = sources / 'ecomrevenuefunnel'
    source = read(repo / '02_Cleaned_Data/fact_lead.csv')
    rows = []
    for i, r in enumerate(source):
        rows.append({'record': i + 1, 'month': r['lead_month'], 'channel': r['origin'] or 'unknown',
                     'segment': r['business_segment'] or 'Unknown / not won', 'state': r['seller_state'] or 'Unknown',
                     'converted': integer(r['converted']), 'active': integer(r['active']),
                     'repeat': integer(r['repeat_seller']), 'orders': integer(r['orders']),
                     'gmv': number(r['gmv']), 'closeDays': number(r['close_days']),
                     'activationDays': number(r['close_to_first_sale_days'])})
    return {
        'id': 'revenue-funnel', 'unit': 'BRL', 'grain': 'One marketing qualified lead',
        'source': provenance(repo, ['02_Cleaned_Data/fact_lead.csv'], 'Olist marketing funnel + marketplace', 'Historical public data'),
        'notes': ['GMV is attributed delivered item value, not Olist revenue. Freight and platform fees are excluded.',
                  'Date filters select lead acquisition cohorts. Subsequent observed GMV stays attributed to those cohorts.',
                  'Business segment is available only for won leads. Segment-specific conversion excludes the original lost-lead population.',
                  'Recent cohorts have shorter observation windows. Channel comparisons do not establish ROI or causality.'],
        'definitions': {'Conversion': 'Won leads / all selected leads.', 'Activation': 'Active sellers / selected won leads.',
                        'GMV': 'Sum of delivered item prices on orders purchased on or after seller win date.',
                        'Repeat sellers': 'Selected active sellers with at least two attributed seller-order pairs.'},
        **pack(list(rows[0]), rows),
    }


def experience(sources):
    repo = sources / 'customexp'
    path = repo / '02_Cleaned_Data/fact_order.csv'
    if not path.exists():
        subprocess.run(['python3', str(repo / '04_Python/restore_data.py')], check=True)
    bridge = read(repo / '02_Cleaned_Data/bridge_order_seller_category.csv')
    categories = defaultdict(set)
    for r in bridge:
        categories[r['order_id']].add(r['category'] or 'unknown')
    rows = []
    for i, r in enumerate(read(path)):
        rows.append({'record': i + 1, 'month': r['purchase_month'], 'state': r['customer_state'],
                     'status': r['order_status'], 'review': number(r['review_score']),
                     'eligible': integer(r['eligible_delivery']), 'late': number(r['late']),
                     'processing': number(r['processing_days']), 'shipping': number(r['shipping_days']),
                     'delivery': number(r['delivery_days']), 'gmv': number(r['gmv']), 'freight': number(r['freight']),
                     'categories': sorted(categories.get(r['order_id'], {'unknown'}))})
    return {
        'id': 'customer-experience', 'unit': 'BRL', 'grain': 'One order, with distinct category membership',
        'source': provenance(repo, ['02_Cleaned_Data/fact_order.csv.gz.part001', '02_Cleaned_Data/fact_order.csv.gz.part002', '02_Cleaned_Data/bridge_order_seller_category.csv'],
                             'Olist Brazilian e-commerce', 'Historical public data'),
        'notes': ['Late delivery means actual delivery calendar date is later than the promised calendar date.',
                  'Only orders with eligible delivery timestamps enter the late-rate denominator.',
                  'Category filters include each matching order once. Multi-category orders can appear in multiple category comparisons; those rows are not additive.',
                  'Stage duration means use their own valid timestamp samples. Poor reviews and delays are associated, not proven causal.'],
        'definitions': {'On-time delivery': '(Eligible deliveries − late deliveries) / eligible deliveries.',
                        'Review score': 'Average selected latest review per order; missing reviews remain excluded.',
                        'Delivery time': 'Mean valid elapsed days from purchase to customer delivery.',
                        'Low reviews': 'Orders with a selected review of 1 or 2, divided by reviewed orders.'},
        **pack(list(rows[0]), rows),
    }


def lending(sources):
    repo = sources / 'lenden'
    rows = []
    for i, r in enumerate(read(repo / '02_Cleaned_Data/fact_loan.csv')):
        rows.append({'record': i + 1, 'month': r['issue_month'], 'grade': r['grade'], 'term': r['term_months'],
                     'purpose': r['purpose'], 'home': r['home_ownership'], 'status': r['loan_status'],
                     'dtiBand': r['dti_band'], 'funded': number(r['funded_amnt']), 'interest': number(r['int_rate']),
                     'resolved': integer(r['resolved']), 'default': integer(r['default_flag']),
                     'netCash': number(r['net_cash']), 'recoveries': number(r['recoveries'])})
    return {
        'id': 'credit-portfolio', 'unit': 'USD', 'grain': 'One accepted loan',
        'source': provenance(repo, ['02_Cleaned_Data/fact_loan.csv'], 'LendingClub accepted loans, 2007–2011 release', 'Historical public data'),
        'notes': ['The historical source release contains 39,717 accepted loans, originated in 2007–2011.',
                  'Unresolved current loans are excluded from default and return denominators.',
                  'Net cash return is cumulative and funding-weighted; it is not annualized IRR. Fees, tax and cash-flow timing are unavailable.',
                  'This release does not contain origination FICO. No credit-score values are inferred.'],
        'definitions': {'Default rate': 'Charged-off/default loans / resolved loans.',
                        'Net cash return': 'Sum of total payments − collection recovery fees − funded principal, divided by resolved funded principal.',
                        'Funded principal': 'Sum of funded_amnt across the selected loans.',
                        'Average coupon': 'Unweighted mean loan interest rate.'},
        **pack(list(rows[0]), rows),
    }


def saas(sources):
    repo = sources / 'churnanalysis'
    paths = ['data/processed/customer_analytics.csv', 'data/processed/subscription_monthly_snapshot.csv.gz',
             'data/processed/billing_risk_accounts.csv']
    accounts = read(repo / paths[0])
    by_id = {r['account_id']: r for r in accounts}
    measures = {'beginning': 'beginning_customers', 'active': 'active_customers', 'new': 'new_customers',
                'churned': 'churned_customers', 'beginMRR': 'beginning_mrr', 'mrr': 'active_mrr',
                'newMRR': 'new_mrr', 'churnMRR': 'churned_mrr', 'riskMRR': 'mrr_at_risk', 'riskAccounts': 'risk_accounts'}
    groups = defaultdict(lambda: defaultdict(float))
    for r in read(repo / paths[1]):
        account = by_id[r['account_id']]
        key = (r['month_start'][:7], account['plan_name'], account['region'], account['segment'], account['acquisition_channel'])
        for name, source in measures.items():
            groups[key][name] += float(r[source] or 0)
    cols = ['month', 'plan', 'region', 'segment', 'channel']
    rows = []
    for key, values in sorted(groups.items()):
        rows.append({**dict(zip(cols, key)), **{k: number(v) for k, v in values.items()}})
    risk = {r['account_id']: r for r in read(repo / paths[2])}
    detail = []
    for i, r in enumerate(accounts):
        q = risk.get(r['account_id'], {})
        detail.append({'record': i + 1, 'plan': r['plan_name'], 'region': r['region'], 'segment': r['segment'],
                       'channel': r['acquisition_channel'], 'start': r['started_at'], 'end': r['ended_at'] or None,
                       'mrr': number(r['mrr']), 'risk': integer(q.get('risk_flag', 0)),
                       'overdue': number(q.get('overdue_value', 0)), 'failures': integer(q.get('failed_30d', 0))})
    return {
        'id': 'saas-retention', 'unit': 'CU', 'grain': 'Month × plan × region × segment × channel; account-level cohort detail',
        'source': provenance(repo, paths, 'Analytics Engineering SaaS subscriptions v1.0.0', 'Synthetic educational data · CC BY 4.0'),
        'notes': ['Synthetic educational data. Monetary unit CU means currency unspecified; these are not industry benchmarks.',
                  'MRR and active customers are the ending balance of the latest selected month; balances are never summed over time.',
                  'Logo churn = summed cancellations / summed beginning customer exposures in the selected period.',
                  'GRR is a cancellation-only proxy. Expansion, contraction and true NRR are not available.',
                  'No new starts occur after October 2025; December non-void invoices are all open. Billing-risk account detail is fixed at 31 December 2025.',
                  'Cohorts are formed from selected acquisition months and observed through the selected end month. Unobserved ages remain blank.'],
        'definitions': {'MRR': 'Contracted monthly revenue active at the end of the latest selected month.', 'ARR': '12 × ending MRR, a run rate.',
                        'Logo churn': 'Selected cancellations / selected beginning customer exposures.',
                        'Gross revenue retention': '1 − selected cancelled MRR / selected beginning MRR; cancellation-only proxy.',
                        'MRR at risk': 'Active month-end MRR with recent failed or retried payments or a mature unpaid invoice, counted once per account.',
                        'Cohort retention': 'Accounts still active at the observed age month-end / original cohort size.'},
        **pack(list(rows[0]), rows), 'accounts': pack(list(detail[0]), detail),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--sources', type=Path, required=True)
    args = parser.parse_args()
    target = ROOT / 'public/data'
    target.mkdir(parents=True, exist_ok=True)
    summary = []
    previews = {}
    for builder in (funnel, experience, lending, saas):
        data = builder(args.sources.resolve())
        data['preparedAt'] = datetime.now(timezone.utc).isoformat()
        text = json.dumps(data, separators=(',', ':'), ensure_ascii=False, allow_nan=False)
        p = target / (data['id'] + '.json')
        p.write_text(text, encoding='utf-8')
        summary.append({'id': data['id'], 'rows': len(data['rows']), 'bytes': p.stat().st_size,
                        'source': data['source'], 'grain': data['grain']})
        totals = defaultdict(float)
        month_index = data['columns'].index('month')
        value_key = {'revenue-funnel': None, 'customer-experience': None, 'credit-portfolio': 'funded', 'saas-retention': 'mrr'}[data['id']]
        value_index = data['columns'].index(value_key) if value_key else None
        for row in data['rows']:
            totals[row[month_index]] += row[value_index] if value_key else 1
        previews[data['id']] = [{'month': k, 'value': round(v, 2)} for k, v in sorted(totals.items())]
        print(data['id'], len(data['rows']), p.stat().st_size)
    (target / 'manifest.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    (ROOT / 'src/lib/previews.json').write_text(json.dumps(previews, separators=(',', ':')), encoding='utf-8')


if __name__ == '__main__':
    main()
