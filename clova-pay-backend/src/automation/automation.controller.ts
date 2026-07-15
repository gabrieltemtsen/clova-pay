import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Automation')
@Controller('automation')
export class AutomationController {
    constructor(private readonly automationService: AutomationService) { }

    @ApiOperation({ summary: 'Generate unique Stacks addresses' })
    @Get('generate-addresses')
    async generateAddresses(@Query('count') count: number = 5) {
        return this.automationService.generateUniqueAddresses(Number(count));
    }

    @ApiOperation({ summary: 'Run batch transactions (requires mnemonic with STX)' })
    @Post('run-batch')
    async runBatch(@Body() body: { count: number; mnemonic: string }) {
        return this.automationService.runBatchTransactions(body.count, body.mnemonic);
    }
}
