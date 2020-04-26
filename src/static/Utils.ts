import { UserKey } from 'src/keys/schemas/UserKeys.schema';

export class BadgerUtils {
  public static BINANCE_FUTURES_ENDPOINT = 'https://fapi.binance.com';
  //public static BINANCE_FUTURES_ENDPOINT = 'https://testnet.binancefuture.com';

  public static isValidUserKey(key: any) {
    let keyMapped: UserKey = key;
    return keyMapped.user && keyMapped.privateK && keyMapped.publicK && keyMapped.exchangeID;
  }

  public static getPercentageChange(oldNumber, newNumber) {
    return (newNumber * 100) / oldNumber - 100;
  }

  public static busquedaKeysValida(keyList: UserKey[], exchangeBuscado: string) {
    for (let i = 0; i < keyList.length; i++) {
      const key = keyList[i];
      if (BadgerUtils.isValidUserKey(key) && key.exchangeID.toLowerCase() === exchangeBuscado.toLowerCase()) {
        return key;
      }
    }
    return null;
  }
  public static returnOppositeTrade(param: { side: 'BUY' | 'SELL'; positionSide: 'SHORT' | 'LONG' }) {
    if (param.side == 'BUY' && param.positionSide == 'LONG') {
      return { side: 'SELL', positionSide: 'LONG' };
    }
    if (param.side == 'SELL' && param.positionSide == 'SHORT') {
      return { side: 'BUY', positionSide: 'SHORT' };
    }
    return null;
  }
}
