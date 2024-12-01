import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm";
import { User } from "./User";

@Entity()
export class Consultation {
    @PrimaryGeneratedColumn()
    id: number;

    @Column("text")
    imageUrl: string;

    @Column("text")
    prompt: string;

    @Column("text")
    advice: string;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => User, (user) => user.consultations)
    user: User;
}
