import { NextResponse } from "next/server";
import { db } from "@/core/firebase/config";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import * as admin from "firebase-admin";

// Helper function to initialize Firebase Admin
function initAdmin() {
  if (admin.apps.length) return;
  
  if (!process.env.FIREBASE_ADMIN_PROJECT_ID) {
    console.error("Missing FIREBASE_ADMIN_PROJECT_ID environment variable");
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export async function POST(request: Request) {
  initAdmin();
  try {
    const { loginId, email, newPassword } = await request.json();

    if (!loginId || !email || !newPassword) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 1. Firestore에서 해당 ID와 Email이 일치하는 유저 UID 찾기
    const usersRef = collection(db, "users");
    const q = query(usersRef, 
      where("loginId", "==", loginId), 
      where("email", "==", email), 
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json(
        { error: "사용자 정보를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const uid = querySnapshot.docs[0].id;

    // 2. Admin SDK로 비밀번호 업데이트
    await admin.auth().updateUser(uid, {
      password: newPassword,
    });

    console.log(`[ResetPwd] Password updated for user: ${uid}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("비밀번호 재설정 오류:", error);
    return NextResponse.json(
      { error: "비밀번호 재설정에 실패했습니다." },
      { status: 500 }
    );
  }
}
