export const formatMoney = (minorAmount) => {
  if (minorAmount == null) return '';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(minorAmount / 100);
};
