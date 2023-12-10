const isObject = (value) => value !== null && typeof value === "object";
const extend = Object.assign;
const isArray = Array.isArray;
const isFunction = (value) => typeof value === "function";
const isIntegerKey = (value) => parseInt(value) + "" === value;
let hasOwnProperty = Object.prototype.hasOwnProperty;
const hasOwn = (target, key) => hasOwnProperty.call(target, key);
const hasChanged = (oldValue, newValue) => oldValue !== newValue;

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
        if (effect.options.schedular) {
            effect.options.schedular(effect);
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
            schedular: () => {
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

export { computed, effect, reactive, readonly, ref, shallowReactive, shallowReadonly, shallowRef, toRef, toRefs };
//# sourceMappingURL=reactivity.esm-bundler.js.map
