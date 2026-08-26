const toNullableNumber = (value) => (value === null ? null : Number(value));

const serializeCustomer = (customerInstance) => {
  const { createdAt: _createdAt, updatedAt: _updatedAt, ...customer } =
    customerInstance.get({ plain: true });

  return {
    ...customer,
    monthlyCharges: toNullableNumber(customer.monthlyCharges),
    totalCharges: toNullableNumber(customer.totalCharges),
    churnRisk: toNullableNumber(customer.churnRisk),
  };
};

export default serializeCustomer;
