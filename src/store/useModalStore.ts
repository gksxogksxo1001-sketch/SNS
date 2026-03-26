import { create } from "zustand";

type ModalType = "alert" | "confirm";
type AlertType = "info" | "success" | "warning" | "error";

interface ModalState {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  alertType?: AlertType;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  
  // Actions
  showAlert: (params: { 
    title: string; 
    message: string; 
    type?: AlertType;
    onClose?: () => void;
  }) => void;
  
  showConfirm: (params: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  }) => void;
  
  hideModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  isOpen: false,
  type: "alert",
  title: "",
  message: "",
  
  showAlert: ({ title, message, type = "info", onClose }) => set({
    isOpen: true,
    type: "alert",
    title,
    message,
    alertType: type,
    onConfirm: onClose, // For Alert, onConfirm is just closing
  }),
  
  showConfirm: ({ title, message, confirmText, cancelText, isDanger, onConfirm, onCancel }) => set({
    isOpen: true,
    type: "confirm",
    title,
    message,
    confirmText,
    cancelText,
    isDanger,
    onConfirm,
    onCancel,
  }),
  
  hideModal: () => set({ isOpen: false }),
}));
