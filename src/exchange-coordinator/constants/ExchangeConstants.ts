export class ExchangeConstants {
  public static NON_VALID_IMAGE_SIZE_ERROR_MESSAGE =
    'You have introduced an incorrect image size, try with 32,64,16,128';

  public static isValidImageSize(num: number) {
    if (num == 32 || num == 64 || num == 16 || num == 128) {
      return true;
    }
    return false;
  }
}
