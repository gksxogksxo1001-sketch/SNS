import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth, db } from "@/core/firebase/config";
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs, limit } from "firebase/firestore";

export const AuthService = {
  // Email Signup
  async signUp(email: string, password: string, nickname: string, loginId: string) {
    console.log("[AuthService] Starting signUp for:", email);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("[AuthService] Auth user created:", user.uid);

      // Update Firebase Auth Profile
      await updateProfile(user, { displayName: nickname });
      console.log("[AuthService] Profile updated with nickname:", nickname);

      // Create User Document in Firestore
      console.log("[AuthService] Creating Firestore user document...");
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        loginId: loginId, // Add loginId
        nickname: nickname,
        avatarUrl: null,
        identityVerified: false,
        stats: {
          totalPosts: 0,
          totalCountries: 0,
          totalDistance: 0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log("[AuthService] Firestore user document created successfully.");

      return user;
    } catch (error: any) {
      console.error("[AuthService] Signup Error Trace:", error);
      throw this.handleError(error);
    }
  },

  // Email Login
  async signIn(email: string, password: string) {
    console.log("[AuthService] Starting signIn for:", email);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("[AuthService] Sign-in successful for:", userCredential.user.uid);
      return userCredential.user;
    } catch (error: any) {
      console.error("[AuthService] Sign-in Error Trace:", error);
      throw this.handleError(error);
    }
  },

  // ID Login
  async signInWithId(loginId: string, password: string) {
    console.log("[AuthService] Starting signInWithId for:", loginId);
    try {
      // Find email associated with loginId
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("loginId", "==", loginId), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("존재하지 않는 아이디입니다.");
      }

      const userDoc = querySnapshot.docs[0];
      const email = userDoc.data().email;

      return await this.signIn(email, password);
    } catch (error: any) {
      console.error("[AuthService] ID Sign-in Error:", error);
      throw error instanceof Error ? error : this.handleError(error);
    }
  },

  // Check ID Duplication
  async checkIdDuplication(loginId: string) {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("loginId", "==", loginId), limit(1));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty; // Returns true if duplicated
    } catch (error: any) {
      console.error("[AuthService] ID Check Error:", error);
      throw this.handleError(error);
    }
  },

  // Logout
  async logOut() {
    try {
      await signOut(auth);
      console.log("[AuthService] Logout successful.");
    } catch (error: any) {
      throw this.handleError(error);
    }
  },

  // Google Login
  async signInWithGoogle() {
    console.log("[AuthService] Starting Google signIn...");
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      console.log("[AuthService] Google user authorized:", user.uid);

      // Check if user exists in Firestore, if not create
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        console.log("[AuthService] Registering new Google user in Firestore...");
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          nickname: user.displayName || `user_${user.uid.slice(0, 5)}`,
          avatarUrl: user.photoURL,
          identityVerified: false,
          stats: {
            totalPosts: 0,
            totalCountries: 0,
            totalDistance: 0,
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        console.log("[AuthService] New Google user document created.");
      }

      return user;
    } catch (error: any) {
      console.error("[AuthService] Google Login Error Trace:", error);
      throw this.handleError(error);
    }
  },

  // Find ID by Email
  async findIdByEmail(email: string) {
    console.log("[AuthService] Finding loginId for email:", email);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("해당 이메일로 가입된 계정이 없습니다.");
      }

      const userDoc = querySnapshot.docs[0];
      return userDoc.data().loginId;
    } catch (error: any) {
      console.error("[AuthService] Find ID Error:", error);
      throw error instanceof Error ? error : this.handleError(error);
    }
  },

  // Send Password Reset Email (Custom handling for ID)
  async sendPasswordResetEmailById(loginId: string, email: string) {
    console.log("[AuthService] Initiating password reset for ID:", loginId);
    try {
      // First verify that the ID and Email match
      const usersRef = collection(db, "users");
      const q = query(usersRef, 
        where("loginId", "==", loginId), 
        where("email", "==", email), 
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("아이디와 이메일 정보가 일치하는 회원을 찾을 수 없습니다.");
      }

      // If match, use standard Firebase password reset
      await sendPasswordResetEmail(auth, email);
      console.log("[AuthService] Password reset email sent to:", email);
    } catch (error: any) {
      console.error("[AuthService] Password Reset Error:", error);
      throw error instanceof Error ? error : this.handleError(error);
    }
  },

  // Error Handler
  handleError(error: any) {
    const errorCode = error.code;
    const errorMessage = error.message;
    console.warn(`[AuthService] Processing error: ${errorCode} - ${errorMessage}`);
    
    switch (errorCode) {
      case "auth/email-already-in-use":
        return new Error("이미 사용 중인 이메일입니다.");
      case "auth/invalid-email":
        return new Error("유효하지 않은 이메일 형식입니다.");
      case "auth/weak-password":
        return new Error("비밀번호가 너무 취약합니다.");
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return new Error("이메일 또는 비밀번호가 일치하지 않습니다.");
      case "auth/configuration-not-found":
        return new Error("인증 설정 오류: Firebase 콘솔의 [Authentication] -> [Sign-in method]에서 '이메일/비밀번호' 로그인이 활성화되어 있는지 확인해주세요.");
      case "auth/operation-not-allowed":
        return new Error("Firebase 콘솔에서 해당 로그인 방식이 활성화되지 않았습니다.");
      case "auth/popup-closed-by-user":
        return new Error("로그인 팝업이 닫혔습니다.");
      default:
        // Return original error info for unknown cases to help debugging
        return new Error(`인증 오류 (${errorCode || 'unknown'}): ${errorMessage || '상세 정보 없음'}`);
    }
  }
};
