import {Injectable} from
'@nestjs/common';
import {Repository} from
'typeorm';
import {InjectRepository} from
'@nestjs/typeorm';

@Injectable()
export class UserService{
    constructor(
        @InjectRepository(User)
        private readonly usersRepo: Repository<User>
    )

    async findAll(){
        return this.usersRepo.find();
    }
}