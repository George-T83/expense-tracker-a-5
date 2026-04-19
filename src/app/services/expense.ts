import { Injectable, signal, inject, effect } from '@angular/core';
import { environment } from '../../environments/environment';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { AuthService } from './auth';

export interface Expense {
  id?: string;
  userId: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  type: 'expense' | 'income';
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private auth = inject(AuthService);

  // Initialize Firebase using your environment file
  private app = initializeApp(environment.firebaseConfig);
  private db = getFirestore(this.app);

  // Signal holding the user's transactions
  expenses = signal<Expense[]>([]);

  constructor() {
    // Automatically load data when user logs in, clear it when they log out
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.loadExpenses(user.uid);
      } else {
        this.expenses.set([]);
      }
    });
  }

  private loadExpenses(userId: string) {
    const q = query(collection(this.db, 'transactions'), where('userId', '==', userId));

    onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Expense[];

      // Sort by newest first
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      this.expenses.set(data);
    });
  }

  async addExpense(expenseData: Omit<Expense, 'id' | 'userId'>) {
    const userId = this.auth.currentUser()?.uid;
    if (!userId) throw new Error('User not authenticated');

    await addDoc(collection(this.db, 'transactions'), {
      ...expenseData,
      userId,
    });
  }

  async deleteExpense(id: string) {
    const expenseRef = doc(this.db, 'transactions', id);
    await deleteDoc(expenseRef);
  }
}
