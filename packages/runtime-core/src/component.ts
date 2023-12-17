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

function setupStateFulComponent(instance) {
  instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandler as any);
  const Component = instance.type;
  const { setup, render } = Component;

  const setupContext = createContext(instance);
  setup(instance.props, setupContext);

  render && render(instance.ctx);
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
