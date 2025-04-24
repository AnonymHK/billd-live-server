export const PROD_DOMAIN = 'hsslive.cn';

export const QQ_CLIENT_ID = 101958191;
export const QQ_OAUTH_URL =
  'https://graph.qq.com/oauth2.0/authorize?response_type=code&';

export const GITHUB_CLIENT_ID = '8c2c07b574ae70ecfa9d';
export const GITHUB_OAUTH_URL = 'https://github.com/login/oauth/authorize?';

export const WECHAT_GZH_APPID = `wxbd243c01ac5ad1b7`; // 公众号
export const WECHAT_GZH_OAUTH_URL = `https://open.weixin.qq.com/connect/oauth2/authorize?`;

export const TENCENTCLOUD_APPID = 1305322458; // 腾讯云APPID
export const TENCENTCLOUD_COS = {
  [`res-${TENCENTCLOUD_APPID}`]: {
    url: `https://tencentcos-res.${PROD_DOMAIN}`,
    Bucket: `res-${TENCENTCLOUD_APPID}`,
    Region: 'ap-guangzhou',
    StorageClass: 'STANDARD',
    prefix: {
      'billd-live/client/common/': 'billd-live/client/common/',
      'billd-live/client/img/': 'billd-live/client/img/',
      'billd-live/client/msg-img/': 'billd-live/client/msg-img/',
    },
  },
};
export const TENCENTCLOUD_CHAT_SDK_APPID = 1400815419; // 腾讯云即时通讯IM SDKAppID

export const QINIU_KODO = {
  hssblog: {
    domain: `resource.${PROD_DOMAIN}`,
    url: `https://resource.${PROD_DOMAIN}`,
    bucket: 'hssblog',
    prefix: {
      'billd-live/image/': 'billd-live/image/',
      'billd-live/msg-image/': 'billd-live/msg-image/',
      'billd-live/live-preview/': 'billd-live/live-preview/',
    },
  },
  'hss-backup': {
    domain: `backup.${PROD_DOMAIN}`,
    url: `http://backup.${PROD_DOMAIN}`,
    bucket: 'hss-backup',
    prefix: {
      'billd-live/mysql/': 'billd-live/mysql/',
    },
  },
};

export enum REDIS_DATABASE {
  blog,
  live,
}
