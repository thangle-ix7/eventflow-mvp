const DEFAULT_TASK_PAGE_SIZE = 10;
const MIN_TASK_PAGE_SIZE = 1;
const MAX_TASK_PAGE_SIZE = 100;

export const normalizeTaskPageSize = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_TASK_PAGE_SIZE;
  }

  return Math.min(Math.max(parsed, MIN_TASK_PAGE_SIZE), MAX_TASK_PAGE_SIZE);
};
