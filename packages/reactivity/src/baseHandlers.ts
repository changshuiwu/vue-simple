import {
  extend,
  hasChanged,
  hasOwn,
  isArray,
  isIntegerKey,
  isObject,
} from "@vue/shared";
import { reactive, readonly } from ".";
import { TrackOpTypes, TriggerOpTypes } from "./operators";
import { track, trigger } from "./effect";

function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, recevier) {
    const res = Reflect.get(target, key, recevier);

    if (!isReadonly && hasOwn(target, key)) {
      // 收集依赖
      track(target, TrackOpTypes.GET, key);
    }

    if (shallow) {
      return res;
    }

    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res);
    }
    return res;
  };
}
function createSetter(shallow = false) {
  return function set(target, key, value, recevier) {
    const oldValue = target[key];

    let hadKey =
      isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key);

    const result = Reflect.set(target, key, value, recevier);

    if (!hadKey) {
      // 新增
      trigger(target, TriggerOpTypes.ADD, key, value);
    } else if (hasChanged(oldValue, value)) {
      // 修改
      trigger(target, TriggerOpTypes.SET, key, value, oldValue);
    }

    return result;
  };
}

const get = createGetter();
const shallowGet = createGetter(false, true);
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);

const set = createSetter();
const shallowSet = createGetter(true);

const readonlyObj = {
  set: (target, key) => {
    console.error(`invalid ${key} is set`);
  },
};
export const mutableHandlers = {
  get,
  set,
};
export const shallowReactiveHandlers = {
  get: shallowGet,
  set: shallowSet,
};
export const readonlyHandlers = extend(
  {
    get: readonlyGet,
  },
  readonlyObj
);
export const shallowReadonlyHandlers = extend(
  {
    get: shallowReadonlyGet,
  },
  readonlyObj
);
