import { toast, ToastOptions } from 'react-toastify';

const baseOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 1500,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

const triggerNotificationUpdate = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cc:notification-update'));
  }
};

export const notify = {
  success: (message: string, options?: ToastOptions) => {
    toast.success(message, {
      ...baseOptions,
      className: 'cc-toast cc-toast-success',
      ...options,
    });
    triggerNotificationUpdate();
  },
  error: (message: string, options?: ToastOptions) => {
    toast.error(message, {
      ...baseOptions,
      className: 'cc-toast cc-toast-error',
      ...options,
    });
  },
  info: (message: string, options?: ToastOptions) => {
    toast.info(message, {
      ...baseOptions,
      className: 'cc-toast cc-toast-info',
      ...options,
    });
    triggerNotificationUpdate();
  },
  warning: (message: string, options?: ToastOptions) => {
    toast.warning(message, {
      ...baseOptions,
      className: 'cc-toast cc-toast-warning',
      ...options,
    });
    triggerNotificationUpdate();
  },
};

