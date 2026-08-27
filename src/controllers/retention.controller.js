import {
  createRetentionAction as createRetentionActionService,
  listCustomerRetentionActions as listCustomerRetentionActionsService,
  listRetentionActions as listRetentionActionsService,
} from '../services/retention.service.js';

const createRetentionAction = async (request, response, next) => {
  try {
    const action = await createRetentionActionService({
      telecomCustomerId: request.params.customerId,
      userId: request.user.id,
      body: request.body,
    });

    if (!action) {
      response.status(404).json({ message: 'Customer not found' });
      return;
    }

    response.status(201).json(action);
  } catch (error) {
    next(error);
  }
};

const listCustomerRetentionActions = async (request, response, next) => {
  try {
    const result = await listCustomerRetentionActionsService(
      request.params.customerId,
      request.query,
    );

    if (!result) {
      response.status(404).json({ message: 'Customer not found' });
      return;
    }

    response.json(result);
  } catch (error) {
    next(error);
  }
};

const listRetentionActions = async (request, response, next) => {
  try {
    response.json(await listRetentionActionsService(request.query));
  } catch (error) {
    next(error);
  }
};

export {
  createRetentionAction,
  listCustomerRetentionActions,
  listRetentionActions,
};
