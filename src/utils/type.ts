export interface CustomError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  path?: string;
  value?: unknown;
}

// Input accepted for creating/updating stage tasks
// - comma-separated string (e.g., "task1, task2")
// - single object with task_name
// - array of strings or objects with task_name
export type StageTaskInput =
  | string
  | { task_name: string }
  | Array<string | { task_name: string }>;
