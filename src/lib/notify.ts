import { toast, ToastOptions } from 'react-toastify';

const baseOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 3500,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

export const notify = {
  success: (message: string, options?: ToastOptions) => {
    toast.success(message, {
      ...baseOptions,
      className: 'cc-toast cc-toast-success',
      ...options,
    });
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
  },
  warning: (message: string, options?: ToastOptions) => {
    toast.warning(message, {
      ...baseOptions,
      className: 'cc-toast cc-toast-warning',
      ...options,
    });
  },
};
