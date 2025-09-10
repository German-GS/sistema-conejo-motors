import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Vehicle } from '../vehicles/vehicle.entity';
import { User } from '../users/user.entity';

@Entity()
export class TrackingHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.trackingHistory)
  vehicle: Vehicle;

  @Column()
  origin: string;

  @Column()
  destination: string;

  @CreateDateColumn()
  departureTime: Date;

  @Column({ nullable: true })
  arrivalTime: Date;

  @ManyToOne(() => User)
  departureUser: User;

  @ManyToOne(() => User, { nullable: true })
  arrivalUser: User;
}
