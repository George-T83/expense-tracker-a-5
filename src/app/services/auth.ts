import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private router = inject(Router);

  // Initialize Firebase using your environment file
  private app = initializeApp(environment.firebaseConfig);
  private auth = getAuth(this.app);

  // Track the current user
  currentUser = signal<User | null>(null);

  constructor() {
    // Listen for login/logout events and update the signal automatically
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser.set(user);
    });
  }

  // --- EMAIL & PASSWORD ---
  async registerWithEmail(email: string, pass: string) {
    try {
      await createUserWithEmailAndPassword(this.auth, email, pass);
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Registration Error', error);
      throw error;
    }
  }

  async loginWithEmail(email: string, pass: string) {
    try {
      await signInWithEmailAndPassword(this.auth, email, pass);
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Login Error', error);
      throw error;
    }
  }

  // --- GOOGLE OAUTH ---
  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(this.auth, provider);
      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Google Auth Error', error);
      throw error;
    }
  }

  waitForAuth(): Promise<boolean> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(this.auth, (user) => {
        unsubscribe(); // Detach immediately after getting the answer
        resolve(!!user); // Returns true if user exists, false if null
      });
    });
  }

  // --- LOGOUT ---
  async logout() {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }
}
