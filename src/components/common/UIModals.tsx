import React from "react";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "확인", 
  cancelText = "취소", 
  isDanger = false 
}: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-bg-base rounded-3xl shadow-2xl flex flex-col p-6 animate-in zoom-in-95 duration-200">
        <h2 className="text-[18px] font-black text-text-main mb-2">{title}</h2>
        <p className="text-[14px] text-text-sub mb-6 leading-relaxed whitespace-pre-line">{message}</p>
        <div className="flex space-x-3">
          <button 
            onClick={onClose} 
            className="flex-1 py-3.5 bg-bg-alt text-text-sub font-bold rounded-2xl hover:bg-bg-base transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => { 
              onConfirm(); 
              onClose(); 
            }} 
            className={`flex-1 py-3.5 text-white font-bold rounded-2xl transition-colors ${
              isDanger ? 'bg-error hover:opacity-90 shadow-lg shadow-error/20' : 'bg-primary hover:opacity-90 shadow-lg shadow-primary/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AlertModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = "info" 
}: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-bg-base rounded-[32px] shadow-2xl flex flex-col p-6 items-center text-center animate-in zoom-in-95 duration-200 relative overflow-hidden">
        {/* Decorator */}
        <div className={`absolute top-0 left-0 w-full h-2 ${type === 'success' ? 'bg-success' : type === 'error' ? 'bg-error' : 'bg-text-sub'}`} />
        
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 mt-2 ${
          type === 'success' ? 'bg-success/10 text-success' : 
          type === 'error' ? 'bg-error/10 text-error' : 
          'bg-bg-alt text-text-sub'
        }`}>
          {type === 'success' ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
        </div>
        <h2 className="text-[19px] font-black tracking-tight text-text-main mb-2">{title}</h2>
        <p className="text-[14px] text-text-sub mb-8 leading-relaxed whitespace-pre-line">{message}</p>
        <button 
          onClick={onClose} 
          className="w-full py-4 bg-primary text-white text-[15px] font-bold rounded-2xl hover:bg-primary/90 transition-colors shadow-lg active:scale-[0.98]"
        >
          확인
        </button>
      </div>
    </div>
  );
}
