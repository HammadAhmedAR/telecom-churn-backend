import {
  createCustomer as createCustomerService,
  findCustomerByCustomerId,
  listCustomers as listCustomersService,
} from '../services/customer.service.js';
import { predictCustomerByCustomerId } from '../services/prediction.service.js';
import { simulateCustomerByCustomerId } from '../services/simulation.service.js';

const listCustomers = async (request, response, next) => {
  try {
    response.json(await listCustomersService(request.query));
  } catch (error) {
    next(error);
  }
};

const createCustomer = async (request, response, next) => {
  try {
    response.status(201).json(await createCustomerService(request.body));
  } catch (error) {
    next(error);
  }
};

const getCustomer = async (request, response, next) => {
  try {
    const customer = await findCustomerByCustomerId(request.params.customerId);

    if (!customer) {
      response.status(404).json({ message: 'Customer not found' });
      return;
    }

    response.json(customer);
  } catch (error) {
    next(error);
  }
};

const predictCustomer = async (request, response, next) => {
  try {
    const prediction = await predictCustomerByCustomerId(request.params.customerId);

    if (!prediction) {
      response.status(404).json({ message: 'Customer not found' });
      return;
    }

    response.json(prediction);
  } catch (error) {
    next(error);
  }
};

const simulateCustomer = async (request, response, next) => {
  try {
    const simulation = await simulateCustomerByCustomerId(
      request.params.customerId,
      request.body,
    );

    if (!simulation) {
      response.status(404).json({ message: 'Customer not found' });
      return;
    }

    response.json(simulation);
  } catch (error) {
    next(error);
  }
};

export {
  createCustomer,
  getCustomer,
  listCustomers,
  predictCustomer,
  simulateCustomer,
};
