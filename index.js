// @flow
import _ from 'lodash';
import Koa from 'koa';
import path from 'path';
import Pug from 'koa-pug';
import Router from 'koa-router';
import koaLogger from 'koa-logger';
import serve from 'koa-static';
import middleware from 'koa-webpack';
import bodyParser from 'koa-bodyparser';
import session from 'koa-generic-session';
import flash from 'koa-flash-simple';
import Rollbar from 'rollbar';
import methodOverride from 'koa-methodoverride';

import webpackConfig from './webpack.config.babel';
import addRoutes from './routes';
import container from './container';

let rollbar = {};

if (process.env.NODE_ENV === 'production') {
  rollbar = new Rollbar(process.env.ROLLBAR_TOKEN);
}

export default () => {
  const app = new Koa();

  app.keys = ['some secret hurr'];
  app.use(session(app));
  app.use(flash());
  app.use(async (ctx, next) => {
    ctx.state = {
      flash: ctx.flash,
      userId: ctx.session.userId,
      userAvatar: ctx.session.userAvatar,
      isSignedIn: () => ctx.session.userId !== undefined,
    };
    await next();
  });

  app.use(async (ctx, next) => {
    try {
      await next();
      if (ctx.response.status === 404 && !ctx.response.body) {
        ctx.throw(404);
      }
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.body = err.message;
      ctx.app.emit('error', err, ctx);

      ctx.render('error/index', {
        status: ctx.status,
        message: ctx.message,
      });
    }
  });

  app.on('error', (err) => {
    if (process.env.NODE_ENV === 'production') {
      rollbar.log(err);
    }
    console.log(err);
  });

  app.use(bodyParser());
  app.use(methodOverride('_method'));
  app.use(serve(path.join(__dirname, 'public')));

  if (process.env.NODE_ENV !== 'production') {
    app.use(middleware({
      config: webpackConfig,
    }));
  }

  app.use(koaLogger());

  const router = new Router();

  addRoutes(router, container);
  app.use(router.allowedMethods());
  app.use(router.routes());

  const pug = new Pug({
    viewPath: path.join(__dirname, 'views'),
    noCache: process.env.NODE_ENV === 'development',
    debug: true,
    pretty: true,
    compileDebug: true,
    locals: [],
    basedir: path.join(__dirname, 'views'),
    helperPath: [
      { _ },
      { urlFor: (...args) => router.url(...args) },
    ],
  });
  pug.use(app);

  return app;
};
