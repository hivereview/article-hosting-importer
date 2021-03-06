import LoggerService from '../services/logger.service';

abstract class Logable {
  protected logger: LoggerService;

  constructor(logger: LoggerService) {
    this.logger = logger;
  }
}

export default Logable;
