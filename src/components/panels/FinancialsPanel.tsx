'use client';

import { useState } from 'react';
import { useFinancials } from '@/hooks/useFinancials';
import { formatMarketCap } from '@/lib/formatters';
import Spinner from '@/components/ui/Spinner';

const STATEMENT_TABS = [
  { label: 'Income', key: 'income' },
  { label: 'Balance', key: 'balance' },
  { label: 'Cash Flow', key: 'cashflow' },
] as const;

const INCOME_FIELDS: [string, string][] = [
  ['totalRevenue', 'Revenue'],
  ['costOfRevenue', 'Cost of Revenue'],
  ['grossProfit', 'Gross Profit'],
  ['totalOperatingExpenses', 'Operating Expenses'],
  ['operatingIncome', 'Operating Income'],
  ['ebit', 'EBIT'],
  ['interestExpense', 'Interest Expense'],
  ['incomeBeforeTax', 'Income Before Tax'],
  ['incomeTaxExpense', 'Income Tax'],
  ['netIncome', 'Net Income'],
];

const BALANCE_FIELDS: [string, string][] = [
  ['cash', 'Cash'],
  ['shortTermInvestments', 'Short-term Investments'],
  ['netReceivables', 'Receivables'],
  ['inventory', 'Inventory'],
  ['totalCurrentAssets', 'Current Assets'],
  ['totalAssets', 'Total Assets'],
  ['totalCurrentLiabilities', 'Current Liabilities'],
  ['longTermDebt', 'Long-term Debt'],
  ['totalLiab', 'Total Liabilities'],
  ['totalStockholderEquity', 'Stockholder Equity'],
];

const CASHFLOW_FIELDS: [string, string][] = [
  ['totalCashFromOperatingActivities', 'Operating CF'],
  ['totalCashflowsFromInvestingActivities', 'Investing CF'],
  ['totalCashFromFinancingActivities', 'Financing CF'],
  ['capitalExpenditures', 'CapEx'],
  ['freeCashFlow', 'Free Cash Flow'],
  ['changeInCash', 'Change in Cash'],
];

const FIELD_MAP: Record<string, [string, string][]> = {
  income: INCOME_FIELDS,
  balance: BALANCE_FIELDS,
  cashflow: CASHFLOW_FIELDS,
};

export default function FinancialsPanel({ symbol }: { symbol: string }) {
  const { data, loading } = useFinancials(symbol);
  const [tab, setTab] = useState(0);
  const [quarterly, setQuarterly] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="sm" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
        No financial data
      </div>
    );
  }

  const stmtKey = STATEMENT_TABS[tab].key;
  const statements = data[stmtKey as keyof typeof data];
  const rows = quarterly ? statements.quarterly : statements.annual;
  const fields = FIELD_MAP[stmtKey];

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center border-b border-terminal-border">
        <div className="flex flex-1">
          {STATEMENT_TABS.map((t, i) => (
            <button
              key={t.key}
              onClick={() => setTab(i)}
              className={`px-3 py-1.5 text-xxs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                i === tab
                  ? 'text-text-primary border-b border-cyan'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setQuarterly(!quarterly)}
          className="px-3 py-1.5 text-xxs font-mono text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          {quarterly ? 'QTR' : 'ANN'}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-text-muted text-sm font-mono">
          No data available
        </div>
      ) : (
        <div className="flex-1 overflow-auto" data-scrollable>
          <table className="w-full">
            <thead>
              <tr className="text-xxs text-text-muted font-mono uppercase sticky top-0 bg-terminal-panel">
                <th className="text-left px-3 py-1.5 min-w-[120px]">Item</th>
                {rows.map((r) => (
                  <th key={r.date} className="text-right px-3 py-1.5 whitespace-nowrap">
                    {r.date}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map(([key, label]) => (
                <tr key={key} className="border-b border-terminal-border hover:bg-terminal-hover transition-colors">
                  <td className="px-3 py-1.5 text-data font-mono text-text-secondary whitespace-nowrap">
                    {label}
                  </td>
                  {rows.map((r) => {
                    const val = r[key];
                    return (
                      <td key={r.date} className="text-right px-3 py-1.5 text-data font-mono text-text-primary whitespace-nowrap">
                        {typeof val === 'number' ? formatMarketCap(val) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
