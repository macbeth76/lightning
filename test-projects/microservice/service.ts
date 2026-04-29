import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.join(__dirname, 'service.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

class UserService {
  getUser(call: any, callback: any) {
    const user = { id: call.request.id, name: 'Service User' };
    callback(null, user);
  }

  createUser(call: any, callback: any) {
    const user = { id: '1', name: call.request.name };
    callback(null, user);
  }

  listUsers(call: any, callback: any) {
    const users = [{ id: '1', name: 'User 1' }];
    callback(null, { users });
  }
}

const server = new grpc.Server();
server.addService(
  (protoDescriptor as any).UserService.service,
  new UserService()
);
server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());
