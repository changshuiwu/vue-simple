import { hasChanged, isArray, isObject } from "@vue/shared";
import { track, trigger } from "./effect";
import { TrackOpTypes, TriggerOpTypes } from "./operators";
import { reactive } from "./reactivity";

export function ref(value) {
  return createRef(value);
}

export function shallowRef(value) {
  return createRef(value, true);
}

function createRef(rawValue, shallow = false) {
  return new RefImpl(rawValue, shallow);
}

const convert = (val) => (isObject(val) ? reactive(val) : val);

class RefImpl {
  public _value;
  public __v_isRef = true;
  constructor(public rawValue, public shallow) {
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
  public __v_isRef = true;
  constructor(public target, public key) {}

  get value() {
    return this.target[this.key];
  }

  set value(newValue) {
    this.target[this.key] = newValue;
  }
}

export function toRef(target, key) {
  return new ObjectImpl(target, key);
}

export function toRefs(target) {
  const ret = isArray(target) ? new Array(target.length) : {};

  for (let key in target) {
    ret[key] = toRef(target, key);
  }

  return ret;
}
