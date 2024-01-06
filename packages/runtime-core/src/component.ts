import { isFunction, isObject } from "@vue/shared";
import { PublicInstanceProxyHandler } from "./componentPublicInstance";
import { ShapeFlags } from "./shapeFlag";

export function createComponentInstance(vnode) {
  const { type } = vnode;
  const instance = {
    vnode,
    type,
    props: {},
    attrs: {},
    slots: {},
    setupState: {},
    isMounted: false,
    ctx: {},
    data: {},
    render: null,
  };
  instance.ctx = { _: instance };
  return instance;
}

export function setupComponent(instance) {
  const { props, children, shapeFlag } = instance.vnode;

  instance.props = props;
  instance.children = children;

  if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    setupStateFulComponent(instance);
  }
}

export let currentInstance = null;

export const setCurrentInstance = (instance) => {
  currentInstance = instance;
};
export const getCurrentInstance = () => currentInstance;

function setupStateFulComponent(instance) {
  instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandler as any);
  const Component = instance.type;
  const { setup } = Component;

  if (setup) {
    currentInstance = instance;
    const setupContext = createContext(instance);
    const setupResult = setup(instance.props, setupContext);

    handleSetupResult(instance, setupResult);
    currentInstance = null;
  } else {
    finishComponentSetup(instance);
  }
}

function handleSetupResult(instance, setupResult) {
  if (isFunction(setupResult)) {
    instance.render = setupResult;
  } else if (isObject(setupResult)) {
    instance.setupState = setupResult;
  }
  finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
  const Component = instance.type;
  if (!instance.render) {
    // instance.render = render;
    instance.render = Component.render;
  }
}

function createContext(instance) {
  return {
    attrs: instance.attrs,
    props: instance.props,
    slots: instance.slots,
    emit: () => {},
    expose: () => {},
  };
}
