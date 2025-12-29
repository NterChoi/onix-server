import {Injectable} from "@nestjs/common";
import {PasswordHasher} from "./password-hasher";
import * as bcrypt from 'bcrypt';

@Injectable()
export class BcryptHasher implements PasswordHasher {

    private readonly saltRounds = 10;

    async hash(password: string): Promise<string> {
        return bcrypt.hash(password, this.saltRounds);
    }

    async compare(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

}