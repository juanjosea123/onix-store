import {Module} from '@nestjs/common';
import {UserController} from
    './users.controller';
import {UsersService} from
    './users.service';
import {User} from './models/user.entity';

@Module({
    controllers: [UsersController],
    providers: [UsersService],
    entities: [User],
    }
)
export class UserModule {}