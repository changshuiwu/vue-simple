import { isObject, isString } from "@vue/shared";
import { ShapeFlags } from "./shapeFlag";

export function createVNode(type, props, children = null) {
  // 根据type 确定生成不同的虚拟节点
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : isObject(type)
    ? ShapeFlags.FUNCTIONAL_COMPONENT
    : 0;
  const vnode = {
    __v_isVnode: true,
    type,
    props,
    children,
    el: null,
    key: props && props.key,
    shapeFlag,
  };
  return vnode;
}
