import { createVNode } from "./vnode";

export function createAppAPI(render) {
  return function (rootComponent, rootProps) {
    const app = {
      _props: rootProps,
      _component: rootComponent,
      _container: null,
      mount(container) {
        // 创建一个vnode
        const vnode = createVNode(rootComponent, rootProps);

        render(vnode, container);
        app._container = container;
      },
    };
    return app;
  };
}
