"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { ArrowLeft, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { AuthService } from "@/core/services/AuthService";
import { cn } from "@/lib/utils";

type Tab = "findId" | "resetPw";

export default function RecoveryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("findId");
  
  // States for Find ID
  const [emailForId, setEmailForId] = useState("");
  const [idVerificationCode, setIdVerificationCode] = useState("");
  const [idSentCode, setIdSentCode] = useState("");
  const [isIdEmailVerified, setIsIdEmailVerified] = useState(false);
  const [foundId, setFoundId] = useState("");
  const [idMessage, setIdMessage] = useState({ text: "", isError: false });

  // States for Reset Password
  const [loginIdForPw, setLoginIdForPw] = useState("");
  const [emailForPw, setEmailForPw] = useState("");
  const [pwVerificationCode, setPwVerificationCode] = useState("");
  const [pwSentCode, setPwSentCode] = useState("");
  const [isPwEmailVerified, setIsPwEmailVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pwMessage, setPwMessage] = useState({ text: "", isError: false });
  const [isPwResetSuccess, setIsPwResetSuccess] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  // --- Find ID Logic ---
  const handleSendIdCode = async () => {
    if (!emailForId) {
      setIdMessage({ text: "이메일을 입력해주세요.", isError: true });
      return;
    }
    setIsLoading(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailForId, code, type: "findId" }),
      });
      const data = await res.json();
      
      if (data.success) {
        setIdSentCode(code);
        setIdMessage({ text: "인증번호가 발송되었습니다.", isError: false });
      } else {
        setIdMessage({ text: data.error || "메일 발송에 실패했습니다.", isError: true });
      }
    } catch (err) {
      setIdMessage({ text: "메일 발송 중 오류가 발생했습니다.", isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyIdCode = async () => {
    if (idVerificationCode === idSentCode && idSentCode !== "") {
      try {
        setIsLoading(true);
        const loginId = await AuthService.findIdByEmail(emailForId);
        setFoundId(loginId);
        setIsIdEmailVerified(true);
        setIdMessage({ text: "인증이 완료되었습니다.", isError: false });
      } catch (err: any) {
        setIdMessage({ text: err.message, isError: true });
      } finally {
        setIsLoading(false);
      }
    } else {
      setIdMessage({ text: "인증번호가 일치하지 않습니다.", isError: true });
    }
  };

  // --- Reset Password Logic ---
  const handleSendPwCode = async () => {
    if (!loginIdForPw || !emailForPw) {
      setPwMessage({ text: "아이디와 이메일을 모두 입력해주세요.", isError: true });
      return;
    }
    
    setIsLoading(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailForPw, code, type: "resetPw" }),
      });
      const data = await res.json();
      
      if (data.success) {
        setPwSentCode(code);
        setPwMessage({ text: "인증번호가 발송되었습니다.", isError: false });
      } else {
        setPwMessage({ text: data.error || "메일 발송에 실패했습니다.", isError: true });
      }
    } catch (err) {
      setPwMessage({ text: "메일 발송 중 오류가 발생했습니다.", isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPwCode = () => {
    if (pwVerificationCode === pwSentCode && pwSentCode !== "") {
      setIsPwEmailVerified(true);
      setPwMessage({ text: "인증이 완료되었습니다. 새 비밀번호를 입력해 주세요.", isError: false });
    } else {
      setPwMessage({ text: "인증번호가 일치하지 않습니다.", isError: true });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setPwMessage({ text: "비밀번호가 일치하지 않습니다.", isError: true });
      return;
    }
    if (newPassword.length < 8) {
      setPwMessage({ text: "비밀번호는 8자 이상이어야 합니다.", isError: true });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          loginId: loginIdForPw, 
          email: emailForPw, 
          newPassword 
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setIsPwResetSuccess(true);
        setPwMessage({ text: "비밀번호가 성공적으로 변경되었습니다.", isError: false });
      } else {
        setPwMessage({ text: data.error || "비밀번호 변경에 실패했습니다.", isError: true });
      }
    } catch (err: any) {
      setPwMessage({ text: "오류가 발생했습니다. 다시 시도해 주세요.", isError: true });
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
        <h1 className="text-lg font-bold">아이디/비밀번호 찾기</h1>
      </header>

      <main className="flex-grow px-6 py-8">
        <div className="mx-auto max-w-sm space-y-8">
          {/* Tabs */}
          <div className="flex border-b">
            <button
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-colors",
                activeTab === "findId" 
                  ? "border-b-2 border-primary text-primary" 
                  : "text-text-sub hover:text-text-main"
              )}
              onClick={() => {
                setActiveTab("findId");
                setIdMessage({ text: "", isError: false });
              }}
            >
              아이디 찾기
            </button>
            <button
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-colors",
                activeTab === "resetPw" 
                  ? "border-b-2 border-primary text-primary" 
                  : "text-text-sub hover:text-text-main"
              )}
              onClick={() => {
                setActiveTab("resetPw");
                setPwMessage({ text: "", isError: false });
              }}
            >
              비밀번호 찾기
            </button>
          </div>

          {/* Tab Content */}
          <div className="pt-4">
            {activeTab === "findId" ? (
              <div className="space-y-6">
                {!isIdEmailVerified ? (
                  <div className="space-y-4">
                    <p className="text-sm text-text-sub">
                      가입 시 등록한 이메일 주소를 입력해 주세요.
                    </p>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input 
                          label="이메일" 
                          placeholder="example@email.com" 
                          type="email" 
                          value={emailForId}
                          onChange={(e) => setEmailForId(e.target.value)}
                        />
                        <Button 
                          className="mt-7 shrink-0" 
                          variant="outline" 
                          onClick={handleSendIdCode}
                          isLoading={isLoading && !idSentCode}
                        >
                          인증 요청
                        </Button>
                      </div>

                      {idSentCode && (
                        <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                          <Input 
                            placeholder="인증번호 6자리" 
                            value={idVerificationCode}
                            onChange={(e) => setIdVerificationCode(e.target.value)}
                          />
                          <Button 
                            className="shrink-0" 
                            onClick={handleVerifyIdCode}
                            isLoading={isLoading && !!idSentCode}
                          >
                            확인
                          </Button>
                        </div>
                      )}

                      {idMessage.text && (
                        <p className={cn(
                          "text-xs px-1",
                          idMessage.isError ? "text-red-500" : "text-green-600"
                        )}>
                          {idMessage.text}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-6 py-8 animate-in zoom-in-95 duration-300">
                    <div className="flex justify-center text-primary">
                      <CheckCircle2 size={64} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-text-sub">정보와 일치하는 아이디를 찾았습니다.</p>
                      <h3 className="text-2xl font-bold text-text-main">{foundId}</h3>
                    </div>
                    <Button className="w-full" onClick={() => router.push("/login")}>
                      로그인하러 가기
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {!isPwResetSuccess ? (
                  <div className="space-y-4">
                    {!isPwEmailVerified ? (
                      <>
                        <p className="text-sm text-text-sub">
                          아이디와 가입 시 등록한 이메일을 입력하시면<br/>
                          본인 확인을 위한 인증번호를 보내드립니다.
                        </p>
                        <div className="space-y-4">
                          <Input 
                            label="아이디" 
                            placeholder="아이디를 입력하세요" 
                            value={loginIdForPw}
                            onChange={(e) => setLoginIdForPw(e.target.value)}
                            required
                          />
                          <div className="flex gap-2">
                            <Input 
                              label="이메일" 
                              placeholder="example@email.com" 
                              type="email" 
                              value={emailForPw}
                              onChange={(e) => setEmailForPw(e.target.value)}
                              required
                            />
                            <Button 
                              className="mt-7 shrink-0" 
                              variant="outline" 
                              onClick={handleSendPwCode}
                              isLoading={isLoading && !pwSentCode}
                            >
                              인증 요청
                            </Button>
                          </div>

                          {pwSentCode && (
                            <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                              <Input 
                                placeholder="인증번호 6자리" 
                                value={pwVerificationCode}
                                onChange={(e) => setPwVerificationCode(e.target.value)}
                              />
                              <Button 
                                className="shrink-0" 
                                onClick={handleVerifyPwCode}
                                isLoading={isLoading && !!pwSentCode}
                              >
                                확인
                              </Button>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <form onSubmit={handleUpdatePassword} className="space-y-4 animate-in fade-in duration-500">
                        <Input 
                          label="새 비밀번호" 
                          placeholder="••••••••" 
                          type={showPassword ? "text" : "password"} 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
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
                        <Input 
                          label="새 비밀번호 확인" 
                          placeholder="••••••••" 
                          type={showPassword ? "text" : "password"} 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                        <Button className="w-full mt-2" type="submit" isLoading={isLoading}>
                          비밀번호 변경하기
                        </Button>
                      </form>
                    )}
                    
                    {pwMessage.text && (
                      <p className={cn(
                        "text-xs px-1",
                        pwMessage.isError ? "text-red-500" : "text-green-600"
                      )}>
                        {pwMessage.text}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center space-y-6 py-8 animate-in zoom-in-95 duration-300">
                    <div className="flex justify-center text-primary">
                      <CheckCircle2 size={64} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-text-main">비밀번호 변경 완료</h3>
                      <p className="text-sm text-text-sub leading-relaxed">
                        새로운 비밀번호로 가입 정보가 업데이트되었습니다.<br/>
                        이제 새로운 비밀번호로 로그인해 주세요.
                      </p>
                    </div>
                    <Button className="w-full" onClick={() => router.push("/login")}>
                      로그인 화면으로
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
