import {
  findCustomerByCustomerId,
  listCustomers as listCustomersService,
} from '../services/customer.service.js';

const listCustomers = async (request, response, next) => {
  try {
    response.json(await listCustomersService(request.query));
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

export { getCustomer, listCustomers };
