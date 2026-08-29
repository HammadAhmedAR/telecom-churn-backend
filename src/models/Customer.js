import { DataTypes, Model } from 'sequelize';

const INTERNET_ADD_ON_VALUES = ['Yes', 'No', 'No internet service'];
const CONTRACT_VALUES = ['Month-to-month', 'One year', 'Two year'];
const GENDER_VALUES = ['Male', 'Female'];
const MULTIPLE_LINES_VALUES = ['Yes', 'No', 'No phone service'];
const INTERNET_SERVICE_VALUES = ['DSL', 'Fiber optic', 'No'];
const PAYMENT_METHOD_VALUES = [
  'Electronic check',
  'Mailed check',
  'Bank transfer (automatic)',
  'Credit card (automatic)',
];

class Customer extends Model {
  static initialize(sequelize) {
    Customer.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        customerId: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
          validate: { notEmpty: true },
        },
        gender: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: { isIn: [GENDER_VALUES] },
        },
        seniorCitizen: { type: DataTypes.BOOLEAN, allowNull: false },
        partner: { type: DataTypes.BOOLEAN, allowNull: false },
        dependents: { type: DataTypes.BOOLEAN, allowNull: false },
        tenure: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: { min: 0 },
        },
        phoneService: { type: DataTypes.BOOLEAN, allowNull: false },
        multipleLines: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: { isIn: [MULTIPLE_LINES_VALUES] },
        },
        internetService: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: { isIn: [INTERNET_SERVICE_VALUES] },
        },
        onlineSecurity: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: { isIn: [INTERNET_ADD_ON_VALUES] },
        },
        onlineBackup: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: { isIn: [INTERNET_ADD_ON_VALUES] },
        },
        deviceProtection: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: { isIn: [INTERNET_ADD_ON_VALUES] },
        },
        techSupport: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: { isIn: [INTERNET_ADD_ON_VALUES] },
        },
        streamingTV: {
          type: DataTypes.STRING,
          field: 'streaming_tv',
          allowNull: false,
          validate: { isIn: [INTERNET_ADD_ON_VALUES] },
        },
        streamingMovies: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: { isIn: [INTERNET_ADD_ON_VALUES] },
        },
        contract: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: { isIn: [CONTRACT_VALUES] },
        },
        paperlessBilling: { type: DataTypes.BOOLEAN, allowNull: false },
        paymentMethod: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: { isIn: [PAYMENT_METHOD_VALUES] },
        },
        monthlyCharges: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: { min: 0 },
        },
        totalCharges: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          validate: { min: 0 },
        },
        churnRisk: {
          type: DataTypes.DECIMAL(5, 4),
          allowNull: true,
          validate: { min: 0, max: 1 },
        },
      },
      {
        sequelize,
        modelName: 'Customer',
        tableName: 'customers',
        underscored: true,
      },
    );

    return Customer;
  }
}

export {
  CONTRACT_VALUES,
  GENDER_VALUES,
  INTERNET_ADD_ON_VALUES,
  INTERNET_SERVICE_VALUES,
  MULTIPLE_LINES_VALUES,
  PAYMENT_METHOD_VALUES,
};
export default Customer;
