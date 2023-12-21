import { EventEmitter } from 'crypto-wallet/components';
import { Initialize, Service } from 'crypto-wallet/injection'
import { KeysService } from 'crypto-wallet/modules/keys';
import { ClientsService, MnemonicKey, AccountVariation as WalletAccountVariation, AccountsService as WalletAccountsService, WalletKey } from 'crypto-wallet/modules/wallet';
import { TronAccountVariation, TronWallet } from './models';

import * as TronWebLib from 'tronweb/dist/TronWeb.js';

const TronWeb = TronWebLib.default;

const DEFAULT_PATH = "m/44'/195'/0'/0/0";

interface ServiceEvents {
    addressChanged: string,
}

@Service()
export class AccountsService extends EventEmitter<ServiceEvents> {
    private lastAddress: string;
    constructor(
        private walletAccountsService: WalletAccountsService,
        private keysService: KeysService,
        private clientsService: ClientsService,
    ) {
        super();
    }

    async getAccounts(): Promise<TronAccountVariation[]> {
        const walletAccounts = await this.walletAccountsService.getWalletAccounts();
        const accounts: TronAccountVariation[] = [];
        for (const walletAccount of walletAccounts) {
            const account = await this.getAccountVariation(walletAccount.walletKey, walletAccount.account);
            accounts.push(account);
        }
        return accounts;
    }

    async getAccount(): Promise<TronAccountVariation> {
        const walletAccount = await this.walletAccountsService.getWalletAccount();
        if (!walletAccount) {
            this.updateLastAddress(null);
            return null;
        }
        const account = await this.getAccountVariation(walletAccount.walletKey, walletAccount.account);
        await this.updateLastAddress(account.address);
        return account;
    }

    async getAccountInfo(walletAccountVariation: WalletAccountVariation): Promise<TronAccountVariation> {
        const walletAccount = await this.walletAccountsService.findWalletAccount(walletAccountVariation);
        if (!walletAccount) {
            return null;
        }
        return this.getAccountVariation(walletAccount.walletKey, walletAccount.account);
    }

    getLastAddress() {
        return this.lastAddress;
    }

    async getWallet(): Promise<TronWallet> {
        const walletAccount = await this.walletAccountsService.getWalletAccount();
        if (!walletAccount) {
            return null;
        }
        return this.getKeyWallet(walletAccount.walletKey, walletAccount.account);
    }

    async getAccountWallet(accountVariation: TronAccountVariation): Promise<TronWallet> {
        const walletAccount = await this.walletAccountsService.findWalletAccount(accountVariation);
        if (!walletAccount) {
            return null;
        }
        return this.getKeyWallet(walletAccount.walletKey, walletAccount.account);

    }

    private async getKeyWallet(walletKey: WalletKey, walletAccountVariation: WalletAccountVariation): Promise<TronWallet> {
        if (this.walletAccountsService.isMnemonicKey(walletKey)) {
            const hdPath = this.getHDPath(walletAccountVariation);
            const hdNode = await this.fromMnemonic(walletKey, hdPath);
            const privateKey = hdNode.privateKey.substring(2);
            const address = TronWeb.address.fromPrivateKey(privateKey);
            return {
                privateKey,
                address,
                hdPath,
            };
        }
        if (this.walletAccountsService.isPrivateKey(walletKey)) {
            const privateKey = walletKey.privateKey.substring(2);
            const address = TronWeb.address.fromPrivateKey(privateKey);
            return {
                privateKey,
                address,
            };

        }
        throw Error('Can not get wallet');
    }

    private async updateLastAddress(value: string) {
        if (this.lastAddress !== value) {
            this.lastAddress = value;
            await this.clientsService.emitAllClients('tronAddressChanged', value);
            this.emit('addressChanged', value);
        }
    }

    private async getAccountVariation(walletKey: WalletKey, walletAccountVariation: WalletAccountVariation): Promise<TronAccountVariation> {
        if (this.walletAccountsService.isMnemonicKey(walletKey)) {
            const hdPath = this.getHDPath(walletAccountVariation);
            const hdNode = await this.fromMnemonic(walletKey, hdPath);
            const privateKey = hdNode.privateKey.substring(2);
            const address = TronWeb.address.fromPrivateKey(privateKey);
            return { ...walletAccountVariation, hdPath, address }
        }
        if (this.walletAccountsService.isPrivateKey(walletKey)) {
            const privateKey = walletKey.privateKey.substring(2);
            const address = TronWeb.address.fromPrivateKey(privateKey);
            return { ...walletAccountVariation, address }
        }
        throw Error('Can not get address');
    }

    private async fromMnemonic(mnemonicKey: MnemonicKey, hdPath: string) {
        const hdNode = await this.keysService.fromMnemonic(mnemonicKey, mnemonicKey.passPhrase, true);
        return await this.keysService.derive(hdNode, hdPath);
    }

    private getHDPath(accountVariation: WalletAccountVariation) {
        const accountIndex = accountVariation.accountIndex || 0;
        const hdPath = accountIndex ? DEFAULT_PATH.split('/').slice(0, -1).concat([accountIndex.toString()]).join('/') : DEFAULT_PATH;
        return hdPath;
    }

    @Initialize()
    private async initialize() {
        await this.getAccount();
        this.walletAccountsService.on('walletAccountChanged', () => {
            this.getAccount();
        });
    }

}
