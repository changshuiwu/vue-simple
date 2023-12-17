import { hasOwn } from "@vue/shared";

export const PublicInstanceProxyHandler = {
  get({ _: instance }, key) {
    if (key[0] === "$") return;
    const { props, setupState, data } = instance;
    if (hasOwn(setupState, key)) {
      return setupState[key];
    } else if (hasOwn(props, key)) {
      return props[key];
    } else if (hasOwn(data, key)) {
      return data[key];
    }
  },
  set({ _: instance }, key, value) {
    const { props, setupState, data } = instance;
    if (hasOwn(setupState, key)) {
      setupState[key] = value;
    } else if (hasOwn(props, key)) {
      props[key] = value;
    } else if (hasOwn(data, key)) {
      data[key] = value;
    }
  },
};
