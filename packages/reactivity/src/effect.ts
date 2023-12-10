import { isArray, isIntegerKey } from "@vue/shared";
import { TriggerOpTypes } from "./operators";

export const effect = function (fn, options: any = {}) {
  const effect = createReactiveEffect(fn, options);

  if (!options.lazy) {
    effect();
  }

  return effect;
};

let uid = 0;
let activeEffect;
const effectStack = [];
function createReactiveEffect(fn, options) {
  const effect = function reactiveEffect() {
    if (!effectStack.includes(effect)) {
      try {
        activeEffect = effect;
        effectStack.push(effect);
        return fn(); // 函数开始执行， 就会执行get取值方法
      } finally {
        effectStack.pop();
        activeEffect = effectStack[effectStack.length - 1];
      }
    }
  };

  effect.id = uid++;
  effect._isEffect = true;
  effect.raw = fn;
  effect.options = options;

  return effect;
}

const targetMap = new Map();
export function track(target, type, key) {
  if (activeEffect === undefined) return;

  let depsMap = targetMap.get(target);

  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }

  let deps = depsMap.get(key);

  if (!deps) {
    depsMap.set(key, (deps = new Set()));
  }

  if (!deps.has(activeEffect)) {
    deps.add(activeEffect);
  }
}

export function trigger(target, type, key, newValue?, oldValue?) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  const effects = new Set();

  const add = (effectsToAdd) => {
    if (effectsToAdd) {
      effectsToAdd.forEach((effect) => {
        effects.add(effect);
      });
    }
  };

  // 数组 并且是修改的数组的length属性
  if (isArray(target) && key === "length") {
    depsMap.forEach((dep, key) => {
      if (key === "length" || Number(key) > newValue) {
        add(dep);
      }
    });
  } else {
    if (key !== undefined) {
      add(depsMap.get(key));
    }

    switch (type) {
      case TriggerOpTypes.ADD:
        if (isArray(target) && isIntegerKey(key)) {
          add(depsMap.get("length"));
        }
    }
  }

  effects.forEach((effect: any) => {
    if (effect.options.schedular) {
      effect.options.schedular(effect);
    } else {
      effect();
    }
  });
}
