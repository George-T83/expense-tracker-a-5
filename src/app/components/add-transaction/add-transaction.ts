import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatRadioModule } from '@angular/material/radio';
import { ToastrService } from 'ngx-toastr';
import { ExpenseService } from '../../services/expense';
import { ProfileService } from '../../services/profile';

@Component({
  selector: 'app-add-transaction',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatRadioModule,
  ],
  templateUrl: './add-transaction.html',
  styleUrl: './add-transaction.css',
})
export class AddTransactionComponent implements OnInit {
  private fb = inject(FormBuilder);
  private expenseService = inject(ExpenseService);
  private dialogRef = inject(MatDialogRef<AddTransactionComponent>);
  private toastr = inject(ToastrService);
  private profileService = inject(ProfileService);

  private data = inject(MAT_DIALOG_DATA, { optional: true });

  expenseCategories = [
    'Housing',
    'Food',
    'Transportation',
    'Utilities',
    'Entertainment',
    'Shopping',
  ];
  incomeCategories = ['Salary/Wages', 'Scholarships/Grants', 'Investments', 'Other'];

  currentCategories = signal<string[]>([]);
  isEditMode = signal(false);

  expenseForm = this.fb.group({
    title: ['', Validators.required],
    amount: [null, [Validators.required, Validators.min(0.01)]],
    category: ['', Validators.required],
    date: [new Date(), Validators.required],
    type: ['expense', Validators.required],
    notes: [''],
  });

  ngOnInit() {
    if (this.data && this.data.expense) {
      this.isEditMode.set(true);
      const e = this.data.expense;

      // Load categories for the existing type first
      this.updateCategoryList(e.type);

      // Pre-fill the form
      this.expenseForm.patchValue({
        title: e.title,
        amount: e.amount,
        category: e.category,
        date: new Date(e.date),
        type: e.type,
        notes: e.notes || '',
      });
    } else {
      this.updateCategoryList('expense');
    }

    this.expenseForm.get('type')?.valueChanges.subscribe((type) => {
      this.updateCategoryList(type);
      this.expenseForm.get('category')?.setValue('');
    });
  }

  updateCategoryList(type: string | null) {
    const defaults = this.profileService.defaultCategories
      .filter((c) => c.type === type)
      .map((c) => c.name);

    const customs =
      this.profileService
        .profile()
        ?.customCategories.filter((c) => c.type === type)
        .map((c) => c.name) || [];

    this.currentCategories.set([...defaults, ...customs]);
  }

  async onSubmit() {
    if (this.expenseForm.valid) {
      const formValue = this.expenseForm.value;
      const newAmount = Number(formValue.amount);
      const category = formValue.category as string;
      const type = formValue.type as string;

      const userBudgets = this.profileService.profile()?.monthlyBudgets || {};

      // BUDGET ALERT LOGIC
      if (type === 'expense' && userBudgets[category]) {
        let currentCategoryTotal = this.expenseService
          .expenses()
          .filter((e) => e.category === category && e.type === 'expense')
          .reduce((sum, e) => sum + e.amount, 0);

        if (this.isEditMode() && this.data.expense.category === category) {
          currentCategoryTotal -= this.data.expense.amount;
        }

        const newTotal = currentCategoryTotal + newAmount;
        const limit = userBudgets[category];

        if (newTotal > limit) {
          this.toastr.error(
            `This puts you over your $${limit} budget!`,
            `${category} Limit Exceeded`,
          );
        } else if (newTotal >= limit * 0.8) {
          this.toastr.warning(
            `You are at ${((newTotal / limit) * 100).toFixed(0)}% of your limit!`,
            `${category} Budget Nearing`,
          );
        }
      }

      const expenseData = {
        title: formValue.title!,
        amount: newAmount,
        category: category,
        date: (formValue.date as Date).toISOString(),
        type: type as 'expense' | 'income',
        notes: formValue.notes || '',
      };

      try {
        if (this.isEditMode()) {
          // Update existing
          await this.expenseService.updateExpense(this.data.expense.id, expenseData);
          this.toastr.success('Transaction updated');
        } else {
          // Add new
          await this.expenseService.addExpense(expenseData);
        }
        this.dialogRef.close(true);
      } catch (error) {
        console.error('Error saving document: ', error);
        this.toastr.error('Failed to save transaction.', 'Error');
      }
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
