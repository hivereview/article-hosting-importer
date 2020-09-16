import Service from '../abstract/service';

class DecoderService extends Service {
  public decodeJSON<T>(encoded: string | Buffer): T {
    const temp: string = encoded instanceof Buffer ? encoded.toString() : encoded;

    try {
      return <T>JSON.parse(temp);
    } catch (err) {
      return <T>{};
    }
  }
}

export default DecoderService;
