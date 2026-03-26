"use client";

import React from "react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
}

export const Modal = ({ isOpen, onClose, title, message }: ModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* 배경 흐림 처리 (Overlay) */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* 모달 박스 */}
            <div className="relative w-[90%] max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{message}</p>

                <div className="mt-6">
                    <button
                        onClick={onClose}
                        className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
};