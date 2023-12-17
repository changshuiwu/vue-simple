import { isArray, isObject, isString } from "@vue/shared";
import { ShapeFlags } from "./shapeFlag";

export function createVNode(type, props, children = null) {
  // 根据type 确定生成不同的虚拟节点
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT
    : 0;
  const vnode = {
    __v_isVnode: true,
    type,
    props,
    children,
    el: null,
    component: null, // 组件对应的实例
    key: props && props.key,
    shapeFlag,
  };
  normalizeChildren(vnode, children);
  return vnode;
}

function normalizeChildren(vnode, children) {
  let type = 0;
  if (children == null) {
    children = null;
  } else if (isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN;
  } else {
    type = ShapeFlags.TEXT_CHILDREN;
  }
  vnode.shapeFlag |= type;
}
