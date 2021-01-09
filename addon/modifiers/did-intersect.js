import Modifier from 'ember-modifier';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { assert } from '@ember/debug';

export const DEFAULT_OBSERVER_OPTIONS = {};

export default class DidIntersectModifier extends Modifier {
  @service('ember-scroll-modifiers@observer-manager') observerManager;

  // A flag that determines if we should use intersection observer or use no-op, e.g IE11, no polyfill.
  _isObservable = 'IntersectionObserver' in window;

  // Observer options need to be specified, so the intersection observer admin service can use it as a key to unobserve, in case there is multiple observers on the same element. By default, we're using the same options that intersection observer uses.
  _options = DEFAULT_OBSERVER_OPTIONS;

  // Used to track number of enter and exit intersections that have happened.
  @tracked
  _numOfEnters = 0;

  @tracked
  _numOfExits = 0;

  observe() {
    if (!this._isObservable) {
      return;
    }

    this.observerManager.observe(this.element, this._options);
  }

  unobserve() {
    if (!this._isObservable) {
      return;
    }

    this.observerManager.unobserve(this.element, this._options);
  }

  didUpdateArguments() {
    this._resetIntersectionCounters();
    this.unobserve();
  }

  didReceiveArguments() {
    if (!this._isObservable) {
      return;
    }

    let { onEnter, onExit, maxEnter, maxExit, options } = this.args.named;

    assert('onEnter or/and onExit is required', onEnter || onExit);

    // We should technically accept 0, in case of programmatic changes
    if (maxEnter || maxEnter === 0) {
      assert('maxEnter must be an integer', Number.isInteger(maxEnter));
      this._maxEnterIntersections = maxEnter;
    }

    // We should accept 0 here too.
    if (maxExit || maxExit === 0) {
      assert('maxExit must be an integer', Number.isInteger(maxExit));
      this._maxExitIntersections = maxExit;
    }

    if (onEnter && maxEnter !== 0) {
      this.observerManager.addEnterCallback(this.element, (...args) => {
        if (!maxEnter || this._numOfEnters < maxEnter) {
          onEnter(...args);
        }
        this._numOfEnters++;
      });
    }

    if (onExit && maxExit !== 0) {
      this.observerManager.addExitCallback(this.element, (...args) => {
        if (!maxExit || this._numOfExits < maxExit) {
          onExit(...args);
        }
        this._numOfExits++;
      });
    }

    if (options) {
      this._options = options;
    }

    this.observe();
  }

  // Move to willDestroy when we want to drop support for versions below ember-modifier 2.x
  willRemove() {
    this.unobserve();
  }

  _resetIntersectionCounters() {
    this._numOfEnters = 0;
    this._numOfExits = 0;
  }
}
