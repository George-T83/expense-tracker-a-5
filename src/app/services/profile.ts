import { Injectable, signal, inject, effect } from '@angular/core';
import { environment } from '../../environments/environment';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { AuthService } from './auth';

export interface Category {
  name: string;
  type: 'expense' | 'income';
  color: string;
}

export interface UserProfile {
  displayName: string;
  email: string;
  monthlyBudgets: Record<string, number>;
  customCategories: Category[];
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private auth = inject(AuthService);
  private app = initializeApp(environment.firebaseConfig);
  private db = getFirestore(this.app);

  profile = signal<UserProfile | null>(null);

  defaultCategories: Category[] = [
    { name: 'Housing', type: 'expense', color: '#EF5350' },
    { name: 'Food', type: 'expense', color: '#66BB6A' },
    { name: 'Transportation', type: 'expense', color: '#42A5F5' },
    { name: 'Utilities', type: 'expense', color: '#AB47BC' },
    { name: 'Entertainment', type: 'expense', color: '#FFA726' },
    { name: 'Shopping', type: 'expense', color: '#26C6DA' },
    { name: 'Salary/Wages', type: 'income', color: '#8D6E63' },
    { name: 'Scholarships/Grants', type: 'income', color: '#78909C' },
    { name: 'Investments', type: 'income', color: '#EC407A' },
    { name: 'Other', type: 'expense', color: '#B0BEC5' },
  ];

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.loadOrCreateProfile(user.uid, user.email || '');
      } else {
        this.profile.set(null);
      }
    });
  }

  private async loadOrCreateProfile(uid: string, email: string) {
    const docRef = doc(this.db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      await setDoc(docRef, {
        displayName: '',
        email: email,
        monthlyBudgets: { Food: 500, Entertainment: 200, Shopping: 300 },
        customCategories: [],
      });
    }

    onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        this.profile.set(doc.data() as UserProfile);
      }
    });
  }

  async updateProfile(data: Partial<UserProfile>) {
    const uid = this.auth.currentUser()?.uid;
    if (!uid) throw new Error('User not authenticated');

    const docRef = doc(this.db, 'users', uid);
    await setDoc(docRef, data, { merge: true });
  }
}
