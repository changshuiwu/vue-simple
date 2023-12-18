import { effect } from "@vue/reactivity";
import { createAppAPI } from "./apiCreateApp";
import { createComponentInstance, setupComponent } from "./component";
import { ShapeFlags } from "./shapeFlag";
import { Text, normalizeVNode } from "./vnode";
import { queueJob } from "./scheduler";

export function createRenderer(rendererOptions) {
  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    setElementText: hostSetElementText,
    nextSibling: hostNextSibling,
  } = rendererOptions;
  // 组件------------------------------
  const setRenderEffect = function (instance, container) {
    instance.update = effect(
      function componentEffect() {
        if (!instance.isMounted) {
          // 初次渲染
          let proxyToUse = instance.proxy;
          const subTree = (instance.subTree = instance.render.call(
            proxyToUse,
            proxyToUse
          ));
          patch(null, subTree, container);
          instance.isMounted = true;
        } else {
          // 更新
          const prevTree = instance.subTree;
          let proxyToUse = instance.proxy;
          const nextTree = instance.render.call(proxyToUse, proxyToUse);

          patch(prevTree, nextTree, container);
        }
      },
      {
        scheduler: queueJob,
      }
    );
  };
  const mountComponent = function (initialVnode, container) {
    // 1、根据虚拟节点创造一个实例
    const instance = (initialVnode.component =
      createComponentInstance(initialVnode));
    //   2、调用setup
    setupComponent(instance);
    // 3
    setRenderEffect(instance, container);
  };

  const processComponent = function (n1, n2, container) {
    if (n1 == null) {
      // 挂载
      mountComponent(n2, container);
    } else {
      // 更新
    }
  };
  //   ---------------------组价------------------------

  // 元素------------------------------------------
  const mountChildren = function (childen, container) {
    for (let child of childen) {
      child = normalizeVNode(child);
      patch(null, child, container);
    }
  };
  const mountElement = function (initialVnode, container, anchor = null) {
    const { type, props = {}, shapeFlag, children } = initialVnode;

    const el = (initialVnode.el = hostCreateElement(type));

    for (const key in props) {
      hostPatchProp(el, key, null, props[key]);
    }

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children);
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el);
    }

    hostInsert(el, container, anchor);
  };
  const patchProps = (oldProps, newProps, el) => {
    if (oldProps !== newProps) {
      for (const key in newProps) {
        const prev = oldProps[key];
        const next = newProps[key];
        if (prev !== next) {
          hostPatchProp(el, key, prev, next);
        }
      }
      for (let key in oldProps) {
        if (!(key in newProps)) {
          hostPatchProp(el, key, oldProps[key], null);
        }
      }
    }
  };
  const unmountChildren = (children) => {
    for (let i = 0; i < children.length; i++) {
      unmount(children[i]);
    }
  };
  const patchChildren = (n1, n2, container) => {
    const c1 = n1.children;
    const c2 = n2.children;
    const prevShapeFlag = n1.shapeFlag;
    const shapeFlag = n2.shapeFlag;

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // c1是组件 需要卸载移除
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1);
      }
      if (c1 !== c2) {
        hostSetElementText(container, c2);
      }
    }
  };
  const patchElement = (n1, n2, container) => {
    // 节点相同
    let el = (n2.el = n1.el);
    // 更新属性
    const oldProps = n1.props || {};
    const newProps = n2.props || {};

    patchProps(oldProps, newProps, el);

    patchChildren(n1, n2, el);
  };
  const processElement = function (n1, n2, container, anchor = null) {
    if (n1 == null) {
      // 挂载
      mountElement(n2, container, anchor);
    } else {
      // 更新
      patchElement(n1, n2, container);
    }
  };

  //   ---------------------------------

  //   处理文本------------------------------
  const processText = function (n1, n2, container) {
    if (n1 == null) {
      hostInsert((n2.el = hostCreateText(n2.children)), container);
    }
  };
  // ----------文本------------

  const isSameVnodeType = (n1, n2) => {
    return n1.type === n2.type && n1.key === n2.key;
  };
  const unmount = (vnode) => {
    hostRemove(vnode.el);
  };
  const patch = function (n1, n2, container, anchor = null) {
    const { shapeFlag, type } = n2;

    if (n1 && !isSameVnodeType(n1, n2)) {
      anchor = hostNextSibling(n1.el);
      // 卸载第一个元素
      unmount(n1);
      n1 = null;
    }
    switch (type) {
      case Text:
        processText(n1, n2, container);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container);
        }
        break;
    }
  };
  const render = function (vnode, container) {
    patch(null, vnode, container);
  };
  return {
    createApp: createAppAPI(render),
  };
}
