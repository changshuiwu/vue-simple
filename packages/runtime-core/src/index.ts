export * from "@vue/reactivity";

export { createRenderer } from "./renderer";
export { h } from "./h";

export { getCurrentInstance } from "./component";

export {
  onBeforeMount,
  onBeforeUpdate,
  onMounted,
  onUpdated,
} from "./apiLifecycle";
