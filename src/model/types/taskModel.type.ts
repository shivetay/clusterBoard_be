export interface IStageTaskSchema extends Document {
  stage_id: string;
  task_name: string;
  task_description?: string;
  is_done: boolean;
  owner: string;
}
