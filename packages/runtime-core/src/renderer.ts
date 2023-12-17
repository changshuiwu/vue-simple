import { createAppAPI } from "./apiCreateApp";
import { createComponentInstance, setupComponent } from "./component";
import { ShapeFlags } from "./shapeFlag";

export function createRenderer(rendererOptions) {
  const setRenderEffect = function () {};
  const mountComponent = function (initialVnode, container) {
    // 1、根据虚拟节点创造一个实例
    const instance = (initialVnode.component =
      createComponentInstance(initialVnode));
    //   2、调用setup
    setupComponent(instance);
    // 3
    setRenderEffect();
  };
  const processComponent = function (n1, n2, container) {
    if (n1 == null) {
      // 挂载
      mountComponent(n2, container);
    } else {
      // 更新
    }
  };
  const patch = function (n1, n2, container) {
    const { shapeFlag } = n2;
    if (shapeFlag & ShapeFlags.ELEMENT) {
      console.log("元素");
    } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      processComponent(n1, n2, container);
    }
  };
  const render = function (vnode, container) {
    patch(null, vnode, container);
  };
  return {
    createApp: createAppAPI(render),
  };
}
