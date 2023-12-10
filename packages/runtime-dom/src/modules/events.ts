export const patchEvent = (el, key, value) => {
  // 对函数的缓存

  const invokers = el._vei || (el._vei = {});

  const exists = invokers[key]; // 取出缓存的事件

  if (value && exists) {
    // 需要更新已存在的函数
    exists.value = value;
  } else {
    const eventName = key.slice(2).toLowerCase(); // 取出函数名createInvoker(value)

    if (value) {
      // 初次绑定
      const invoker = (invokers[key] = createInvoker(value));
      el.addEventListener(eventName, invoker);
    } else {
      el.removeEventListener(eventName, exists);
      invokers[key] = undefined;
    }
  }
};

function createInvoker(value) {
  const invoker = (e) => {
    invoker.value(e);
  };
  invoker.value = value;
  return invoker;
}
