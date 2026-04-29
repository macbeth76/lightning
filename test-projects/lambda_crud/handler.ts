import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const dynamoDB = new DynamoDBClient({});

export const createUser: APIGatewayProxyHandler = async (event) => {
  try {
    const user = JSON.parse(event.body || '{}');
    return { statusCode: 201, body: JSON.stringify(user) };
  } catch (error) {
    return { statusCode: 500, body: 'Error' };
  }
};

export const getUser: APIGatewayProxyHandler = async (event) => {
  try {
    const userId = event.pathParameters?.id;
    return { statusCode: 200, body: JSON.stringify({ id: userId }) };
  } catch (error) {
    return { statusCode: 500, body: 'Error' };
  }
};

export const updateUser: APIGatewayProxyHandler = async (event) => {
  try {
    return { statusCode: 200, body: 'Updated' };
  } catch (error) {
    return { statusCode: 500, body: 'Error' };
  }
};
