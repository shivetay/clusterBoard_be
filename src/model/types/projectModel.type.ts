export interface IClusterProjectSchema extends Document {
  project_name: string;
  created_at: Date;
  updated_at: Date;
  status: TProjectStatusType;
  investors: Array<string>;
  owner: string;
}

export type TProjectStatusType =
  | 'planning'
  | 'active'
  | 'completed'
  | 'on_hold'
  | 'cancelled';
