import { execSync, spawn, spawnSync } from 'child_process';

import { SERVER_LIVE } from '@/config/secret';
import { PROJECT_ENV, PROJECT_ENV_ENUM } from '@/constant';
import { initUser } from '@/init/initUser';
import { LiveRoomTypeEnum } from '@/interface';
import liveService from '@/service/live.service';
import liveRoomService from '@/service/liveRoom.service';
import { chalkERROR, chalkSUCCESS, chalkWARN } from '@/utils/chalkTip';
import { tencentcloudUtils } from '@/utils/tencentcloud';

function ffmpegIsInstalled() {
  const res = spawnSync('ffmpeg', ['-version']);
  if (res.status !== 0) {
    return false;
  }
  return true;
}

async function addLive({
  live_room_id,
  user_id,
  localFile,
  cover_img,
  cdn,
  devInitFFmpeg,
}: {
  live_room_id: number;
  user_id: number;
  localFile: string;
  cover_img: string;
  cdn: number; // 1:使用cdn;2:不使用cdn
  devInitFFmpeg: boolean;
}) {
  async function main({ remoteFlv }: { remoteFlv: string }) {
    try {
      const getOldProcess = `ps aux | grep ffmpeg | grep -v grep | grep '${remoteFlv}' | awk '{print $2}'`;
      const res = execSync(getOldProcess);
      const oldProcess = res.toString().trim();
      if (oldProcess) {
        const killOldFFmpeg = `kill -9 ${oldProcess}`;
        execSync(killOldFFmpeg);
      }
    } catch (error) {
      console.log(error);
    }

    // -loglevel quiet不输出log

    const ffmpeg = spawn(`ffmpeg`, [
      '-loglevel',
      'quiet',
      '-readrate', // 以本地帧频读数据，主要用于模拟捕获设备
      '1',
      '-stream_loop', // 设置输入流应循环的次数。Loop 0表示无循环，loop-1表示无限循环。
      '-1',
      '-i', // 输入
      localFile,
      '-vcodec', // 只拷贝视频部分，不做编解码。
      'copy',
      '-acodec', // / 只拷贝音频部分，不做编解码。
      'copy',
      '-f', // 强制输入或输出文件格式。通常会自动检测输入文件的格式，并根据输出文件的文件扩展名猜测格式，因此在大多数情况下不需要此选项。
      'flv',
      remoteFlv,
    ]);
    // `ffmpeg -stream_loop -1 -re -i /Users/huangshuisheng/Desktop/hss/galaxy-s10/billd-live-server/src/video/fddm_nswwydja.mp4 -c copy -f flv 'rtmp://localhost/livestream/roomId___5?token=1331834ac9304933baa41a5841657193'`;
    const { pid } = ffmpeg;
    console.log(chalkWARN('ffmpeg进程pid'), pid);
    console.log(chalkWARN('ffmpeg命令'), ffmpeg);
    const isLiveing = await liveService.findByRoomId(live_room_id);
    if (!isLiveing) {
      liveService.create({
        live_room_id,
        user_id,
        ffmpeg_pid: pid,
        socket_id: `${live_room_id}`,
        track_audio: 1,
        track_video: 1,
      });
    }
    liveRoomService.update({
      id: live_room_id,
      cover_img,
      type: LiveRoomTypeEnum.system,
    });
  }
  if (PROJECT_ENV === PROJECT_ENV_ENUM.development) {
    if (devInitFFmpeg) {
      console.log(devInitFFmpeg, 'devInitFFmpegdevInitFFmpeg');
      const result = await liveRoomService.findKey(live_room_id);
      const rtmptoken = result?.key;
      await main({
        remoteFlv: `${SERVER_LIVE.PushDomain}/${
          SERVER_LIVE.AppName
        }/roomId___${live_room_id}?token=${rtmptoken!}`,
      });
    } else {
      await liveService.deleteByLiveRoomId(live_room_id);
    }
  } else if (cdn === 1) {
    await tencentcloudUtils.dropLiveStream({
      roomId: live_room_id,
    });
    const { res, err } = await tencentcloudUtils.queryLiveStream({
      roomId: live_room_id,
    });
    if (err) return;
    if (res) {
      const remoteFlv = tencentcloudUtils.getPushUrl({
        roomId: live_room_id,
      });
      await main({ remoteFlv });
    }
  } else if (cdn === 2) {
    const result = await liveRoomService.findKey(live_room_id);
    const rtmptoken = result?.key;
    await main({
      remoteFlv: `${SERVER_LIVE.PushDomain}/${
        SERVER_LIVE.AppName
      }/roomId___${live_room_id}?token=${rtmptoken!}`,
    });
  }
}

export const initFFmpeg = async (init = true) => {
  if (!init) return;
  const flag = ffmpegIsInstalled();
  if (flag) {
    console.log(chalkWARN('ffmpeg已安装，开始运行ffmpeg推流'));
  } else {
    console.log(chalkERROR('未安装ffmpeg！'));
    return;
  }
  try {
    try {
      // const fullCMD = `kill -9 $(ps aux | grep ffmpeg | grep -v grep | awk '{print $2}')`;
      const getOldProcess = `ps aux | grep ffmpeg | grep -v grep | awk '{print $2}'`;
      const res = execSync(getOldProcess);
      const oldProcess = res.toString().trim();
      if (oldProcess) {
        const killOldFFmpeg = `kill -9 $(${getOldProcess})`;
        execSync(killOldFFmpeg);
      }
    } catch (error) {
      console.log(error);
    }
    const queue: any[] = [];
    Object.keys(initUser).forEach((item) => {
      queue.push(
        addLive({
          live_room_id: initUser[item].live_room.id,
          user_id: initUser[item].id,
          localFile: initUser[item].live_room.localFile,
          cover_img: initUser[item].live_room.cover_img,
          cdn: initUser[item].live_room.cdn,
          devInitFFmpeg: initUser[item].live_room.devInitFFmpeg,
        })
      );
    });
    await Promise.all(queue);
    console.log(chalkSUCCESS(`FFmpeg推流成功！`));

    // const child = exec(ffmpeg, (error, stdout, stderr) => {
    //   console.log(
    //     chalkSUCCESS(`初始化FFmpeg成功！`)
    //   );
    //   console.log('error', error);
    //   console.log('stdout', stdout);
    //   console.log('stderr', stderr);
    // });
    // child.on('exit', () => {
    //   console.log(
    //     chalkINFO(`initFFmpeg子进程退出了`)
    //   );
    // });
    // child.on('error', () => {
    //   console.log(
    //     chalkINFO(`initFFmpeg子进程错误`)
    //   );
    // });
  } catch (error) {
    console.log(chalkERROR(`FFmpeg推流错误！`));
    console.log(error);
  }
};
