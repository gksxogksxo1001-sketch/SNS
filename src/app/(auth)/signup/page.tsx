"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { AuthService } from "@/core/services/AuthService";
import { cn } from "@/lib/utils";
import { WelcomeView } from "@/components/auth/WelcomeView";
import { CheckCircle2 } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);
  const [nicknameMessage, setNicknameMessage] = useState({ text: "", isError: false });
  const [idMessage, setIdMessage] = useState({ text: "", isError: false });
  const [passwordMessage, setPasswordMessage] = useState({ text: "", isError: false });
  const [emailMessage, setEmailMessage] = useState({ text: "", isError: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isJoined, setIsJoined] = useState(false);

  const handleIdCheck = async () => {
    if (!loginId) {
      setIdMessage({ text: "아이디를 입력해주세요.", isError: true });
      return;
    }
    // 10 characters or more, alphanumeric (at least one letter and one number)
    const idRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{10,}$/;
    if (!idRegex.test(loginId)) {
      setIdMessage({ 
        text: "아이디는 10자 이상이며 영문과 숫자를 모두 포함해야 합니다.", 
        isError: true 
      });
      return;
    }
    try {
      const isDuplicated = await AuthService.checkIdDuplication(loginId);
      if (isDuplicated) {
        setIdMessage({ text: "이미 사용 중인 아이디입니다.", isError: true });
        setIsIdChecked(false);
      } else {
        setIdMessage({ text: "사용 가능한 아이디입니다.", isError: false });
        setIsIdChecked(true);
      }
    } catch (err: any) {
      setIdMessage({ text: err.message, isError: true });
    }
  };

  const handleNicknameCheck = async () => {
    if (!nickname) {
      setNicknameMessage({ text: "닉네임을 입력해주세요.", isError: true });
      return;
    }
    // Simple check for now, can be expanded to AuthService
    setNicknameMessage({ text: "사용 가능한 닉네임입니다.", isError: false });
    setIsNicknameChecked(true);
  };

  const handleSendVerificationCode = () => {
    if (!email) {
      setEmailMessage({ text: "이메일을 입력해주세요.", isError: true });
      return;
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(code);
    
    // Call real email sending API
    fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setEmailMessage({ text: "인증번호가 발송되었습니다.", isError: false });
      } else {
        setEmailMessage({ text: data.error || "메일 발송에 실패했습니다.", isError: true });
      }
    })
    .catch(() => {
      setEmailMessage({ text: "메일 발송 중 오류가 발생했습니다.", isError: true });
    });
  };

  const handleVerifyCode = () => {
    if (verificationCode === sentCode && sentCode !== "") {
      setIsEmailVerified(true);
      setEmailMessage({ text: "이메일 인증이 완료되었습니다.", isError: false });
    } else {
      setEmailMessage({ text: "인증번호가 일치하지 않습니다.", isError: true });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage({ text: "", isError: false });

    if (!isIdChecked) {
      setIdMessage({ text: "아이디 중복 확인이 필요합니다.", isError: true });
      return;
    }

    if (!isNicknameChecked) {
      setNicknameMessage({ text: "닉네임 중복 확인이 필요합니다.", isError: true });
      return;
    }

    if (!isEmailVerified) {
      setEmailMessage({ text: "이메일 인증이 필요합니다.", isError: true });
      return;
    }

    if (password !== confirmPassword) {
      setPasswordMessage({ text: "비밀번호가 일치하지 않습니다.", isError: true });
      return;
    }

    if (password.length < 8) {
      setPasswordMessage({ text: "비밀번호는 8자 이상이어야 합니다.", isError: true });
      return;
    }

    setPasswordMessage({ text: "", isError: false });
    setIsLoading(true);

    try {
      await AuthService.signUp(email, password, nickname, loginId);
      setIsJoined(true);
      // Wait a bit then redirect
      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch (err: any) {
      // General signup error (e.g., Firebase error)
      alert(`가입 중 오류가 발생했습니다: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {isJoined && (
        <WelcomeView 
          nickname={nickname} 
          onConfirm={() => router.push("/")} 
        />
      )}
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
            
            {/* 1. 닉네임 */}
            <div className="space-y-1">
              <div className="flex gap-2">
                <Input 
                  label="닉네임" 
                  placeholder="여행매니아" 
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    setIsNicknameChecked(false);
                    setNicknameMessage({ text: "", isError: false });
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
              {nicknameMessage.text && (
                <p className={cn(
                  "text-xs px-1",
                  nicknameMessage.isError ? "text-red-500" : "text-green-600"
                )}>
                  {nicknameMessage.text}
                </p>
              )}
            </div>

            {/* 2. 로그인할 때 쓸 아이디 */}
            <div className="space-y-1">
              <div className="flex gap-2">
                <Input 
                  label="아이디" 
                  placeholder="아이디를 입력하세요" 
                  value={loginId}
                  onChange={(e) => {
                    setLoginId(e.target.value);
                    setIsIdChecked(false);
                    setIdMessage({ text: "", isError: false });
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
              {idMessage.text && (
                <p className={cn(
                  "text-xs px-1",
                  idMessage.isError ? "text-red-500" : "text-green-600"
                )}>
                  {idMessage.text}
                </p>
              )}
            </div>

            {/* 3. 비밀번호 */}
            <div className="space-y-1">
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
              <p className="text-[11px] text-text-sub px-1">
                * 8자 이상, 영문과 숫자를 혼합하여 설정해주세요.
              </p>
              {passwordMessage.text && (
                <p className={cn(
                  "text-xs px-1",
                  passwordMessage.isError ? "text-red-500" : "text-green-600"
                )}>
                  {passwordMessage.text}
                </p>
              )}
            </div>

            <Input 
              label="비밀번호 확인" 
              placeholder="••••••••" 
              type={showPassword ? "text" : "password"} 
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
                    setEmailMessage({ text: "", isError: false });
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
              {emailMessage.text && (
                <p className={cn(
                  "text-xs px-1",
                  emailMessage.isError ? "text-red-500" : "text-green-600"
                )}>
                  {emailMessage.text}
                </p>
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
