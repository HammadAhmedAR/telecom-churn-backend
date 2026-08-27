const serializeRetentionAction = (retentionActionInstance) => {
  const action = typeof retentionActionInstance?.get === 'function'
    ? retentionActionInstance.get({ plain: true })
    : retentionActionInstance;

  return {
    id: action.id,
    customerId: action.customer.customerId,
    actionType: action.actionType,
    notes: action.notes,
    status: action.status,
    performedBy: {
      id: action.user.id,
      name: action.user.name,
      role: action.user.role,
    },
    createdAt: action.createdAt,
  };
};

export default serializeRetentionAction;
