import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    makeContractCall,
    broadcastTransaction,
    uintCV,
    stringAsciiCV,
    bufferCV,
    PostConditionMode,
    AnchorMode,
    getAddressFromPrivateKey,
    makeSTXTokenTransfer,
} from '@stacks/transactions';
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';
import { generateWallet, randomSeedPhrase } from '@stacks/wallet-sdk';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class AutomationService {
    private readonly logger = new Logger(AutomationService.name);
    private readonly network: any;
    private readonly apiUrl: string;
    private readonly contractAddress: string;
    private readonly contractName: string;

    constructor(private readonly configService: ConfigService) {
        const networkType = this.configService.get<string>('STACKS_NETWORK', 'testnet');
        this.network = networkType === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;
        this.apiUrl = this.configService.get<string>('STACKS_API_URL', 'https://api.testnet.hiro.so');
        this.contractAddress = this.configService.get<string>('CONTRACT_ADDRESS', '');
        this.contractName = this.configService.get<string>('CONTRACT_NAME', 'off-ramp');
    }

    async generateUniqueAddresses(count: number) {
        const addresses: any[] = [];
        const networkName = this.configService.get('STACKS_NETWORK') === 'mainnet' ? 'mainnet' : 'testnet';

        for (let i = 0; i < count; i++) {
            const mnemonic = randomSeedPhrase();
            const wallet = await generateWallet({
                secretKey: mnemonic,
                password: '',
            });
            const account = wallet.accounts[0];
            const address = getAddressFromPrivateKey(
                account.stxPrivateKey,
                networkName
            );

            addresses.push({
                address,
                mnemonic,
            });
        }
        return addresses;
    }

    async runBatchTransactions(count: number, senderMnemonic: string) {
        this.logger.log(`Starting batch transactions: ${count}`);

        const wallet = await generateWallet({
            secretKey: senderMnemonic,
            password: '',
        });
        const account = wallet.accounts[0];

        const results: any[] = [];
        for (let i = 0; i < count; i++) {
            try {
                const txOptions = {
                    contractAddress: this.contractAddress,
                    contractName: this.contractName,
                    functionName: 'create-order',
                    functionArgs: [
                        uintCV(1000000), // 1 STX
                        uintCV(2000),    // 20.00 Fiat
                        stringAsciiCV('NGN'),
                        bufferCV(crypto.randomBytes(32)), // Random hash for bank details
                    ],
                    senderKey: account.stxPrivateKey,
                    validateWithAbi: true,
                    network: this.network,
                    anchorMode: AnchorMode.Any,
                    postConditionMode: PostConditionMode.Allow,
                };

                const transaction = await makeContractCall(txOptions);
                const broadcastResponse = await broadcastTransaction({
                    transaction,
                    network: this.network,
                });

                this.logger.log(`Transaction ${i + 1} broadcasted: ${broadcastResponse.txid}`);
                results.push(broadcastResponse);
            } catch (error) {
                this.logger.error(`Transaction ${i + 1} failed: ${error.message}`);
                results.push({ error: error.message });
            }
        }

        return results;
    }

    async requestFaucet(address: string) {
        if (this.configService.get('STACKS_NETWORK') === 'mainnet') {
            throw new Error('Faucet not available on mainnet');
        }
        this.logger.log(`Requesting STX from faucet for: ${address}`);
        try {
            const response = await axios.post(`${this.apiUrl}/extended/v1/faucets/stx?address=${address}`);
            return response.data;
        } catch (error: any) {
            this.logger.error(`Faucet request failed for ${address}: ${error.response?.data || error.message}`);
            throw error;
        }
    }

    async sendInternalSTX(fromMnemonic: string, toAddress: string, amount: number) {
        this.logger.log(`Sending ${amount} STX to ${toAddress}`);
        const wallet = await generateWallet({
            secretKey: fromMnemonic,
            password: '',
        });
        const account = wallet.accounts[0];

        const txOptions = {
            recipient: toAddress,
            amount: BigInt(amount),
            senderKey: account.stxPrivateKey,
            network: this.network,
            anchorMode: AnchorMode.Any,
        };

        const transaction = await makeSTXTokenTransfer(txOptions);
        const broadcastResponse = await broadcastTransaction({
            transaction,
            network: this.network,
        });
        return broadcastResponse;
    }

    async runFullOrchestration(count: number, funderMnemonic?: string) {
        this.logger.log(`Starting Full Orchestration for ${count} addresses`);

        const accounts = await this.generateUniqueAddresses(count);
        const results: any[] = [];

        for (const acc of accounts) {
            try {
                if (this.configService.get('STACKS_NETWORK') !== 'mainnet') {
                    const fundTx = await this.requestFaucet(acc.address);
                    this.logger.log(`Faucet request success for ${acc.address}. Tx: ${fundTx.txId}`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }

                if (funderMnemonic) {
                    const internalTx = await this.sendInternalSTX(funderMnemonic, acc.address, 2000000); // 2 STX
                    this.logger.log(`Internal fund success for ${acc.address}. Tx: ${internalTx.txid}`);
                }

                const accWallet = await generateWallet({ secretKey: acc.mnemonic, password: '' });
                const privateKey = accWallet.accounts[0].stxPrivateKey;

                const txOptions = {
                    contractAddress: this.contractAddress,
                    contractName: this.contractName,
                    functionName: 'create-order',
                    functionArgs: [
                        uintCV(1000000), // 1 STX
                        uintCV(2000),    // 20.00 Fiat
                        stringAsciiCV('NGN'),
                        bufferCV(crypto.randomBytes(32)),
                    ],
                    senderKey: privateKey,
                    validateWithAbi: true,
                    network: this.network,
                    anchorMode: AnchorMode.Any,
                    postConditionMode: PostConditionMode.Allow,
                };

                const transaction = await makeContractCall(txOptions);
                const broadcastResponse = await broadcastTransaction({
                    transaction,
                    network: this.network,
                });

                results.push({
                    address: acc.address,
                    contractCallTx: broadcastResponse.txid
                });
            } catch (error: any) {
                this.logger.error(`Orchestration failed for ${acc.address}: ${error.message}`);
                results.push({ address: acc.address, error: error.message });
            }
        }

        return results;
    }
}
