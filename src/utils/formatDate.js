export const formatDateTime = (value) => {
  if (!value) return '-';

  const date = new Date(value);

  return date.toLocaleString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDateOnly = (value) => {
  if (!value) return '-';

  const date = new Date(value);

  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};