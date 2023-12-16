const isObject = (value) => value !== null && typeof value === "object";
const extend = Object.assign;
const isString = (value) => typeof value === "string";

const nodeOps = {
    // createElement 不同的平台创建的不同
    createElement: (tagName) => document.createElement(tagName),
    remove: (child) => {
        const parent = child.parentNode;
        if (parent) {
            parent.removeChild(child);
        }
    },
    insert: (child, parent, anchor = null) => {
        parent.insertBefore(child, anchor);
    },
    querySelector: (selector) => document.querySelector(selector),
    setElementText: (el, text) => (el.textContent = text),
    //   文本
    createText: (text) => document.createTextNode(text),
    setText: (node, text) => (node.nodeValue = text),
};

const patchAttr = (el, key, value) => {
    if (value == null) {
        el.removeAttribute(key);
    }
    else {
        el.setAttribute(key, value);
    }
};

const patchClass = (el, nextValue) => {
    if (nextValue == null) {
        nextValue = "";
    }
    el.className = nextValue;
};

const patchEvent = (el, key, value) => {
    // 对函数的缓存
    const invokers = el._vei || (el._vei = {});
    const exists = invokers[key]; // 取出缓存的事件
    if (value && exists) {
        // 需要更新已存在的函数
        exists.value = value;
    }
    else {
        const eventName = key.slice(2).toLowerCase(); // 取出函数名createInvoker(value)
        if (value) {
            // 初次绑定
            const invoker = (invokers[key] = createInvoker(value));
            el.addEventListener(eventName, invoker);
        }
        else {
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

const patchStyle = (el, prev, next) => {
    const style = el.style;
    if (next == null) {
        el.removeAttribute("style");
    }
    else {
        // 老的有， 新的没有
        if (prev) {
            for (const key in prev) {
                if (next[key] == null) {
                    style[key] = "";
                }
            }
        }
        // 添加新的
        for (const key in next) {
            style[key] = next[key];
        }
    }
};

const patchProp = (el, key, prevValue, nextValue) => {
    switch (key) {
        case "class":
            patchClass(el, nextValue);
            break;
        case "style":
            patchStyle(el, prevValue, nextValue);
            break;
        default:
            if (/^on[^a-z]/.test(key)) {
                patchEvent(el, key, nextValue);
            }
            else {
                patchAttr(el, key, nextValue);
            }
            break;
    }
};

function createVNode(type, props, children = null) {
    // 根据type 确定生成不同的虚拟节点
    const shapeFlag = isString(type)
        ? 1 /* ShapeFlags.ELEMENT */
        : isObject(type)
            ? 2 /* ShapeFlags.FUNCTIONAL_COMPONENT */
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

function createAppAPI(render) {
    return function (rootComponent, rootProps) {
        const app = {
            _props: rootProps,
            _component: rootComponent,
            _container: null,
            mount(container) {
                // 创建一个vnode
                const vnode = createVNode(rootComponent, rootProps);
                render(vnode, container);
                app._container = container;
            },
        };
        return app;
    };
}

function createRenderer(rendererOptions) {
    const render = function () { };
    return {
        createApp: createAppAPI(render),
    };
}

extend({ patchProp }, nodeOps);
function createApp(rootComponent, rootProps = null) {
    const app = createRenderer().createApp(rootComponent, rootProps);
    const { mount } = app;
    app.mount = function (container) {
        container = nodeOps.querySelector(container);
        container.innerHTML = "";
        mount(container);
    };
    return app;
}

export { createApp };
//# sourceMappingURL=runtime-dom.esm-bundler.js.map
