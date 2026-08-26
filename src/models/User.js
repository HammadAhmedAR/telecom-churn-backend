import { DataTypes, Model } from 'sequelize';

const USER_ROLES = ['admin', 'account_manager', 'customer_service'];

class User extends Model {
  static initialize(sequelize) {
    User.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: { notEmpty: true },
        },
        email: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
          validate: { isEmail: true },
        },
        passwordHash: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: { notEmpty: true },
        },
        role: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'account_manager',
          validate: { isIn: [USER_ROLES] },
        },
      },
      {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        underscored: true,
      },
    );

    return User;
  }
}

export { USER_ROLES };
export default User;
