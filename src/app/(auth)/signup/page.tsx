"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { ArrowLeft } from "lucide-react";
import { AuthService } from "@/core/services/AuthService";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    setIsLoading(true);

    try {
      await AuthService.signUp(email, password, nickname);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex h-14 items-center border-b px-4">
        <button 
          onClick={() => router.back()}
          className="mr-4 rounded-full p-2 hover:bg-gray-100"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">회원가입</h1>
      </header>

      {/* Form Area */}
      <main className="flex-grow overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-sm space-y-6">
          <form className="space-y-4" onSubmit={handleSignup}>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            
            <div className="flex gap-2">
              <Input 
                label="이메일" 
                placeholder="example@email.com" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button className="mt-7 shrink-0" variant="outline" size="md" type="button">
                중복 확인
              </Button>
            </div>

            <div className="space-y-1">
              <Input 
                label="비밀번호" 
                placeholder="••••••••" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-[11px] text-text-sub px-1">
                * 8자 이상, 영문과 숫자를 혼합하여 설정해주세요.
              </p>
            </div>

            <Input 
              label="비밀번호 확인" 
              placeholder="••••••••" 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-main">
                본인 확인
              </label>
              <div className="flex gap-2">
                <Input placeholder="010-0000-0000" type="tel" />
                <Button className="shrink-0" variant="outline" size="md" type="button">
                  인증 요청
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Input 
                label="닉네임" 
                placeholder="여행매니아" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
              />
              <Button className="mt-7 shrink-0" variant="outline" size="md" type="button">
                중복 확인
              </Button>
            </div>

            <Button className="w-full mt-4" size="lg" isLoading={isLoading} type="submit">
              가입 완료
            </Button>
          </form>

          <p className="text-center text-sm text-text-sub pt-4">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              로그인하기
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
