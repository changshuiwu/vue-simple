import { isFunction } from "@vue/shared";
import { effect, track, trigger } from "./effect";
import { TrackOpTypes, TriggerOpTypes } from "./operators";

export function computed(getterOrOptions) {
  let getter;
  let setter;

  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions;
    setter = function () {
      console.warn(`computed value must be readonly`);
    };
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }

  return new ComputedImpl(getter, setter);
}

class ComputedImpl {
  _dirty = true;
  _value;
  _effect;
  constructor(getter, public setter) {
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
