'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'retention_actions',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          customer_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'customers', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          user_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          action_type: { type: Sequelize.STRING(100), allowNull: false },
          notes: { type: Sequelize.TEXT, allowNull: true },
          status: {
            type: Sequelize.STRING(50),
            allowNull: false,
            defaultValue: 'Logged',
          },
          created_at: { type: Sequelize.DATE, allowNull: false },
          updated_at: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction },
      );

      await queryInterface.addIndex('retention_actions', ['customer_id'], {
        name: 'retention_actions_customer_id_idx',
        transaction,
      });
      await queryInterface.addIndex('retention_actions', ['user_id'], {
        name: 'retention_actions_user_id_idx',
        transaction,
      });
      await queryInterface.addIndex('retention_actions', ['created_at'], {
        name: 'retention_actions_created_at_idx',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('retention_actions');
  },
};
