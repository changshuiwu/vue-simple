import { effect } from "@vue/reactivity";
import { createAppAPI } from "./apiCreateApp";
import { createComponentInstance, setupComponent } from "./component";
import { ShapeFlags } from "./shapeFlag";
import { Text, normalizeVNode } from "./vnode";
import { queueJob } from "./scheduler";
import { invokeArrayfns } from "./apiLifecycle";

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
        const { bm, m, bu, u } = instance;
        if (!instance.isMounted) {
          if (bm) {
            invokeArrayfns(bm);
          }
          // 初次渲染
          let proxyToUse = instance.proxy;
          const subTree = (instance.subTree = instance.render.call(
            proxyToUse,
            proxyToUse
          ));
          patch(null, subTree, container);
          instance.isMounted = true;
          if (m) {
            invokeArrayfns(m);
          }
        } else {
          if (bu) {
            invokeArrayfns(bu);
          }
          // 更新
          const prevTree = instance.subTree;
          let proxyToUse = instance.proxy;
          const nextTree = instance.render.call(proxyToUse, proxyToUse);

          patch(prevTree, nextTree, container);
          if (u) {
            invokeArrayfns(u);
          }
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
  const patchKeyedChildren = (c1, c2, container) => {
    let i = 0;
    let e1 = c1.length - 1;
    let e2 = c2.length - 1;

    // sync from start
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      if (isSameVnodeType(n1, n2)) {
        patch(n1, n2, container);
      } else {
        break;
      }
      i++;
    }

    // sync from end
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSameVnodeType(n1, n2)) {
        patch(n1, n2, container);
      } else {
        break;
      }

      e1--;
      e2--;
    }
    // i 大于 e1，说明有新增的元素
    if (i > e1) {
      // 说明老的少， 新的多
      if (i <= e2) {
        // 说明这一段是新增的元素
        //  需要确定是向前插入、还是向后插入
        const nextPos = e2 + 1;
        const anchor = nextPos < c2.length ? c2[nextPos].el : null;
        while (i <= e2) {
          patch(null, c2[i], container, anchor);
          i++;
        }
      }
    } else if (i > e2) {
      while (i <= e1) {
        unmount(c1[i]);
        i++;
      }
    } else {
      // unkown
      let s1 = i;
      let s2 = i;

      const keyToNewIndexMap = new Map();

      for (i = s2; i <= e2; i++) {
        const childVnode = c2[i];
        keyToNewIndexMap.set(childVnode.key, i);
      }

      const toBePatched = e2 - s2 + 1;
      const newIndexToOldIndexMap = new Array(toBePatched).fill(0); // 使用数组的下标作为key， 去映射老的下标

      for (i = s1; i <= e1; i++) {
        const oldVnode = c1[i];
        let newIndex = keyToNewIndexMap.get(oldVnode.key);

        if (newIndex === undefined) {
          unmount(oldVnode);
        } else {
          newIndexToOldIndexMap[newIndex - s2] = i + 1;
          patch(oldVnode, c2[newIndex], container);
        }
      }

      const inscreaingNewINdex = getSequeue(newIndexToOldIndexMap);
      let j = inscreaingNewINdex.length - 1;
      for (i = toBePatched - 1; i >= 0; i--) {
        // 倒序插入， 现找到最后一个元素的索引
        let currentIndex = s2 + i;
        const currentNode = c2[currentIndex];
        const anchor =
          currentIndex + 1 < c2.length ? c2[currentIndex + 1].el : null;
        if (newIndexToOldIndexMap[i] === 0) {
          // 说明没有被patched过，需要新增
          patch(null, currentNode, container, anchor);
        } else {
          if (i !== inscreaingNewINdex[j]) {
            hostInsert(currentNode.el, container, anchor);
          } else {
            j--;
          }
        }
      }
    }
  };
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
    } else {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 前后节点对比
          patchKeyedChildren(c1, c2, container);
        } else {
          // 说明 这里 现在是null
          unmountChildren(c1);
        }
      } else {
        // 上一次是文本,需要清除文本， 然后可能需要挂载
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(container, "");
        }

        // 这次是元素
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2, container);
        }
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

function getSequeue(arr: number[]) {
  const p = arr.slice();
  const len = arr.length;
  const result = [0];
  let i, j, u, v, c;

  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1];
      if (arrI > arr[j]) {
        p[i] = j;
        result.push(i);
        continue;
      }

      u = 0;
      v = result.length - 1;

      while (u < v) {
        c = (u + v) >> 1;

        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }

      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }

  u = result.length;
  v = result[u - 1];

  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }

  return result;
}
