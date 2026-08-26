import sequelize from '../config/database.js';
import Customer from './Customer.js';
import RetentionAction from './RetentionAction.js';
import User from './User.js';

User.initialize(sequelize);
Customer.initialize(sequelize);
RetentionAction.initialize(sequelize);

User.hasMany(RetentionAction, {
  as: 'retentionActions',
  foreignKey: 'userId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
RetentionAction.belongsTo(User, {
  as: 'user',
  foreignKey: 'userId',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

Customer.hasMany(RetentionAction, {
  as: 'retentionActions',
  foreignKey: 'customerId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
RetentionAction.belongsTo(Customer, {
  as: 'customer',
  foreignKey: 'customerId',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

export { Customer, RetentionAction, User, sequelize };
