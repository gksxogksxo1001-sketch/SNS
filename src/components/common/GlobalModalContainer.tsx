"use client";

import React from "react";
import { useModalStore } from "@/store/useModalStore";
import { AlertModal, ConfirmModal } from "./UIModals";

export const GlobalModalContainer = () => {
  const { 
    isOpen, 
    type, 
    title, 
    message, 
    alertType, 
    confirmText, 
    cancelText, 
    isDanger, 
    onConfirm, 
    onCancel,
    hideModal 
  } = useModalStore();

  if (!isOpen) return null;

  if (type === "confirm") {
    return (
      <ConfirmModal
        isOpen={isOpen}
        title={title}
        message={message}
        confirmText={confirmText}
        cancelText={cancelText}
        isDanger={isDanger}
        onConfirm={() => {
          if (onConfirm) onConfirm();
          hideModal();
        }}
        onClose={() => {
          if (onCancel) onCancel();
          hideModal();
        }}
      />
    );
  }

  return (
    <AlertModal
      isOpen={isOpen}
      title={title}
      message={message}
      type={alertType}
      onClose={() => {
        if (onConfirm) onConfirm();
        hideModal();
      }}
    />
  );
};
