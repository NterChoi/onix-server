import {ConflictException, Inject, Injectable} from '@nestjs/common';
import {InjectRepository} from "@nestjs/typeorm";
import {User} from "./entities/user.entity";
import {Repository} from "typeorm";
import {CreateUserDto} from "./dto/create-user.dto";
import {PasswordHasher} from "../auth/hashing/password-hasher";

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @Inject(PasswordHasher)
        private readonly passwordHasher: PasswordHasher,

    ) {}

    async create(createUserDTO: CreateUserDto): Promise<User> {
        const checkUser = await this.userRepository.findOne({where: {email: createUserDTO.email}});

        if (checkUser) {
            throw new ConflictException('이미 사용중인 이메일입니다.');
        }

        const {password} = createUserDTO;

        const hashedPassword = await this.passwordHasher.hash(password);
        const user = this.userRepository.create({
            email: createUserDTO.email,
            password: hashedPassword,
        });

        return await this.userRepository.save(user);
        }

    async findOneByEmail(email: string): Promise<User | null> {
        return await this.userRepository.findOne({where: {email}})
    }

    }

