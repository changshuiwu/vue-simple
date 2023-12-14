import { createAppAPI } from "./apiCreateApp";

export function createRenderer(rendererOptions) {
  const render = function () {};
  return {
    createApp: createAppAPI(render),
  };
}
