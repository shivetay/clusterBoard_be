export interface IProjectStagesSchema extends Document {
  cluster_project_id: string;
  stage_name: string;
  stage_description?: string;
  is_done: boolean;
  owner: string;
}
