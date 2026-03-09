import {
  Column,
  CreatedAt,
  DataType,
  Index,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { TaskStatus } from 'src/modules/task/task-status.enum';

@Table({
  tableName: 'task_execution_logs',
  updatedAt: false,
})
export class TaskExecutionLog extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @Index('idx_logs_task_id_created_at')
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  taskId: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  attempt: number;

  @Column({
    type: DataType.ENUM(...Object.values(TaskStatus)),
    allowNull: false,
  })
  status: TaskStatus;

  @Column(DataType.INTEGER)
  httpStatus?: number | null;

  @Column(DataType.JSONB)
  responseBody?: unknown;

  @Column(DataType.TEXT)
  error?: string | null;

  @Index('idx_logs_task_id_created_at')
  @CreatedAt
  createdAt: Date;
}
