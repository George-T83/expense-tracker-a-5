import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
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

  // Hardcoded budget limits for the assignment requirement
  budgetLimits: Record<string, number> = {
    Food: 500,
    Entertainment: 200,
    Shopping: 300,
  };

  expenseForm = this.fb.group({
    title: ['', Validators.required],
    amount: [null, [Validators.required, Validators.min(0.01)]],
    category: ['', Validators.required],
    date: [new Date(), Validators.required],
    type: ['expense', Validators.required],
    notes: [''],
  });

  ngOnInit() {
    // Initial load for default 'expense' type
    this.updateCategoryList('expense');

    // Dynamically switch dropdown options when the radio button changes
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

      // PULL LIVE BUDGETS FROM FIRESTORE PROFILE
      const userBudgets = this.profileService.profile()?.monthlyBudgets || {};

      // BUDGET ALERT LOGIC
      if (type === 'expense' && userBudgets[category]) {
        const currentCategoryTotal = this.expenseService
          .expenses()
          .filter((e) => e.category === category && e.type === 'expense')
          .reduce((sum, e) => sum + e.amount, 0);

        if (currentCategoryTotal + newAmount > userBudgets[category]) {
          this.toastr.error(
            `This puts you over your $${userBudgets[category]} budget!`,
            `${category} Limit Exceeded`,
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
        await this.expenseService.addExpense(expenseData);
        this.dialogRef.close(true);
      } catch (error) {
        console.error('Error adding document: ', error);
        this.toastr.error('Failed to add transaction.', 'Error');
      }
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
