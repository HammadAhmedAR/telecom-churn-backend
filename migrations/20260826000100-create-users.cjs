'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'users',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          name: { type: Sequelize.STRING(255), allowNull: false },
          email: { type: Sequelize.STRING(320), allowNull: false },
          password_hash: { type: Sequelize.STRING(255), allowNull: false },
          role: {
            type: Sequelize.STRING(50),
            allowNull: false,
            defaultValue: 'account_manager',
          },
          created_at: { type: Sequelize.DATE, allowNull: false },
          updated_at: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction },
      );

      await queryInterface.addIndex('users', ['email'], {
        name: 'users_email_unique',
        unique: true,
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
