import Swal from 'sweetalert2';

// HoSZA Custom Dark Glassmorphic Theme configuration for SweetAlert2
const swalCustom = Swal.mixin({
  background: '#0f172a',
  color: '#f8fafc',
  confirmButtonColor: '#0284c7',
  cancelButtonColor: '#475569',
  customClass: {
    popup: 'glass-panel-swal',
    title: 'swal-title',
    htmlContainer: 'swal-text',
    confirmButton: 'swal-btn-confirm',
    cancelButton: 'swal-btn-cancel'
  },
  buttonsStyling: true,
});

export const showSuccess = (title, text = '') => {
  return swalCustom.fire({
    icon: 'success',
    title: title,
    text: text,
    iconColor: '#34d399',
    confirmButtonText: 'OK',
    confirmButtonColor: '#059669',
  });
};

export const showError = (title, text = '') => {
  return swalCustom.fire({
    icon: 'error',
    title: title,
    text: text,
    iconColor: '#f87171',
    confirmButtonText: 'OK',
    confirmButtonColor: '#dc2626',
  });
};

export const showInfo = (title, text = '') => {
  return swalCustom.fire({
    icon: 'info',
    title: title,
    text: text,
    iconColor: '#38bdf8',
    confirmButtonText: 'OK',
    confirmButtonColor: '#0284c7',
  });
};

export const showWarning = (title, text = '') => {
  return swalCustom.fire({
    icon: 'warning',
    title: title,
    text: text,
    iconColor: '#fbbf24',
    confirmButtonText: 'OK',
    confirmButtonColor: '#d97706',
  });
};

export const showConfirm = async (title, text = '', confirmButtonText = 'Yes, proceed', icon = 'question') => {
  const result = await swalCustom.fire({
    title: title,
    text: text,
    icon: icon,
    iconColor: '#fbbf24',
    showCancelButton: true,
    confirmButtonText: confirmButtonText,
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#0284c7',
    cancelButtonColor: '#475569',
    reverseButtons: true
  });
  return result.isConfirmed;
};

export default swalCustom;
