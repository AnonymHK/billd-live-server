import fs from 'fs';
import path from 'path';

import { Server, Socket } from 'socket.io';

import { PROJECT_ENV, PROJECT_ENV_ENUM } from '@/constant';
import { chalkINFO } from '@/utils/chalkTip';

import { WsConnectStatusEnum, WsMsgTypeEnum } from './constant';
import DBController from './mysql.controller';

interface IOffer {
  socketId: string;
  roomId: string;
  sdp: any;
}

async function getAllLiveUser(io) {
  const allSocketsMap = await io.fetchSockets();
  return Object.keys(allSocketsMap).map((item) => {
    return {
      id: allSocketsMap[item].id,
      rooms: [...allSocketsMap[item].rooms.values()],
    };
  });
}

export const connectWebSocket = (server) => {
  if (PROJECT_ENV === PROJECT_ENV_ENUM.beta) {
    console.log(chalkINFO('当前是beta环境，不初始化websocket'));
    return;
  }
  console.log(chalkINFO('当前不是beta环境，初始化websocket'));

  const io = new Server(server);

  // socket.emit会将消息发送给发件人
  // socket.broadcast.emit会将消息发送给除了发件人以外的所有人
  // io.emit会将消息发送给所有人，包括发件人

  io.on(WsConnectStatusEnum.connection, (socket: Socket) => {
    console.log(new Date().toLocaleString(), 'connection', socket.id);
    // const currLiveUser = await getAllLiveUser(io);
    // io.emit(WsMsgTypeEnum.liveUser, currLiveUser);

    // 收到用户进入房间
    socket.on(
      WsMsgTypeEnum.join,
      async (data: {
        roomId: string;
        roomName: string;
        data: any;
        isAdmin?: boolean;
      }) => {
        socket.join(data.roomId);
        console.log(new Date().toLocaleString(), '收到用户进入房间', data);
        const liveUser = await getAllLiveUser(io);
        socket.emit(WsMsgTypeEnum.joined, data);
        if (data.isAdmin) {
          DBController.addLiveRoom({
            roomId: data.roomId,
            socketId: socket.id,
            data,
          });
        } else {
          const res = await DBController.searchLiveRoomByRoomId(data.roomId);
          if (!res.count) {
            socket.emit(WsMsgTypeEnum.roomNoLive, data);
          } else {
            socket.emit(WsMsgTypeEnum.roomLiveing, data);
          }
        }
        socket
          .to(data.roomId)
          .emit(WsMsgTypeEnum.otherJoin, { socketId: socket.id });
        io.emit(WsMsgTypeEnum.liveUser, liveUser);
      }
    );

    // 收到用户退出房间
    socket.on(WsMsgTypeEnum.leave, async (data) => {
      console.log(
        new Date().toLocaleString(),
        socket.id,
        '收到用户退出房间',
        data
      );
      socket.emit(WsMsgTypeEnum.leaved, { socketId: socket.id });
      const liveUser = await getAllLiveUser(io);
      io.emit(WsMsgTypeEnum.liveUser, liveUser);
    });

    // 收到用户发blob
    socket.on(
      WsMsgTypeEnum.sendBlob,
      (data: { data: { blob: any; timestamp: number } }) => {
        console.log(
          new Date().toLocaleString(),
          socket.id,
          '收到用户发blob',
          data
        );
        fs.writeFileSync(
          path.resolve(__dirname, `./chunk/${data.data.timestamp}.webm`),
          data.data.blob
        );
        // const blob = new Blob(data.data.blob);
      }
    );

    // 收到用户发送消息
    socket.on(WsMsgTypeEnum.message, (data) => {
      console.log(
        new Date().toLocaleString(),
        socket.id,
        '收到用户发送消息',
        data
      );
      // if (data.data.debug) {
      //   const chunkDir = path.resolve(__dirname, `./chunk/`);
      //   // 读取目录
      //   readdirSync(chunkDir)
      //     .sort((a: string, b: string) => +a - +b)
      //     .forEach((v) => {
      //       console.log('当前chunk', v);
      //       const buffer = Buffer.from(readFileSync(`${chunkDir}/${v}`));
      //       // bufferArr.push(buffer);
      //       io.emit(WsMsgTypeEnum.sendBlob, { buffer });
      //     });
      // }
      socket.to(data.roomId).emit(WsMsgTypeEnum.message, data);
    });

    // 收到管理员开始直播
    socket.on(WsMsgTypeEnum.roomLiveing, (data) => {
      console.log(
        new Date().toLocaleString(),
        socket.id,
        '收到管理员开始直播',
        data
      );
      socket.to(data.roomId).emit(WsMsgTypeEnum.roomLiveing, data);
    });

    // 收到管理员不在直播
    socket.on(WsMsgTypeEnum.roomNoLive, (data) => {
      console.log(new Date().toLocaleString(), '收到管理员不在直播', data);
      socket.to(data.roomId).emit(WsMsgTypeEnum.roomNoLive, data);
    });

    // 收到offer
    socket.on(WsMsgTypeEnum.offer, (data: IOffer) => {
      console.log(
        new Date().toLocaleString(),
        socket.id,
        '收到offer',
        data.roomId,
        data.socketId
      );
      socket.to(data.roomId).emit(WsMsgTypeEnum.offer, data);
    });

    // 收到answer
    socket.on(WsMsgTypeEnum.answer, (data) => {
      console.log(
        new Date().toLocaleString(),
        socket.id,
        '收到answer',
        data.roomId,
        data.socketId
      );
      socket.to(data.roomId).emit(WsMsgTypeEnum.answer, data);
    });

    // 收到candidate
    socket.on(WsMsgTypeEnum.candidate, (data) => {
      console.log(
        new Date().toLocaleString(),
        socket.id,
        '收到candidate',
        data.roomId,
        data.socketId
      );
      socket.to(data.roomId).emit(WsMsgTypeEnum.candidate, data);
    });

    // 断开连接中
    socket.on(WsConnectStatusEnum.disconnecting, async (reason) => {
      console.log(
        new Date().toLocaleString(),
        socket.id,
        '===断开连接中===',
        reason
      );
      const liveUser = await getAllLiveUser(io);
      io.emit(WsMsgTypeEnum.liveUser, liveUser);
      const res = await DBController.searchLiveRoomBySocketId(socket.id);
      if (res.count) {
        DBController.deleteLiveRoom(res.rows[0].get().socketId);
      }
      console.log(
        new Date().toLocaleString(),
        socket.id,
        '===断开连接中===',
        reason
      );
    });

    // 已断开连接
    socket.on(WsConnectStatusEnum.disconnect, async (reason) => {
      console.log(
        new Date().toLocaleString(),
        socket.id,
        '===已断开连接===',
        reason
      );
      const liveUser = await getAllLiveUser(io);
      io.emit(WsMsgTypeEnum.liveUser, liveUser);
      io.emit(WsMsgTypeEnum.leaved, { socketId: socket.id });
      const res = await DBController.searchLiveRoomBySocketId(socket.id);
      if (res.count) {
        DBController.deleteLiveRoom(res.rows[0].get().socketId);
      }
      console.log(
        new Date().toLocaleString(),
        socket.id,
        '===已断开连接===',
        reason
      );
    });
  });
};
