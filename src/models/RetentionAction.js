import { DataTypes, Model } from 'sequelize';

const RETENTION_ACTION_TYPES = [
  'Offer Loyalty Discount',
  'Offer Contract Upgrade',
  'Add Tech Support Package',
  'Assign Account Manager',
  'Schedule Retention Follow-Up',
];

class RetentionAction extends Model {
  static initialize(sequelize) {
    RetentionAction.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        customerId: { type: DataTypes.INTEGER, allowNull: false },
        userId: { type: DataTypes.INTEGER, allowNull: false },
        actionType: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: { isIn: [RETENTION_ACTION_TYPES] },
        },
        notes: { type: DataTypes.TEXT, allowNull: true },
        status: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'Logged',
          validate: { isIn: [['Logged']] },
        },
      },
      {
        sequelize,
        modelName: 'RetentionAction',
        tableName: 'retention_actions',
        underscored: true,
      },
    );

    return RetentionAction;
  }
}

export { RETENTION_ACTION_TYPES };
export default RetentionAction;
