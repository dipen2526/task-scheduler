import {
  CreatedAt,
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  UpdatedAt,
  Index,
} from 'sequelize-typescript';
import { TaskStatus } from 'src/modules/task/task-status.enum';

@Table({
  tableName: 'tasks',
})
export class Task extends Model {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @Column({
    allowNull: false,
  })
  url: string;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
  })
  payload: any;

  @Index('idx_tasks_status_scheduled_at')
  @Column({
    type: DataType.ENUM(...Object.values(TaskStatus)),
    allowNull: false,
    defaultValue: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Index('idx_tasks_status_scheduled_at')
  @Column({
    allowNull: false,
  })
  scheduledAt: Date;

  @Column({
    allowNull: false,
    defaultValue: 0,
  })
  attempts: number;

  @Column({
    allowNull: false,
    defaultValue: 5,
  })
  maxAttempts: number;

  @Column(DataType.DATE)
  nextRetryAt?: Date | null;

  @Column(DataType.DATE)
  executedAt?: Date | null;

  @Column(DataType.DATE)
  canceledAt?: Date | null;

  @Column(DataType.TEXT)
  lastError?: string | null;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}
