import { currentInstance, setCurrentInstance } from "./component";

const enum LifeCycleHooks {
  BEFORE_MOUNT = "bm",
  MOUNTED = "m",
  BEFORE_UPDATE = "bu",
  UPDATED = "u",
}

const injectHook = (type, hook, target) => {
  if (!target) {
    return console.warn(`in execute in setup`);
  } else {
    const hooks = target[type] || (target[type] = []);

    const wrap = () => {
      setCurrentInstance(target);
      hook.call(target);
      setCurrentInstance(null);
    };
    hooks.push(wrap);
  }
};
export const createHook =
  (lifecycle) =>
  (hook, target = currentInstance) => {
    injectHook(lifecycle, hook, target);
  };
export const onBeforeMount = createHook(LifeCycleHooks.BEFORE_MOUNT);
export const onMounted = createHook(LifeCycleHooks.MOUNTED);
export const onBeforeUpdate = createHook(LifeCycleHooks.BEFORE_UPDATE);
export const onUpdated = createHook(LifeCycleHooks.UPDATED);

export const invokeArrayfns = (fns) => {
  for (let i = 0; i < fns.length; i++) {
    fns[i]();
  }
};
