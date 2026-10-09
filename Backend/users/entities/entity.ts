@Entity('users')
export class User{

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({unique:true})
    email: string;

    @Column()
    pass: string;
}