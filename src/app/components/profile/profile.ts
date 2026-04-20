import { Component, inject, effect, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { RouterModule } from '@angular/router';
import { ProfileService, Category } from '../../services/profile';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatRadioModule,
    RouterModule,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfileComponent {
  private fb = inject(FormBuilder);
  private profileService = inject(ProfileService);
  private toastr = inject(ToastrService);

  displayName = signal('');
  userEmail = signal('');
  customCategories = computed(() => this.profileService.profile()?.customCategories || []);
  monthlyBudgets = signal<Record<string, number>>({});

  defaultCategories = this.profileService.defaultCategories;

  newCategoryName = signal('');
  newCategoryType = signal<'expense' | 'income'>('expense');
  newCategoryColor = signal('#1976d2');

  constructor() {
    effect(() => {
      const p = this.profileService.profile();
      if (p) {
        this.displayName.set(p.displayName || '');
        this.userEmail.set(p.email || '');
        this.monthlyBudgets.set({ ...(p.monthlyBudgets || {}) });
      }
    });
  }

  async addCategory() {
    const name = this.newCategoryName().trim();
    if (!name) return;

    const current = this.customCategories();
    const defaults = this.profileService.defaultCategories;

    if (
      current.some((c) => c.name.toLowerCase() === name.toLowerCase()) ||
      defaults.some((c) => c.name.toLowerCase() === name.toLowerCase())
    ) {
      this.toastr.warning('This category already exists.');
      return;
    }

    const newCat: Category = {
      name: name,
      type: this.newCategoryType(),
      color: this.newCategoryColor(),
      icon: this.newCategoryIcon(),
    };

    try {
      await this.profileService.addCustomCategory(newCat);
      this.toastr.success('Custom category added.', 'Saved');
    } catch (error) {
      console.error(error);
      this.toastr.error('Failed to add category.');
      return;
    }

    // Reset form
    this.newCategoryName.set('');
    this.newCategoryType.set('expense');
    this.newCategoryColor.set('#1976d2');
    this.newCategoryIcon.set('label');
  }

  async removeCategory(category: Category) {
    if (!category.id) {
      this.toastr.error('This category cannot be deleted because it has no ID.');
      return;
    }

    try {
      await this.profileService.deleteCustomCategory(category.id);
    } catch (error) {
      console.error(error);
      this.toastr.error('Failed to remove category.');
      return;
    }

    const currentBudgets = this.monthlyBudgets();
    if (currentBudgets[category.name]) {
      const updated = { ...currentBudgets };
      delete updated[category.name];
      this.monthlyBudgets.set(updated);
    }
  }

  // Calculates perceived brightness to return dark or light text
  getTextColor(hexColor: string): string {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#1e293b' : '#ffffff';
  }

  // UPDATED: Only return Expense categories for the budget loop
  getExpenseCategories(): string[] {
    const defaultExpenses = this.profileService.defaultCategories
      .filter((c) => c.type === 'expense')
      .map((c) => c.name);

    const customExpenses = this.customCategories()
      .filter((c) => c.type === 'expense')
      .map((c) => c.name);

    return [...defaultExpenses, ...customExpenses];
  }

  updateBudget(cat: string, amount: string) {
    const value = parseFloat(amount);
    const updated = { ...this.monthlyBudgets() };

    if (isNaN(value) || value <= 0) {
      delete updated[cat];
    } else {
      updated[cat] = value;
    }

    this.monthlyBudgets.set(updated);
  }

  formatIconLabel(iconName: string): string {
    return iconName.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  async saveProfile() {
    try {
      await this.profileService.updateProfile({
        displayName: this.displayName(),
        monthlyBudgets: this.monthlyBudgets(),
      });
      this.toastr.success('Profile and budgets updated successfully!', 'Saved');
    } catch (error) {
      console.error(error);
      this.toastr.error('Failed to save profile.');
    }
  }
}
