import { Service } from 'crypto-wallet/injection'
import { ExposeAdmin } from 'crypto-wallet/modules/core';
import { AccountsService } from '../accounts';
import { AssetsService } from '../assets';
import { NetworkAddress, NetworkAddressTokens } from './models';

@Service('tron')
export class TronService {

    constructor(
        private accountsService: AccountsService,
        private assetsService: AssetsService,
    ) {
    }

    @ExposeAdmin()
    getAccounts() {
        return this.accountsService.getAccounts();
    }

    @ExposeAdmin()
    getAccount() {
        return this.accountsService.getAccount();
    }

    @ExposeAdmin()
    async getAccountAssets(networkAddress: NetworkAddress) {
        return this.assetsService.getAccountAssets(networkAddress.address, networkAddress.network);
    }

    @ExposeAdmin()
    async refreshAccount(networkAddress: NetworkAddress) {
        return this.assetsService.refreshAccount(networkAddress.address, networkAddress.network);
    }

    @ExposeAdmin()
    async refreshAccountTokens(networkAddressTokens: NetworkAddressTokens) {
        return this.assetsService.refreshTokensBalance(networkAddressTokens.address, networkAddressTokens.network, networkAddressTokens.tokens);
    }



}