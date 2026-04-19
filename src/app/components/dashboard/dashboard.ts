import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { AuthService } from '../../services/auth';
import { ExpenseService } from '../../services/expense';
import { AddTransactionComponent } from '../add-transaction/add-transaction';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    BaseChartDirective,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    MatDialogModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent {
  authService = inject(AuthService);
  expenseService = inject(ExpenseService);
  toastr = inject(ToastrService);
  dialog = inject(MatDialog);

  // Computed signals for summary cards
  totalSpent = computed(() => {
    return this.expenseService
      .expenses()
      .filter((e) => e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0);
  });

  highestExpense = computed(() => {
    const expenses = this.expenseService.expenses().filter((e) => e.type === 'expense');
    return expenses.length ? Math.max(...expenses.map((e) => e.amount)) : 0;
  });

  averageExpense = computed(() => {
    const expenses = this.expenseService.expenses().filter((e) => e.type === 'expense');
    return expenses.length ? this.totalSpent() / expenses.length : 0;
  });

  averageIncome = computed(() => {
    const incomes = this.expenseService.expenses().filter((e) => e.type === 'income');
    return incomes.length ? incomes.reduce((sum, e) => sum + e.amount, 0) / incomes.length : 0;
  });

  // --- FILTER SIGNALS ---
  searchTerm = signal<string>('');
  minAmount = signal<number | null>(null);
  maxAmount = signal<number | null>(null);
  startDate = signal<Date | null>(null);
  endDate = signal<Date | null>(null);

  availableCategories = signal<string[]>([
    'Housing',
    'Food',
    'Transportation',
    'Utilities',
    'Entertainment',
    'Shopping',
    'Salary/Wages',
    'Scholarships/Grants',
    'Investments',
    'Other',
  ]);
  selectedCategories = signal<string[]>([]);

  // --- COMPUTED FILTERED DATA ---
  filteredExpenses = computed(() => {
    let data = this.expenseService.expenses();

    // 1. Text Search (Title only, leaving room for Notes later)
    const term = this.searchTerm().toLowerCase();
    if (term) {
      data = data.filter(
        (e) =>
          e.title.toLowerCase().includes(term) || (e.notes && e.notes.toLowerCase().includes(term)),
      );
    }

    // 2. Multi-Select Category Filter
    const cats = this.selectedCategories();
    if (cats.length > 0) {
      data = data.filter((e) => cats.includes(e.category));
    }

    // 3. Amount Filters
    const min = this.minAmount();
    if (min !== null) data = data.filter((e) => e.amount >= min);

    const max = this.maxAmount();
    if (max !== null) data = data.filter((e) => e.amount <= max);

    // 4. Date Range Filters
    const start = this.startDate();
    if (start) {
      start.setHours(0, 0, 0, 0);
      data = data.filter((e) => new Date(e.date) >= start);
    }

    const end = this.endDate();
    if (end) {
      end.setHours(23, 59, 59, 999);
      data = data.filter((e) => new Date(e.date) <= end);
    }

    return data;
  });

  clearFilters() {
    this.searchTerm.set('');
    this.selectedCategories.set([]);
    this.minAmount.set(null);
    this.maxAmount.set(null);
    this.startDate.set(null);
    this.endDate.set(null);
  }

  // Chart configuration
  public pieChartType: ChartType = 'pie';
  public pieChartData = computed<ChartData<'pie', number[], string | string[]>>(() => {
    const expenses = this.expenseService.expenses().filter((e) => e.type === 'expense');
    const categoryTotals: Record<string, number> = {};

    expenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    return {
      labels: Object.keys(categoryTotals),
      datasets: [
        {
          data: Object.values(categoryTotals),
          backgroundColor: ['#42A5F5', '#66BB6A', '#FFA726', '#AB47BC', '#EF5350'],
        },
      ],
    };
  });

  public pieChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
    },
  };

  // --- BAR CHART CONFIGURATION ---
  public barChartType: ChartType = 'bar';
  public barChartData = computed<ChartData<'bar'>>(() => {
    // We use the raw expense array here so the chart always shows the grand total,
    // regardless of what the user is searching for in the table.
    const allTransactions = this.expenseService.expenses();

    const totalIncome = allTransactions
      .filter((e) => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalExpense = allTransactions
      .filter((e) => e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      labels: ['Overall Cash Flow'], // A single group label on the X-axis
      datasets: [
        {
          data: [totalIncome],
          label: 'Income',
          backgroundColor: '#66BB6A', // Green
          borderRadius: 6,
        },
        {
          data: [totalExpense],
          label: 'Expense',
          backgroundColor: '#EF5350', // Red
          borderRadius: 6,
        },
      ],
    };
  });

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  logout() {
    this.authService.logout();
  }

  deleteTransaction(id: string) {
    if (confirm('Are you sure you want to delete this transaction?')) {
      this.expenseService.deleteExpense(id);
    }
  }

  openAddTransactionDialog() {
    this.dialog.open(AddTransactionComponent, {
      width: '450px',
      disableClose: true, // Forces user to click cancel or save
    });
  }
}
