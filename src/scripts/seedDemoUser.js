import 'dotenv/config';

import bcrypt from 'bcryptjs';

import { User, sequelize } from '../models/index.js';

const BCRYPT_COST = 10;

const requireEnvironmentValue = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const seedDemoUser = async () => {
  const name = requireEnvironmentValue('DEMO_USER_NAME');
  const email = requireEnvironmentValue('DEMO_USER_EMAIL').toLowerCase();
  const password = requireEnvironmentValue('DEMO_USER_PASSWORD');

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    console.log(`Demo user already exists: ${email}`);
    return { created: false, user: existingUser };
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user = await User.create({
    name,
    email,
    passwordHash,
    role: 'account_manager',
  });

  console.log(`Demo user created: ${user.email}`);
  return { created: true, user };
};

seedDemoUser()
  .catch((error) => {
    console.error(`Unable to seed demo user: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });

export { BCRYPT_COST, seedDemoUser };
