import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    private readonly apiKey: string;

    constructor(private readonly configService: ConfigService) {
        this.apiKey = this.configService.get<string>('ADMIN_API_KEY') || '';
    }

    canActivate(context: ExecutionContext): boolean {
        // If no API key is set in env, restrict all access (secure default)
        if (!this.apiKey) {
            return false;
        }

        const request = context.switchToHttp().getRequest<Request>();
        const apiKey = request.headers['x-api-key'];

        if (apiKey && apiKey === this.apiKey) {
            return true;
        }

        throw new UnauthorizedException('Invalid or missing API Key');
    }
}
