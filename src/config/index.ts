import fs from 'fs';
import path from 'path';
import { CommonEncodeOptions } from '@stencila/encoda/dist/codecs/types';
import { SendEmailRequest } from 'aws-sdk/clients/ses';
import { ReceiveMessageRequest } from 'aws-sdk/clients/sqs';
import { MongoClientOptions } from 'mongodb';
import { JSON_EXT, XML_EXT, ZIP_EXT } from './constants';

const root = path.normalize(path.join(__dirname, '..', '..'));

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  // eslint-disable-next-line
  require('dotenv').config({
    path: path.join(root, '.env'),
  });
}

const sslOptions = process.env.NODE_ENV === 'production' ? {
  sslValidate: true,
  sslCA: [fs.readFileSync('rds-combined-ca-bundle.pem')],
  auth: {
    user: process.env.DOCDB_USER ?? '',
    password: process.env.DOCDB_PASS ?? '',
  },
} : {};

const config = {
  logger: {
    level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
    defaultMeta: {},
  },
  aws: {
    secrets: {
      region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    sqs: {
      endpoint: process.env.SQS_ENDPOINT,
      queueName: process.env.SQS_QUEUE_NAME ?? 'default',
      defaultParams: <ReceiveMessageRequest> {
        AttributeNames: [
          'SentTimestamp',
        ],
        MaxNumberOfMessages: process.env.SQS_MAX_NUMBER_OF_MESSAGES ?? 3, // executes 3 articles in parallel
        MessageAttributeNames: [
          'All',
        ],
        VisibilityTimeout: process.env.SQS_VISIBILITY_TIMEOUT ?? 5,
        WaitTimeSeconds: process.env.SQS_WAIT_TIME_SECONDS ?? 10,
      },
    },
    s3: {
      endpoint: process.env.S3_ENDPOINT,
      articleStorage: {
        bucketName: process.env.S3_STORAGE_BUCKET_NAME,
        prefix: process.env.S3_STORAGE_BUCKET_PREFIX ?? 'articles/',
      },
      archiveStorage: {
        bucketName: process.env.S3_ARCHIVE_BUCKET_NAME,
      },
    },
    ses: {
      endpoint: process.env.SES_ENDPOINT,
      defaultSendParams: <SendEmailRequest>{
        Destination: {
          ToAddresses: process.env.NOTIFY_EMAIL_TO ? [
            process.env.NOTIFY_EMAIL_TO,
          ] : [],
        },
        Source: process.env.NOTIFY_EMAIL_FROM,
      },
    },
  },
  db: {
    mongoUrl: process.env.CONNECTION_STRING ?? 'mongodb://localhost:27017/articleHosting',
    options: <MongoClientOptions>{
      poolSize: 10,
      numberOfRetries: 5,
      keepAlive: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ...sslOptions,
    },
  },
  paths: {
    root,
    tempFolder: path.join(root, 'tmp'),
    dataFolder: path.join(root, 'data'),
  },
  fs: {
    writeStreamOptions: {
      autoClose: true,
    },
    readStreamOptions: {
      autoClose: true,
    },
  },
  stencila: {
    options: <CommonEncodeOptions> {
      isBundle: false,
      isStandalone: true,
      shouldZip: 'no',
      format: 'json',
    },
  },
  importFilesWhiteList: [
    XML_EXT,
    JSON_EXT,
    ZIP_EXT,
  ],
};

export default config;
