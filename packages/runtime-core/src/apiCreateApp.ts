export function createAppAPI(render) {
  return function (rootComponent, rootProps) {
    const app = {
      mount(container) {
        debugger;
        console.log(container);
      },
    };
    return app;
  };
}
