const getRiskLevel = (churnProbability) => {
  if (
    typeof churnProbability !== 'number'
    || !Number.isFinite(churnProbability)
    || churnProbability < 0
    || churnProbability > 1
  ) {
    throw new RangeError('Churn probability must be a finite number between 0 and 1');
  }

  if (churnProbability < 0.4) return 'LOW';
  if (churnProbability < 0.7) return 'MEDIUM';
  return 'HIGH';
};

export default getRiskLevel;
