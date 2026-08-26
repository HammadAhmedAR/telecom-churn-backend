'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'customers',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
          },
          customer_id: { type: Sequelize.STRING(50), allowNull: false },
          gender: { type: Sequelize.STRING(20), allowNull: false },
          senior_citizen: { type: Sequelize.BOOLEAN, allowNull: false },
          partner: { type: Sequelize.BOOLEAN, allowNull: false },
          dependents: { type: Sequelize.BOOLEAN, allowNull: false },
          tenure: { type: Sequelize.INTEGER, allowNull: false },
          phone_service: { type: Sequelize.BOOLEAN, allowNull: false },
          multiple_lines: { type: Sequelize.STRING(50), allowNull: false },
          internet_service: { type: Sequelize.STRING(50), allowNull: false },
          online_security: { type: Sequelize.STRING(50), allowNull: false },
          online_backup: { type: Sequelize.STRING(50), allowNull: false },
          device_protection: { type: Sequelize.STRING(50), allowNull: false },
          tech_support: { type: Sequelize.STRING(50), allowNull: false },
          streaming_tv: { type: Sequelize.STRING(50), allowNull: false },
          streaming_movies: { type: Sequelize.STRING(50), allowNull: false },
          contract: { type: Sequelize.STRING(50), allowNull: false },
          paperless_billing: { type: Sequelize.BOOLEAN, allowNull: false },
          payment_method: { type: Sequelize.STRING(100), allowNull: false },
          monthly_charges: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
          total_charges: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
          churn_risk: { type: Sequelize.DECIMAL(5, 4), allowNull: true },
          created_at: { type: Sequelize.DATE, allowNull: false },
          updated_at: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction },
      );

      await queryInterface.addIndex('customers', ['customer_id'], {
        name: 'customers_customer_id_unique',
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('customers', ['churn_risk'], {
        name: 'customers_churn_risk_idx',
        transaction,
      });
      await queryInterface.addIndex('customers', ['contract'], {
        name: 'customers_contract_idx',
        transaction,
      });

      await queryInterface.addConstraint('customers', {
        fields: ['tenure'],
        type: 'check',
        name: 'customers_tenure_nonnegative',
        where: { tenure: { [Sequelize.Op.gte]: 0 } },
        transaction,
      });
      await queryInterface.addConstraint('customers', {
        fields: ['monthly_charges'],
        type: 'check',
        name: 'customers_monthly_charges_nonnegative',
        where: { monthly_charges: { [Sequelize.Op.gte]: 0 } },
        transaction,
      });
      await queryInterface.addConstraint('customers', {
        fields: ['total_charges'],
        type: 'check',
        name: 'customers_total_charges_nonnegative',
        where: { total_charges: { [Sequelize.Op.gte]: 0 } },
        transaction,
      });
      await queryInterface.addConstraint('customers', {
        fields: ['churn_risk'],
        type: 'check',
        name: 'customers_churn_risk_range',
        where: {
          churn_risk: {
            [Sequelize.Op.between]: [0, 1],
          },
        },
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('customers');
  },
};
