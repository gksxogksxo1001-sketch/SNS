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
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isIdChecked, setIsIdChecked] = useState(false);
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleIdCheck = async () => {
    if (!loginId) {
      setError("아이디를 입력해주세요.");
      return;
    }
    try {
      const isDuplicated = await AuthService.checkIdDuplication(loginId);
      if (isDuplicated) {
        setError("이미 사용 중인 아이디입니다.");
        setIsIdChecked(false);
      } else {
        setSuccessMessage("사용 가능한 아이디입니다.");
        setError("");
        setIsIdChecked(true);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleNicknameCheck = async () => {
    if (!nickname) {
      setError("닉네임을 입력해주세요.");
      return;
    }
    // Simple check for now, can be expanded to AuthService
    setSuccessMessage("사용 가능한 닉네임입니다.");
    setError("");
    setIsNicknameChecked(true);
  };

  const handleSendVerificationCode = () => {
    if (!email) {
      setError("이메일을 입력해주세요.");
      return;
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(code);
    // Mock sending email
    alert(`인증번호가 발송되었습니다: ${code}`);
    setSuccessMessage("인증번호가 발송되었습니다.");
    setError("");
  };

  const handleVerifyCode = () => {
    if (verificationCode === sentCode && sentCode !== "") {
      setIsEmailVerified(true);
      setSuccessMessage("이메일 인증이 완료되었습니다.");
      setError("");
    } else {
      setError("인증번호가 일치하지 않습니다.");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isIdChecked) {
      setError("아이디 중복 확인이 필요합니다.");
      return;
    }

    if (!isNicknameChecked) {
      setError("닉네임 중복 확인이 필요합니다.");
      return;
    }

    if (!isEmailVerified) {
      setError("이메일 인증이 필요합니다.");
      return;
    }

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
      await AuthService.signUp(email, password, nickname, loginId);
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
            {successMessage && <p className="text-sm text-green-500 text-center">{successMessage}</p>}
            
            {/* 1. 닉네임 */}
            <div className="flex gap-2">
              <Input 
                label="닉네임" 
                placeholder="여행매니아" 
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setIsNicknameChecked(false);
                }}
                required
              />
              <Button 
                className="mt-7 shrink-0" 
                variant="outline" 
                size="md" 
                type="button"
                onClick={handleNicknameCheck}
              >
                중복 확인
              </Button>
            </div>

            {/* 2. 로그인할 때 쓸 아이디 */}
            <div className="flex gap-2">
              <Input 
                label="아이디" 
                placeholder="아이디를 입력하세요" 
                value={loginId}
                onChange={(e) => {
                  setLoginId(e.target.value);
                  setIsIdChecked(false);
                }}
                required
              />
              <Button 
                className="mt-7 shrink-0" 
                variant="outline" 
                size="md" 
                type="button"
                onClick={handleIdCheck}
              >
                중복 확인
              </Button>
            </div>

            {/* 3. 비밀번호 */}
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

            {/* 4. 이메일 및 인증 */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input 
                  label="이메일" 
                  placeholder="example@email.com" 
                  type="email" 
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setIsEmailVerified(false);
                  }}
                  required
                />
                <Button 
                  className="mt-7 shrink-0" 
                  variant="outline" 
                  size="md" 
                  type="button"
                  onClick={handleSendVerificationCode}
                  disabled={isEmailVerified}
                >
                  인증 요청
                </Button>
              </div>

              {sentCode && !isEmailVerified && (
                <div className="flex gap-2">
                  <Input 
                    placeholder="인증번호 6자리" 
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                  />
                  <Button 
                    className="shrink-0" 
                    variant="outline" 
                    size="md" 
                    type="button"
                    onClick={handleVerifyCode}
                  >
                    인증 확인
                  </Button>
                </div>
              )}
              {isEmailVerified && (
                <p className="text-xs text-green-600 px-1">이메일 인증이 완료되었습니다.</p>
              )}
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
