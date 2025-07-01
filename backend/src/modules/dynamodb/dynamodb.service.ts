import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';

@Injectable()
export class DynamoDBService implements OnModuleInit {
  private docClient: DynamoDBDocumentClient;

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('database.dynamodb.accessKeyId');
    const secretAccessKey = this.configService.get<string>('database.dynamodb.secretAccessKey');

    const client = new DynamoDBClient({
      endpoint: this.configService.get('database.dynamodb.endpoint'),
      region: this.configService.get('database.dynamodb.region'),
      ...(accessKeyId &&
        secretAccessKey && {
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        }),
    });

    this.docClient = DynamoDBDocumentClient.from(client);
  }

  async onModuleInit() {
    // Initialize tables if needed
  }

  async putItem(tableName: string, item: any): Promise<void> {
    await this.docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
      }),
    );
  }

  async getItem(tableName: string, key: any): Promise<any> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: key,
      }),
    );
    return result.Item;
  }

  async query(params: any): Promise<any[]> {
    const result = await this.docClient.send(new QueryCommand(params));
    return result.Items || [];
  }
}
