import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
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
    MatDialogModule,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class DashboardComponent {
  authService = inject(AuthService);
  expenseService = inject(ExpenseService);
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

  averageTransaction = computed(() => {
    const expenses = this.expenseService.expenses().filter((e) => e.type === 'expense');
    return expenses.length ? this.totalSpent() / expenses.length : 0;
  });

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
