import { Injectable, signal, inject, effect } from '@angular/core';
import { environment } from '../../environments/environment';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  deleteDoc,
} from 'firebase/firestore';
import { AuthService } from './auth';

export interface Category {
  id?: string;
  name: string;
  type: 'expense' | 'income';
  color: string;
  icon?: string;
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
  private userUnsubscribe?: () => void;
  private categoriesUnsubscribe?: () => void;
  private userProfileData = signal<Omit<UserProfile, 'customCategories'> | null>(null);
  private customCategoriesData = signal<Category[]>([]);

  profile = signal<UserProfile | null>(null);

  defaultCategories: Category[] = [
    { name: 'Housing', type: 'expense', color: '#EF5350', icon: 'home' },
    { name: 'Food', type: 'expense', color: '#66BB6A', icon: 'restaurant' },
    { name: 'Transportation', type: 'expense', color: '#42A5F5', icon: 'directions_car' },
    { name: 'Utilities', type: 'expense', color: '#AB47BC', icon: 'bolt' },
    { name: 'Entertainment', type: 'expense', color: '#FFA726', icon: 'movie' },
    { name: 'Shopping', type: 'expense', color: '#26C6DA', icon: 'shopping_cart' },
    { name: 'Salary/Wages', type: 'income', color: '#8D6E63', icon: 'payments' },
    { name: 'Scholarships/Grants', type: 'income', color: '#78909C', icon: 'school' },
    { name: 'Investments', type: 'income', color: '#EC407A', icon: 'trending_up' },
    { name: 'Other', type: 'expense', color: '#B0BEC5', icon: 'label' },
  ];

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.loadOrCreateProfile(user.uid, user.email || '');
      } else {
        this.cleanupListeners();
        this.userProfileData.set(null);
        this.customCategoriesData.set([]);
        this.profile.set(null);
      }
    });
  }

  private cleanupListeners() {
    this.userUnsubscribe?.();
    this.userUnsubscribe = undefined;
    this.categoriesUnsubscribe?.();
    this.categoriesUnsubscribe = undefined;
  }

  private syncProfileSignal() {
    const userData = this.userProfileData();
    if (!userData) {
      this.profile.set(null);
      return;
    }

    this.profile.set({
      ...userData,
      customCategories: this.customCategoriesData(),
    });
  }

  private async loadOrCreateProfile(uid: string, email: string) {
    this.cleanupListeners();

    const docRef = doc(this.db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      await setDoc(docRef, {
        displayName: '',
        email: email,
        monthlyBudgets: { Food: 500, Entertainment: 200, Shopping: 300 },
      });
    }

    this.userUnsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<UserProfile>;
        this.userProfileData.set({
          displayName: data.displayName || '',
          email: data.email || email,
          monthlyBudgets: data.monthlyBudgets || {},
        });
        this.syncProfileSignal();
      }
    });

    const categoriesQuery = query(collection(this.db, 'categories'), where('uid', '==', uid));
    this.categoriesUnsubscribe = onSnapshot(categoriesQuery, (snapshot) => {
      const categories = snapshot.docs.map((catDoc) => {
        const data = catDoc.data() as Omit<Category, 'id'>;
        return {
          id: catDoc.id,
          ...data,
        };
      });

      this.customCategoriesData.set(categories);
      this.syncProfileSignal();
    });
  }

  async updateProfile(data: Partial<UserProfile>) {
    const uid = this.auth.currentUser()?.uid;
    if (!uid) throw new Error('User not authenticated');

    const { customCategories: _customCategories, ...profileData } = data;

    const docRef = doc(this.db, 'users', uid);
    await setDoc(docRef, profileData, { merge: true });
  }

  async addCustomCategory(category: Category) {
    const uid = this.auth.currentUser()?.uid;
    if (!uid) return;

    const { id: _id, ...categoryData } = category;
    const catRef = collection(this.db, 'categories');
    await addDoc(catRef, { ...categoryData, uid });
  }

  async deleteCustomCategory(categoryId: string) {
    const uid = this.auth.currentUser()?.uid;
    if (!uid) return;

    const catDocRef = doc(this.db, 'categories', categoryId);
    await deleteDoc(catDocRef);
  }
}
