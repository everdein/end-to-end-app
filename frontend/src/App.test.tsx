import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockDispatch = vi.fn();
const mockFinancialsState = {
  snapshot: {
    payPeriodStart: '2026-06-12',
    payPeriodEnd: '2026-06-26',
    totalMonthlyExpenses: 4890.92,
    paidTotal: 1784.76,
    unpaidTotal: 3106.16,
    payPeriodTotal: 1901.58,
    totalTrackedAssets: 313378.99,
    assetCategories: [
      {
        key: 'retirement',
        label: 'Retirement',
        total: 246133.89,
        accounts: [
          {
            account: '401k 10%',
            company: 'Vanguard',
            amount: 110653.42,
          },
        ],
      },
      {
        key: 'investments',
        label: 'Investments',
        total: 39658.11,
        accounts: [],
      },
    ],
    bills: [
      {
        id: 1,
        bill: 'Rent',
        dueDay: 1,
        dueLabel: '1st',
        dueDate: '2026-06-01',
        amount: 2600,
        account: 'Check',
        paid: true,
        inPayPeriod: false,
      },
    ],
  },
  status: 'succeeded',
  saving: false,
  error: null,
};

vi.mock('./app/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: vi.fn(() => mockFinancialsState),
}));

import App from './App';

describe('App', () => {
  it('renders the monthly expenses feature', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /financials/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /monthly withdrawals/i })).toBeInTheDocument();
    expect(screen.getByText(/^Tracked assets$/i)).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /retirement/i })).toBeInTheDocument();
  });
});
