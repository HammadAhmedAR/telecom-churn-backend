import { DataTypes, Model } from 'sequelize';

const INTERNET_ADD_ON_VALUES = ['Yes', 'No', 'No internet service'];
const CONTRACT_VALUES = ['Month-to-month', 'One year', 'Two year'];

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
          validate: { isIn: [['Male', 'Female']] },
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
          validate: { isIn: [['Yes', 'No', 'No phone service']] },
        },
        internetService: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: { isIn: [['DSL', 'Fiber optic', 'No']] },
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
          validate: {
            isIn: [[
              'Electronic check',
              'Mailed check',
              'Bank transfer (automatic)',
              'Credit card (automatic)',
            ]],
          },
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

export { CONTRACT_VALUES, INTERNET_ADD_ON_VALUES };
export default Customer;
