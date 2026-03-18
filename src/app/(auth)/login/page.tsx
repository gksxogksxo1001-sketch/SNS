"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Chrome, MessageCircle, MapPin, Eye, EyeOff } from "lucide-react";
import { AuthService } from "@/core/services/AuthService";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await AuthService.signInWithId(loginId, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsLoading(true);
    try {
      await AuthService.signInWithGoogle();
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-full bg-primary p-3 text-white">
            <MapPin size={32} />
          </div>
          <h1 className="text-2xl font-bold text-text-main">SNS Project</h1>
          <p className="mt-2 text-text-sub">여행의 순간을 기록해보세요</p>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-4" onSubmit={handleLogin}>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <Input 
            label="아이디" 
            placeholder="아이디를 입력하세요" 
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            required
          />
          <Input 
            label="비밀번호" 
            placeholder="••••••••" 
            type={showPassword ? "text" : "password"} 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            rightElement={
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-text-sub hover:text-text-main"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            }
          />
          <Button className="w-full mt-2" size="lg" isLoading={isLoading} type="submit">
            로그인
          </Button>
        </form>

        {/* Links */}
        <div className="flex justify-between text-sm text-text-sub">
          <Link href="/recovery" className="hover:text-primary">아이디/비밀번호 찾기</Link>
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            간편 회원가입
          </Link>
        </div>

        {/* social Login */}
        <div className="mt-8">
          <div className="relative flex items-center py-5">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="mx-4 flex-shrink text-xs text-text-sub">다른 계정으로 로그인</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <div className="flex justify-center space-x-6 pt-2">
            <button 
              type="button"
              onClick={() => alert("카카오 로그인은 준비 중입니다.")}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FEE500] text-[#3c1e1e] hover:opacity-90"
            >
              <MessageCircle size={24} fill="currentColor" />
            </button>
            <button 
              type="button"
              onClick={() => alert("네이버 로그인은 준비 중입니다.")}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-[#03C75A] text-white hover:opacity-90"
            >
              <span className="text-xl font-bold">N</span>
            </button>
            <button 
              type="button"
              onClick={handleGoogleLogin}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50"
            >
              <Chrome size={24} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
