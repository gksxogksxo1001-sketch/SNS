import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/common/Button";

interface WelcomeViewProps {
  nickname: string;
  onConfirm: () => void;
}

export function WelcomeView({ nickname, onConfirm }: WelcomeViewProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white p-6 animate-in fade-in duration-500">
      <div className="max-w-sm w-full text-center space-y-8">
        <div className="flex justify-center">
          <div className="bg-primary/10 p-4 rounded-full animate-bounce">
            <CheckCircle2 size={64} className="text-primary" />
          </div>
        </div>
        
        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-text-main">
            가입을 축하합니다!
          </h2>
          <p className="text-xl text-text-sub">
            <span className="text-primary font-bold">{nickname}님</span>, 가입을 진심으로 환영합니다.
          </p>
        </div>

        <div className="pt-8">
          <Button className="w-full" size="lg" onClick={onConfirm}>
            시작하기
          </Button>
        </div>
        
        <p className="text-sm text-text-sub">
          잠시 후 피드 화면으로 이동합니다...
        </p>
      </div>
    </div>
  );
}
