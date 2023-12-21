import { Initialize, Service } from 'crypto-wallet/injection';
import { ClientsService, AccountsService as WalletAccountsService, SchedulingService } from 'crypto-wallet/modules/wallet';
import { NetworkService } from '../network';
import { DataService } from '../data';
import { AccountAssets, TokenBalance } from './models';
import { AccountsService, TronAccountVariation } from '../accounts';
import { StringHelper } from 'crypto-wallet/utils';


type Balances = { [key: string]: TokenBalance };

@Service()
export class AssetsService {

  constructor(
    private networkService: NetworkService,
    private clientsService: ClientsService,
    private dataService: DataService,
    private accountsService: AccountsService,
    private schedulingService: SchedulingService,
    private walletAccountsService: WalletAccountsService,
  ) {
  }

  async getAccountAssets(address: string, network: string): Promise<AccountAssets> {
    const tokens = await this.dataService.getAccountTokens(address, network);
    return { tokens };
  }

  async refreshTokensBalance(address: string, network: string, addresses: string[]) {
    const values = await Promise.all<Balances>(
      (addresses || [])
        .filter((token, index) => addresses.findIndex(addressToken => StringHelper.equalsIgnoreCase(addressToken, token)) === index)
        .map(token => {
          if (StringHelper.equalsIgnoreCase(token, address)) {
            return this.refreshNativeBalance(address, network).catch(() => undefined);
          } else {
            return this.refreshTrc20Balance(address, network, token).catch(() => undefined)
          }
        })
    );
    const tokens = values.reduce<Balances>((balances, value) => Object.assign(balances, value), {});
    if (Object.keys(tokens).length) {
      await this.dataService.setAccountTokens(address, network, tokens);
    }
  }

  async refreshAccount(address: string, network: string) {
    this.updateNativeBalance(address, network).catch(() => undefined);
    const savedBalances: Balances = await this.dataService.getAccountTokens(address, network).catch(() => undefined);
    const remoteBalances: Balances = undefined;;
    const suspiciousTokens = this.getSuspiciousTokens(savedBalances, remoteBalances)
      .filter(token => !StringHelper.equalsIgnoreCase(token, address));
    if (remoteBalances) {
      const tokens = Object.assign({}, remoteBalances);
      suspiciousTokens.forEach(token => {
        delete tokens[token];
      });
      if (Object.keys(tokens).length) {
        await this.clientsService.emitAdminClients('tronAccountAssetsChanged', { address, network, tokens, });
        await this.dataService.setAccountTokens(address, network, tokens,);
      }
    }
    await this.refreshTokensBalance(address, network, suspiciousTokens);
  }

  async followTokens(address: string, network: string, addresses: string[]) {
    const tokensData = await this.dataService.getAccountTokens(address, network) || {};
    const tokens = Object.keys(tokensData);
    const tokensToFollow = addresses.filter(address => !tokens.includes(address));
    const tokensDataToFollow = tokensToFollow.reduce<Balances>((balances, token) => Object.assign(balances, { [token]: { timestamp: Date.now() } }), {});
    await this.dataService.setAccountTokens(address, network, tokensDataToFollow,);
    await this.clientsService.emitAdminClients('tronAccountAssetsChanged', { address, network, tokens: tokensDataToFollow, });
  }

  async unfollowTokens(address: string, network: string, addresses: string[]) {
    const tokensData = await this.dataService.getAccountTokens(address, network) || {};
    const tokens = Object.keys(tokensData);
    const tokensToUnfollow = addresses.filter(address => tokens.includes(address));
    const tokensDataToUnfollow = tokensToUnfollow.reduce<Balances>((balances, token) => Object.assign(balances, { [token]: null }), {});
    await this.dataService.setAccountTokens(address, network, tokensDataToUnfollow,);
    await this.clientsService.emitAdminClients('tronAccountAssetsChanged', { address, network, tokens: tokensDataToUnfollow, });
  }

  private async updateNativeBalance(address: string, network: string) {
    const tokens: Balances = await this.refreshNativeBalance(address, network).catch(() => undefined);
    if (tokens) {
      await this.dataService.setAccountTokens(address, network, tokens);
    }
    return tokens;
  }

  private async refreshNativeBalance(address: string, network: string) {
    const provider = await this.networkService.getNetowkProvider(network);
    const balance = await provider.trx.getBalance(address);
    const value = (balance && balance > 0) ? provider.toHex(balance) : undefined;
    if (value) {
      const tokens = { [address]: { value, timestamp: Date.now(), } };
      await this.clientsService.emitAdminClients('tronAccountAssetsChanged', { address, network, tokens, });
      return tokens;
    }
    return undefined;
  }

  private async refreshTrc20Balance(address: string, network: string, contractAddress: string) {
    // const value = await this.erc20Service.getBalance(contractAddress, network, address);
    // if (value) {
    //   const tokens = { [contractAddress]: { value, timestamp: Date.now(), } };
    //   await this.clientsService.emitAdminClients('tronAccountAssetsChanged', { address, network, tokens, });
    //   return tokens;
    // }
    return undefined;
  }

  private getSuspiciousTokens(savedBalances: Balances, remoteBalances: Balances): string[] {
    const savedAddresses = Object.keys(savedBalances || {});
    const remoteAddresses = Object.keys(remoteBalances || {});
    const intersectedPairs = remoteAddresses
      .map(remoteAddress => ({ remote: remoteAddress, saved: savedAddresses.find(address => address === remoteAddress) }))
      .filter(pair => pair.saved != null);

    const savedNotInRemote = savedAddresses.filter(savedAddress => !intersectedPairs.find(pair => pair.saved === savedAddress));
    const remoteDifferentValues = intersectedPairs.filter(pair => savedBalances[pair.saved].value !== remoteBalances[pair.remote].value)
      .map(pair => pair.saved);
    return savedNotInRemote.concat(remoteDifferentValues);
  }

  private async syncSavedAssestsCurrentNetwork() {
    const network = this.networkService.getNetworkName();
    await this.syncSavedAssests(network);
  }

  private async syncSavedAssests(network: string) {
    const accounts: TronAccountVariation[] = await this.accountsService.getAccounts().catch(() => undefined);
    if (!accounts || !accounts.length) {
      return;
    }
    const accountAddresses = accounts.map(account => account.address);

    const savedAddresses: string[] = await this.dataService.getNetworkAccounts(network).catch(() => undefined);
    if (!savedAddresses) {
      return;
    }
    const addressesToRemove = savedAddresses.filter(address => !accountAddresses.includes(address));
    const addressesToAdd = accountAddresses.filter(address => !savedAddresses.includes(address));
    if (addressesToRemove.length || addressesToAdd.length) {
      await this.dataService.spliceNetworkAccounts(network, addressesToAdd, addressesToRemove);
    }
  }

  private async checkUpdate(expectedLastTimestamp: number) {
    const network = this.networkService.getNetworkName();
    if (!network) {
      return undefined;
    }
    const account = await this.accountsService.getAccount();
    if (!account) {
      return undefined;
    }
    this.syncSavedAssests(network).catch(() => { });
    const assets = await this.getAccountAssets(account.address, network);
    let refresh = false;
    if (!assets.tokens) {
      refresh = true;
    } else if (Object.keys(assets.tokens).map(token => assets.tokens[token]).some(token => !token || !token.timestamp || token.timestamp < expectedLastTimestamp)) {
      refresh = true;
    }
    if (refresh) {
      await this.refreshAccount(account.address, network).catch(() => { });
    }
  }

  @Initialize()
  private async initialize() {
    const task = this.schedulingService.scheduleInterval(
      (params) => this.checkUpdate(params.expectedLastRun.getTime()),
      { taskFor: 'admins', intervalOffset: 10 * 1000, timeInterval: 300 * 1000, name: 'Refresh Tron Account Assets' },
    );
    task.reset();
    this.accountsService.on('addressChanged', () => {
      task.reset();
    });
    this.walletAccountsService.on('walletAccountsChanged', () => {
      this.syncSavedAssestsCurrentNetwork().catch(() => { });
    });
    this.networkService.on('networkNameChanged', () => {
      task.reset();
    });

  }

}
