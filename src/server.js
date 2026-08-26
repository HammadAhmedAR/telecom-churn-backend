import 'dotenv/config';

import app from './app.js';
import sequelize from './config/database.js';

const port = Number(process.env.PORT || 5000);

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    app.listen(port, () => {
      console.log(`Server listening on port ${port}.`);
    });
  } catch (error) {
    console.error('Unable to start server: database connection failed.', error.message);
    process.exit(1);
  }
};

startServer();
