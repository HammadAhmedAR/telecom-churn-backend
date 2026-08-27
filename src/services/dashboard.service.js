import { Op } from 'sequelize';

import { Customer, RetentionAction, sequelize } from '../models/index.js';
import getRiskLevel from '../utils/riskLevel.js';

const HIGH_RISK_QUEUE_LIMIT = 5;

const toNullableNumber = (value) => (value === null ? null : Number(value));

const getDashboardSummary = async () => {
  const [
    totalCustomers,
    highRiskCustomers,
    averageResult,
    retentionActions,
    lowRiskCustomers,
    mediumRiskCustomers,
    highRiskQueueRows,
  ] = await Promise.all([
    Customer.count(),
    Customer.count({ where: { churnRisk: { [Op.gte]: 0.7 } } }),
    Customer.findOne({
      attributes: [
        [sequelize.fn('AVG', sequelize.col('churn_risk')), 'averageChurnRisk'],
      ],
      raw: true,
    }),
    RetentionAction.count(),
    Customer.count({ where: { churnRisk: { [Op.lt]: 0.4 } } }),
    Customer.count({
      where: { churnRisk: { [Op.gte]: 0.4, [Op.lt]: 0.7 } },
    }),
    Customer.findAll({
      attributes: [
        'customerId',
        'contract',
        'internetService',
        'monthlyCharges',
        'tenure',
        'churnRisk',
      ],
      where: { churnRisk: { [Op.gte]: 0.7 } },
      order: [['churnRisk', 'DESC'], ['customerId', 'ASC']],
      limit: HIGH_RISK_QUEUE_LIMIT,
      raw: true,
    }),
  ]);

  const highRiskQueue = highRiskQueueRows.map((customer) => {
    const churnRisk = Number(customer.churnRisk);
    return {
      ...customer,
      monthlyCharges: Number(customer.monthlyCharges),
      churnRisk,
      riskLevel: getRiskLevel(churnRisk),
    };
  });

  return {
    totalCustomers,
    highRiskCustomers,
    averageChurnRisk: toNullableNumber(averageResult.averageChurnRisk),
    retentionActions,
    riskDistribution: {
      low: lowRiskCustomers,
      medium: mediumRiskCustomers,
      high: highRiskCustomers,
    },
    highRiskQueue,
  };
};

export { HIGH_RISK_QUEUE_LIMIT, getDashboardSummary };
