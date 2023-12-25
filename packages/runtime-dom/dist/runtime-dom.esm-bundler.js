const isObject = (value) => value !== null && typeof value === "object";
const extend = Object.assign;
const isArray = Array.isArray;
const isFunction = (value) => typeof value === "function";
const isString = (value) => typeof value === "string";
const isIntegerKey = (value) => parseInt(value) + "" === value;
let hasOwnProperty = Object.prototype.hasOwnProperty;
const hasOwn = (target, key) => hasOwnProperty.call(target, key);
const hasChanged = (oldValue, newValue) => oldValue !== newValue;

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
    nextSibling: (node) => node.nextSibling,
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

var TrackOpTypes;
(function (TrackOpTypes) {
    TrackOpTypes[TrackOpTypes["GET"] = 0] = "GET";
})(TrackOpTypes || (TrackOpTypes = {}));
var TriggerOpTypes;
(function (TriggerOpTypes) {
    TriggerOpTypes[TriggerOpTypes["ADD"] = 0] = "ADD";
    TriggerOpTypes[TriggerOpTypes["SET"] = 1] = "SET";
})(TriggerOpTypes || (TriggerOpTypes = {}));

const effect = function (fn, options = {}) {
    const effect = createReactiveEffect(fn, options);
    if (!options.lazy) {
        effect();
    }
    return effect;
};
let uid = 0;
let activeEffect;
const effectStack = [];
function createReactiveEffect(fn, options) {
    const effect = function reactiveEffect() {
        if (!effectStack.includes(effect)) {
            try {
                activeEffect = effect;
                effectStack.push(effect);
                return fn(); // 函数开始执行， 就会执行get取值方法
            }
            finally {
                effectStack.pop();
                activeEffect = effectStack[effectStack.length - 1];
            }
        }
    };
    effect.id = uid++;
    effect._isEffect = true;
    effect.raw = fn;
    effect.options = options;
    return effect;
}
const targetMap = new Map();
function track(target, type, key) {
    if (activeEffect === undefined)
        return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()));
    }
    let deps = depsMap.get(key);
    if (!deps) {
        depsMap.set(key, (deps = new Set()));
    }
    if (!deps.has(activeEffect)) {
        deps.add(activeEffect);
    }
}
function trigger(target, type, key, newValue, oldValue) {
    const depsMap = targetMap.get(target);
    if (!depsMap)
        return;
    const effects = new Set();
    const add = (effectsToAdd) => {
        if (effectsToAdd) {
            effectsToAdd.forEach((effect) => {
                effects.add(effect);
            });
        }
    };
    // 数组 并且是修改的数组的length属性
    if (isArray(target) && key === "length") {
        depsMap.forEach((dep, key) => {
            if (key === "length" || Number(key) > newValue) {
                add(dep);
            }
        });
    }
    else {
        if (key !== undefined) {
            add(depsMap.get(key));
        }
        switch (type) {
            case TriggerOpTypes.ADD:
                if (isArray(target) && isIntegerKey(key)) {
                    add(depsMap.get("length"));
                }
        }
    }
    effects.forEach((effect) => {
        if (effect.options.scheduler) {
            effect.options.scheduler(effect);
        }
        else {
            effect();
        }
    });
}

function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key, recevier) {
        const res = Reflect.get(target, key, recevier);
        if (!isReadonly && hasOwn(target, key)) {
            // 收集依赖
            track(target, TrackOpTypes.GET, key);
        }
        if (shallow) {
            return res;
        }
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter(shallow = false) {
    return function set(target, key, value, recevier) {
        const oldValue = target[key];
        let hadKey = isArray(target) && isIntegerKey(key)
            ? Number(key) < target.length
            : hasOwn(target, key);
        const result = Reflect.set(target, key, value, recevier);
        if (!hadKey) {
            // 新增
            trigger(target, TriggerOpTypes.ADD, key, value);
        }
        else if (hasChanged(oldValue, value)) {
            // 修改
            trigger(target, TriggerOpTypes.SET, key, value);
        }
        return result;
    };
}
const get = createGetter();
const shallowGet = createGetter(false, true);
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
const set = createSetter();
const shallowSet = createGetter(true);
const readonlyObj = {
    set: (target, key) => {
        console.error(`invalid ${key} is set`);
    },
};
const mutableHandlers = {
    get,
    set,
};
const shallowReactiveHandlers = {
    get: shallowGet,
    set: shallowSet,
};
const readonlyHandlers = extend({
    get: readonlyGet,
}, readonlyObj);
const shallowReadonlyHandlers = extend({
    get: shallowReadonlyGet,
}, readonlyObj);

function reactive(target) {
    return createReactiveObject(target, false, mutableHandlers);
}
function shallowReactive(target) {
    return createReactiveObject(target, false, shallowReactiveHandlers);
}
function readonly(target) {
    return createReactiveObject(target, true, readonlyHandlers);
}
function shallowReadonly(target) {
    return createReactiveObject(target, true, shallowReadonlyHandlers);
}
const reactiveMap = new WeakMap();
const readonlyMap = new WeakMap();
function createReactiveObject(target, isReadonly, baseHandlers) {
    if (!isObject(target))
        return target;
    const proxyMap = isReadonly ? readonlyMap : reactiveMap;
    const existProxy = proxyMap.get(target);
    if (existProxy)
        return existProxy;
    const proxy = new Proxy(target, baseHandlers);
    proxyMap.set(target, proxy);
    return proxy;
}

function ref(value) {
    return createRef(value);
}
function shallowRef(value) {
    return createRef(value, true);
}
function createRef(rawValue, shallow = false) {
    return new RefImpl(rawValue, shallow);
}
const convert = (val) => (isObject(val) ? reactive(val) : val);
class RefImpl {
    rawValue;
    shallow;
    _value;
    __v_isRef = true;
    constructor(rawValue, shallow) {
        this.rawValue = rawValue;
        this.shallow = shallow;
        this._value = shallow ? rawValue : convert(rawValue);
    }
    get value() {
        track(this, TrackOpTypes.GET, "value");
        return this._value;
    }
    set value(newValue) {
        if (hasChanged(newValue, this.rawValue)) {
            this._value = newValue;
            this.rawValue = this.shallow ? newValue : convert(newValue);
            trigger(this, TriggerOpTypes.SET, "value", newValue, this.rawValue);
        }
    }
}
class ObjectImpl {
    target;
    key;
    __v_isRef = true;
    constructor(target, key) {
        this.target = target;
        this.key = key;
    }
    get value() {
        return this.target[this.key];
    }
    set value(newValue) {
        this.target[this.key] = newValue;
    }
}
function toRef(target, key) {
    return new ObjectImpl(target, key);
}
function toRefs(target) {
    const ret = isArray(target) ? new Array(target.length) : {};
    for (let key in target) {
        ret[key] = toRef(target, key);
    }
    return ret;
}

function computed(getterOrOptions) {
    let getter;
    let setter;
    if (isFunction(getterOrOptions)) {
        getter = getterOrOptions;
        setter = function () {
            console.warn(`computed value must be readonly`);
        };
    }
    else {
        getter = getterOrOptions.get;
        setter = getterOrOptions.set;
    }
    return new ComputedImpl(getter, setter);
}
class ComputedImpl {
    setter;
    _dirty = true;
    _value;
    _effect;
    constructor(getter, setter) {
        this.setter = setter;
        this._effect = effect(getter, {
            lazy: true,
            scheduler: () => {
                if (!this._dirty) {
                    this._dirty = true;
                    trigger(this, TriggerOpTypes.SET, "value");
                }
            },
        });
    }
    get value() {
        if (this._dirty) {
            this._dirty = false;
            this._value = this._effect();
        }
        track(this, TrackOpTypes.GET, "value");
        return this._value;
    }
    set value(newValue) {
        this.setter(newValue);
    }
}

function isVnode(vnode) {
    return vnode.__v_isVnode;
}
function createVNode(type, props, children = null) {
    // 根据type 确定生成不同的虚拟节点
    const shapeFlag = isString(type)
        ? 1 /* ShapeFlags.ELEMENT */
        : isObject(type)
            ? 4 /* ShapeFlags.STATEFUL_COMPONENT */
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
    }
    else if (isArray(children)) {
        type = 16 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    else {
        type = 8 /* ShapeFlags.TEXT_CHILDREN */;
    }
    vnode.shapeFlag |= type;
}
const Text = Symbol("TEXT");
function normalizeVNode(child) {
    if (isObject(child))
        return child;
    return createVNode(Text, null, String(child));
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

const PublicInstanceProxyHandler = {
    get({ _: instance }, key) {
        if (key[0] === "$")
            return;
        const { props, setupState, data } = instance;
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        else if (hasOwn(data, key)) {
            return data[key];
        }
    },
    set({ _: instance }, key, value) {
        const { props, setupState, data } = instance;
        if (hasOwn(setupState, key)) {
            setupState[key] = value;
        }
        else if (hasOwn(props, key)) {
            props[key] = value;
        }
        else if (hasOwn(data, key)) {
            data[key] = value;
        }
    },
};

function createComponentInstance(vnode) {
    const { type } = vnode;
    const instance = {
        vnode,
        type,
        props: {},
        attrs: {},
        slots: {},
        setupState: {},
        isMounted: false,
        ctx: {},
        data: {},
        render: null,
    };
    instance.ctx = { _: instance };
    return instance;
}
function setupComponent(instance) {
    const { props, children, shapeFlag } = instance.vnode;
    instance.props = props;
    instance.children = children;
    if (shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */) {
        setupStateFulComponent(instance);
    }
}
function setupStateFulComponent(instance) {
    instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandler);
    const Component = instance.type;
    const { setup } = Component;
    if (setup) {
        const setupContext = createContext(instance);
        const setupResult = setup(instance.props, setupContext);
        handleSetupResult(instance, setupResult);
    }
    else {
        finishComponentSetup(instance);
    }
}
function handleSetupResult(instance, setupResult) {
    if (isFunction(setupResult)) {
        instance.render = setupResult;
    }
    else if (isObject(setupResult)) {
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    if (!instance.render) {
        // instance.render = render;
        instance.render = Component.render;
    }
}
function createContext(instance) {
    return {
        attrs: instance.attrs,
        props: instance.props,
        slots: instance.slots,
        emit: () => { },
        expose: () => { },
    };
}

const queue = [];
function queueJob(job) {
    if (!queue.includes(job)) {
        queue.push(job);
        queueFlush();
    }
}
let isFlushPending = false;
function queueFlush() {
    if (!isFlushPending) {
        isFlushPending = true;
        Promise.resolve().then(flushJob);
    }
}
function flushJob() {
    isFlushPending = false;
    queue.sort((a, b) => a.id - b.id);
    for (const job of queue) {
        job();
    }
    queue.length = 0;
}

function createRenderer(rendererOptions) {
    const { insert: hostInsert, remove: hostRemove, patchProp: hostPatchProp, createElement: hostCreateElement, createText: hostCreateText, setText: hostSetText, setElementText: hostSetElementText, nextSibling: hostNextSibling, } = rendererOptions;
    // 组件------------------------------
    const setRenderEffect = function (instance, container) {
        instance.update = effect(function componentEffect() {
            if (!instance.isMounted) {
                // 初次渲染
                let proxyToUse = instance.proxy;
                const subTree = (instance.subTree = instance.render.call(proxyToUse, proxyToUse));
                patch(null, subTree, container);
                instance.isMounted = true;
            }
            else {
                // 更新
                const prevTree = instance.subTree;
                let proxyToUse = instance.proxy;
                const nextTree = instance.render.call(proxyToUse, proxyToUse);
                patch(prevTree, nextTree, container);
            }
        }, {
            scheduler: queueJob,
        });
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
            }
            else {
                break;
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
        if (shapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
            hostSetElementText(el, children);
        }
        else if (shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
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
        if (shapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
            // c1是组件 需要卸载移除
            if (prevShapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
                unmountChildren(c1);
            }
            if (c1 !== c2) {
                hostSetElementText(container, c2);
            }
        }
        else {
            if (prevShapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
                if (shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
                    // 前后节点对比
                    patchKeyedChildren(c1, c2, container);
                }
                else {
                    // 说明 这里 现在是null
                    unmountChildren(c1);
                }
            }
            else {
                // 上一次是文本,需要清除文本， 然后可能需要挂载
                if (prevShapeFlag & 8 /* ShapeFlags.TEXT_CHILDREN */) {
                    hostSetElementText(container, "");
                }
                // 这次是元素
                if (shapeFlag & 16 /* ShapeFlags.ARRAY_CHILDREN */) {
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
        }
        else {
            // 更新
            patchElement(n1, n2);
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
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    processElement(n1, n2, container, anchor);
                }
                else if (shapeFlag & 4 /* ShapeFlags.STATEFUL_COMPONENT */) {
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

function h(type, propsOrChildren, children) {
    const l = arguments.length;
    if (l === 2) {
        // 类型 +属性 、children
        if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
            if (isVnode(propsOrChildren)) {
                return createVNode(type, null, [propsOrChildren]);
            }
            else {
                return createVNode(type, propsOrChildren);
            }
        }
        else {
            // 第二个参数不是对象
            return createVNode(type, null, propsOrChildren);
        }
    }
    else {
        if (l > 3) {
            children = Array.prototype.slice.call(arguments, 2);
        }
        else if (l === 3 && isVnode(children)) {
            children = [children];
        }
        return createVNode(type, propsOrChildren, children);
    }
}

const rendererOptions = extend({ patchProp }, nodeOps);
function createApp(rootComponent, rootProps = null) {
    const app = createRenderer(rendererOptions).createApp(rootComponent, rootProps);
    const { mount } = app;
    app.mount = function (container) {
        container = nodeOps.querySelector(container);
        container.innerHTML = "";
        mount(container);
    };
    return app;
}

export { computed, createApp, createRenderer, effect, h, reactive, readonly, ref, shallowReactive, shallowReadonly, shallowRef, toRef, toRefs };
//# sourceMappingURL=runtime-dom.esm-bundler.js.map
