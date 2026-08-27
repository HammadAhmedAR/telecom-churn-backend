import { Customer } from '../models/index.js';
import { predictCustomer as requestPrediction } from './mlClient.service.js';
import { mapCustomerToMlPayload } from '../utils/mlPayload.mapper.js';
import getRiskLevel from '../utils/riskLevel.js';

const predictCustomer = async (customer) => {
  const payload = mapCustomerToMlPayload(customer);
  const prediction = await requestPrediction(payload);

  return {
    customerId: customer.customerId,
    prediction: prediction.prediction,
    label: prediction.label,
    churnProbability: prediction.churn_probability,
    riskLevel: getRiskLevel(prediction.churn_probability),
    model: prediction.model,
  };
};

const predictCustomerByCustomerId = async (customerId) => {
  const customer = await Customer.findOne({ where: { customerId } });
  return customer ? predictCustomer(customer) : null;
};

export { predictCustomer, predictCustomerByCustomerId };
