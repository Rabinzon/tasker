import { User } from '../models';
import { buildFormObj, requiredAuth } from '../lib/';

export default (router) => {
  router
    .get('profile', '/profile/edit', requiredAuth, async (ctx) => {
      const user = await User.findById(ctx.state.userId);
      ctx.render('users/settings', { f: buildFormObj(user), avatar: user.avatar });
    })
    .delete('profile', '/profile/edit', requiredAuth, async (ctx) => {
      const user = await User.findById(ctx.state.userId);
      await user.destroy();
      ctx.session = {};
      ctx.flash.set({ msg: 'User has been deleted' });
      ctx.redirect(router.url('root'));
    })
    .post('profile', '/profile/edit', requiredAuth, async (ctx) => {
      const { form } = ctx.request.body;
      const user = await User.findById(ctx.state.userId);

      await user.update(form);
      ctx.flash.set({ msg: 'User has been updated', level: 'success' });
      ctx.redirect(router.url('root'));
    });
};
