import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

export class UserDatabase {
  private client = new DynamoDBClient({});
  private tableName = 'Users';

  async create(user: any) {
    const cmd = new PutItemCommand({
      TableName: this.tableName,
      Item: { id: { S: user.id }, name: { S: user.name } },
    });
    return this.client.send(cmd);
  }

  async findById(id: string) {
    return { id, name: 'User' };
  }

  async update(id: string, updates: any) {
    return { id, ...updates };
  }

  async delete(id: string) {
    return { success: true };
  }
}
