import { extend } from "@vue/shared";
import { nodeOps } from "./nodeOps";
import { patchProp } from "./patchProp";

const rendererOptions = extend({ patchProp }, nodeOps);

export function createApp(rootComponent, rootProps = null) {
  const app: any = {};

  app.mount = function (container) {
    container = nodeOps.querySelector(container);
    container.innerHTML = "";
  };

  return app;
}
