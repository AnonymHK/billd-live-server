import Router from 'koa-router';

import srsController from '@/controller/srs.controller';

const srsRouter = new Router({ prefix: '/srs' });

srsRouter.post('/rtcV1Publish', srsController.rtcV1Publish);

srsRouter.post('/rtcV1Play', srsController.rtcV1Play);

srsRouter.get('/apiV1Streams', srsController.apiV1StreamsGet);

srsRouter.get('/apiV1Clients', srsController.apiV1ClientsGet);

srsRouter.post('/apiV1StreamsDel', srsController.apiV1StreamsDel);

// SRS http回调
srsRouter.post('/on_publish', srsController.onPublish);

// SRS http回调
srsRouter.post('/on_play', srsController.onPlay);

// SRS http回调
srsRouter.post('/on_unpublish', srsController.onUnpublish);

export default srsRouter;
