import { getDashboardSummary as getDashboardSummaryService } from '../services/dashboard.service.js';

const getDashboardSummary = async (_request, response, next) => {
  try {
    response.json(await getDashboardSummaryService());
  } catch (error) {
    next(error);
  }
};

export { getDashboardSummary };
