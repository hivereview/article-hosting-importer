import Logable from './abstract/logable';
import DatabaseAdapter from './adapters/db.adapter';
import SQSAdapter from './adapters/sqs.adapter';
import config from './config';
import SQSMessageProcessor from './processors/sqs-message.processor';
import LoggerService, { Level } from './service/logger.service';
import SQSService from './service/sqs.service';

const { endpoint } = config.aws.sqs;

class ApiArticleHostingImporter extends Logable {
  private readonly sqsAdapter: SQSAdapter;

  private readonly dbAdapter: DatabaseAdapter;

  private readonly sqsService: SQSService;

  constructor(logger: LoggerService) {
    super(logger);

    this.sqsAdapter = new SQSAdapter(
      this.logger,
      {
        queueName: config.aws.sqs.queueName,
        endpoint,
      },
    );

    this.dbAdapter = new DatabaseAdapter(this.logger);

    this.sqsService = new SQSService(this.logger, this.sqsAdapter);
  }

  async process(): Promise<void> {
    this.logger.log(Level.info, 'watching queue for a job');

    const messages = await this.sqsService.getMessages();

    if (!Array.isArray(messages) || messages.length === 0) {
      this.logger.log(Level.info, 'No messages in queue. Exiting!');
      return;
    }

    const messagesIds = messages.map((message) => message.messageId);

    this.logger.log<Array<string>>(
      Level.info,
      `process messages in parallel. number of concurrent articles is '${config.aws.sqs.defaultParams.MaxNumberOfMessages}'`,
      messagesIds,
    );

    const asyncQueue = [];

    for (const message of messages) {
      asyncQueue.push(
        (new SQSMessageProcessor(this.logger, this.sqsService, this.dbAdapter))
          .withMessage(message)
          .processMessage()
          .catch((err) => {
            this.logger.log<Error>(Level.error, err.message, err);
          }),
      );
    }

    await Promise.all(asyncQueue);

    this.logger.log<Array<string>>(
      Level.info,
      'set of messages processed!',
      messagesIds,
    );

    await this.process();
  }
}

export default ApiArticleHostingImporter;
