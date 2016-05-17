(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
/**
 *  Copyright (c) 2014-2015, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.Immutable = factory());
}(this, function () { 'use strict';var SLICE$0 = Array.prototype.slice;

  function createClass(ctor, superClass) {
    if (superClass) {
      ctor.prototype = Object.create(superClass.prototype);
    }
    ctor.prototype.constructor = ctor;
  }

  function Iterable(value) {
      return isIterable(value) ? value : Seq(value);
    }


  createClass(KeyedIterable, Iterable);
    function KeyedIterable(value) {
      return isKeyed(value) ? value : KeyedSeq(value);
    }


  createClass(IndexedIterable, Iterable);
    function IndexedIterable(value) {
      return isIndexed(value) ? value : IndexedSeq(value);
    }


  createClass(SetIterable, Iterable);
    function SetIterable(value) {
      return isIterable(value) && !isAssociative(value) ? value : SetSeq(value);
    }



  function isIterable(maybeIterable) {
    return !!(maybeIterable && maybeIterable[IS_ITERABLE_SENTINEL]);
  }

  function isKeyed(maybeKeyed) {
    return !!(maybeKeyed && maybeKeyed[IS_KEYED_SENTINEL]);
  }

  function isIndexed(maybeIndexed) {
    return !!(maybeIndexed && maybeIndexed[IS_INDEXED_SENTINEL]);
  }

  function isAssociative(maybeAssociative) {
    return isKeyed(maybeAssociative) || isIndexed(maybeAssociative);
  }

  function isOrdered(maybeOrdered) {
    return !!(maybeOrdered && maybeOrdered[IS_ORDERED_SENTINEL]);
  }

  Iterable.isIterable = isIterable;
  Iterable.isKeyed = isKeyed;
  Iterable.isIndexed = isIndexed;
  Iterable.isAssociative = isAssociative;
  Iterable.isOrdered = isOrdered;

  Iterable.Keyed = KeyedIterable;
  Iterable.Indexed = IndexedIterable;
  Iterable.Set = SetIterable;


  var IS_ITERABLE_SENTINEL = '@@__IMMUTABLE_ITERABLE__@@';
  var IS_KEYED_SENTINEL = '@@__IMMUTABLE_KEYED__@@';
  var IS_INDEXED_SENTINEL = '@@__IMMUTABLE_INDEXED__@@';
  var IS_ORDERED_SENTINEL = '@@__IMMUTABLE_ORDERED__@@';

  // Used for setting prototype methods that IE8 chokes on.
  var DELETE = 'delete';

  // Constants describing the size of trie nodes.
  var SHIFT = 5; // Resulted in best performance after ______?
  var SIZE = 1 << SHIFT;
  var MASK = SIZE - 1;

  // A consistent shared value representing "not set" which equals nothing other
  // than itself, and nothing that could be provided externally.
  var NOT_SET = {};

  // Boolean references, Rough equivalent of `bool &`.
  var CHANGE_LENGTH = { value: false };
  var DID_ALTER = { value: false };

  function MakeRef(ref) {
    ref.value = false;
    return ref;
  }

  function SetRef(ref) {
    ref && (ref.value = true);
  }

  // A function which returns a value representing an "owner" for transient writes
  // to tries. The return value will only ever equal itself, and will not equal
  // the return of any subsequent call of this function.
  function OwnerID() {}

  // http://jsperf.com/copy-array-inline
  function arrCopy(arr, offset) {
    offset = offset || 0;
    var len = Math.max(0, arr.length - offset);
    var newArr = new Array(len);
    for (var ii = 0; ii < len; ii++) {
      newArr[ii] = arr[ii + offset];
    }
    return newArr;
  }

  function ensureSize(iter) {
    if (iter.size === undefined) {
      iter.size = iter.__iterate(returnTrue);
    }
    return iter.size;
  }

  function wrapIndex(iter, index) {
    // This implements "is array index" which the ECMAString spec defines as:
    //
    //     A String property name P is an array index if and only if
    //     ToString(ToUint32(P)) is equal to P and ToUint32(P) is not equal
    //     to 2^32−1.
    //
    // http://www.ecma-international.org/ecma-262/6.0/#sec-array-exotic-objects
    if (typeof index !== 'number') {
      var uint32Index = index >>> 0; // N >>> 0 is shorthand for ToUint32
      if ('' + uint32Index !== index || uint32Index === 4294967295) {
        return NaN;
      }
      index = uint32Index;
    }
    return index < 0 ? ensureSize(iter) + index : index;
  }

  function returnTrue() {
    return true;
  }

  function wholeSlice(begin, end, size) {
    return (begin === 0 || (size !== undefined && begin <= -size)) &&
      (end === undefined || (size !== undefined && end >= size));
  }

  function resolveBegin(begin, size) {
    return resolveIndex(begin, size, 0);
  }

  function resolveEnd(end, size) {
    return resolveIndex(end, size, size);
  }

  function resolveIndex(index, size, defaultIndex) {
    return index === undefined ?
      defaultIndex :
      index < 0 ?
        Math.max(0, size + index) :
        size === undefined ?
          index :
          Math.min(size, index);
  }

  /* global Symbol */

  var ITERATE_KEYS = 0;
  var ITERATE_VALUES = 1;
  var ITERATE_ENTRIES = 2;

  var REAL_ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
  var FAUX_ITERATOR_SYMBOL = '@@iterator';

  var ITERATOR_SYMBOL = REAL_ITERATOR_SYMBOL || FAUX_ITERATOR_SYMBOL;


  function Iterator(next) {
      this.next = next;
    }

    Iterator.prototype.toString = function() {
      return '[Iterator]';
    };


  Iterator.KEYS = ITERATE_KEYS;
  Iterator.VALUES = ITERATE_VALUES;
  Iterator.ENTRIES = ITERATE_ENTRIES;

  Iterator.prototype.inspect =
  Iterator.prototype.toSource = function () { return this.toString(); }
  Iterator.prototype[ITERATOR_SYMBOL] = function () {
    return this;
  };


  function iteratorValue(type, k, v, iteratorResult) {
    var value = type === 0 ? k : type === 1 ? v : [k, v];
    iteratorResult ? (iteratorResult.value = value) : (iteratorResult = {
      value: value, done: false
    });
    return iteratorResult;
  }

  function iteratorDone() {
    return { value: undefined, done: true };
  }

  function hasIterator(maybeIterable) {
    return !!getIteratorFn(maybeIterable);
  }

  function isIterator(maybeIterator) {
    return maybeIterator && typeof maybeIterator.next === 'function';
  }

  function getIterator(iterable) {
    var iteratorFn = getIteratorFn(iterable);
    return iteratorFn && iteratorFn.call(iterable);
  }

  function getIteratorFn(iterable) {
    var iteratorFn = iterable && (
      (REAL_ITERATOR_SYMBOL && iterable[REAL_ITERATOR_SYMBOL]) ||
      iterable[FAUX_ITERATOR_SYMBOL]
    );
    if (typeof iteratorFn === 'function') {
      return iteratorFn;
    }
  }

  function isArrayLike(value) {
    return value && typeof value.length === 'number';
  }

  createClass(Seq, Iterable);
    function Seq(value) {
      return value === null || value === undefined ? emptySequence() :
        isIterable(value) ? value.toSeq() : seqFromValue(value);
    }

    Seq.of = function(/*...values*/) {
      return Seq(arguments);
    };

    Seq.prototype.toSeq = function() {
      return this;
    };

    Seq.prototype.toString = function() {
      return this.__toString('Seq {', '}');
    };

    Seq.prototype.cacheResult = function() {
      if (!this._cache && this.__iterateUncached) {
        this._cache = this.entrySeq().toArray();
        this.size = this._cache.length;
      }
      return this;
    };

    // abstract __iterateUncached(fn, reverse)

    Seq.prototype.__iterate = function(fn, reverse) {
      return seqIterate(this, fn, reverse, true);
    };

    // abstract __iteratorUncached(type, reverse)

    Seq.prototype.__iterator = function(type, reverse) {
      return seqIterator(this, type, reverse, true);
    };



  createClass(KeyedSeq, Seq);
    function KeyedSeq(value) {
      return value === null || value === undefined ?
        emptySequence().toKeyedSeq() :
        isIterable(value) ?
          (isKeyed(value) ? value.toSeq() : value.fromEntrySeq()) :
          keyedSeqFromValue(value);
    }

    KeyedSeq.prototype.toKeyedSeq = function() {
      return this;
    };



  createClass(IndexedSeq, Seq);
    function IndexedSeq(value) {
      return value === null || value === undefined ? emptySequence() :
        !isIterable(value) ? indexedSeqFromValue(value) :
        isKeyed(value) ? value.entrySeq() : value.toIndexedSeq();
    }

    IndexedSeq.of = function(/*...values*/) {
      return IndexedSeq(arguments);
    };

    IndexedSeq.prototype.toIndexedSeq = function() {
      return this;
    };

    IndexedSeq.prototype.toString = function() {
      return this.__toString('Seq [', ']');
    };

    IndexedSeq.prototype.__iterate = function(fn, reverse) {
      return seqIterate(this, fn, reverse, false);
    };

    IndexedSeq.prototype.__iterator = function(type, reverse) {
      return seqIterator(this, type, reverse, false);
    };



  createClass(SetSeq, Seq);
    function SetSeq(value) {
      return (
        value === null || value === undefined ? emptySequence() :
        !isIterable(value) ? indexedSeqFromValue(value) :
        isKeyed(value) ? value.entrySeq() : value
      ).toSetSeq();
    }

    SetSeq.of = function(/*...values*/) {
      return SetSeq(arguments);
    };

    SetSeq.prototype.toSetSeq = function() {
      return this;
    };



  Seq.isSeq = isSeq;
  Seq.Keyed = KeyedSeq;
  Seq.Set = SetSeq;
  Seq.Indexed = IndexedSeq;

  var IS_SEQ_SENTINEL = '@@__IMMUTABLE_SEQ__@@';

  Seq.prototype[IS_SEQ_SENTINEL] = true;



  createClass(ArraySeq, IndexedSeq);
    function ArraySeq(array) {
      this._array = array;
      this.size = array.length;
    }

    ArraySeq.prototype.get = function(index, notSetValue) {
      return this.has(index) ? this._array[wrapIndex(this, index)] : notSetValue;
    };

    ArraySeq.prototype.__iterate = function(fn, reverse) {
      var array = this._array;
      var maxIndex = array.length - 1;
      for (var ii = 0; ii <= maxIndex; ii++) {
        if (fn(array[reverse ? maxIndex - ii : ii], ii, this) === false) {
          return ii + 1;
        }
      }
      return ii;
    };

    ArraySeq.prototype.__iterator = function(type, reverse) {
      var array = this._array;
      var maxIndex = array.length - 1;
      var ii = 0;
      return new Iterator(function() 
        {return ii > maxIndex ?
          iteratorDone() :
          iteratorValue(type, ii, array[reverse ? maxIndex - ii++ : ii++])}
      );
    };



  createClass(ObjectSeq, KeyedSeq);
    function ObjectSeq(object) {
      var keys = Object.keys(object);
      this._object = object;
      this._keys = keys;
      this.size = keys.length;
    }

    ObjectSeq.prototype.get = function(key, notSetValue) {
      if (notSetValue !== undefined && !this.has(key)) {
        return notSetValue;
      }
      return this._object[key];
    };

    ObjectSeq.prototype.has = function(key) {
      return this._object.hasOwnProperty(key);
    };

    ObjectSeq.prototype.__iterate = function(fn, reverse) {
      var object = this._object;
      var keys = this._keys;
      var maxIndex = keys.length - 1;
      for (var ii = 0; ii <= maxIndex; ii++) {
        var key = keys[reverse ? maxIndex - ii : ii];
        if (fn(object[key], key, this) === false) {
          return ii + 1;
        }
      }
      return ii;
    };

    ObjectSeq.prototype.__iterator = function(type, reverse) {
      var object = this._object;
      var keys = this._keys;
      var maxIndex = keys.length - 1;
      var ii = 0;
      return new Iterator(function()  {
        var key = keys[reverse ? maxIndex - ii : ii];
        return ii++ > maxIndex ?
          iteratorDone() :
          iteratorValue(type, key, object[key]);
      });
    };

  ObjectSeq.prototype[IS_ORDERED_SENTINEL] = true;


  createClass(IterableSeq, IndexedSeq);
    function IterableSeq(iterable) {
      this._iterable = iterable;
      this.size = iterable.length || iterable.size;
    }

    IterableSeq.prototype.__iterateUncached = function(fn, reverse) {
      if (reverse) {
        return this.cacheResult().__iterate(fn, reverse);
      }
      var iterable = this._iterable;
      var iterator = getIterator(iterable);
      var iterations = 0;
      if (isIterator(iterator)) {
        var step;
        while (!(step = iterator.next()).done) {
          if (fn(step.value, iterations++, this) === false) {
            break;
          }
        }
      }
      return iterations;
    };

    IterableSeq.prototype.__iteratorUncached = function(type, reverse) {
      if (reverse) {
        return this.cacheResult().__iterator(type, reverse);
      }
      var iterable = this._iterable;
      var iterator = getIterator(iterable);
      if (!isIterator(iterator)) {
        return new Iterator(iteratorDone);
      }
      var iterations = 0;
      return new Iterator(function()  {
        var step = iterator.next();
        return step.done ? step : iteratorValue(type, iterations++, step.value);
      });
    };



  createClass(IteratorSeq, IndexedSeq);
    function IteratorSeq(iterator) {
      this._iterator = iterator;
      this._iteratorCache = [];
    }

    IteratorSeq.prototype.__iterateUncached = function(fn, reverse) {
      if (reverse) {
        return this.cacheResult().__iterate(fn, reverse);
      }
      var iterator = this._iterator;
      var cache = this._iteratorCache;
      var iterations = 0;
      while (iterations < cache.length) {
        if (fn(cache[iterations], iterations++, this) === false) {
          return iterations;
        }
      }
      var step;
      while (!(step = iterator.next()).done) {
        var val = step.value;
        cache[iterations] = val;
        if (fn(val, iterations++, this) === false) {
          break;
        }
      }
      return iterations;
    };

    IteratorSeq.prototype.__iteratorUncached = function(type, reverse) {
      if (reverse) {
        return this.cacheResult().__iterator(type, reverse);
      }
      var iterator = this._iterator;
      var cache = this._iteratorCache;
      var iterations = 0;
      return new Iterator(function()  {
        if (iterations >= cache.length) {
          var step = iterator.next();
          if (step.done) {
            return step;
          }
          cache[iterations] = step.value;
        }
        return iteratorValue(type, iterations, cache[iterations++]);
      });
    };




  // # pragma Helper functions

  function isSeq(maybeSeq) {
    return !!(maybeSeq && maybeSeq[IS_SEQ_SENTINEL]);
  }

  var EMPTY_SEQ;

  function emptySequence() {
    return EMPTY_SEQ || (EMPTY_SEQ = new ArraySeq([]));
  }

  function keyedSeqFromValue(value) {
    var seq =
      Array.isArray(value) ? new ArraySeq(value).fromEntrySeq() :
      isIterator(value) ? new IteratorSeq(value).fromEntrySeq() :
      hasIterator(value) ? new IterableSeq(value).fromEntrySeq() :
      typeof value === 'object' ? new ObjectSeq(value) :
      undefined;
    if (!seq) {
      throw new TypeError(
        'Expected Array or iterable object of [k, v] entries, '+
        'or keyed object: ' + value
      );
    }
    return seq;
  }

  function indexedSeqFromValue(value) {
    var seq = maybeIndexedSeqFromValue(value);
    if (!seq) {
      throw new TypeError(
        'Expected Array or iterable object of values: ' + value
      );
    }
    return seq;
  }

  function seqFromValue(value) {
    var seq = maybeIndexedSeqFromValue(value) ||
      (typeof value === 'object' && new ObjectSeq(value));
    if (!seq) {
      throw new TypeError(
        'Expected Array or iterable object of values, or keyed object: ' + value
      );
    }
    return seq;
  }

  function maybeIndexedSeqFromValue(value) {
    return (
      isArrayLike(value) ? new ArraySeq(value) :
      isIterator(value) ? new IteratorSeq(value) :
      hasIterator(value) ? new IterableSeq(value) :
      undefined
    );
  }

  function seqIterate(seq, fn, reverse, useKeys) {
    var cache = seq._cache;
    if (cache) {
      var maxIndex = cache.length - 1;
      for (var ii = 0; ii <= maxIndex; ii++) {
        var entry = cache[reverse ? maxIndex - ii : ii];
        if (fn(entry[1], useKeys ? entry[0] : ii, seq) === false) {
          return ii + 1;
        }
      }
      return ii;
    }
    return seq.__iterateUncached(fn, reverse);
  }

  function seqIterator(seq, type, reverse, useKeys) {
    var cache = seq._cache;
    if (cache) {
      var maxIndex = cache.length - 1;
      var ii = 0;
      return new Iterator(function()  {
        var entry = cache[reverse ? maxIndex - ii : ii];
        return ii++ > maxIndex ?
          iteratorDone() :
          iteratorValue(type, useKeys ? entry[0] : ii - 1, entry[1]);
      });
    }
    return seq.__iteratorUncached(type, reverse);
  }

  function fromJS(json, converter) {
    return converter ?
      fromJSWith(converter, json, '', {'': json}) :
      fromJSDefault(json);
  }

  function fromJSWith(converter, json, key, parentJSON) {
    if (Array.isArray(json)) {
      return converter.call(parentJSON, key, IndexedSeq(json).map(function(v, k)  {return fromJSWith(converter, v, k, json)}));
    }
    if (isPlainObj(json)) {
      return converter.call(parentJSON, key, KeyedSeq(json).map(function(v, k)  {return fromJSWith(converter, v, k, json)}));
    }
    return json;
  }

  function fromJSDefault(json) {
    if (Array.isArray(json)) {
      return IndexedSeq(json).map(fromJSDefault).toList();
    }
    if (isPlainObj(json)) {
      return KeyedSeq(json).map(fromJSDefault).toMap();
    }
    return json;
  }

  function isPlainObj(value) {
    return value && (value.constructor === Object || value.constructor === undefined);
  }

  /**
   * An extension of the "same-value" algorithm as [described for use by ES6 Map
   * and Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#Key_equality)
   *
   * NaN is considered the same as NaN, however -0 and 0 are considered the same
   * value, which is different from the algorithm described by
   * [`Object.is`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is).
   *
   * This is extended further to allow Objects to describe the values they
   * represent, by way of `valueOf` or `equals` (and `hashCode`).
   *
   * Note: because of this extension, the key equality of Immutable.Map and the
   * value equality of Immutable.Set will differ from ES6 Map and Set.
   *
   * ### Defining custom values
   *
   * The easiest way to describe the value an object represents is by implementing
   * `valueOf`. For example, `Date` represents a value by returning a unix
   * timestamp for `valueOf`:
   *
   *     var date1 = new Date(1234567890000); // Fri Feb 13 2009 ...
   *     var date2 = new Date(1234567890000);
   *     date1.valueOf(); // 1234567890000
   *     assert( date1 !== date2 );
   *     assert( Immutable.is( date1, date2 ) );
   *
   * Note: overriding `valueOf` may have other implications if you use this object
   * where JavaScript expects a primitive, such as implicit string coercion.
   *
   * For more complex types, especially collections, implementing `valueOf` may
   * not be performant. An alternative is to implement `equals` and `hashCode`.
   *
   * `equals` takes another object, presumably of similar type, and returns true
   * if the it is equal. Equality is symmetrical, so the same result should be
   * returned if this and the argument are flipped.
   *
   *     assert( a.equals(b) === b.equals(a) );
   *
   * `hashCode` returns a 32bit integer number representing the object which will
   * be used to determine how to store the value object in a Map or Set. You must
   * provide both or neither methods, one must not exist without the other.
   *
   * Also, an important relationship between these methods must be upheld: if two
   * values are equal, they *must* return the same hashCode. If the values are not
   * equal, they might have the same hashCode; this is called a hash collision,
   * and while undesirable for performance reasons, it is acceptable.
   *
   *     if (a.equals(b)) {
   *       assert( a.hashCode() === b.hashCode() );
   *     }
   *
   * All Immutable collections implement `equals` and `hashCode`.
   *
   */
  function is(valueA, valueB) {
    if (valueA === valueB || (valueA !== valueA && valueB !== valueB)) {
      return true;
    }
    if (!valueA || !valueB) {
      return false;
    }
    if (typeof valueA.valueOf === 'function' &&
        typeof valueB.valueOf === 'function') {
      valueA = valueA.valueOf();
      valueB = valueB.valueOf();
      if (valueA === valueB || (valueA !== valueA && valueB !== valueB)) {
        return true;
      }
      if (!valueA || !valueB) {
        return false;
      }
    }
    if (typeof valueA.equals === 'function' &&
        typeof valueB.equals === 'function' &&
        valueA.equals(valueB)) {
      return true;
    }
    return false;
  }

  function deepEqual(a, b) {
    if (a === b) {
      return true;
    }

    if (
      !isIterable(b) ||
      a.size !== undefined && b.size !== undefined && a.size !== b.size ||
      a.__hash !== undefined && b.__hash !== undefined && a.__hash !== b.__hash ||
      isKeyed(a) !== isKeyed(b) ||
      isIndexed(a) !== isIndexed(b) ||
      isOrdered(a) !== isOrdered(b)
    ) {
      return false;
    }

    if (a.size === 0 && b.size === 0) {
      return true;
    }

    var notAssociative = !isAssociative(a);

    if (isOrdered(a)) {
      var entries = a.entries();
      return b.every(function(v, k)  {
        var entry = entries.next().value;
        return entry && is(entry[1], v) && (notAssociative || is(entry[0], k));
      }) && entries.next().done;
    }

    var flipped = false;

    if (a.size === undefined) {
      if (b.size === undefined) {
        if (typeof a.cacheResult === 'function') {
          a.cacheResult();
        }
      } else {
        flipped = true;
        var _ = a;
        a = b;
        b = _;
      }
    }

    var allEqual = true;
    var bSize = b.__iterate(function(v, k)  {
      if (notAssociative ? !a.has(v) :
          flipped ? !is(v, a.get(k, NOT_SET)) : !is(a.get(k, NOT_SET), v)) {
        allEqual = false;
        return false;
      }
    });

    return allEqual && a.size === bSize;
  }

  createClass(Repeat, IndexedSeq);

    function Repeat(value, times) {
      if (!(this instanceof Repeat)) {
        return new Repeat(value, times);
      }
      this._value = value;
      this.size = times === undefined ? Infinity : Math.max(0, times);
      if (this.size === 0) {
        if (EMPTY_REPEAT) {
          return EMPTY_REPEAT;
        }
        EMPTY_REPEAT = this;
      }
    }

    Repeat.prototype.toString = function() {
      if (this.size === 0) {
        return 'Repeat []';
      }
      return 'Repeat [ ' + this._value + ' ' + this.size + ' times ]';
    };

    Repeat.prototype.get = function(index, notSetValue) {
      return this.has(index) ? this._value : notSetValue;
    };

    Repeat.prototype.includes = function(searchValue) {
      return is(this._value, searchValue);
    };

    Repeat.prototype.slice = function(begin, end) {
      var size = this.size;
      return wholeSlice(begin, end, size) ? this :
        new Repeat(this._value, resolveEnd(end, size) - resolveBegin(begin, size));
    };

    Repeat.prototype.reverse = function() {
      return this;
    };

    Repeat.prototype.indexOf = function(searchValue) {
      if (is(this._value, searchValue)) {
        return 0;
      }
      return -1;
    };

    Repeat.prototype.lastIndexOf = function(searchValue) {
      if (is(this._value, searchValue)) {
        return this.size;
      }
      return -1;
    };

    Repeat.prototype.__iterate = function(fn, reverse) {
      for (var ii = 0; ii < this.size; ii++) {
        if (fn(this._value, ii, this) === false) {
          return ii + 1;
        }
      }
      return ii;
    };

    Repeat.prototype.__iterator = function(type, reverse) {var this$0 = this;
      var ii = 0;
      return new Iterator(function() 
        {return ii < this$0.size ? iteratorValue(type, ii++, this$0._value) : iteratorDone()}
      );
    };

    Repeat.prototype.equals = function(other) {
      return other instanceof Repeat ?
        is(this._value, other._value) :
        deepEqual(other);
    };


  var EMPTY_REPEAT;

  function invariant(condition, error) {
    if (!condition) throw new Error(error);
  }

  createClass(Range, IndexedSeq);

    function Range(start, end, step) {
      if (!(this instanceof Range)) {
        return new Range(start, end, step);
      }
      invariant(step !== 0, 'Cannot step a Range by 0');
      start = start || 0;
      if (end === undefined) {
        end = Infinity;
      }
      step = step === undefined ? 1 : Math.abs(step);
      if (end < start) {
        step = -step;
      }
      this._start = start;
      this._end = end;
      this._step = step;
      this.size = Math.max(0, Math.ceil((end - start) / step - 1) + 1);
      if (this.size === 0) {
        if (EMPTY_RANGE) {
          return EMPTY_RANGE;
        }
        EMPTY_RANGE = this;
      }
    }

    Range.prototype.toString = function() {
      if (this.size === 0) {
        return 'Range []';
      }
      return 'Range [ ' +
        this._start + '...' + this._end +
        (this._step !== 1 ? ' by ' + this._step : '') +
      ' ]';
    };

    Range.prototype.get = function(index, notSetValue) {
      return this.has(index) ?
        this._start + wrapIndex(this, index) * this._step :
        notSetValue;
    };

    Range.prototype.includes = function(searchValue) {
      var possibleIndex = (searchValue - this._start) / this._step;
      return possibleIndex >= 0 &&
        possibleIndex < this.size &&
        possibleIndex === Math.floor(possibleIndex);
    };

    Range.prototype.slice = function(begin, end) {
      if (wholeSlice(begin, end, this.size)) {
        return this;
      }
      begin = resolveBegin(begin, this.size);
      end = resolveEnd(end, this.size);
      if (end <= begin) {
        return new Range(0, 0);
      }
      return new Range(this.get(begin, this._end), this.get(end, this._end), this._step);
    };

    Range.prototype.indexOf = function(searchValue) {
      var offsetValue = searchValue - this._start;
      if (offsetValue % this._step === 0) {
        var index = offsetValue / this._step;
        if (index >= 0 && index < this.size) {
          return index
        }
      }
      return -1;
    };

    Range.prototype.lastIndexOf = function(searchValue) {
      return this.indexOf(searchValue);
    };

    Range.prototype.__iterate = function(fn, reverse) {
      var maxIndex = this.size - 1;
      var step = this._step;
      var value = reverse ? this._start + maxIndex * step : this._start;
      for (var ii = 0; ii <= maxIndex; ii++) {
        if (fn(value, ii, this) === false) {
          return ii + 1;
        }
        value += reverse ? -step : step;
      }
      return ii;
    };

    Range.prototype.__iterator = function(type, reverse) {
      var maxIndex = this.size - 1;
      var step = this._step;
      var value = reverse ? this._start + maxIndex * step : this._start;
      var ii = 0;
      return new Iterator(function()  {
        var v = value;
        value += reverse ? -step : step;
        return ii > maxIndex ? iteratorDone() : iteratorValue(type, ii++, v);
      });
    };

    Range.prototype.equals = function(other) {
      return other instanceof Range ?
        this._start === other._start &&
        this._end === other._end &&
        this._step === other._step :
        deepEqual(this, other);
    };


  var EMPTY_RANGE;

  createClass(Collection, Iterable);
    function Collection() {
      throw TypeError('Abstract');
    }


  createClass(KeyedCollection, Collection);function KeyedCollection() {}

  createClass(IndexedCollection, Collection);function IndexedCollection() {}

  createClass(SetCollection, Collection);function SetCollection() {}


  Collection.Keyed = KeyedCollection;
  Collection.Indexed = IndexedCollection;
  Collection.Set = SetCollection;

  var imul =
    typeof Math.imul === 'function' && Math.imul(0xffffffff, 2) === -2 ?
    Math.imul :
    function imul(a, b) {
      a = a | 0; // int
      b = b | 0; // int
      var c = a & 0xffff;
      var d = b & 0xffff;
      // Shift by 0 fixes the sign on the high part.
      return (c * d) + ((((a >>> 16) * d + c * (b >>> 16)) << 16) >>> 0) | 0; // int
    };

  // v8 has an optimization for storing 31-bit signed numbers.
  // Values which have either 00 or 11 as the high order bits qualify.
  // This function drops the highest order bit in a signed number, maintaining
  // the sign bit.
  function smi(i32) {
    return ((i32 >>> 1) & 0x40000000) | (i32 & 0xBFFFFFFF);
  }

  function hash(o) {
    if (o === false || o === null || o === undefined) {
      return 0;
    }
    if (typeof o.valueOf === 'function') {
      o = o.valueOf();
      if (o === false || o === null || o === undefined) {
        return 0;
      }
    }
    if (o === true) {
      return 1;
    }
    var type = typeof o;
    if (type === 'number') {
      if (o !== o || o === Infinity) {
        return 0;
      }
      var h = o | 0;
      if (h !== o) {
        h ^= o * 0xFFFFFFFF;
      }
      while (o > 0xFFFFFFFF) {
        o /= 0xFFFFFFFF;
        h ^= o;
      }
      return smi(h);
    }
    if (type === 'string') {
      return o.length > STRING_HASH_CACHE_MIN_STRLEN ? cachedHashString(o) : hashString(o);
    }
    if (typeof o.hashCode === 'function') {
      return o.hashCode();
    }
    if (type === 'object') {
      return hashJSObj(o);
    }
    if (typeof o.toString === 'function') {
      return hashString(o.toString());
    }
    throw new Error('Value type ' + type + ' cannot be hashed.');
  }

  function cachedHashString(string) {
    var hash = stringHashCache[string];
    if (hash === undefined) {
      hash = hashString(string);
      if (STRING_HASH_CACHE_SIZE === STRING_HASH_CACHE_MAX_SIZE) {
        STRING_HASH_CACHE_SIZE = 0;
        stringHashCache = {};
      }
      STRING_HASH_CACHE_SIZE++;
      stringHashCache[string] = hash;
    }
    return hash;
  }

  // http://jsperf.com/hashing-strings
  function hashString(string) {
    // This is the hash from JVM
    // The hash code for a string is computed as
    // s[0] * 31 ^ (n - 1) + s[1] * 31 ^ (n - 2) + ... + s[n - 1],
    // where s[i] is the ith character of the string and n is the length of
    // the string. We "mod" the result to make it between 0 (inclusive) and 2^31
    // (exclusive) by dropping high bits.
    var hash = 0;
    for (var ii = 0; ii < string.length; ii++) {
      hash = 31 * hash + string.charCodeAt(ii) | 0;
    }
    return smi(hash);
  }

  function hashJSObj(obj) {
    var hash;
    if (usingWeakMap) {
      hash = weakMap.get(obj);
      if (hash !== undefined) {
        return hash;
      }
    }

    hash = obj[UID_HASH_KEY];
    if (hash !== undefined) {
      return hash;
    }

    if (!canDefineProperty) {
      hash = obj.propertyIsEnumerable && obj.propertyIsEnumerable[UID_HASH_KEY];
      if (hash !== undefined) {
        return hash;
      }

      hash = getIENodeHash(obj);
      if (hash !== undefined) {
        return hash;
      }
    }

    hash = ++objHashUID;
    if (objHashUID & 0x40000000) {
      objHashUID = 0;
    }

    if (usingWeakMap) {
      weakMap.set(obj, hash);
    } else if (isExtensible !== undefined && isExtensible(obj) === false) {
      throw new Error('Non-extensible objects are not allowed as keys.');
    } else if (canDefineProperty) {
      Object.defineProperty(obj, UID_HASH_KEY, {
        'enumerable': false,
        'configurable': false,
        'writable': false,
        'value': hash
      });
    } else if (obj.propertyIsEnumerable !== undefined &&
               obj.propertyIsEnumerable === obj.constructor.prototype.propertyIsEnumerable) {
      // Since we can't define a non-enumerable property on the object
      // we'll hijack one of the less-used non-enumerable properties to
      // save our hash on it. Since this is a function it will not show up in
      // `JSON.stringify` which is what we want.
      obj.propertyIsEnumerable = function() {
        return this.constructor.prototype.propertyIsEnumerable.apply(this, arguments);
      };
      obj.propertyIsEnumerable[UID_HASH_KEY] = hash;
    } else if (obj.nodeType !== undefined) {
      // At this point we couldn't get the IE `uniqueID` to use as a hash
      // and we couldn't use a non-enumerable property to exploit the
      // dontEnum bug so we simply add the `UID_HASH_KEY` on the node
      // itself.
      obj[UID_HASH_KEY] = hash;
    } else {
      throw new Error('Unable to set a non-enumerable property on object.');
    }

    return hash;
  }

  // Get references to ES5 object methods.
  var isExtensible = Object.isExtensible;

  // True if Object.defineProperty works as expected. IE8 fails this test.
  var canDefineProperty = (function() {
    try {
      Object.defineProperty({}, '@', {});
      return true;
    } catch (e) {
      return false;
    }
  }());

  // IE has a `uniqueID` property on DOM nodes. We can construct the hash from it
  // and avoid memory leaks from the IE cloneNode bug.
  function getIENodeHash(node) {
    if (node && node.nodeType > 0) {
      switch (node.nodeType) {
        case 1: // Element
          return node.uniqueID;
        case 9: // Document
          return node.documentElement && node.documentElement.uniqueID;
      }
    }
  }

  // If possible, use a WeakMap.
  var usingWeakMap = typeof WeakMap === 'function';
  var weakMap;
  if (usingWeakMap) {
    weakMap = new WeakMap();
  }

  var objHashUID = 0;

  var UID_HASH_KEY = '__immutablehash__';
  if (typeof Symbol === 'function') {
    UID_HASH_KEY = Symbol(UID_HASH_KEY);
  }

  var STRING_HASH_CACHE_MIN_STRLEN = 16;
  var STRING_HASH_CACHE_MAX_SIZE = 255;
  var STRING_HASH_CACHE_SIZE = 0;
  var stringHashCache = {};

  function assertNotInfinite(size) {
    invariant(
      size !== Infinity,
      'Cannot perform this action with an infinite size.'
    );
  }

  createClass(Map, KeyedCollection);

    // @pragma Construction

    function Map(value) {
      return value === null || value === undefined ? emptyMap() :
        isMap(value) && !isOrdered(value) ? value :
        emptyMap().withMutations(function(map ) {
          var iter = KeyedIterable(value);
          assertNotInfinite(iter.size);
          iter.forEach(function(v, k)  {return map.set(k, v)});
        });
    }

    Map.of = function() {var keyValues = SLICE$0.call(arguments, 0);
      return emptyMap().withMutations(function(map ) {
        for (var i = 0; i < keyValues.length; i += 2) {
          if (i + 1 >= keyValues.length) {
            throw new Error('Missing value for key: ' + keyValues[i]);
          }
          map.set(keyValues[i], keyValues[i + 1]);
        }
      });
    };

    Map.prototype.toString = function() {
      return this.__toString('Map {', '}');
    };

    // @pragma Access

    Map.prototype.get = function(k, notSetValue) {
      return this._root ?
        this._root.get(0, undefined, k, notSetValue) :
        notSetValue;
    };

    // @pragma Modification

    Map.prototype.set = function(k, v) {
      return updateMap(this, k, v);
    };

    Map.prototype.setIn = function(keyPath, v) {
      return this.updateIn(keyPath, NOT_SET, function()  {return v});
    };

    Map.prototype.remove = function(k) {
      return updateMap(this, k, NOT_SET);
    };

    Map.prototype.deleteIn = function(keyPath) {
      return this.updateIn(keyPath, function()  {return NOT_SET});
    };

    Map.prototype.update = function(k, notSetValue, updater) {
      return arguments.length === 1 ?
        k(this) :
        this.updateIn([k], notSetValue, updater);
    };

    Map.prototype.updateIn = function(keyPath, notSetValue, updater) {
      if (!updater) {
        updater = notSetValue;
        notSetValue = undefined;
      }
      var updatedValue = updateInDeepMap(
        this,
        forceIterator(keyPath),
        notSetValue,
        updater
      );
      return updatedValue === NOT_SET ? undefined : updatedValue;
    };

    Map.prototype.clear = function() {
      if (this.size === 0) {
        return this;
      }
      if (this.__ownerID) {
        this.size = 0;
        this._root = null;
        this.__hash = undefined;
        this.__altered = true;
        return this;
      }
      return emptyMap();
    };

    // @pragma Composition

    Map.prototype.merge = function(/*...iters*/) {
      return mergeIntoMapWith(this, undefined, arguments);
    };

    Map.prototype.mergeWith = function(merger) {var iters = SLICE$0.call(arguments, 1);
      return mergeIntoMapWith(this, merger, iters);
    };

    Map.prototype.mergeIn = function(keyPath) {var iters = SLICE$0.call(arguments, 1);
      return this.updateIn(
        keyPath,
        emptyMap(),
        function(m ) {return typeof m.merge === 'function' ?
          m.merge.apply(m, iters) :
          iters[iters.length - 1]}
      );
    };

    Map.prototype.mergeDeep = function(/*...iters*/) {
      return mergeIntoMapWith(this, deepMerger, arguments);
    };

    Map.prototype.mergeDeepWith = function(merger) {var iters = SLICE$0.call(arguments, 1);
      return mergeIntoMapWith(this, deepMergerWith(merger), iters);
    };

    Map.prototype.mergeDeepIn = function(keyPath) {var iters = SLICE$0.call(arguments, 1);
      return this.updateIn(
        keyPath,
        emptyMap(),
        function(m ) {return typeof m.mergeDeep === 'function' ?
          m.mergeDeep.apply(m, iters) :
          iters[iters.length - 1]}
      );
    };

    Map.prototype.sort = function(comparator) {
      // Late binding
      return OrderedMap(sortFactory(this, comparator));
    };

    Map.prototype.sortBy = function(mapper, comparator) {
      // Late binding
      return OrderedMap(sortFactory(this, comparator, mapper));
    };

    // @pragma Mutability

    Map.prototype.withMutations = function(fn) {
      var mutable = this.asMutable();
      fn(mutable);
      return mutable.wasAltered() ? mutable.__ensureOwner(this.__ownerID) : this;
    };

    Map.prototype.asMutable = function() {
      return this.__ownerID ? this : this.__ensureOwner(new OwnerID());
    };

    Map.prototype.asImmutable = function() {
      return this.__ensureOwner();
    };

    Map.prototype.wasAltered = function() {
      return this.__altered;
    };

    Map.prototype.__iterator = function(type, reverse) {
      return new MapIterator(this, type, reverse);
    };

    Map.prototype.__iterate = function(fn, reverse) {var this$0 = this;
      var iterations = 0;
      this._root && this._root.iterate(function(entry ) {
        iterations++;
        return fn(entry[1], entry[0], this$0);
      }, reverse);
      return iterations;
    };

    Map.prototype.__ensureOwner = function(ownerID) {
      if (ownerID === this.__ownerID) {
        return this;
      }
      if (!ownerID) {
        this.__ownerID = ownerID;
        this.__altered = false;
        return this;
      }
      return makeMap(this.size, this._root, ownerID, this.__hash);
    };


  function isMap(maybeMap) {
    return !!(maybeMap && maybeMap[IS_MAP_SENTINEL]);
  }

  Map.isMap = isMap;

  var IS_MAP_SENTINEL = '@@__IMMUTABLE_MAP__@@';

  var MapPrototype = Map.prototype;
  MapPrototype[IS_MAP_SENTINEL] = true;
  MapPrototype[DELETE] = MapPrototype.remove;
  MapPrototype.removeIn = MapPrototype.deleteIn;


  // #pragma Trie Nodes



    function ArrayMapNode(ownerID, entries) {
      this.ownerID = ownerID;
      this.entries = entries;
    }

    ArrayMapNode.prototype.get = function(shift, keyHash, key, notSetValue) {
      var entries = this.entries;
      for (var ii = 0, len = entries.length; ii < len; ii++) {
        if (is(key, entries[ii][0])) {
          return entries[ii][1];
        }
      }
      return notSetValue;
    };

    ArrayMapNode.prototype.update = function(ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
      var removed = value === NOT_SET;

      var entries = this.entries;
      var idx = 0;
      for (var len = entries.length; idx < len; idx++) {
        if (is(key, entries[idx][0])) {
          break;
        }
      }
      var exists = idx < len;

      if (exists ? entries[idx][1] === value : removed) {
        return this;
      }

      SetRef(didAlter);
      (removed || !exists) && SetRef(didChangeSize);

      if (removed && entries.length === 1) {
        return; // undefined
      }

      if (!exists && !removed && entries.length >= MAX_ARRAY_MAP_SIZE) {
        return createNodes(ownerID, entries, key, value);
      }

      var isEditable = ownerID && ownerID === this.ownerID;
      var newEntries = isEditable ? entries : arrCopy(entries);

      if (exists) {
        if (removed) {
          idx === len - 1 ? newEntries.pop() : (newEntries[idx] = newEntries.pop());
        } else {
          newEntries[idx] = [key, value];
        }
      } else {
        newEntries.push([key, value]);
      }

      if (isEditable) {
        this.entries = newEntries;
        return this;
      }

      return new ArrayMapNode(ownerID, newEntries);
    };




    function BitmapIndexedNode(ownerID, bitmap, nodes) {
      this.ownerID = ownerID;
      this.bitmap = bitmap;
      this.nodes = nodes;
    }

    BitmapIndexedNode.prototype.get = function(shift, keyHash, key, notSetValue) {
      if (keyHash === undefined) {
        keyHash = hash(key);
      }
      var bit = (1 << ((shift === 0 ? keyHash : keyHash >>> shift) & MASK));
      var bitmap = this.bitmap;
      return (bitmap & bit) === 0 ? notSetValue :
        this.nodes[popCount(bitmap & (bit - 1))].get(shift + SHIFT, keyHash, key, notSetValue);
    };

    BitmapIndexedNode.prototype.update = function(ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
      if (keyHash === undefined) {
        keyHash = hash(key);
      }
      var keyHashFrag = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;
      var bit = 1 << keyHashFrag;
      var bitmap = this.bitmap;
      var exists = (bitmap & bit) !== 0;

      if (!exists && value === NOT_SET) {
        return this;
      }

      var idx = popCount(bitmap & (bit - 1));
      var nodes = this.nodes;
      var node = exists ? nodes[idx] : undefined;
      var newNode = updateNode(node, ownerID, shift + SHIFT, keyHash, key, value, didChangeSize, didAlter);

      if (newNode === node) {
        return this;
      }

      if (!exists && newNode && nodes.length >= MAX_BITMAP_INDEXED_SIZE) {
        return expandNodes(ownerID, nodes, bitmap, keyHashFrag, newNode);
      }

      if (exists && !newNode && nodes.length === 2 && isLeafNode(nodes[idx ^ 1])) {
        return nodes[idx ^ 1];
      }

      if (exists && newNode && nodes.length === 1 && isLeafNode(newNode)) {
        return newNode;
      }

      var isEditable = ownerID && ownerID === this.ownerID;
      var newBitmap = exists ? newNode ? bitmap : bitmap ^ bit : bitmap | bit;
      var newNodes = exists ? newNode ?
        setIn(nodes, idx, newNode, isEditable) :
        spliceOut(nodes, idx, isEditable) :
        spliceIn(nodes, idx, newNode, isEditable);

      if (isEditable) {
        this.bitmap = newBitmap;
        this.nodes = newNodes;
        return this;
      }

      return new BitmapIndexedNode(ownerID, newBitmap, newNodes);
    };




    function HashArrayMapNode(ownerID, count, nodes) {
      this.ownerID = ownerID;
      this.count = count;
      this.nodes = nodes;
    }

    HashArrayMapNode.prototype.get = function(shift, keyHash, key, notSetValue) {
      if (keyHash === undefined) {
        keyHash = hash(key);
      }
      var idx = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;
      var node = this.nodes[idx];
      return node ? node.get(shift + SHIFT, keyHash, key, notSetValue) : notSetValue;
    };

    HashArrayMapNode.prototype.update = function(ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
      if (keyHash === undefined) {
        keyHash = hash(key);
      }
      var idx = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;
      var removed = value === NOT_SET;
      var nodes = this.nodes;
      var node = nodes[idx];

      if (removed && !node) {
        return this;
      }

      var newNode = updateNode(node, ownerID, shift + SHIFT, keyHash, key, value, didChangeSize, didAlter);
      if (newNode === node) {
        return this;
      }

      var newCount = this.count;
      if (!node) {
        newCount++;
      } else if (!newNode) {
        newCount--;
        if (newCount < MIN_HASH_ARRAY_MAP_SIZE) {
          return packNodes(ownerID, nodes, newCount, idx);
        }
      }

      var isEditable = ownerID && ownerID === this.ownerID;
      var newNodes = setIn(nodes, idx, newNode, isEditable);

      if (isEditable) {
        this.count = newCount;
        this.nodes = newNodes;
        return this;
      }

      return new HashArrayMapNode(ownerID, newCount, newNodes);
    };




    function HashCollisionNode(ownerID, keyHash, entries) {
      this.ownerID = ownerID;
      this.keyHash = keyHash;
      this.entries = entries;
    }

    HashCollisionNode.prototype.get = function(shift, keyHash, key, notSetValue) {
      var entries = this.entries;
      for (var ii = 0, len = entries.length; ii < len; ii++) {
        if (is(key, entries[ii][0])) {
          return entries[ii][1];
        }
      }
      return notSetValue;
    };

    HashCollisionNode.prototype.update = function(ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
      if (keyHash === undefined) {
        keyHash = hash(key);
      }

      var removed = value === NOT_SET;

      if (keyHash !== this.keyHash) {
        if (removed) {
          return this;
        }
        SetRef(didAlter);
        SetRef(didChangeSize);
        return mergeIntoNode(this, ownerID, shift, keyHash, [key, value]);
      }

      var entries = this.entries;
      var idx = 0;
      for (var len = entries.length; idx < len; idx++) {
        if (is(key, entries[idx][0])) {
          break;
        }
      }
      var exists = idx < len;

      if (exists ? entries[idx][1] === value : removed) {
        return this;
      }

      SetRef(didAlter);
      (removed || !exists) && SetRef(didChangeSize);

      if (removed && len === 2) {
        return new ValueNode(ownerID, this.keyHash, entries[idx ^ 1]);
      }

      var isEditable = ownerID && ownerID === this.ownerID;
      var newEntries = isEditable ? entries : arrCopy(entries);

      if (exists) {
        if (removed) {
          idx === len - 1 ? newEntries.pop() : (newEntries[idx] = newEntries.pop());
        } else {
          newEntries[idx] = [key, value];
        }
      } else {
        newEntries.push([key, value]);
      }

      if (isEditable) {
        this.entries = newEntries;
        return this;
      }

      return new HashCollisionNode(ownerID, this.keyHash, newEntries);
    };




    function ValueNode(ownerID, keyHash, entry) {
      this.ownerID = ownerID;
      this.keyHash = keyHash;
      this.entry = entry;
    }

    ValueNode.prototype.get = function(shift, keyHash, key, notSetValue) {
      return is(key, this.entry[0]) ? this.entry[1] : notSetValue;
    };

    ValueNode.prototype.update = function(ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
      var removed = value === NOT_SET;
      var keyMatch = is(key, this.entry[0]);
      if (keyMatch ? value === this.entry[1] : removed) {
        return this;
      }

      SetRef(didAlter);

      if (removed) {
        SetRef(didChangeSize);
        return; // undefined
      }

      if (keyMatch) {
        if (ownerID && ownerID === this.ownerID) {
          this.entry[1] = value;
          return this;
        }
        return new ValueNode(ownerID, this.keyHash, [key, value]);
      }

      SetRef(didChangeSize);
      return mergeIntoNode(this, ownerID, shift, hash(key), [key, value]);
    };



  // #pragma Iterators

  ArrayMapNode.prototype.iterate =
  HashCollisionNode.prototype.iterate = function (fn, reverse) {
    var entries = this.entries;
    for (var ii = 0, maxIndex = entries.length - 1; ii <= maxIndex; ii++) {
      if (fn(entries[reverse ? maxIndex - ii : ii]) === false) {
        return false;
      }
    }
  }

  BitmapIndexedNode.prototype.iterate =
  HashArrayMapNode.prototype.iterate = function (fn, reverse) {
    var nodes = this.nodes;
    for (var ii = 0, maxIndex = nodes.length - 1; ii <= maxIndex; ii++) {
      var node = nodes[reverse ? maxIndex - ii : ii];
      if (node && node.iterate(fn, reverse) === false) {
        return false;
      }
    }
  }

  ValueNode.prototype.iterate = function (fn, reverse) {
    return fn(this.entry);
  }

  createClass(MapIterator, Iterator);

    function MapIterator(map, type, reverse) {
      this._type = type;
      this._reverse = reverse;
      this._stack = map._root && mapIteratorFrame(map._root);
    }

    MapIterator.prototype.next = function() {
      var type = this._type;
      var stack = this._stack;
      while (stack) {
        var node = stack.node;
        var index = stack.index++;
        var maxIndex;
        if (node.entry) {
          if (index === 0) {
            return mapIteratorValue(type, node.entry);
          }
        } else if (node.entries) {
          maxIndex = node.entries.length - 1;
          if (index <= maxIndex) {
            return mapIteratorValue(type, node.entries[this._reverse ? maxIndex - index : index]);
          }
        } else {
          maxIndex = node.nodes.length - 1;
          if (index <= maxIndex) {
            var subNode = node.nodes[this._reverse ? maxIndex - index : index];
            if (subNode) {
              if (subNode.entry) {
                return mapIteratorValue(type, subNode.entry);
              }
              stack = this._stack = mapIteratorFrame(subNode, stack);
            }
            continue;
          }
        }
        stack = this._stack = this._stack.__prev;
      }
      return iteratorDone();
    };


  function mapIteratorValue(type, entry) {
    return iteratorValue(type, entry[0], entry[1]);
  }

  function mapIteratorFrame(node, prev) {
    return {
      node: node,
      index: 0,
      __prev: prev
    };
  }

  function makeMap(size, root, ownerID, hash) {
    var map = Object.create(MapPrototype);
    map.size = size;
    map._root = root;
    map.__ownerID = ownerID;
    map.__hash = hash;
    map.__altered = false;
    return map;
  }

  var EMPTY_MAP;
  function emptyMap() {
    return EMPTY_MAP || (EMPTY_MAP = makeMap(0));
  }

  function updateMap(map, k, v) {
    var newRoot;
    var newSize;
    if (!map._root) {
      if (v === NOT_SET) {
        return map;
      }
      newSize = 1;
      newRoot = new ArrayMapNode(map.__ownerID, [[k, v]]);
    } else {
      var didChangeSize = MakeRef(CHANGE_LENGTH);
      var didAlter = MakeRef(DID_ALTER);
      newRoot = updateNode(map._root, map.__ownerID, 0, undefined, k, v, didChangeSize, didAlter);
      if (!didAlter.value) {
        return map;
      }
      newSize = map.size + (didChangeSize.value ? v === NOT_SET ? -1 : 1 : 0);
    }
    if (map.__ownerID) {
      map.size = newSize;
      map._root = newRoot;
      map.__hash = undefined;
      map.__altered = true;
      return map;
    }
    return newRoot ? makeMap(newSize, newRoot) : emptyMap();
  }

  function updateNode(node, ownerID, shift, keyHash, key, value, didChangeSize, didAlter) {
    if (!node) {
      if (value === NOT_SET) {
        return node;
      }
      SetRef(didAlter);
      SetRef(didChangeSize);
      return new ValueNode(ownerID, keyHash, [key, value]);
    }
    return node.update(ownerID, shift, keyHash, key, value, didChangeSize, didAlter);
  }

  function isLeafNode(node) {
    return node.constructor === ValueNode || node.constructor === HashCollisionNode;
  }

  function mergeIntoNode(node, ownerID, shift, keyHash, entry) {
    if (node.keyHash === keyHash) {
      return new HashCollisionNode(ownerID, keyHash, [node.entry, entry]);
    }

    var idx1 = (shift === 0 ? node.keyHash : node.keyHash >>> shift) & MASK;
    var idx2 = (shift === 0 ? keyHash : keyHash >>> shift) & MASK;

    var newNode;
    var nodes = idx1 === idx2 ?
      [mergeIntoNode(node, ownerID, shift + SHIFT, keyHash, entry)] :
      ((newNode = new ValueNode(ownerID, keyHash, entry)), idx1 < idx2 ? [node, newNode] : [newNode, node]);

    return new BitmapIndexedNode(ownerID, (1 << idx1) | (1 << idx2), nodes);
  }

  function createNodes(ownerID, entries, key, value) {
    if (!ownerID) {
      ownerID = new OwnerID();
    }
    var node = new ValueNode(ownerID, hash(key), [key, value]);
    for (var ii = 0; ii < entries.length; ii++) {
      var entry = entries[ii];
      node = node.update(ownerID, 0, undefined, entry[0], entry[1]);
    }
    return node;
  }

  function packNodes(ownerID, nodes, count, excluding) {
    var bitmap = 0;
    var packedII = 0;
    var packedNodes = new Array(count);
    for (var ii = 0, bit = 1, len = nodes.length; ii < len; ii++, bit <<= 1) {
      var node = nodes[ii];
      if (node !== undefined && ii !== excluding) {
        bitmap |= bit;
        packedNodes[packedII++] = node;
      }
    }
    return new BitmapIndexedNode(ownerID, bitmap, packedNodes);
  }

  function expandNodes(ownerID, nodes, bitmap, including, node) {
    var count = 0;
    var expandedNodes = new Array(SIZE);
    for (var ii = 0; bitmap !== 0; ii++, bitmap >>>= 1) {
      expandedNodes[ii] = bitmap & 1 ? nodes[count++] : undefined;
    }
    expandedNodes[including] = node;
    return new HashArrayMapNode(ownerID, count + 1, expandedNodes);
  }

  function mergeIntoMapWith(map, merger, iterables) {
    var iters = [];
    for (var ii = 0; ii < iterables.length; ii++) {
      var value = iterables[ii];
      var iter = KeyedIterable(value);
      if (!isIterable(value)) {
        iter = iter.map(function(v ) {return fromJS(v)});
      }
      iters.push(iter);
    }
    return mergeIntoCollectionWith(map, merger, iters);
  }

  function deepMerger(existing, value, key) {
    return existing && existing.mergeDeep && isIterable(value) ?
      existing.mergeDeep(value) :
      is(existing, value) ? existing : value;
  }

  function deepMergerWith(merger) {
    return function(existing, value, key)  {
      if (existing && existing.mergeDeepWith && isIterable(value)) {
        return existing.mergeDeepWith(merger, value);
      }
      var nextValue = merger(existing, value, key);
      return is(existing, nextValue) ? existing : nextValue;
    };
  }

  function mergeIntoCollectionWith(collection, merger, iters) {
    iters = iters.filter(function(x ) {return x.size !== 0});
    if (iters.length === 0) {
      return collection;
    }
    if (collection.size === 0 && !collection.__ownerID && iters.length === 1) {
      return collection.constructor(iters[0]);
    }
    return collection.withMutations(function(collection ) {
      var mergeIntoMap = merger ?
        function(value, key)  {
          collection.update(key, NOT_SET, function(existing )
            {return existing === NOT_SET ? value : merger(existing, value, key)}
          );
        } :
        function(value, key)  {
          collection.set(key, value);
        }
      for (var ii = 0; ii < iters.length; ii++) {
        iters[ii].forEach(mergeIntoMap);
      }
    });
  }

  function updateInDeepMap(existing, keyPathIter, notSetValue, updater) {
    var isNotSet = existing === NOT_SET;
    var step = keyPathIter.next();
    if (step.done) {
      var existingValue = isNotSet ? notSetValue : existing;
      var newValue = updater(existingValue);
      return newValue === existingValue ? existing : newValue;
    }
    invariant(
      isNotSet || (existing && existing.set),
      'invalid keyPath'
    );
    var key = step.value;
    var nextExisting = isNotSet ? NOT_SET : existing.get(key, NOT_SET);
    var nextUpdated = updateInDeepMap(
      nextExisting,
      keyPathIter,
      notSetValue,
      updater
    );
    return nextUpdated === nextExisting ? existing :
      nextUpdated === NOT_SET ? existing.remove(key) :
      (isNotSet ? emptyMap() : existing).set(key, nextUpdated);
  }

  function popCount(x) {
    x = x - ((x >> 1) & 0x55555555);
    x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
    x = (x + (x >> 4)) & 0x0f0f0f0f;
    x = x + (x >> 8);
    x = x + (x >> 16);
    return x & 0x7f;
  }

  function setIn(array, idx, val, canEdit) {
    var newArray = canEdit ? array : arrCopy(array);
    newArray[idx] = val;
    return newArray;
  }

  function spliceIn(array, idx, val, canEdit) {
    var newLen = array.length + 1;
    if (canEdit && idx + 1 === newLen) {
      array[idx] = val;
      return array;
    }
    var newArray = new Array(newLen);
    var after = 0;
    for (var ii = 0; ii < newLen; ii++) {
      if (ii === idx) {
        newArray[ii] = val;
        after = -1;
      } else {
        newArray[ii] = array[ii + after];
      }
    }
    return newArray;
  }

  function spliceOut(array, idx, canEdit) {
    var newLen = array.length - 1;
    if (canEdit && idx === newLen) {
      array.pop();
      return array;
    }
    var newArray = new Array(newLen);
    var after = 0;
    for (var ii = 0; ii < newLen; ii++) {
      if (ii === idx) {
        after = 1;
      }
      newArray[ii] = array[ii + after];
    }
    return newArray;
  }

  var MAX_ARRAY_MAP_SIZE = SIZE / 4;
  var MAX_BITMAP_INDEXED_SIZE = SIZE / 2;
  var MIN_HASH_ARRAY_MAP_SIZE = SIZE / 4;

  createClass(List, IndexedCollection);

    // @pragma Construction

    function List(value) {
      var empty = emptyList();
      if (value === null || value === undefined) {
        return empty;
      }
      if (isList(value)) {
        return value;
      }
      var iter = IndexedIterable(value);
      var size = iter.size;
      if (size === 0) {
        return empty;
      }
      assertNotInfinite(size);
      if (size > 0 && size < SIZE) {
        return makeList(0, size, SHIFT, null, new VNode(iter.toArray()));
      }
      return empty.withMutations(function(list ) {
        list.setSize(size);
        iter.forEach(function(v, i)  {return list.set(i, v)});
      });
    }

    List.of = function(/*...values*/) {
      return this(arguments);
    };

    List.prototype.toString = function() {
      return this.__toString('List [', ']');
    };

    // @pragma Access

    List.prototype.get = function(index, notSetValue) {
      index = wrapIndex(this, index);
      if (index >= 0 && index < this.size) {
        index += this._origin;
        var node = listNodeFor(this, index);
        return node && node.array[index & MASK];
      }
      return notSetValue;
    };

    // @pragma Modification

    List.prototype.set = function(index, value) {
      return updateList(this, index, value);
    };

    List.prototype.remove = function(index) {
      return !this.has(index) ? this :
        index === 0 ? this.shift() :
        index === this.size - 1 ? this.pop() :
        this.splice(index, 1);
    };

    List.prototype.insert = function(index, value) {
      return this.splice(index, 0, value);
    };

    List.prototype.clear = function() {
      if (this.size === 0) {
        return this;
      }
      if (this.__ownerID) {
        this.size = this._origin = this._capacity = 0;
        this._level = SHIFT;
        this._root = this._tail = null;
        this.__hash = undefined;
        this.__altered = true;
        return this;
      }
      return emptyList();
    };

    List.prototype.push = function(/*...values*/) {
      var values = arguments;
      var oldSize = this.size;
      return this.withMutations(function(list ) {
        setListBounds(list, 0, oldSize + values.length);
        for (var ii = 0; ii < values.length; ii++) {
          list.set(oldSize + ii, values[ii]);
        }
      });
    };

    List.prototype.pop = function() {
      return setListBounds(this, 0, -1);
    };

    List.prototype.unshift = function(/*...values*/) {
      var values = arguments;
      return this.withMutations(function(list ) {
        setListBounds(list, -values.length);
        for (var ii = 0; ii < values.length; ii++) {
          list.set(ii, values[ii]);
        }
      });
    };

    List.prototype.shift = function() {
      return setListBounds(this, 1);
    };

    // @pragma Composition

    List.prototype.merge = function(/*...iters*/) {
      return mergeIntoListWith(this, undefined, arguments);
    };

    List.prototype.mergeWith = function(merger) {var iters = SLICE$0.call(arguments, 1);
      return mergeIntoListWith(this, merger, iters);
    };

    List.prototype.mergeDeep = function(/*...iters*/) {
      return mergeIntoListWith(this, deepMerger, arguments);
    };

    List.prototype.mergeDeepWith = function(merger) {var iters = SLICE$0.call(arguments, 1);
      return mergeIntoListWith(this, deepMergerWith(merger), iters);
    };

    List.prototype.setSize = function(size) {
      return setListBounds(this, 0, size);
    };

    // @pragma Iteration

    List.prototype.slice = function(begin, end) {
      var size = this.size;
      if (wholeSlice(begin, end, size)) {
        return this;
      }
      return setListBounds(
        this,
        resolveBegin(begin, size),
        resolveEnd(end, size)
      );
    };

    List.prototype.__iterator = function(type, reverse) {
      var index = 0;
      var values = iterateList(this, reverse);
      return new Iterator(function()  {
        var value = values();
        return value === DONE ?
          iteratorDone() :
          iteratorValue(type, index++, value);
      });
    };

    List.prototype.__iterate = function(fn, reverse) {
      var index = 0;
      var values = iterateList(this, reverse);
      var value;
      while ((value = values()) !== DONE) {
        if (fn(value, index++, this) === false) {
          break;
        }
      }
      return index;
    };

    List.prototype.__ensureOwner = function(ownerID) {
      if (ownerID === this.__ownerID) {
        return this;
      }
      if (!ownerID) {
        this.__ownerID = ownerID;
        return this;
      }
      return makeList(this._origin, this._capacity, this._level, this._root, this._tail, ownerID, this.__hash);
    };


  function isList(maybeList) {
    return !!(maybeList && maybeList[IS_LIST_SENTINEL]);
  }

  List.isList = isList;

  var IS_LIST_SENTINEL = '@@__IMMUTABLE_LIST__@@';

  var ListPrototype = List.prototype;
  ListPrototype[IS_LIST_SENTINEL] = true;
  ListPrototype[DELETE] = ListPrototype.remove;
  ListPrototype.setIn = MapPrototype.setIn;
  ListPrototype.deleteIn =
  ListPrototype.removeIn = MapPrototype.removeIn;
  ListPrototype.update = MapPrototype.update;
  ListPrototype.updateIn = MapPrototype.updateIn;
  ListPrototype.mergeIn = MapPrototype.mergeIn;
  ListPrototype.mergeDeepIn = MapPrototype.mergeDeepIn;
  ListPrototype.withMutations = MapPrototype.withMutations;
  ListPrototype.asMutable = MapPrototype.asMutable;
  ListPrototype.asImmutable = MapPrototype.asImmutable;
  ListPrototype.wasAltered = MapPrototype.wasAltered;



    function VNode(array, ownerID) {
      this.array = array;
      this.ownerID = ownerID;
    }

    // TODO: seems like these methods are very similar

    VNode.prototype.removeBefore = function(ownerID, level, index) {
      if (index === level ? 1 << level : 0 || this.array.length === 0) {
        return this;
      }
      var originIndex = (index >>> level) & MASK;
      if (originIndex >= this.array.length) {
        return new VNode([], ownerID);
      }
      var removingFirst = originIndex === 0;
      var newChild;
      if (level > 0) {
        var oldChild = this.array[originIndex];
        newChild = oldChild && oldChild.removeBefore(ownerID, level - SHIFT, index);
        if (newChild === oldChild && removingFirst) {
          return this;
        }
      }
      if (removingFirst && !newChild) {
        return this;
      }
      var editable = editableVNode(this, ownerID);
      if (!removingFirst) {
        for (var ii = 0; ii < originIndex; ii++) {
          editable.array[ii] = undefined;
        }
      }
      if (newChild) {
        editable.array[originIndex] = newChild;
      }
      return editable;
    };

    VNode.prototype.removeAfter = function(ownerID, level, index) {
      if (index === (level ? 1 << level : 0) || this.array.length === 0) {
        return this;
      }
      var sizeIndex = ((index - 1) >>> level) & MASK;
      if (sizeIndex >= this.array.length) {
        return this;
      }

      var newChild;
      if (level > 0) {
        var oldChild = this.array[sizeIndex];
        newChild = oldChild && oldChild.removeAfter(ownerID, level - SHIFT, index);
        if (newChild === oldChild && sizeIndex === this.array.length - 1) {
          return this;
        }
      }

      var editable = editableVNode(this, ownerID);
      editable.array.splice(sizeIndex + 1);
      if (newChild) {
        editable.array[sizeIndex] = newChild;
      }
      return editable;
    };



  var DONE = {};

  function iterateList(list, reverse) {
    var left = list._origin;
    var right = list._capacity;
    var tailPos = getTailOffset(right);
    var tail = list._tail;

    return iterateNodeOrLeaf(list._root, list._level, 0);

    function iterateNodeOrLeaf(node, level, offset) {
      return level === 0 ?
        iterateLeaf(node, offset) :
        iterateNode(node, level, offset);
    }

    function iterateLeaf(node, offset) {
      var array = offset === tailPos ? tail && tail.array : node && node.array;
      var from = offset > left ? 0 : left - offset;
      var to = right - offset;
      if (to > SIZE) {
        to = SIZE;
      }
      return function()  {
        if (from === to) {
          return DONE;
        }
        var idx = reverse ? --to : from++;
        return array && array[idx];
      };
    }

    function iterateNode(node, level, offset) {
      var values;
      var array = node && node.array;
      var from = offset > left ? 0 : (left - offset) >> level;
      var to = ((right - offset) >> level) + 1;
      if (to > SIZE) {
        to = SIZE;
      }
      return function()  {
        do {
          if (values) {
            var value = values();
            if (value !== DONE) {
              return value;
            }
            values = null;
          }
          if (from === to) {
            return DONE;
          }
          var idx = reverse ? --to : from++;
          values = iterateNodeOrLeaf(
            array && array[idx], level - SHIFT, offset + (idx << level)
          );
        } while (true);
      };
    }
  }

  function makeList(origin, capacity, level, root, tail, ownerID, hash) {
    var list = Object.create(ListPrototype);
    list.size = capacity - origin;
    list._origin = origin;
    list._capacity = capacity;
    list._level = level;
    list._root = root;
    list._tail = tail;
    list.__ownerID = ownerID;
    list.__hash = hash;
    list.__altered = false;
    return list;
  }

  var EMPTY_LIST;
  function emptyList() {
    return EMPTY_LIST || (EMPTY_LIST = makeList(0, 0, SHIFT));
  }

  function updateList(list, index, value) {
    index = wrapIndex(list, index);

    if (index !== index) {
      return list;
    }

    if (index >= list.size || index < 0) {
      return list.withMutations(function(list ) {
        index < 0 ?
          setListBounds(list, index).set(0, value) :
          setListBounds(list, 0, index + 1).set(index, value)
      });
    }

    index += list._origin;

    var newTail = list._tail;
    var newRoot = list._root;
    var didAlter = MakeRef(DID_ALTER);
    if (index >= getTailOffset(list._capacity)) {
      newTail = updateVNode(newTail, list.__ownerID, 0, index, value, didAlter);
    } else {
      newRoot = updateVNode(newRoot, list.__ownerID, list._level, index, value, didAlter);
    }

    if (!didAlter.value) {
      return list;
    }

    if (list.__ownerID) {
      list._root = newRoot;
      list._tail = newTail;
      list.__hash = undefined;
      list.__altered = true;
      return list;
    }
    return makeList(list._origin, list._capacity, list._level, newRoot, newTail);
  }

  function updateVNode(node, ownerID, level, index, value, didAlter) {
    var idx = (index >>> level) & MASK;
    var nodeHas = node && idx < node.array.length;
    if (!nodeHas && value === undefined) {
      return node;
    }

    var newNode;

    if (level > 0) {
      var lowerNode = node && node.array[idx];
      var newLowerNode = updateVNode(lowerNode, ownerID, level - SHIFT, index, value, didAlter);
      if (newLowerNode === lowerNode) {
        return node;
      }
      newNode = editableVNode(node, ownerID);
      newNode.array[idx] = newLowerNode;
      return newNode;
    }

    if (nodeHas && node.array[idx] === value) {
      return node;
    }

    SetRef(didAlter);

    newNode = editableVNode(node, ownerID);
    if (value === undefined && idx === newNode.array.length - 1) {
      newNode.array.pop();
    } else {
      newNode.array[idx] = value;
    }
    return newNode;
  }

  function editableVNode(node, ownerID) {
    if (ownerID && node && ownerID === node.ownerID) {
      return node;
    }
    return new VNode(node ? node.array.slice() : [], ownerID);
  }

  function listNodeFor(list, rawIndex) {
    if (rawIndex >= getTailOffset(list._capacity)) {
      return list._tail;
    }
    if (rawIndex < 1 << (list._level + SHIFT)) {
      var node = list._root;
      var level = list._level;
      while (node && level > 0) {
        node = node.array[(rawIndex >>> level) & MASK];
        level -= SHIFT;
      }
      return node;
    }
  }

  function setListBounds(list, begin, end) {
    // Sanitize begin & end using this shorthand for ToInt32(argument)
    // http://www.ecma-international.org/ecma-262/6.0/#sec-toint32
    if (begin !== undefined) {
      begin = begin | 0;
    }
    if (end !== undefined) {
      end = end | 0;
    }
    var owner = list.__ownerID || new OwnerID();
    var oldOrigin = list._origin;
    var oldCapacity = list._capacity;
    var newOrigin = oldOrigin + begin;
    var newCapacity = end === undefined ? oldCapacity : end < 0 ? oldCapacity + end : oldOrigin + end;
    if (newOrigin === oldOrigin && newCapacity === oldCapacity) {
      return list;
    }

    // If it's going to end after it starts, it's empty.
    if (newOrigin >= newCapacity) {
      return list.clear();
    }

    var newLevel = list._level;
    var newRoot = list._root;

    // New origin might need creating a higher root.
    var offsetShift = 0;
    while (newOrigin + offsetShift < 0) {
      newRoot = new VNode(newRoot && newRoot.array.length ? [undefined, newRoot] : [], owner);
      newLevel += SHIFT;
      offsetShift += 1 << newLevel;
    }
    if (offsetShift) {
      newOrigin += offsetShift;
      oldOrigin += offsetShift;
      newCapacity += offsetShift;
      oldCapacity += offsetShift;
    }

    var oldTailOffset = getTailOffset(oldCapacity);
    var newTailOffset = getTailOffset(newCapacity);

    // New size might need creating a higher root.
    while (newTailOffset >= 1 << (newLevel + SHIFT)) {
      newRoot = new VNode(newRoot && newRoot.array.length ? [newRoot] : [], owner);
      newLevel += SHIFT;
    }

    // Locate or create the new tail.
    var oldTail = list._tail;
    var newTail = newTailOffset < oldTailOffset ?
      listNodeFor(list, newCapacity - 1) :
      newTailOffset > oldTailOffset ? new VNode([], owner) : oldTail;

    // Merge Tail into tree.
    if (oldTail && newTailOffset > oldTailOffset && newOrigin < oldCapacity && oldTail.array.length) {
      newRoot = editableVNode(newRoot, owner);
      var node = newRoot;
      for (var level = newLevel; level > SHIFT; level -= SHIFT) {
        var idx = (oldTailOffset >>> level) & MASK;
        node = node.array[idx] = editableVNode(node.array[idx], owner);
      }
      node.array[(oldTailOffset >>> SHIFT) & MASK] = oldTail;
    }

    // If the size has been reduced, there's a chance the tail needs to be trimmed.
    if (newCapacity < oldCapacity) {
      newTail = newTail && newTail.removeAfter(owner, 0, newCapacity);
    }

    // If the new origin is within the tail, then we do not need a root.
    if (newOrigin >= newTailOffset) {
      newOrigin -= newTailOffset;
      newCapacity -= newTailOffset;
      newLevel = SHIFT;
      newRoot = null;
      newTail = newTail && newTail.removeBefore(owner, 0, newOrigin);

    // Otherwise, if the root has been trimmed, garbage collect.
    } else if (newOrigin > oldOrigin || newTailOffset < oldTailOffset) {
      offsetShift = 0;

      // Identify the new top root node of the subtree of the old root.
      while (newRoot) {
        var beginIndex = (newOrigin >>> newLevel) & MASK;
        if (beginIndex !== (newTailOffset >>> newLevel) & MASK) {
          break;
        }
        if (beginIndex) {
          offsetShift += (1 << newLevel) * beginIndex;
        }
        newLevel -= SHIFT;
        newRoot = newRoot.array[beginIndex];
      }

      // Trim the new sides of the new root.
      if (newRoot && newOrigin > oldOrigin) {
        newRoot = newRoot.removeBefore(owner, newLevel, newOrigin - offsetShift);
      }
      if (newRoot && newTailOffset < oldTailOffset) {
        newRoot = newRoot.removeAfter(owner, newLevel, newTailOffset - offsetShift);
      }
      if (offsetShift) {
        newOrigin -= offsetShift;
        newCapacity -= offsetShift;
      }
    }

    if (list.__ownerID) {
      list.size = newCapacity - newOrigin;
      list._origin = newOrigin;
      list._capacity = newCapacity;
      list._level = newLevel;
      list._root = newRoot;
      list._tail = newTail;
      list.__hash = undefined;
      list.__altered = true;
      return list;
    }
    return makeList(newOrigin, newCapacity, newLevel, newRoot, newTail);
  }

  function mergeIntoListWith(list, merger, iterables) {
    var iters = [];
    var maxSize = 0;
    for (var ii = 0; ii < iterables.length; ii++) {
      var value = iterables[ii];
      var iter = IndexedIterable(value);
      if (iter.size > maxSize) {
        maxSize = iter.size;
      }
      if (!isIterable(value)) {
        iter = iter.map(function(v ) {return fromJS(v)});
      }
      iters.push(iter);
    }
    if (maxSize > list.size) {
      list = list.setSize(maxSize);
    }
    return mergeIntoCollectionWith(list, merger, iters);
  }

  function getTailOffset(size) {
    return size < SIZE ? 0 : (((size - 1) >>> SHIFT) << SHIFT);
  }

  createClass(OrderedMap, Map);

    // @pragma Construction

    function OrderedMap(value) {
      return value === null || value === undefined ? emptyOrderedMap() :
        isOrderedMap(value) ? value :
        emptyOrderedMap().withMutations(function(map ) {
          var iter = KeyedIterable(value);
          assertNotInfinite(iter.size);
          iter.forEach(function(v, k)  {return map.set(k, v)});
        });
    }

    OrderedMap.of = function(/*...values*/) {
      return this(arguments);
    };

    OrderedMap.prototype.toString = function() {
      return this.__toString('OrderedMap {', '}');
    };

    // @pragma Access

    OrderedMap.prototype.get = function(k, notSetValue) {
      var index = this._map.get(k);
      return index !== undefined ? this._list.get(index)[1] : notSetValue;
    };

    // @pragma Modification

    OrderedMap.prototype.clear = function() {
      if (this.size === 0) {
        return this;
      }
      if (this.__ownerID) {
        this.size = 0;
        this._map.clear();
        this._list.clear();
        return this;
      }
      return emptyOrderedMap();
    };

    OrderedMap.prototype.set = function(k, v) {
      return updateOrderedMap(this, k, v);
    };

    OrderedMap.prototype.remove = function(k) {
      return updateOrderedMap(this, k, NOT_SET);
    };

    OrderedMap.prototype.wasAltered = function() {
      return this._map.wasAltered() || this._list.wasAltered();
    };

    OrderedMap.prototype.__iterate = function(fn, reverse) {var this$0 = this;
      return this._list.__iterate(
        function(entry ) {return entry && fn(entry[1], entry[0], this$0)},
        reverse
      );
    };

    OrderedMap.prototype.__iterator = function(type, reverse) {
      return this._list.fromEntrySeq().__iterator(type, reverse);
    };

    OrderedMap.prototype.__ensureOwner = function(ownerID) {
      if (ownerID === this.__ownerID) {
        return this;
      }
      var newMap = this._map.__ensureOwner(ownerID);
      var newList = this._list.__ensureOwner(ownerID);
      if (!ownerID) {
        this.__ownerID = ownerID;
        this._map = newMap;
        this._list = newList;
        return this;
      }
      return makeOrderedMap(newMap, newList, ownerID, this.__hash);
    };


  function isOrderedMap(maybeOrderedMap) {
    return isMap(maybeOrderedMap) && isOrdered(maybeOrderedMap);
  }

  OrderedMap.isOrderedMap = isOrderedMap;

  OrderedMap.prototype[IS_ORDERED_SENTINEL] = true;
  OrderedMap.prototype[DELETE] = OrderedMap.prototype.remove;



  function makeOrderedMap(map, list, ownerID, hash) {
    var omap = Object.create(OrderedMap.prototype);
    omap.size = map ? map.size : 0;
    omap._map = map;
    omap._list = list;
    omap.__ownerID = ownerID;
    omap.__hash = hash;
    return omap;
  }

  var EMPTY_ORDERED_MAP;
  function emptyOrderedMap() {
    return EMPTY_ORDERED_MAP || (EMPTY_ORDERED_MAP = makeOrderedMap(emptyMap(), emptyList()));
  }

  function updateOrderedMap(omap, k, v) {
    var map = omap._map;
    var list = omap._list;
    var i = map.get(k);
    var has = i !== undefined;
    var newMap;
    var newList;
    if (v === NOT_SET) { // removed
      if (!has) {
        return omap;
      }
      if (list.size >= SIZE && list.size >= map.size * 2) {
        newList = list.filter(function(entry, idx)  {return entry !== undefined && i !== idx});
        newMap = newList.toKeyedSeq().map(function(entry ) {return entry[0]}).flip().toMap();
        if (omap.__ownerID) {
          newMap.__ownerID = newList.__ownerID = omap.__ownerID;
        }
      } else {
        newMap = map.remove(k);
        newList = i === list.size - 1 ? list.pop() : list.set(i, undefined);
      }
    } else {
      if (has) {
        if (v === list.get(i)[1]) {
          return omap;
        }
        newMap = map;
        newList = list.set(i, [k, v]);
      } else {
        newMap = map.set(k, list.size);
        newList = list.set(list.size, [k, v]);
      }
    }
    if (omap.__ownerID) {
      omap.size = newMap.size;
      omap._map = newMap;
      omap._list = newList;
      omap.__hash = undefined;
      return omap;
    }
    return makeOrderedMap(newMap, newList);
  }

  createClass(ToKeyedSequence, KeyedSeq);
    function ToKeyedSequence(indexed, useKeys) {
      this._iter = indexed;
      this._useKeys = useKeys;
      this.size = indexed.size;
    }

    ToKeyedSequence.prototype.get = function(key, notSetValue) {
      return this._iter.get(key, notSetValue);
    };

    ToKeyedSequence.prototype.has = function(key) {
      return this._iter.has(key);
    };

    ToKeyedSequence.prototype.valueSeq = function() {
      return this._iter.valueSeq();
    };

    ToKeyedSequence.prototype.reverse = function() {var this$0 = this;
      var reversedSequence = reverseFactory(this, true);
      if (!this._useKeys) {
        reversedSequence.valueSeq = function()  {return this$0._iter.toSeq().reverse()};
      }
      return reversedSequence;
    };

    ToKeyedSequence.prototype.map = function(mapper, context) {var this$0 = this;
      var mappedSequence = mapFactory(this, mapper, context);
      if (!this._useKeys) {
        mappedSequence.valueSeq = function()  {return this$0._iter.toSeq().map(mapper, context)};
      }
      return mappedSequence;
    };

    ToKeyedSequence.prototype.__iterate = function(fn, reverse) {var this$0 = this;
      var ii;
      return this._iter.__iterate(
        this._useKeys ?
          function(v, k)  {return fn(v, k, this$0)} :
          ((ii = reverse ? resolveSize(this) : 0),
            function(v ) {return fn(v, reverse ? --ii : ii++, this$0)}),
        reverse
      );
    };

    ToKeyedSequence.prototype.__iterator = function(type, reverse) {
      if (this._useKeys) {
        return this._iter.__iterator(type, reverse);
      }
      var iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
      var ii = reverse ? resolveSize(this) : 0;
      return new Iterator(function()  {
        var step = iterator.next();
        return step.done ? step :
          iteratorValue(type, reverse ? --ii : ii++, step.value, step);
      });
    };

  ToKeyedSequence.prototype[IS_ORDERED_SENTINEL] = true;


  createClass(ToIndexedSequence, IndexedSeq);
    function ToIndexedSequence(iter) {
      this._iter = iter;
      this.size = iter.size;
    }

    ToIndexedSequence.prototype.includes = function(value) {
      return this._iter.includes(value);
    };

    ToIndexedSequence.prototype.__iterate = function(fn, reverse) {var this$0 = this;
      var iterations = 0;
      return this._iter.__iterate(function(v ) {return fn(v, iterations++, this$0)}, reverse);
    };

    ToIndexedSequence.prototype.__iterator = function(type, reverse) {
      var iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
      var iterations = 0;
      return new Iterator(function()  {
        var step = iterator.next();
        return step.done ? step :
          iteratorValue(type, iterations++, step.value, step)
      });
    };



  createClass(ToSetSequence, SetSeq);
    function ToSetSequence(iter) {
      this._iter = iter;
      this.size = iter.size;
    }

    ToSetSequence.prototype.has = function(key) {
      return this._iter.includes(key);
    };

    ToSetSequence.prototype.__iterate = function(fn, reverse) {var this$0 = this;
      return this._iter.__iterate(function(v ) {return fn(v, v, this$0)}, reverse);
    };

    ToSetSequence.prototype.__iterator = function(type, reverse) {
      var iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
      return new Iterator(function()  {
        var step = iterator.next();
        return step.done ? step :
          iteratorValue(type, step.value, step.value, step);
      });
    };



  createClass(FromEntriesSequence, KeyedSeq);
    function FromEntriesSequence(entries) {
      this._iter = entries;
      this.size = entries.size;
    }

    FromEntriesSequence.prototype.entrySeq = function() {
      return this._iter.toSeq();
    };

    FromEntriesSequence.prototype.__iterate = function(fn, reverse) {var this$0 = this;
      return this._iter.__iterate(function(entry ) {
        // Check if entry exists first so array access doesn't throw for holes
        // in the parent iteration.
        if (entry) {
          validateEntry(entry);
          var indexedIterable = isIterable(entry);
          return fn(
            indexedIterable ? entry.get(1) : entry[1],
            indexedIterable ? entry.get(0) : entry[0],
            this$0
          );
        }
      }, reverse);
    };

    FromEntriesSequence.prototype.__iterator = function(type, reverse) {
      var iterator = this._iter.__iterator(ITERATE_VALUES, reverse);
      return new Iterator(function()  {
        while (true) {
          var step = iterator.next();
          if (step.done) {
            return step;
          }
          var entry = step.value;
          // Check if entry exists first so array access doesn't throw for holes
          // in the parent iteration.
          if (entry) {
            validateEntry(entry);
            var indexedIterable = isIterable(entry);
            return iteratorValue(
              type,
              indexedIterable ? entry.get(0) : entry[0],
              indexedIterable ? entry.get(1) : entry[1],
              step
            );
          }
        }
      });
    };


  ToIndexedSequence.prototype.cacheResult =
  ToKeyedSequence.prototype.cacheResult =
  ToSetSequence.prototype.cacheResult =
  FromEntriesSequence.prototype.cacheResult =
    cacheResultThrough;


  function flipFactory(iterable) {
    var flipSequence = makeSequence(iterable);
    flipSequence._iter = iterable;
    flipSequence.size = iterable.size;
    flipSequence.flip = function()  {return iterable};
    flipSequence.reverse = function () {
      var reversedSequence = iterable.reverse.apply(this); // super.reverse()
      reversedSequence.flip = function()  {return iterable.reverse()};
      return reversedSequence;
    };
    flipSequence.has = function(key ) {return iterable.includes(key)};
    flipSequence.includes = function(key ) {return iterable.has(key)};
    flipSequence.cacheResult = cacheResultThrough;
    flipSequence.__iterateUncached = function (fn, reverse) {var this$0 = this;
      return iterable.__iterate(function(v, k)  {return fn(k, v, this$0) !== false}, reverse);
    }
    flipSequence.__iteratorUncached = function(type, reverse) {
      if (type === ITERATE_ENTRIES) {
        var iterator = iterable.__iterator(type, reverse);
        return new Iterator(function()  {
          var step = iterator.next();
          if (!step.done) {
            var k = step.value[0];
            step.value[0] = step.value[1];
            step.value[1] = k;
          }
          return step;
        });
      }
      return iterable.__iterator(
        type === ITERATE_VALUES ? ITERATE_KEYS : ITERATE_VALUES,
        reverse
      );
    }
    return flipSequence;
  }


  function mapFactory(iterable, mapper, context) {
    var mappedSequence = makeSequence(iterable);
    mappedSequence.size = iterable.size;
    mappedSequence.has = function(key ) {return iterable.has(key)};
    mappedSequence.get = function(key, notSetValue)  {
      var v = iterable.get(key, NOT_SET);
      return v === NOT_SET ?
        notSetValue :
        mapper.call(context, v, key, iterable);
    };
    mappedSequence.__iterateUncached = function (fn, reverse) {var this$0 = this;
      return iterable.__iterate(
        function(v, k, c)  {return fn(mapper.call(context, v, k, c), k, this$0) !== false},
        reverse
      );
    }
    mappedSequence.__iteratorUncached = function (type, reverse) {
      var iterator = iterable.__iterator(ITERATE_ENTRIES, reverse);
      return new Iterator(function()  {
        var step = iterator.next();
        if (step.done) {
          return step;
        }
        var entry = step.value;
        var key = entry[0];
        return iteratorValue(
          type,
          key,
          mapper.call(context, entry[1], key, iterable),
          step
        );
      });
    }
    return mappedSequence;
  }


  function reverseFactory(iterable, useKeys) {
    var reversedSequence = makeSequence(iterable);
    reversedSequence._iter = iterable;
    reversedSequence.size = iterable.size;
    reversedSequence.reverse = function()  {return iterable};
    if (iterable.flip) {
      reversedSequence.flip = function () {
        var flipSequence = flipFactory(iterable);
        flipSequence.reverse = function()  {return iterable.flip()};
        return flipSequence;
      };
    }
    reversedSequence.get = function(key, notSetValue) 
      {return iterable.get(useKeys ? key : -1 - key, notSetValue)};
    reversedSequence.has = function(key )
      {return iterable.has(useKeys ? key : -1 - key)};
    reversedSequence.includes = function(value ) {return iterable.includes(value)};
    reversedSequence.cacheResult = cacheResultThrough;
    reversedSequence.__iterate = function (fn, reverse) {var this$0 = this;
      return iterable.__iterate(function(v, k)  {return fn(v, k, this$0)}, !reverse);
    };
    reversedSequence.__iterator =
      function(type, reverse)  {return iterable.__iterator(type, !reverse)};
    return reversedSequence;
  }


  function filterFactory(iterable, predicate, context, useKeys) {
    var filterSequence = makeSequence(iterable);
    if (useKeys) {
      filterSequence.has = function(key ) {
        var v = iterable.get(key, NOT_SET);
        return v !== NOT_SET && !!predicate.call(context, v, key, iterable);
      };
      filterSequence.get = function(key, notSetValue)  {
        var v = iterable.get(key, NOT_SET);
        return v !== NOT_SET && predicate.call(context, v, key, iterable) ?
          v : notSetValue;
      };
    }
    filterSequence.__iterateUncached = function (fn, reverse) {var this$0 = this;
      var iterations = 0;
      iterable.__iterate(function(v, k, c)  {
        if (predicate.call(context, v, k, c)) {
          iterations++;
          return fn(v, useKeys ? k : iterations - 1, this$0);
        }
      }, reverse);
      return iterations;
    };
    filterSequence.__iteratorUncached = function (type, reverse) {
      var iterator = iterable.__iterator(ITERATE_ENTRIES, reverse);
      var iterations = 0;
      return new Iterator(function()  {
        while (true) {
          var step = iterator.next();
          if (step.done) {
            return step;
          }
          var entry = step.value;
          var key = entry[0];
          var value = entry[1];
          if (predicate.call(context, value, key, iterable)) {
            return iteratorValue(type, useKeys ? key : iterations++, value, step);
          }
        }
      });
    }
    return filterSequence;
  }


  function countByFactory(iterable, grouper, context) {
    var groups = Map().asMutable();
    iterable.__iterate(function(v, k)  {
      groups.update(
        grouper.call(context, v, k, iterable),
        0,
        function(a ) {return a + 1}
      );
    });
    return groups.asImmutable();
  }


  function groupByFactory(iterable, grouper, context) {
    var isKeyedIter = isKeyed(iterable);
    var groups = (isOrdered(iterable) ? OrderedMap() : Map()).asMutable();
    iterable.__iterate(function(v, k)  {
      groups.update(
        grouper.call(context, v, k, iterable),
        function(a ) {return (a = a || [], a.push(isKeyedIter ? [k, v] : v), a)}
      );
    });
    var coerce = iterableClass(iterable);
    return groups.map(function(arr ) {return reify(iterable, coerce(arr))});
  }


  function sliceFactory(iterable, begin, end, useKeys) {
    var originalSize = iterable.size;

    // Sanitize begin & end using this shorthand for ToInt32(argument)
    // http://www.ecma-international.org/ecma-262/6.0/#sec-toint32
    if (begin !== undefined) {
      begin = begin | 0;
    }
    if (end !== undefined) {
      if (end === Infinity) {
        end = originalSize;
      } else {
        end = end | 0;
      }
    }

    if (wholeSlice(begin, end, originalSize)) {
      return iterable;
    }

    var resolvedBegin = resolveBegin(begin, originalSize);
    var resolvedEnd = resolveEnd(end, originalSize);

    // begin or end will be NaN if they were provided as negative numbers and
    // this iterable's size is unknown. In that case, cache first so there is
    // a known size and these do not resolve to NaN.
    if (resolvedBegin !== resolvedBegin || resolvedEnd !== resolvedEnd) {
      return sliceFactory(iterable.toSeq().cacheResult(), begin, end, useKeys);
    }

    // Note: resolvedEnd is undefined when the original sequence's length is
    // unknown and this slice did not supply an end and should contain all
    // elements after resolvedBegin.
    // In that case, resolvedSize will be NaN and sliceSize will remain undefined.
    var resolvedSize = resolvedEnd - resolvedBegin;
    var sliceSize;
    if (resolvedSize === resolvedSize) {
      sliceSize = resolvedSize < 0 ? 0 : resolvedSize;
    }

    var sliceSeq = makeSequence(iterable);

    // If iterable.size is undefined, the size of the realized sliceSeq is
    // unknown at this point unless the number of items to slice is 0
    sliceSeq.size = sliceSize === 0 ? sliceSize : iterable.size && sliceSize || undefined;

    if (!useKeys && isSeq(iterable) && sliceSize >= 0) {
      sliceSeq.get = function (index, notSetValue) {
        index = wrapIndex(this, index);
        return index >= 0 && index < sliceSize ?
          iterable.get(index + resolvedBegin, notSetValue) :
          notSetValue;
      }
    }

    sliceSeq.__iterateUncached = function(fn, reverse) {var this$0 = this;
      if (sliceSize === 0) {
        return 0;
      }
      if (reverse) {
        return this.cacheResult().__iterate(fn, reverse);
      }
      var skipped = 0;
      var isSkipping = true;
      var iterations = 0;
      iterable.__iterate(function(v, k)  {
        if (!(isSkipping && (isSkipping = skipped++ < resolvedBegin))) {
          iterations++;
          return fn(v, useKeys ? k : iterations - 1, this$0) !== false &&
                 iterations !== sliceSize;
        }
      });
      return iterations;
    };

    sliceSeq.__iteratorUncached = function(type, reverse) {
      if (sliceSize !== 0 && reverse) {
        return this.cacheResult().__iterator(type, reverse);
      }
      // Don't bother instantiating parent iterator if taking 0.
      var iterator = sliceSize !== 0 && iterable.__iterator(type, reverse);
      var skipped = 0;
      var iterations = 0;
      return new Iterator(function()  {
        while (skipped++ < resolvedBegin) {
          iterator.next();
        }
        if (++iterations > sliceSize) {
          return iteratorDone();
        }
        var step = iterator.next();
        if (useKeys || type === ITERATE_VALUES) {
          return step;
        } else if (type === ITERATE_KEYS) {
          return iteratorValue(type, iterations - 1, undefined, step);
        } else {
          return iteratorValue(type, iterations - 1, step.value[1], step);
        }
      });
    }

    return sliceSeq;
  }


  function takeWhileFactory(iterable, predicate, context) {
    var takeSequence = makeSequence(iterable);
    takeSequence.__iterateUncached = function(fn, reverse) {var this$0 = this;
      if (reverse) {
        return this.cacheResult().__iterate(fn, reverse);
      }
      var iterations = 0;
      iterable.__iterate(function(v, k, c) 
        {return predicate.call(context, v, k, c) && ++iterations && fn(v, k, this$0)}
      );
      return iterations;
    };
    takeSequence.__iteratorUncached = function(type, reverse) {var this$0 = this;
      if (reverse) {
        return this.cacheResult().__iterator(type, reverse);
      }
      var iterator = iterable.__iterator(ITERATE_ENTRIES, reverse);
      var iterating = true;
      return new Iterator(function()  {
        if (!iterating) {
          return iteratorDone();
        }
        var step = iterator.next();
        if (step.done) {
          return step;
        }
        var entry = step.value;
        var k = entry[0];
        var v = entry[1];
        if (!predicate.call(context, v, k, this$0)) {
          iterating = false;
          return iteratorDone();
        }
        return type === ITERATE_ENTRIES ? step :
          iteratorValue(type, k, v, step);
      });
    };
    return takeSequence;
  }


  function skipWhileFactory(iterable, predicate, context, useKeys) {
    var skipSequence = makeSequence(iterable);
    skipSequence.__iterateUncached = function (fn, reverse) {var this$0 = this;
      if (reverse) {
        return this.cacheResult().__iterate(fn, reverse);
      }
      var isSkipping = true;
      var iterations = 0;
      iterable.__iterate(function(v, k, c)  {
        if (!(isSkipping && (isSkipping = predicate.call(context, v, k, c)))) {
          iterations++;
          return fn(v, useKeys ? k : iterations - 1, this$0);
        }
      });
      return iterations;
    };
    skipSequence.__iteratorUncached = function(type, reverse) {var this$0 = this;
      if (reverse) {
        return this.cacheResult().__iterator(type, reverse);
      }
      var iterator = iterable.__iterator(ITERATE_ENTRIES, reverse);
      var skipping = true;
      var iterations = 0;
      return new Iterator(function()  {
        var step, k, v;
        do {
          step = iterator.next();
          if (step.done) {
            if (useKeys || type === ITERATE_VALUES) {
              return step;
            } else if (type === ITERATE_KEYS) {
              return iteratorValue(type, iterations++, undefined, step);
            } else {
              return iteratorValue(type, iterations++, step.value[1], step);
            }
          }
          var entry = step.value;
          k = entry[0];
          v = entry[1];
          skipping && (skipping = predicate.call(context, v, k, this$0));
        } while (skipping);
        return type === ITERATE_ENTRIES ? step :
          iteratorValue(type, k, v, step);
      });
    };
    return skipSequence;
  }


  function concatFactory(iterable, values) {
    var isKeyedIterable = isKeyed(iterable);
    var iters = [iterable].concat(values).map(function(v ) {
      if (!isIterable(v)) {
        v = isKeyedIterable ?
          keyedSeqFromValue(v) :
          indexedSeqFromValue(Array.isArray(v) ? v : [v]);
      } else if (isKeyedIterable) {
        v = KeyedIterable(v);
      }
      return v;
    }).filter(function(v ) {return v.size !== 0});

    if (iters.length === 0) {
      return iterable;
    }

    if (iters.length === 1) {
      var singleton = iters[0];
      if (singleton === iterable ||
          isKeyedIterable && isKeyed(singleton) ||
          isIndexed(iterable) && isIndexed(singleton)) {
        return singleton;
      }
    }

    var concatSeq = new ArraySeq(iters);
    if (isKeyedIterable) {
      concatSeq = concatSeq.toKeyedSeq();
    } else if (!isIndexed(iterable)) {
      concatSeq = concatSeq.toSetSeq();
    }
    concatSeq = concatSeq.flatten(true);
    concatSeq.size = iters.reduce(
      function(sum, seq)  {
        if (sum !== undefined) {
          var size = seq.size;
          if (size !== undefined) {
            return sum + size;
          }
        }
      },
      0
    );
    return concatSeq;
  }


  function flattenFactory(iterable, depth, useKeys) {
    var flatSequence = makeSequence(iterable);
    flatSequence.__iterateUncached = function(fn, reverse) {
      var iterations = 0;
      var stopped = false;
      function flatDeep(iter, currentDepth) {var this$0 = this;
        iter.__iterate(function(v, k)  {
          if ((!depth || currentDepth < depth) && isIterable(v)) {
            flatDeep(v, currentDepth + 1);
          } else if (fn(v, useKeys ? k : iterations++, this$0) === false) {
            stopped = true;
          }
          return !stopped;
        }, reverse);
      }
      flatDeep(iterable, 0);
      return iterations;
    }
    flatSequence.__iteratorUncached = function(type, reverse) {
      var iterator = iterable.__iterator(type, reverse);
      var stack = [];
      var iterations = 0;
      return new Iterator(function()  {
        while (iterator) {
          var step = iterator.next();
          if (step.done !== false) {
            iterator = stack.pop();
            continue;
          }
          var v = step.value;
          if (type === ITERATE_ENTRIES) {
            v = v[1];
          }
          if ((!depth || stack.length < depth) && isIterable(v)) {
            stack.push(iterator);
            iterator = v.__iterator(type, reverse);
          } else {
            return useKeys ? step : iteratorValue(type, iterations++, v, step);
          }
        }
        return iteratorDone();
      });
    }
    return flatSequence;
  }


  function flatMapFactory(iterable, mapper, context) {
    var coerce = iterableClass(iterable);
    return iterable.toSeq().map(
      function(v, k)  {return coerce(mapper.call(context, v, k, iterable))}
    ).flatten(true);
  }


  function interposeFactory(iterable, separator) {
    var interposedSequence = makeSequence(iterable);
    interposedSequence.size = iterable.size && iterable.size * 2 -1;
    interposedSequence.__iterateUncached = function(fn, reverse) {var this$0 = this;
      var iterations = 0;
      iterable.__iterate(function(v, k) 
        {return (!iterations || fn(separator, iterations++, this$0) !== false) &&
        fn(v, iterations++, this$0) !== false},
        reverse
      );
      return iterations;
    };
    interposedSequence.__iteratorUncached = function(type, reverse) {
      var iterator = iterable.__iterator(ITERATE_VALUES, reverse);
      var iterations = 0;
      var step;
      return new Iterator(function()  {
        if (!step || iterations % 2) {
          step = iterator.next();
          if (step.done) {
            return step;
          }
        }
        return iterations % 2 ?
          iteratorValue(type, iterations++, separator) :
          iteratorValue(type, iterations++, step.value, step);
      });
    };
    return interposedSequence;
  }


  function sortFactory(iterable, comparator, mapper) {
    if (!comparator) {
      comparator = defaultComparator;
    }
    var isKeyedIterable = isKeyed(iterable);
    var index = 0;
    var entries = iterable.toSeq().map(
      function(v, k)  {return [k, v, index++, mapper ? mapper(v, k, iterable) : v]}
    ).toArray();
    entries.sort(function(a, b)  {return comparator(a[3], b[3]) || a[2] - b[2]}).forEach(
      isKeyedIterable ?
      function(v, i)  { entries[i].length = 2; } :
      function(v, i)  { entries[i] = v[1]; }
    );
    return isKeyedIterable ? KeyedSeq(entries) :
      isIndexed(iterable) ? IndexedSeq(entries) :
      SetSeq(entries);
  }


  function maxFactory(iterable, comparator, mapper) {
    if (!comparator) {
      comparator = defaultComparator;
    }
    if (mapper) {
      var entry = iterable.toSeq()
        .map(function(v, k)  {return [v, mapper(v, k, iterable)]})
        .reduce(function(a, b)  {return maxCompare(comparator, a[1], b[1]) ? b : a});
      return entry && entry[0];
    } else {
      return iterable.reduce(function(a, b)  {return maxCompare(comparator, a, b) ? b : a});
    }
  }

  function maxCompare(comparator, a, b) {
    var comp = comparator(b, a);
    // b is considered the new max if the comparator declares them equal, but
    // they are not equal and b is in fact a nullish value.
    return (comp === 0 && b !== a && (b === undefined || b === null || b !== b)) || comp > 0;
  }


  function zipWithFactory(keyIter, zipper, iters) {
    var zipSequence = makeSequence(keyIter);
    zipSequence.size = new ArraySeq(iters).map(function(i ) {return i.size}).min();
    // Note: this a generic base implementation of __iterate in terms of
    // __iterator which may be more generically useful in the future.
    zipSequence.__iterate = function(fn, reverse) {
      /* generic:
      var iterator = this.__iterator(ITERATE_ENTRIES, reverse);
      var step;
      var iterations = 0;
      while (!(step = iterator.next()).done) {
        iterations++;
        if (fn(step.value[1], step.value[0], this) === false) {
          break;
        }
      }
      return iterations;
      */
      // indexed:
      var iterator = this.__iterator(ITERATE_VALUES, reverse);
      var step;
      var iterations = 0;
      while (!(step = iterator.next()).done) {
        if (fn(step.value, iterations++, this) === false) {
          break;
        }
      }
      return iterations;
    };
    zipSequence.__iteratorUncached = function(type, reverse) {
      var iterators = iters.map(function(i )
        {return (i = Iterable(i), getIterator(reverse ? i.reverse() : i))}
      );
      var iterations = 0;
      var isDone = false;
      return new Iterator(function()  {
        var steps;
        if (!isDone) {
          steps = iterators.map(function(i ) {return i.next()});
          isDone = steps.some(function(s ) {return s.done});
        }
        if (isDone) {
          return iteratorDone();
        }
        return iteratorValue(
          type,
          iterations++,
          zipper.apply(null, steps.map(function(s ) {return s.value}))
        );
      });
    };
    return zipSequence
  }


  // #pragma Helper Functions

  function reify(iter, seq) {
    return isSeq(iter) ? seq : iter.constructor(seq);
  }

  function validateEntry(entry) {
    if (entry !== Object(entry)) {
      throw new TypeError('Expected [K, V] tuple: ' + entry);
    }
  }

  function resolveSize(iter) {
    assertNotInfinite(iter.size);
    return ensureSize(iter);
  }

  function iterableClass(iterable) {
    return isKeyed(iterable) ? KeyedIterable :
      isIndexed(iterable) ? IndexedIterable :
      SetIterable;
  }

  function makeSequence(iterable) {
    return Object.create(
      (
        isKeyed(iterable) ? KeyedSeq :
        isIndexed(iterable) ? IndexedSeq :
        SetSeq
      ).prototype
    );
  }

  function cacheResultThrough() {
    if (this._iter.cacheResult) {
      this._iter.cacheResult();
      this.size = this._iter.size;
      return this;
    } else {
      return Seq.prototype.cacheResult.call(this);
    }
  }

  function defaultComparator(a, b) {
    return a > b ? 1 : a < b ? -1 : 0;
  }

  function forceIterator(keyPath) {
    var iter = getIterator(keyPath);
    if (!iter) {
      // Array might not be iterable in this environment, so we need a fallback
      // to our wrapped type.
      if (!isArrayLike(keyPath)) {
        throw new TypeError('Expected iterable or array-like: ' + keyPath);
      }
      iter = getIterator(Iterable(keyPath));
    }
    return iter;
  }

  createClass(Record, KeyedCollection);

    function Record(defaultValues, name) {
      var hasInitialized;

      var RecordType = function Record(values) {
        if (values instanceof RecordType) {
          return values;
        }
        if (!(this instanceof RecordType)) {
          return new RecordType(values);
        }
        if (!hasInitialized) {
          hasInitialized = true;
          var keys = Object.keys(defaultValues);
          setProps(RecordTypePrototype, keys);
          RecordTypePrototype.size = keys.length;
          RecordTypePrototype._name = name;
          RecordTypePrototype._keys = keys;
          RecordTypePrototype._defaultValues = defaultValues;
        }
        this._map = Map(values);
      };

      var RecordTypePrototype = RecordType.prototype = Object.create(RecordPrototype);
      RecordTypePrototype.constructor = RecordType;

      return RecordType;
    }

    Record.prototype.toString = function() {
      return this.__toString(recordName(this) + ' {', '}');
    };

    // @pragma Access

    Record.prototype.has = function(k) {
      return this._defaultValues.hasOwnProperty(k);
    };

    Record.prototype.get = function(k, notSetValue) {
      if (!this.has(k)) {
        return notSetValue;
      }
      var defaultVal = this._defaultValues[k];
      return this._map ? this._map.get(k, defaultVal) : defaultVal;
    };

    // @pragma Modification

    Record.prototype.clear = function() {
      if (this.__ownerID) {
        this._map && this._map.clear();
        return this;
      }
      var RecordType = this.constructor;
      return RecordType._empty || (RecordType._empty = makeRecord(this, emptyMap()));
    };

    Record.prototype.set = function(k, v) {
      if (!this.has(k)) {
        throw new Error('Cannot set unknown key "' + k + '" on ' + recordName(this));
      }
      if (this._map && !this._map.has(k)) {
        var defaultVal = this._defaultValues[k];
        if (v === defaultVal) {
          return this;
        }
      }
      var newMap = this._map && this._map.set(k, v);
      if (this.__ownerID || newMap === this._map) {
        return this;
      }
      return makeRecord(this, newMap);
    };

    Record.prototype.remove = function(k) {
      if (!this.has(k)) {
        return this;
      }
      var newMap = this._map && this._map.remove(k);
      if (this.__ownerID || newMap === this._map) {
        return this;
      }
      return makeRecord(this, newMap);
    };

    Record.prototype.wasAltered = function() {
      return this._map.wasAltered();
    };

    Record.prototype.__iterator = function(type, reverse) {var this$0 = this;
      return KeyedIterable(this._defaultValues).map(function(_, k)  {return this$0.get(k)}).__iterator(type, reverse);
    };

    Record.prototype.__iterate = function(fn, reverse) {var this$0 = this;
      return KeyedIterable(this._defaultValues).map(function(_, k)  {return this$0.get(k)}).__iterate(fn, reverse);
    };

    Record.prototype.__ensureOwner = function(ownerID) {
      if (ownerID === this.__ownerID) {
        return this;
      }
      var newMap = this._map && this._map.__ensureOwner(ownerID);
      if (!ownerID) {
        this.__ownerID = ownerID;
        this._map = newMap;
        return this;
      }
      return makeRecord(this, newMap, ownerID);
    };


  var RecordPrototype = Record.prototype;
  RecordPrototype[DELETE] = RecordPrototype.remove;
  RecordPrototype.deleteIn =
  RecordPrototype.removeIn = MapPrototype.removeIn;
  RecordPrototype.merge = MapPrototype.merge;
  RecordPrototype.mergeWith = MapPrototype.mergeWith;
  RecordPrototype.mergeIn = MapPrototype.mergeIn;
  RecordPrototype.mergeDeep = MapPrototype.mergeDeep;
  RecordPrototype.mergeDeepWith = MapPrototype.mergeDeepWith;
  RecordPrototype.mergeDeepIn = MapPrototype.mergeDeepIn;
  RecordPrototype.setIn = MapPrototype.setIn;
  RecordPrototype.update = MapPrototype.update;
  RecordPrototype.updateIn = MapPrototype.updateIn;
  RecordPrototype.withMutations = MapPrototype.withMutations;
  RecordPrototype.asMutable = MapPrototype.asMutable;
  RecordPrototype.asImmutable = MapPrototype.asImmutable;


  function makeRecord(likeRecord, map, ownerID) {
    var record = Object.create(Object.getPrototypeOf(likeRecord));
    record._map = map;
    record.__ownerID = ownerID;
    return record;
  }

  function recordName(record) {
    return record._name || record.constructor.name || 'Record';
  }

  function setProps(prototype, names) {
    try {
      names.forEach(setProp.bind(undefined, prototype));
    } catch (error) {
      // Object.defineProperty failed. Probably IE8.
    }
  }

  function setProp(prototype, name) {
    Object.defineProperty(prototype, name, {
      get: function() {
        return this.get(name);
      },
      set: function(value) {
        invariant(this.__ownerID, 'Cannot set on an immutable record.');
        this.set(name, value);
      }
    });
  }

  createClass(Set, SetCollection);

    // @pragma Construction

    function Set(value) {
      return value === null || value === undefined ? emptySet() :
        isSet(value) && !isOrdered(value) ? value :
        emptySet().withMutations(function(set ) {
          var iter = SetIterable(value);
          assertNotInfinite(iter.size);
          iter.forEach(function(v ) {return set.add(v)});
        });
    }

    Set.of = function(/*...values*/) {
      return this(arguments);
    };

    Set.fromKeys = function(value) {
      return this(KeyedIterable(value).keySeq());
    };

    Set.prototype.toString = function() {
      return this.__toString('Set {', '}');
    };

    // @pragma Access

    Set.prototype.has = function(value) {
      return this._map.has(value);
    };

    // @pragma Modification

    Set.prototype.add = function(value) {
      return updateSet(this, this._map.set(value, true));
    };

    Set.prototype.remove = function(value) {
      return updateSet(this, this._map.remove(value));
    };

    Set.prototype.clear = function() {
      return updateSet(this, this._map.clear());
    };

    // @pragma Composition

    Set.prototype.union = function() {var iters = SLICE$0.call(arguments, 0);
      iters = iters.filter(function(x ) {return x.size !== 0});
      if (iters.length === 0) {
        return this;
      }
      if (this.size === 0 && !this.__ownerID && iters.length === 1) {
        return this.constructor(iters[0]);
      }
      return this.withMutations(function(set ) {
        for (var ii = 0; ii < iters.length; ii++) {
          SetIterable(iters[ii]).forEach(function(value ) {return set.add(value)});
        }
      });
    };

    Set.prototype.intersect = function() {var iters = SLICE$0.call(arguments, 0);
      if (iters.length === 0) {
        return this;
      }
      iters = iters.map(function(iter ) {return SetIterable(iter)});
      var originalSet = this;
      return this.withMutations(function(set ) {
        originalSet.forEach(function(value ) {
          if (!iters.every(function(iter ) {return iter.includes(value)})) {
            set.remove(value);
          }
        });
      });
    };

    Set.prototype.subtract = function() {var iters = SLICE$0.call(arguments, 0);
      if (iters.length === 0) {
        return this;
      }
      iters = iters.map(function(iter ) {return SetIterable(iter)});
      var originalSet = this;
      return this.withMutations(function(set ) {
        originalSet.forEach(function(value ) {
          if (iters.some(function(iter ) {return iter.includes(value)})) {
            set.remove(value);
          }
        });
      });
    };

    Set.prototype.merge = function() {
      return this.union.apply(this, arguments);
    };

    Set.prototype.mergeWith = function(merger) {var iters = SLICE$0.call(arguments, 1);
      return this.union.apply(this, iters);
    };

    Set.prototype.sort = function(comparator) {
      // Late binding
      return OrderedSet(sortFactory(this, comparator));
    };

    Set.prototype.sortBy = function(mapper, comparator) {
      // Late binding
      return OrderedSet(sortFactory(this, comparator, mapper));
    };

    Set.prototype.wasAltered = function() {
      return this._map.wasAltered();
    };

    Set.prototype.__iterate = function(fn, reverse) {var this$0 = this;
      return this._map.__iterate(function(_, k)  {return fn(k, k, this$0)}, reverse);
    };

    Set.prototype.__iterator = function(type, reverse) {
      return this._map.map(function(_, k)  {return k}).__iterator(type, reverse);
    };

    Set.prototype.__ensureOwner = function(ownerID) {
      if (ownerID === this.__ownerID) {
        return this;
      }
      var newMap = this._map.__ensureOwner(ownerID);
      if (!ownerID) {
        this.__ownerID = ownerID;
        this._map = newMap;
        return this;
      }
      return this.__make(newMap, ownerID);
    };


  function isSet(maybeSet) {
    return !!(maybeSet && maybeSet[IS_SET_SENTINEL]);
  }

  Set.isSet = isSet;

  var IS_SET_SENTINEL = '@@__IMMUTABLE_SET__@@';

  var SetPrototype = Set.prototype;
  SetPrototype[IS_SET_SENTINEL] = true;
  SetPrototype[DELETE] = SetPrototype.remove;
  SetPrototype.mergeDeep = SetPrototype.merge;
  SetPrototype.mergeDeepWith = SetPrototype.mergeWith;
  SetPrototype.withMutations = MapPrototype.withMutations;
  SetPrototype.asMutable = MapPrototype.asMutable;
  SetPrototype.asImmutable = MapPrototype.asImmutable;

  SetPrototype.__empty = emptySet;
  SetPrototype.__make = makeSet;

  function updateSet(set, newMap) {
    if (set.__ownerID) {
      set.size = newMap.size;
      set._map = newMap;
      return set;
    }
    return newMap === set._map ? set :
      newMap.size === 0 ? set.__empty() :
      set.__make(newMap);
  }

  function makeSet(map, ownerID) {
    var set = Object.create(SetPrototype);
    set.size = map ? map.size : 0;
    set._map = map;
    set.__ownerID = ownerID;
    return set;
  }

  var EMPTY_SET;
  function emptySet() {
    return EMPTY_SET || (EMPTY_SET = makeSet(emptyMap()));
  }

  createClass(OrderedSet, Set);

    // @pragma Construction

    function OrderedSet(value) {
      return value === null || value === undefined ? emptyOrderedSet() :
        isOrderedSet(value) ? value :
        emptyOrderedSet().withMutations(function(set ) {
          var iter = SetIterable(value);
          assertNotInfinite(iter.size);
          iter.forEach(function(v ) {return set.add(v)});
        });
    }

    OrderedSet.of = function(/*...values*/) {
      return this(arguments);
    };

    OrderedSet.fromKeys = function(value) {
      return this(KeyedIterable(value).keySeq());
    };

    OrderedSet.prototype.toString = function() {
      return this.__toString('OrderedSet {', '}');
    };


  function isOrderedSet(maybeOrderedSet) {
    return isSet(maybeOrderedSet) && isOrdered(maybeOrderedSet);
  }

  OrderedSet.isOrderedSet = isOrderedSet;

  var OrderedSetPrototype = OrderedSet.prototype;
  OrderedSetPrototype[IS_ORDERED_SENTINEL] = true;

  OrderedSetPrototype.__empty = emptyOrderedSet;
  OrderedSetPrototype.__make = makeOrderedSet;

  function makeOrderedSet(map, ownerID) {
    var set = Object.create(OrderedSetPrototype);
    set.size = map ? map.size : 0;
    set._map = map;
    set.__ownerID = ownerID;
    return set;
  }

  var EMPTY_ORDERED_SET;
  function emptyOrderedSet() {
    return EMPTY_ORDERED_SET || (EMPTY_ORDERED_SET = makeOrderedSet(emptyOrderedMap()));
  }

  createClass(Stack, IndexedCollection);

    // @pragma Construction

    function Stack(value) {
      return value === null || value === undefined ? emptyStack() :
        isStack(value) ? value :
        emptyStack().unshiftAll(value);
    }

    Stack.of = function(/*...values*/) {
      return this(arguments);
    };

    Stack.prototype.toString = function() {
      return this.__toString('Stack [', ']');
    };

    // @pragma Access

    Stack.prototype.get = function(index, notSetValue) {
      var head = this._head;
      index = wrapIndex(this, index);
      while (head && index--) {
        head = head.next;
      }
      return head ? head.value : notSetValue;
    };

    Stack.prototype.peek = function() {
      return this._head && this._head.value;
    };

    // @pragma Modification

    Stack.prototype.push = function(/*...values*/) {
      if (arguments.length === 0) {
        return this;
      }
      var newSize = this.size + arguments.length;
      var head = this._head;
      for (var ii = arguments.length - 1; ii >= 0; ii--) {
        head = {
          value: arguments[ii],
          next: head
        };
      }
      if (this.__ownerID) {
        this.size = newSize;
        this._head = head;
        this.__hash = undefined;
        this.__altered = true;
        return this;
      }
      return makeStack(newSize, head);
    };

    Stack.prototype.pushAll = function(iter) {
      iter = IndexedIterable(iter);
      if (iter.size === 0) {
        return this;
      }
      assertNotInfinite(iter.size);
      var newSize = this.size;
      var head = this._head;
      iter.reverse().forEach(function(value ) {
        newSize++;
        head = {
          value: value,
          next: head
        };
      });
      if (this.__ownerID) {
        this.size = newSize;
        this._head = head;
        this.__hash = undefined;
        this.__altered = true;
        return this;
      }
      return makeStack(newSize, head);
    };

    Stack.prototype.pop = function() {
      return this.slice(1);
    };

    Stack.prototype.unshift = function(/*...values*/) {
      return this.push.apply(this, arguments);
    };

    Stack.prototype.unshiftAll = function(iter) {
      return this.pushAll(iter);
    };

    Stack.prototype.shift = function() {
      return this.pop.apply(this, arguments);
    };

    Stack.prototype.clear = function() {
      if (this.size === 0) {
        return this;
      }
      if (this.__ownerID) {
        this.size = 0;
        this._head = undefined;
        this.__hash = undefined;
        this.__altered = true;
        return this;
      }
      return emptyStack();
    };

    Stack.prototype.slice = function(begin, end) {
      if (wholeSlice(begin, end, this.size)) {
        return this;
      }
      var resolvedBegin = resolveBegin(begin, this.size);
      var resolvedEnd = resolveEnd(end, this.size);
      if (resolvedEnd !== this.size) {
        // super.slice(begin, end);
        return IndexedCollection.prototype.slice.call(this, begin, end);
      }
      var newSize = this.size - resolvedBegin;
      var head = this._head;
      while (resolvedBegin--) {
        head = head.next;
      }
      if (this.__ownerID) {
        this.size = newSize;
        this._head = head;
        this.__hash = undefined;
        this.__altered = true;
        return this;
      }
      return makeStack(newSize, head);
    };

    // @pragma Mutability

    Stack.prototype.__ensureOwner = function(ownerID) {
      if (ownerID === this.__ownerID) {
        return this;
      }
      if (!ownerID) {
        this.__ownerID = ownerID;
        this.__altered = false;
        return this;
      }
      return makeStack(this.size, this._head, ownerID, this.__hash);
    };

    // @pragma Iteration

    Stack.prototype.__iterate = function(fn, reverse) {
      if (reverse) {
        return this.reverse().__iterate(fn);
      }
      var iterations = 0;
      var node = this._head;
      while (node) {
        if (fn(node.value, iterations++, this) === false) {
          break;
        }
        node = node.next;
      }
      return iterations;
    };

    Stack.prototype.__iterator = function(type, reverse) {
      if (reverse) {
        return this.reverse().__iterator(type);
      }
      var iterations = 0;
      var node = this._head;
      return new Iterator(function()  {
        if (node) {
          var value = node.value;
          node = node.next;
          return iteratorValue(type, iterations++, value);
        }
        return iteratorDone();
      });
    };


  function isStack(maybeStack) {
    return !!(maybeStack && maybeStack[IS_STACK_SENTINEL]);
  }

  Stack.isStack = isStack;

  var IS_STACK_SENTINEL = '@@__IMMUTABLE_STACK__@@';

  var StackPrototype = Stack.prototype;
  StackPrototype[IS_STACK_SENTINEL] = true;
  StackPrototype.withMutations = MapPrototype.withMutations;
  StackPrototype.asMutable = MapPrototype.asMutable;
  StackPrototype.asImmutable = MapPrototype.asImmutable;
  StackPrototype.wasAltered = MapPrototype.wasAltered;


  function makeStack(size, head, ownerID, hash) {
    var map = Object.create(StackPrototype);
    map.size = size;
    map._head = head;
    map.__ownerID = ownerID;
    map.__hash = hash;
    map.__altered = false;
    return map;
  }

  var EMPTY_STACK;
  function emptyStack() {
    return EMPTY_STACK || (EMPTY_STACK = makeStack(0));
  }

  /**
   * Contributes additional methods to a constructor
   */
  function mixin(ctor, methods) {
    var keyCopier = function(key ) { ctor.prototype[key] = methods[key]; };
    Object.keys(methods).forEach(keyCopier);
    Object.getOwnPropertySymbols &&
      Object.getOwnPropertySymbols(methods).forEach(keyCopier);
    return ctor;
  }

  Iterable.Iterator = Iterator;

  mixin(Iterable, {

    // ### Conversion to other types

    toArray: function() {
      assertNotInfinite(this.size);
      var array = new Array(this.size || 0);
      this.valueSeq().__iterate(function(v, i)  { array[i] = v; });
      return array;
    },

    toIndexedSeq: function() {
      return new ToIndexedSequence(this);
    },

    toJS: function() {
      return this.toSeq().map(
        function(value ) {return value && typeof value.toJS === 'function' ? value.toJS() : value}
      ).__toJS();
    },

    toJSON: function() {
      return this.toSeq().map(
        function(value ) {return value && typeof value.toJSON === 'function' ? value.toJSON() : value}
      ).__toJS();
    },

    toKeyedSeq: function() {
      return new ToKeyedSequence(this, true);
    },

    toMap: function() {
      // Use Late Binding here to solve the circular dependency.
      return Map(this.toKeyedSeq());
    },

    toObject: function() {
      assertNotInfinite(this.size);
      var object = {};
      this.__iterate(function(v, k)  { object[k] = v; });
      return object;
    },

    toOrderedMap: function() {
      // Use Late Binding here to solve the circular dependency.
      return OrderedMap(this.toKeyedSeq());
    },

    toOrderedSet: function() {
      // Use Late Binding here to solve the circular dependency.
      return OrderedSet(isKeyed(this) ? this.valueSeq() : this);
    },

    toSet: function() {
      // Use Late Binding here to solve the circular dependency.
      return Set(isKeyed(this) ? this.valueSeq() : this);
    },

    toSetSeq: function() {
      return new ToSetSequence(this);
    },

    toSeq: function() {
      return isIndexed(this) ? this.toIndexedSeq() :
        isKeyed(this) ? this.toKeyedSeq() :
        this.toSetSeq();
    },

    toStack: function() {
      // Use Late Binding here to solve the circular dependency.
      return Stack(isKeyed(this) ? this.valueSeq() : this);
    },

    toList: function() {
      // Use Late Binding here to solve the circular dependency.
      return List(isKeyed(this) ? this.valueSeq() : this);
    },


    // ### Common JavaScript methods and properties

    toString: function() {
      return '[Iterable]';
    },

    __toString: function(head, tail) {
      if (this.size === 0) {
        return head + tail;
      }
      return head + ' ' + this.toSeq().map(this.__toStringMapper).join(', ') + ' ' + tail;
    },


    // ### ES6 Collection methods (ES6 Array and Map)

    concat: function() {var values = SLICE$0.call(arguments, 0);
      return reify(this, concatFactory(this, values));
    },

    includes: function(searchValue) {
      return this.some(function(value ) {return is(value, searchValue)});
    },

    entries: function() {
      return this.__iterator(ITERATE_ENTRIES);
    },

    every: function(predicate, context) {
      assertNotInfinite(this.size);
      var returnValue = true;
      this.__iterate(function(v, k, c)  {
        if (!predicate.call(context, v, k, c)) {
          returnValue = false;
          return false;
        }
      });
      return returnValue;
    },

    filter: function(predicate, context) {
      return reify(this, filterFactory(this, predicate, context, true));
    },

    find: function(predicate, context, notSetValue) {
      var entry = this.findEntry(predicate, context);
      return entry ? entry[1] : notSetValue;
    },

    forEach: function(sideEffect, context) {
      assertNotInfinite(this.size);
      return this.__iterate(context ? sideEffect.bind(context) : sideEffect);
    },

    join: function(separator) {
      assertNotInfinite(this.size);
      separator = separator !== undefined ? '' + separator : ',';
      var joined = '';
      var isFirst = true;
      this.__iterate(function(v ) {
        isFirst ? (isFirst = false) : (joined += separator);
        joined += v !== null && v !== undefined ? v.toString() : '';
      });
      return joined;
    },

    keys: function() {
      return this.__iterator(ITERATE_KEYS);
    },

    map: function(mapper, context) {
      return reify(this, mapFactory(this, mapper, context));
    },

    reduce: function(reducer, initialReduction, context) {
      assertNotInfinite(this.size);
      var reduction;
      var useFirst;
      if (arguments.length < 2) {
        useFirst = true;
      } else {
        reduction = initialReduction;
      }
      this.__iterate(function(v, k, c)  {
        if (useFirst) {
          useFirst = false;
          reduction = v;
        } else {
          reduction = reducer.call(context, reduction, v, k, c);
        }
      });
      return reduction;
    },

    reduceRight: function(reducer, initialReduction, context) {
      var reversed = this.toKeyedSeq().reverse();
      return reversed.reduce.apply(reversed, arguments);
    },

    reverse: function() {
      return reify(this, reverseFactory(this, true));
    },

    slice: function(begin, end) {
      return reify(this, sliceFactory(this, begin, end, true));
    },

    some: function(predicate, context) {
      return !this.every(not(predicate), context);
    },

    sort: function(comparator) {
      return reify(this, sortFactory(this, comparator));
    },

    values: function() {
      return this.__iterator(ITERATE_VALUES);
    },


    // ### More sequential methods

    butLast: function() {
      return this.slice(0, -1);
    },

    isEmpty: function() {
      return this.size !== undefined ? this.size === 0 : !this.some(function()  {return true});
    },

    count: function(predicate, context) {
      return ensureSize(
        predicate ? this.toSeq().filter(predicate, context) : this
      );
    },

    countBy: function(grouper, context) {
      return countByFactory(this, grouper, context);
    },

    equals: function(other) {
      return deepEqual(this, other);
    },

    entrySeq: function() {
      var iterable = this;
      if (iterable._cache) {
        // We cache as an entries array, so we can just return the cache!
        return new ArraySeq(iterable._cache);
      }
      var entriesSequence = iterable.toSeq().map(entryMapper).toIndexedSeq();
      entriesSequence.fromEntrySeq = function()  {return iterable.toSeq()};
      return entriesSequence;
    },

    filterNot: function(predicate, context) {
      return this.filter(not(predicate), context);
    },

    findEntry: function(predicate, context, notSetValue) {
      var found = notSetValue;
      this.__iterate(function(v, k, c)  {
        if (predicate.call(context, v, k, c)) {
          found = [k, v];
          return false;
        }
      });
      return found;
    },

    findKey: function(predicate, context) {
      var entry = this.findEntry(predicate, context);
      return entry && entry[0];
    },

    findLast: function(predicate, context, notSetValue) {
      return this.toKeyedSeq().reverse().find(predicate, context, notSetValue);
    },

    findLastEntry: function(predicate, context, notSetValue) {
      return this.toKeyedSeq().reverse().findEntry(predicate, context, notSetValue);
    },

    findLastKey: function(predicate, context) {
      return this.toKeyedSeq().reverse().findKey(predicate, context);
    },

    first: function() {
      return this.find(returnTrue);
    },

    flatMap: function(mapper, context) {
      return reify(this, flatMapFactory(this, mapper, context));
    },

    flatten: function(depth) {
      return reify(this, flattenFactory(this, depth, true));
    },

    fromEntrySeq: function() {
      return new FromEntriesSequence(this);
    },

    get: function(searchKey, notSetValue) {
      return this.find(function(_, key)  {return is(key, searchKey)}, undefined, notSetValue);
    },

    getIn: function(searchKeyPath, notSetValue) {
      var nested = this;
      // Note: in an ES6 environment, we would prefer:
      // for (var key of searchKeyPath) {
      var iter = forceIterator(searchKeyPath);
      var step;
      while (!(step = iter.next()).done) {
        var key = step.value;
        nested = nested && nested.get ? nested.get(key, NOT_SET) : NOT_SET;
        if (nested === NOT_SET) {
          return notSetValue;
        }
      }
      return nested;
    },

    groupBy: function(grouper, context) {
      return groupByFactory(this, grouper, context);
    },

    has: function(searchKey) {
      return this.get(searchKey, NOT_SET) !== NOT_SET;
    },

    hasIn: function(searchKeyPath) {
      return this.getIn(searchKeyPath, NOT_SET) !== NOT_SET;
    },

    isSubset: function(iter) {
      iter = typeof iter.includes === 'function' ? iter : Iterable(iter);
      return this.every(function(value ) {return iter.includes(value)});
    },

    isSuperset: function(iter) {
      iter = typeof iter.isSubset === 'function' ? iter : Iterable(iter);
      return iter.isSubset(this);
    },

    keyOf: function(searchValue) {
      return this.findKey(function(value ) {return is(value, searchValue)});
    },

    keySeq: function() {
      return this.toSeq().map(keyMapper).toIndexedSeq();
    },

    last: function() {
      return this.toSeq().reverse().first();
    },

    lastKeyOf: function(searchValue) {
      return this.toKeyedSeq().reverse().keyOf(searchValue);
    },

    max: function(comparator) {
      return maxFactory(this, comparator);
    },

    maxBy: function(mapper, comparator) {
      return maxFactory(this, comparator, mapper);
    },

    min: function(comparator) {
      return maxFactory(this, comparator ? neg(comparator) : defaultNegComparator);
    },

    minBy: function(mapper, comparator) {
      return maxFactory(this, comparator ? neg(comparator) : defaultNegComparator, mapper);
    },

    rest: function() {
      return this.slice(1);
    },

    skip: function(amount) {
      return this.slice(Math.max(0, amount));
    },

    skipLast: function(amount) {
      return reify(this, this.toSeq().reverse().skip(amount).reverse());
    },

    skipWhile: function(predicate, context) {
      return reify(this, skipWhileFactory(this, predicate, context, true));
    },

    skipUntil: function(predicate, context) {
      return this.skipWhile(not(predicate), context);
    },

    sortBy: function(mapper, comparator) {
      return reify(this, sortFactory(this, comparator, mapper));
    },

    take: function(amount) {
      return this.slice(0, Math.max(0, amount));
    },

    takeLast: function(amount) {
      return reify(this, this.toSeq().reverse().take(amount).reverse());
    },

    takeWhile: function(predicate, context) {
      return reify(this, takeWhileFactory(this, predicate, context));
    },

    takeUntil: function(predicate, context) {
      return this.takeWhile(not(predicate), context);
    },

    valueSeq: function() {
      return this.toIndexedSeq();
    },


    // ### Hashable Object

    hashCode: function() {
      return this.__hash || (this.__hash = hashIterable(this));
    }


    // ### Internal

    // abstract __iterate(fn, reverse)

    // abstract __iterator(type, reverse)
  });

  // var IS_ITERABLE_SENTINEL = '@@__IMMUTABLE_ITERABLE__@@';
  // var IS_KEYED_SENTINEL = '@@__IMMUTABLE_KEYED__@@';
  // var IS_INDEXED_SENTINEL = '@@__IMMUTABLE_INDEXED__@@';
  // var IS_ORDERED_SENTINEL = '@@__IMMUTABLE_ORDERED__@@';

  var IterablePrototype = Iterable.prototype;
  IterablePrototype[IS_ITERABLE_SENTINEL] = true;
  IterablePrototype[ITERATOR_SYMBOL] = IterablePrototype.values;
  IterablePrototype.__toJS = IterablePrototype.toArray;
  IterablePrototype.__toStringMapper = quoteString;
  IterablePrototype.inspect =
  IterablePrototype.toSource = function() { return this.toString(); };
  IterablePrototype.chain = IterablePrototype.flatMap;
  IterablePrototype.contains = IterablePrototype.includes;

  mixin(KeyedIterable, {

    // ### More sequential methods

    flip: function() {
      return reify(this, flipFactory(this));
    },

    mapEntries: function(mapper, context) {var this$0 = this;
      var iterations = 0;
      return reify(this,
        this.toSeq().map(
          function(v, k)  {return mapper.call(context, [k, v], iterations++, this$0)}
        ).fromEntrySeq()
      );
    },

    mapKeys: function(mapper, context) {var this$0 = this;
      return reify(this,
        this.toSeq().flip().map(
          function(k, v)  {return mapper.call(context, k, v, this$0)}
        ).flip()
      );
    }

  });

  var KeyedIterablePrototype = KeyedIterable.prototype;
  KeyedIterablePrototype[IS_KEYED_SENTINEL] = true;
  KeyedIterablePrototype[ITERATOR_SYMBOL] = IterablePrototype.entries;
  KeyedIterablePrototype.__toJS = IterablePrototype.toObject;
  KeyedIterablePrototype.__toStringMapper = function(v, k)  {return JSON.stringify(k) + ': ' + quoteString(v)};



  mixin(IndexedIterable, {

    // ### Conversion to other types

    toKeyedSeq: function() {
      return new ToKeyedSequence(this, false);
    },


    // ### ES6 Collection methods (ES6 Array and Map)

    filter: function(predicate, context) {
      return reify(this, filterFactory(this, predicate, context, false));
    },

    findIndex: function(predicate, context) {
      var entry = this.findEntry(predicate, context);
      return entry ? entry[0] : -1;
    },

    indexOf: function(searchValue) {
      var key = this.keyOf(searchValue);
      return key === undefined ? -1 : key;
    },

    lastIndexOf: function(searchValue) {
      var key = this.lastKeyOf(searchValue);
      return key === undefined ? -1 : key;
    },

    reverse: function() {
      return reify(this, reverseFactory(this, false));
    },

    slice: function(begin, end) {
      return reify(this, sliceFactory(this, begin, end, false));
    },

    splice: function(index, removeNum /*, ...values*/) {
      var numArgs = arguments.length;
      removeNum = Math.max(removeNum | 0, 0);
      if (numArgs === 0 || (numArgs === 2 && !removeNum)) {
        return this;
      }
      // If index is negative, it should resolve relative to the size of the
      // collection. However size may be expensive to compute if not cached, so
      // only call count() if the number is in fact negative.
      index = resolveBegin(index, index < 0 ? this.count() : this.size);
      var spliced = this.slice(0, index);
      return reify(
        this,
        numArgs === 1 ?
          spliced :
          spliced.concat(arrCopy(arguments, 2), this.slice(index + removeNum))
      );
    },


    // ### More collection methods

    findLastIndex: function(predicate, context) {
      var entry = this.findLastEntry(predicate, context);
      return entry ? entry[0] : -1;
    },

    first: function() {
      return this.get(0);
    },

    flatten: function(depth) {
      return reify(this, flattenFactory(this, depth, false));
    },

    get: function(index, notSetValue) {
      index = wrapIndex(this, index);
      return (index < 0 || (this.size === Infinity ||
          (this.size !== undefined && index > this.size))) ?
        notSetValue :
        this.find(function(_, key)  {return key === index}, undefined, notSetValue);
    },

    has: function(index) {
      index = wrapIndex(this, index);
      return index >= 0 && (this.size !== undefined ?
        this.size === Infinity || index < this.size :
        this.indexOf(index) !== -1
      );
    },

    interpose: function(separator) {
      return reify(this, interposeFactory(this, separator));
    },

    interleave: function(/*...iterables*/) {
      var iterables = [this].concat(arrCopy(arguments));
      var zipped = zipWithFactory(this.toSeq(), IndexedSeq.of, iterables);
      var interleaved = zipped.flatten(true);
      if (zipped.size) {
        interleaved.size = zipped.size * iterables.length;
      }
      return reify(this, interleaved);
    },

    keySeq: function() {
      return Range(0, this.size);
    },

    last: function() {
      return this.get(-1);
    },

    skipWhile: function(predicate, context) {
      return reify(this, skipWhileFactory(this, predicate, context, false));
    },

    zip: function(/*, ...iterables */) {
      var iterables = [this].concat(arrCopy(arguments));
      return reify(this, zipWithFactory(this, defaultZipper, iterables));
    },

    zipWith: function(zipper/*, ...iterables */) {
      var iterables = arrCopy(arguments);
      iterables[0] = this;
      return reify(this, zipWithFactory(this, zipper, iterables));
    }

  });

  IndexedIterable.prototype[IS_INDEXED_SENTINEL] = true;
  IndexedIterable.prototype[IS_ORDERED_SENTINEL] = true;



  mixin(SetIterable, {

    // ### ES6 Collection methods (ES6 Array and Map)

    get: function(value, notSetValue) {
      return this.has(value) ? value : notSetValue;
    },

    includes: function(value) {
      return this.has(value);
    },


    // ### More sequential methods

    keySeq: function() {
      return this.valueSeq();
    }

  });

  SetIterable.prototype.has = IterablePrototype.includes;
  SetIterable.prototype.contains = SetIterable.prototype.includes;


  // Mixin subclasses

  mixin(KeyedSeq, KeyedIterable.prototype);
  mixin(IndexedSeq, IndexedIterable.prototype);
  mixin(SetSeq, SetIterable.prototype);

  mixin(KeyedCollection, KeyedIterable.prototype);
  mixin(IndexedCollection, IndexedIterable.prototype);
  mixin(SetCollection, SetIterable.prototype);


  // #pragma Helper functions

  function keyMapper(v, k) {
    return k;
  }

  function entryMapper(v, k) {
    return [k, v];
  }

  function not(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    }
  }

  function neg(predicate) {
    return function() {
      return -predicate.apply(this, arguments);
    }
  }

  function quoteString(value) {
    return typeof value === 'string' ? JSON.stringify(value) : String(value);
  }

  function defaultZipper() {
    return arrCopy(arguments);
  }

  function defaultNegComparator(a, b) {
    return a < b ? 1 : a > b ? -1 : 0;
  }

  function hashIterable(iterable) {
    if (iterable.size === Infinity) {
      return 0;
    }
    var ordered = isOrdered(iterable);
    var keyed = isKeyed(iterable);
    var h = ordered ? 1 : 0;
    var size = iterable.__iterate(
      keyed ?
        ordered ?
          function(v, k)  { h = 31 * h + hashMerge(hash(v), hash(k)) | 0; } :
          function(v, k)  { h = h + hashMerge(hash(v), hash(k)) | 0; } :
        ordered ?
          function(v ) { h = 31 * h + hash(v) | 0; } :
          function(v ) { h = h + hash(v) | 0; }
    );
    return murmurHashOfSize(size, h);
  }

  function murmurHashOfSize(size, h) {
    h = imul(h, 0xCC9E2D51);
    h = imul(h << 15 | h >>> -15, 0x1B873593);
    h = imul(h << 13 | h >>> -13, 5);
    h = (h + 0xE6546B64 | 0) ^ size;
    h = imul(h ^ h >>> 16, 0x85EBCA6B);
    h = imul(h ^ h >>> 13, 0xC2B2AE35);
    h = smi(h ^ h >>> 16);
    return h;
  }

  function hashMerge(a, b) {
    return a ^ b + 0x9E3779B9 + (a << 6) + (a >> 2) | 0; // int
  }

  var Immutable = {

    Iterable: Iterable,

    Seq: Seq,
    Collection: Collection,
    Map: Map,
    OrderedMap: OrderedMap,
    List: List,
    Stack: Stack,
    Set: Set,
    OrderedSet: OrderedSet,

    Record: Record,
    Range: Range,
    Repeat: Repeat,

    is: is,
    fromJS: fromJS

  };

  return Immutable;

}));
},{}],3:[function(require,module,exports){
"use strict";

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

var repeat = function repeat(str, times) {
  return new Array(times + 1).join(str);
};
var pad = function pad(num, maxLength) {
  return repeat("0", maxLength - num.toString().length) + num;
};
var formatTime = function formatTime(time) {
  return "@ " + pad(time.getHours(), 2) + ":" + pad(time.getMinutes(), 2) + ":" + pad(time.getSeconds(), 2) + "." + pad(time.getMilliseconds(), 3);
};

// Use the new performance api to get better precision if available
var timer = typeof performance !== "undefined" && typeof performance.now === "function" ? performance : Date;

/**
 * parse the level option of createLogger
 *
 * @property {string | function | object} level - console[level]
 * @property {object} action
 * @property {array} payload
 * @property {string} type
 */

function getLogLevel(level, action, payload, type) {
  switch (typeof level === "undefined" ? "undefined" : _typeof(level)) {
    case "object":
      return typeof level[type] === "function" ? level[type].apply(level, _toConsumableArray(payload)) : level[type];
    case "function":
      return level(action);
    default:
      return level;
  }
}

/**
 * Creates logger with followed options
 *
 * @namespace
 * @property {object} options - options for logger
 * @property {string | function | object} options.level - console[level]
 * @property {boolean} options.duration - print duration of each action?
 * @property {boolean} options.timestamp - print timestamp with each action?
 * @property {object} options.colors - custom colors
 * @property {object} options.logger - implementation of the `console` API
 * @property {boolean} options.logErrors - should errors in action execution be caught, logged, and re-thrown?
 * @property {boolean} options.collapsed - is group collapsed?
 * @property {boolean} options.predicate - condition which resolves logger behavior
 * @property {function} options.stateTransformer - transform state before print
 * @property {function} options.actionTransformer - transform action before print
 * @property {function} options.errorTransformer - transform error before print
 */

function createLogger() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
  var _options$level = options.level;
  var level = _options$level === undefined ? "log" : _options$level;
  var _options$logger = options.logger;
  var logger = _options$logger === undefined ? console : _options$logger;
  var _options$logErrors = options.logErrors;
  var logErrors = _options$logErrors === undefined ? true : _options$logErrors;
  var collapsed = options.collapsed;
  var predicate = options.predicate;
  var _options$duration = options.duration;
  var duration = _options$duration === undefined ? false : _options$duration;
  var _options$timestamp = options.timestamp;
  var timestamp = _options$timestamp === undefined ? true : _options$timestamp;
  var transformer = options.transformer;
  var _options$stateTransfo = options.stateTransformer;
  var // deprecated
  stateTransformer = _options$stateTransfo === undefined ? function (state) {
    return state;
  } : _options$stateTransfo;
  var _options$actionTransf = options.actionTransformer;
  var actionTransformer = _options$actionTransf === undefined ? function (actn) {
    return actn;
  } : _options$actionTransf;
  var _options$errorTransfo = options.errorTransformer;
  var errorTransformer = _options$errorTransfo === undefined ? function (error) {
    return error;
  } : _options$errorTransfo;
  var _options$colors = options.colors;
  var colors = _options$colors === undefined ? {
    title: function title() {
      return "#000000";
    },
    prevState: function prevState() {
      return "#9E9E9E";
    },
    action: function action() {
      return "#03A9F4";
    },
    nextState: function nextState() {
      return "#4CAF50";
    },
    error: function error() {
      return "#F20404";
    }
  } : _options$colors;

  // exit if console undefined

  if (typeof logger === "undefined") {
    return function () {
      return function (next) {
        return function (action) {
          return next(action);
        };
      };
    };
  }

  if (transformer) {
    console.error("Option 'transformer' is deprecated, use stateTransformer instead");
  }

  var logBuffer = [];
  function printBuffer() {
    logBuffer.forEach(function (logEntry, key) {
      var started = logEntry.started;
      var startedTime = logEntry.startedTime;
      var action = logEntry.action;
      var prevState = logEntry.prevState;
      var error = logEntry.error;
      var took = logEntry.took;
      var nextState = logEntry.nextState;

      var nextEntry = logBuffer[key + 1];
      if (nextEntry) {
        nextState = nextEntry.prevState;
        took = nextEntry.started - started;
      }
      // message
      var formattedAction = actionTransformer(action);
      var isCollapsed = typeof collapsed === "function" ? collapsed(function () {
        return nextState;
      }, action) : collapsed;

      var formattedTime = formatTime(startedTime);
      var titleCSS = colors.title ? "color: " + colors.title(formattedAction) + ";" : null;
      var title = "action " + (timestamp ? formattedTime : "") + " " + formattedAction.type + " " + (duration ? "(in " + took.toFixed(2) + " ms)" : "");

      // render
      try {
        if (isCollapsed) {
          if (colors.title) logger.groupCollapsed("%c " + title, titleCSS);else logger.groupCollapsed(title);
        } else {
          if (colors.title) logger.group("%c " + title, titleCSS);else logger.group(title);
        }
      } catch (e) {
        logger.log(title);
      }

      var prevStateLevel = getLogLevel(level, formattedAction, [prevState], "prevState");
      var actionLevel = getLogLevel(level, formattedAction, [formattedAction], "action");
      var errorLevel = getLogLevel(level, formattedAction, [error, prevState], "error");
      var nextStateLevel = getLogLevel(level, formattedAction, [nextState], "nextState");

      if (prevStateLevel) {
        if (colors.prevState) logger[prevStateLevel]("%c prev state", "color: " + colors.prevState(prevState) + "; font-weight: bold", prevState);else logger[prevStateLevel]("prev state", prevState);
      }

      if (actionLevel) {
        if (colors.action) logger[actionLevel]("%c action", "color: " + colors.action(formattedAction) + "; font-weight: bold", formattedAction);else logger[actionLevel]("action", formattedAction);
      }

      if (error && errorLevel) {
        if (colors.error) logger[errorLevel]("%c error", "color: " + colors.error(error, prevState) + "; font-weight: bold", error);else logger[errorLevel]("error", error);
      }

      if (nextStateLevel) {
        if (colors.nextState) logger[nextStateLevel]("%c next state", "color: " + colors.nextState(nextState) + "; font-weight: bold", nextState);else logger[nextStateLevel]("next state", nextState);
      }

      try {
        logger.groupEnd();
      } catch (e) {
        logger.log("—— log end ——");
      }
    });
    logBuffer.length = 0;
  }

  return function (_ref) {
    var getState = _ref.getState;
    return function (next) {
      return function (action) {
        // exit early if predicate function returns false
        if (typeof predicate === "function" && !predicate(getState, action)) {
          return next(action);
        }

        var logEntry = {};
        logBuffer.push(logEntry);

        logEntry.started = timer.now();
        logEntry.startedTime = new Date();
        logEntry.prevState = stateTransformer(getState());
        logEntry.action = action;

        var returnedValue = undefined;
        if (logErrors) {
          try {
            returnedValue = next(action);
          } catch (e) {
            logEntry.error = errorTransformer(e);
          }
        } else {
          returnedValue = next(action);
        }

        logEntry.took = timer.now() - logEntry.started;
        logEntry.nextState = stateTransformer(getState());

        printBuffer();

        if (logEntry.error) throw logEntry.error;
        return returnedValue;
      };
    };
  };
}

module.exports = createLogger;
},{}],4:[function(require,module,exports){
'use strict';

exports.__esModule = true;
function createThunkMiddleware(extraArgument) {
  return function (_ref) {
    var dispatch = _ref.dispatch;
    var getState = _ref.getState;
    return function (next) {
      return function (action) {
        if (typeof action === 'function') {
          return action(dispatch, getState, extraArgument);
        }

        return next(action);
      };
    };
  };
}

var thunk = createThunkMiddleware();
thunk.withExtraArgument = createThunkMiddleware;

exports['default'] = thunk;
},{}],5:[function(require,module,exports){
'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports["default"] = applyMiddleware;

var _compose = require('./compose');

var _compose2 = _interopRequireDefault(_compose);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * Creates a store enhancer that applies middleware to the dispatch method
 * of the Redux store. This is handy for a variety of tasks, such as expressing
 * asynchronous actions in a concise manner, or logging every action payload.
 *
 * See `redux-thunk` package as an example of the Redux middleware.
 *
 * Because middleware is potentially asynchronous, this should be the first
 * store enhancer in the composition chain.
 *
 * Note that each middleware will be given the `dispatch` and `getState` functions
 * as named arguments.
 *
 * @param {...Function} middlewares The middleware chain to be applied.
 * @returns {Function} A store enhancer applying the middleware.
 */
function applyMiddleware() {
  for (var _len = arguments.length, middlewares = Array(_len), _key = 0; _key < _len; _key++) {
    middlewares[_key] = arguments[_key];
  }

  return function (createStore) {
    return function (reducer, initialState, enhancer) {
      var store = createStore(reducer, initialState, enhancer);
      var _dispatch = store.dispatch;
      var chain = [];

      var middlewareAPI = {
        getState: store.getState,
        dispatch: function dispatch(action) {
          return _dispatch(action);
        }
      };
      chain = middlewares.map(function (middleware) {
        return middleware(middlewareAPI);
      });
      _dispatch = _compose2["default"].apply(undefined, chain)(store.dispatch);

      return _extends({}, store, {
        dispatch: _dispatch
      });
    };
  };
}
},{"./compose":8}],6:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports["default"] = bindActionCreators;
function bindActionCreator(actionCreator, dispatch) {
  return function () {
    return dispatch(actionCreator.apply(undefined, arguments));
  };
}

/**
 * Turns an object whose values are action creators, into an object with the
 * same keys, but with every function wrapped into a `dispatch` call so they
 * may be invoked directly. This is just a convenience method, as you can call
 * `store.dispatch(MyActionCreators.doSomething())` yourself just fine.
 *
 * For convenience, you can also pass a single function as the first argument,
 * and get a function in return.
 *
 * @param {Function|Object} actionCreators An object whose values are action
 * creator functions. One handy way to obtain it is to use ES6 `import * as`
 * syntax. You may also pass a single function.
 *
 * @param {Function} dispatch The `dispatch` function available on your Redux
 * store.
 *
 * @returns {Function|Object} The object mimicking the original object, but with
 * every action creator wrapped into the `dispatch` call. If you passed a
 * function as `actionCreators`, the return value will also be a single
 * function.
 */
function bindActionCreators(actionCreators, dispatch) {
  if (typeof actionCreators === 'function') {
    return bindActionCreator(actionCreators, dispatch);
  }

  if (typeof actionCreators !== 'object' || actionCreators === null) {
    throw new Error('bindActionCreators expected an object or a function, instead received ' + (actionCreators === null ? 'null' : typeof actionCreators) + '. ' + 'Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?');
  }

  var keys = Object.keys(actionCreators);
  var boundActionCreators = {};
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var actionCreator = actionCreators[key];
    if (typeof actionCreator === 'function') {
      boundActionCreators[key] = bindActionCreator(actionCreator, dispatch);
    }
  }
  return boundActionCreators;
}
},{}],7:[function(require,module,exports){
(function (process){
'use strict';

exports.__esModule = true;
exports["default"] = combineReducers;

var _createStore = require('./createStore');

var _isPlainObject = require('lodash/isPlainObject');

var _isPlainObject2 = _interopRequireDefault(_isPlainObject);

var _warning = require('./utils/warning');

var _warning2 = _interopRequireDefault(_warning);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function getUndefinedStateErrorMessage(key, action) {
  var actionType = action && action.type;
  var actionName = actionType && '"' + actionType.toString() + '"' || 'an action';

  return 'Given action ' + actionName + ', reducer "' + key + '" returned undefined. ' + 'To ignore an action, you must explicitly return the previous state.';
}

function getUnexpectedStateShapeWarningMessage(inputState, reducers, action) {
  var reducerKeys = Object.keys(reducers);
  var argumentName = action && action.type === _createStore.ActionTypes.INIT ? 'initialState argument passed to createStore' : 'previous state received by the reducer';

  if (reducerKeys.length === 0) {
    return 'Store does not have a valid reducer. Make sure the argument passed ' + 'to combineReducers is an object whose values are reducers.';
  }

  if (!(0, _isPlainObject2["default"])(inputState)) {
    return 'The ' + argumentName + ' has unexpected type of "' + {}.toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] + '". Expected argument to be an object with the following ' + ('keys: "' + reducerKeys.join('", "') + '"');
  }

  var unexpectedKeys = Object.keys(inputState).filter(function (key) {
    return !reducers.hasOwnProperty(key);
  });

  if (unexpectedKeys.length > 0) {
    return 'Unexpected ' + (unexpectedKeys.length > 1 ? 'keys' : 'key') + ' ' + ('"' + unexpectedKeys.join('", "') + '" found in ' + argumentName + '. ') + 'Expected to find one of the known reducer keys instead: ' + ('"' + reducerKeys.join('", "') + '". Unexpected keys will be ignored.');
  }
}

function assertReducerSanity(reducers) {
  Object.keys(reducers).forEach(function (key) {
    var reducer = reducers[key];
    var initialState = reducer(undefined, { type: _createStore.ActionTypes.INIT });

    if (typeof initialState === 'undefined') {
      throw new Error('Reducer "' + key + '" returned undefined during initialization. ' + 'If the state passed to the reducer is undefined, you must ' + 'explicitly return the initial state. The initial state may ' + 'not be undefined.');
    }

    var type = '@@redux/PROBE_UNKNOWN_ACTION_' + Math.random().toString(36).substring(7).split('').join('.');
    if (typeof reducer(undefined, { type: type }) === 'undefined') {
      throw new Error('Reducer "' + key + '" returned undefined when probed with a random type. ' + ('Don\'t try to handle ' + _createStore.ActionTypes.INIT + ' or other actions in "redux/*" ') + 'namespace. They are considered private. Instead, you must return the ' + 'current state for any unknown actions, unless it is undefined, ' + 'in which case you must return the initial state, regardless of the ' + 'action type. The initial state may not be undefined.');
    }
  });
}

/**
 * Turns an object whose values are different reducer functions, into a single
 * reducer function. It will call every child reducer, and gather their results
 * into a single state object, whose keys correspond to the keys of the passed
 * reducer functions.
 *
 * @param {Object} reducers An object whose values correspond to different
 * reducer functions that need to be combined into one. One handy way to obtain
 * it is to use ES6 `import * as reducers` syntax. The reducers may never return
 * undefined for any action. Instead, they should return their initial state
 * if the state passed to them was undefined, and the current state for any
 * unrecognized action.
 *
 * @returns {Function} A reducer function that invokes every reducer inside the
 * passed object, and builds a state object with the same shape.
 */
function combineReducers(reducers) {
  var reducerKeys = Object.keys(reducers);
  var finalReducers = {};
  for (var i = 0; i < reducerKeys.length; i++) {
    var key = reducerKeys[i];
    if (typeof reducers[key] === 'function') {
      finalReducers[key] = reducers[key];
    }
  }
  var finalReducerKeys = Object.keys(finalReducers);

  var sanityError;
  try {
    assertReducerSanity(finalReducers);
  } catch (e) {
    sanityError = e;
  }

  return function combination() {
    var state = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
    var action = arguments[1];

    if (sanityError) {
      throw sanityError;
    }

    if (process.env.NODE_ENV !== 'production') {
      var warningMessage = getUnexpectedStateShapeWarningMessage(state, finalReducers, action);
      if (warningMessage) {
        (0, _warning2["default"])(warningMessage);
      }
    }

    var hasChanged = false;
    var nextState = {};
    for (var i = 0; i < finalReducerKeys.length; i++) {
      var key = finalReducerKeys[i];
      var reducer = finalReducers[key];
      var previousStateForKey = state[key];
      var nextStateForKey = reducer(previousStateForKey, action);
      if (typeof nextStateForKey === 'undefined') {
        var errorMessage = getUndefinedStateErrorMessage(key, action);
        throw new Error(errorMessage);
      }
      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }
    return hasChanged ? nextState : state;
  };
}
}).call(this,require('_process'))

},{"./createStore":9,"./utils/warning":11,"_process":1,"lodash/isPlainObject":15}],8:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports["default"] = compose;
/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */

function compose() {
  for (var _len = arguments.length, funcs = Array(_len), _key = 0; _key < _len; _key++) {
    funcs[_key] = arguments[_key];
  }

  if (funcs.length === 0) {
    return function (arg) {
      return arg;
    };
  } else {
    var _ret = function () {
      var last = funcs[funcs.length - 1];
      var rest = funcs.slice(0, -1);
      return {
        v: function v() {
          return rest.reduceRight(function (composed, f) {
            return f(composed);
          }, last.apply(undefined, arguments));
        }
      };
    }();

    if (typeof _ret === "object") return _ret.v;
  }
}
},{}],9:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.ActionTypes = undefined;
exports["default"] = createStore;

var _isPlainObject = require('lodash/isPlainObject');

var _isPlainObject2 = _interopRequireDefault(_isPlainObject);

var _symbolObservable = require('symbol-observable');

var _symbolObservable2 = _interopRequireDefault(_symbolObservable);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * These are private action types reserved by Redux.
 * For any unknown actions, you must return the current state.
 * If the current state is undefined, you must return the initial state.
 * Do not reference these action types directly in your code.
 */
var ActionTypes = exports.ActionTypes = {
  INIT: '@@redux/INIT'
};

/**
 * Creates a Redux store that holds the state tree.
 * The only way to change the data in the store is to call `dispatch()` on it.
 *
 * There should only be a single store in your app. To specify how different
 * parts of the state tree respond to actions, you may combine several reducers
 * into a single reducer function by using `combineReducers`.
 *
 * @param {Function} reducer A function that returns the next state tree, given
 * the current state tree and the action to handle.
 *
 * @param {any} [initialState] The initial state. You may optionally specify it
 * to hydrate the state from the server in universal apps, or to restore a
 * previously serialized user session.
 * If you use `combineReducers` to produce the root reducer function, this must be
 * an object with the same shape as `combineReducers` keys.
 *
 * @param {Function} enhancer The store enhancer. You may optionally specify it
 * to enhance the store with third-party capabilities such as middleware,
 * time travel, persistence, etc. The only store enhancer that ships with Redux
 * is `applyMiddleware()`.
 *
 * @returns {Store} A Redux store that lets you read the state, dispatch actions
 * and subscribe to changes.
 */
function createStore(reducer, initialState, enhancer) {
  var _ref2;

  if (typeof initialState === 'function' && typeof enhancer === 'undefined') {
    enhancer = initialState;
    initialState = undefined;
  }

  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.');
    }

    return enhancer(createStore)(reducer, initialState);
  }

  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.');
  }

  var currentReducer = reducer;
  var currentState = initialState;
  var currentListeners = [];
  var nextListeners = currentListeners;
  var isDispatching = false;

  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice();
    }
  }

  /**
   * Reads the state tree managed by the store.
   *
   * @returns {any} The current state tree of your application.
   */
  function getState() {
    return currentState;
  }

  /**
   * Adds a change listener. It will be called any time an action is dispatched,
   * and some part of the state tree may potentially have changed. You may then
   * call `getState()` to read the current state tree inside the callback.
   *
   * You may call `dispatch()` from a change listener, with the following
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `dispatch()` call.
   * If you subscribe or unsubscribe while the listeners are being invoked, this
   * will not have any effect on the `dispatch()` that is currently in progress.
   * However, the next `dispatch()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   *
   * 2. The listener should not expect to see all state changes, as the state
   * might have been updated multiple times during a nested `dispatch()` before
   * the listener is called. It is, however, guaranteed that all subscribers
   * registered before the `dispatch()` started will be called with the latest
   * state by the time it exits.
   *
   * @param {Function} listener A callback to be invoked on every dispatch.
   * @returns {Function} A function to remove this change listener.
   */
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected listener to be a function.');
    }

    var isSubscribed = true;

    ensureCanMutateNextListeners();
    nextListeners.push(listener);

    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }

      isSubscribed = false;

      ensureCanMutateNextListeners();
      var index = nextListeners.indexOf(listener);
      nextListeners.splice(index, 1);
    };
  }

  /**
   * Dispatches an action. It is the only way to trigger a state change.
   *
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will
   * be considered the **next** state of the tree, and the change listeners
   * will be notified.
   *
   * The base implementation only supports plain object actions. If you want to
   * dispatch a Promise, an Observable, a thunk, or something else, you need to
   * wrap your store creating function into the corresponding middleware. For
   * example, see the documentation for the `redux-thunk` package. Even the
   * middleware will eventually dispatch plain object actions using this method.
   *
   * @param {Object} action A plain object representing “what changed”. It is
   * a good idea to keep actions serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An action must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for action types.
   *
   * @returns {Object} For convenience, the same action object you dispatched.
   *
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   */
  function dispatch(action) {
    if (!(0, _isPlainObject2["default"])(action)) {
      throw new Error('Actions must be plain objects. ' + 'Use custom middleware for async actions.');
    }

    if (typeof action.type === 'undefined') {
      throw new Error('Actions may not have an undefined "type" property. ' + 'Have you misspelled a constant?');
    }

    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.');
    }

    try {
      isDispatching = true;
      currentState = currentReducer(currentState, action);
    } finally {
      isDispatching = false;
    }

    var listeners = currentListeners = nextListeners;
    for (var i = 0; i < listeners.length; i++) {
      listeners[i]();
    }

    return action;
  }

  /**
   * Replaces the reducer currently used by the store to calculate the state.
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the reducers dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   *
   * @param {Function} nextReducer The reducer for the store to use instead.
   * @returns {void}
   */
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.');
    }

    currentReducer = nextReducer;
    dispatch({ type: ActionTypes.INIT });
  }

  /**
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} A minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/zenparsing/es-observable
   */
  function observable() {
    var _ref;

    var outerSubscribe = subscribe;
    return _ref = {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */

      subscribe: function subscribe(observer) {
        if (typeof observer !== 'object') {
          throw new TypeError('Expected the observer to be an object.');
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState());
          }
        }

        observeState();
        var unsubscribe = outerSubscribe(observeState);
        return { unsubscribe: unsubscribe };
      }
    }, _ref[_symbolObservable2["default"]] = function () {
      return this;
    }, _ref;
  }

  // When a store is created, an "INIT" action is dispatched so that every
  // reducer returns their initial state. This effectively populates
  // the initial state tree.
  dispatch({ type: ActionTypes.INIT });

  return _ref2 = {
    dispatch: dispatch,
    subscribe: subscribe,
    getState: getState,
    replaceReducer: replaceReducer
  }, _ref2[_symbolObservable2["default"]] = observable, _ref2;
}
},{"lodash/isPlainObject":15,"symbol-observable":16}],10:[function(require,module,exports){
(function (process){
'use strict';

exports.__esModule = true;
exports.compose = exports.applyMiddleware = exports.bindActionCreators = exports.combineReducers = exports.createStore = undefined;

var _createStore = require('./createStore');

var _createStore2 = _interopRequireDefault(_createStore);

var _combineReducers = require('./combineReducers');

var _combineReducers2 = _interopRequireDefault(_combineReducers);

var _bindActionCreators = require('./bindActionCreators');

var _bindActionCreators2 = _interopRequireDefault(_bindActionCreators);

var _applyMiddleware = require('./applyMiddleware');

var _applyMiddleware2 = _interopRequireDefault(_applyMiddleware);

var _compose = require('./compose');

var _compose2 = _interopRequireDefault(_compose);

var _warning = require('./utils/warning');

var _warning2 = _interopRequireDefault(_warning);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/*
* This is a dummy function to check if the function name has been altered by minification.
* If the function has been minified and NODE_ENV !== 'production', warn the user.
*/
function isCrushed() {}

if (process.env.NODE_ENV !== 'production' && typeof isCrushed.name === 'string' && isCrushed.name !== 'isCrushed') {
  (0, _warning2["default"])('You are currently using minified code outside of NODE_ENV === \'production\'. ' + 'This means that you are running a slower development build of Redux. ' + 'You can use loose-envify (https://github.com/zertosh/loose-envify) for browserify ' + 'or DefinePlugin for webpack (http://stackoverflow.com/questions/30030031) ' + 'to ensure you have the correct code for your production build.');
}

exports.createStore = _createStore2["default"];
exports.combineReducers = _combineReducers2["default"];
exports.bindActionCreators = _bindActionCreators2["default"];
exports.applyMiddleware = _applyMiddleware2["default"];
exports.compose = _compose2["default"];
}).call(this,require('_process'))

},{"./applyMiddleware":5,"./bindActionCreators":6,"./combineReducers":7,"./compose":8,"./createStore":9,"./utils/warning":11,"_process":1}],11:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports["default"] = warning;
/**
 * Prints a warning in the console if it exists.
 *
 * @param {String} message The warning message.
 * @returns {void}
 */
function warning(message) {
  /* eslint-disable no-console */
  if (typeof console !== 'undefined' && typeof console.error === 'function') {
    console.error(message);
  }
  /* eslint-enable no-console */
  try {
    // This error was thrown as a convenience so that if you enable
    // "break on all exceptions" in your console,
    // it would pause the execution at this line.
    throw new Error(message);
    /* eslint-disable no-empty */
  } catch (e) {}
  /* eslint-enable no-empty */
}
},{}],12:[function(require,module,exports){
/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeGetPrototype = Object.getPrototypeOf;

/**
 * Gets the `[[Prototype]]` of `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {null|Object} Returns the `[[Prototype]]`.
 */
function getPrototype(value) {
  return nativeGetPrototype(Object(value));
}

module.exports = getPrototype;

},{}],13:[function(require,module,exports){
/**
 * Checks if `value` is a host object in IE < 9.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
 */
function isHostObject(value) {
  // Many host objects are `Object` objects that can coerce to strings
  // despite having improperly defined `toString` methods.
  var result = false;
  if (value != null && typeof value.toString != 'function') {
    try {
      result = !!(value + '');
    } catch (e) {}
  }
  return result;
}

module.exports = isHostObject;

},{}],14:[function(require,module,exports){
/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

module.exports = isObjectLike;

},{}],15:[function(require,module,exports){
var getPrototype = require('./_getPrototype'),
    isHostObject = require('./_isHostObject'),
    isObjectLike = require('./isObjectLike');

/** `Object#toString` result references. */
var objectTag = '[object Object]';

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Used to infer the `Object` constructor. */
var objectCtorString = funcToString.call(Object);

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/**
 * Checks if `value` is a plain object, that is, an object created by the
 * `Object` constructor or one with a `[[Prototype]]` of `null`.
 *
 * @static
 * @memberOf _
 * @since 0.8.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a plain object,
 *  else `false`.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 * }
 *
 * _.isPlainObject(new Foo);
 * // => false
 *
 * _.isPlainObject([1, 2, 3]);
 * // => false
 *
 * _.isPlainObject({ 'x': 0, 'y': 0 });
 * // => true
 *
 * _.isPlainObject(Object.create(null));
 * // => true
 */
function isPlainObject(value) {
  if (!isObjectLike(value) ||
      objectToString.call(value) != objectTag || isHostObject(value)) {
    return false;
  }
  var proto = getPrototype(value);
  if (proto === null) {
    return true;
  }
  var Ctor = hasOwnProperty.call(proto, 'constructor') && proto.constructor;
  return (typeof Ctor == 'function' &&
    Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString);
}

module.exports = isPlainObject;

},{"./_getPrototype":12,"./_isHostObject":13,"./isObjectLike":14}],16:[function(require,module,exports){
(function (global){
/* global window */
'use strict';

module.exports = require('./ponyfill')(global || window || this);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./ponyfill":17}],17:[function(require,module,exports){
'use strict';

module.exports = function symbolObservablePonyfill(root) {
	var result;
	var Symbol = root.Symbol;

	if (typeof Symbol === 'function') {
		if (Symbol.observable) {
			result = Symbol.observable;
		} else {
			result = Symbol('observable');
			Symbol.observable = result;
		}
	} else {
		result = '@@observable';
	}

	return result;
};

},{}],18:[function(require,module,exports){
'use strict';

var _redux = require('redux');

var _store = require('./store');

// Create a Redux store holding the state of your app.
/*jslint esversion: 6 */

// Initiate a redux store/dispatcher etc
var store = (0, _store.configureStore)({});

/**
 * Add a reducer function to the whisper framework
 * Reducers respond to actions and update the application's state.
 * @param {event} event
 */
var addReducer = function addReducer(event) {
  var d = event.detail;
  (0, _store.injectAsyncReducer)(store, d.name, d.reducer);
  if (d.onAdd !== undefined) {
    d.onAdd();
  }
};

/**
 * Dispatch an action to the store
 * Actions are payloads of information that send data from your application to your store.
 * They are the only source of information for the store
 * @param {event} event
 */
var dispatch = function dispatch(event) {
  console.log('whisper.dispatch', event);
  var d = event.detail;
  store.dispatch(d.action);
};

/**
 * Get the current state
 * @param {event} event
 * @returns {S}
 */
var getState = function getState(event) {
  var d = event.detail;
  return d(store.getState());
};

/**
 * Subscribe a function which is run when the store's state
 * changes. This function handles updating the view
 * @param {event} event
 */
var subscribe = function subscribe(event) {
  var d = event.detail;
  store.subscribe(d);
};

// Watch for any custom events (fired by components/modules etc)
document.addEventListener('whisper.addReducer', addReducer);
document.addEventListener('whisper.dispatch', dispatch);
document.addEventListener('whisper.getState', getState);
document.addEventListener('whisper.subscribe', subscribe);

},{"./store":21,"redux":10}],19:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = comUsers;

var _immutable = require('immutable');

var _immutable2 = _interopRequireDefault(_immutable);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var initialState = _immutable2.default.List(); /**
                                                * Created by rob on 17/05/2016.
                                                */

function comUsers() {
    var state = arguments.length <= 0 || arguments[0] === undefined ? initialState : arguments[0];
    var action = arguments[1];

    if (!action || !action.type) {
        return state;
    }
    switch (action.type) {
        case 'COM_USERS.INCREMENT':
            return state.insert(1);
        case 'COM_USERS.DECREMENT':
            return state - 1;
        default:
            return state;
    }
}

},{"immutable":2}],20:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; /**
                                                                                                                                                                                                                                                                   * Created by rob on 17/05/2016.
                                                                                                                                                                                                                                                                   */

exports.default = createReducer;

var _redux = require('redux');

var _comUsers = require('./com-users');

var _comUsers2 = _interopRequireDefault(_comUsers);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createReducer(asyncReducers) {
    return (0, _redux.combineReducers)(_extends({
        users: _comUsers2.default
    }, asyncReducers));
}

},{"./com-users":19,"redux":10}],21:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.configureStore = configureStore;
exports.injectAsyncReducer = injectAsyncReducer;

var _redux = require('redux');

var _index = require('./reducers/index');

var _index2 = _interopRequireDefault(_index);

var _reduxLogger = require('redux-logger');

var _reduxLogger2 = _interopRequireDefault(_reduxLogger);

var _reduxThunk = require('redux-thunk');

var _reduxThunk2 = _interopRequireDefault(_reduxThunk);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Configure the store
 * @param {*} initialState
 * @returns {Store}
 */
function configureStore(initialState) {
    console.log('create store initial state = ', initialState);
    var store = (0, _redux.createStore)((0, _index2.default)(), initialState, (0, _redux.applyMiddleware)(_reduxThunk2.default, (0, _reduxLogger2.default)()), window.devToolsExtension ? window.devToolsExtension() : function (f) {
        return f;
    });
    store.asyncReducers = {};
    return store;
}
/**
 * Inject a new reducer into the store.
 * @param {object} store
 * @param {string} name
 * @param {function} asyncReducer
 */
function injectAsyncReducer(store, name, asyncReducer) {
    store.asyncReducers[name] = asyncReducer;
    store.replaceReducer((0, _index2.default)(store.asyncReducers));
}

},{"./reducers/index":20,"redux":10,"redux-logger":3,"redux-thunk":4}]},{},[18])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2ltbXV0YWJsZS9kaXN0L2ltbXV0YWJsZS5qcyIsIm5vZGVfbW9kdWxlcy9yZWR1eC1sb2dnZXIvbGliL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3JlZHV4LXRodW5rL2xpYi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9yZWR1eC9saWIvYXBwbHlNaWRkbGV3YXJlLmpzIiwibm9kZV9tb2R1bGVzL3JlZHV4L2xpYi9iaW5kQWN0aW9uQ3JlYXRvcnMuanMiLCJub2RlX21vZHVsZXMvcmVkdXgvbGliL2NvbWJpbmVSZWR1Y2Vycy5qcyIsIm5vZGVfbW9kdWxlcy9yZWR1eC9saWIvY29tcG9zZS5qcyIsIm5vZGVfbW9kdWxlcy9yZWR1eC9saWIvY3JlYXRlU3RvcmUuanMiLCJub2RlX21vZHVsZXMvcmVkdXgvbGliL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3JlZHV4L2xpYi91dGlscy93YXJuaW5nLmpzIiwibm9kZV9tb2R1bGVzL3JlZHV4L25vZGVfbW9kdWxlcy9sb2Rhc2gvX2dldFByb3RvdHlwZS5qcyIsIm5vZGVfbW9kdWxlcy9yZWR1eC9ub2RlX21vZHVsZXMvbG9kYXNoL19pc0hvc3RPYmplY3QuanMiLCJub2RlX21vZHVsZXMvcmVkdXgvbm9kZV9tb2R1bGVzL2xvZGFzaC9pc09iamVjdExpa2UuanMiLCJub2RlX21vZHVsZXMvcmVkdXgvbm9kZV9tb2R1bGVzL2xvZGFzaC9pc1BsYWluT2JqZWN0LmpzIiwibm9kZV9tb2R1bGVzL3JlZHV4L25vZGVfbW9kdWxlcy9zeW1ib2wtb2JzZXJ2YWJsZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9yZWR1eC9ub2RlX21vZHVsZXMvc3ltYm9sLW9ic2VydmFibGUvcG9ueWZpbGwuanMiLCJzcmNcXGFwcC5qcyIsInNyY1xccmVkdWNlcnNcXGNvbS11c2Vycy5qcyIsInNyY1xccmVkdWNlcnNcXGluZGV4LmpzIiwic3JjXFxzdG9yZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbDNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzlIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3JRQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2hCQTs7QUFDQTs7Ozs7O0FBR0EsSUFBSSxRQUFRLDJCQUFlLEVBQWYsQ0FBWjs7Ozs7OztBQVFBLElBQU0sYUFBYSxTQUFiLFVBQWEsQ0FBQyxLQUFELEVBQVc7QUFDN0IsTUFBSSxJQUFJLE1BQU0sTUFBZDtBQUNBLGlDQUFtQixLQUFuQixFQUEwQixFQUFFLElBQTVCLEVBQWtDLEVBQUUsT0FBcEM7QUFDQSxNQUFJLEVBQUUsS0FBRixLQUFZLFNBQWhCLEVBQTJCO0FBQzFCLE1BQUUsS0FBRjtBQUNBO0FBQ0QsQ0FORDs7Ozs7Ozs7QUFjQSxJQUFNLFdBQVcsU0FBWCxRQUFXLENBQUMsS0FBRCxFQUFXO0FBQzNCLFVBQVEsR0FBUixDQUFZLGtCQUFaLEVBQWdDLEtBQWhDO0FBQ0EsTUFBSSxJQUFJLE1BQU0sTUFBZDtBQUNBLFFBQU0sUUFBTixDQUFlLEVBQUUsTUFBakI7QUFDQSxDQUpEOzs7Ozs7O0FBV0EsSUFBTSxXQUFXLFNBQVgsUUFBVyxDQUFDLEtBQUQsRUFBVztBQUMzQixNQUFJLElBQUksTUFBTSxNQUFkO0FBQ0EsU0FBTyxFQUFFLE1BQU0sUUFBTixFQUFGLENBQVA7QUFDQSxDQUhEOzs7Ozs7O0FBVUEsSUFBTSxZQUFZLFNBQVosU0FBWSxDQUFDLEtBQUQsRUFBVztBQUM1QixNQUFJLElBQUksTUFBTSxNQUFkO0FBQ0EsUUFBTSxTQUFOLENBQWdCLENBQWhCO0FBQ0EsQ0FIRDs7O0FBTUEsU0FBUyxnQkFBVCxDQUEwQixvQkFBMUIsRUFBZ0QsVUFBaEQ7QUFDQSxTQUFTLGdCQUFULENBQTBCLGtCQUExQixFQUE4QyxRQUE5QztBQUNBLFNBQVMsZ0JBQVQsQ0FBMEIsa0JBQTFCLEVBQThDLFFBQTlDO0FBQ0EsU0FBUyxnQkFBVCxDQUEwQixtQkFBMUIsRUFBK0MsU0FBL0M7Ozs7Ozs7O2tCQ2xEd0IsUTs7QUFMeEI7Ozs7OztBQUdBLElBQU0sZUFBZSxvQkFBVSxJQUFWLEVBQXJCLEM7Ozs7QUFFZSxTQUFTLFFBQVQsR0FBZ0Q7QUFBQSxRQUE5QixLQUE4Qix5REFBdEIsWUFBc0I7QUFBQSxRQUFSLE1BQVE7O0FBQzNELFFBQUksQ0FBQyxNQUFELElBQVcsQ0FBQyxPQUFPLElBQXZCLEVBQTZCO0FBQ3pCLGVBQU8sS0FBUDtBQUNIO0FBQ0QsWUFBUSxPQUFPLElBQWY7QUFDSSxhQUFLLHFCQUFMO0FBQ0ksbUJBQU8sTUFBTSxNQUFOLENBQWEsQ0FBYixDQUFQO0FBQ0osYUFBSyxxQkFBTDtBQUNJLG1CQUFPLFFBQVEsQ0FBZjtBQUNKO0FBQ0ksbUJBQU8sS0FBUDtBQU5SO0FBUUg7Ozs7Ozs7Ozs7Ozs7a0JDZHVCLGE7O0FBSHhCOztBQUNBOzs7Ozs7QUFFZSxTQUFTLGFBQVQsQ0FBdUIsYUFBdkIsRUFBc0M7QUFDakQsV0FBTztBQUNIO0FBREcsT0FFQSxhQUZBLEVBQVA7QUFJSDs7Ozs7Ozs7UUNGZSxjLEdBQUEsYztRQWFBLGtCLEdBQUEsa0I7O0FBdkJoQjs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7Ozs7Ozs7O0FBT08sU0FBUyxjQUFULENBQXdCLFlBQXhCLEVBQXNDO0FBQ3pDLFlBQVEsR0FBUixDQUFZLCtCQUFaLEVBQTZDLFlBQTdDO0FBQ0EsUUFBSSxRQUFRLHdCQUFZLHNCQUFaLEVBQTZCLFlBQTdCLEVBQTJDLGtEQUF1Qiw0QkFBdkIsQ0FBM0MsRUFDUixPQUFPLGlCQUFQLEdBQTJCLE9BQU8saUJBQVAsRUFBM0IsR0FBd0Q7QUFBQSxlQUFLLENBQUw7QUFBQSxLQURoRCxDQUFaO0FBRUEsVUFBTSxhQUFOLEdBQXNCLEVBQXRCO0FBQ0EsV0FBTyxLQUFQO0FBQ0g7Ozs7Ozs7QUFPTSxTQUFTLGtCQUFULENBQTRCLEtBQTVCLEVBQW1DLElBQW5DLEVBQXlDLFlBQXpDLEVBQXVEO0FBQzFELFVBQU0sYUFBTixDQUFvQixJQUFwQixJQUE0QixZQUE1QjtBQUNBLFVBQU0sY0FBTixDQUFxQixxQkFBYyxNQUFNLGFBQXBCLENBQXJCO0FBQ0giLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHNldFRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIvKipcbiAqICBDb3B5cmlnaHQgKGMpIDIwMTQtMjAxNSwgRmFjZWJvb2ssIEluYy5cbiAqICBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqICBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqICBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqICBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqL1xuXG4oZnVuY3Rpb24gKGdsb2JhbCwgZmFjdG9yeSkge1xuICB0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgPyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKSA6XG4gIHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZShmYWN0b3J5KSA6XG4gIChnbG9iYWwuSW1tdXRhYmxlID0gZmFjdG9yeSgpKTtcbn0odGhpcywgZnVuY3Rpb24gKCkgeyAndXNlIHN0cmljdCc7dmFyIFNMSUNFJDAgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG5cbiAgZnVuY3Rpb24gY3JlYXRlQ2xhc3MoY3Rvciwgc3VwZXJDbGFzcykge1xuICAgIGlmIChzdXBlckNsYXNzKSB7XG4gICAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDbGFzcy5wcm90b3R5cGUpO1xuICAgIH1cbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3I7XG4gIH1cblxuICBmdW5jdGlvbiBJdGVyYWJsZSh2YWx1ZSkge1xuICAgICAgcmV0dXJuIGlzSXRlcmFibGUodmFsdWUpID8gdmFsdWUgOiBTZXEodmFsdWUpO1xuICAgIH1cblxuXG4gIGNyZWF0ZUNsYXNzKEtleWVkSXRlcmFibGUsIEl0ZXJhYmxlKTtcbiAgICBmdW5jdGlvbiBLZXllZEl0ZXJhYmxlKHZhbHVlKSB7XG4gICAgICByZXR1cm4gaXNLZXllZCh2YWx1ZSkgPyB2YWx1ZSA6IEtleWVkU2VxKHZhbHVlKTtcbiAgICB9XG5cblxuICBjcmVhdGVDbGFzcyhJbmRleGVkSXRlcmFibGUsIEl0ZXJhYmxlKTtcbiAgICBmdW5jdGlvbiBJbmRleGVkSXRlcmFibGUodmFsdWUpIHtcbiAgICAgIHJldHVybiBpc0luZGV4ZWQodmFsdWUpID8gdmFsdWUgOiBJbmRleGVkU2VxKHZhbHVlKTtcbiAgICB9XG5cblxuICBjcmVhdGVDbGFzcyhTZXRJdGVyYWJsZSwgSXRlcmFibGUpO1xuICAgIGZ1bmN0aW9uIFNldEl0ZXJhYmxlKHZhbHVlKSB7XG4gICAgICByZXR1cm4gaXNJdGVyYWJsZSh2YWx1ZSkgJiYgIWlzQXNzb2NpYXRpdmUodmFsdWUpID8gdmFsdWUgOiBTZXRTZXEodmFsdWUpO1xuICAgIH1cblxuXG5cbiAgZnVuY3Rpb24gaXNJdGVyYWJsZShtYXliZUl0ZXJhYmxlKSB7XG4gICAgcmV0dXJuICEhKG1heWJlSXRlcmFibGUgJiYgbWF5YmVJdGVyYWJsZVtJU19JVEVSQUJMRV9TRU5USU5FTF0pO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNLZXllZChtYXliZUtleWVkKSB7XG4gICAgcmV0dXJuICEhKG1heWJlS2V5ZWQgJiYgbWF5YmVLZXllZFtJU19LRVlFRF9TRU5USU5FTF0pO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNJbmRleGVkKG1heWJlSW5kZXhlZCkge1xuICAgIHJldHVybiAhIShtYXliZUluZGV4ZWQgJiYgbWF5YmVJbmRleGVkW0lTX0lOREVYRURfU0VOVElORUxdKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzQXNzb2NpYXRpdmUobWF5YmVBc3NvY2lhdGl2ZSkge1xuICAgIHJldHVybiBpc0tleWVkKG1heWJlQXNzb2NpYXRpdmUpIHx8IGlzSW5kZXhlZChtYXliZUFzc29jaWF0aXZlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzT3JkZXJlZChtYXliZU9yZGVyZWQpIHtcbiAgICByZXR1cm4gISEobWF5YmVPcmRlcmVkICYmIG1heWJlT3JkZXJlZFtJU19PUkRFUkVEX1NFTlRJTkVMXSk7XG4gIH1cblxuICBJdGVyYWJsZS5pc0l0ZXJhYmxlID0gaXNJdGVyYWJsZTtcbiAgSXRlcmFibGUuaXNLZXllZCA9IGlzS2V5ZWQ7XG4gIEl0ZXJhYmxlLmlzSW5kZXhlZCA9IGlzSW5kZXhlZDtcbiAgSXRlcmFibGUuaXNBc3NvY2lhdGl2ZSA9IGlzQXNzb2NpYXRpdmU7XG4gIEl0ZXJhYmxlLmlzT3JkZXJlZCA9IGlzT3JkZXJlZDtcblxuICBJdGVyYWJsZS5LZXllZCA9IEtleWVkSXRlcmFibGU7XG4gIEl0ZXJhYmxlLkluZGV4ZWQgPSBJbmRleGVkSXRlcmFibGU7XG4gIEl0ZXJhYmxlLlNldCA9IFNldEl0ZXJhYmxlO1xuXG5cbiAgdmFyIElTX0lURVJBQkxFX1NFTlRJTkVMID0gJ0BAX19JTU1VVEFCTEVfSVRFUkFCTEVfX0BAJztcbiAgdmFyIElTX0tFWUVEX1NFTlRJTkVMID0gJ0BAX19JTU1VVEFCTEVfS0VZRURfX0BAJztcbiAgdmFyIElTX0lOREVYRURfU0VOVElORUwgPSAnQEBfX0lNTVVUQUJMRV9JTkRFWEVEX19AQCc7XG4gIHZhciBJU19PUkRFUkVEX1NFTlRJTkVMID0gJ0BAX19JTU1VVEFCTEVfT1JERVJFRF9fQEAnO1xuXG4gIC8vIFVzZWQgZm9yIHNldHRpbmcgcHJvdG90eXBlIG1ldGhvZHMgdGhhdCBJRTggY2hva2VzIG9uLlxuICB2YXIgREVMRVRFID0gJ2RlbGV0ZSc7XG5cbiAgLy8gQ29uc3RhbnRzIGRlc2NyaWJpbmcgdGhlIHNpemUgb2YgdHJpZSBub2Rlcy5cbiAgdmFyIFNISUZUID0gNTsgLy8gUmVzdWx0ZWQgaW4gYmVzdCBwZXJmb3JtYW5jZSBhZnRlciBfX19fX18/XG4gIHZhciBTSVpFID0gMSA8PCBTSElGVDtcbiAgdmFyIE1BU0sgPSBTSVpFIC0gMTtcblxuICAvLyBBIGNvbnNpc3RlbnQgc2hhcmVkIHZhbHVlIHJlcHJlc2VudGluZyBcIm5vdCBzZXRcIiB3aGljaCBlcXVhbHMgbm90aGluZyBvdGhlclxuICAvLyB0aGFuIGl0c2VsZiwgYW5kIG5vdGhpbmcgdGhhdCBjb3VsZCBiZSBwcm92aWRlZCBleHRlcm5hbGx5LlxuICB2YXIgTk9UX1NFVCA9IHt9O1xuXG4gIC8vIEJvb2xlYW4gcmVmZXJlbmNlcywgUm91Z2ggZXF1aXZhbGVudCBvZiBgYm9vbCAmYC5cbiAgdmFyIENIQU5HRV9MRU5HVEggPSB7IHZhbHVlOiBmYWxzZSB9O1xuICB2YXIgRElEX0FMVEVSID0geyB2YWx1ZTogZmFsc2UgfTtcblxuICBmdW5jdGlvbiBNYWtlUmVmKHJlZikge1xuICAgIHJlZi52YWx1ZSA9IGZhbHNlO1xuICAgIHJldHVybiByZWY7XG4gIH1cblxuICBmdW5jdGlvbiBTZXRSZWYocmVmKSB7XG4gICAgcmVmICYmIChyZWYudmFsdWUgPSB0cnVlKTtcbiAgfVxuXG4gIC8vIEEgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhIHZhbHVlIHJlcHJlc2VudGluZyBhbiBcIm93bmVyXCIgZm9yIHRyYW5zaWVudCB3cml0ZXNcbiAgLy8gdG8gdHJpZXMuIFRoZSByZXR1cm4gdmFsdWUgd2lsbCBvbmx5IGV2ZXIgZXF1YWwgaXRzZWxmLCBhbmQgd2lsbCBub3QgZXF1YWxcbiAgLy8gdGhlIHJldHVybiBvZiBhbnkgc3Vic2VxdWVudCBjYWxsIG9mIHRoaXMgZnVuY3Rpb24uXG4gIGZ1bmN0aW9uIE93bmVySUQoKSB7fVxuXG4gIC8vIGh0dHA6Ly9qc3BlcmYuY29tL2NvcHktYXJyYXktaW5saW5lXG4gIGZ1bmN0aW9uIGFyckNvcHkoYXJyLCBvZmZzZXQpIHtcbiAgICBvZmZzZXQgPSBvZmZzZXQgfHwgMDtcbiAgICB2YXIgbGVuID0gTWF0aC5tYXgoMCwgYXJyLmxlbmd0aCAtIG9mZnNldCk7XG4gICAgdmFyIG5ld0FyciA9IG5ldyBBcnJheShsZW4pO1xuICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBsZW47IGlpKyspIHtcbiAgICAgIG5ld0FycltpaV0gPSBhcnJbaWkgKyBvZmZzZXRdO1xuICAgIH1cbiAgICByZXR1cm4gbmV3QXJyO1xuICB9XG5cbiAgZnVuY3Rpb24gZW5zdXJlU2l6ZShpdGVyKSB7XG4gICAgaWYgKGl0ZXIuc2l6ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBpdGVyLnNpemUgPSBpdGVyLl9faXRlcmF0ZShyZXR1cm5UcnVlKTtcbiAgICB9XG4gICAgcmV0dXJuIGl0ZXIuc2l6ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHdyYXBJbmRleChpdGVyLCBpbmRleCkge1xuICAgIC8vIFRoaXMgaW1wbGVtZW50cyBcImlzIGFycmF5IGluZGV4XCIgd2hpY2ggdGhlIEVDTUFTdHJpbmcgc3BlYyBkZWZpbmVzIGFzOlxuICAgIC8vXG4gICAgLy8gICAgIEEgU3RyaW5nIHByb3BlcnR5IG5hbWUgUCBpcyBhbiBhcnJheSBpbmRleCBpZiBhbmQgb25seSBpZlxuICAgIC8vICAgICBUb1N0cmluZyhUb1VpbnQzMihQKSkgaXMgZXF1YWwgdG8gUCBhbmQgVG9VaW50MzIoUCkgaXMgbm90IGVxdWFsXG4gICAgLy8gICAgIHRvIDJeMzLiiJIxLlxuICAgIC8vXG4gICAgLy8gaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC8jc2VjLWFycmF5LWV4b3RpYy1vYmplY3RzXG4gICAgaWYgKHR5cGVvZiBpbmRleCAhPT0gJ251bWJlcicpIHtcbiAgICAgIHZhciB1aW50MzJJbmRleCA9IGluZGV4ID4+PiAwOyAvLyBOID4+PiAwIGlzIHNob3J0aGFuZCBmb3IgVG9VaW50MzJcbiAgICAgIGlmICgnJyArIHVpbnQzMkluZGV4ICE9PSBpbmRleCB8fCB1aW50MzJJbmRleCA9PT0gNDI5NDk2NzI5NSkge1xuICAgICAgICByZXR1cm4gTmFOO1xuICAgICAgfVxuICAgICAgaW5kZXggPSB1aW50MzJJbmRleDtcbiAgICB9XG4gICAgcmV0dXJuIGluZGV4IDwgMCA/IGVuc3VyZVNpemUoaXRlcikgKyBpbmRleCA6IGluZGV4O1xuICB9XG5cbiAgZnVuY3Rpb24gcmV0dXJuVHJ1ZSgpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHdob2xlU2xpY2UoYmVnaW4sIGVuZCwgc2l6ZSkge1xuICAgIHJldHVybiAoYmVnaW4gPT09IDAgfHwgKHNpemUgIT09IHVuZGVmaW5lZCAmJiBiZWdpbiA8PSAtc2l6ZSkpICYmXG4gICAgICAoZW5kID09PSB1bmRlZmluZWQgfHwgKHNpemUgIT09IHVuZGVmaW5lZCAmJiBlbmQgPj0gc2l6ZSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVzb2x2ZUJlZ2luKGJlZ2luLCBzaXplKSB7XG4gICAgcmV0dXJuIHJlc29sdmVJbmRleChiZWdpbiwgc2l6ZSwgMCk7XG4gIH1cblxuICBmdW5jdGlvbiByZXNvbHZlRW5kKGVuZCwgc2l6ZSkge1xuICAgIHJldHVybiByZXNvbHZlSW5kZXgoZW5kLCBzaXplLCBzaXplKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlc29sdmVJbmRleChpbmRleCwgc2l6ZSwgZGVmYXVsdEluZGV4KSB7XG4gICAgcmV0dXJuIGluZGV4ID09PSB1bmRlZmluZWQgP1xuICAgICAgZGVmYXVsdEluZGV4IDpcbiAgICAgIGluZGV4IDwgMCA/XG4gICAgICAgIE1hdGgubWF4KDAsIHNpemUgKyBpbmRleCkgOlxuICAgICAgICBzaXplID09PSB1bmRlZmluZWQgP1xuICAgICAgICAgIGluZGV4IDpcbiAgICAgICAgICBNYXRoLm1pbihzaXplLCBpbmRleCk7XG4gIH1cblxuICAvKiBnbG9iYWwgU3ltYm9sICovXG5cbiAgdmFyIElURVJBVEVfS0VZUyA9IDA7XG4gIHZhciBJVEVSQVRFX1ZBTFVFUyA9IDE7XG4gIHZhciBJVEVSQVRFX0VOVFJJRVMgPSAyO1xuXG4gIHZhciBSRUFMX0lURVJBVE9SX1NZTUJPTCA9IHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicgJiYgU3ltYm9sLml0ZXJhdG9yO1xuICB2YXIgRkFVWF9JVEVSQVRPUl9TWU1CT0wgPSAnQEBpdGVyYXRvcic7XG5cbiAgdmFyIElURVJBVE9SX1NZTUJPTCA9IFJFQUxfSVRFUkFUT1JfU1lNQk9MIHx8IEZBVVhfSVRFUkFUT1JfU1lNQk9MO1xuXG5cbiAgZnVuY3Rpb24gSXRlcmF0b3IobmV4dCkge1xuICAgICAgdGhpcy5uZXh0ID0gbmV4dDtcbiAgICB9XG5cbiAgICBJdGVyYXRvci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAnW0l0ZXJhdG9yXSc7XG4gICAgfTtcblxuXG4gIEl0ZXJhdG9yLktFWVMgPSBJVEVSQVRFX0tFWVM7XG4gIEl0ZXJhdG9yLlZBTFVFUyA9IElURVJBVEVfVkFMVUVTO1xuICBJdGVyYXRvci5FTlRSSUVTID0gSVRFUkFURV9FTlRSSUVTO1xuXG4gIEl0ZXJhdG9yLnByb3RvdHlwZS5pbnNwZWN0ID1cbiAgSXRlcmF0b3IucHJvdG90eXBlLnRvU291cmNlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy50b1N0cmluZygpOyB9XG4gIEl0ZXJhdG9yLnByb3RvdHlwZVtJVEVSQVRPUl9TWU1CT0xdID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG5cbiAgZnVuY3Rpb24gaXRlcmF0b3JWYWx1ZSh0eXBlLCBrLCB2LCBpdGVyYXRvclJlc3VsdCkge1xuICAgIHZhciB2YWx1ZSA9IHR5cGUgPT09IDAgPyBrIDogdHlwZSA9PT0gMSA/IHYgOiBbaywgdl07XG4gICAgaXRlcmF0b3JSZXN1bHQgPyAoaXRlcmF0b3JSZXN1bHQudmFsdWUgPSB2YWx1ZSkgOiAoaXRlcmF0b3JSZXN1bHQgPSB7XG4gICAgICB2YWx1ZTogdmFsdWUsIGRvbmU6IGZhbHNlXG4gICAgfSk7XG4gICAgcmV0dXJuIGl0ZXJhdG9yUmVzdWx0O1xuICB9XG5cbiAgZnVuY3Rpb24gaXRlcmF0b3JEb25lKCkge1xuICAgIHJldHVybiB7IHZhbHVlOiB1bmRlZmluZWQsIGRvbmU6IHRydWUgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhc0l0ZXJhdG9yKG1heWJlSXRlcmFibGUpIHtcbiAgICByZXR1cm4gISFnZXRJdGVyYXRvckZuKG1heWJlSXRlcmFibGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNJdGVyYXRvcihtYXliZUl0ZXJhdG9yKSB7XG4gICAgcmV0dXJuIG1heWJlSXRlcmF0b3IgJiYgdHlwZW9mIG1heWJlSXRlcmF0b3IubmV4dCA9PT0gJ2Z1bmN0aW9uJztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEl0ZXJhdG9yKGl0ZXJhYmxlKSB7XG4gICAgdmFyIGl0ZXJhdG9yRm4gPSBnZXRJdGVyYXRvckZuKGl0ZXJhYmxlKTtcbiAgICByZXR1cm4gaXRlcmF0b3JGbiAmJiBpdGVyYXRvckZuLmNhbGwoaXRlcmFibGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0SXRlcmF0b3JGbihpdGVyYWJsZSkge1xuICAgIHZhciBpdGVyYXRvckZuID0gaXRlcmFibGUgJiYgKFxuICAgICAgKFJFQUxfSVRFUkFUT1JfU1lNQk9MICYmIGl0ZXJhYmxlW1JFQUxfSVRFUkFUT1JfU1lNQk9MXSkgfHxcbiAgICAgIGl0ZXJhYmxlW0ZBVVhfSVRFUkFUT1JfU1lNQk9MXVxuICAgICk7XG4gICAgaWYgKHR5cGVvZiBpdGVyYXRvckZuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gaXRlcmF0b3JGbjtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBpc0FycmF5TGlrZSh2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZSAmJiB0eXBlb2YgdmFsdWUubGVuZ3RoID09PSAnbnVtYmVyJztcbiAgfVxuXG4gIGNyZWF0ZUNsYXNzKFNlcSwgSXRlcmFibGUpO1xuICAgIGZ1bmN0aW9uIFNlcSh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSB1bmRlZmluZWQgPyBlbXB0eVNlcXVlbmNlKCkgOlxuICAgICAgICBpc0l0ZXJhYmxlKHZhbHVlKSA/IHZhbHVlLnRvU2VxKCkgOiBzZXFGcm9tVmFsdWUodmFsdWUpO1xuICAgIH1cblxuICAgIFNlcS5vZiA9IGZ1bmN0aW9uKC8qLi4udmFsdWVzKi8pIHtcbiAgICAgIHJldHVybiBTZXEoYXJndW1lbnRzKTtcbiAgICB9O1xuXG4gICAgU2VxLnByb3RvdHlwZS50b1NlcSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIFNlcS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9fdG9TdHJpbmcoJ1NlcSB7JywgJ30nKTtcbiAgICB9O1xuXG4gICAgU2VxLnByb3RvdHlwZS5jYWNoZVJlc3VsdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCF0aGlzLl9jYWNoZSAmJiB0aGlzLl9faXRlcmF0ZVVuY2FjaGVkKSB7XG4gICAgICAgIHRoaXMuX2NhY2hlID0gdGhpcy5lbnRyeVNlcSgpLnRvQXJyYXkoKTtcbiAgICAgICAgdGhpcy5zaXplID0gdGhpcy5fY2FjaGUubGVuZ3RoO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8vIGFic3RyYWN0IF9faXRlcmF0ZVVuY2FjaGVkKGZuLCByZXZlcnNlKVxuXG4gICAgU2VxLnByb3RvdHlwZS5fX2l0ZXJhdGUgPSBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgICAgcmV0dXJuIHNlcUl0ZXJhdGUodGhpcywgZm4sIHJldmVyc2UsIHRydWUpO1xuICAgIH07XG5cbiAgICAvLyBhYnN0cmFjdCBfX2l0ZXJhdG9yVW5jYWNoZWQodHlwZSwgcmV2ZXJzZSlcblxuICAgIFNlcS5wcm90b3R5cGUuX19pdGVyYXRvciA9IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICAgIHJldHVybiBzZXFJdGVyYXRvcih0aGlzLCB0eXBlLCByZXZlcnNlLCB0cnVlKTtcbiAgICB9O1xuXG5cblxuICBjcmVhdGVDbGFzcyhLZXllZFNlcSwgU2VxKTtcbiAgICBmdW5jdGlvbiBLZXllZFNlcSh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSB1bmRlZmluZWQgP1xuICAgICAgICBlbXB0eVNlcXVlbmNlKCkudG9LZXllZFNlcSgpIDpcbiAgICAgICAgaXNJdGVyYWJsZSh2YWx1ZSkgP1xuICAgICAgICAgIChpc0tleWVkKHZhbHVlKSA/IHZhbHVlLnRvU2VxKCkgOiB2YWx1ZS5mcm9tRW50cnlTZXEoKSkgOlxuICAgICAgICAgIGtleWVkU2VxRnJvbVZhbHVlKHZhbHVlKTtcbiAgICB9XG5cbiAgICBLZXllZFNlcS5wcm90b3R5cGUudG9LZXllZFNlcSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuXG5cbiAgY3JlYXRlQ2xhc3MoSW5kZXhlZFNlcSwgU2VxKTtcbiAgICBmdW5jdGlvbiBJbmRleGVkU2VxKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCA/IGVtcHR5U2VxdWVuY2UoKSA6XG4gICAgICAgICFpc0l0ZXJhYmxlKHZhbHVlKSA/IGluZGV4ZWRTZXFGcm9tVmFsdWUodmFsdWUpIDpcbiAgICAgICAgaXNLZXllZCh2YWx1ZSkgPyB2YWx1ZS5lbnRyeVNlcSgpIDogdmFsdWUudG9JbmRleGVkU2VxKCk7XG4gICAgfVxuXG4gICAgSW5kZXhlZFNlcS5vZiA9IGZ1bmN0aW9uKC8qLi4udmFsdWVzKi8pIHtcbiAgICAgIHJldHVybiBJbmRleGVkU2VxKGFyZ3VtZW50cyk7XG4gICAgfTtcblxuICAgIEluZGV4ZWRTZXEucHJvdG90eXBlLnRvSW5kZXhlZFNlcSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIEluZGV4ZWRTZXEucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fX3RvU3RyaW5nKCdTZXEgWycsICddJyk7XG4gICAgfTtcblxuICAgIEluZGV4ZWRTZXEucHJvdG90eXBlLl9faXRlcmF0ZSA9IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgICByZXR1cm4gc2VxSXRlcmF0ZSh0aGlzLCBmbiwgcmV2ZXJzZSwgZmFsc2UpO1xuICAgIH07XG5cbiAgICBJbmRleGVkU2VxLnByb3RvdHlwZS5fX2l0ZXJhdG9yID0gZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgICAgcmV0dXJuIHNlcUl0ZXJhdG9yKHRoaXMsIHR5cGUsIHJldmVyc2UsIGZhbHNlKTtcbiAgICB9O1xuXG5cblxuICBjcmVhdGVDbGFzcyhTZXRTZXEsIFNlcSk7XG4gICAgZnVuY3Rpb24gU2V0U2VxKHZhbHVlKSB7XG4gICAgICByZXR1cm4gKFxuICAgICAgICB2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkID8gZW1wdHlTZXF1ZW5jZSgpIDpcbiAgICAgICAgIWlzSXRlcmFibGUodmFsdWUpID8gaW5kZXhlZFNlcUZyb21WYWx1ZSh2YWx1ZSkgOlxuICAgICAgICBpc0tleWVkKHZhbHVlKSA/IHZhbHVlLmVudHJ5U2VxKCkgOiB2YWx1ZVxuICAgICAgKS50b1NldFNlcSgpO1xuICAgIH1cblxuICAgIFNldFNlcS5vZiA9IGZ1bmN0aW9uKC8qLi4udmFsdWVzKi8pIHtcbiAgICAgIHJldHVybiBTZXRTZXEoYXJndW1lbnRzKTtcbiAgICB9O1xuXG4gICAgU2V0U2VxLnByb3RvdHlwZS50b1NldFNlcSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuXG5cbiAgU2VxLmlzU2VxID0gaXNTZXE7XG4gIFNlcS5LZXllZCA9IEtleWVkU2VxO1xuICBTZXEuU2V0ID0gU2V0U2VxO1xuICBTZXEuSW5kZXhlZCA9IEluZGV4ZWRTZXE7XG5cbiAgdmFyIElTX1NFUV9TRU5USU5FTCA9ICdAQF9fSU1NVVRBQkxFX1NFUV9fQEAnO1xuXG4gIFNlcS5wcm90b3R5cGVbSVNfU0VRX1NFTlRJTkVMXSA9IHRydWU7XG5cblxuXG4gIGNyZWF0ZUNsYXNzKEFycmF5U2VxLCBJbmRleGVkU2VxKTtcbiAgICBmdW5jdGlvbiBBcnJheVNlcShhcnJheSkge1xuICAgICAgdGhpcy5fYXJyYXkgPSBhcnJheTtcbiAgICAgIHRoaXMuc2l6ZSA9IGFycmF5Lmxlbmd0aDtcbiAgICB9XG5cbiAgICBBcnJheVNlcS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24oaW5kZXgsIG5vdFNldFZhbHVlKSB7XG4gICAgICByZXR1cm4gdGhpcy5oYXMoaW5kZXgpID8gdGhpcy5fYXJyYXlbd3JhcEluZGV4KHRoaXMsIGluZGV4KV0gOiBub3RTZXRWYWx1ZTtcbiAgICB9O1xuXG4gICAgQXJyYXlTZXEucHJvdG90eXBlLl9faXRlcmF0ZSA9IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgICB2YXIgYXJyYXkgPSB0aGlzLl9hcnJheTtcbiAgICAgIHZhciBtYXhJbmRleCA9IGFycmF5Lmxlbmd0aCAtIDE7XG4gICAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDw9IG1heEluZGV4OyBpaSsrKSB7XG4gICAgICAgIGlmIChmbihhcnJheVtyZXZlcnNlID8gbWF4SW5kZXggLSBpaSA6IGlpXSwgaWksIHRoaXMpID09PSBmYWxzZSkge1xuICAgICAgICAgIHJldHVybiBpaSArIDE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBpaTtcbiAgICB9O1xuXG4gICAgQXJyYXlTZXEucHJvdG90eXBlLl9faXRlcmF0b3IgPSBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgICB2YXIgYXJyYXkgPSB0aGlzLl9hcnJheTtcbiAgICAgIHZhciBtYXhJbmRleCA9IGFycmF5Lmxlbmd0aCAtIDE7XG4gICAgICB2YXIgaWkgPSAwO1xuICAgICAgcmV0dXJuIG5ldyBJdGVyYXRvcihmdW5jdGlvbigpIFxuICAgICAgICB7cmV0dXJuIGlpID4gbWF4SW5kZXggP1xuICAgICAgICAgIGl0ZXJhdG9yRG9uZSgpIDpcbiAgICAgICAgICBpdGVyYXRvclZhbHVlKHR5cGUsIGlpLCBhcnJheVtyZXZlcnNlID8gbWF4SW5kZXggLSBpaSsrIDogaWkrK10pfVxuICAgICAgKTtcbiAgICB9O1xuXG5cblxuICBjcmVhdGVDbGFzcyhPYmplY3RTZXEsIEtleWVkU2VxKTtcbiAgICBmdW5jdGlvbiBPYmplY3RTZXEob2JqZWN0KSB7XG4gICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iamVjdCk7XG4gICAgICB0aGlzLl9vYmplY3QgPSBvYmplY3Q7XG4gICAgICB0aGlzLl9rZXlzID0ga2V5cztcbiAgICAgIHRoaXMuc2l6ZSA9IGtleXMubGVuZ3RoO1xuICAgIH1cblxuICAgIE9iamVjdFNlcS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24oa2V5LCBub3RTZXRWYWx1ZSkge1xuICAgICAgaWYgKG5vdFNldFZhbHVlICE9PSB1bmRlZmluZWQgJiYgIXRoaXMuaGFzKGtleSkpIHtcbiAgICAgICAgcmV0dXJuIG5vdFNldFZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuX29iamVjdFtrZXldO1xuICAgIH07XG5cbiAgICBPYmplY3RTZXEucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIHRoaXMuX29iamVjdC5oYXNPd25Qcm9wZXJ0eShrZXkpO1xuICAgIH07XG5cbiAgICBPYmplY3RTZXEucHJvdG90eXBlLl9faXRlcmF0ZSA9IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgICB2YXIgb2JqZWN0ID0gdGhpcy5fb2JqZWN0O1xuICAgICAgdmFyIGtleXMgPSB0aGlzLl9rZXlzO1xuICAgICAgdmFyIG1heEluZGV4ID0ga2V5cy5sZW5ndGggLSAxO1xuICAgICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8PSBtYXhJbmRleDsgaWkrKykge1xuICAgICAgICB2YXIga2V5ID0ga2V5c1tyZXZlcnNlID8gbWF4SW5kZXggLSBpaSA6IGlpXTtcbiAgICAgICAgaWYgKGZuKG9iamVjdFtrZXldLCBrZXksIHRoaXMpID09PSBmYWxzZSkge1xuICAgICAgICAgIHJldHVybiBpaSArIDE7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBpaTtcbiAgICB9O1xuXG4gICAgT2JqZWN0U2VxLnByb3RvdHlwZS5fX2l0ZXJhdG9yID0gZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgICAgdmFyIG9iamVjdCA9IHRoaXMuX29iamVjdDtcbiAgICAgIHZhciBrZXlzID0gdGhpcy5fa2V5cztcbiAgICAgIHZhciBtYXhJbmRleCA9IGtleXMubGVuZ3RoIC0gMTtcbiAgICAgIHZhciBpaSA9IDA7XG4gICAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKGZ1bmN0aW9uKCkgIHtcbiAgICAgICAgdmFyIGtleSA9IGtleXNbcmV2ZXJzZSA/IG1heEluZGV4IC0gaWkgOiBpaV07XG4gICAgICAgIHJldHVybiBpaSsrID4gbWF4SW5kZXggP1xuICAgICAgICAgIGl0ZXJhdG9yRG9uZSgpIDpcbiAgICAgICAgICBpdGVyYXRvclZhbHVlKHR5cGUsIGtleSwgb2JqZWN0W2tleV0pO1xuICAgICAgfSk7XG4gICAgfTtcblxuICBPYmplY3RTZXEucHJvdG90eXBlW0lTX09SREVSRURfU0VOVElORUxdID0gdHJ1ZTtcblxuXG4gIGNyZWF0ZUNsYXNzKEl0ZXJhYmxlU2VxLCBJbmRleGVkU2VxKTtcbiAgICBmdW5jdGlvbiBJdGVyYWJsZVNlcShpdGVyYWJsZSkge1xuICAgICAgdGhpcy5faXRlcmFibGUgPSBpdGVyYWJsZTtcbiAgICAgIHRoaXMuc2l6ZSA9IGl0ZXJhYmxlLmxlbmd0aCB8fCBpdGVyYWJsZS5zaXplO1xuICAgIH1cblxuICAgIEl0ZXJhYmxlU2VxLnByb3RvdHlwZS5fX2l0ZXJhdGVVbmNhY2hlZCA9IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0ZShmbiwgcmV2ZXJzZSk7XG4gICAgICB9XG4gICAgICB2YXIgaXRlcmFibGUgPSB0aGlzLl9pdGVyYWJsZTtcbiAgICAgIHZhciBpdGVyYXRvciA9IGdldEl0ZXJhdG9yKGl0ZXJhYmxlKTtcbiAgICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICAgIGlmIChpc0l0ZXJhdG9yKGl0ZXJhdG9yKSkge1xuICAgICAgICB2YXIgc3RlcDtcbiAgICAgICAgd2hpbGUgKCEoc3RlcCA9IGl0ZXJhdG9yLm5leHQoKSkuZG9uZSkge1xuICAgICAgICAgIGlmIChmbihzdGVwLnZhbHVlLCBpdGVyYXRpb25zKyssIHRoaXMpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaXRlcmF0aW9ucztcbiAgICB9O1xuXG4gICAgSXRlcmFibGVTZXEucHJvdG90eXBlLl9faXRlcmF0b3JVbmNhY2hlZCA9IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRvcih0eXBlLCByZXZlcnNlKTtcbiAgICAgIH1cbiAgICAgIHZhciBpdGVyYWJsZSA9IHRoaXMuX2l0ZXJhYmxlO1xuICAgICAgdmFyIGl0ZXJhdG9yID0gZ2V0SXRlcmF0b3IoaXRlcmFibGUpO1xuICAgICAgaWYgKCFpc0l0ZXJhdG9yKGl0ZXJhdG9yKSkge1xuICAgICAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKGl0ZXJhdG9yRG9uZSk7XG4gICAgICB9XG4gICAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKGZ1bmN0aW9uKCkgIHtcbiAgICAgICAgdmFyIHN0ZXAgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIHJldHVybiBzdGVwLmRvbmUgPyBzdGVwIDogaXRlcmF0b3JWYWx1ZSh0eXBlLCBpdGVyYXRpb25zKyssIHN0ZXAudmFsdWUpO1xuICAgICAgfSk7XG4gICAgfTtcblxuXG5cbiAgY3JlYXRlQ2xhc3MoSXRlcmF0b3JTZXEsIEluZGV4ZWRTZXEpO1xuICAgIGZ1bmN0aW9uIEl0ZXJhdG9yU2VxKGl0ZXJhdG9yKSB7XG4gICAgICB0aGlzLl9pdGVyYXRvciA9IGl0ZXJhdG9yO1xuICAgICAgdGhpcy5faXRlcmF0b3JDYWNoZSA9IFtdO1xuICAgIH1cblxuICAgIEl0ZXJhdG9yU2VxLnByb3RvdHlwZS5fX2l0ZXJhdGVVbmNhY2hlZCA9IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0ZShmbiwgcmV2ZXJzZSk7XG4gICAgICB9XG4gICAgICB2YXIgaXRlcmF0b3IgPSB0aGlzLl9pdGVyYXRvcjtcbiAgICAgIHZhciBjYWNoZSA9IHRoaXMuX2l0ZXJhdG9yQ2FjaGU7XG4gICAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgICB3aGlsZSAoaXRlcmF0aW9ucyA8IGNhY2hlLmxlbmd0aCkge1xuICAgICAgICBpZiAoZm4oY2FjaGVbaXRlcmF0aW9uc10sIGl0ZXJhdGlvbnMrKywgdGhpcykgPT09IGZhbHNlKSB7XG4gICAgICAgICAgcmV0dXJuIGl0ZXJhdGlvbnM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciBzdGVwO1xuICAgICAgd2hpbGUgKCEoc3RlcCA9IGl0ZXJhdG9yLm5leHQoKSkuZG9uZSkge1xuICAgICAgICB2YXIgdmFsID0gc3RlcC52YWx1ZTtcbiAgICAgICAgY2FjaGVbaXRlcmF0aW9uc10gPSB2YWw7XG4gICAgICAgIGlmIChmbih2YWwsIGl0ZXJhdGlvbnMrKywgdGhpcykgPT09IGZhbHNlKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBpdGVyYXRpb25zO1xuICAgIH07XG5cbiAgICBJdGVyYXRvclNlcS5wcm90b3R5cGUuX19pdGVyYXRvclVuY2FjaGVkID0gZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgICAgaWYgKHJldmVyc2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpO1xuICAgICAgfVxuICAgICAgdmFyIGl0ZXJhdG9yID0gdGhpcy5faXRlcmF0b3I7XG4gICAgICB2YXIgY2FjaGUgPSB0aGlzLl9pdGVyYXRvckNhY2hlO1xuICAgICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgICAgcmV0dXJuIG5ldyBJdGVyYXRvcihmdW5jdGlvbigpICB7XG4gICAgICAgIGlmIChpdGVyYXRpb25zID49IGNhY2hlLmxlbmd0aCkge1xuICAgICAgICAgIHZhciBzdGVwID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICAgIGlmIChzdGVwLmRvbmUpIHtcbiAgICAgICAgICAgIHJldHVybiBzdGVwO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYWNoZVtpdGVyYXRpb25zXSA9IHN0ZXAudmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yVmFsdWUodHlwZSwgaXRlcmF0aW9ucywgY2FjaGVbaXRlcmF0aW9ucysrXSk7XG4gICAgICB9KTtcbiAgICB9O1xuXG5cblxuXG4gIC8vICMgcHJhZ21hIEhlbHBlciBmdW5jdGlvbnNcblxuICBmdW5jdGlvbiBpc1NlcShtYXliZVNlcSkge1xuICAgIHJldHVybiAhIShtYXliZVNlcSAmJiBtYXliZVNlcVtJU19TRVFfU0VOVElORUxdKTtcbiAgfVxuXG4gIHZhciBFTVBUWV9TRVE7XG5cbiAgZnVuY3Rpb24gZW1wdHlTZXF1ZW5jZSgpIHtcbiAgICByZXR1cm4gRU1QVFlfU0VRIHx8IChFTVBUWV9TRVEgPSBuZXcgQXJyYXlTZXEoW10pKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGtleWVkU2VxRnJvbVZhbHVlKHZhbHVlKSB7XG4gICAgdmFyIHNlcSA9XG4gICAgICBBcnJheS5pc0FycmF5KHZhbHVlKSA/IG5ldyBBcnJheVNlcSh2YWx1ZSkuZnJvbUVudHJ5U2VxKCkgOlxuICAgICAgaXNJdGVyYXRvcih2YWx1ZSkgPyBuZXcgSXRlcmF0b3JTZXEodmFsdWUpLmZyb21FbnRyeVNlcSgpIDpcbiAgICAgIGhhc0l0ZXJhdG9yKHZhbHVlKSA/IG5ldyBJdGVyYWJsZVNlcSh2YWx1ZSkuZnJvbUVudHJ5U2VxKCkgOlxuICAgICAgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyA/IG5ldyBPYmplY3RTZXEodmFsdWUpIDpcbiAgICAgIHVuZGVmaW5lZDtcbiAgICBpZiAoIXNlcSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgJ0V4cGVjdGVkIEFycmF5IG9yIGl0ZXJhYmxlIG9iamVjdCBvZiBbaywgdl0gZW50cmllcywgJytcbiAgICAgICAgJ29yIGtleWVkIG9iamVjdDogJyArIHZhbHVlXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gc2VxO1xuICB9XG5cbiAgZnVuY3Rpb24gaW5kZXhlZFNlcUZyb21WYWx1ZSh2YWx1ZSkge1xuICAgIHZhciBzZXEgPSBtYXliZUluZGV4ZWRTZXFGcm9tVmFsdWUodmFsdWUpO1xuICAgIGlmICghc2VxKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAnRXhwZWN0ZWQgQXJyYXkgb3IgaXRlcmFibGUgb2JqZWN0IG9mIHZhbHVlczogJyArIHZhbHVlXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gc2VxO1xuICB9XG5cbiAgZnVuY3Rpb24gc2VxRnJvbVZhbHVlKHZhbHVlKSB7XG4gICAgdmFyIHNlcSA9IG1heWJlSW5kZXhlZFNlcUZyb21WYWx1ZSh2YWx1ZSkgfHxcbiAgICAgICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIG5ldyBPYmplY3RTZXEodmFsdWUpKTtcbiAgICBpZiAoIXNlcSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgJ0V4cGVjdGVkIEFycmF5IG9yIGl0ZXJhYmxlIG9iamVjdCBvZiB2YWx1ZXMsIG9yIGtleWVkIG9iamVjdDogJyArIHZhbHVlXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gc2VxO1xuICB9XG5cbiAgZnVuY3Rpb24gbWF5YmVJbmRleGVkU2VxRnJvbVZhbHVlKHZhbHVlKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIGlzQXJyYXlMaWtlKHZhbHVlKSA/IG5ldyBBcnJheVNlcSh2YWx1ZSkgOlxuICAgICAgaXNJdGVyYXRvcih2YWx1ZSkgPyBuZXcgSXRlcmF0b3JTZXEodmFsdWUpIDpcbiAgICAgIGhhc0l0ZXJhdG9yKHZhbHVlKSA/IG5ldyBJdGVyYWJsZVNlcSh2YWx1ZSkgOlxuICAgICAgdW5kZWZpbmVkXG4gICAgKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNlcUl0ZXJhdGUoc2VxLCBmbiwgcmV2ZXJzZSwgdXNlS2V5cykge1xuICAgIHZhciBjYWNoZSA9IHNlcS5fY2FjaGU7XG4gICAgaWYgKGNhY2hlKSB7XG4gICAgICB2YXIgbWF4SW5kZXggPSBjYWNoZS5sZW5ndGggLSAxO1xuICAgICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8PSBtYXhJbmRleDsgaWkrKykge1xuICAgICAgICB2YXIgZW50cnkgPSBjYWNoZVtyZXZlcnNlID8gbWF4SW5kZXggLSBpaSA6IGlpXTtcbiAgICAgICAgaWYgKGZuKGVudHJ5WzFdLCB1c2VLZXlzID8gZW50cnlbMF0gOiBpaSwgc2VxKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICByZXR1cm4gaWkgKyAxO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaWk7XG4gICAgfVxuICAgIHJldHVybiBzZXEuX19pdGVyYXRlVW5jYWNoZWQoZm4sIHJldmVyc2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2VxSXRlcmF0b3Ioc2VxLCB0eXBlLCByZXZlcnNlLCB1c2VLZXlzKSB7XG4gICAgdmFyIGNhY2hlID0gc2VxLl9jYWNoZTtcbiAgICBpZiAoY2FjaGUpIHtcbiAgICAgIHZhciBtYXhJbmRleCA9IGNhY2hlLmxlbmd0aCAtIDE7XG4gICAgICB2YXIgaWkgPSAwO1xuICAgICAgcmV0dXJuIG5ldyBJdGVyYXRvcihmdW5jdGlvbigpICB7XG4gICAgICAgIHZhciBlbnRyeSA9IGNhY2hlW3JldmVyc2UgPyBtYXhJbmRleCAtIGlpIDogaWldO1xuICAgICAgICByZXR1cm4gaWkrKyA+IG1heEluZGV4ID9cbiAgICAgICAgICBpdGVyYXRvckRvbmUoKSA6XG4gICAgICAgICAgaXRlcmF0b3JWYWx1ZSh0eXBlLCB1c2VLZXlzID8gZW50cnlbMF0gOiBpaSAtIDEsIGVudHJ5WzFdKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gc2VxLl9faXRlcmF0b3JVbmNhY2hlZCh0eXBlLCByZXZlcnNlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZyb21KUyhqc29uLCBjb252ZXJ0ZXIpIHtcbiAgICByZXR1cm4gY29udmVydGVyID9cbiAgICAgIGZyb21KU1dpdGgoY29udmVydGVyLCBqc29uLCAnJywgeycnOiBqc29ufSkgOlxuICAgICAgZnJvbUpTRGVmYXVsdChqc29uKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZyb21KU1dpdGgoY29udmVydGVyLCBqc29uLCBrZXksIHBhcmVudEpTT04pIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShqc29uKSkge1xuICAgICAgcmV0dXJuIGNvbnZlcnRlci5jYWxsKHBhcmVudEpTT04sIGtleSwgSW5kZXhlZFNlcShqc29uKS5tYXAoZnVuY3Rpb24odiwgaykgIHtyZXR1cm4gZnJvbUpTV2l0aChjb252ZXJ0ZXIsIHYsIGssIGpzb24pfSkpO1xuICAgIH1cbiAgICBpZiAoaXNQbGFpbk9iaihqc29uKSkge1xuICAgICAgcmV0dXJuIGNvbnZlcnRlci5jYWxsKHBhcmVudEpTT04sIGtleSwgS2V5ZWRTZXEoanNvbikubWFwKGZ1bmN0aW9uKHYsIGspICB7cmV0dXJuIGZyb21KU1dpdGgoY29udmVydGVyLCB2LCBrLCBqc29uKX0pKTtcbiAgICB9XG4gICAgcmV0dXJuIGpzb247XG4gIH1cblxuICBmdW5jdGlvbiBmcm9tSlNEZWZhdWx0KGpzb24pIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShqc29uKSkge1xuICAgICAgcmV0dXJuIEluZGV4ZWRTZXEoanNvbikubWFwKGZyb21KU0RlZmF1bHQpLnRvTGlzdCgpO1xuICAgIH1cbiAgICBpZiAoaXNQbGFpbk9iaihqc29uKSkge1xuICAgICAgcmV0dXJuIEtleWVkU2VxKGpzb24pLm1hcChmcm9tSlNEZWZhdWx0KS50b01hcCgpO1xuICAgIH1cbiAgICByZXR1cm4ganNvbjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzUGxhaW5PYmoodmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUgJiYgKHZhbHVlLmNvbnN0cnVjdG9yID09PSBPYmplY3QgfHwgdmFsdWUuY29uc3RydWN0b3IgPT09IHVuZGVmaW5lZCk7XG4gIH1cblxuICAvKipcbiAgICogQW4gZXh0ZW5zaW9uIG9mIHRoZSBcInNhbWUtdmFsdWVcIiBhbGdvcml0aG0gYXMgW2Rlc2NyaWJlZCBmb3IgdXNlIGJ5IEVTNiBNYXBcbiAgICogYW5kIFNldF0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvTWFwI0tleV9lcXVhbGl0eSlcbiAgICpcbiAgICogTmFOIGlzIGNvbnNpZGVyZWQgdGhlIHNhbWUgYXMgTmFOLCBob3dldmVyIC0wIGFuZCAwIGFyZSBjb25zaWRlcmVkIHRoZSBzYW1lXG4gICAqIHZhbHVlLCB3aGljaCBpcyBkaWZmZXJlbnQgZnJvbSB0aGUgYWxnb3JpdGhtIGRlc2NyaWJlZCBieVxuICAgKiBbYE9iamVjdC5pc2BdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL09iamVjdC9pcykuXG4gICAqXG4gICAqIFRoaXMgaXMgZXh0ZW5kZWQgZnVydGhlciB0byBhbGxvdyBPYmplY3RzIHRvIGRlc2NyaWJlIHRoZSB2YWx1ZXMgdGhleVxuICAgKiByZXByZXNlbnQsIGJ5IHdheSBvZiBgdmFsdWVPZmAgb3IgYGVxdWFsc2AgKGFuZCBgaGFzaENvZGVgKS5cbiAgICpcbiAgICogTm90ZTogYmVjYXVzZSBvZiB0aGlzIGV4dGVuc2lvbiwgdGhlIGtleSBlcXVhbGl0eSBvZiBJbW11dGFibGUuTWFwIGFuZCB0aGVcbiAgICogdmFsdWUgZXF1YWxpdHkgb2YgSW1tdXRhYmxlLlNldCB3aWxsIGRpZmZlciBmcm9tIEVTNiBNYXAgYW5kIFNldC5cbiAgICpcbiAgICogIyMjIERlZmluaW5nIGN1c3RvbSB2YWx1ZXNcbiAgICpcbiAgICogVGhlIGVhc2llc3Qgd2F5IHRvIGRlc2NyaWJlIHRoZSB2YWx1ZSBhbiBvYmplY3QgcmVwcmVzZW50cyBpcyBieSBpbXBsZW1lbnRpbmdcbiAgICogYHZhbHVlT2ZgLiBGb3IgZXhhbXBsZSwgYERhdGVgIHJlcHJlc2VudHMgYSB2YWx1ZSBieSByZXR1cm5pbmcgYSB1bml4XG4gICAqIHRpbWVzdGFtcCBmb3IgYHZhbHVlT2ZgOlxuICAgKlxuICAgKiAgICAgdmFyIGRhdGUxID0gbmV3IERhdGUoMTIzNDU2Nzg5MDAwMCk7IC8vIEZyaSBGZWIgMTMgMjAwOSAuLi5cbiAgICogICAgIHZhciBkYXRlMiA9IG5ldyBEYXRlKDEyMzQ1Njc4OTAwMDApO1xuICAgKiAgICAgZGF0ZTEudmFsdWVPZigpOyAvLyAxMjM0NTY3ODkwMDAwXG4gICAqICAgICBhc3NlcnQoIGRhdGUxICE9PSBkYXRlMiApO1xuICAgKiAgICAgYXNzZXJ0KCBJbW11dGFibGUuaXMoIGRhdGUxLCBkYXRlMiApICk7XG4gICAqXG4gICAqIE5vdGU6IG92ZXJyaWRpbmcgYHZhbHVlT2ZgIG1heSBoYXZlIG90aGVyIGltcGxpY2F0aW9ucyBpZiB5b3UgdXNlIHRoaXMgb2JqZWN0XG4gICAqIHdoZXJlIEphdmFTY3JpcHQgZXhwZWN0cyBhIHByaW1pdGl2ZSwgc3VjaCBhcyBpbXBsaWNpdCBzdHJpbmcgY29lcmNpb24uXG4gICAqXG4gICAqIEZvciBtb3JlIGNvbXBsZXggdHlwZXMsIGVzcGVjaWFsbHkgY29sbGVjdGlvbnMsIGltcGxlbWVudGluZyBgdmFsdWVPZmAgbWF5XG4gICAqIG5vdCBiZSBwZXJmb3JtYW50LiBBbiBhbHRlcm5hdGl2ZSBpcyB0byBpbXBsZW1lbnQgYGVxdWFsc2AgYW5kIGBoYXNoQ29kZWAuXG4gICAqXG4gICAqIGBlcXVhbHNgIHRha2VzIGFub3RoZXIgb2JqZWN0LCBwcmVzdW1hYmx5IG9mIHNpbWlsYXIgdHlwZSwgYW5kIHJldHVybnMgdHJ1ZVxuICAgKiBpZiB0aGUgaXQgaXMgZXF1YWwuIEVxdWFsaXR5IGlzIHN5bW1ldHJpY2FsLCBzbyB0aGUgc2FtZSByZXN1bHQgc2hvdWxkIGJlXG4gICAqIHJldHVybmVkIGlmIHRoaXMgYW5kIHRoZSBhcmd1bWVudCBhcmUgZmxpcHBlZC5cbiAgICpcbiAgICogICAgIGFzc2VydCggYS5lcXVhbHMoYikgPT09IGIuZXF1YWxzKGEpICk7XG4gICAqXG4gICAqIGBoYXNoQ29kZWAgcmV0dXJucyBhIDMyYml0IGludGVnZXIgbnVtYmVyIHJlcHJlc2VudGluZyB0aGUgb2JqZWN0IHdoaWNoIHdpbGxcbiAgICogYmUgdXNlZCB0byBkZXRlcm1pbmUgaG93IHRvIHN0b3JlIHRoZSB2YWx1ZSBvYmplY3QgaW4gYSBNYXAgb3IgU2V0LiBZb3UgbXVzdFxuICAgKiBwcm92aWRlIGJvdGggb3IgbmVpdGhlciBtZXRob2RzLCBvbmUgbXVzdCBub3QgZXhpc3Qgd2l0aG91dCB0aGUgb3RoZXIuXG4gICAqXG4gICAqIEFsc28sIGFuIGltcG9ydGFudCByZWxhdGlvbnNoaXAgYmV0d2VlbiB0aGVzZSBtZXRob2RzIG11c3QgYmUgdXBoZWxkOiBpZiB0d29cbiAgICogdmFsdWVzIGFyZSBlcXVhbCwgdGhleSAqbXVzdCogcmV0dXJuIHRoZSBzYW1lIGhhc2hDb2RlLiBJZiB0aGUgdmFsdWVzIGFyZSBub3RcbiAgICogZXF1YWwsIHRoZXkgbWlnaHQgaGF2ZSB0aGUgc2FtZSBoYXNoQ29kZTsgdGhpcyBpcyBjYWxsZWQgYSBoYXNoIGNvbGxpc2lvbixcbiAgICogYW5kIHdoaWxlIHVuZGVzaXJhYmxlIGZvciBwZXJmb3JtYW5jZSByZWFzb25zLCBpdCBpcyBhY2NlcHRhYmxlLlxuICAgKlxuICAgKiAgICAgaWYgKGEuZXF1YWxzKGIpKSB7XG4gICAqICAgICAgIGFzc2VydCggYS5oYXNoQ29kZSgpID09PSBiLmhhc2hDb2RlKCkgKTtcbiAgICogICAgIH1cbiAgICpcbiAgICogQWxsIEltbXV0YWJsZSBjb2xsZWN0aW9ucyBpbXBsZW1lbnQgYGVxdWFsc2AgYW5kIGBoYXNoQ29kZWAuXG4gICAqXG4gICAqL1xuICBmdW5jdGlvbiBpcyh2YWx1ZUEsIHZhbHVlQikge1xuICAgIGlmICh2YWx1ZUEgPT09IHZhbHVlQiB8fCAodmFsdWVBICE9PSB2YWx1ZUEgJiYgdmFsdWVCICE9PSB2YWx1ZUIpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKCF2YWx1ZUEgfHwgIXZhbHVlQikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHZhbHVlQS52YWx1ZU9mID09PSAnZnVuY3Rpb24nICYmXG4gICAgICAgIHR5cGVvZiB2YWx1ZUIudmFsdWVPZiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdmFsdWVBID0gdmFsdWVBLnZhbHVlT2YoKTtcbiAgICAgIHZhbHVlQiA9IHZhbHVlQi52YWx1ZU9mKCk7XG4gICAgICBpZiAodmFsdWVBID09PSB2YWx1ZUIgfHwgKHZhbHVlQSAhPT0gdmFsdWVBICYmIHZhbHVlQiAhPT0gdmFsdWVCKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIGlmICghdmFsdWVBIHx8ICF2YWx1ZUIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAodHlwZW9mIHZhbHVlQS5lcXVhbHMgPT09ICdmdW5jdGlvbicgJiZcbiAgICAgICAgdHlwZW9mIHZhbHVlQi5lcXVhbHMgPT09ICdmdW5jdGlvbicgJiZcbiAgICAgICAgdmFsdWVBLmVxdWFscyh2YWx1ZUIpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVlcEVxdWFsKGEsIGIpIHtcbiAgICBpZiAoYSA9PT0gYikge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKFxuICAgICAgIWlzSXRlcmFibGUoYikgfHxcbiAgICAgIGEuc2l6ZSAhPT0gdW5kZWZpbmVkICYmIGIuc2l6ZSAhPT0gdW5kZWZpbmVkICYmIGEuc2l6ZSAhPT0gYi5zaXplIHx8XG4gICAgICBhLl9faGFzaCAhPT0gdW5kZWZpbmVkICYmIGIuX19oYXNoICE9PSB1bmRlZmluZWQgJiYgYS5fX2hhc2ggIT09IGIuX19oYXNoIHx8XG4gICAgICBpc0tleWVkKGEpICE9PSBpc0tleWVkKGIpIHx8XG4gICAgICBpc0luZGV4ZWQoYSkgIT09IGlzSW5kZXhlZChiKSB8fFxuICAgICAgaXNPcmRlcmVkKGEpICE9PSBpc09yZGVyZWQoYilcbiAgICApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoYS5zaXplID09PSAwICYmIGIuc2l6ZSA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgdmFyIG5vdEFzc29jaWF0aXZlID0gIWlzQXNzb2NpYXRpdmUoYSk7XG5cbiAgICBpZiAoaXNPcmRlcmVkKGEpKSB7XG4gICAgICB2YXIgZW50cmllcyA9IGEuZW50cmllcygpO1xuICAgICAgcmV0dXJuIGIuZXZlcnkoZnVuY3Rpb24odiwgaykgIHtcbiAgICAgICAgdmFyIGVudHJ5ID0gZW50cmllcy5uZXh0KCkudmFsdWU7XG4gICAgICAgIHJldHVybiBlbnRyeSAmJiBpcyhlbnRyeVsxXSwgdikgJiYgKG5vdEFzc29jaWF0aXZlIHx8IGlzKGVudHJ5WzBdLCBrKSk7XG4gICAgICB9KSAmJiBlbnRyaWVzLm5leHQoKS5kb25lO1xuICAgIH1cblxuICAgIHZhciBmbGlwcGVkID0gZmFsc2U7XG5cbiAgICBpZiAoYS5zaXplID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmIChiLnNpemUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGEuY2FjaGVSZXN1bHQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBhLmNhY2hlUmVzdWx0KCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZsaXBwZWQgPSB0cnVlO1xuICAgICAgICB2YXIgXyA9IGE7XG4gICAgICAgIGEgPSBiO1xuICAgICAgICBiID0gXztcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgYWxsRXF1YWwgPSB0cnVlO1xuICAgIHZhciBiU2l6ZSA9IGIuX19pdGVyYXRlKGZ1bmN0aW9uKHYsIGspICB7XG4gICAgICBpZiAobm90QXNzb2NpYXRpdmUgPyAhYS5oYXModikgOlxuICAgICAgICAgIGZsaXBwZWQgPyAhaXModiwgYS5nZXQoaywgTk9UX1NFVCkpIDogIWlzKGEuZ2V0KGssIE5PVF9TRVQpLCB2KSkge1xuICAgICAgICBhbGxFcXVhbCA9IGZhbHNlO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gYWxsRXF1YWwgJiYgYS5zaXplID09PSBiU2l6ZTtcbiAgfVxuXG4gIGNyZWF0ZUNsYXNzKFJlcGVhdCwgSW5kZXhlZFNlcSk7XG5cbiAgICBmdW5jdGlvbiBSZXBlYXQodmFsdWUsIHRpbWVzKSB7XG4gICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUmVwZWF0KSkge1xuICAgICAgICByZXR1cm4gbmV3IFJlcGVhdCh2YWx1ZSwgdGltZXMpO1xuICAgICAgfVxuICAgICAgdGhpcy5fdmFsdWUgPSB2YWx1ZTtcbiAgICAgIHRoaXMuc2l6ZSA9IHRpbWVzID09PSB1bmRlZmluZWQgPyBJbmZpbml0eSA6IE1hdGgubWF4KDAsIHRpbWVzKTtcbiAgICAgIGlmICh0aGlzLnNpemUgPT09IDApIHtcbiAgICAgICAgaWYgKEVNUFRZX1JFUEVBVCkge1xuICAgICAgICAgIHJldHVybiBFTVBUWV9SRVBFQVQ7XG4gICAgICAgIH1cbiAgICAgICAgRU1QVFlfUkVQRUFUID0gdGhpcztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBSZXBlYXQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5zaXplID09PSAwKSB7XG4gICAgICAgIHJldHVybiAnUmVwZWF0IFtdJztcbiAgICAgIH1cbiAgICAgIHJldHVybiAnUmVwZWF0IFsgJyArIHRoaXMuX3ZhbHVlICsgJyAnICsgdGhpcy5zaXplICsgJyB0aW1lcyBdJztcbiAgICB9O1xuXG4gICAgUmVwZWF0LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihpbmRleCwgbm90U2V0VmFsdWUpIHtcbiAgICAgIHJldHVybiB0aGlzLmhhcyhpbmRleCkgPyB0aGlzLl92YWx1ZSA6IG5vdFNldFZhbHVlO1xuICAgIH07XG5cbiAgICBSZXBlYXQucHJvdG90eXBlLmluY2x1ZGVzID0gZnVuY3Rpb24oc2VhcmNoVmFsdWUpIHtcbiAgICAgIHJldHVybiBpcyh0aGlzLl92YWx1ZSwgc2VhcmNoVmFsdWUpO1xuICAgIH07XG5cbiAgICBSZXBlYXQucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24oYmVnaW4sIGVuZCkge1xuICAgICAgdmFyIHNpemUgPSB0aGlzLnNpemU7XG4gICAgICByZXR1cm4gd2hvbGVTbGljZShiZWdpbiwgZW5kLCBzaXplKSA/IHRoaXMgOlxuICAgICAgICBuZXcgUmVwZWF0KHRoaXMuX3ZhbHVlLCByZXNvbHZlRW5kKGVuZCwgc2l6ZSkgLSByZXNvbHZlQmVnaW4oYmVnaW4sIHNpemUpKTtcbiAgICB9O1xuXG4gICAgUmVwZWF0LnByb3RvdHlwZS5yZXZlcnNlID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgUmVwZWF0LnByb3RvdHlwZS5pbmRleE9mID0gZnVuY3Rpb24oc2VhcmNoVmFsdWUpIHtcbiAgICAgIGlmIChpcyh0aGlzLl92YWx1ZSwgc2VhcmNoVmFsdWUpKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfVxuICAgICAgcmV0dXJuIC0xO1xuICAgIH07XG5cbiAgICBSZXBlYXQucHJvdG90eXBlLmxhc3RJbmRleE9mID0gZnVuY3Rpb24oc2VhcmNoVmFsdWUpIHtcbiAgICAgIGlmIChpcyh0aGlzLl92YWx1ZSwgc2VhcmNoVmFsdWUpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNpemU7XG4gICAgICB9XG4gICAgICByZXR1cm4gLTE7XG4gICAgfTtcblxuICAgIFJlcGVhdC5wcm90b3R5cGUuX19pdGVyYXRlID0gZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCB0aGlzLnNpemU7IGlpKyspIHtcbiAgICAgICAgaWYgKGZuKHRoaXMuX3ZhbHVlLCBpaSwgdGhpcykgPT09IGZhbHNlKSB7XG4gICAgICAgICAgcmV0dXJuIGlpICsgMTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGlpO1xuICAgIH07XG5cbiAgICBSZXBlYXQucHJvdG90eXBlLl9faXRlcmF0b3IgPSBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7dmFyIHRoaXMkMCA9IHRoaXM7XG4gICAgICB2YXIgaWkgPSAwO1xuICAgICAgcmV0dXJuIG5ldyBJdGVyYXRvcihmdW5jdGlvbigpIFxuICAgICAgICB7cmV0dXJuIGlpIDwgdGhpcyQwLnNpemUgPyBpdGVyYXRvclZhbHVlKHR5cGUsIGlpKyssIHRoaXMkMC5fdmFsdWUpIDogaXRlcmF0b3JEb25lKCl9XG4gICAgICApO1xuICAgIH07XG5cbiAgICBSZXBlYXQucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgICByZXR1cm4gb3RoZXIgaW5zdGFuY2VvZiBSZXBlYXQgP1xuICAgICAgICBpcyh0aGlzLl92YWx1ZSwgb3RoZXIuX3ZhbHVlKSA6XG4gICAgICAgIGRlZXBFcXVhbChvdGhlcik7XG4gICAgfTtcblxuXG4gIHZhciBFTVBUWV9SRVBFQVQ7XG5cbiAgZnVuY3Rpb24gaW52YXJpYW50KGNvbmRpdGlvbiwgZXJyb3IpIHtcbiAgICBpZiAoIWNvbmRpdGlvbikgdGhyb3cgbmV3IEVycm9yKGVycm9yKTtcbiAgfVxuXG4gIGNyZWF0ZUNsYXNzKFJhbmdlLCBJbmRleGVkU2VxKTtcblxuICAgIGZ1bmN0aW9uIFJhbmdlKHN0YXJ0LCBlbmQsIHN0ZXApIHtcbiAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBSYW5nZSkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBSYW5nZShzdGFydCwgZW5kLCBzdGVwKTtcbiAgICAgIH1cbiAgICAgIGludmFyaWFudChzdGVwICE9PSAwLCAnQ2Fubm90IHN0ZXAgYSBSYW5nZSBieSAwJyk7XG4gICAgICBzdGFydCA9IHN0YXJ0IHx8IDA7XG4gICAgICBpZiAoZW5kID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZW5kID0gSW5maW5pdHk7XG4gICAgICB9XG4gICAgICBzdGVwID0gc3RlcCA9PT0gdW5kZWZpbmVkID8gMSA6IE1hdGguYWJzKHN0ZXApO1xuICAgICAgaWYgKGVuZCA8IHN0YXJ0KSB7XG4gICAgICAgIHN0ZXAgPSAtc3RlcDtcbiAgICAgIH1cbiAgICAgIHRoaXMuX3N0YXJ0ID0gc3RhcnQ7XG4gICAgICB0aGlzLl9lbmQgPSBlbmQ7XG4gICAgICB0aGlzLl9zdGVwID0gc3RlcDtcbiAgICAgIHRoaXMuc2l6ZSA9IE1hdGgubWF4KDAsIE1hdGguY2VpbCgoZW5kIC0gc3RhcnQpIC8gc3RlcCAtIDEpICsgMSk7XG4gICAgICBpZiAodGhpcy5zaXplID09PSAwKSB7XG4gICAgICAgIGlmIChFTVBUWV9SQU5HRSkge1xuICAgICAgICAgIHJldHVybiBFTVBUWV9SQU5HRTtcbiAgICAgICAgfVxuICAgICAgICBFTVBUWV9SQU5HRSA9IHRoaXM7XG4gICAgICB9XG4gICAgfVxuXG4gICAgUmFuZ2UucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5zaXplID09PSAwKSB7XG4gICAgICAgIHJldHVybiAnUmFuZ2UgW10nO1xuICAgICAgfVxuICAgICAgcmV0dXJuICdSYW5nZSBbICcgK1xuICAgICAgICB0aGlzLl9zdGFydCArICcuLi4nICsgdGhpcy5fZW5kICtcbiAgICAgICAgKHRoaXMuX3N0ZXAgIT09IDEgPyAnIGJ5ICcgKyB0aGlzLl9zdGVwIDogJycpICtcbiAgICAgICcgXSc7XG4gICAgfTtcblxuICAgIFJhbmdlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihpbmRleCwgbm90U2V0VmFsdWUpIHtcbiAgICAgIHJldHVybiB0aGlzLmhhcyhpbmRleCkgP1xuICAgICAgICB0aGlzLl9zdGFydCArIHdyYXBJbmRleCh0aGlzLCBpbmRleCkgKiB0aGlzLl9zdGVwIDpcbiAgICAgICAgbm90U2V0VmFsdWU7XG4gICAgfTtcblxuICAgIFJhbmdlLnByb3RvdHlwZS5pbmNsdWRlcyA9IGZ1bmN0aW9uKHNlYXJjaFZhbHVlKSB7XG4gICAgICB2YXIgcG9zc2libGVJbmRleCA9IChzZWFyY2hWYWx1ZSAtIHRoaXMuX3N0YXJ0KSAvIHRoaXMuX3N0ZXA7XG4gICAgICByZXR1cm4gcG9zc2libGVJbmRleCA+PSAwICYmXG4gICAgICAgIHBvc3NpYmxlSW5kZXggPCB0aGlzLnNpemUgJiZcbiAgICAgICAgcG9zc2libGVJbmRleCA9PT0gTWF0aC5mbG9vcihwb3NzaWJsZUluZGV4KTtcbiAgICB9O1xuXG4gICAgUmFuZ2UucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24oYmVnaW4sIGVuZCkge1xuICAgICAgaWYgKHdob2xlU2xpY2UoYmVnaW4sIGVuZCwgdGhpcy5zaXplKSkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIGJlZ2luID0gcmVzb2x2ZUJlZ2luKGJlZ2luLCB0aGlzLnNpemUpO1xuICAgICAgZW5kID0gcmVzb2x2ZUVuZChlbmQsIHRoaXMuc2l6ZSk7XG4gICAgICBpZiAoZW5kIDw9IGJlZ2luKSB7XG4gICAgICAgIHJldHVybiBuZXcgUmFuZ2UoMCwgMCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IFJhbmdlKHRoaXMuZ2V0KGJlZ2luLCB0aGlzLl9lbmQpLCB0aGlzLmdldChlbmQsIHRoaXMuX2VuZCksIHRoaXMuX3N0ZXApO1xuICAgIH07XG5cbiAgICBSYW5nZS5wcm90b3R5cGUuaW5kZXhPZiA9IGZ1bmN0aW9uKHNlYXJjaFZhbHVlKSB7XG4gICAgICB2YXIgb2Zmc2V0VmFsdWUgPSBzZWFyY2hWYWx1ZSAtIHRoaXMuX3N0YXJ0O1xuICAgICAgaWYgKG9mZnNldFZhbHVlICUgdGhpcy5fc3RlcCA9PT0gMCkge1xuICAgICAgICB2YXIgaW5kZXggPSBvZmZzZXRWYWx1ZSAvIHRoaXMuX3N0ZXA7XG4gICAgICAgIGlmIChpbmRleCA+PSAwICYmIGluZGV4IDwgdGhpcy5zaXplKSB7XG4gICAgICAgICAgcmV0dXJuIGluZGV4XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiAtMTtcbiAgICB9O1xuXG4gICAgUmFuZ2UucHJvdG90eXBlLmxhc3RJbmRleE9mID0gZnVuY3Rpb24oc2VhcmNoVmFsdWUpIHtcbiAgICAgIHJldHVybiB0aGlzLmluZGV4T2Yoc2VhcmNoVmFsdWUpO1xuICAgIH07XG5cbiAgICBSYW5nZS5wcm90b3R5cGUuX19pdGVyYXRlID0gZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICAgIHZhciBtYXhJbmRleCA9IHRoaXMuc2l6ZSAtIDE7XG4gICAgICB2YXIgc3RlcCA9IHRoaXMuX3N0ZXA7XG4gICAgICB2YXIgdmFsdWUgPSByZXZlcnNlID8gdGhpcy5fc3RhcnQgKyBtYXhJbmRleCAqIHN0ZXAgOiB0aGlzLl9zdGFydDtcbiAgICAgIGZvciAodmFyIGlpID0gMDsgaWkgPD0gbWF4SW5kZXg7IGlpKyspIHtcbiAgICAgICAgaWYgKGZuKHZhbHVlLCBpaSwgdGhpcykgPT09IGZhbHNlKSB7XG4gICAgICAgICAgcmV0dXJuIGlpICsgMTtcbiAgICAgICAgfVxuICAgICAgICB2YWx1ZSArPSByZXZlcnNlID8gLXN0ZXAgOiBzdGVwO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGlpO1xuICAgIH07XG5cbiAgICBSYW5nZS5wcm90b3R5cGUuX19pdGVyYXRvciA9IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICAgIHZhciBtYXhJbmRleCA9IHRoaXMuc2l6ZSAtIDE7XG4gICAgICB2YXIgc3RlcCA9IHRoaXMuX3N0ZXA7XG4gICAgICB2YXIgdmFsdWUgPSByZXZlcnNlID8gdGhpcy5fc3RhcnQgKyBtYXhJbmRleCAqIHN0ZXAgOiB0aGlzLl9zdGFydDtcbiAgICAgIHZhciBpaSA9IDA7XG4gICAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKGZ1bmN0aW9uKCkgIHtcbiAgICAgICAgdmFyIHYgPSB2YWx1ZTtcbiAgICAgICAgdmFsdWUgKz0gcmV2ZXJzZSA/IC1zdGVwIDogc3RlcDtcbiAgICAgICAgcmV0dXJuIGlpID4gbWF4SW5kZXggPyBpdGVyYXRvckRvbmUoKSA6IGl0ZXJhdG9yVmFsdWUodHlwZSwgaWkrKywgdik7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgUmFuZ2UucHJvdG90eXBlLmVxdWFscyA9IGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgICByZXR1cm4gb3RoZXIgaW5zdGFuY2VvZiBSYW5nZSA/XG4gICAgICAgIHRoaXMuX3N0YXJ0ID09PSBvdGhlci5fc3RhcnQgJiZcbiAgICAgICAgdGhpcy5fZW5kID09PSBvdGhlci5fZW5kICYmXG4gICAgICAgIHRoaXMuX3N0ZXAgPT09IG90aGVyLl9zdGVwIDpcbiAgICAgICAgZGVlcEVxdWFsKHRoaXMsIG90aGVyKTtcbiAgICB9O1xuXG5cbiAgdmFyIEVNUFRZX1JBTkdFO1xuXG4gIGNyZWF0ZUNsYXNzKENvbGxlY3Rpb24sIEl0ZXJhYmxlKTtcbiAgICBmdW5jdGlvbiBDb2xsZWN0aW9uKCkge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCdBYnN0cmFjdCcpO1xuICAgIH1cblxuXG4gIGNyZWF0ZUNsYXNzKEtleWVkQ29sbGVjdGlvbiwgQ29sbGVjdGlvbik7ZnVuY3Rpb24gS2V5ZWRDb2xsZWN0aW9uKCkge31cblxuICBjcmVhdGVDbGFzcyhJbmRleGVkQ29sbGVjdGlvbiwgQ29sbGVjdGlvbik7ZnVuY3Rpb24gSW5kZXhlZENvbGxlY3Rpb24oKSB7fVxuXG4gIGNyZWF0ZUNsYXNzKFNldENvbGxlY3Rpb24sIENvbGxlY3Rpb24pO2Z1bmN0aW9uIFNldENvbGxlY3Rpb24oKSB7fVxuXG5cbiAgQ29sbGVjdGlvbi5LZXllZCA9IEtleWVkQ29sbGVjdGlvbjtcbiAgQ29sbGVjdGlvbi5JbmRleGVkID0gSW5kZXhlZENvbGxlY3Rpb247XG4gIENvbGxlY3Rpb24uU2V0ID0gU2V0Q29sbGVjdGlvbjtcblxuICB2YXIgaW11bCA9XG4gICAgdHlwZW9mIE1hdGguaW11bCA9PT0gJ2Z1bmN0aW9uJyAmJiBNYXRoLmltdWwoMHhmZmZmZmZmZiwgMikgPT09IC0yID9cbiAgICBNYXRoLmltdWwgOlxuICAgIGZ1bmN0aW9uIGltdWwoYSwgYikge1xuICAgICAgYSA9IGEgfCAwOyAvLyBpbnRcbiAgICAgIGIgPSBiIHwgMDsgLy8gaW50XG4gICAgICB2YXIgYyA9IGEgJiAweGZmZmY7XG4gICAgICB2YXIgZCA9IGIgJiAweGZmZmY7XG4gICAgICAvLyBTaGlmdCBieSAwIGZpeGVzIHRoZSBzaWduIG9uIHRoZSBoaWdoIHBhcnQuXG4gICAgICByZXR1cm4gKGMgKiBkKSArICgoKChhID4+PiAxNikgKiBkICsgYyAqIChiID4+PiAxNikpIDw8IDE2KSA+Pj4gMCkgfCAwOyAvLyBpbnRcbiAgICB9O1xuXG4gIC8vIHY4IGhhcyBhbiBvcHRpbWl6YXRpb24gZm9yIHN0b3JpbmcgMzEtYml0IHNpZ25lZCBudW1iZXJzLlxuICAvLyBWYWx1ZXMgd2hpY2ggaGF2ZSBlaXRoZXIgMDAgb3IgMTEgYXMgdGhlIGhpZ2ggb3JkZXIgYml0cyBxdWFsaWZ5LlxuICAvLyBUaGlzIGZ1bmN0aW9uIGRyb3BzIHRoZSBoaWdoZXN0IG9yZGVyIGJpdCBpbiBhIHNpZ25lZCBudW1iZXIsIG1haW50YWluaW5nXG4gIC8vIHRoZSBzaWduIGJpdC5cbiAgZnVuY3Rpb24gc21pKGkzMikge1xuICAgIHJldHVybiAoKGkzMiA+Pj4gMSkgJiAweDQwMDAwMDAwKSB8IChpMzIgJiAweEJGRkZGRkZGKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhc2gobykge1xuICAgIGlmIChvID09PSBmYWxzZSB8fCBvID09PSBudWxsIHx8IG8gPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIDA7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygby52YWx1ZU9mID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBvID0gby52YWx1ZU9mKCk7XG4gICAgICBpZiAobyA9PT0gZmFsc2UgfHwgbyA9PT0gbnVsbCB8fCBvID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChvID09PSB0cnVlKSB7XG4gICAgICByZXR1cm4gMTtcbiAgICB9XG4gICAgdmFyIHR5cGUgPSB0eXBlb2YgbztcbiAgICBpZiAodHlwZSA9PT0gJ251bWJlcicpIHtcbiAgICAgIGlmIChvICE9PSBvIHx8IG8gPT09IEluZmluaXR5KSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfVxuICAgICAgdmFyIGggPSBvIHwgMDtcbiAgICAgIGlmIChoICE9PSBvKSB7XG4gICAgICAgIGggXj0gbyAqIDB4RkZGRkZGRkY7XG4gICAgICB9XG4gICAgICB3aGlsZSAobyA+IDB4RkZGRkZGRkYpIHtcbiAgICAgICAgbyAvPSAweEZGRkZGRkZGO1xuICAgICAgICBoIF49IG87XG4gICAgICB9XG4gICAgICByZXR1cm4gc21pKGgpO1xuICAgIH1cbiAgICBpZiAodHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiBvLmxlbmd0aCA+IFNUUklOR19IQVNIX0NBQ0hFX01JTl9TVFJMRU4gPyBjYWNoZWRIYXNoU3RyaW5nKG8pIDogaGFzaFN0cmluZyhvKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBvLmhhc2hDb2RlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gby5oYXNoQ29kZSgpO1xuICAgIH1cbiAgICBpZiAodHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiBoYXNoSlNPYmoobyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygby50b1N0cmluZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgcmV0dXJuIGhhc2hTdHJpbmcoby50b1N0cmluZygpKTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKCdWYWx1ZSB0eXBlICcgKyB0eXBlICsgJyBjYW5ub3QgYmUgaGFzaGVkLicpO1xuICB9XG5cbiAgZnVuY3Rpb24gY2FjaGVkSGFzaFN0cmluZyhzdHJpbmcpIHtcbiAgICB2YXIgaGFzaCA9IHN0cmluZ0hhc2hDYWNoZVtzdHJpbmddO1xuICAgIGlmIChoYXNoID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGhhc2ggPSBoYXNoU3RyaW5nKHN0cmluZyk7XG4gICAgICBpZiAoU1RSSU5HX0hBU0hfQ0FDSEVfU0laRSA9PT0gU1RSSU5HX0hBU0hfQ0FDSEVfTUFYX1NJWkUpIHtcbiAgICAgICAgU1RSSU5HX0hBU0hfQ0FDSEVfU0laRSA9IDA7XG4gICAgICAgIHN0cmluZ0hhc2hDYWNoZSA9IHt9O1xuICAgICAgfVxuICAgICAgU1RSSU5HX0hBU0hfQ0FDSEVfU0laRSsrO1xuICAgICAgc3RyaW5nSGFzaENhY2hlW3N0cmluZ10gPSBoYXNoO1xuICAgIH1cbiAgICByZXR1cm4gaGFzaDtcbiAgfVxuXG4gIC8vIGh0dHA6Ly9qc3BlcmYuY29tL2hhc2hpbmctc3RyaW5nc1xuICBmdW5jdGlvbiBoYXNoU3RyaW5nKHN0cmluZykge1xuICAgIC8vIFRoaXMgaXMgdGhlIGhhc2ggZnJvbSBKVk1cbiAgICAvLyBUaGUgaGFzaCBjb2RlIGZvciBhIHN0cmluZyBpcyBjb21wdXRlZCBhc1xuICAgIC8vIHNbMF0gKiAzMSBeIChuIC0gMSkgKyBzWzFdICogMzEgXiAobiAtIDIpICsgLi4uICsgc1tuIC0gMV0sXG4gICAgLy8gd2hlcmUgc1tpXSBpcyB0aGUgaXRoIGNoYXJhY3RlciBvZiB0aGUgc3RyaW5nIGFuZCBuIGlzIHRoZSBsZW5ndGggb2ZcbiAgICAvLyB0aGUgc3RyaW5nLiBXZSBcIm1vZFwiIHRoZSByZXN1bHQgdG8gbWFrZSBpdCBiZXR3ZWVuIDAgKGluY2x1c2l2ZSkgYW5kIDJeMzFcbiAgICAvLyAoZXhjbHVzaXZlKSBieSBkcm9wcGluZyBoaWdoIGJpdHMuXG4gICAgdmFyIGhhc2ggPSAwO1xuICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBzdHJpbmcubGVuZ3RoOyBpaSsrKSB7XG4gICAgICBoYXNoID0gMzEgKiBoYXNoICsgc3RyaW5nLmNoYXJDb2RlQXQoaWkpIHwgMDtcbiAgICB9XG4gICAgcmV0dXJuIHNtaShoYXNoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhc2hKU09iaihvYmopIHtcbiAgICB2YXIgaGFzaDtcbiAgICBpZiAodXNpbmdXZWFrTWFwKSB7XG4gICAgICBoYXNoID0gd2Vha01hcC5nZXQob2JqKTtcbiAgICAgIGlmIChoYXNoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIGhhc2g7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaGFzaCA9IG9ialtVSURfSEFTSF9LRVldO1xuICAgIGlmIChoYXNoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBoYXNoO1xuICAgIH1cblxuICAgIGlmICghY2FuRGVmaW5lUHJvcGVydHkpIHtcbiAgICAgIGhhc2ggPSBvYmoucHJvcGVydHlJc0VudW1lcmFibGUgJiYgb2JqLnByb3BlcnR5SXNFbnVtZXJhYmxlW1VJRF9IQVNIX0tFWV07XG4gICAgICBpZiAoaGFzaCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBoYXNoO1xuICAgICAgfVxuXG4gICAgICBoYXNoID0gZ2V0SUVOb2RlSGFzaChvYmopO1xuICAgICAgaWYgKGhhc2ggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gaGFzaDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBoYXNoID0gKytvYmpIYXNoVUlEO1xuICAgIGlmIChvYmpIYXNoVUlEICYgMHg0MDAwMDAwMCkge1xuICAgICAgb2JqSGFzaFVJRCA9IDA7XG4gICAgfVxuXG4gICAgaWYgKHVzaW5nV2Vha01hcCkge1xuICAgICAgd2Vha01hcC5zZXQob2JqLCBoYXNoKTtcbiAgICB9IGVsc2UgaWYgKGlzRXh0ZW5zaWJsZSAhPT0gdW5kZWZpbmVkICYmIGlzRXh0ZW5zaWJsZShvYmopID09PSBmYWxzZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdOb24tZXh0ZW5zaWJsZSBvYmplY3RzIGFyZSBub3QgYWxsb3dlZCBhcyBrZXlzLicpO1xuICAgIH0gZWxzZSBpZiAoY2FuRGVmaW5lUHJvcGVydHkpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIFVJRF9IQVNIX0tFWSwge1xuICAgICAgICAnZW51bWVyYWJsZSc6IGZhbHNlLFxuICAgICAgICAnY29uZmlndXJhYmxlJzogZmFsc2UsXG4gICAgICAgICd3cml0YWJsZSc6IGZhbHNlLFxuICAgICAgICAndmFsdWUnOiBoYXNoXG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKG9iai5wcm9wZXJ0eUlzRW51bWVyYWJsZSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgICAgICAgICBvYmoucHJvcGVydHlJc0VudW1lcmFibGUgPT09IG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUpIHtcbiAgICAgIC8vIFNpbmNlIHdlIGNhbid0IGRlZmluZSBhIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5IG9uIHRoZSBvYmplY3RcbiAgICAgIC8vIHdlJ2xsIGhpamFjayBvbmUgb2YgdGhlIGxlc3MtdXNlZCBub24tZW51bWVyYWJsZSBwcm9wZXJ0aWVzIHRvXG4gICAgICAvLyBzYXZlIG91ciBoYXNoIG9uIGl0LiBTaW5jZSB0aGlzIGlzIGEgZnVuY3Rpb24gaXQgd2lsbCBub3Qgc2hvdyB1cCBpblxuICAgICAgLy8gYEpTT04uc3RyaW5naWZ5YCB3aGljaCBpcyB3aGF0IHdlIHdhbnQuXG4gICAgICBvYmoucHJvcGVydHlJc0VudW1lcmFibGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9O1xuICAgICAgb2JqLnByb3BlcnR5SXNFbnVtZXJhYmxlW1VJRF9IQVNIX0tFWV0gPSBoYXNoO1xuICAgIH0gZWxzZSBpZiAob2JqLm5vZGVUeXBlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIEF0IHRoaXMgcG9pbnQgd2UgY291bGRuJ3QgZ2V0IHRoZSBJRSBgdW5pcXVlSURgIHRvIHVzZSBhcyBhIGhhc2hcbiAgICAgIC8vIGFuZCB3ZSBjb3VsZG4ndCB1c2UgYSBub24tZW51bWVyYWJsZSBwcm9wZXJ0eSB0byBleHBsb2l0IHRoZVxuICAgICAgLy8gZG9udEVudW0gYnVnIHNvIHdlIHNpbXBseSBhZGQgdGhlIGBVSURfSEFTSF9LRVlgIG9uIHRoZSBub2RlXG4gICAgICAvLyBpdHNlbGYuXG4gICAgICBvYmpbVUlEX0hBU0hfS0VZXSA9IGhhc2g7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIHNldCBhIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5IG9uIG9iamVjdC4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaGFzaDtcbiAgfVxuXG4gIC8vIEdldCByZWZlcmVuY2VzIHRvIEVTNSBvYmplY3QgbWV0aG9kcy5cbiAgdmFyIGlzRXh0ZW5zaWJsZSA9IE9iamVjdC5pc0V4dGVuc2libGU7XG5cbiAgLy8gVHJ1ZSBpZiBPYmplY3QuZGVmaW5lUHJvcGVydHkgd29ya3MgYXMgZXhwZWN0ZWQuIElFOCBmYWlscyB0aGlzIHRlc3QuXG4gIHZhciBjYW5EZWZpbmVQcm9wZXJ0eSA9IChmdW5jdGlvbigpIHtcbiAgICB0cnkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHt9LCAnQCcsIHt9KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH0oKSk7XG5cbiAgLy8gSUUgaGFzIGEgYHVuaXF1ZUlEYCBwcm9wZXJ0eSBvbiBET00gbm9kZXMuIFdlIGNhbiBjb25zdHJ1Y3QgdGhlIGhhc2ggZnJvbSBpdFxuICAvLyBhbmQgYXZvaWQgbWVtb3J5IGxlYWtzIGZyb20gdGhlIElFIGNsb25lTm9kZSBidWcuXG4gIGZ1bmN0aW9uIGdldElFTm9kZUhhc2gobm9kZSkge1xuICAgIGlmIChub2RlICYmIG5vZGUubm9kZVR5cGUgPiAwKSB7XG4gICAgICBzd2l0Y2ggKG5vZGUubm9kZVR5cGUpIHtcbiAgICAgICAgY2FzZSAxOiAvLyBFbGVtZW50XG4gICAgICAgICAgcmV0dXJuIG5vZGUudW5pcXVlSUQ7XG4gICAgICAgIGNhc2UgOTogLy8gRG9jdW1lbnRcbiAgICAgICAgICByZXR1cm4gbm9kZS5kb2N1bWVudEVsZW1lbnQgJiYgbm9kZS5kb2N1bWVudEVsZW1lbnQudW5pcXVlSUQ7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gSWYgcG9zc2libGUsIHVzZSBhIFdlYWtNYXAuXG4gIHZhciB1c2luZ1dlYWtNYXAgPSB0eXBlb2YgV2Vha01hcCA9PT0gJ2Z1bmN0aW9uJztcbiAgdmFyIHdlYWtNYXA7XG4gIGlmICh1c2luZ1dlYWtNYXApIHtcbiAgICB3ZWFrTWFwID0gbmV3IFdlYWtNYXAoKTtcbiAgfVxuXG4gIHZhciBvYmpIYXNoVUlEID0gMDtcblxuICB2YXIgVUlEX0hBU0hfS0VZID0gJ19faW1tdXRhYmxlaGFzaF9fJztcbiAgaWYgKHR5cGVvZiBTeW1ib2wgPT09ICdmdW5jdGlvbicpIHtcbiAgICBVSURfSEFTSF9LRVkgPSBTeW1ib2woVUlEX0hBU0hfS0VZKTtcbiAgfVxuXG4gIHZhciBTVFJJTkdfSEFTSF9DQUNIRV9NSU5fU1RSTEVOID0gMTY7XG4gIHZhciBTVFJJTkdfSEFTSF9DQUNIRV9NQVhfU0laRSA9IDI1NTtcbiAgdmFyIFNUUklOR19IQVNIX0NBQ0hFX1NJWkUgPSAwO1xuICB2YXIgc3RyaW5nSGFzaENhY2hlID0ge307XG5cbiAgZnVuY3Rpb24gYXNzZXJ0Tm90SW5maW5pdGUoc2l6ZSkge1xuICAgIGludmFyaWFudChcbiAgICAgIHNpemUgIT09IEluZmluaXR5LFxuICAgICAgJ0Nhbm5vdCBwZXJmb3JtIHRoaXMgYWN0aW9uIHdpdGggYW4gaW5maW5pdGUgc2l6ZS4nXG4gICAgKTtcbiAgfVxuXG4gIGNyZWF0ZUNsYXNzKE1hcCwgS2V5ZWRDb2xsZWN0aW9uKTtcblxuICAgIC8vIEBwcmFnbWEgQ29uc3RydWN0aW9uXG5cbiAgICBmdW5jdGlvbiBNYXAodmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkID8gZW1wdHlNYXAoKSA6XG4gICAgICAgIGlzTWFwKHZhbHVlKSAmJiAhaXNPcmRlcmVkKHZhbHVlKSA/IHZhbHVlIDpcbiAgICAgICAgZW1wdHlNYXAoKS53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKG1hcCApIHtcbiAgICAgICAgICB2YXIgaXRlciA9IEtleWVkSXRlcmFibGUodmFsdWUpO1xuICAgICAgICAgIGFzc2VydE5vdEluZmluaXRlKGl0ZXIuc2l6ZSk7XG4gICAgICAgICAgaXRlci5mb3JFYWNoKGZ1bmN0aW9uKHYsIGspICB7cmV0dXJuIG1hcC5zZXQoaywgdil9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgTWFwLm9mID0gZnVuY3Rpb24oKSB7dmFyIGtleVZhbHVlcyA9IFNMSUNFJDAuY2FsbChhcmd1bWVudHMsIDApO1xuICAgICAgcmV0dXJuIGVtcHR5TWFwKCkud2l0aE11dGF0aW9ucyhmdW5jdGlvbihtYXAgKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5VmFsdWVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICAgICAgaWYgKGkgKyAxID49IGtleVZhbHVlcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyB2YWx1ZSBmb3Iga2V5OiAnICsga2V5VmFsdWVzW2ldKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgbWFwLnNldChrZXlWYWx1ZXNbaV0sIGtleVZhbHVlc1tpICsgMV0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgTWFwLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX190b1N0cmluZygnTWFwIHsnLCAnfScpO1xuICAgIH07XG5cbiAgICAvLyBAcHJhZ21hIEFjY2Vzc1xuXG4gICAgTWFwLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihrLCBub3RTZXRWYWx1ZSkge1xuICAgICAgcmV0dXJuIHRoaXMuX3Jvb3QgP1xuICAgICAgICB0aGlzLl9yb290LmdldCgwLCB1bmRlZmluZWQsIGssIG5vdFNldFZhbHVlKSA6XG4gICAgICAgIG5vdFNldFZhbHVlO1xuICAgIH07XG5cbiAgICAvLyBAcHJhZ21hIE1vZGlmaWNhdGlvblxuXG4gICAgTWFwLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbihrLCB2KSB7XG4gICAgICByZXR1cm4gdXBkYXRlTWFwKHRoaXMsIGssIHYpO1xuICAgIH07XG5cbiAgICBNYXAucHJvdG90eXBlLnNldEluID0gZnVuY3Rpb24oa2V5UGF0aCwgdikge1xuICAgICAgcmV0dXJuIHRoaXMudXBkYXRlSW4oa2V5UGF0aCwgTk9UX1NFVCwgZnVuY3Rpb24oKSAge3JldHVybiB2fSk7XG4gICAgfTtcblxuICAgIE1hcC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24oaykge1xuICAgICAgcmV0dXJuIHVwZGF0ZU1hcCh0aGlzLCBrLCBOT1RfU0VUKTtcbiAgICB9O1xuXG4gICAgTWFwLnByb3RvdHlwZS5kZWxldGVJbiA9IGZ1bmN0aW9uKGtleVBhdGgpIHtcbiAgICAgIHJldHVybiB0aGlzLnVwZGF0ZUluKGtleVBhdGgsIGZ1bmN0aW9uKCkgIHtyZXR1cm4gTk9UX1NFVH0pO1xuICAgIH07XG5cbiAgICBNYXAucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKGssIG5vdFNldFZhbHVlLCB1cGRhdGVyKSB7XG4gICAgICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA9PT0gMSA/XG4gICAgICAgIGsodGhpcykgOlxuICAgICAgICB0aGlzLnVwZGF0ZUluKFtrXSwgbm90U2V0VmFsdWUsIHVwZGF0ZXIpO1xuICAgIH07XG5cbiAgICBNYXAucHJvdG90eXBlLnVwZGF0ZUluID0gZnVuY3Rpb24oa2V5UGF0aCwgbm90U2V0VmFsdWUsIHVwZGF0ZXIpIHtcbiAgICAgIGlmICghdXBkYXRlcikge1xuICAgICAgICB1cGRhdGVyID0gbm90U2V0VmFsdWU7XG4gICAgICAgIG5vdFNldFZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgdmFyIHVwZGF0ZWRWYWx1ZSA9IHVwZGF0ZUluRGVlcE1hcChcbiAgICAgICAgdGhpcyxcbiAgICAgICAgZm9yY2VJdGVyYXRvcihrZXlQYXRoKSxcbiAgICAgICAgbm90U2V0VmFsdWUsXG4gICAgICAgIHVwZGF0ZXJcbiAgICAgICk7XG4gICAgICByZXR1cm4gdXBkYXRlZFZhbHVlID09PSBOT1RfU0VUID8gdW5kZWZpbmVkIDogdXBkYXRlZFZhbHVlO1xuICAgIH07XG5cbiAgICBNYXAucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5zaXplID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuX19vd25lcklEKSB7XG4gICAgICAgIHRoaXMuc2l6ZSA9IDA7XG4gICAgICAgIHRoaXMuX3Jvb3QgPSBudWxsO1xuICAgICAgICB0aGlzLl9faGFzaCA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5fX2FsdGVyZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHJldHVybiBlbXB0eU1hcCgpO1xuICAgIH07XG5cbiAgICAvLyBAcHJhZ21hIENvbXBvc2l0aW9uXG5cbiAgICBNYXAucHJvdG90eXBlLm1lcmdlID0gZnVuY3Rpb24oLyouLi5pdGVycyovKSB7XG4gICAgICByZXR1cm4gbWVyZ2VJbnRvTWFwV2l0aCh0aGlzLCB1bmRlZmluZWQsIGFyZ3VtZW50cyk7XG4gICAgfTtcblxuICAgIE1hcC5wcm90b3R5cGUubWVyZ2VXaXRoID0gZnVuY3Rpb24obWVyZ2VyKSB7dmFyIGl0ZXJzID0gU0xJQ0UkMC5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICByZXR1cm4gbWVyZ2VJbnRvTWFwV2l0aCh0aGlzLCBtZXJnZXIsIGl0ZXJzKTtcbiAgICB9O1xuXG4gICAgTWFwLnByb3RvdHlwZS5tZXJnZUluID0gZnVuY3Rpb24oa2V5UGF0aCkge3ZhciBpdGVycyA9IFNMSUNFJDAuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgcmV0dXJuIHRoaXMudXBkYXRlSW4oXG4gICAgICAgIGtleVBhdGgsXG4gICAgICAgIGVtcHR5TWFwKCksXG4gICAgICAgIGZ1bmN0aW9uKG0gKSB7cmV0dXJuIHR5cGVvZiBtLm1lcmdlID09PSAnZnVuY3Rpb24nID9cbiAgICAgICAgICBtLm1lcmdlLmFwcGx5KG0sIGl0ZXJzKSA6XG4gICAgICAgICAgaXRlcnNbaXRlcnMubGVuZ3RoIC0gMV19XG4gICAgICApO1xuICAgIH07XG5cbiAgICBNYXAucHJvdG90eXBlLm1lcmdlRGVlcCA9IGZ1bmN0aW9uKC8qLi4uaXRlcnMqLykge1xuICAgICAgcmV0dXJuIG1lcmdlSW50b01hcFdpdGgodGhpcywgZGVlcE1lcmdlciwgYXJndW1lbnRzKTtcbiAgICB9O1xuXG4gICAgTWFwLnByb3RvdHlwZS5tZXJnZURlZXBXaXRoID0gZnVuY3Rpb24obWVyZ2VyKSB7dmFyIGl0ZXJzID0gU0xJQ0UkMC5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICByZXR1cm4gbWVyZ2VJbnRvTWFwV2l0aCh0aGlzLCBkZWVwTWVyZ2VyV2l0aChtZXJnZXIpLCBpdGVycyk7XG4gICAgfTtcblxuICAgIE1hcC5wcm90b3R5cGUubWVyZ2VEZWVwSW4gPSBmdW5jdGlvbihrZXlQYXRoKSB7dmFyIGl0ZXJzID0gU0xJQ0UkMC5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICByZXR1cm4gdGhpcy51cGRhdGVJbihcbiAgICAgICAga2V5UGF0aCxcbiAgICAgICAgZW1wdHlNYXAoKSxcbiAgICAgICAgZnVuY3Rpb24obSApIHtyZXR1cm4gdHlwZW9mIG0ubWVyZ2VEZWVwID09PSAnZnVuY3Rpb24nID9cbiAgICAgICAgICBtLm1lcmdlRGVlcC5hcHBseShtLCBpdGVycykgOlxuICAgICAgICAgIGl0ZXJzW2l0ZXJzLmxlbmd0aCAtIDFdfVxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgTWFwLnByb3RvdHlwZS5zb3J0ID0gZnVuY3Rpb24oY29tcGFyYXRvcikge1xuICAgICAgLy8gTGF0ZSBiaW5kaW5nXG4gICAgICByZXR1cm4gT3JkZXJlZE1hcChzb3J0RmFjdG9yeSh0aGlzLCBjb21wYXJhdG9yKSk7XG4gICAgfTtcblxuICAgIE1hcC5wcm90b3R5cGUuc29ydEJ5ID0gZnVuY3Rpb24obWFwcGVyLCBjb21wYXJhdG9yKSB7XG4gICAgICAvLyBMYXRlIGJpbmRpbmdcbiAgICAgIHJldHVybiBPcmRlcmVkTWFwKHNvcnRGYWN0b3J5KHRoaXMsIGNvbXBhcmF0b3IsIG1hcHBlcikpO1xuICAgIH07XG5cbiAgICAvLyBAcHJhZ21hIE11dGFiaWxpdHlcblxuICAgIE1hcC5wcm90b3R5cGUud2l0aE11dGF0aW9ucyA9IGZ1bmN0aW9uKGZuKSB7XG4gICAgICB2YXIgbXV0YWJsZSA9IHRoaXMuYXNNdXRhYmxlKCk7XG4gICAgICBmbihtdXRhYmxlKTtcbiAgICAgIHJldHVybiBtdXRhYmxlLndhc0FsdGVyZWQoKSA/IG11dGFibGUuX19lbnN1cmVPd25lcih0aGlzLl9fb3duZXJJRCkgOiB0aGlzO1xuICAgIH07XG5cbiAgICBNYXAucHJvdG90eXBlLmFzTXV0YWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX19vd25lcklEID8gdGhpcyA6IHRoaXMuX19lbnN1cmVPd25lcihuZXcgT3duZXJJRCgpKTtcbiAgICB9O1xuXG4gICAgTWFwLnByb3RvdHlwZS5hc0ltbXV0YWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX19lbnN1cmVPd25lcigpO1xuICAgIH07XG5cbiAgICBNYXAucHJvdG90eXBlLndhc0FsdGVyZWQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9fYWx0ZXJlZDtcbiAgICB9O1xuXG4gICAgTWFwLnByb3RvdHlwZS5fX2l0ZXJhdG9yID0gZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgICAgcmV0dXJuIG5ldyBNYXBJdGVyYXRvcih0aGlzLCB0eXBlLCByZXZlcnNlKTtcbiAgICB9O1xuXG4gICAgTWFwLnByb3RvdHlwZS5fX2l0ZXJhdGUgPSBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge3ZhciB0aGlzJDAgPSB0aGlzO1xuICAgICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgICAgdGhpcy5fcm9vdCAmJiB0aGlzLl9yb290Lml0ZXJhdGUoZnVuY3Rpb24oZW50cnkgKSB7XG4gICAgICAgIGl0ZXJhdGlvbnMrKztcbiAgICAgICAgcmV0dXJuIGZuKGVudHJ5WzFdLCBlbnRyeVswXSwgdGhpcyQwKTtcbiAgICAgIH0sIHJldmVyc2UpO1xuICAgICAgcmV0dXJuIGl0ZXJhdGlvbnM7XG4gICAgfTtcblxuICAgIE1hcC5wcm90b3R5cGUuX19lbnN1cmVPd25lciA9IGZ1bmN0aW9uKG93bmVySUQpIHtcbiAgICAgIGlmIChvd25lcklEID09PSB0aGlzLl9fb3duZXJJRCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIGlmICghb3duZXJJRCkge1xuICAgICAgICB0aGlzLl9fb3duZXJJRCA9IG93bmVySUQ7XG4gICAgICAgIHRoaXMuX19hbHRlcmVkID0gZmFsc2U7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1ha2VNYXAodGhpcy5zaXplLCB0aGlzLl9yb290LCBvd25lcklELCB0aGlzLl9faGFzaCk7XG4gICAgfTtcblxuXG4gIGZ1bmN0aW9uIGlzTWFwKG1heWJlTWFwKSB7XG4gICAgcmV0dXJuICEhKG1heWJlTWFwICYmIG1heWJlTWFwW0lTX01BUF9TRU5USU5FTF0pO1xuICB9XG5cbiAgTWFwLmlzTWFwID0gaXNNYXA7XG5cbiAgdmFyIElTX01BUF9TRU5USU5FTCA9ICdAQF9fSU1NVVRBQkxFX01BUF9fQEAnO1xuXG4gIHZhciBNYXBQcm90b3R5cGUgPSBNYXAucHJvdG90eXBlO1xuICBNYXBQcm90b3R5cGVbSVNfTUFQX1NFTlRJTkVMXSA9IHRydWU7XG4gIE1hcFByb3RvdHlwZVtERUxFVEVdID0gTWFwUHJvdG90eXBlLnJlbW92ZTtcbiAgTWFwUHJvdG90eXBlLnJlbW92ZUluID0gTWFwUHJvdG90eXBlLmRlbGV0ZUluO1xuXG5cbiAgLy8gI3ByYWdtYSBUcmllIE5vZGVzXG5cblxuXG4gICAgZnVuY3Rpb24gQXJyYXlNYXBOb2RlKG93bmVySUQsIGVudHJpZXMpIHtcbiAgICAgIHRoaXMub3duZXJJRCA9IG93bmVySUQ7XG4gICAgICB0aGlzLmVudHJpZXMgPSBlbnRyaWVzO1xuICAgIH1cblxuICAgIEFycmF5TWFwTm9kZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24oc2hpZnQsIGtleUhhc2gsIGtleSwgbm90U2V0VmFsdWUpIHtcbiAgICAgIHZhciBlbnRyaWVzID0gdGhpcy5lbnRyaWVzO1xuICAgICAgZm9yICh2YXIgaWkgPSAwLCBsZW4gPSBlbnRyaWVzLmxlbmd0aDsgaWkgPCBsZW47IGlpKyspIHtcbiAgICAgICAgaWYgKGlzKGtleSwgZW50cmllc1tpaV1bMF0pKSB7XG4gICAgICAgICAgcmV0dXJuIGVudHJpZXNbaWldWzFdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbm90U2V0VmFsdWU7XG4gICAgfTtcblxuICAgIEFycmF5TWFwTm9kZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24ob3duZXJJRCwgc2hpZnQsIGtleUhhc2gsIGtleSwgdmFsdWUsIGRpZENoYW5nZVNpemUsIGRpZEFsdGVyKSB7XG4gICAgICB2YXIgcmVtb3ZlZCA9IHZhbHVlID09PSBOT1RfU0VUO1xuXG4gICAgICB2YXIgZW50cmllcyA9IHRoaXMuZW50cmllcztcbiAgICAgIHZhciBpZHggPSAwO1xuICAgICAgZm9yICh2YXIgbGVuID0gZW50cmllcy5sZW5ndGg7IGlkeCA8IGxlbjsgaWR4KyspIHtcbiAgICAgICAgaWYgKGlzKGtleSwgZW50cmllc1tpZHhdWzBdKSkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2YXIgZXhpc3RzID0gaWR4IDwgbGVuO1xuXG4gICAgICBpZiAoZXhpc3RzID8gZW50cmllc1tpZHhdWzFdID09PSB2YWx1ZSA6IHJlbW92ZWQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG5cbiAgICAgIFNldFJlZihkaWRBbHRlcik7XG4gICAgICAocmVtb3ZlZCB8fCAhZXhpc3RzKSAmJiBTZXRSZWYoZGlkQ2hhbmdlU2l6ZSk7XG5cbiAgICAgIGlmIChyZW1vdmVkICYmIGVudHJpZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJldHVybjsgLy8gdW5kZWZpbmVkXG4gICAgICB9XG5cbiAgICAgIGlmICghZXhpc3RzICYmICFyZW1vdmVkICYmIGVudHJpZXMubGVuZ3RoID49IE1BWF9BUlJBWV9NQVBfU0laRSkge1xuICAgICAgICByZXR1cm4gY3JlYXRlTm9kZXMob3duZXJJRCwgZW50cmllcywga2V5LCB2YWx1ZSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBpc0VkaXRhYmxlID0gb3duZXJJRCAmJiBvd25lcklEID09PSB0aGlzLm93bmVySUQ7XG4gICAgICB2YXIgbmV3RW50cmllcyA9IGlzRWRpdGFibGUgPyBlbnRyaWVzIDogYXJyQ29weShlbnRyaWVzKTtcblxuICAgICAgaWYgKGV4aXN0cykge1xuICAgICAgICBpZiAocmVtb3ZlZCkge1xuICAgICAgICAgIGlkeCA9PT0gbGVuIC0gMSA/IG5ld0VudHJpZXMucG9wKCkgOiAobmV3RW50cmllc1tpZHhdID0gbmV3RW50cmllcy5wb3AoKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbmV3RW50cmllc1tpZHhdID0gW2tleSwgdmFsdWVdO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXdFbnRyaWVzLnB1c2goW2tleSwgdmFsdWVdKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzRWRpdGFibGUpIHtcbiAgICAgICAgdGhpcy5lbnRyaWVzID0gbmV3RW50cmllcztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgQXJyYXlNYXBOb2RlKG93bmVySUQsIG5ld0VudHJpZXMpO1xuICAgIH07XG5cblxuXG5cbiAgICBmdW5jdGlvbiBCaXRtYXBJbmRleGVkTm9kZShvd25lcklELCBiaXRtYXAsIG5vZGVzKSB7XG4gICAgICB0aGlzLm93bmVySUQgPSBvd25lcklEO1xuICAgICAgdGhpcy5iaXRtYXAgPSBiaXRtYXA7XG4gICAgICB0aGlzLm5vZGVzID0gbm9kZXM7XG4gICAgfVxuXG4gICAgQml0bWFwSW5kZXhlZE5vZGUucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKHNoaWZ0LCBrZXlIYXNoLCBrZXksIG5vdFNldFZhbHVlKSB7XG4gICAgICBpZiAoa2V5SGFzaCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGtleUhhc2ggPSBoYXNoKGtleSk7XG4gICAgICB9XG4gICAgICB2YXIgYml0ID0gKDEgPDwgKChzaGlmdCA9PT0gMCA/IGtleUhhc2ggOiBrZXlIYXNoID4+PiBzaGlmdCkgJiBNQVNLKSk7XG4gICAgICB2YXIgYml0bWFwID0gdGhpcy5iaXRtYXA7XG4gICAgICByZXR1cm4gKGJpdG1hcCAmIGJpdCkgPT09IDAgPyBub3RTZXRWYWx1ZSA6XG4gICAgICAgIHRoaXMubm9kZXNbcG9wQ291bnQoYml0bWFwICYgKGJpdCAtIDEpKV0uZ2V0KHNoaWZ0ICsgU0hJRlQsIGtleUhhc2gsIGtleSwgbm90U2V0VmFsdWUpO1xuICAgIH07XG5cbiAgICBCaXRtYXBJbmRleGVkTm9kZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24ob3duZXJJRCwgc2hpZnQsIGtleUhhc2gsIGtleSwgdmFsdWUsIGRpZENoYW5nZVNpemUsIGRpZEFsdGVyKSB7XG4gICAgICBpZiAoa2V5SGFzaCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGtleUhhc2ggPSBoYXNoKGtleSk7XG4gICAgICB9XG4gICAgICB2YXIga2V5SGFzaEZyYWcgPSAoc2hpZnQgPT09IDAgPyBrZXlIYXNoIDoga2V5SGFzaCA+Pj4gc2hpZnQpICYgTUFTSztcbiAgICAgIHZhciBiaXQgPSAxIDw8IGtleUhhc2hGcmFnO1xuICAgICAgdmFyIGJpdG1hcCA9IHRoaXMuYml0bWFwO1xuICAgICAgdmFyIGV4aXN0cyA9IChiaXRtYXAgJiBiaXQpICE9PSAwO1xuXG4gICAgICBpZiAoIWV4aXN0cyAmJiB2YWx1ZSA9PT0gTk9UX1NFVCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cblxuICAgICAgdmFyIGlkeCA9IHBvcENvdW50KGJpdG1hcCAmIChiaXQgLSAxKSk7XG4gICAgICB2YXIgbm9kZXMgPSB0aGlzLm5vZGVzO1xuICAgICAgdmFyIG5vZGUgPSBleGlzdHMgPyBub2Rlc1tpZHhdIDogdW5kZWZpbmVkO1xuICAgICAgdmFyIG5ld05vZGUgPSB1cGRhdGVOb2RlKG5vZGUsIG93bmVySUQsIHNoaWZ0ICsgU0hJRlQsIGtleUhhc2gsIGtleSwgdmFsdWUsIGRpZENoYW5nZVNpemUsIGRpZEFsdGVyKTtcblxuICAgICAgaWYgKG5ld05vZGUgPT09IG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG5cbiAgICAgIGlmICghZXhpc3RzICYmIG5ld05vZGUgJiYgbm9kZXMubGVuZ3RoID49IE1BWF9CSVRNQVBfSU5ERVhFRF9TSVpFKSB7XG4gICAgICAgIHJldHVybiBleHBhbmROb2Rlcyhvd25lcklELCBub2RlcywgYml0bWFwLCBrZXlIYXNoRnJhZywgbmV3Tm9kZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChleGlzdHMgJiYgIW5ld05vZGUgJiYgbm9kZXMubGVuZ3RoID09PSAyICYmIGlzTGVhZk5vZGUobm9kZXNbaWR4IF4gMV0pKSB7XG4gICAgICAgIHJldHVybiBub2Rlc1tpZHggXiAxXTtcbiAgICAgIH1cblxuICAgICAgaWYgKGV4aXN0cyAmJiBuZXdOb2RlICYmIG5vZGVzLmxlbmd0aCA9PT0gMSAmJiBpc0xlYWZOb2RlKG5ld05vZGUpKSB7XG4gICAgICAgIHJldHVybiBuZXdOb2RlO1xuICAgICAgfVxuXG4gICAgICB2YXIgaXNFZGl0YWJsZSA9IG93bmVySUQgJiYgb3duZXJJRCA9PT0gdGhpcy5vd25lcklEO1xuICAgICAgdmFyIG5ld0JpdG1hcCA9IGV4aXN0cyA/IG5ld05vZGUgPyBiaXRtYXAgOiBiaXRtYXAgXiBiaXQgOiBiaXRtYXAgfCBiaXQ7XG4gICAgICB2YXIgbmV3Tm9kZXMgPSBleGlzdHMgPyBuZXdOb2RlID9cbiAgICAgICAgc2V0SW4obm9kZXMsIGlkeCwgbmV3Tm9kZSwgaXNFZGl0YWJsZSkgOlxuICAgICAgICBzcGxpY2VPdXQobm9kZXMsIGlkeCwgaXNFZGl0YWJsZSkgOlxuICAgICAgICBzcGxpY2VJbihub2RlcywgaWR4LCBuZXdOb2RlLCBpc0VkaXRhYmxlKTtcblxuICAgICAgaWYgKGlzRWRpdGFibGUpIHtcbiAgICAgICAgdGhpcy5iaXRtYXAgPSBuZXdCaXRtYXA7XG4gICAgICAgIHRoaXMubm9kZXMgPSBuZXdOb2RlcztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgQml0bWFwSW5kZXhlZE5vZGUob3duZXJJRCwgbmV3Qml0bWFwLCBuZXdOb2Rlcyk7XG4gICAgfTtcblxuXG5cblxuICAgIGZ1bmN0aW9uIEhhc2hBcnJheU1hcE5vZGUob3duZXJJRCwgY291bnQsIG5vZGVzKSB7XG4gICAgICB0aGlzLm93bmVySUQgPSBvd25lcklEO1xuICAgICAgdGhpcy5jb3VudCA9IGNvdW50O1xuICAgICAgdGhpcy5ub2RlcyA9IG5vZGVzO1xuICAgIH1cblxuICAgIEhhc2hBcnJheU1hcE5vZGUucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKHNoaWZ0LCBrZXlIYXNoLCBrZXksIG5vdFNldFZhbHVlKSB7XG4gICAgICBpZiAoa2V5SGFzaCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGtleUhhc2ggPSBoYXNoKGtleSk7XG4gICAgICB9XG4gICAgICB2YXIgaWR4ID0gKHNoaWZ0ID09PSAwID8ga2V5SGFzaCA6IGtleUhhc2ggPj4+IHNoaWZ0KSAmIE1BU0s7XG4gICAgICB2YXIgbm9kZSA9IHRoaXMubm9kZXNbaWR4XTtcbiAgICAgIHJldHVybiBub2RlID8gbm9kZS5nZXQoc2hpZnQgKyBTSElGVCwga2V5SGFzaCwga2V5LCBub3RTZXRWYWx1ZSkgOiBub3RTZXRWYWx1ZTtcbiAgICB9O1xuXG4gICAgSGFzaEFycmF5TWFwTm9kZS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24ob3duZXJJRCwgc2hpZnQsIGtleUhhc2gsIGtleSwgdmFsdWUsIGRpZENoYW5nZVNpemUsIGRpZEFsdGVyKSB7XG4gICAgICBpZiAoa2V5SGFzaCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGtleUhhc2ggPSBoYXNoKGtleSk7XG4gICAgICB9XG4gICAgICB2YXIgaWR4ID0gKHNoaWZ0ID09PSAwID8ga2V5SGFzaCA6IGtleUhhc2ggPj4+IHNoaWZ0KSAmIE1BU0s7XG4gICAgICB2YXIgcmVtb3ZlZCA9IHZhbHVlID09PSBOT1RfU0VUO1xuICAgICAgdmFyIG5vZGVzID0gdGhpcy5ub2RlcztcbiAgICAgIHZhciBub2RlID0gbm9kZXNbaWR4XTtcblxuICAgICAgaWYgKHJlbW92ZWQgJiYgIW5vZGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG5cbiAgICAgIHZhciBuZXdOb2RlID0gdXBkYXRlTm9kZShub2RlLCBvd25lcklELCBzaGlmdCArIFNISUZULCBrZXlIYXNoLCBrZXksIHZhbHVlLCBkaWRDaGFuZ2VTaXplLCBkaWRBbHRlcik7XG4gICAgICBpZiAobmV3Tm9kZSA9PT0gbm9kZSkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cblxuICAgICAgdmFyIG5ld0NvdW50ID0gdGhpcy5jb3VudDtcbiAgICAgIGlmICghbm9kZSkge1xuICAgICAgICBuZXdDb3VudCsrO1xuICAgICAgfSBlbHNlIGlmICghbmV3Tm9kZSkge1xuICAgICAgICBuZXdDb3VudC0tO1xuICAgICAgICBpZiAobmV3Q291bnQgPCBNSU5fSEFTSF9BUlJBWV9NQVBfU0laRSkge1xuICAgICAgICAgIHJldHVybiBwYWNrTm9kZXMob3duZXJJRCwgbm9kZXMsIG5ld0NvdW50LCBpZHgpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciBpc0VkaXRhYmxlID0gb3duZXJJRCAmJiBvd25lcklEID09PSB0aGlzLm93bmVySUQ7XG4gICAgICB2YXIgbmV3Tm9kZXMgPSBzZXRJbihub2RlcywgaWR4LCBuZXdOb2RlLCBpc0VkaXRhYmxlKTtcblxuICAgICAgaWYgKGlzRWRpdGFibGUpIHtcbiAgICAgICAgdGhpcy5jb3VudCA9IG5ld0NvdW50O1xuICAgICAgICB0aGlzLm5vZGVzID0gbmV3Tm9kZXM7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbmV3IEhhc2hBcnJheU1hcE5vZGUob3duZXJJRCwgbmV3Q291bnQsIG5ld05vZGVzKTtcbiAgICB9O1xuXG5cblxuXG4gICAgZnVuY3Rpb24gSGFzaENvbGxpc2lvbk5vZGUob3duZXJJRCwga2V5SGFzaCwgZW50cmllcykge1xuICAgICAgdGhpcy5vd25lcklEID0gb3duZXJJRDtcbiAgICAgIHRoaXMua2V5SGFzaCA9IGtleUhhc2g7XG4gICAgICB0aGlzLmVudHJpZXMgPSBlbnRyaWVzO1xuICAgIH1cblxuICAgIEhhc2hDb2xsaXNpb25Ob2RlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihzaGlmdCwga2V5SGFzaCwga2V5LCBub3RTZXRWYWx1ZSkge1xuICAgICAgdmFyIGVudHJpZXMgPSB0aGlzLmVudHJpZXM7XG4gICAgICBmb3IgKHZhciBpaSA9IDAsIGxlbiA9IGVudHJpZXMubGVuZ3RoOyBpaSA8IGxlbjsgaWkrKykge1xuICAgICAgICBpZiAoaXMoa2V5LCBlbnRyaWVzW2lpXVswXSkpIHtcbiAgICAgICAgICByZXR1cm4gZW50cmllc1tpaV1bMV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBub3RTZXRWYWx1ZTtcbiAgICB9O1xuXG4gICAgSGFzaENvbGxpc2lvbk5vZGUucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKG93bmVySUQsIHNoaWZ0LCBrZXlIYXNoLCBrZXksIHZhbHVlLCBkaWRDaGFuZ2VTaXplLCBkaWRBbHRlcikge1xuICAgICAgaWYgKGtleUhhc2ggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBrZXlIYXNoID0gaGFzaChrZXkpO1xuICAgICAgfVxuXG4gICAgICB2YXIgcmVtb3ZlZCA9IHZhbHVlID09PSBOT1RfU0VUO1xuXG4gICAgICBpZiAoa2V5SGFzaCAhPT0gdGhpcy5rZXlIYXNoKSB7XG4gICAgICAgIGlmIChyZW1vdmVkKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgU2V0UmVmKGRpZEFsdGVyKTtcbiAgICAgICAgU2V0UmVmKGRpZENoYW5nZVNpemUpO1xuICAgICAgICByZXR1cm4gbWVyZ2VJbnRvTm9kZSh0aGlzLCBvd25lcklELCBzaGlmdCwga2V5SGFzaCwgW2tleSwgdmFsdWVdKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGVudHJpZXMgPSB0aGlzLmVudHJpZXM7XG4gICAgICB2YXIgaWR4ID0gMDtcbiAgICAgIGZvciAodmFyIGxlbiA9IGVudHJpZXMubGVuZ3RoOyBpZHggPCBsZW47IGlkeCsrKSB7XG4gICAgICAgIGlmIChpcyhrZXksIGVudHJpZXNbaWR4XVswXSkpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdmFyIGV4aXN0cyA9IGlkeCA8IGxlbjtcblxuICAgICAgaWYgKGV4aXN0cyA/IGVudHJpZXNbaWR4XVsxXSA9PT0gdmFsdWUgOiByZW1vdmVkKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuXG4gICAgICBTZXRSZWYoZGlkQWx0ZXIpO1xuICAgICAgKHJlbW92ZWQgfHwgIWV4aXN0cykgJiYgU2V0UmVmKGRpZENoYW5nZVNpemUpO1xuXG4gICAgICBpZiAocmVtb3ZlZCAmJiBsZW4gPT09IDIpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBWYWx1ZU5vZGUob3duZXJJRCwgdGhpcy5rZXlIYXNoLCBlbnRyaWVzW2lkeCBeIDFdKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGlzRWRpdGFibGUgPSBvd25lcklEICYmIG93bmVySUQgPT09IHRoaXMub3duZXJJRDtcbiAgICAgIHZhciBuZXdFbnRyaWVzID0gaXNFZGl0YWJsZSA/IGVudHJpZXMgOiBhcnJDb3B5KGVudHJpZXMpO1xuXG4gICAgICBpZiAoZXhpc3RzKSB7XG4gICAgICAgIGlmIChyZW1vdmVkKSB7XG4gICAgICAgICAgaWR4ID09PSBsZW4gLSAxID8gbmV3RW50cmllcy5wb3AoKSA6IChuZXdFbnRyaWVzW2lkeF0gPSBuZXdFbnRyaWVzLnBvcCgpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBuZXdFbnRyaWVzW2lkeF0gPSBba2V5LCB2YWx1ZV07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5ld0VudHJpZXMucHVzaChba2V5LCB2YWx1ZV0pO1xuICAgICAgfVxuXG4gICAgICBpZiAoaXNFZGl0YWJsZSkge1xuICAgICAgICB0aGlzLmVudHJpZXMgPSBuZXdFbnRyaWVzO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5ldyBIYXNoQ29sbGlzaW9uTm9kZShvd25lcklELCB0aGlzLmtleUhhc2gsIG5ld0VudHJpZXMpO1xuICAgIH07XG5cblxuXG5cbiAgICBmdW5jdGlvbiBWYWx1ZU5vZGUob3duZXJJRCwga2V5SGFzaCwgZW50cnkpIHtcbiAgICAgIHRoaXMub3duZXJJRCA9IG93bmVySUQ7XG4gICAgICB0aGlzLmtleUhhc2ggPSBrZXlIYXNoO1xuICAgICAgdGhpcy5lbnRyeSA9IGVudHJ5O1xuICAgIH1cblxuICAgIFZhbHVlTm9kZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24oc2hpZnQsIGtleUhhc2gsIGtleSwgbm90U2V0VmFsdWUpIHtcbiAgICAgIHJldHVybiBpcyhrZXksIHRoaXMuZW50cnlbMF0pID8gdGhpcy5lbnRyeVsxXSA6IG5vdFNldFZhbHVlO1xuICAgIH07XG5cbiAgICBWYWx1ZU5vZGUucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKG93bmVySUQsIHNoaWZ0LCBrZXlIYXNoLCBrZXksIHZhbHVlLCBkaWRDaGFuZ2VTaXplLCBkaWRBbHRlcikge1xuICAgICAgdmFyIHJlbW92ZWQgPSB2YWx1ZSA9PT0gTk9UX1NFVDtcbiAgICAgIHZhciBrZXlNYXRjaCA9IGlzKGtleSwgdGhpcy5lbnRyeVswXSk7XG4gICAgICBpZiAoa2V5TWF0Y2ggPyB2YWx1ZSA9PT0gdGhpcy5lbnRyeVsxXSA6IHJlbW92ZWQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG5cbiAgICAgIFNldFJlZihkaWRBbHRlcik7XG5cbiAgICAgIGlmIChyZW1vdmVkKSB7XG4gICAgICAgIFNldFJlZihkaWRDaGFuZ2VTaXplKTtcbiAgICAgICAgcmV0dXJuOyAvLyB1bmRlZmluZWRcbiAgICAgIH1cblxuICAgICAgaWYgKGtleU1hdGNoKSB7XG4gICAgICAgIGlmIChvd25lcklEICYmIG93bmVySUQgPT09IHRoaXMub3duZXJJRCkge1xuICAgICAgICAgIHRoaXMuZW50cnlbMV0gPSB2YWx1ZTtcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFZhbHVlTm9kZShvd25lcklELCB0aGlzLmtleUhhc2gsIFtrZXksIHZhbHVlXSk7XG4gICAgICB9XG5cbiAgICAgIFNldFJlZihkaWRDaGFuZ2VTaXplKTtcbiAgICAgIHJldHVybiBtZXJnZUludG9Ob2RlKHRoaXMsIG93bmVySUQsIHNoaWZ0LCBoYXNoKGtleSksIFtrZXksIHZhbHVlXSk7XG4gICAgfTtcblxuXG5cbiAgLy8gI3ByYWdtYSBJdGVyYXRvcnNcblxuICBBcnJheU1hcE5vZGUucHJvdG90eXBlLml0ZXJhdGUgPVxuICBIYXNoQ29sbGlzaW9uTm9kZS5wcm90b3R5cGUuaXRlcmF0ZSA9IGZ1bmN0aW9uIChmbiwgcmV2ZXJzZSkge1xuICAgIHZhciBlbnRyaWVzID0gdGhpcy5lbnRyaWVzO1xuICAgIGZvciAodmFyIGlpID0gMCwgbWF4SW5kZXggPSBlbnRyaWVzLmxlbmd0aCAtIDE7IGlpIDw9IG1heEluZGV4OyBpaSsrKSB7XG4gICAgICBpZiAoZm4oZW50cmllc1tyZXZlcnNlID8gbWF4SW5kZXggLSBpaSA6IGlpXSkgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBCaXRtYXBJbmRleGVkTm9kZS5wcm90b3R5cGUuaXRlcmF0ZSA9XG4gIEhhc2hBcnJheU1hcE5vZGUucHJvdG90eXBlLml0ZXJhdGUgPSBmdW5jdGlvbiAoZm4sIHJldmVyc2UpIHtcbiAgICB2YXIgbm9kZXMgPSB0aGlzLm5vZGVzO1xuICAgIGZvciAodmFyIGlpID0gMCwgbWF4SW5kZXggPSBub2Rlcy5sZW5ndGggLSAxOyBpaSA8PSBtYXhJbmRleDsgaWkrKykge1xuICAgICAgdmFyIG5vZGUgPSBub2Rlc1tyZXZlcnNlID8gbWF4SW5kZXggLSBpaSA6IGlpXTtcbiAgICAgIGlmIChub2RlICYmIG5vZGUuaXRlcmF0ZShmbiwgcmV2ZXJzZSkgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBWYWx1ZU5vZGUucHJvdG90eXBlLml0ZXJhdGUgPSBmdW5jdGlvbiAoZm4sIHJldmVyc2UpIHtcbiAgICByZXR1cm4gZm4odGhpcy5lbnRyeSk7XG4gIH1cblxuICBjcmVhdGVDbGFzcyhNYXBJdGVyYXRvciwgSXRlcmF0b3IpO1xuXG4gICAgZnVuY3Rpb24gTWFwSXRlcmF0b3IobWFwLCB0eXBlLCByZXZlcnNlKSB7XG4gICAgICB0aGlzLl90eXBlID0gdHlwZTtcbiAgICAgIHRoaXMuX3JldmVyc2UgPSByZXZlcnNlO1xuICAgICAgdGhpcy5fc3RhY2sgPSBtYXAuX3Jvb3QgJiYgbWFwSXRlcmF0b3JGcmFtZShtYXAuX3Jvb3QpO1xuICAgIH1cblxuICAgIE1hcEl0ZXJhdG9yLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdHlwZSA9IHRoaXMuX3R5cGU7XG4gICAgICB2YXIgc3RhY2sgPSB0aGlzLl9zdGFjaztcbiAgICAgIHdoaWxlIChzdGFjaykge1xuICAgICAgICB2YXIgbm9kZSA9IHN0YWNrLm5vZGU7XG4gICAgICAgIHZhciBpbmRleCA9IHN0YWNrLmluZGV4Kys7XG4gICAgICAgIHZhciBtYXhJbmRleDtcbiAgICAgICAgaWYgKG5vZGUuZW50cnkpIHtcbiAgICAgICAgICBpZiAoaW5kZXggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBtYXBJdGVyYXRvclZhbHVlKHR5cGUsIG5vZGUuZW50cnkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChub2RlLmVudHJpZXMpIHtcbiAgICAgICAgICBtYXhJbmRleCA9IG5vZGUuZW50cmllcy5sZW5ndGggLSAxO1xuICAgICAgICAgIGlmIChpbmRleCA8PSBtYXhJbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIG1hcEl0ZXJhdG9yVmFsdWUodHlwZSwgbm9kZS5lbnRyaWVzW3RoaXMuX3JldmVyc2UgPyBtYXhJbmRleCAtIGluZGV4IDogaW5kZXhdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbWF4SW5kZXggPSBub2RlLm5vZGVzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgaWYgKGluZGV4IDw9IG1heEluZGV4KSB7XG4gICAgICAgICAgICB2YXIgc3ViTm9kZSA9IG5vZGUubm9kZXNbdGhpcy5fcmV2ZXJzZSA/IG1heEluZGV4IC0gaW5kZXggOiBpbmRleF07XG4gICAgICAgICAgICBpZiAoc3ViTm9kZSkge1xuICAgICAgICAgICAgICBpZiAoc3ViTm9kZS5lbnRyeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBtYXBJdGVyYXRvclZhbHVlKHR5cGUsIHN1Yk5vZGUuZW50cnkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHN0YWNrID0gdGhpcy5fc3RhY2sgPSBtYXBJdGVyYXRvckZyYW1lKHN1Yk5vZGUsIHN0YWNrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzdGFjayA9IHRoaXMuX3N0YWNrID0gdGhpcy5fc3RhY2suX19wcmV2O1xuICAgICAgfVxuICAgICAgcmV0dXJuIGl0ZXJhdG9yRG9uZSgpO1xuICAgIH07XG5cblxuICBmdW5jdGlvbiBtYXBJdGVyYXRvclZhbHVlKHR5cGUsIGVudHJ5KSB7XG4gICAgcmV0dXJuIGl0ZXJhdG9yVmFsdWUodHlwZSwgZW50cnlbMF0sIGVudHJ5WzFdKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1hcEl0ZXJhdG9yRnJhbWUobm9kZSwgcHJldikge1xuICAgIHJldHVybiB7XG4gICAgICBub2RlOiBub2RlLFxuICAgICAgaW5kZXg6IDAsXG4gICAgICBfX3ByZXY6IHByZXZcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gbWFrZU1hcChzaXplLCByb290LCBvd25lcklELCBoYXNoKSB7XG4gICAgdmFyIG1hcCA9IE9iamVjdC5jcmVhdGUoTWFwUHJvdG90eXBlKTtcbiAgICBtYXAuc2l6ZSA9IHNpemU7XG4gICAgbWFwLl9yb290ID0gcm9vdDtcbiAgICBtYXAuX19vd25lcklEID0gb3duZXJJRDtcbiAgICBtYXAuX19oYXNoID0gaGFzaDtcbiAgICBtYXAuX19hbHRlcmVkID0gZmFsc2U7XG4gICAgcmV0dXJuIG1hcDtcbiAgfVxuXG4gIHZhciBFTVBUWV9NQVA7XG4gIGZ1bmN0aW9uIGVtcHR5TWFwKCkge1xuICAgIHJldHVybiBFTVBUWV9NQVAgfHwgKEVNUFRZX01BUCA9IG1ha2VNYXAoMCkpO1xuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlTWFwKG1hcCwgaywgdikge1xuICAgIHZhciBuZXdSb290O1xuICAgIHZhciBuZXdTaXplO1xuICAgIGlmICghbWFwLl9yb290KSB7XG4gICAgICBpZiAodiA9PT0gTk9UX1NFVCkge1xuICAgICAgICByZXR1cm4gbWFwO1xuICAgICAgfVxuICAgICAgbmV3U2l6ZSA9IDE7XG4gICAgICBuZXdSb290ID0gbmV3IEFycmF5TWFwTm9kZShtYXAuX19vd25lcklELCBbW2ssIHZdXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBkaWRDaGFuZ2VTaXplID0gTWFrZVJlZihDSEFOR0VfTEVOR1RIKTtcbiAgICAgIHZhciBkaWRBbHRlciA9IE1ha2VSZWYoRElEX0FMVEVSKTtcbiAgICAgIG5ld1Jvb3QgPSB1cGRhdGVOb2RlKG1hcC5fcm9vdCwgbWFwLl9fb3duZXJJRCwgMCwgdW5kZWZpbmVkLCBrLCB2LCBkaWRDaGFuZ2VTaXplLCBkaWRBbHRlcik7XG4gICAgICBpZiAoIWRpZEFsdGVyLnZhbHVlKSB7XG4gICAgICAgIHJldHVybiBtYXA7XG4gICAgICB9XG4gICAgICBuZXdTaXplID0gbWFwLnNpemUgKyAoZGlkQ2hhbmdlU2l6ZS52YWx1ZSA/IHYgPT09IE5PVF9TRVQgPyAtMSA6IDEgOiAwKTtcbiAgICB9XG4gICAgaWYgKG1hcC5fX293bmVySUQpIHtcbiAgICAgIG1hcC5zaXplID0gbmV3U2l6ZTtcbiAgICAgIG1hcC5fcm9vdCA9IG5ld1Jvb3Q7XG4gICAgICBtYXAuX19oYXNoID0gdW5kZWZpbmVkO1xuICAgICAgbWFwLl9fYWx0ZXJlZCA9IHRydWU7XG4gICAgICByZXR1cm4gbWFwO1xuICAgIH1cbiAgICByZXR1cm4gbmV3Um9vdCA/IG1ha2VNYXAobmV3U2l6ZSwgbmV3Um9vdCkgOiBlbXB0eU1hcCgpO1xuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlTm9kZShub2RlLCBvd25lcklELCBzaGlmdCwga2V5SGFzaCwga2V5LCB2YWx1ZSwgZGlkQ2hhbmdlU2l6ZSwgZGlkQWx0ZXIpIHtcbiAgICBpZiAoIW5vZGUpIHtcbiAgICAgIGlmICh2YWx1ZSA9PT0gTk9UX1NFVCkge1xuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICAgIH1cbiAgICAgIFNldFJlZihkaWRBbHRlcik7XG4gICAgICBTZXRSZWYoZGlkQ2hhbmdlU2l6ZSk7XG4gICAgICByZXR1cm4gbmV3IFZhbHVlTm9kZShvd25lcklELCBrZXlIYXNoLCBba2V5LCB2YWx1ZV0pO1xuICAgIH1cbiAgICByZXR1cm4gbm9kZS51cGRhdGUob3duZXJJRCwgc2hpZnQsIGtleUhhc2gsIGtleSwgdmFsdWUsIGRpZENoYW5nZVNpemUsIGRpZEFsdGVyKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzTGVhZk5vZGUobm9kZSkge1xuICAgIHJldHVybiBub2RlLmNvbnN0cnVjdG9yID09PSBWYWx1ZU5vZGUgfHwgbm9kZS5jb25zdHJ1Y3RvciA9PT0gSGFzaENvbGxpc2lvbk5vZGU7XG4gIH1cblxuICBmdW5jdGlvbiBtZXJnZUludG9Ob2RlKG5vZGUsIG93bmVySUQsIHNoaWZ0LCBrZXlIYXNoLCBlbnRyeSkge1xuICAgIGlmIChub2RlLmtleUhhc2ggPT09IGtleUhhc2gpIHtcbiAgICAgIHJldHVybiBuZXcgSGFzaENvbGxpc2lvbk5vZGUob3duZXJJRCwga2V5SGFzaCwgW25vZGUuZW50cnksIGVudHJ5XSk7XG4gICAgfVxuXG4gICAgdmFyIGlkeDEgPSAoc2hpZnQgPT09IDAgPyBub2RlLmtleUhhc2ggOiBub2RlLmtleUhhc2ggPj4+IHNoaWZ0KSAmIE1BU0s7XG4gICAgdmFyIGlkeDIgPSAoc2hpZnQgPT09IDAgPyBrZXlIYXNoIDoga2V5SGFzaCA+Pj4gc2hpZnQpICYgTUFTSztcblxuICAgIHZhciBuZXdOb2RlO1xuICAgIHZhciBub2RlcyA9IGlkeDEgPT09IGlkeDIgP1xuICAgICAgW21lcmdlSW50b05vZGUobm9kZSwgb3duZXJJRCwgc2hpZnQgKyBTSElGVCwga2V5SGFzaCwgZW50cnkpXSA6XG4gICAgICAoKG5ld05vZGUgPSBuZXcgVmFsdWVOb2RlKG93bmVySUQsIGtleUhhc2gsIGVudHJ5KSksIGlkeDEgPCBpZHgyID8gW25vZGUsIG5ld05vZGVdIDogW25ld05vZGUsIG5vZGVdKTtcblxuICAgIHJldHVybiBuZXcgQml0bWFwSW5kZXhlZE5vZGUob3duZXJJRCwgKDEgPDwgaWR4MSkgfCAoMSA8PCBpZHgyKSwgbm9kZXMpO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlTm9kZXMob3duZXJJRCwgZW50cmllcywga2V5LCB2YWx1ZSkge1xuICAgIGlmICghb3duZXJJRCkge1xuICAgICAgb3duZXJJRCA9IG5ldyBPd25lcklEKCk7XG4gICAgfVxuICAgIHZhciBub2RlID0gbmV3IFZhbHVlTm9kZShvd25lcklELCBoYXNoKGtleSksIFtrZXksIHZhbHVlXSk7XG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IGVudHJpZXMubGVuZ3RoOyBpaSsrKSB7XG4gICAgICB2YXIgZW50cnkgPSBlbnRyaWVzW2lpXTtcbiAgICAgIG5vZGUgPSBub2RlLnVwZGF0ZShvd25lcklELCAwLCB1bmRlZmluZWQsIGVudHJ5WzBdLCBlbnRyeVsxXSk7XG4gICAgfVxuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFja05vZGVzKG93bmVySUQsIG5vZGVzLCBjb3VudCwgZXhjbHVkaW5nKSB7XG4gICAgdmFyIGJpdG1hcCA9IDA7XG4gICAgdmFyIHBhY2tlZElJID0gMDtcbiAgICB2YXIgcGFja2VkTm9kZXMgPSBuZXcgQXJyYXkoY291bnQpO1xuICAgIGZvciAodmFyIGlpID0gMCwgYml0ID0gMSwgbGVuID0gbm9kZXMubGVuZ3RoOyBpaSA8IGxlbjsgaWkrKywgYml0IDw8PSAxKSB7XG4gICAgICB2YXIgbm9kZSA9IG5vZGVzW2lpXTtcbiAgICAgIGlmIChub2RlICE9PSB1bmRlZmluZWQgJiYgaWkgIT09IGV4Y2x1ZGluZykge1xuICAgICAgICBiaXRtYXAgfD0gYml0O1xuICAgICAgICBwYWNrZWROb2Rlc1twYWNrZWRJSSsrXSA9IG5vZGU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXcgQml0bWFwSW5kZXhlZE5vZGUob3duZXJJRCwgYml0bWFwLCBwYWNrZWROb2Rlcyk7XG4gIH1cblxuICBmdW5jdGlvbiBleHBhbmROb2Rlcyhvd25lcklELCBub2RlcywgYml0bWFwLCBpbmNsdWRpbmcsIG5vZGUpIHtcbiAgICB2YXIgY291bnQgPSAwO1xuICAgIHZhciBleHBhbmRlZE5vZGVzID0gbmV3IEFycmF5KFNJWkUpO1xuICAgIGZvciAodmFyIGlpID0gMDsgYml0bWFwICE9PSAwOyBpaSsrLCBiaXRtYXAgPj4+PSAxKSB7XG4gICAgICBleHBhbmRlZE5vZGVzW2lpXSA9IGJpdG1hcCAmIDEgPyBub2Rlc1tjb3VudCsrXSA6IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgZXhwYW5kZWROb2Rlc1tpbmNsdWRpbmddID0gbm9kZTtcbiAgICByZXR1cm4gbmV3IEhhc2hBcnJheU1hcE5vZGUob3duZXJJRCwgY291bnQgKyAxLCBleHBhbmRlZE5vZGVzKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1lcmdlSW50b01hcFdpdGgobWFwLCBtZXJnZXIsIGl0ZXJhYmxlcykge1xuICAgIHZhciBpdGVycyA9IFtdO1xuICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBpdGVyYWJsZXMubGVuZ3RoOyBpaSsrKSB7XG4gICAgICB2YXIgdmFsdWUgPSBpdGVyYWJsZXNbaWldO1xuICAgICAgdmFyIGl0ZXIgPSBLZXllZEl0ZXJhYmxlKHZhbHVlKTtcbiAgICAgIGlmICghaXNJdGVyYWJsZSh2YWx1ZSkpIHtcbiAgICAgICAgaXRlciA9IGl0ZXIubWFwKGZ1bmN0aW9uKHYgKSB7cmV0dXJuIGZyb21KUyh2KX0pO1xuICAgICAgfVxuICAgICAgaXRlcnMucHVzaChpdGVyKTtcbiAgICB9XG4gICAgcmV0dXJuIG1lcmdlSW50b0NvbGxlY3Rpb25XaXRoKG1hcCwgbWVyZ2VyLCBpdGVycyk7XG4gIH1cblxuICBmdW5jdGlvbiBkZWVwTWVyZ2VyKGV4aXN0aW5nLCB2YWx1ZSwga2V5KSB7XG4gICAgcmV0dXJuIGV4aXN0aW5nICYmIGV4aXN0aW5nLm1lcmdlRGVlcCAmJiBpc0l0ZXJhYmxlKHZhbHVlKSA/XG4gICAgICBleGlzdGluZy5tZXJnZURlZXAodmFsdWUpIDpcbiAgICAgIGlzKGV4aXN0aW5nLCB2YWx1ZSkgPyBleGlzdGluZyA6IHZhbHVlO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVlcE1lcmdlcldpdGgobWVyZ2VyKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGV4aXN0aW5nLCB2YWx1ZSwga2V5KSAge1xuICAgICAgaWYgKGV4aXN0aW5nICYmIGV4aXN0aW5nLm1lcmdlRGVlcFdpdGggJiYgaXNJdGVyYWJsZSh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuIGV4aXN0aW5nLm1lcmdlRGVlcFdpdGgobWVyZ2VyLCB2YWx1ZSk7XG4gICAgICB9XG4gICAgICB2YXIgbmV4dFZhbHVlID0gbWVyZ2VyKGV4aXN0aW5nLCB2YWx1ZSwga2V5KTtcbiAgICAgIHJldHVybiBpcyhleGlzdGluZywgbmV4dFZhbHVlKSA/IGV4aXN0aW5nIDogbmV4dFZhbHVlO1xuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBtZXJnZUludG9Db2xsZWN0aW9uV2l0aChjb2xsZWN0aW9uLCBtZXJnZXIsIGl0ZXJzKSB7XG4gICAgaXRlcnMgPSBpdGVycy5maWx0ZXIoZnVuY3Rpb24oeCApIHtyZXR1cm4geC5zaXplICE9PSAwfSk7XG4gICAgaWYgKGl0ZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGNvbGxlY3Rpb247XG4gICAgfVxuICAgIGlmIChjb2xsZWN0aW9uLnNpemUgPT09IDAgJiYgIWNvbGxlY3Rpb24uX19vd25lcklEICYmIGl0ZXJzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgcmV0dXJuIGNvbGxlY3Rpb24uY29uc3RydWN0b3IoaXRlcnNbMF0pO1xuICAgIH1cbiAgICByZXR1cm4gY29sbGVjdGlvbi53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKGNvbGxlY3Rpb24gKSB7XG4gICAgICB2YXIgbWVyZ2VJbnRvTWFwID0gbWVyZ2VyID9cbiAgICAgICAgZnVuY3Rpb24odmFsdWUsIGtleSkgIHtcbiAgICAgICAgICBjb2xsZWN0aW9uLnVwZGF0ZShrZXksIE5PVF9TRVQsIGZ1bmN0aW9uKGV4aXN0aW5nIClcbiAgICAgICAgICAgIHtyZXR1cm4gZXhpc3RpbmcgPT09IE5PVF9TRVQgPyB2YWx1ZSA6IG1lcmdlcihleGlzdGluZywgdmFsdWUsIGtleSl9XG4gICAgICAgICAgKTtcbiAgICAgICAgfSA6XG4gICAgICAgIGZ1bmN0aW9uKHZhbHVlLCBrZXkpICB7XG4gICAgICAgICAgY29sbGVjdGlvbi5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBpdGVycy5sZW5ndGg7IGlpKyspIHtcbiAgICAgICAgaXRlcnNbaWldLmZvckVhY2gobWVyZ2VJbnRvTWFwKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZUluRGVlcE1hcChleGlzdGluZywga2V5UGF0aEl0ZXIsIG5vdFNldFZhbHVlLCB1cGRhdGVyKSB7XG4gICAgdmFyIGlzTm90U2V0ID0gZXhpc3RpbmcgPT09IE5PVF9TRVQ7XG4gICAgdmFyIHN0ZXAgPSBrZXlQYXRoSXRlci5uZXh0KCk7XG4gICAgaWYgKHN0ZXAuZG9uZSkge1xuICAgICAgdmFyIGV4aXN0aW5nVmFsdWUgPSBpc05vdFNldCA/IG5vdFNldFZhbHVlIDogZXhpc3Rpbmc7XG4gICAgICB2YXIgbmV3VmFsdWUgPSB1cGRhdGVyKGV4aXN0aW5nVmFsdWUpO1xuICAgICAgcmV0dXJuIG5ld1ZhbHVlID09PSBleGlzdGluZ1ZhbHVlID8gZXhpc3RpbmcgOiBuZXdWYWx1ZTtcbiAgICB9XG4gICAgaW52YXJpYW50KFxuICAgICAgaXNOb3RTZXQgfHwgKGV4aXN0aW5nICYmIGV4aXN0aW5nLnNldCksXG4gICAgICAnaW52YWxpZCBrZXlQYXRoJ1xuICAgICk7XG4gICAgdmFyIGtleSA9IHN0ZXAudmFsdWU7XG4gICAgdmFyIG5leHRFeGlzdGluZyA9IGlzTm90U2V0ID8gTk9UX1NFVCA6IGV4aXN0aW5nLmdldChrZXksIE5PVF9TRVQpO1xuICAgIHZhciBuZXh0VXBkYXRlZCA9IHVwZGF0ZUluRGVlcE1hcChcbiAgICAgIG5leHRFeGlzdGluZyxcbiAgICAgIGtleVBhdGhJdGVyLFxuICAgICAgbm90U2V0VmFsdWUsXG4gICAgICB1cGRhdGVyXG4gICAgKTtcbiAgICByZXR1cm4gbmV4dFVwZGF0ZWQgPT09IG5leHRFeGlzdGluZyA/IGV4aXN0aW5nIDpcbiAgICAgIG5leHRVcGRhdGVkID09PSBOT1RfU0VUID8gZXhpc3RpbmcucmVtb3ZlKGtleSkgOlxuICAgICAgKGlzTm90U2V0ID8gZW1wdHlNYXAoKSA6IGV4aXN0aW5nKS5zZXQoa2V5LCBuZXh0VXBkYXRlZCk7XG4gIH1cblxuICBmdW5jdGlvbiBwb3BDb3VudCh4KSB7XG4gICAgeCA9IHggLSAoKHggPj4gMSkgJiAweDU1NTU1NTU1KTtcbiAgICB4ID0gKHggJiAweDMzMzMzMzMzKSArICgoeCA+PiAyKSAmIDB4MzMzMzMzMzMpO1xuICAgIHggPSAoeCArICh4ID4+IDQpKSAmIDB4MGYwZjBmMGY7XG4gICAgeCA9IHggKyAoeCA+PiA4KTtcbiAgICB4ID0geCArICh4ID4+IDE2KTtcbiAgICByZXR1cm4geCAmIDB4N2Y7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRJbihhcnJheSwgaWR4LCB2YWwsIGNhbkVkaXQpIHtcbiAgICB2YXIgbmV3QXJyYXkgPSBjYW5FZGl0ID8gYXJyYXkgOiBhcnJDb3B5KGFycmF5KTtcbiAgICBuZXdBcnJheVtpZHhdID0gdmFsO1xuICAgIHJldHVybiBuZXdBcnJheTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNwbGljZUluKGFycmF5LCBpZHgsIHZhbCwgY2FuRWRpdCkge1xuICAgIHZhciBuZXdMZW4gPSBhcnJheS5sZW5ndGggKyAxO1xuICAgIGlmIChjYW5FZGl0ICYmIGlkeCArIDEgPT09IG5ld0xlbikge1xuICAgICAgYXJyYXlbaWR4XSA9IHZhbDtcbiAgICAgIHJldHVybiBhcnJheTtcbiAgICB9XG4gICAgdmFyIG5ld0FycmF5ID0gbmV3IEFycmF5KG5ld0xlbik7XG4gICAgdmFyIGFmdGVyID0gMDtcbiAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgbmV3TGVuOyBpaSsrKSB7XG4gICAgICBpZiAoaWkgPT09IGlkeCkge1xuICAgICAgICBuZXdBcnJheVtpaV0gPSB2YWw7XG4gICAgICAgIGFmdGVyID0gLTE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXdBcnJheVtpaV0gPSBhcnJheVtpaSArIGFmdGVyXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ld0FycmF5O1xuICB9XG5cbiAgZnVuY3Rpb24gc3BsaWNlT3V0KGFycmF5LCBpZHgsIGNhbkVkaXQpIHtcbiAgICB2YXIgbmV3TGVuID0gYXJyYXkubGVuZ3RoIC0gMTtcbiAgICBpZiAoY2FuRWRpdCAmJiBpZHggPT09IG5ld0xlbikge1xuICAgICAgYXJyYXkucG9wKCk7XG4gICAgICByZXR1cm4gYXJyYXk7XG4gICAgfVxuICAgIHZhciBuZXdBcnJheSA9IG5ldyBBcnJheShuZXdMZW4pO1xuICAgIHZhciBhZnRlciA9IDA7XG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IG5ld0xlbjsgaWkrKykge1xuICAgICAgaWYgKGlpID09PSBpZHgpIHtcbiAgICAgICAgYWZ0ZXIgPSAxO1xuICAgICAgfVxuICAgICAgbmV3QXJyYXlbaWldID0gYXJyYXlbaWkgKyBhZnRlcl07XG4gICAgfVxuICAgIHJldHVybiBuZXdBcnJheTtcbiAgfVxuXG4gIHZhciBNQVhfQVJSQVlfTUFQX1NJWkUgPSBTSVpFIC8gNDtcbiAgdmFyIE1BWF9CSVRNQVBfSU5ERVhFRF9TSVpFID0gU0laRSAvIDI7XG4gIHZhciBNSU5fSEFTSF9BUlJBWV9NQVBfU0laRSA9IFNJWkUgLyA0O1xuXG4gIGNyZWF0ZUNsYXNzKExpc3QsIEluZGV4ZWRDb2xsZWN0aW9uKTtcblxuICAgIC8vIEBwcmFnbWEgQ29uc3RydWN0aW9uXG5cbiAgICBmdW5jdGlvbiBMaXN0KHZhbHVlKSB7XG4gICAgICB2YXIgZW1wdHkgPSBlbXB0eUxpc3QoKTtcbiAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBlbXB0eTtcbiAgICAgIH1cbiAgICAgIGlmIChpc0xpc3QodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHZhciBpdGVyID0gSW5kZXhlZEl0ZXJhYmxlKHZhbHVlKTtcbiAgICAgIHZhciBzaXplID0gaXRlci5zaXplO1xuICAgICAgaWYgKHNpemUgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIGVtcHR5O1xuICAgICAgfVxuICAgICAgYXNzZXJ0Tm90SW5maW5pdGUoc2l6ZSk7XG4gICAgICBpZiAoc2l6ZSA+IDAgJiYgc2l6ZSA8IFNJWkUpIHtcbiAgICAgICAgcmV0dXJuIG1ha2VMaXN0KDAsIHNpemUsIFNISUZULCBudWxsLCBuZXcgVk5vZGUoaXRlci50b0FycmF5KCkpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBlbXB0eS53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKGxpc3QgKSB7XG4gICAgICAgIGxpc3Quc2V0U2l6ZShzaXplKTtcbiAgICAgICAgaXRlci5mb3JFYWNoKGZ1bmN0aW9uKHYsIGkpICB7cmV0dXJuIGxpc3Quc2V0KGksIHYpfSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBMaXN0Lm9mID0gZnVuY3Rpb24oLyouLi52YWx1ZXMqLykge1xuICAgICAgcmV0dXJuIHRoaXMoYXJndW1lbnRzKTtcbiAgICB9O1xuXG4gICAgTGlzdC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9fdG9TdHJpbmcoJ0xpc3QgWycsICddJyk7XG4gICAgfTtcblxuICAgIC8vIEBwcmFnbWEgQWNjZXNzXG5cbiAgICBMaXN0LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihpbmRleCwgbm90U2V0VmFsdWUpIHtcbiAgICAgIGluZGV4ID0gd3JhcEluZGV4KHRoaXMsIGluZGV4KTtcbiAgICAgIGlmIChpbmRleCA+PSAwICYmIGluZGV4IDwgdGhpcy5zaXplKSB7XG4gICAgICAgIGluZGV4ICs9IHRoaXMuX29yaWdpbjtcbiAgICAgICAgdmFyIG5vZGUgPSBsaXN0Tm9kZUZvcih0aGlzLCBpbmRleCk7XG4gICAgICAgIHJldHVybiBub2RlICYmIG5vZGUuYXJyYXlbaW5kZXggJiBNQVNLXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBub3RTZXRWYWx1ZTtcbiAgICB9O1xuXG4gICAgLy8gQHByYWdtYSBNb2RpZmljYXRpb25cblxuICAgIExpc3QucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuICAgICAgcmV0dXJuIHVwZGF0ZUxpc3QodGhpcywgaW5kZXgsIHZhbHVlKTtcbiAgICB9O1xuXG4gICAgTGlzdC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgIHJldHVybiAhdGhpcy5oYXMoaW5kZXgpID8gdGhpcyA6XG4gICAgICAgIGluZGV4ID09PSAwID8gdGhpcy5zaGlmdCgpIDpcbiAgICAgICAgaW5kZXggPT09IHRoaXMuc2l6ZSAtIDEgPyB0aGlzLnBvcCgpIDpcbiAgICAgICAgdGhpcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG5cbiAgICBMaXN0LnByb3RvdHlwZS5pbnNlcnQgPSBmdW5jdGlvbihpbmRleCwgdmFsdWUpIHtcbiAgICAgIHJldHVybiB0aGlzLnNwbGljZShpbmRleCwgMCwgdmFsdWUpO1xuICAgIH07XG5cbiAgICBMaXN0LnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuc2l6ZSA9PT0gMCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLl9fb3duZXJJRCkge1xuICAgICAgICB0aGlzLnNpemUgPSB0aGlzLl9vcmlnaW4gPSB0aGlzLl9jYXBhY2l0eSA9IDA7XG4gICAgICAgIHRoaXMuX2xldmVsID0gU0hJRlQ7XG4gICAgICAgIHRoaXMuX3Jvb3QgPSB0aGlzLl90YWlsID0gbnVsbDtcbiAgICAgICAgdGhpcy5fX2hhc2ggPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuX19hbHRlcmVkID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICByZXR1cm4gZW1wdHlMaXN0KCk7XG4gICAgfTtcblxuICAgIExpc3QucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbigvKi4uLnZhbHVlcyovKSB7XG4gICAgICB2YXIgdmFsdWVzID0gYXJndW1lbnRzO1xuICAgICAgdmFyIG9sZFNpemUgPSB0aGlzLnNpemU7XG4gICAgICByZXR1cm4gdGhpcy53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKGxpc3QgKSB7XG4gICAgICAgIHNldExpc3RCb3VuZHMobGlzdCwgMCwgb2xkU2l6ZSArIHZhbHVlcy5sZW5ndGgpO1xuICAgICAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgdmFsdWVzLmxlbmd0aDsgaWkrKykge1xuICAgICAgICAgIGxpc3Quc2V0KG9sZFNpemUgKyBpaSwgdmFsdWVzW2lpXSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBMaXN0LnByb3RvdHlwZS5wb3AgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBzZXRMaXN0Qm91bmRzKHRoaXMsIDAsIC0xKTtcbiAgICB9O1xuXG4gICAgTGlzdC5wcm90b3R5cGUudW5zaGlmdCA9IGZ1bmN0aW9uKC8qLi4udmFsdWVzKi8pIHtcbiAgICAgIHZhciB2YWx1ZXMgPSBhcmd1bWVudHM7XG4gICAgICByZXR1cm4gdGhpcy53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKGxpc3QgKSB7XG4gICAgICAgIHNldExpc3RCb3VuZHMobGlzdCwgLXZhbHVlcy5sZW5ndGgpO1xuICAgICAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgdmFsdWVzLmxlbmd0aDsgaWkrKykge1xuICAgICAgICAgIGxpc3Quc2V0KGlpLCB2YWx1ZXNbaWldKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIExpc3QucHJvdG90eXBlLnNoaWZ0ID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gc2V0TGlzdEJvdW5kcyh0aGlzLCAxKTtcbiAgICB9O1xuXG4gICAgLy8gQHByYWdtYSBDb21wb3NpdGlvblxuXG4gICAgTGlzdC5wcm90b3R5cGUubWVyZ2UgPSBmdW5jdGlvbigvKi4uLml0ZXJzKi8pIHtcbiAgICAgIHJldHVybiBtZXJnZUludG9MaXN0V2l0aCh0aGlzLCB1bmRlZmluZWQsIGFyZ3VtZW50cyk7XG4gICAgfTtcblxuICAgIExpc3QucHJvdG90eXBlLm1lcmdlV2l0aCA9IGZ1bmN0aW9uKG1lcmdlcikge3ZhciBpdGVycyA9IFNMSUNFJDAuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgcmV0dXJuIG1lcmdlSW50b0xpc3RXaXRoKHRoaXMsIG1lcmdlciwgaXRlcnMpO1xuICAgIH07XG5cbiAgICBMaXN0LnByb3RvdHlwZS5tZXJnZURlZXAgPSBmdW5jdGlvbigvKi4uLml0ZXJzKi8pIHtcbiAgICAgIHJldHVybiBtZXJnZUludG9MaXN0V2l0aCh0aGlzLCBkZWVwTWVyZ2VyLCBhcmd1bWVudHMpO1xuICAgIH07XG5cbiAgICBMaXN0LnByb3RvdHlwZS5tZXJnZURlZXBXaXRoID0gZnVuY3Rpb24obWVyZ2VyKSB7dmFyIGl0ZXJzID0gU0xJQ0UkMC5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICByZXR1cm4gbWVyZ2VJbnRvTGlzdFdpdGgodGhpcywgZGVlcE1lcmdlcldpdGgobWVyZ2VyKSwgaXRlcnMpO1xuICAgIH07XG5cbiAgICBMaXN0LnByb3RvdHlwZS5zZXRTaXplID0gZnVuY3Rpb24oc2l6ZSkge1xuICAgICAgcmV0dXJuIHNldExpc3RCb3VuZHModGhpcywgMCwgc2l6ZSk7XG4gICAgfTtcblxuICAgIC8vIEBwcmFnbWEgSXRlcmF0aW9uXG5cbiAgICBMaXN0LnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uKGJlZ2luLCBlbmQpIHtcbiAgICAgIHZhciBzaXplID0gdGhpcy5zaXplO1xuICAgICAgaWYgKHdob2xlU2xpY2UoYmVnaW4sIGVuZCwgc2l6ZSkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICByZXR1cm4gc2V0TGlzdEJvdW5kcyhcbiAgICAgICAgdGhpcyxcbiAgICAgICAgcmVzb2x2ZUJlZ2luKGJlZ2luLCBzaXplKSxcbiAgICAgICAgcmVzb2x2ZUVuZChlbmQsIHNpemUpXG4gICAgICApO1xuICAgIH07XG5cbiAgICBMaXN0LnByb3RvdHlwZS5fX2l0ZXJhdG9yID0gZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgICAgdmFyIGluZGV4ID0gMDtcbiAgICAgIHZhciB2YWx1ZXMgPSBpdGVyYXRlTGlzdCh0aGlzLCByZXZlcnNlKTtcbiAgICAgIHJldHVybiBuZXcgSXRlcmF0b3IoZnVuY3Rpb24oKSAge1xuICAgICAgICB2YXIgdmFsdWUgPSB2YWx1ZXMoKTtcbiAgICAgICAgcmV0dXJuIHZhbHVlID09PSBET05FID9cbiAgICAgICAgICBpdGVyYXRvckRvbmUoKSA6XG4gICAgICAgICAgaXRlcmF0b3JWYWx1ZSh0eXBlLCBpbmRleCsrLCB2YWx1ZSk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgTGlzdC5wcm90b3R5cGUuX19pdGVyYXRlID0gZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICAgIHZhciBpbmRleCA9IDA7XG4gICAgICB2YXIgdmFsdWVzID0gaXRlcmF0ZUxpc3QodGhpcywgcmV2ZXJzZSk7XG4gICAgICB2YXIgdmFsdWU7XG4gICAgICB3aGlsZSAoKHZhbHVlID0gdmFsdWVzKCkpICE9PSBET05FKSB7XG4gICAgICAgIGlmIChmbih2YWx1ZSwgaW5kZXgrKywgdGhpcykgPT09IGZhbHNlKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBpbmRleDtcbiAgICB9O1xuXG4gICAgTGlzdC5wcm90b3R5cGUuX19lbnN1cmVPd25lciA9IGZ1bmN0aW9uKG93bmVySUQpIHtcbiAgICAgIGlmIChvd25lcklEID09PSB0aGlzLl9fb3duZXJJRCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIGlmICghb3duZXJJRCkge1xuICAgICAgICB0aGlzLl9fb3duZXJJRCA9IG93bmVySUQ7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1ha2VMaXN0KHRoaXMuX29yaWdpbiwgdGhpcy5fY2FwYWNpdHksIHRoaXMuX2xldmVsLCB0aGlzLl9yb290LCB0aGlzLl90YWlsLCBvd25lcklELCB0aGlzLl9faGFzaCk7XG4gICAgfTtcblxuXG4gIGZ1bmN0aW9uIGlzTGlzdChtYXliZUxpc3QpIHtcbiAgICByZXR1cm4gISEobWF5YmVMaXN0ICYmIG1heWJlTGlzdFtJU19MSVNUX1NFTlRJTkVMXSk7XG4gIH1cblxuICBMaXN0LmlzTGlzdCA9IGlzTGlzdDtcblxuICB2YXIgSVNfTElTVF9TRU5USU5FTCA9ICdAQF9fSU1NVVRBQkxFX0xJU1RfX0BAJztcblxuICB2YXIgTGlzdFByb3RvdHlwZSA9IExpc3QucHJvdG90eXBlO1xuICBMaXN0UHJvdG90eXBlW0lTX0xJU1RfU0VOVElORUxdID0gdHJ1ZTtcbiAgTGlzdFByb3RvdHlwZVtERUxFVEVdID0gTGlzdFByb3RvdHlwZS5yZW1vdmU7XG4gIExpc3RQcm90b3R5cGUuc2V0SW4gPSBNYXBQcm90b3R5cGUuc2V0SW47XG4gIExpc3RQcm90b3R5cGUuZGVsZXRlSW4gPVxuICBMaXN0UHJvdG90eXBlLnJlbW92ZUluID0gTWFwUHJvdG90eXBlLnJlbW92ZUluO1xuICBMaXN0UHJvdG90eXBlLnVwZGF0ZSA9IE1hcFByb3RvdHlwZS51cGRhdGU7XG4gIExpc3RQcm90b3R5cGUudXBkYXRlSW4gPSBNYXBQcm90b3R5cGUudXBkYXRlSW47XG4gIExpc3RQcm90b3R5cGUubWVyZ2VJbiA9IE1hcFByb3RvdHlwZS5tZXJnZUluO1xuICBMaXN0UHJvdG90eXBlLm1lcmdlRGVlcEluID0gTWFwUHJvdG90eXBlLm1lcmdlRGVlcEluO1xuICBMaXN0UHJvdG90eXBlLndpdGhNdXRhdGlvbnMgPSBNYXBQcm90b3R5cGUud2l0aE11dGF0aW9ucztcbiAgTGlzdFByb3RvdHlwZS5hc011dGFibGUgPSBNYXBQcm90b3R5cGUuYXNNdXRhYmxlO1xuICBMaXN0UHJvdG90eXBlLmFzSW1tdXRhYmxlID0gTWFwUHJvdG90eXBlLmFzSW1tdXRhYmxlO1xuICBMaXN0UHJvdG90eXBlLndhc0FsdGVyZWQgPSBNYXBQcm90b3R5cGUud2FzQWx0ZXJlZDtcblxuXG5cbiAgICBmdW5jdGlvbiBWTm9kZShhcnJheSwgb3duZXJJRCkge1xuICAgICAgdGhpcy5hcnJheSA9IGFycmF5O1xuICAgICAgdGhpcy5vd25lcklEID0gb3duZXJJRDtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBzZWVtcyBsaWtlIHRoZXNlIG1ldGhvZHMgYXJlIHZlcnkgc2ltaWxhclxuXG4gICAgVk5vZGUucHJvdG90eXBlLnJlbW92ZUJlZm9yZSA9IGZ1bmN0aW9uKG93bmVySUQsIGxldmVsLCBpbmRleCkge1xuICAgICAgaWYgKGluZGV4ID09PSBsZXZlbCA/IDEgPDwgbGV2ZWwgOiAwIHx8IHRoaXMuYXJyYXkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgdmFyIG9yaWdpbkluZGV4ID0gKGluZGV4ID4+PiBsZXZlbCkgJiBNQVNLO1xuICAgICAgaWYgKG9yaWdpbkluZGV4ID49IHRoaXMuYXJyYXkubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBuZXcgVk5vZGUoW10sIG93bmVySUQpO1xuICAgICAgfVxuICAgICAgdmFyIHJlbW92aW5nRmlyc3QgPSBvcmlnaW5JbmRleCA9PT0gMDtcbiAgICAgIHZhciBuZXdDaGlsZDtcbiAgICAgIGlmIChsZXZlbCA+IDApIHtcbiAgICAgICAgdmFyIG9sZENoaWxkID0gdGhpcy5hcnJheVtvcmlnaW5JbmRleF07XG4gICAgICAgIG5ld0NoaWxkID0gb2xkQ2hpbGQgJiYgb2xkQ2hpbGQucmVtb3ZlQmVmb3JlKG93bmVySUQsIGxldmVsIC0gU0hJRlQsIGluZGV4KTtcbiAgICAgICAgaWYgKG5ld0NoaWxkID09PSBvbGRDaGlsZCAmJiByZW1vdmluZ0ZpcnN0KSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChyZW1vdmluZ0ZpcnN0ICYmICFuZXdDaGlsZCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHZhciBlZGl0YWJsZSA9IGVkaXRhYmxlVk5vZGUodGhpcywgb3duZXJJRCk7XG4gICAgICBpZiAoIXJlbW92aW5nRmlyc3QpIHtcbiAgICAgICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IG9yaWdpbkluZGV4OyBpaSsrKSB7XG4gICAgICAgICAgZWRpdGFibGUuYXJyYXlbaWldID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAobmV3Q2hpbGQpIHtcbiAgICAgICAgZWRpdGFibGUuYXJyYXlbb3JpZ2luSW5kZXhdID0gbmV3Q2hpbGQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gZWRpdGFibGU7XG4gICAgfTtcblxuICAgIFZOb2RlLnByb3RvdHlwZS5yZW1vdmVBZnRlciA9IGZ1bmN0aW9uKG93bmVySUQsIGxldmVsLCBpbmRleCkge1xuICAgICAgaWYgKGluZGV4ID09PSAobGV2ZWwgPyAxIDw8IGxldmVsIDogMCkgfHwgdGhpcy5hcnJheS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICB2YXIgc2l6ZUluZGV4ID0gKChpbmRleCAtIDEpID4+PiBsZXZlbCkgJiBNQVNLO1xuICAgICAgaWYgKHNpemVJbmRleCA+PSB0aGlzLmFycmF5Lmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cblxuICAgICAgdmFyIG5ld0NoaWxkO1xuICAgICAgaWYgKGxldmVsID4gMCkge1xuICAgICAgICB2YXIgb2xkQ2hpbGQgPSB0aGlzLmFycmF5W3NpemVJbmRleF07XG4gICAgICAgIG5ld0NoaWxkID0gb2xkQ2hpbGQgJiYgb2xkQ2hpbGQucmVtb3ZlQWZ0ZXIob3duZXJJRCwgbGV2ZWwgLSBTSElGVCwgaW5kZXgpO1xuICAgICAgICBpZiAobmV3Q2hpbGQgPT09IG9sZENoaWxkICYmIHNpemVJbmRleCA9PT0gdGhpcy5hcnJheS5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdmFyIGVkaXRhYmxlID0gZWRpdGFibGVWTm9kZSh0aGlzLCBvd25lcklEKTtcbiAgICAgIGVkaXRhYmxlLmFycmF5LnNwbGljZShzaXplSW5kZXggKyAxKTtcbiAgICAgIGlmIChuZXdDaGlsZCkge1xuICAgICAgICBlZGl0YWJsZS5hcnJheVtzaXplSW5kZXhdID0gbmV3Q2hpbGQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gZWRpdGFibGU7XG4gICAgfTtcblxuXG5cbiAgdmFyIERPTkUgPSB7fTtcblxuICBmdW5jdGlvbiBpdGVyYXRlTGlzdChsaXN0LCByZXZlcnNlKSB7XG4gICAgdmFyIGxlZnQgPSBsaXN0Ll9vcmlnaW47XG4gICAgdmFyIHJpZ2h0ID0gbGlzdC5fY2FwYWNpdHk7XG4gICAgdmFyIHRhaWxQb3MgPSBnZXRUYWlsT2Zmc2V0KHJpZ2h0KTtcbiAgICB2YXIgdGFpbCA9IGxpc3QuX3RhaWw7XG5cbiAgICByZXR1cm4gaXRlcmF0ZU5vZGVPckxlYWYobGlzdC5fcm9vdCwgbGlzdC5fbGV2ZWwsIDApO1xuXG4gICAgZnVuY3Rpb24gaXRlcmF0ZU5vZGVPckxlYWYobm9kZSwgbGV2ZWwsIG9mZnNldCkge1xuICAgICAgcmV0dXJuIGxldmVsID09PSAwID9cbiAgICAgICAgaXRlcmF0ZUxlYWYobm9kZSwgb2Zmc2V0KSA6XG4gICAgICAgIGl0ZXJhdGVOb2RlKG5vZGUsIGxldmVsLCBvZmZzZXQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGl0ZXJhdGVMZWFmKG5vZGUsIG9mZnNldCkge1xuICAgICAgdmFyIGFycmF5ID0gb2Zmc2V0ID09PSB0YWlsUG9zID8gdGFpbCAmJiB0YWlsLmFycmF5IDogbm9kZSAmJiBub2RlLmFycmF5O1xuICAgICAgdmFyIGZyb20gPSBvZmZzZXQgPiBsZWZ0ID8gMCA6IGxlZnQgLSBvZmZzZXQ7XG4gICAgICB2YXIgdG8gPSByaWdodCAtIG9mZnNldDtcbiAgICAgIGlmICh0byA+IFNJWkUpIHtcbiAgICAgICAgdG8gPSBTSVpFO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZ1bmN0aW9uKCkgIHtcbiAgICAgICAgaWYgKGZyb20gPT09IHRvKSB7XG4gICAgICAgICAgcmV0dXJuIERPTkU7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGlkeCA9IHJldmVyc2UgPyAtLXRvIDogZnJvbSsrO1xuICAgICAgICByZXR1cm4gYXJyYXkgJiYgYXJyYXlbaWR4XTtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXRlcmF0ZU5vZGUobm9kZSwgbGV2ZWwsIG9mZnNldCkge1xuICAgICAgdmFyIHZhbHVlcztcbiAgICAgIHZhciBhcnJheSA9IG5vZGUgJiYgbm9kZS5hcnJheTtcbiAgICAgIHZhciBmcm9tID0gb2Zmc2V0ID4gbGVmdCA/IDAgOiAobGVmdCAtIG9mZnNldCkgPj4gbGV2ZWw7XG4gICAgICB2YXIgdG8gPSAoKHJpZ2h0IC0gb2Zmc2V0KSA+PiBsZXZlbCkgKyAxO1xuICAgICAgaWYgKHRvID4gU0laRSkge1xuICAgICAgICB0byA9IFNJWkU7XG4gICAgICB9XG4gICAgICByZXR1cm4gZnVuY3Rpb24oKSAge1xuICAgICAgICBkbyB7XG4gICAgICAgICAgaWYgKHZhbHVlcykge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gdmFsdWVzKCk7XG4gICAgICAgICAgICBpZiAodmFsdWUgIT09IERPTkUpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFsdWVzID0gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGZyb20gPT09IHRvKSB7XG4gICAgICAgICAgICByZXR1cm4gRE9ORTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGlkeCA9IHJldmVyc2UgPyAtLXRvIDogZnJvbSsrO1xuICAgICAgICAgIHZhbHVlcyA9IGl0ZXJhdGVOb2RlT3JMZWFmKFxuICAgICAgICAgICAgYXJyYXkgJiYgYXJyYXlbaWR4XSwgbGV2ZWwgLSBTSElGVCwgb2Zmc2V0ICsgKGlkeCA8PCBsZXZlbClcbiAgICAgICAgICApO1xuICAgICAgICB9IHdoaWxlICh0cnVlKTtcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbWFrZUxpc3Qob3JpZ2luLCBjYXBhY2l0eSwgbGV2ZWwsIHJvb3QsIHRhaWwsIG93bmVySUQsIGhhc2gpIHtcbiAgICB2YXIgbGlzdCA9IE9iamVjdC5jcmVhdGUoTGlzdFByb3RvdHlwZSk7XG4gICAgbGlzdC5zaXplID0gY2FwYWNpdHkgLSBvcmlnaW47XG4gICAgbGlzdC5fb3JpZ2luID0gb3JpZ2luO1xuICAgIGxpc3QuX2NhcGFjaXR5ID0gY2FwYWNpdHk7XG4gICAgbGlzdC5fbGV2ZWwgPSBsZXZlbDtcbiAgICBsaXN0Ll9yb290ID0gcm9vdDtcbiAgICBsaXN0Ll90YWlsID0gdGFpbDtcbiAgICBsaXN0Ll9fb3duZXJJRCA9IG93bmVySUQ7XG4gICAgbGlzdC5fX2hhc2ggPSBoYXNoO1xuICAgIGxpc3QuX19hbHRlcmVkID0gZmFsc2U7XG4gICAgcmV0dXJuIGxpc3Q7XG4gIH1cblxuICB2YXIgRU1QVFlfTElTVDtcbiAgZnVuY3Rpb24gZW1wdHlMaXN0KCkge1xuICAgIHJldHVybiBFTVBUWV9MSVNUIHx8IChFTVBUWV9MSVNUID0gbWFrZUxpc3QoMCwgMCwgU0hJRlQpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZUxpc3QobGlzdCwgaW5kZXgsIHZhbHVlKSB7XG4gICAgaW5kZXggPSB3cmFwSW5kZXgobGlzdCwgaW5kZXgpO1xuXG4gICAgaWYgKGluZGV4ICE9PSBpbmRleCkge1xuICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuXG4gICAgaWYgKGluZGV4ID49IGxpc3Quc2l6ZSB8fCBpbmRleCA8IDApIHtcbiAgICAgIHJldHVybiBsaXN0LndpdGhNdXRhdGlvbnMoZnVuY3Rpb24obGlzdCApIHtcbiAgICAgICAgaW5kZXggPCAwID9cbiAgICAgICAgICBzZXRMaXN0Qm91bmRzKGxpc3QsIGluZGV4KS5zZXQoMCwgdmFsdWUpIDpcbiAgICAgICAgICBzZXRMaXN0Qm91bmRzKGxpc3QsIDAsIGluZGV4ICsgMSkuc2V0KGluZGV4LCB2YWx1ZSlcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGluZGV4ICs9IGxpc3QuX29yaWdpbjtcblxuICAgIHZhciBuZXdUYWlsID0gbGlzdC5fdGFpbDtcbiAgICB2YXIgbmV3Um9vdCA9IGxpc3QuX3Jvb3Q7XG4gICAgdmFyIGRpZEFsdGVyID0gTWFrZVJlZihESURfQUxURVIpO1xuICAgIGlmIChpbmRleCA+PSBnZXRUYWlsT2Zmc2V0KGxpc3QuX2NhcGFjaXR5KSkge1xuICAgICAgbmV3VGFpbCA9IHVwZGF0ZVZOb2RlKG5ld1RhaWwsIGxpc3QuX19vd25lcklELCAwLCBpbmRleCwgdmFsdWUsIGRpZEFsdGVyKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmV3Um9vdCA9IHVwZGF0ZVZOb2RlKG5ld1Jvb3QsIGxpc3QuX19vd25lcklELCBsaXN0Ll9sZXZlbCwgaW5kZXgsIHZhbHVlLCBkaWRBbHRlcik7XG4gICAgfVxuXG4gICAgaWYgKCFkaWRBbHRlci52YWx1ZSkge1xuICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuXG4gICAgaWYgKGxpc3QuX19vd25lcklEKSB7XG4gICAgICBsaXN0Ll9yb290ID0gbmV3Um9vdDtcbiAgICAgIGxpc3QuX3RhaWwgPSBuZXdUYWlsO1xuICAgICAgbGlzdC5fX2hhc2ggPSB1bmRlZmluZWQ7XG4gICAgICBsaXN0Ll9fYWx0ZXJlZCA9IHRydWU7XG4gICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG4gICAgcmV0dXJuIG1ha2VMaXN0KGxpc3QuX29yaWdpbiwgbGlzdC5fY2FwYWNpdHksIGxpc3QuX2xldmVsLCBuZXdSb290LCBuZXdUYWlsKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZVZOb2RlKG5vZGUsIG93bmVySUQsIGxldmVsLCBpbmRleCwgdmFsdWUsIGRpZEFsdGVyKSB7XG4gICAgdmFyIGlkeCA9IChpbmRleCA+Pj4gbGV2ZWwpICYgTUFTSztcbiAgICB2YXIgbm9kZUhhcyA9IG5vZGUgJiYgaWR4IDwgbm9kZS5hcnJheS5sZW5ndGg7XG4gICAgaWYgKCFub2RlSGFzICYmIHZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cblxuICAgIHZhciBuZXdOb2RlO1xuXG4gICAgaWYgKGxldmVsID4gMCkge1xuICAgICAgdmFyIGxvd2VyTm9kZSA9IG5vZGUgJiYgbm9kZS5hcnJheVtpZHhdO1xuICAgICAgdmFyIG5ld0xvd2VyTm9kZSA9IHVwZGF0ZVZOb2RlKGxvd2VyTm9kZSwgb3duZXJJRCwgbGV2ZWwgLSBTSElGVCwgaW5kZXgsIHZhbHVlLCBkaWRBbHRlcik7XG4gICAgICBpZiAobmV3TG93ZXJOb2RlID09PSBsb3dlck5vZGUpIHtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgICB9XG4gICAgICBuZXdOb2RlID0gZWRpdGFibGVWTm9kZShub2RlLCBvd25lcklEKTtcbiAgICAgIG5ld05vZGUuYXJyYXlbaWR4XSA9IG5ld0xvd2VyTm9kZTtcbiAgICAgIHJldHVybiBuZXdOb2RlO1xuICAgIH1cblxuICAgIGlmIChub2RlSGFzICYmIG5vZGUuYXJyYXlbaWR4XSA9PT0gdmFsdWUpIHtcbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cblxuICAgIFNldFJlZihkaWRBbHRlcik7XG5cbiAgICBuZXdOb2RlID0gZWRpdGFibGVWTm9kZShub2RlLCBvd25lcklEKTtcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCAmJiBpZHggPT09IG5ld05vZGUuYXJyYXkubGVuZ3RoIC0gMSkge1xuICAgICAgbmV3Tm9kZS5hcnJheS5wb3AoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmV3Tm9kZS5hcnJheVtpZHhdID0gdmFsdWU7XG4gICAgfVxuICAgIHJldHVybiBuZXdOb2RlO1xuICB9XG5cbiAgZnVuY3Rpb24gZWRpdGFibGVWTm9kZShub2RlLCBvd25lcklEKSB7XG4gICAgaWYgKG93bmVySUQgJiYgbm9kZSAmJiBvd25lcklEID09PSBub2RlLm93bmVySUQpIHtcbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IFZOb2RlKG5vZGUgPyBub2RlLmFycmF5LnNsaWNlKCkgOiBbXSwgb3duZXJJRCk7XG4gIH1cblxuICBmdW5jdGlvbiBsaXN0Tm9kZUZvcihsaXN0LCByYXdJbmRleCkge1xuICAgIGlmIChyYXdJbmRleCA+PSBnZXRUYWlsT2Zmc2V0KGxpc3QuX2NhcGFjaXR5KSkge1xuICAgICAgcmV0dXJuIGxpc3QuX3RhaWw7XG4gICAgfVxuICAgIGlmIChyYXdJbmRleCA8IDEgPDwgKGxpc3QuX2xldmVsICsgU0hJRlQpKSB7XG4gICAgICB2YXIgbm9kZSA9IGxpc3QuX3Jvb3Q7XG4gICAgICB2YXIgbGV2ZWwgPSBsaXN0Ll9sZXZlbDtcbiAgICAgIHdoaWxlIChub2RlICYmIGxldmVsID4gMCkge1xuICAgICAgICBub2RlID0gbm9kZS5hcnJheVsocmF3SW5kZXggPj4+IGxldmVsKSAmIE1BU0tdO1xuICAgICAgICBsZXZlbCAtPSBTSElGVDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNldExpc3RCb3VuZHMobGlzdCwgYmVnaW4sIGVuZCkge1xuICAgIC8vIFNhbml0aXplIGJlZ2luICYgZW5kIHVzaW5nIHRoaXMgc2hvcnRoYW5kIGZvciBUb0ludDMyKGFyZ3VtZW50KVxuICAgIC8vIGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi82LjAvI3NlYy10b2ludDMyXG4gICAgaWYgKGJlZ2luICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGJlZ2luID0gYmVnaW4gfCAwO1xuICAgIH1cbiAgICBpZiAoZW5kICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGVuZCA9IGVuZCB8IDA7XG4gICAgfVxuICAgIHZhciBvd25lciA9IGxpc3QuX19vd25lcklEIHx8IG5ldyBPd25lcklEKCk7XG4gICAgdmFyIG9sZE9yaWdpbiA9IGxpc3QuX29yaWdpbjtcbiAgICB2YXIgb2xkQ2FwYWNpdHkgPSBsaXN0Ll9jYXBhY2l0eTtcbiAgICB2YXIgbmV3T3JpZ2luID0gb2xkT3JpZ2luICsgYmVnaW47XG4gICAgdmFyIG5ld0NhcGFjaXR5ID0gZW5kID09PSB1bmRlZmluZWQgPyBvbGRDYXBhY2l0eSA6IGVuZCA8IDAgPyBvbGRDYXBhY2l0eSArIGVuZCA6IG9sZE9yaWdpbiArIGVuZDtcbiAgICBpZiAobmV3T3JpZ2luID09PSBvbGRPcmlnaW4gJiYgbmV3Q2FwYWNpdHkgPT09IG9sZENhcGFjaXR5KSB7XG4gICAgICByZXR1cm4gbGlzdDtcbiAgICB9XG5cbiAgICAvLyBJZiBpdCdzIGdvaW5nIHRvIGVuZCBhZnRlciBpdCBzdGFydHMsIGl0J3MgZW1wdHkuXG4gICAgaWYgKG5ld09yaWdpbiA+PSBuZXdDYXBhY2l0eSkge1xuICAgICAgcmV0dXJuIGxpc3QuY2xlYXIoKTtcbiAgICB9XG5cbiAgICB2YXIgbmV3TGV2ZWwgPSBsaXN0Ll9sZXZlbDtcbiAgICB2YXIgbmV3Um9vdCA9IGxpc3QuX3Jvb3Q7XG5cbiAgICAvLyBOZXcgb3JpZ2luIG1pZ2h0IG5lZWQgY3JlYXRpbmcgYSBoaWdoZXIgcm9vdC5cbiAgICB2YXIgb2Zmc2V0U2hpZnQgPSAwO1xuICAgIHdoaWxlIChuZXdPcmlnaW4gKyBvZmZzZXRTaGlmdCA8IDApIHtcbiAgICAgIG5ld1Jvb3QgPSBuZXcgVk5vZGUobmV3Um9vdCAmJiBuZXdSb290LmFycmF5Lmxlbmd0aCA/IFt1bmRlZmluZWQsIG5ld1Jvb3RdIDogW10sIG93bmVyKTtcbiAgICAgIG5ld0xldmVsICs9IFNISUZUO1xuICAgICAgb2Zmc2V0U2hpZnQgKz0gMSA8PCBuZXdMZXZlbDtcbiAgICB9XG4gICAgaWYgKG9mZnNldFNoaWZ0KSB7XG4gICAgICBuZXdPcmlnaW4gKz0gb2Zmc2V0U2hpZnQ7XG4gICAgICBvbGRPcmlnaW4gKz0gb2Zmc2V0U2hpZnQ7XG4gICAgICBuZXdDYXBhY2l0eSArPSBvZmZzZXRTaGlmdDtcbiAgICAgIG9sZENhcGFjaXR5ICs9IG9mZnNldFNoaWZ0O1xuICAgIH1cblxuICAgIHZhciBvbGRUYWlsT2Zmc2V0ID0gZ2V0VGFpbE9mZnNldChvbGRDYXBhY2l0eSk7XG4gICAgdmFyIG5ld1RhaWxPZmZzZXQgPSBnZXRUYWlsT2Zmc2V0KG5ld0NhcGFjaXR5KTtcblxuICAgIC8vIE5ldyBzaXplIG1pZ2h0IG5lZWQgY3JlYXRpbmcgYSBoaWdoZXIgcm9vdC5cbiAgICB3aGlsZSAobmV3VGFpbE9mZnNldCA+PSAxIDw8IChuZXdMZXZlbCArIFNISUZUKSkge1xuICAgICAgbmV3Um9vdCA9IG5ldyBWTm9kZShuZXdSb290ICYmIG5ld1Jvb3QuYXJyYXkubGVuZ3RoID8gW25ld1Jvb3RdIDogW10sIG93bmVyKTtcbiAgICAgIG5ld0xldmVsICs9IFNISUZUO1xuICAgIH1cblxuICAgIC8vIExvY2F0ZSBvciBjcmVhdGUgdGhlIG5ldyB0YWlsLlxuICAgIHZhciBvbGRUYWlsID0gbGlzdC5fdGFpbDtcbiAgICB2YXIgbmV3VGFpbCA9IG5ld1RhaWxPZmZzZXQgPCBvbGRUYWlsT2Zmc2V0ID9cbiAgICAgIGxpc3ROb2RlRm9yKGxpc3QsIG5ld0NhcGFjaXR5IC0gMSkgOlxuICAgICAgbmV3VGFpbE9mZnNldCA+IG9sZFRhaWxPZmZzZXQgPyBuZXcgVk5vZGUoW10sIG93bmVyKSA6IG9sZFRhaWw7XG5cbiAgICAvLyBNZXJnZSBUYWlsIGludG8gdHJlZS5cbiAgICBpZiAob2xkVGFpbCAmJiBuZXdUYWlsT2Zmc2V0ID4gb2xkVGFpbE9mZnNldCAmJiBuZXdPcmlnaW4gPCBvbGRDYXBhY2l0eSAmJiBvbGRUYWlsLmFycmF5Lmxlbmd0aCkge1xuICAgICAgbmV3Um9vdCA9IGVkaXRhYmxlVk5vZGUobmV3Um9vdCwgb3duZXIpO1xuICAgICAgdmFyIG5vZGUgPSBuZXdSb290O1xuICAgICAgZm9yICh2YXIgbGV2ZWwgPSBuZXdMZXZlbDsgbGV2ZWwgPiBTSElGVDsgbGV2ZWwgLT0gU0hJRlQpIHtcbiAgICAgICAgdmFyIGlkeCA9IChvbGRUYWlsT2Zmc2V0ID4+PiBsZXZlbCkgJiBNQVNLO1xuICAgICAgICBub2RlID0gbm9kZS5hcnJheVtpZHhdID0gZWRpdGFibGVWTm9kZShub2RlLmFycmF5W2lkeF0sIG93bmVyKTtcbiAgICAgIH1cbiAgICAgIG5vZGUuYXJyYXlbKG9sZFRhaWxPZmZzZXQgPj4+IFNISUZUKSAmIE1BU0tdID0gb2xkVGFpbDtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgc2l6ZSBoYXMgYmVlbiByZWR1Y2VkLCB0aGVyZSdzIGEgY2hhbmNlIHRoZSB0YWlsIG5lZWRzIHRvIGJlIHRyaW1tZWQuXG4gICAgaWYgKG5ld0NhcGFjaXR5IDwgb2xkQ2FwYWNpdHkpIHtcbiAgICAgIG5ld1RhaWwgPSBuZXdUYWlsICYmIG5ld1RhaWwucmVtb3ZlQWZ0ZXIob3duZXIsIDAsIG5ld0NhcGFjaXR5KTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgbmV3IG9yaWdpbiBpcyB3aXRoaW4gdGhlIHRhaWwsIHRoZW4gd2UgZG8gbm90IG5lZWQgYSByb290LlxuICAgIGlmIChuZXdPcmlnaW4gPj0gbmV3VGFpbE9mZnNldCkge1xuICAgICAgbmV3T3JpZ2luIC09IG5ld1RhaWxPZmZzZXQ7XG4gICAgICBuZXdDYXBhY2l0eSAtPSBuZXdUYWlsT2Zmc2V0O1xuICAgICAgbmV3TGV2ZWwgPSBTSElGVDtcbiAgICAgIG5ld1Jvb3QgPSBudWxsO1xuICAgICAgbmV3VGFpbCA9IG5ld1RhaWwgJiYgbmV3VGFpbC5yZW1vdmVCZWZvcmUob3duZXIsIDAsIG5ld09yaWdpbik7XG5cbiAgICAvLyBPdGhlcndpc2UsIGlmIHRoZSByb290IGhhcyBiZWVuIHRyaW1tZWQsIGdhcmJhZ2UgY29sbGVjdC5cbiAgICB9IGVsc2UgaWYgKG5ld09yaWdpbiA+IG9sZE9yaWdpbiB8fCBuZXdUYWlsT2Zmc2V0IDwgb2xkVGFpbE9mZnNldCkge1xuICAgICAgb2Zmc2V0U2hpZnQgPSAwO1xuXG4gICAgICAvLyBJZGVudGlmeSB0aGUgbmV3IHRvcCByb290IG5vZGUgb2YgdGhlIHN1YnRyZWUgb2YgdGhlIG9sZCByb290LlxuICAgICAgd2hpbGUgKG5ld1Jvb3QpIHtcbiAgICAgICAgdmFyIGJlZ2luSW5kZXggPSAobmV3T3JpZ2luID4+PiBuZXdMZXZlbCkgJiBNQVNLO1xuICAgICAgICBpZiAoYmVnaW5JbmRleCAhPT0gKG5ld1RhaWxPZmZzZXQgPj4+IG5ld0xldmVsKSAmIE1BU0spIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoYmVnaW5JbmRleCkge1xuICAgICAgICAgIG9mZnNldFNoaWZ0ICs9ICgxIDw8IG5ld0xldmVsKSAqIGJlZ2luSW5kZXg7XG4gICAgICAgIH1cbiAgICAgICAgbmV3TGV2ZWwgLT0gU0hJRlQ7XG4gICAgICAgIG5ld1Jvb3QgPSBuZXdSb290LmFycmF5W2JlZ2luSW5kZXhdO1xuICAgICAgfVxuXG4gICAgICAvLyBUcmltIHRoZSBuZXcgc2lkZXMgb2YgdGhlIG5ldyByb290LlxuICAgICAgaWYgKG5ld1Jvb3QgJiYgbmV3T3JpZ2luID4gb2xkT3JpZ2luKSB7XG4gICAgICAgIG5ld1Jvb3QgPSBuZXdSb290LnJlbW92ZUJlZm9yZShvd25lciwgbmV3TGV2ZWwsIG5ld09yaWdpbiAtIG9mZnNldFNoaWZ0KTtcbiAgICAgIH1cbiAgICAgIGlmIChuZXdSb290ICYmIG5ld1RhaWxPZmZzZXQgPCBvbGRUYWlsT2Zmc2V0KSB7XG4gICAgICAgIG5ld1Jvb3QgPSBuZXdSb290LnJlbW92ZUFmdGVyKG93bmVyLCBuZXdMZXZlbCwgbmV3VGFpbE9mZnNldCAtIG9mZnNldFNoaWZ0KTtcbiAgICAgIH1cbiAgICAgIGlmIChvZmZzZXRTaGlmdCkge1xuICAgICAgICBuZXdPcmlnaW4gLT0gb2Zmc2V0U2hpZnQ7XG4gICAgICAgIG5ld0NhcGFjaXR5IC09IG9mZnNldFNoaWZ0O1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChsaXN0Ll9fb3duZXJJRCkge1xuICAgICAgbGlzdC5zaXplID0gbmV3Q2FwYWNpdHkgLSBuZXdPcmlnaW47XG4gICAgICBsaXN0Ll9vcmlnaW4gPSBuZXdPcmlnaW47XG4gICAgICBsaXN0Ll9jYXBhY2l0eSA9IG5ld0NhcGFjaXR5O1xuICAgICAgbGlzdC5fbGV2ZWwgPSBuZXdMZXZlbDtcbiAgICAgIGxpc3QuX3Jvb3QgPSBuZXdSb290O1xuICAgICAgbGlzdC5fdGFpbCA9IG5ld1RhaWw7XG4gICAgICBsaXN0Ll9faGFzaCA9IHVuZGVmaW5lZDtcbiAgICAgIGxpc3QuX19hbHRlcmVkID0gdHJ1ZTtcbiAgICAgIHJldHVybiBsaXN0O1xuICAgIH1cbiAgICByZXR1cm4gbWFrZUxpc3QobmV3T3JpZ2luLCBuZXdDYXBhY2l0eSwgbmV3TGV2ZWwsIG5ld1Jvb3QsIG5ld1RhaWwpO1xuICB9XG5cbiAgZnVuY3Rpb24gbWVyZ2VJbnRvTGlzdFdpdGgobGlzdCwgbWVyZ2VyLCBpdGVyYWJsZXMpIHtcbiAgICB2YXIgaXRlcnMgPSBbXTtcbiAgICB2YXIgbWF4U2l6ZSA9IDA7XG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IGl0ZXJhYmxlcy5sZW5ndGg7IGlpKyspIHtcbiAgICAgIHZhciB2YWx1ZSA9IGl0ZXJhYmxlc1tpaV07XG4gICAgICB2YXIgaXRlciA9IEluZGV4ZWRJdGVyYWJsZSh2YWx1ZSk7XG4gICAgICBpZiAoaXRlci5zaXplID4gbWF4U2l6ZSkge1xuICAgICAgICBtYXhTaXplID0gaXRlci5zaXplO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0l0ZXJhYmxlKHZhbHVlKSkge1xuICAgICAgICBpdGVyID0gaXRlci5tYXAoZnVuY3Rpb24odiApIHtyZXR1cm4gZnJvbUpTKHYpfSk7XG4gICAgICB9XG4gICAgICBpdGVycy5wdXNoKGl0ZXIpO1xuICAgIH1cbiAgICBpZiAobWF4U2l6ZSA+IGxpc3Quc2l6ZSkge1xuICAgICAgbGlzdCA9IGxpc3Quc2V0U2l6ZShtYXhTaXplKTtcbiAgICB9XG4gICAgcmV0dXJuIG1lcmdlSW50b0NvbGxlY3Rpb25XaXRoKGxpc3QsIG1lcmdlciwgaXRlcnMpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0VGFpbE9mZnNldChzaXplKSB7XG4gICAgcmV0dXJuIHNpemUgPCBTSVpFID8gMCA6ICgoKHNpemUgLSAxKSA+Pj4gU0hJRlQpIDw8IFNISUZUKTtcbiAgfVxuXG4gIGNyZWF0ZUNsYXNzKE9yZGVyZWRNYXAsIE1hcCk7XG5cbiAgICAvLyBAcHJhZ21hIENvbnN0cnVjdGlvblxuXG4gICAgZnVuY3Rpb24gT3JkZXJlZE1hcCh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSB1bmRlZmluZWQgPyBlbXB0eU9yZGVyZWRNYXAoKSA6XG4gICAgICAgIGlzT3JkZXJlZE1hcCh2YWx1ZSkgPyB2YWx1ZSA6XG4gICAgICAgIGVtcHR5T3JkZXJlZE1hcCgpLndpdGhNdXRhdGlvbnMoZnVuY3Rpb24obWFwICkge1xuICAgICAgICAgIHZhciBpdGVyID0gS2V5ZWRJdGVyYWJsZSh2YWx1ZSk7XG4gICAgICAgICAgYXNzZXJ0Tm90SW5maW5pdGUoaXRlci5zaXplKTtcbiAgICAgICAgICBpdGVyLmZvckVhY2goZnVuY3Rpb24odiwgaykgIHtyZXR1cm4gbWFwLnNldChrLCB2KX0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBPcmRlcmVkTWFwLm9mID0gZnVuY3Rpb24oLyouLi52YWx1ZXMqLykge1xuICAgICAgcmV0dXJuIHRoaXMoYXJndW1lbnRzKTtcbiAgICB9O1xuXG4gICAgT3JkZXJlZE1hcC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9fdG9TdHJpbmcoJ09yZGVyZWRNYXAgeycsICd9Jyk7XG4gICAgfTtcblxuICAgIC8vIEBwcmFnbWEgQWNjZXNzXG5cbiAgICBPcmRlcmVkTWFwLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihrLCBub3RTZXRWYWx1ZSkge1xuICAgICAgdmFyIGluZGV4ID0gdGhpcy5fbWFwLmdldChrKTtcbiAgICAgIHJldHVybiBpbmRleCAhPT0gdW5kZWZpbmVkID8gdGhpcy5fbGlzdC5nZXQoaW5kZXgpWzFdIDogbm90U2V0VmFsdWU7XG4gICAgfTtcblxuICAgIC8vIEBwcmFnbWEgTW9kaWZpY2F0aW9uXG5cbiAgICBPcmRlcmVkTWFwLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuc2l6ZSA9PT0gMCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLl9fb3duZXJJRCkge1xuICAgICAgICB0aGlzLnNpemUgPSAwO1xuICAgICAgICB0aGlzLl9tYXAuY2xlYXIoKTtcbiAgICAgICAgdGhpcy5fbGlzdC5jbGVhcigpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHJldHVybiBlbXB0eU9yZGVyZWRNYXAoKTtcbiAgICB9O1xuXG4gICAgT3JkZXJlZE1hcC5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24oaywgdikge1xuICAgICAgcmV0dXJuIHVwZGF0ZU9yZGVyZWRNYXAodGhpcywgaywgdik7XG4gICAgfTtcblxuICAgIE9yZGVyZWRNYXAucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKGspIHtcbiAgICAgIHJldHVybiB1cGRhdGVPcmRlcmVkTWFwKHRoaXMsIGssIE5PVF9TRVQpO1xuICAgIH07XG5cbiAgICBPcmRlcmVkTWFwLnByb3RvdHlwZS53YXNBbHRlcmVkID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fbWFwLndhc0FsdGVyZWQoKSB8fCB0aGlzLl9saXN0Lndhc0FsdGVyZWQoKTtcbiAgICB9O1xuXG4gICAgT3JkZXJlZE1hcC5wcm90b3R5cGUuX19pdGVyYXRlID0gZnVuY3Rpb24oZm4sIHJldmVyc2UpIHt2YXIgdGhpcyQwID0gdGhpcztcbiAgICAgIHJldHVybiB0aGlzLl9saXN0Ll9faXRlcmF0ZShcbiAgICAgICAgZnVuY3Rpb24oZW50cnkgKSB7cmV0dXJuIGVudHJ5ICYmIGZuKGVudHJ5WzFdLCBlbnRyeVswXSwgdGhpcyQwKX0sXG4gICAgICAgIHJldmVyc2VcbiAgICAgICk7XG4gICAgfTtcblxuICAgIE9yZGVyZWRNYXAucHJvdG90eXBlLl9faXRlcmF0b3IgPSBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgICByZXR1cm4gdGhpcy5fbGlzdC5mcm9tRW50cnlTZXEoKS5fX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpO1xuICAgIH07XG5cbiAgICBPcmRlcmVkTWFwLnByb3RvdHlwZS5fX2Vuc3VyZU93bmVyID0gZnVuY3Rpb24ob3duZXJJRCkge1xuICAgICAgaWYgKG93bmVySUQgPT09IHRoaXMuX19vd25lcklEKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgdmFyIG5ld01hcCA9IHRoaXMuX21hcC5fX2Vuc3VyZU93bmVyKG93bmVySUQpO1xuICAgICAgdmFyIG5ld0xpc3QgPSB0aGlzLl9saXN0Ll9fZW5zdXJlT3duZXIob3duZXJJRCk7XG4gICAgICBpZiAoIW93bmVySUQpIHtcbiAgICAgICAgdGhpcy5fX293bmVySUQgPSBvd25lcklEO1xuICAgICAgICB0aGlzLl9tYXAgPSBuZXdNYXA7XG4gICAgICAgIHRoaXMuX2xpc3QgPSBuZXdMaXN0O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHJldHVybiBtYWtlT3JkZXJlZE1hcChuZXdNYXAsIG5ld0xpc3QsIG93bmVySUQsIHRoaXMuX19oYXNoKTtcbiAgICB9O1xuXG5cbiAgZnVuY3Rpb24gaXNPcmRlcmVkTWFwKG1heWJlT3JkZXJlZE1hcCkge1xuICAgIHJldHVybiBpc01hcChtYXliZU9yZGVyZWRNYXApICYmIGlzT3JkZXJlZChtYXliZU9yZGVyZWRNYXApO1xuICB9XG5cbiAgT3JkZXJlZE1hcC5pc09yZGVyZWRNYXAgPSBpc09yZGVyZWRNYXA7XG5cbiAgT3JkZXJlZE1hcC5wcm90b3R5cGVbSVNfT1JERVJFRF9TRU5USU5FTF0gPSB0cnVlO1xuICBPcmRlcmVkTWFwLnByb3RvdHlwZVtERUxFVEVdID0gT3JkZXJlZE1hcC5wcm90b3R5cGUucmVtb3ZlO1xuXG5cblxuICBmdW5jdGlvbiBtYWtlT3JkZXJlZE1hcChtYXAsIGxpc3QsIG93bmVySUQsIGhhc2gpIHtcbiAgICB2YXIgb21hcCA9IE9iamVjdC5jcmVhdGUoT3JkZXJlZE1hcC5wcm90b3R5cGUpO1xuICAgIG9tYXAuc2l6ZSA9IG1hcCA/IG1hcC5zaXplIDogMDtcbiAgICBvbWFwLl9tYXAgPSBtYXA7XG4gICAgb21hcC5fbGlzdCA9IGxpc3Q7XG4gICAgb21hcC5fX293bmVySUQgPSBvd25lcklEO1xuICAgIG9tYXAuX19oYXNoID0gaGFzaDtcbiAgICByZXR1cm4gb21hcDtcbiAgfVxuXG4gIHZhciBFTVBUWV9PUkRFUkVEX01BUDtcbiAgZnVuY3Rpb24gZW1wdHlPcmRlcmVkTWFwKCkge1xuICAgIHJldHVybiBFTVBUWV9PUkRFUkVEX01BUCB8fCAoRU1QVFlfT1JERVJFRF9NQVAgPSBtYWtlT3JkZXJlZE1hcChlbXB0eU1hcCgpLCBlbXB0eUxpc3QoKSkpO1xuICB9XG5cbiAgZnVuY3Rpb24gdXBkYXRlT3JkZXJlZE1hcChvbWFwLCBrLCB2KSB7XG4gICAgdmFyIG1hcCA9IG9tYXAuX21hcDtcbiAgICB2YXIgbGlzdCA9IG9tYXAuX2xpc3Q7XG4gICAgdmFyIGkgPSBtYXAuZ2V0KGspO1xuICAgIHZhciBoYXMgPSBpICE9PSB1bmRlZmluZWQ7XG4gICAgdmFyIG5ld01hcDtcbiAgICB2YXIgbmV3TGlzdDtcbiAgICBpZiAodiA9PT0gTk9UX1NFVCkgeyAvLyByZW1vdmVkXG4gICAgICBpZiAoIWhhcykge1xuICAgICAgICByZXR1cm4gb21hcDtcbiAgICAgIH1cbiAgICAgIGlmIChsaXN0LnNpemUgPj0gU0laRSAmJiBsaXN0LnNpemUgPj0gbWFwLnNpemUgKiAyKSB7XG4gICAgICAgIG5ld0xpc3QgPSBsaXN0LmZpbHRlcihmdW5jdGlvbihlbnRyeSwgaWR4KSAge3JldHVybiBlbnRyeSAhPT0gdW5kZWZpbmVkICYmIGkgIT09IGlkeH0pO1xuICAgICAgICBuZXdNYXAgPSBuZXdMaXN0LnRvS2V5ZWRTZXEoKS5tYXAoZnVuY3Rpb24oZW50cnkgKSB7cmV0dXJuIGVudHJ5WzBdfSkuZmxpcCgpLnRvTWFwKCk7XG4gICAgICAgIGlmIChvbWFwLl9fb3duZXJJRCkge1xuICAgICAgICAgIG5ld01hcC5fX293bmVySUQgPSBuZXdMaXN0Ll9fb3duZXJJRCA9IG9tYXAuX19vd25lcklEO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXdNYXAgPSBtYXAucmVtb3ZlKGspO1xuICAgICAgICBuZXdMaXN0ID0gaSA9PT0gbGlzdC5zaXplIC0gMSA/IGxpc3QucG9wKCkgOiBsaXN0LnNldChpLCB1bmRlZmluZWQpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoaGFzKSB7XG4gICAgICAgIGlmICh2ID09PSBsaXN0LmdldChpKVsxXSkge1xuICAgICAgICAgIHJldHVybiBvbWFwO1xuICAgICAgICB9XG4gICAgICAgIG5ld01hcCA9IG1hcDtcbiAgICAgICAgbmV3TGlzdCA9IGxpc3Quc2V0KGksIFtrLCB2XSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXdNYXAgPSBtYXAuc2V0KGssIGxpc3Quc2l6ZSk7XG4gICAgICAgIG5ld0xpc3QgPSBsaXN0LnNldChsaXN0LnNpemUsIFtrLCB2XSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChvbWFwLl9fb3duZXJJRCkge1xuICAgICAgb21hcC5zaXplID0gbmV3TWFwLnNpemU7XG4gICAgICBvbWFwLl9tYXAgPSBuZXdNYXA7XG4gICAgICBvbWFwLl9saXN0ID0gbmV3TGlzdDtcbiAgICAgIG9tYXAuX19oYXNoID0gdW5kZWZpbmVkO1xuICAgICAgcmV0dXJuIG9tYXA7XG4gICAgfVxuICAgIHJldHVybiBtYWtlT3JkZXJlZE1hcChuZXdNYXAsIG5ld0xpc3QpO1xuICB9XG5cbiAgY3JlYXRlQ2xhc3MoVG9LZXllZFNlcXVlbmNlLCBLZXllZFNlcSk7XG4gICAgZnVuY3Rpb24gVG9LZXllZFNlcXVlbmNlKGluZGV4ZWQsIHVzZUtleXMpIHtcbiAgICAgIHRoaXMuX2l0ZXIgPSBpbmRleGVkO1xuICAgICAgdGhpcy5fdXNlS2V5cyA9IHVzZUtleXM7XG4gICAgICB0aGlzLnNpemUgPSBpbmRleGVkLnNpemU7XG4gICAgfVxuXG4gICAgVG9LZXllZFNlcXVlbmNlLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihrZXksIG5vdFNldFZhbHVlKSB7XG4gICAgICByZXR1cm4gdGhpcy5faXRlci5nZXQoa2V5LCBub3RTZXRWYWx1ZSk7XG4gICAgfTtcblxuICAgIFRvS2V5ZWRTZXF1ZW5jZS5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gdGhpcy5faXRlci5oYXMoa2V5KTtcbiAgICB9O1xuXG4gICAgVG9LZXllZFNlcXVlbmNlLnByb3RvdHlwZS52YWx1ZVNlcSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2l0ZXIudmFsdWVTZXEoKTtcbiAgICB9O1xuXG4gICAgVG9LZXllZFNlcXVlbmNlLnByb3RvdHlwZS5yZXZlcnNlID0gZnVuY3Rpb24oKSB7dmFyIHRoaXMkMCA9IHRoaXM7XG4gICAgICB2YXIgcmV2ZXJzZWRTZXF1ZW5jZSA9IHJldmVyc2VGYWN0b3J5KHRoaXMsIHRydWUpO1xuICAgICAgaWYgKCF0aGlzLl91c2VLZXlzKSB7XG4gICAgICAgIHJldmVyc2VkU2VxdWVuY2UudmFsdWVTZXEgPSBmdW5jdGlvbigpICB7cmV0dXJuIHRoaXMkMC5faXRlci50b1NlcSgpLnJldmVyc2UoKX07XG4gICAgICB9XG4gICAgICByZXR1cm4gcmV2ZXJzZWRTZXF1ZW5jZTtcbiAgICB9O1xuXG4gICAgVG9LZXllZFNlcXVlbmNlLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbihtYXBwZXIsIGNvbnRleHQpIHt2YXIgdGhpcyQwID0gdGhpcztcbiAgICAgIHZhciBtYXBwZWRTZXF1ZW5jZSA9IG1hcEZhY3RvcnkodGhpcywgbWFwcGVyLCBjb250ZXh0KTtcbiAgICAgIGlmICghdGhpcy5fdXNlS2V5cykge1xuICAgICAgICBtYXBwZWRTZXF1ZW5jZS52YWx1ZVNlcSA9IGZ1bmN0aW9uKCkgIHtyZXR1cm4gdGhpcyQwLl9pdGVyLnRvU2VxKCkubWFwKG1hcHBlciwgY29udGV4dCl9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1hcHBlZFNlcXVlbmNlO1xuICAgIH07XG5cbiAgICBUb0tleWVkU2VxdWVuY2UucHJvdG90eXBlLl9faXRlcmF0ZSA9IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7dmFyIHRoaXMkMCA9IHRoaXM7XG4gICAgICB2YXIgaWk7XG4gICAgICByZXR1cm4gdGhpcy5faXRlci5fX2l0ZXJhdGUoXG4gICAgICAgIHRoaXMuX3VzZUtleXMgP1xuICAgICAgICAgIGZ1bmN0aW9uKHYsIGspICB7cmV0dXJuIGZuKHYsIGssIHRoaXMkMCl9IDpcbiAgICAgICAgICAoKGlpID0gcmV2ZXJzZSA/IHJlc29sdmVTaXplKHRoaXMpIDogMCksXG4gICAgICAgICAgICBmdW5jdGlvbih2ICkge3JldHVybiBmbih2LCByZXZlcnNlID8gLS1paSA6IGlpKyssIHRoaXMkMCl9KSxcbiAgICAgICAgcmV2ZXJzZVxuICAgICAgKTtcbiAgICB9O1xuXG4gICAgVG9LZXllZFNlcXVlbmNlLnByb3RvdHlwZS5fX2l0ZXJhdG9yID0gZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgICAgaWYgKHRoaXMuX3VzZUtleXMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRvcih0eXBlLCByZXZlcnNlKTtcbiAgICAgIH1cbiAgICAgIHZhciBpdGVyYXRvciA9IHRoaXMuX2l0ZXIuX19pdGVyYXRvcihJVEVSQVRFX1ZBTFVFUywgcmV2ZXJzZSk7XG4gICAgICB2YXIgaWkgPSByZXZlcnNlID8gcmVzb2x2ZVNpemUodGhpcykgOiAwO1xuICAgICAgcmV0dXJuIG5ldyBJdGVyYXRvcihmdW5jdGlvbigpICB7XG4gICAgICAgIHZhciBzdGVwID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICByZXR1cm4gc3RlcC5kb25lID8gc3RlcCA6XG4gICAgICAgICAgaXRlcmF0b3JWYWx1ZSh0eXBlLCByZXZlcnNlID8gLS1paSA6IGlpKyssIHN0ZXAudmFsdWUsIHN0ZXApO1xuICAgICAgfSk7XG4gICAgfTtcblxuICBUb0tleWVkU2VxdWVuY2UucHJvdG90eXBlW0lTX09SREVSRURfU0VOVElORUxdID0gdHJ1ZTtcblxuXG4gIGNyZWF0ZUNsYXNzKFRvSW5kZXhlZFNlcXVlbmNlLCBJbmRleGVkU2VxKTtcbiAgICBmdW5jdGlvbiBUb0luZGV4ZWRTZXF1ZW5jZShpdGVyKSB7XG4gICAgICB0aGlzLl9pdGVyID0gaXRlcjtcbiAgICAgIHRoaXMuc2l6ZSA9IGl0ZXIuc2l6ZTtcbiAgICB9XG5cbiAgICBUb0luZGV4ZWRTZXF1ZW5jZS5wcm90b3R5cGUuaW5jbHVkZXMgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIHRoaXMuX2l0ZXIuaW5jbHVkZXModmFsdWUpO1xuICAgIH07XG5cbiAgICBUb0luZGV4ZWRTZXF1ZW5jZS5wcm90b3R5cGUuX19pdGVyYXRlID0gZnVuY3Rpb24oZm4sIHJldmVyc2UpIHt2YXIgdGhpcyQwID0gdGhpcztcbiAgICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICAgIHJldHVybiB0aGlzLl9pdGVyLl9faXRlcmF0ZShmdW5jdGlvbih2ICkge3JldHVybiBmbih2LCBpdGVyYXRpb25zKyssIHRoaXMkMCl9LCByZXZlcnNlKTtcbiAgICB9O1xuXG4gICAgVG9JbmRleGVkU2VxdWVuY2UucHJvdG90eXBlLl9faXRlcmF0b3IgPSBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgICB2YXIgaXRlcmF0b3IgPSB0aGlzLl9pdGVyLl9faXRlcmF0b3IoSVRFUkFURV9WQUxVRVMsIHJldmVyc2UpO1xuICAgICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgICAgcmV0dXJuIG5ldyBJdGVyYXRvcihmdW5jdGlvbigpICB7XG4gICAgICAgIHZhciBzdGVwID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICByZXR1cm4gc3RlcC5kb25lID8gc3RlcCA6XG4gICAgICAgICAgaXRlcmF0b3JWYWx1ZSh0eXBlLCBpdGVyYXRpb25zKyssIHN0ZXAudmFsdWUsIHN0ZXApXG4gICAgICB9KTtcbiAgICB9O1xuXG5cblxuICBjcmVhdGVDbGFzcyhUb1NldFNlcXVlbmNlLCBTZXRTZXEpO1xuICAgIGZ1bmN0aW9uIFRvU2V0U2VxdWVuY2UoaXRlcikge1xuICAgICAgdGhpcy5faXRlciA9IGl0ZXI7XG4gICAgICB0aGlzLnNpemUgPSBpdGVyLnNpemU7XG4gICAgfVxuXG4gICAgVG9TZXRTZXF1ZW5jZS5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gdGhpcy5faXRlci5pbmNsdWRlcyhrZXkpO1xuICAgIH07XG5cbiAgICBUb1NldFNlcXVlbmNlLnByb3RvdHlwZS5fX2l0ZXJhdGUgPSBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge3ZhciB0aGlzJDAgPSB0aGlzO1xuICAgICAgcmV0dXJuIHRoaXMuX2l0ZXIuX19pdGVyYXRlKGZ1bmN0aW9uKHYgKSB7cmV0dXJuIGZuKHYsIHYsIHRoaXMkMCl9LCByZXZlcnNlKTtcbiAgICB9O1xuXG4gICAgVG9TZXRTZXF1ZW5jZS5wcm90b3R5cGUuX19pdGVyYXRvciA9IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICAgIHZhciBpdGVyYXRvciA9IHRoaXMuX2l0ZXIuX19pdGVyYXRvcihJVEVSQVRFX1ZBTFVFUywgcmV2ZXJzZSk7XG4gICAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKGZ1bmN0aW9uKCkgIHtcbiAgICAgICAgdmFyIHN0ZXAgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIHJldHVybiBzdGVwLmRvbmUgPyBzdGVwIDpcbiAgICAgICAgICBpdGVyYXRvclZhbHVlKHR5cGUsIHN0ZXAudmFsdWUsIHN0ZXAudmFsdWUsIHN0ZXApO1xuICAgICAgfSk7XG4gICAgfTtcblxuXG5cbiAgY3JlYXRlQ2xhc3MoRnJvbUVudHJpZXNTZXF1ZW5jZSwgS2V5ZWRTZXEpO1xuICAgIGZ1bmN0aW9uIEZyb21FbnRyaWVzU2VxdWVuY2UoZW50cmllcykge1xuICAgICAgdGhpcy5faXRlciA9IGVudHJpZXM7XG4gICAgICB0aGlzLnNpemUgPSBlbnRyaWVzLnNpemU7XG4gICAgfVxuXG4gICAgRnJvbUVudHJpZXNTZXF1ZW5jZS5wcm90b3R5cGUuZW50cnlTZXEgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9pdGVyLnRvU2VxKCk7XG4gICAgfTtcblxuICAgIEZyb21FbnRyaWVzU2VxdWVuY2UucHJvdG90eXBlLl9faXRlcmF0ZSA9IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7dmFyIHRoaXMkMCA9IHRoaXM7XG4gICAgICByZXR1cm4gdGhpcy5faXRlci5fX2l0ZXJhdGUoZnVuY3Rpb24oZW50cnkgKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIGVudHJ5IGV4aXN0cyBmaXJzdCBzbyBhcnJheSBhY2Nlc3MgZG9lc24ndCB0aHJvdyBmb3IgaG9sZXNcbiAgICAgICAgLy8gaW4gdGhlIHBhcmVudCBpdGVyYXRpb24uXG4gICAgICAgIGlmIChlbnRyeSkge1xuICAgICAgICAgIHZhbGlkYXRlRW50cnkoZW50cnkpO1xuICAgICAgICAgIHZhciBpbmRleGVkSXRlcmFibGUgPSBpc0l0ZXJhYmxlKGVudHJ5KTtcbiAgICAgICAgICByZXR1cm4gZm4oXG4gICAgICAgICAgICBpbmRleGVkSXRlcmFibGUgPyBlbnRyeS5nZXQoMSkgOiBlbnRyeVsxXSxcbiAgICAgICAgICAgIGluZGV4ZWRJdGVyYWJsZSA/IGVudHJ5LmdldCgwKSA6IGVudHJ5WzBdLFxuICAgICAgICAgICAgdGhpcyQwXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfSwgcmV2ZXJzZSk7XG4gICAgfTtcblxuICAgIEZyb21FbnRyaWVzU2VxdWVuY2UucHJvdG90eXBlLl9faXRlcmF0b3IgPSBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgICB2YXIgaXRlcmF0b3IgPSB0aGlzLl9pdGVyLl9faXRlcmF0b3IoSVRFUkFURV9WQUxVRVMsIHJldmVyc2UpO1xuICAgICAgcmV0dXJuIG5ldyBJdGVyYXRvcihmdW5jdGlvbigpICB7XG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgdmFyIHN0ZXAgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgICAgaWYgKHN0ZXAuZG9uZSkge1xuICAgICAgICAgICAgcmV0dXJuIHN0ZXA7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciBlbnRyeSA9IHN0ZXAudmFsdWU7XG4gICAgICAgICAgLy8gQ2hlY2sgaWYgZW50cnkgZXhpc3RzIGZpcnN0IHNvIGFycmF5IGFjY2VzcyBkb2Vzbid0IHRocm93IGZvciBob2xlc1xuICAgICAgICAgIC8vIGluIHRoZSBwYXJlbnQgaXRlcmF0aW9uLlxuICAgICAgICAgIGlmIChlbnRyeSkge1xuICAgICAgICAgICAgdmFsaWRhdGVFbnRyeShlbnRyeSk7XG4gICAgICAgICAgICB2YXIgaW5kZXhlZEl0ZXJhYmxlID0gaXNJdGVyYWJsZShlbnRyeSk7XG4gICAgICAgICAgICByZXR1cm4gaXRlcmF0b3JWYWx1ZShcbiAgICAgICAgICAgICAgdHlwZSxcbiAgICAgICAgICAgICAgaW5kZXhlZEl0ZXJhYmxlID8gZW50cnkuZ2V0KDApIDogZW50cnlbMF0sXG4gICAgICAgICAgICAgIGluZGV4ZWRJdGVyYWJsZSA/IGVudHJ5LmdldCgxKSA6IGVudHJ5WzFdLFxuICAgICAgICAgICAgICBzdGVwXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuXG4gIFRvSW5kZXhlZFNlcXVlbmNlLnByb3RvdHlwZS5jYWNoZVJlc3VsdCA9XG4gIFRvS2V5ZWRTZXF1ZW5jZS5wcm90b3R5cGUuY2FjaGVSZXN1bHQgPVxuICBUb1NldFNlcXVlbmNlLnByb3RvdHlwZS5jYWNoZVJlc3VsdCA9XG4gIEZyb21FbnRyaWVzU2VxdWVuY2UucHJvdG90eXBlLmNhY2hlUmVzdWx0ID1cbiAgICBjYWNoZVJlc3VsdFRocm91Z2g7XG5cblxuICBmdW5jdGlvbiBmbGlwRmFjdG9yeShpdGVyYWJsZSkge1xuICAgIHZhciBmbGlwU2VxdWVuY2UgPSBtYWtlU2VxdWVuY2UoaXRlcmFibGUpO1xuICAgIGZsaXBTZXF1ZW5jZS5faXRlciA9IGl0ZXJhYmxlO1xuICAgIGZsaXBTZXF1ZW5jZS5zaXplID0gaXRlcmFibGUuc2l6ZTtcbiAgICBmbGlwU2VxdWVuY2UuZmxpcCA9IGZ1bmN0aW9uKCkgIHtyZXR1cm4gaXRlcmFibGV9O1xuICAgIGZsaXBTZXF1ZW5jZS5yZXZlcnNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHJldmVyc2VkU2VxdWVuY2UgPSBpdGVyYWJsZS5yZXZlcnNlLmFwcGx5KHRoaXMpOyAvLyBzdXBlci5yZXZlcnNlKClcbiAgICAgIHJldmVyc2VkU2VxdWVuY2UuZmxpcCA9IGZ1bmN0aW9uKCkgIHtyZXR1cm4gaXRlcmFibGUucmV2ZXJzZSgpfTtcbiAgICAgIHJldHVybiByZXZlcnNlZFNlcXVlbmNlO1xuICAgIH07XG4gICAgZmxpcFNlcXVlbmNlLmhhcyA9IGZ1bmN0aW9uKGtleSApIHtyZXR1cm4gaXRlcmFibGUuaW5jbHVkZXMoa2V5KX07XG4gICAgZmxpcFNlcXVlbmNlLmluY2x1ZGVzID0gZnVuY3Rpb24oa2V5ICkge3JldHVybiBpdGVyYWJsZS5oYXMoa2V5KX07XG4gICAgZmxpcFNlcXVlbmNlLmNhY2hlUmVzdWx0ID0gY2FjaGVSZXN1bHRUaHJvdWdoO1xuICAgIGZsaXBTZXF1ZW5jZS5fX2l0ZXJhdGVVbmNhY2hlZCA9IGZ1bmN0aW9uIChmbiwgcmV2ZXJzZSkge3ZhciB0aGlzJDAgPSB0aGlzO1xuICAgICAgcmV0dXJuIGl0ZXJhYmxlLl9faXRlcmF0ZShmdW5jdGlvbih2LCBrKSAge3JldHVybiBmbihrLCB2LCB0aGlzJDApICE9PSBmYWxzZX0sIHJldmVyc2UpO1xuICAgIH1cbiAgICBmbGlwU2VxdWVuY2UuX19pdGVyYXRvclVuY2FjaGVkID0gZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgICAgaWYgKHR5cGUgPT09IElURVJBVEVfRU5UUklFUykge1xuICAgICAgICB2YXIgaXRlcmF0b3IgPSBpdGVyYWJsZS5fX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpO1xuICAgICAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKGZ1bmN0aW9uKCkgIHtcbiAgICAgICAgICB2YXIgc3RlcCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgICBpZiAoIXN0ZXAuZG9uZSkge1xuICAgICAgICAgICAgdmFyIGsgPSBzdGVwLnZhbHVlWzBdO1xuICAgICAgICAgICAgc3RlcC52YWx1ZVswXSA9IHN0ZXAudmFsdWVbMV07XG4gICAgICAgICAgICBzdGVwLnZhbHVlWzFdID0gaztcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHN0ZXA7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGl0ZXJhYmxlLl9faXRlcmF0b3IoXG4gICAgICAgIHR5cGUgPT09IElURVJBVEVfVkFMVUVTID8gSVRFUkFURV9LRVlTIDogSVRFUkFURV9WQUxVRVMsXG4gICAgICAgIHJldmVyc2VcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiBmbGlwU2VxdWVuY2U7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIG1hcEZhY3RvcnkoaXRlcmFibGUsIG1hcHBlciwgY29udGV4dCkge1xuICAgIHZhciBtYXBwZWRTZXF1ZW5jZSA9IG1ha2VTZXF1ZW5jZShpdGVyYWJsZSk7XG4gICAgbWFwcGVkU2VxdWVuY2Uuc2l6ZSA9IGl0ZXJhYmxlLnNpemU7XG4gICAgbWFwcGVkU2VxdWVuY2UuaGFzID0gZnVuY3Rpb24oa2V5ICkge3JldHVybiBpdGVyYWJsZS5oYXMoa2V5KX07XG4gICAgbWFwcGVkU2VxdWVuY2UuZ2V0ID0gZnVuY3Rpb24oa2V5LCBub3RTZXRWYWx1ZSkgIHtcbiAgICAgIHZhciB2ID0gaXRlcmFibGUuZ2V0KGtleSwgTk9UX1NFVCk7XG4gICAgICByZXR1cm4gdiA9PT0gTk9UX1NFVCA/XG4gICAgICAgIG5vdFNldFZhbHVlIDpcbiAgICAgICAgbWFwcGVyLmNhbGwoY29udGV4dCwgdiwga2V5LCBpdGVyYWJsZSk7XG4gICAgfTtcbiAgICBtYXBwZWRTZXF1ZW5jZS5fX2l0ZXJhdGVVbmNhY2hlZCA9IGZ1bmN0aW9uIChmbiwgcmV2ZXJzZSkge3ZhciB0aGlzJDAgPSB0aGlzO1xuICAgICAgcmV0dXJuIGl0ZXJhYmxlLl9faXRlcmF0ZShcbiAgICAgICAgZnVuY3Rpb24odiwgaywgYykgIHtyZXR1cm4gZm4obWFwcGVyLmNhbGwoY29udGV4dCwgdiwgaywgYyksIGssIHRoaXMkMCkgIT09IGZhbHNlfSxcbiAgICAgICAgcmV2ZXJzZVxuICAgICAgKTtcbiAgICB9XG4gICAgbWFwcGVkU2VxdWVuY2UuX19pdGVyYXRvclVuY2FjaGVkID0gZnVuY3Rpb24gKHR5cGUsIHJldmVyc2UpIHtcbiAgICAgIHZhciBpdGVyYXRvciA9IGl0ZXJhYmxlLl9faXRlcmF0b3IoSVRFUkFURV9FTlRSSUVTLCByZXZlcnNlKTtcbiAgICAgIHJldHVybiBuZXcgSXRlcmF0b3IoZnVuY3Rpb24oKSAge1xuICAgICAgICB2YXIgc3RlcCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgaWYgKHN0ZXAuZG9uZSkge1xuICAgICAgICAgIHJldHVybiBzdGVwO1xuICAgICAgICB9XG4gICAgICAgIHZhciBlbnRyeSA9IHN0ZXAudmFsdWU7XG4gICAgICAgIHZhciBrZXkgPSBlbnRyeVswXTtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yVmFsdWUoXG4gICAgICAgICAgdHlwZSxcbiAgICAgICAgICBrZXksXG4gICAgICAgICAgbWFwcGVyLmNhbGwoY29udGV4dCwgZW50cnlbMV0sIGtleSwgaXRlcmFibGUpLFxuICAgICAgICAgIHN0ZXBcbiAgICAgICAgKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gbWFwcGVkU2VxdWVuY2U7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIHJldmVyc2VGYWN0b3J5KGl0ZXJhYmxlLCB1c2VLZXlzKSB7XG4gICAgdmFyIHJldmVyc2VkU2VxdWVuY2UgPSBtYWtlU2VxdWVuY2UoaXRlcmFibGUpO1xuICAgIHJldmVyc2VkU2VxdWVuY2UuX2l0ZXIgPSBpdGVyYWJsZTtcbiAgICByZXZlcnNlZFNlcXVlbmNlLnNpemUgPSBpdGVyYWJsZS5zaXplO1xuICAgIHJldmVyc2VkU2VxdWVuY2UucmV2ZXJzZSA9IGZ1bmN0aW9uKCkgIHtyZXR1cm4gaXRlcmFibGV9O1xuICAgIGlmIChpdGVyYWJsZS5mbGlwKSB7XG4gICAgICByZXZlcnNlZFNlcXVlbmNlLmZsaXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBmbGlwU2VxdWVuY2UgPSBmbGlwRmFjdG9yeShpdGVyYWJsZSk7XG4gICAgICAgIGZsaXBTZXF1ZW5jZS5yZXZlcnNlID0gZnVuY3Rpb24oKSAge3JldHVybiBpdGVyYWJsZS5mbGlwKCl9O1xuICAgICAgICByZXR1cm4gZmxpcFNlcXVlbmNlO1xuICAgICAgfTtcbiAgICB9XG4gICAgcmV2ZXJzZWRTZXF1ZW5jZS5nZXQgPSBmdW5jdGlvbihrZXksIG5vdFNldFZhbHVlKSBcbiAgICAgIHtyZXR1cm4gaXRlcmFibGUuZ2V0KHVzZUtleXMgPyBrZXkgOiAtMSAtIGtleSwgbm90U2V0VmFsdWUpfTtcbiAgICByZXZlcnNlZFNlcXVlbmNlLmhhcyA9IGZ1bmN0aW9uKGtleSApXG4gICAgICB7cmV0dXJuIGl0ZXJhYmxlLmhhcyh1c2VLZXlzID8ga2V5IDogLTEgLSBrZXkpfTtcbiAgICByZXZlcnNlZFNlcXVlbmNlLmluY2x1ZGVzID0gZnVuY3Rpb24odmFsdWUgKSB7cmV0dXJuIGl0ZXJhYmxlLmluY2x1ZGVzKHZhbHVlKX07XG4gICAgcmV2ZXJzZWRTZXF1ZW5jZS5jYWNoZVJlc3VsdCA9IGNhY2hlUmVzdWx0VGhyb3VnaDtcbiAgICByZXZlcnNlZFNlcXVlbmNlLl9faXRlcmF0ZSA9IGZ1bmN0aW9uIChmbiwgcmV2ZXJzZSkge3ZhciB0aGlzJDAgPSB0aGlzO1xuICAgICAgcmV0dXJuIGl0ZXJhYmxlLl9faXRlcmF0ZShmdW5jdGlvbih2LCBrKSAge3JldHVybiBmbih2LCBrLCB0aGlzJDApfSwgIXJldmVyc2UpO1xuICAgIH07XG4gICAgcmV2ZXJzZWRTZXF1ZW5jZS5fX2l0ZXJhdG9yID1cbiAgICAgIGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpICB7cmV0dXJuIGl0ZXJhYmxlLl9faXRlcmF0b3IodHlwZSwgIXJldmVyc2UpfTtcbiAgICByZXR1cm4gcmV2ZXJzZWRTZXF1ZW5jZTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gZmlsdGVyRmFjdG9yeShpdGVyYWJsZSwgcHJlZGljYXRlLCBjb250ZXh0LCB1c2VLZXlzKSB7XG4gICAgdmFyIGZpbHRlclNlcXVlbmNlID0gbWFrZVNlcXVlbmNlKGl0ZXJhYmxlKTtcbiAgICBpZiAodXNlS2V5cykge1xuICAgICAgZmlsdGVyU2VxdWVuY2UuaGFzID0gZnVuY3Rpb24oa2V5ICkge1xuICAgICAgICB2YXIgdiA9IGl0ZXJhYmxlLmdldChrZXksIE5PVF9TRVQpO1xuICAgICAgICByZXR1cm4gdiAhPT0gTk9UX1NFVCAmJiAhIXByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHYsIGtleSwgaXRlcmFibGUpO1xuICAgICAgfTtcbiAgICAgIGZpbHRlclNlcXVlbmNlLmdldCA9IGZ1bmN0aW9uKGtleSwgbm90U2V0VmFsdWUpICB7XG4gICAgICAgIHZhciB2ID0gaXRlcmFibGUuZ2V0KGtleSwgTk9UX1NFVCk7XG4gICAgICAgIHJldHVybiB2ICE9PSBOT1RfU0VUICYmIHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHYsIGtleSwgaXRlcmFibGUpID9cbiAgICAgICAgICB2IDogbm90U2V0VmFsdWU7XG4gICAgICB9O1xuICAgIH1cbiAgICBmaWx0ZXJTZXF1ZW5jZS5fX2l0ZXJhdGVVbmNhY2hlZCA9IGZ1bmN0aW9uIChmbiwgcmV2ZXJzZSkge3ZhciB0aGlzJDAgPSB0aGlzO1xuICAgICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgICAgaXRlcmFibGUuX19pdGVyYXRlKGZ1bmN0aW9uKHYsIGssIGMpICB7XG4gICAgICAgIGlmIChwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2LCBrLCBjKSkge1xuICAgICAgICAgIGl0ZXJhdGlvbnMrKztcbiAgICAgICAgICByZXR1cm4gZm4odiwgdXNlS2V5cyA/IGsgOiBpdGVyYXRpb25zIC0gMSwgdGhpcyQwKTtcbiAgICAgICAgfVxuICAgICAgfSwgcmV2ZXJzZSk7XG4gICAgICByZXR1cm4gaXRlcmF0aW9ucztcbiAgICB9O1xuICAgIGZpbHRlclNlcXVlbmNlLl9faXRlcmF0b3JVbmNhY2hlZCA9IGZ1bmN0aW9uICh0eXBlLCByZXZlcnNlKSB7XG4gICAgICB2YXIgaXRlcmF0b3IgPSBpdGVyYWJsZS5fX2l0ZXJhdG9yKElURVJBVEVfRU5UUklFUywgcmV2ZXJzZSk7XG4gICAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKGZ1bmN0aW9uKCkgIHtcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICB2YXIgc3RlcCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgICBpZiAoc3RlcC5kb25lKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RlcDtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGVudHJ5ID0gc3RlcC52YWx1ZTtcbiAgICAgICAgICB2YXIga2V5ID0gZW50cnlbMF07XG4gICAgICAgICAgdmFyIHZhbHVlID0gZW50cnlbMV07XG4gICAgICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBrZXksIGl0ZXJhYmxlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGl0ZXJhdG9yVmFsdWUodHlwZSwgdXNlS2V5cyA/IGtleSA6IGl0ZXJhdGlvbnMrKywgdmFsdWUsIHN0ZXApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBmaWx0ZXJTZXF1ZW5jZTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gY291bnRCeUZhY3RvcnkoaXRlcmFibGUsIGdyb3VwZXIsIGNvbnRleHQpIHtcbiAgICB2YXIgZ3JvdXBzID0gTWFwKCkuYXNNdXRhYmxlKCk7XG4gICAgaXRlcmFibGUuX19pdGVyYXRlKGZ1bmN0aW9uKHYsIGspICB7XG4gICAgICBncm91cHMudXBkYXRlKFxuICAgICAgICBncm91cGVyLmNhbGwoY29udGV4dCwgdiwgaywgaXRlcmFibGUpLFxuICAgICAgICAwLFxuICAgICAgICBmdW5jdGlvbihhICkge3JldHVybiBhICsgMX1cbiAgICAgICk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGdyb3Vwcy5hc0ltbXV0YWJsZSgpO1xuICB9XG5cblxuICBmdW5jdGlvbiBncm91cEJ5RmFjdG9yeShpdGVyYWJsZSwgZ3JvdXBlciwgY29udGV4dCkge1xuICAgIHZhciBpc0tleWVkSXRlciA9IGlzS2V5ZWQoaXRlcmFibGUpO1xuICAgIHZhciBncm91cHMgPSAoaXNPcmRlcmVkKGl0ZXJhYmxlKSA/IE9yZGVyZWRNYXAoKSA6IE1hcCgpKS5hc011dGFibGUoKTtcbiAgICBpdGVyYWJsZS5fX2l0ZXJhdGUoZnVuY3Rpb24odiwgaykgIHtcbiAgICAgIGdyb3Vwcy51cGRhdGUoXG4gICAgICAgIGdyb3VwZXIuY2FsbChjb250ZXh0LCB2LCBrLCBpdGVyYWJsZSksXG4gICAgICAgIGZ1bmN0aW9uKGEgKSB7cmV0dXJuIChhID0gYSB8fCBbXSwgYS5wdXNoKGlzS2V5ZWRJdGVyID8gW2ssIHZdIDogdiksIGEpfVxuICAgICAgKTtcbiAgICB9KTtcbiAgICB2YXIgY29lcmNlID0gaXRlcmFibGVDbGFzcyhpdGVyYWJsZSk7XG4gICAgcmV0dXJuIGdyb3Vwcy5tYXAoZnVuY3Rpb24oYXJyICkge3JldHVybiByZWlmeShpdGVyYWJsZSwgY29lcmNlKGFycikpfSk7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIHNsaWNlRmFjdG9yeShpdGVyYWJsZSwgYmVnaW4sIGVuZCwgdXNlS2V5cykge1xuICAgIHZhciBvcmlnaW5hbFNpemUgPSBpdGVyYWJsZS5zaXplO1xuXG4gICAgLy8gU2FuaXRpemUgYmVnaW4gJiBlbmQgdXNpbmcgdGhpcyBzaG9ydGhhbmQgZm9yIFRvSW50MzIoYXJndW1lbnQpXG4gICAgLy8gaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzYuMC8jc2VjLXRvaW50MzJcbiAgICBpZiAoYmVnaW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgYmVnaW4gPSBiZWdpbiB8IDA7XG4gICAgfVxuICAgIGlmIChlbmQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKGVuZCA9PT0gSW5maW5pdHkpIHtcbiAgICAgICAgZW5kID0gb3JpZ2luYWxTaXplO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZW5kID0gZW5kIHwgMDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAod2hvbGVTbGljZShiZWdpbiwgZW5kLCBvcmlnaW5hbFNpemUpKSB7XG4gICAgICByZXR1cm4gaXRlcmFibGU7XG4gICAgfVxuXG4gICAgdmFyIHJlc29sdmVkQmVnaW4gPSByZXNvbHZlQmVnaW4oYmVnaW4sIG9yaWdpbmFsU2l6ZSk7XG4gICAgdmFyIHJlc29sdmVkRW5kID0gcmVzb2x2ZUVuZChlbmQsIG9yaWdpbmFsU2l6ZSk7XG5cbiAgICAvLyBiZWdpbiBvciBlbmQgd2lsbCBiZSBOYU4gaWYgdGhleSB3ZXJlIHByb3ZpZGVkIGFzIG5lZ2F0aXZlIG51bWJlcnMgYW5kXG4gICAgLy8gdGhpcyBpdGVyYWJsZSdzIHNpemUgaXMgdW5rbm93bi4gSW4gdGhhdCBjYXNlLCBjYWNoZSBmaXJzdCBzbyB0aGVyZSBpc1xuICAgIC8vIGEga25vd24gc2l6ZSBhbmQgdGhlc2UgZG8gbm90IHJlc29sdmUgdG8gTmFOLlxuICAgIGlmIChyZXNvbHZlZEJlZ2luICE9PSByZXNvbHZlZEJlZ2luIHx8IHJlc29sdmVkRW5kICE9PSByZXNvbHZlZEVuZCkge1xuICAgICAgcmV0dXJuIHNsaWNlRmFjdG9yeShpdGVyYWJsZS50b1NlcSgpLmNhY2hlUmVzdWx0KCksIGJlZ2luLCBlbmQsIHVzZUtleXMpO1xuICAgIH1cblxuICAgIC8vIE5vdGU6IHJlc29sdmVkRW5kIGlzIHVuZGVmaW5lZCB3aGVuIHRoZSBvcmlnaW5hbCBzZXF1ZW5jZSdzIGxlbmd0aCBpc1xuICAgIC8vIHVua25vd24gYW5kIHRoaXMgc2xpY2UgZGlkIG5vdCBzdXBwbHkgYW4gZW5kIGFuZCBzaG91bGQgY29udGFpbiBhbGxcbiAgICAvLyBlbGVtZW50cyBhZnRlciByZXNvbHZlZEJlZ2luLlxuICAgIC8vIEluIHRoYXQgY2FzZSwgcmVzb2x2ZWRTaXplIHdpbGwgYmUgTmFOIGFuZCBzbGljZVNpemUgd2lsbCByZW1haW4gdW5kZWZpbmVkLlxuICAgIHZhciByZXNvbHZlZFNpemUgPSByZXNvbHZlZEVuZCAtIHJlc29sdmVkQmVnaW47XG4gICAgdmFyIHNsaWNlU2l6ZTtcbiAgICBpZiAocmVzb2x2ZWRTaXplID09PSByZXNvbHZlZFNpemUpIHtcbiAgICAgIHNsaWNlU2l6ZSA9IHJlc29sdmVkU2l6ZSA8IDAgPyAwIDogcmVzb2x2ZWRTaXplO1xuICAgIH1cblxuICAgIHZhciBzbGljZVNlcSA9IG1ha2VTZXF1ZW5jZShpdGVyYWJsZSk7XG5cbiAgICAvLyBJZiBpdGVyYWJsZS5zaXplIGlzIHVuZGVmaW5lZCwgdGhlIHNpemUgb2YgdGhlIHJlYWxpemVkIHNsaWNlU2VxIGlzXG4gICAgLy8gdW5rbm93biBhdCB0aGlzIHBvaW50IHVubGVzcyB0aGUgbnVtYmVyIG9mIGl0ZW1zIHRvIHNsaWNlIGlzIDBcbiAgICBzbGljZVNlcS5zaXplID0gc2xpY2VTaXplID09PSAwID8gc2xpY2VTaXplIDogaXRlcmFibGUuc2l6ZSAmJiBzbGljZVNpemUgfHwgdW5kZWZpbmVkO1xuXG4gICAgaWYgKCF1c2VLZXlzICYmIGlzU2VxKGl0ZXJhYmxlKSAmJiBzbGljZVNpemUgPj0gMCkge1xuICAgICAgc2xpY2VTZXEuZ2V0ID0gZnVuY3Rpb24gKGluZGV4LCBub3RTZXRWYWx1ZSkge1xuICAgICAgICBpbmRleCA9IHdyYXBJbmRleCh0aGlzLCBpbmRleCk7XG4gICAgICAgIHJldHVybiBpbmRleCA+PSAwICYmIGluZGV4IDwgc2xpY2VTaXplID9cbiAgICAgICAgICBpdGVyYWJsZS5nZXQoaW5kZXggKyByZXNvbHZlZEJlZ2luLCBub3RTZXRWYWx1ZSkgOlxuICAgICAgICAgIG5vdFNldFZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHNsaWNlU2VxLl9faXRlcmF0ZVVuY2FjaGVkID0gZnVuY3Rpb24oZm4sIHJldmVyc2UpIHt2YXIgdGhpcyQwID0gdGhpcztcbiAgICAgIGlmIChzbGljZVNpemUgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgICB9XG4gICAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0ZShmbiwgcmV2ZXJzZSk7XG4gICAgICB9XG4gICAgICB2YXIgc2tpcHBlZCA9IDA7XG4gICAgICB2YXIgaXNTa2lwcGluZyA9IHRydWU7XG4gICAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgICBpdGVyYWJsZS5fX2l0ZXJhdGUoZnVuY3Rpb24odiwgaykgIHtcbiAgICAgICAgaWYgKCEoaXNTa2lwcGluZyAmJiAoaXNTa2lwcGluZyA9IHNraXBwZWQrKyA8IHJlc29sdmVkQmVnaW4pKSkge1xuICAgICAgICAgIGl0ZXJhdGlvbnMrKztcbiAgICAgICAgICByZXR1cm4gZm4odiwgdXNlS2V5cyA/IGsgOiBpdGVyYXRpb25zIC0gMSwgdGhpcyQwKSAhPT0gZmFsc2UgJiZcbiAgICAgICAgICAgICAgICAgaXRlcmF0aW9ucyAhPT0gc2xpY2VTaXplO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBpdGVyYXRpb25zO1xuICAgIH07XG5cbiAgICBzbGljZVNlcS5fX2l0ZXJhdG9yVW5jYWNoZWQgPSBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7XG4gICAgICBpZiAoc2xpY2VTaXplICE9PSAwICYmIHJldmVyc2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpO1xuICAgICAgfVxuICAgICAgLy8gRG9uJ3QgYm90aGVyIGluc3RhbnRpYXRpbmcgcGFyZW50IGl0ZXJhdG9yIGlmIHRha2luZyAwLlxuICAgICAgdmFyIGl0ZXJhdG9yID0gc2xpY2VTaXplICE9PSAwICYmIGl0ZXJhYmxlLl9faXRlcmF0b3IodHlwZSwgcmV2ZXJzZSk7XG4gICAgICB2YXIgc2tpcHBlZCA9IDA7XG4gICAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKGZ1bmN0aW9uKCkgIHtcbiAgICAgICAgd2hpbGUgKHNraXBwZWQrKyA8IHJlc29sdmVkQmVnaW4pIHtcbiAgICAgICAgICBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCsraXRlcmF0aW9ucyA+IHNsaWNlU2l6ZSkge1xuICAgICAgICAgIHJldHVybiBpdGVyYXRvckRvbmUoKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3RlcCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgaWYgKHVzZUtleXMgfHwgdHlwZSA9PT0gSVRFUkFURV9WQUxVRVMpIHtcbiAgICAgICAgICByZXR1cm4gc3RlcDtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSBJVEVSQVRFX0tFWVMpIHtcbiAgICAgICAgICByZXR1cm4gaXRlcmF0b3JWYWx1ZSh0eXBlLCBpdGVyYXRpb25zIC0gMSwgdW5kZWZpbmVkLCBzdGVwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gaXRlcmF0b3JWYWx1ZSh0eXBlLCBpdGVyYXRpb25zIC0gMSwgc3RlcC52YWx1ZVsxXSwgc3RlcCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBzbGljZVNlcTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gdGFrZVdoaWxlRmFjdG9yeShpdGVyYWJsZSwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgdmFyIHRha2VTZXF1ZW5jZSA9IG1ha2VTZXF1ZW5jZShpdGVyYWJsZSk7XG4gICAgdGFrZVNlcXVlbmNlLl9faXRlcmF0ZVVuY2FjaGVkID0gZnVuY3Rpb24oZm4sIHJldmVyc2UpIHt2YXIgdGhpcyQwID0gdGhpcztcbiAgICAgIGlmIChyZXZlcnNlKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhY2hlUmVzdWx0KCkuX19pdGVyYXRlKGZuLCByZXZlcnNlKTtcbiAgICAgIH1cbiAgICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICAgIGl0ZXJhYmxlLl9faXRlcmF0ZShmdW5jdGlvbih2LCBrLCBjKSBcbiAgICAgICAge3JldHVybiBwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2LCBrLCBjKSAmJiArK2l0ZXJhdGlvbnMgJiYgZm4odiwgaywgdGhpcyQwKX1cbiAgICAgICk7XG4gICAgICByZXR1cm4gaXRlcmF0aW9ucztcbiAgICB9O1xuICAgIHRha2VTZXF1ZW5jZS5fX2l0ZXJhdG9yVW5jYWNoZWQgPSBmdW5jdGlvbih0eXBlLCByZXZlcnNlKSB7dmFyIHRoaXMkMCA9IHRoaXM7XG4gICAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0b3IodHlwZSwgcmV2ZXJzZSk7XG4gICAgICB9XG4gICAgICB2YXIgaXRlcmF0b3IgPSBpdGVyYWJsZS5fX2l0ZXJhdG9yKElURVJBVEVfRU5UUklFUywgcmV2ZXJzZSk7XG4gICAgICB2YXIgaXRlcmF0aW5nID0gdHJ1ZTtcbiAgICAgIHJldHVybiBuZXcgSXRlcmF0b3IoZnVuY3Rpb24oKSAge1xuICAgICAgICBpZiAoIWl0ZXJhdGluZykge1xuICAgICAgICAgIHJldHVybiBpdGVyYXRvckRvbmUoKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3RlcCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgaWYgKHN0ZXAuZG9uZSkge1xuICAgICAgICAgIHJldHVybiBzdGVwO1xuICAgICAgICB9XG4gICAgICAgIHZhciBlbnRyeSA9IHN0ZXAudmFsdWU7XG4gICAgICAgIHZhciBrID0gZW50cnlbMF07XG4gICAgICAgIHZhciB2ID0gZW50cnlbMV07XG4gICAgICAgIGlmICghcHJlZGljYXRlLmNhbGwoY29udGV4dCwgdiwgaywgdGhpcyQwKSkge1xuICAgICAgICAgIGl0ZXJhdGluZyA9IGZhbHNlO1xuICAgICAgICAgIHJldHVybiBpdGVyYXRvckRvbmUoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHlwZSA9PT0gSVRFUkFURV9FTlRSSUVTID8gc3RlcCA6XG4gICAgICAgICAgaXRlcmF0b3JWYWx1ZSh0eXBlLCBrLCB2LCBzdGVwKTtcbiAgICAgIH0pO1xuICAgIH07XG4gICAgcmV0dXJuIHRha2VTZXF1ZW5jZTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gc2tpcFdoaWxlRmFjdG9yeShpdGVyYWJsZSwgcHJlZGljYXRlLCBjb250ZXh0LCB1c2VLZXlzKSB7XG4gICAgdmFyIHNraXBTZXF1ZW5jZSA9IG1ha2VTZXF1ZW5jZShpdGVyYWJsZSk7XG4gICAgc2tpcFNlcXVlbmNlLl9faXRlcmF0ZVVuY2FjaGVkID0gZnVuY3Rpb24gKGZuLCByZXZlcnNlKSB7dmFyIHRoaXMkMCA9IHRoaXM7XG4gICAgICBpZiAocmV2ZXJzZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5jYWNoZVJlc3VsdCgpLl9faXRlcmF0ZShmbiwgcmV2ZXJzZSk7XG4gICAgICB9XG4gICAgICB2YXIgaXNTa2lwcGluZyA9IHRydWU7XG4gICAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgICBpdGVyYWJsZS5fX2l0ZXJhdGUoZnVuY3Rpb24odiwgaywgYykgIHtcbiAgICAgICAgaWYgKCEoaXNTa2lwcGluZyAmJiAoaXNTa2lwcGluZyA9IHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHYsIGssIGMpKSkpIHtcbiAgICAgICAgICBpdGVyYXRpb25zKys7XG4gICAgICAgICAgcmV0dXJuIGZuKHYsIHVzZUtleXMgPyBrIDogaXRlcmF0aW9ucyAtIDEsIHRoaXMkMCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGl0ZXJhdGlvbnM7XG4gICAgfTtcbiAgICBza2lwU2VxdWVuY2UuX19pdGVyYXRvclVuY2FjaGVkID0gZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge3ZhciB0aGlzJDAgPSB0aGlzO1xuICAgICAgaWYgKHJldmVyc2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FjaGVSZXN1bHQoKS5fX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpO1xuICAgICAgfVxuICAgICAgdmFyIGl0ZXJhdG9yID0gaXRlcmFibGUuX19pdGVyYXRvcihJVEVSQVRFX0VOVFJJRVMsIHJldmVyc2UpO1xuICAgICAgdmFyIHNraXBwaW5nID0gdHJ1ZTtcbiAgICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICAgIHJldHVybiBuZXcgSXRlcmF0b3IoZnVuY3Rpb24oKSAge1xuICAgICAgICB2YXIgc3RlcCwgaywgdjtcbiAgICAgICAgZG8ge1xuICAgICAgICAgIHN0ZXAgPSBpdGVyYXRvci5uZXh0KCk7XG4gICAgICAgICAgaWYgKHN0ZXAuZG9uZSkge1xuICAgICAgICAgICAgaWYgKHVzZUtleXMgfHwgdHlwZSA9PT0gSVRFUkFURV9WQUxVRVMpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHN0ZXA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09IElURVJBVEVfS0VZUykge1xuICAgICAgICAgICAgICByZXR1cm4gaXRlcmF0b3JWYWx1ZSh0eXBlLCBpdGVyYXRpb25zKyssIHVuZGVmaW5lZCwgc3RlcCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gaXRlcmF0b3JWYWx1ZSh0eXBlLCBpdGVyYXRpb25zKyssIHN0ZXAudmFsdWVbMV0sIHN0ZXApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgZW50cnkgPSBzdGVwLnZhbHVlO1xuICAgICAgICAgIGsgPSBlbnRyeVswXTtcbiAgICAgICAgICB2ID0gZW50cnlbMV07XG4gICAgICAgICAgc2tpcHBpbmcgJiYgKHNraXBwaW5nID0gcHJlZGljYXRlLmNhbGwoY29udGV4dCwgdiwgaywgdGhpcyQwKSk7XG4gICAgICAgIH0gd2hpbGUgKHNraXBwaW5nKTtcbiAgICAgICAgcmV0dXJuIHR5cGUgPT09IElURVJBVEVfRU5UUklFUyA/IHN0ZXAgOlxuICAgICAgICAgIGl0ZXJhdG9yVmFsdWUodHlwZSwgaywgdiwgc3RlcCk7XG4gICAgICB9KTtcbiAgICB9O1xuICAgIHJldHVybiBza2lwU2VxdWVuY2U7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIGNvbmNhdEZhY3RvcnkoaXRlcmFibGUsIHZhbHVlcykge1xuICAgIHZhciBpc0tleWVkSXRlcmFibGUgPSBpc0tleWVkKGl0ZXJhYmxlKTtcbiAgICB2YXIgaXRlcnMgPSBbaXRlcmFibGVdLmNvbmNhdCh2YWx1ZXMpLm1hcChmdW5jdGlvbih2ICkge1xuICAgICAgaWYgKCFpc0l0ZXJhYmxlKHYpKSB7XG4gICAgICAgIHYgPSBpc0tleWVkSXRlcmFibGUgP1xuICAgICAgICAgIGtleWVkU2VxRnJvbVZhbHVlKHYpIDpcbiAgICAgICAgICBpbmRleGVkU2VxRnJvbVZhbHVlKEFycmF5LmlzQXJyYXkodikgPyB2IDogW3ZdKTtcbiAgICAgIH0gZWxzZSBpZiAoaXNLZXllZEl0ZXJhYmxlKSB7XG4gICAgICAgIHYgPSBLZXllZEl0ZXJhYmxlKHYpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHY7XG4gICAgfSkuZmlsdGVyKGZ1bmN0aW9uKHYgKSB7cmV0dXJuIHYuc2l6ZSAhPT0gMH0pO1xuXG4gICAgaWYgKGl0ZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGl0ZXJhYmxlO1xuICAgIH1cblxuICAgIGlmIChpdGVycy5sZW5ndGggPT09IDEpIHtcbiAgICAgIHZhciBzaW5nbGV0b24gPSBpdGVyc1swXTtcbiAgICAgIGlmIChzaW5nbGV0b24gPT09IGl0ZXJhYmxlIHx8XG4gICAgICAgICAgaXNLZXllZEl0ZXJhYmxlICYmIGlzS2V5ZWQoc2luZ2xldG9uKSB8fFxuICAgICAgICAgIGlzSW5kZXhlZChpdGVyYWJsZSkgJiYgaXNJbmRleGVkKHNpbmdsZXRvbikpIHtcbiAgICAgICAgcmV0dXJuIHNpbmdsZXRvbjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgY29uY2F0U2VxID0gbmV3IEFycmF5U2VxKGl0ZXJzKTtcbiAgICBpZiAoaXNLZXllZEl0ZXJhYmxlKSB7XG4gICAgICBjb25jYXRTZXEgPSBjb25jYXRTZXEudG9LZXllZFNlcSgpO1xuICAgIH0gZWxzZSBpZiAoIWlzSW5kZXhlZChpdGVyYWJsZSkpIHtcbiAgICAgIGNvbmNhdFNlcSA9IGNvbmNhdFNlcS50b1NldFNlcSgpO1xuICAgIH1cbiAgICBjb25jYXRTZXEgPSBjb25jYXRTZXEuZmxhdHRlbih0cnVlKTtcbiAgICBjb25jYXRTZXEuc2l6ZSA9IGl0ZXJzLnJlZHVjZShcbiAgICAgIGZ1bmN0aW9uKHN1bSwgc2VxKSAge1xuICAgICAgICBpZiAoc3VtICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB2YXIgc2l6ZSA9IHNlcS5zaXplO1xuICAgICAgICAgIGlmIChzaXplICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBzdW0gKyBzaXplO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIDBcbiAgICApO1xuICAgIHJldHVybiBjb25jYXRTZXE7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIGZsYXR0ZW5GYWN0b3J5KGl0ZXJhYmxlLCBkZXB0aCwgdXNlS2V5cykge1xuICAgIHZhciBmbGF0U2VxdWVuY2UgPSBtYWtlU2VxdWVuY2UoaXRlcmFibGUpO1xuICAgIGZsYXRTZXF1ZW5jZS5fX2l0ZXJhdGVVbmNhY2hlZCA9IGZ1bmN0aW9uKGZuLCByZXZlcnNlKSB7XG4gICAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgICB2YXIgc3RvcHBlZCA9IGZhbHNlO1xuICAgICAgZnVuY3Rpb24gZmxhdERlZXAoaXRlciwgY3VycmVudERlcHRoKSB7dmFyIHRoaXMkMCA9IHRoaXM7XG4gICAgICAgIGl0ZXIuX19pdGVyYXRlKGZ1bmN0aW9uKHYsIGspICB7XG4gICAgICAgICAgaWYgKCghZGVwdGggfHwgY3VycmVudERlcHRoIDwgZGVwdGgpICYmIGlzSXRlcmFibGUodikpIHtcbiAgICAgICAgICAgIGZsYXREZWVwKHYsIGN1cnJlbnREZXB0aCArIDEpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZm4odiwgdXNlS2V5cyA/IGsgOiBpdGVyYXRpb25zKyssIHRoaXMkMCkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBzdG9wcGVkID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuICFzdG9wcGVkO1xuICAgICAgICB9LCByZXZlcnNlKTtcbiAgICAgIH1cbiAgICAgIGZsYXREZWVwKGl0ZXJhYmxlLCAwKTtcbiAgICAgIHJldHVybiBpdGVyYXRpb25zO1xuICAgIH1cbiAgICBmbGF0U2VxdWVuY2UuX19pdGVyYXRvclVuY2FjaGVkID0gZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgICAgdmFyIGl0ZXJhdG9yID0gaXRlcmFibGUuX19pdGVyYXRvcih0eXBlLCByZXZlcnNlKTtcbiAgICAgIHZhciBzdGFjayA9IFtdO1xuICAgICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgICAgcmV0dXJuIG5ldyBJdGVyYXRvcihmdW5jdGlvbigpICB7XG4gICAgICAgIHdoaWxlIChpdGVyYXRvcikge1xuICAgICAgICAgIHZhciBzdGVwID0gaXRlcmF0b3IubmV4dCgpO1xuICAgICAgICAgIGlmIChzdGVwLmRvbmUgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICBpdGVyYXRvciA9IHN0YWNrLnBvcCgpO1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhciB2ID0gc3RlcC52YWx1ZTtcbiAgICAgICAgICBpZiAodHlwZSA9PT0gSVRFUkFURV9FTlRSSUVTKSB7XG4gICAgICAgICAgICB2ID0gdlsxXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCghZGVwdGggfHwgc3RhY2subGVuZ3RoIDwgZGVwdGgpICYmIGlzSXRlcmFibGUodikpIHtcbiAgICAgICAgICAgIHN0YWNrLnB1c2goaXRlcmF0b3IpO1xuICAgICAgICAgICAgaXRlcmF0b3IgPSB2Ll9faXRlcmF0b3IodHlwZSwgcmV2ZXJzZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB1c2VLZXlzID8gc3RlcCA6IGl0ZXJhdG9yVmFsdWUodHlwZSwgaXRlcmF0aW9ucysrLCB2LCBzdGVwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yRG9uZSgpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBmbGF0U2VxdWVuY2U7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIGZsYXRNYXBGYWN0b3J5KGl0ZXJhYmxlLCBtYXBwZXIsIGNvbnRleHQpIHtcbiAgICB2YXIgY29lcmNlID0gaXRlcmFibGVDbGFzcyhpdGVyYWJsZSk7XG4gICAgcmV0dXJuIGl0ZXJhYmxlLnRvU2VxKCkubWFwKFxuICAgICAgZnVuY3Rpb24odiwgaykgIHtyZXR1cm4gY29lcmNlKG1hcHBlci5jYWxsKGNvbnRleHQsIHYsIGssIGl0ZXJhYmxlKSl9XG4gICAgKS5mbGF0dGVuKHRydWUpO1xuICB9XG5cblxuICBmdW5jdGlvbiBpbnRlcnBvc2VGYWN0b3J5KGl0ZXJhYmxlLCBzZXBhcmF0b3IpIHtcbiAgICB2YXIgaW50ZXJwb3NlZFNlcXVlbmNlID0gbWFrZVNlcXVlbmNlKGl0ZXJhYmxlKTtcbiAgICBpbnRlcnBvc2VkU2VxdWVuY2Uuc2l6ZSA9IGl0ZXJhYmxlLnNpemUgJiYgaXRlcmFibGUuc2l6ZSAqIDIgLTE7XG4gICAgaW50ZXJwb3NlZFNlcXVlbmNlLl9faXRlcmF0ZVVuY2FjaGVkID0gZnVuY3Rpb24oZm4sIHJldmVyc2UpIHt2YXIgdGhpcyQwID0gdGhpcztcbiAgICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICAgIGl0ZXJhYmxlLl9faXRlcmF0ZShmdW5jdGlvbih2LCBrKSBcbiAgICAgICAge3JldHVybiAoIWl0ZXJhdGlvbnMgfHwgZm4oc2VwYXJhdG9yLCBpdGVyYXRpb25zKyssIHRoaXMkMCkgIT09IGZhbHNlKSAmJlxuICAgICAgICBmbih2LCBpdGVyYXRpb25zKyssIHRoaXMkMCkgIT09IGZhbHNlfSxcbiAgICAgICAgcmV2ZXJzZVxuICAgICAgKTtcbiAgICAgIHJldHVybiBpdGVyYXRpb25zO1xuICAgIH07XG4gICAgaW50ZXJwb3NlZFNlcXVlbmNlLl9faXRlcmF0b3JVbmNhY2hlZCA9IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHtcbiAgICAgIHZhciBpdGVyYXRvciA9IGl0ZXJhYmxlLl9faXRlcmF0b3IoSVRFUkFURV9WQUxVRVMsIHJldmVyc2UpO1xuICAgICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgICAgdmFyIHN0ZXA7XG4gICAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKGZ1bmN0aW9uKCkgIHtcbiAgICAgICAgaWYgKCFzdGVwIHx8IGl0ZXJhdGlvbnMgJSAyKSB7XG4gICAgICAgICAgc3RlcCA9IGl0ZXJhdG9yLm5leHQoKTtcbiAgICAgICAgICBpZiAoc3RlcC5kb25lKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RlcDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGl0ZXJhdGlvbnMgJSAyID9cbiAgICAgICAgICBpdGVyYXRvclZhbHVlKHR5cGUsIGl0ZXJhdGlvbnMrKywgc2VwYXJhdG9yKSA6XG4gICAgICAgICAgaXRlcmF0b3JWYWx1ZSh0eXBlLCBpdGVyYXRpb25zKyssIHN0ZXAudmFsdWUsIHN0ZXApO1xuICAgICAgfSk7XG4gICAgfTtcbiAgICByZXR1cm4gaW50ZXJwb3NlZFNlcXVlbmNlO1xuICB9XG5cblxuICBmdW5jdGlvbiBzb3J0RmFjdG9yeShpdGVyYWJsZSwgY29tcGFyYXRvciwgbWFwcGVyKSB7XG4gICAgaWYgKCFjb21wYXJhdG9yKSB7XG4gICAgICBjb21wYXJhdG9yID0gZGVmYXVsdENvbXBhcmF0b3I7XG4gICAgfVxuICAgIHZhciBpc0tleWVkSXRlcmFibGUgPSBpc0tleWVkKGl0ZXJhYmxlKTtcbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciBlbnRyaWVzID0gaXRlcmFibGUudG9TZXEoKS5tYXAoXG4gICAgICBmdW5jdGlvbih2LCBrKSAge3JldHVybiBbaywgdiwgaW5kZXgrKywgbWFwcGVyID8gbWFwcGVyKHYsIGssIGl0ZXJhYmxlKSA6IHZdfVxuICAgICkudG9BcnJheSgpO1xuICAgIGVudHJpZXMuc29ydChmdW5jdGlvbihhLCBiKSAge3JldHVybiBjb21wYXJhdG9yKGFbM10sIGJbM10pIHx8IGFbMl0gLSBiWzJdfSkuZm9yRWFjaChcbiAgICAgIGlzS2V5ZWRJdGVyYWJsZSA/XG4gICAgICBmdW5jdGlvbih2LCBpKSAgeyBlbnRyaWVzW2ldLmxlbmd0aCA9IDI7IH0gOlxuICAgICAgZnVuY3Rpb24odiwgaSkgIHsgZW50cmllc1tpXSA9IHZbMV07IH1cbiAgICApO1xuICAgIHJldHVybiBpc0tleWVkSXRlcmFibGUgPyBLZXllZFNlcShlbnRyaWVzKSA6XG4gICAgICBpc0luZGV4ZWQoaXRlcmFibGUpID8gSW5kZXhlZFNlcShlbnRyaWVzKSA6XG4gICAgICBTZXRTZXEoZW50cmllcyk7XG4gIH1cblxuXG4gIGZ1bmN0aW9uIG1heEZhY3RvcnkoaXRlcmFibGUsIGNvbXBhcmF0b3IsIG1hcHBlcikge1xuICAgIGlmICghY29tcGFyYXRvcikge1xuICAgICAgY29tcGFyYXRvciA9IGRlZmF1bHRDb21wYXJhdG9yO1xuICAgIH1cbiAgICBpZiAobWFwcGVyKSB7XG4gICAgICB2YXIgZW50cnkgPSBpdGVyYWJsZS50b1NlcSgpXG4gICAgICAgIC5tYXAoZnVuY3Rpb24odiwgaykgIHtyZXR1cm4gW3YsIG1hcHBlcih2LCBrLCBpdGVyYWJsZSldfSlcbiAgICAgICAgLnJlZHVjZShmdW5jdGlvbihhLCBiKSAge3JldHVybiBtYXhDb21wYXJlKGNvbXBhcmF0b3IsIGFbMV0sIGJbMV0pID8gYiA6IGF9KTtcbiAgICAgIHJldHVybiBlbnRyeSAmJiBlbnRyeVswXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGl0ZXJhYmxlLnJlZHVjZShmdW5jdGlvbihhLCBiKSAge3JldHVybiBtYXhDb21wYXJlKGNvbXBhcmF0b3IsIGEsIGIpID8gYiA6IGF9KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBtYXhDb21wYXJlKGNvbXBhcmF0b3IsIGEsIGIpIHtcbiAgICB2YXIgY29tcCA9IGNvbXBhcmF0b3IoYiwgYSk7XG4gICAgLy8gYiBpcyBjb25zaWRlcmVkIHRoZSBuZXcgbWF4IGlmIHRoZSBjb21wYXJhdG9yIGRlY2xhcmVzIHRoZW0gZXF1YWwsIGJ1dFxuICAgIC8vIHRoZXkgYXJlIG5vdCBlcXVhbCBhbmQgYiBpcyBpbiBmYWN0IGEgbnVsbGlzaCB2YWx1ZS5cbiAgICByZXR1cm4gKGNvbXAgPT09IDAgJiYgYiAhPT0gYSAmJiAoYiA9PT0gdW5kZWZpbmVkIHx8IGIgPT09IG51bGwgfHwgYiAhPT0gYikpIHx8IGNvbXAgPiAwO1xuICB9XG5cblxuICBmdW5jdGlvbiB6aXBXaXRoRmFjdG9yeShrZXlJdGVyLCB6aXBwZXIsIGl0ZXJzKSB7XG4gICAgdmFyIHppcFNlcXVlbmNlID0gbWFrZVNlcXVlbmNlKGtleUl0ZXIpO1xuICAgIHppcFNlcXVlbmNlLnNpemUgPSBuZXcgQXJyYXlTZXEoaXRlcnMpLm1hcChmdW5jdGlvbihpICkge3JldHVybiBpLnNpemV9KS5taW4oKTtcbiAgICAvLyBOb3RlOiB0aGlzIGEgZ2VuZXJpYyBiYXNlIGltcGxlbWVudGF0aW9uIG9mIF9faXRlcmF0ZSBpbiB0ZXJtcyBvZlxuICAgIC8vIF9faXRlcmF0b3Igd2hpY2ggbWF5IGJlIG1vcmUgZ2VuZXJpY2FsbHkgdXNlZnVsIGluIHRoZSBmdXR1cmUuXG4gICAgemlwU2VxdWVuY2UuX19pdGVyYXRlID0gZnVuY3Rpb24oZm4sIHJldmVyc2UpIHtcbiAgICAgIC8qIGdlbmVyaWM6XG4gICAgICB2YXIgaXRlcmF0b3IgPSB0aGlzLl9faXRlcmF0b3IoSVRFUkFURV9FTlRSSUVTLCByZXZlcnNlKTtcbiAgICAgIHZhciBzdGVwO1xuICAgICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgICAgd2hpbGUgKCEoc3RlcCA9IGl0ZXJhdG9yLm5leHQoKSkuZG9uZSkge1xuICAgICAgICBpdGVyYXRpb25zKys7XG4gICAgICAgIGlmIChmbihzdGVwLnZhbHVlWzFdLCBzdGVwLnZhbHVlWzBdLCB0aGlzKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGl0ZXJhdGlvbnM7XG4gICAgICAqL1xuICAgICAgLy8gaW5kZXhlZDpcbiAgICAgIHZhciBpdGVyYXRvciA9IHRoaXMuX19pdGVyYXRvcihJVEVSQVRFX1ZBTFVFUywgcmV2ZXJzZSk7XG4gICAgICB2YXIgc3RlcDtcbiAgICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICAgIHdoaWxlICghKHN0ZXAgPSBpdGVyYXRvci5uZXh0KCkpLmRvbmUpIHtcbiAgICAgICAgaWYgKGZuKHN0ZXAudmFsdWUsIGl0ZXJhdGlvbnMrKywgdGhpcykgPT09IGZhbHNlKSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBpdGVyYXRpb25zO1xuICAgIH07XG4gICAgemlwU2VxdWVuY2UuX19pdGVyYXRvclVuY2FjaGVkID0gZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgICAgdmFyIGl0ZXJhdG9ycyA9IGl0ZXJzLm1hcChmdW5jdGlvbihpIClcbiAgICAgICAge3JldHVybiAoaSA9IEl0ZXJhYmxlKGkpLCBnZXRJdGVyYXRvcihyZXZlcnNlID8gaS5yZXZlcnNlKCkgOiBpKSl9XG4gICAgICApO1xuICAgICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgICAgdmFyIGlzRG9uZSA9IGZhbHNlO1xuICAgICAgcmV0dXJuIG5ldyBJdGVyYXRvcihmdW5jdGlvbigpICB7XG4gICAgICAgIHZhciBzdGVwcztcbiAgICAgICAgaWYgKCFpc0RvbmUpIHtcbiAgICAgICAgICBzdGVwcyA9IGl0ZXJhdG9ycy5tYXAoZnVuY3Rpb24oaSApIHtyZXR1cm4gaS5uZXh0KCl9KTtcbiAgICAgICAgICBpc0RvbmUgPSBzdGVwcy5zb21lKGZ1bmN0aW9uKHMgKSB7cmV0dXJuIHMuZG9uZX0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0RvbmUpIHtcbiAgICAgICAgICByZXR1cm4gaXRlcmF0b3JEb25lKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yVmFsdWUoXG4gICAgICAgICAgdHlwZSxcbiAgICAgICAgICBpdGVyYXRpb25zKyssXG4gICAgICAgICAgemlwcGVyLmFwcGx5KG51bGwsIHN0ZXBzLm1hcChmdW5jdGlvbihzICkge3JldHVybiBzLnZhbHVlfSkpXG4gICAgICAgICk7XG4gICAgICB9KTtcbiAgICB9O1xuICAgIHJldHVybiB6aXBTZXF1ZW5jZVxuICB9XG5cblxuICAvLyAjcHJhZ21hIEhlbHBlciBGdW5jdGlvbnNcblxuICBmdW5jdGlvbiByZWlmeShpdGVyLCBzZXEpIHtcbiAgICByZXR1cm4gaXNTZXEoaXRlcikgPyBzZXEgOiBpdGVyLmNvbnN0cnVjdG9yKHNlcSk7XG4gIH1cblxuICBmdW5jdGlvbiB2YWxpZGF0ZUVudHJ5KGVudHJ5KSB7XG4gICAgaWYgKGVudHJ5ICE9PSBPYmplY3QoZW50cnkpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdFeHBlY3RlZCBbSywgVl0gdHVwbGU6ICcgKyBlbnRyeSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVzb2x2ZVNpemUoaXRlcikge1xuICAgIGFzc2VydE5vdEluZmluaXRlKGl0ZXIuc2l6ZSk7XG4gICAgcmV0dXJuIGVuc3VyZVNpemUoaXRlcik7XG4gIH1cblxuICBmdW5jdGlvbiBpdGVyYWJsZUNsYXNzKGl0ZXJhYmxlKSB7XG4gICAgcmV0dXJuIGlzS2V5ZWQoaXRlcmFibGUpID8gS2V5ZWRJdGVyYWJsZSA6XG4gICAgICBpc0luZGV4ZWQoaXRlcmFibGUpID8gSW5kZXhlZEl0ZXJhYmxlIDpcbiAgICAgIFNldEl0ZXJhYmxlO1xuICB9XG5cbiAgZnVuY3Rpb24gbWFrZVNlcXVlbmNlKGl0ZXJhYmxlKSB7XG4gICAgcmV0dXJuIE9iamVjdC5jcmVhdGUoXG4gICAgICAoXG4gICAgICAgIGlzS2V5ZWQoaXRlcmFibGUpID8gS2V5ZWRTZXEgOlxuICAgICAgICBpc0luZGV4ZWQoaXRlcmFibGUpID8gSW5kZXhlZFNlcSA6XG4gICAgICAgIFNldFNlcVxuICAgICAgKS5wcm90b3R5cGVcbiAgICApO1xuICB9XG5cbiAgZnVuY3Rpb24gY2FjaGVSZXN1bHRUaHJvdWdoKCkge1xuICAgIGlmICh0aGlzLl9pdGVyLmNhY2hlUmVzdWx0KSB7XG4gICAgICB0aGlzLl9pdGVyLmNhY2hlUmVzdWx0KCk7XG4gICAgICB0aGlzLnNpemUgPSB0aGlzLl9pdGVyLnNpemU7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFNlcS5wcm90b3R5cGUuY2FjaGVSZXN1bHQuY2FsbCh0aGlzKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBkZWZhdWx0Q29tcGFyYXRvcihhLCBiKSB7XG4gICAgcmV0dXJuIGEgPiBiID8gMSA6IGEgPCBiID8gLTEgOiAwO1xuICB9XG5cbiAgZnVuY3Rpb24gZm9yY2VJdGVyYXRvcihrZXlQYXRoKSB7XG4gICAgdmFyIGl0ZXIgPSBnZXRJdGVyYXRvcihrZXlQYXRoKTtcbiAgICBpZiAoIWl0ZXIpIHtcbiAgICAgIC8vIEFycmF5IG1pZ2h0IG5vdCBiZSBpdGVyYWJsZSBpbiB0aGlzIGVudmlyb25tZW50LCBzbyB3ZSBuZWVkIGEgZmFsbGJhY2tcbiAgICAgIC8vIHRvIG91ciB3cmFwcGVkIHR5cGUuXG4gICAgICBpZiAoIWlzQXJyYXlMaWtlKGtleVBhdGgpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIGl0ZXJhYmxlIG9yIGFycmF5LWxpa2U6ICcgKyBrZXlQYXRoKTtcbiAgICAgIH1cbiAgICAgIGl0ZXIgPSBnZXRJdGVyYXRvcihJdGVyYWJsZShrZXlQYXRoKSk7XG4gICAgfVxuICAgIHJldHVybiBpdGVyO1xuICB9XG5cbiAgY3JlYXRlQ2xhc3MoUmVjb3JkLCBLZXllZENvbGxlY3Rpb24pO1xuXG4gICAgZnVuY3Rpb24gUmVjb3JkKGRlZmF1bHRWYWx1ZXMsIG5hbWUpIHtcbiAgICAgIHZhciBoYXNJbml0aWFsaXplZDtcblxuICAgICAgdmFyIFJlY29yZFR5cGUgPSBmdW5jdGlvbiBSZWNvcmQodmFsdWVzKSB7XG4gICAgICAgIGlmICh2YWx1ZXMgaW5zdGFuY2VvZiBSZWNvcmRUeXBlKSB7XG4gICAgICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICAgICAgfVxuICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUmVjb3JkVHlwZSkpIHtcbiAgICAgICAgICByZXR1cm4gbmV3IFJlY29yZFR5cGUodmFsdWVzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWhhc0luaXRpYWxpemVkKSB7XG4gICAgICAgICAgaGFzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZGVmYXVsdFZhbHVlcyk7XG4gICAgICAgICAgc2V0UHJvcHMoUmVjb3JkVHlwZVByb3RvdHlwZSwga2V5cyk7XG4gICAgICAgICAgUmVjb3JkVHlwZVByb3RvdHlwZS5zaXplID0ga2V5cy5sZW5ndGg7XG4gICAgICAgICAgUmVjb3JkVHlwZVByb3RvdHlwZS5fbmFtZSA9IG5hbWU7XG4gICAgICAgICAgUmVjb3JkVHlwZVByb3RvdHlwZS5fa2V5cyA9IGtleXM7XG4gICAgICAgICAgUmVjb3JkVHlwZVByb3RvdHlwZS5fZGVmYXVsdFZhbHVlcyA9IGRlZmF1bHRWYWx1ZXM7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fbWFwID0gTWFwKHZhbHVlcyk7XG4gICAgICB9O1xuXG4gICAgICB2YXIgUmVjb3JkVHlwZVByb3RvdHlwZSA9IFJlY29yZFR5cGUucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShSZWNvcmRQcm90b3R5cGUpO1xuICAgICAgUmVjb3JkVHlwZVByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFJlY29yZFR5cGU7XG5cbiAgICAgIHJldHVybiBSZWNvcmRUeXBlO1xuICAgIH1cblxuICAgIFJlY29yZC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9fdG9TdHJpbmcocmVjb3JkTmFtZSh0aGlzKSArICcgeycsICd9Jyk7XG4gICAgfTtcblxuICAgIC8vIEBwcmFnbWEgQWNjZXNzXG5cbiAgICBSZWNvcmQucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uKGspIHtcbiAgICAgIHJldHVybiB0aGlzLl9kZWZhdWx0VmFsdWVzLmhhc093blByb3BlcnR5KGspO1xuICAgIH07XG5cbiAgICBSZWNvcmQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uKGssIG5vdFNldFZhbHVlKSB7XG4gICAgICBpZiAoIXRoaXMuaGFzKGspKSB7XG4gICAgICAgIHJldHVybiBub3RTZXRWYWx1ZTtcbiAgICAgIH1cbiAgICAgIHZhciBkZWZhdWx0VmFsID0gdGhpcy5fZGVmYXVsdFZhbHVlc1trXTtcbiAgICAgIHJldHVybiB0aGlzLl9tYXAgPyB0aGlzLl9tYXAuZ2V0KGssIGRlZmF1bHRWYWwpIDogZGVmYXVsdFZhbDtcbiAgICB9O1xuXG4gICAgLy8gQHByYWdtYSBNb2RpZmljYXRpb25cblxuICAgIFJlY29yZC5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLl9fb3duZXJJRCkge1xuICAgICAgICB0aGlzLl9tYXAgJiYgdGhpcy5fbWFwLmNsZWFyKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgdmFyIFJlY29yZFR5cGUgPSB0aGlzLmNvbnN0cnVjdG9yO1xuICAgICAgcmV0dXJuIFJlY29yZFR5cGUuX2VtcHR5IHx8IChSZWNvcmRUeXBlLl9lbXB0eSA9IG1ha2VSZWNvcmQodGhpcywgZW1wdHlNYXAoKSkpO1xuICAgIH07XG5cbiAgICBSZWNvcmQucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKGssIHYpIHtcbiAgICAgIGlmICghdGhpcy5oYXMoaykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3Qgc2V0IHVua25vd24ga2V5IFwiJyArIGsgKyAnXCIgb24gJyArIHJlY29yZE5hbWUodGhpcykpO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuX21hcCAmJiAhdGhpcy5fbWFwLmhhcyhrKSkge1xuICAgICAgICB2YXIgZGVmYXVsdFZhbCA9IHRoaXMuX2RlZmF1bHRWYWx1ZXNba107XG4gICAgICAgIGlmICh2ID09PSBkZWZhdWx0VmFsKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciBuZXdNYXAgPSB0aGlzLl9tYXAgJiYgdGhpcy5fbWFwLnNldChrLCB2KTtcbiAgICAgIGlmICh0aGlzLl9fb3duZXJJRCB8fCBuZXdNYXAgPT09IHRoaXMuX21hcCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHJldHVybiBtYWtlUmVjb3JkKHRoaXMsIG5ld01hcCk7XG4gICAgfTtcblxuICAgIFJlY29yZC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24oaykge1xuICAgICAgaWYgKCF0aGlzLmhhcyhrKSkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHZhciBuZXdNYXAgPSB0aGlzLl9tYXAgJiYgdGhpcy5fbWFwLnJlbW92ZShrKTtcbiAgICAgIGlmICh0aGlzLl9fb3duZXJJRCB8fCBuZXdNYXAgPT09IHRoaXMuX21hcCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHJldHVybiBtYWtlUmVjb3JkKHRoaXMsIG5ld01hcCk7XG4gICAgfTtcblxuICAgIFJlY29yZC5wcm90b3R5cGUud2FzQWx0ZXJlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX21hcC53YXNBbHRlcmVkKCk7XG4gICAgfTtcblxuICAgIFJlY29yZC5wcm90b3R5cGUuX19pdGVyYXRvciA9IGZ1bmN0aW9uKHR5cGUsIHJldmVyc2UpIHt2YXIgdGhpcyQwID0gdGhpcztcbiAgICAgIHJldHVybiBLZXllZEl0ZXJhYmxlKHRoaXMuX2RlZmF1bHRWYWx1ZXMpLm1hcChmdW5jdGlvbihfLCBrKSAge3JldHVybiB0aGlzJDAuZ2V0KGspfSkuX19pdGVyYXRvcih0eXBlLCByZXZlcnNlKTtcbiAgICB9O1xuXG4gICAgUmVjb3JkLnByb3RvdHlwZS5fX2l0ZXJhdGUgPSBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge3ZhciB0aGlzJDAgPSB0aGlzO1xuICAgICAgcmV0dXJuIEtleWVkSXRlcmFibGUodGhpcy5fZGVmYXVsdFZhbHVlcykubWFwKGZ1bmN0aW9uKF8sIGspICB7cmV0dXJuIHRoaXMkMC5nZXQoayl9KS5fX2l0ZXJhdGUoZm4sIHJldmVyc2UpO1xuICAgIH07XG5cbiAgICBSZWNvcmQucHJvdG90eXBlLl9fZW5zdXJlT3duZXIgPSBmdW5jdGlvbihvd25lcklEKSB7XG4gICAgICBpZiAob3duZXJJRCA9PT0gdGhpcy5fX293bmVySUQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICB2YXIgbmV3TWFwID0gdGhpcy5fbWFwICYmIHRoaXMuX21hcC5fX2Vuc3VyZU93bmVyKG93bmVySUQpO1xuICAgICAgaWYgKCFvd25lcklEKSB7XG4gICAgICAgIHRoaXMuX19vd25lcklEID0gb3duZXJJRDtcbiAgICAgICAgdGhpcy5fbWFwID0gbmV3TWFwO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHJldHVybiBtYWtlUmVjb3JkKHRoaXMsIG5ld01hcCwgb3duZXJJRCk7XG4gICAgfTtcblxuXG4gIHZhciBSZWNvcmRQcm90b3R5cGUgPSBSZWNvcmQucHJvdG90eXBlO1xuICBSZWNvcmRQcm90b3R5cGVbREVMRVRFXSA9IFJlY29yZFByb3RvdHlwZS5yZW1vdmU7XG4gIFJlY29yZFByb3RvdHlwZS5kZWxldGVJbiA9XG4gIFJlY29yZFByb3RvdHlwZS5yZW1vdmVJbiA9IE1hcFByb3RvdHlwZS5yZW1vdmVJbjtcbiAgUmVjb3JkUHJvdG90eXBlLm1lcmdlID0gTWFwUHJvdG90eXBlLm1lcmdlO1xuICBSZWNvcmRQcm90b3R5cGUubWVyZ2VXaXRoID0gTWFwUHJvdG90eXBlLm1lcmdlV2l0aDtcbiAgUmVjb3JkUHJvdG90eXBlLm1lcmdlSW4gPSBNYXBQcm90b3R5cGUubWVyZ2VJbjtcbiAgUmVjb3JkUHJvdG90eXBlLm1lcmdlRGVlcCA9IE1hcFByb3RvdHlwZS5tZXJnZURlZXA7XG4gIFJlY29yZFByb3RvdHlwZS5tZXJnZURlZXBXaXRoID0gTWFwUHJvdG90eXBlLm1lcmdlRGVlcFdpdGg7XG4gIFJlY29yZFByb3RvdHlwZS5tZXJnZURlZXBJbiA9IE1hcFByb3RvdHlwZS5tZXJnZURlZXBJbjtcbiAgUmVjb3JkUHJvdG90eXBlLnNldEluID0gTWFwUHJvdG90eXBlLnNldEluO1xuICBSZWNvcmRQcm90b3R5cGUudXBkYXRlID0gTWFwUHJvdG90eXBlLnVwZGF0ZTtcbiAgUmVjb3JkUHJvdG90eXBlLnVwZGF0ZUluID0gTWFwUHJvdG90eXBlLnVwZGF0ZUluO1xuICBSZWNvcmRQcm90b3R5cGUud2l0aE11dGF0aW9ucyA9IE1hcFByb3RvdHlwZS53aXRoTXV0YXRpb25zO1xuICBSZWNvcmRQcm90b3R5cGUuYXNNdXRhYmxlID0gTWFwUHJvdG90eXBlLmFzTXV0YWJsZTtcbiAgUmVjb3JkUHJvdG90eXBlLmFzSW1tdXRhYmxlID0gTWFwUHJvdG90eXBlLmFzSW1tdXRhYmxlO1xuXG5cbiAgZnVuY3Rpb24gbWFrZVJlY29yZChsaWtlUmVjb3JkLCBtYXAsIG93bmVySUQpIHtcbiAgICB2YXIgcmVjb3JkID0gT2JqZWN0LmNyZWF0ZShPYmplY3QuZ2V0UHJvdG90eXBlT2YobGlrZVJlY29yZCkpO1xuICAgIHJlY29yZC5fbWFwID0gbWFwO1xuICAgIHJlY29yZC5fX293bmVySUQgPSBvd25lcklEO1xuICAgIHJldHVybiByZWNvcmQ7XG4gIH1cblxuICBmdW5jdGlvbiByZWNvcmROYW1lKHJlY29yZCkge1xuICAgIHJldHVybiByZWNvcmQuX25hbWUgfHwgcmVjb3JkLmNvbnN0cnVjdG9yLm5hbWUgfHwgJ1JlY29yZCc7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRQcm9wcyhwcm90b3R5cGUsIG5hbWVzKSB7XG4gICAgdHJ5IHtcbiAgICAgIG5hbWVzLmZvckVhY2goc2V0UHJvcC5iaW5kKHVuZGVmaW5lZCwgcHJvdG90eXBlKSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIC8vIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBmYWlsZWQuIFByb2JhYmx5IElFOC5cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzZXRQcm9wKHByb3RvdHlwZSwgbmFtZSkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90b3R5cGUsIG5hbWUsIHtcbiAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldChuYW1lKTtcbiAgICAgIH0sXG4gICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGludmFyaWFudCh0aGlzLl9fb3duZXJJRCwgJ0Nhbm5vdCBzZXQgb24gYW4gaW1tdXRhYmxlIHJlY29yZC4nKTtcbiAgICAgICAgdGhpcy5zZXQobmFtZSwgdmFsdWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY3JlYXRlQ2xhc3MoU2V0LCBTZXRDb2xsZWN0aW9uKTtcblxuICAgIC8vIEBwcmFnbWEgQ29uc3RydWN0aW9uXG5cbiAgICBmdW5jdGlvbiBTZXQodmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkID8gZW1wdHlTZXQoKSA6XG4gICAgICAgIGlzU2V0KHZhbHVlKSAmJiAhaXNPcmRlcmVkKHZhbHVlKSA/IHZhbHVlIDpcbiAgICAgICAgZW1wdHlTZXQoKS53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKHNldCApIHtcbiAgICAgICAgICB2YXIgaXRlciA9IFNldEl0ZXJhYmxlKHZhbHVlKTtcbiAgICAgICAgICBhc3NlcnROb3RJbmZpbml0ZShpdGVyLnNpemUpO1xuICAgICAgICAgIGl0ZXIuZm9yRWFjaChmdW5jdGlvbih2ICkge3JldHVybiBzZXQuYWRkKHYpfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIFNldC5vZiA9IGZ1bmN0aW9uKC8qLi4udmFsdWVzKi8pIHtcbiAgICAgIHJldHVybiB0aGlzKGFyZ3VtZW50cyk7XG4gICAgfTtcblxuICAgIFNldC5mcm9tS2V5cyA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdGhpcyhLZXllZEl0ZXJhYmxlKHZhbHVlKS5rZXlTZXEoKSk7XG4gICAgfTtcblxuICAgIFNldC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9fdG9TdHJpbmcoJ1NldCB7JywgJ30nKTtcbiAgICB9O1xuXG4gICAgLy8gQHByYWdtYSBBY2Nlc3NcblxuICAgIFNldC5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiB0aGlzLl9tYXAuaGFzKHZhbHVlKTtcbiAgICB9O1xuXG4gICAgLy8gQHByYWdtYSBNb2RpZmljYXRpb25cblxuICAgIFNldC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiB1cGRhdGVTZXQodGhpcywgdGhpcy5fbWFwLnNldCh2YWx1ZSwgdHJ1ZSkpO1xuICAgIH07XG5cbiAgICBTZXQucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdXBkYXRlU2V0KHRoaXMsIHRoaXMuX21hcC5yZW1vdmUodmFsdWUpKTtcbiAgICB9O1xuXG4gICAgU2V0LnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHVwZGF0ZVNldCh0aGlzLCB0aGlzLl9tYXAuY2xlYXIoKSk7XG4gICAgfTtcblxuICAgIC8vIEBwcmFnbWEgQ29tcG9zaXRpb25cblxuICAgIFNldC5wcm90b3R5cGUudW5pb24gPSBmdW5jdGlvbigpIHt2YXIgaXRlcnMgPSBTTElDRSQwLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgICAgIGl0ZXJzID0gaXRlcnMuZmlsdGVyKGZ1bmN0aW9uKHggKSB7cmV0dXJuIHguc2l6ZSAhPT0gMH0pO1xuICAgICAgaWYgKGl0ZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLnNpemUgPT09IDAgJiYgIXRoaXMuX19vd25lcklEICYmIGl0ZXJzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3RvcihpdGVyc1swXSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKHNldCApIHtcbiAgICAgICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IGl0ZXJzLmxlbmd0aDsgaWkrKykge1xuICAgICAgICAgIFNldEl0ZXJhYmxlKGl0ZXJzW2lpXSkuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSApIHtyZXR1cm4gc2V0LmFkZCh2YWx1ZSl9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIFNldC5wcm90b3R5cGUuaW50ZXJzZWN0ID0gZnVuY3Rpb24oKSB7dmFyIGl0ZXJzID0gU0xJQ0UkMC5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgICBpZiAoaXRlcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgaXRlcnMgPSBpdGVycy5tYXAoZnVuY3Rpb24oaXRlciApIHtyZXR1cm4gU2V0SXRlcmFibGUoaXRlcil9KTtcbiAgICAgIHZhciBvcmlnaW5hbFNldCA9IHRoaXM7XG4gICAgICByZXR1cm4gdGhpcy53aXRoTXV0YXRpb25zKGZ1bmN0aW9uKHNldCApIHtcbiAgICAgICAgb3JpZ2luYWxTZXQuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSApIHtcbiAgICAgICAgICBpZiAoIWl0ZXJzLmV2ZXJ5KGZ1bmN0aW9uKGl0ZXIgKSB7cmV0dXJuIGl0ZXIuaW5jbHVkZXModmFsdWUpfSkpIHtcbiAgICAgICAgICAgIHNldC5yZW1vdmUodmFsdWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuXG4gICAgU2V0LnByb3RvdHlwZS5zdWJ0cmFjdCA9IGZ1bmN0aW9uKCkge3ZhciBpdGVycyA9IFNMSUNFJDAuY2FsbChhcmd1bWVudHMsIDApO1xuICAgICAgaWYgKGl0ZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIGl0ZXJzID0gaXRlcnMubWFwKGZ1bmN0aW9uKGl0ZXIgKSB7cmV0dXJuIFNldEl0ZXJhYmxlKGl0ZXIpfSk7XG4gICAgICB2YXIgb3JpZ2luYWxTZXQgPSB0aGlzO1xuICAgICAgcmV0dXJuIHRoaXMud2l0aE11dGF0aW9ucyhmdW5jdGlvbihzZXQgKSB7XG4gICAgICAgIG9yaWdpbmFsU2V0LmZvckVhY2goZnVuY3Rpb24odmFsdWUgKSB7XG4gICAgICAgICAgaWYgKGl0ZXJzLnNvbWUoZnVuY3Rpb24oaXRlciApIHtyZXR1cm4gaXRlci5pbmNsdWRlcyh2YWx1ZSl9KSkge1xuICAgICAgICAgICAgc2V0LnJlbW92ZSh2YWx1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBTZXQucHJvdG90eXBlLm1lcmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy51bmlvbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG5cbiAgICBTZXQucHJvdG90eXBlLm1lcmdlV2l0aCA9IGZ1bmN0aW9uKG1lcmdlcikge3ZhciBpdGVycyA9IFNMSUNFJDAuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgcmV0dXJuIHRoaXMudW5pb24uYXBwbHkodGhpcywgaXRlcnMpO1xuICAgIH07XG5cbiAgICBTZXQucHJvdG90eXBlLnNvcnQgPSBmdW5jdGlvbihjb21wYXJhdG9yKSB7XG4gICAgICAvLyBMYXRlIGJpbmRpbmdcbiAgICAgIHJldHVybiBPcmRlcmVkU2V0KHNvcnRGYWN0b3J5KHRoaXMsIGNvbXBhcmF0b3IpKTtcbiAgICB9O1xuXG4gICAgU2V0LnByb3RvdHlwZS5zb3J0QnkgPSBmdW5jdGlvbihtYXBwZXIsIGNvbXBhcmF0b3IpIHtcbiAgICAgIC8vIExhdGUgYmluZGluZ1xuICAgICAgcmV0dXJuIE9yZGVyZWRTZXQoc29ydEZhY3RvcnkodGhpcywgY29tcGFyYXRvciwgbWFwcGVyKSk7XG4gICAgfTtcblxuICAgIFNldC5wcm90b3R5cGUud2FzQWx0ZXJlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX21hcC53YXNBbHRlcmVkKCk7XG4gICAgfTtcblxuICAgIFNldC5wcm90b3R5cGUuX19pdGVyYXRlID0gZnVuY3Rpb24oZm4sIHJldmVyc2UpIHt2YXIgdGhpcyQwID0gdGhpcztcbiAgICAgIHJldHVybiB0aGlzLl9tYXAuX19pdGVyYXRlKGZ1bmN0aW9uKF8sIGspICB7cmV0dXJuIGZuKGssIGssIHRoaXMkMCl9LCByZXZlcnNlKTtcbiAgICB9O1xuXG4gICAgU2V0LnByb3RvdHlwZS5fX2l0ZXJhdG9yID0gZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgICAgcmV0dXJuIHRoaXMuX21hcC5tYXAoZnVuY3Rpb24oXywgaykgIHtyZXR1cm4ga30pLl9faXRlcmF0b3IodHlwZSwgcmV2ZXJzZSk7XG4gICAgfTtcblxuICAgIFNldC5wcm90b3R5cGUuX19lbnN1cmVPd25lciA9IGZ1bmN0aW9uKG93bmVySUQpIHtcbiAgICAgIGlmIChvd25lcklEID09PSB0aGlzLl9fb3duZXJJRCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHZhciBuZXdNYXAgPSB0aGlzLl9tYXAuX19lbnN1cmVPd25lcihvd25lcklEKTtcbiAgICAgIGlmICghb3duZXJJRCkge1xuICAgICAgICB0aGlzLl9fb3duZXJJRCA9IG93bmVySUQ7XG4gICAgICAgIHRoaXMuX21hcCA9IG5ld01hcDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5fX21ha2UobmV3TWFwLCBvd25lcklEKTtcbiAgICB9O1xuXG5cbiAgZnVuY3Rpb24gaXNTZXQobWF5YmVTZXQpIHtcbiAgICByZXR1cm4gISEobWF5YmVTZXQgJiYgbWF5YmVTZXRbSVNfU0VUX1NFTlRJTkVMXSk7XG4gIH1cblxuICBTZXQuaXNTZXQgPSBpc1NldDtcblxuICB2YXIgSVNfU0VUX1NFTlRJTkVMID0gJ0BAX19JTU1VVEFCTEVfU0VUX19AQCc7XG5cbiAgdmFyIFNldFByb3RvdHlwZSA9IFNldC5wcm90b3R5cGU7XG4gIFNldFByb3RvdHlwZVtJU19TRVRfU0VOVElORUxdID0gdHJ1ZTtcbiAgU2V0UHJvdG90eXBlW0RFTEVURV0gPSBTZXRQcm90b3R5cGUucmVtb3ZlO1xuICBTZXRQcm90b3R5cGUubWVyZ2VEZWVwID0gU2V0UHJvdG90eXBlLm1lcmdlO1xuICBTZXRQcm90b3R5cGUubWVyZ2VEZWVwV2l0aCA9IFNldFByb3RvdHlwZS5tZXJnZVdpdGg7XG4gIFNldFByb3RvdHlwZS53aXRoTXV0YXRpb25zID0gTWFwUHJvdG90eXBlLndpdGhNdXRhdGlvbnM7XG4gIFNldFByb3RvdHlwZS5hc011dGFibGUgPSBNYXBQcm90b3R5cGUuYXNNdXRhYmxlO1xuICBTZXRQcm90b3R5cGUuYXNJbW11dGFibGUgPSBNYXBQcm90b3R5cGUuYXNJbW11dGFibGU7XG5cbiAgU2V0UHJvdG90eXBlLl9fZW1wdHkgPSBlbXB0eVNldDtcbiAgU2V0UHJvdG90eXBlLl9fbWFrZSA9IG1ha2VTZXQ7XG5cbiAgZnVuY3Rpb24gdXBkYXRlU2V0KHNldCwgbmV3TWFwKSB7XG4gICAgaWYgKHNldC5fX293bmVySUQpIHtcbiAgICAgIHNldC5zaXplID0gbmV3TWFwLnNpemU7XG4gICAgICBzZXQuX21hcCA9IG5ld01hcDtcbiAgICAgIHJldHVybiBzZXQ7XG4gICAgfVxuICAgIHJldHVybiBuZXdNYXAgPT09IHNldC5fbWFwID8gc2V0IDpcbiAgICAgIG5ld01hcC5zaXplID09PSAwID8gc2V0Ll9fZW1wdHkoKSA6XG4gICAgICBzZXQuX19tYWtlKG5ld01hcCk7XG4gIH1cblxuICBmdW5jdGlvbiBtYWtlU2V0KG1hcCwgb3duZXJJRCkge1xuICAgIHZhciBzZXQgPSBPYmplY3QuY3JlYXRlKFNldFByb3RvdHlwZSk7XG4gICAgc2V0LnNpemUgPSBtYXAgPyBtYXAuc2l6ZSA6IDA7XG4gICAgc2V0Ll9tYXAgPSBtYXA7XG4gICAgc2V0Ll9fb3duZXJJRCA9IG93bmVySUQ7XG4gICAgcmV0dXJuIHNldDtcbiAgfVxuXG4gIHZhciBFTVBUWV9TRVQ7XG4gIGZ1bmN0aW9uIGVtcHR5U2V0KCkge1xuICAgIHJldHVybiBFTVBUWV9TRVQgfHwgKEVNUFRZX1NFVCA9IG1ha2VTZXQoZW1wdHlNYXAoKSkpO1xuICB9XG5cbiAgY3JlYXRlQ2xhc3MoT3JkZXJlZFNldCwgU2V0KTtcblxuICAgIC8vIEBwcmFnbWEgQ29uc3RydWN0aW9uXG5cbiAgICBmdW5jdGlvbiBPcmRlcmVkU2V0KHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCA/IGVtcHR5T3JkZXJlZFNldCgpIDpcbiAgICAgICAgaXNPcmRlcmVkU2V0KHZhbHVlKSA/IHZhbHVlIDpcbiAgICAgICAgZW1wdHlPcmRlcmVkU2V0KCkud2l0aE11dGF0aW9ucyhmdW5jdGlvbihzZXQgKSB7XG4gICAgICAgICAgdmFyIGl0ZXIgPSBTZXRJdGVyYWJsZSh2YWx1ZSk7XG4gICAgICAgICAgYXNzZXJ0Tm90SW5maW5pdGUoaXRlci5zaXplKTtcbiAgICAgICAgICBpdGVyLmZvckVhY2goZnVuY3Rpb24odiApIHtyZXR1cm4gc2V0LmFkZCh2KX0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBPcmRlcmVkU2V0Lm9mID0gZnVuY3Rpb24oLyouLi52YWx1ZXMqLykge1xuICAgICAgcmV0dXJuIHRoaXMoYXJndW1lbnRzKTtcbiAgICB9O1xuXG4gICAgT3JkZXJlZFNldC5mcm9tS2V5cyA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdGhpcyhLZXllZEl0ZXJhYmxlKHZhbHVlKS5rZXlTZXEoKSk7XG4gICAgfTtcblxuICAgIE9yZGVyZWRTZXQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fX3RvU3RyaW5nKCdPcmRlcmVkU2V0IHsnLCAnfScpO1xuICAgIH07XG5cblxuICBmdW5jdGlvbiBpc09yZGVyZWRTZXQobWF5YmVPcmRlcmVkU2V0KSB7XG4gICAgcmV0dXJuIGlzU2V0KG1heWJlT3JkZXJlZFNldCkgJiYgaXNPcmRlcmVkKG1heWJlT3JkZXJlZFNldCk7XG4gIH1cblxuICBPcmRlcmVkU2V0LmlzT3JkZXJlZFNldCA9IGlzT3JkZXJlZFNldDtcblxuICB2YXIgT3JkZXJlZFNldFByb3RvdHlwZSA9IE9yZGVyZWRTZXQucHJvdG90eXBlO1xuICBPcmRlcmVkU2V0UHJvdG90eXBlW0lTX09SREVSRURfU0VOVElORUxdID0gdHJ1ZTtcblxuICBPcmRlcmVkU2V0UHJvdG90eXBlLl9fZW1wdHkgPSBlbXB0eU9yZGVyZWRTZXQ7XG4gIE9yZGVyZWRTZXRQcm90b3R5cGUuX19tYWtlID0gbWFrZU9yZGVyZWRTZXQ7XG5cbiAgZnVuY3Rpb24gbWFrZU9yZGVyZWRTZXQobWFwLCBvd25lcklEKSB7XG4gICAgdmFyIHNldCA9IE9iamVjdC5jcmVhdGUoT3JkZXJlZFNldFByb3RvdHlwZSk7XG4gICAgc2V0LnNpemUgPSBtYXAgPyBtYXAuc2l6ZSA6IDA7XG4gICAgc2V0Ll9tYXAgPSBtYXA7XG4gICAgc2V0Ll9fb3duZXJJRCA9IG93bmVySUQ7XG4gICAgcmV0dXJuIHNldDtcbiAgfVxuXG4gIHZhciBFTVBUWV9PUkRFUkVEX1NFVDtcbiAgZnVuY3Rpb24gZW1wdHlPcmRlcmVkU2V0KCkge1xuICAgIHJldHVybiBFTVBUWV9PUkRFUkVEX1NFVCB8fCAoRU1QVFlfT1JERVJFRF9TRVQgPSBtYWtlT3JkZXJlZFNldChlbXB0eU9yZGVyZWRNYXAoKSkpO1xuICB9XG5cbiAgY3JlYXRlQ2xhc3MoU3RhY2ssIEluZGV4ZWRDb2xsZWN0aW9uKTtcblxuICAgIC8vIEBwcmFnbWEgQ29uc3RydWN0aW9uXG5cbiAgICBmdW5jdGlvbiBTdGFjayh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSB1bmRlZmluZWQgPyBlbXB0eVN0YWNrKCkgOlxuICAgICAgICBpc1N0YWNrKHZhbHVlKSA/IHZhbHVlIDpcbiAgICAgICAgZW1wdHlTdGFjaygpLnVuc2hpZnRBbGwodmFsdWUpO1xuICAgIH1cblxuICAgIFN0YWNrLm9mID0gZnVuY3Rpb24oLyouLi52YWx1ZXMqLykge1xuICAgICAgcmV0dXJuIHRoaXMoYXJndW1lbnRzKTtcbiAgICB9O1xuXG4gICAgU3RhY2sucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fX3RvU3RyaW5nKCdTdGFjayBbJywgJ10nKTtcbiAgICB9O1xuXG4gICAgLy8gQHByYWdtYSBBY2Nlc3NcblxuICAgIFN0YWNrLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihpbmRleCwgbm90U2V0VmFsdWUpIHtcbiAgICAgIHZhciBoZWFkID0gdGhpcy5faGVhZDtcbiAgICAgIGluZGV4ID0gd3JhcEluZGV4KHRoaXMsIGluZGV4KTtcbiAgICAgIHdoaWxlIChoZWFkICYmIGluZGV4LS0pIHtcbiAgICAgICAgaGVhZCA9IGhlYWQubmV4dDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBoZWFkID8gaGVhZC52YWx1ZSA6IG5vdFNldFZhbHVlO1xuICAgIH07XG5cbiAgICBTdGFjay5wcm90b3R5cGUucGVlayA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX2hlYWQgJiYgdGhpcy5faGVhZC52YWx1ZTtcbiAgICB9O1xuXG4gICAgLy8gQHByYWdtYSBNb2RpZmljYXRpb25cblxuICAgIFN0YWNrLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24oLyouLi52YWx1ZXMqLykge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICB2YXIgbmV3U2l6ZSA9IHRoaXMuc2l6ZSArIGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICB2YXIgaGVhZCA9IHRoaXMuX2hlYWQ7XG4gICAgICBmb3IgKHZhciBpaSA9IGFyZ3VtZW50cy5sZW5ndGggLSAxOyBpaSA+PSAwOyBpaS0tKSB7XG4gICAgICAgIGhlYWQgPSB7XG4gICAgICAgICAgdmFsdWU6IGFyZ3VtZW50c1tpaV0sXG4gICAgICAgICAgbmV4dDogaGVhZFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuX19vd25lcklEKSB7XG4gICAgICAgIHRoaXMuc2l6ZSA9IG5ld1NpemU7XG4gICAgICAgIHRoaXMuX2hlYWQgPSBoZWFkO1xuICAgICAgICB0aGlzLl9faGFzaCA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5fX2FsdGVyZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHJldHVybiBtYWtlU3RhY2sobmV3U2l6ZSwgaGVhZCk7XG4gICAgfTtcblxuICAgIFN0YWNrLnByb3RvdHlwZS5wdXNoQWxsID0gZnVuY3Rpb24oaXRlcikge1xuICAgICAgaXRlciA9IEluZGV4ZWRJdGVyYWJsZShpdGVyKTtcbiAgICAgIGlmIChpdGVyLnNpemUgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICBhc3NlcnROb3RJbmZpbml0ZShpdGVyLnNpemUpO1xuICAgICAgdmFyIG5ld1NpemUgPSB0aGlzLnNpemU7XG4gICAgICB2YXIgaGVhZCA9IHRoaXMuX2hlYWQ7XG4gICAgICBpdGVyLnJldmVyc2UoKS5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlICkge1xuICAgICAgICBuZXdTaXplKys7XG4gICAgICAgIGhlYWQgPSB7XG4gICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgIG5leHQ6IGhlYWRcbiAgICAgICAgfTtcbiAgICAgIH0pO1xuICAgICAgaWYgKHRoaXMuX19vd25lcklEKSB7XG4gICAgICAgIHRoaXMuc2l6ZSA9IG5ld1NpemU7XG4gICAgICAgIHRoaXMuX2hlYWQgPSBoZWFkO1xuICAgICAgICB0aGlzLl9faGFzaCA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5fX2FsdGVyZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIHJldHVybiBtYWtlU3RhY2sobmV3U2l6ZSwgaGVhZCk7XG4gICAgfTtcblxuICAgIFN0YWNrLnByb3RvdHlwZS5wb3AgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnNsaWNlKDEpO1xuICAgIH07XG5cbiAgICBTdGFjay5wcm90b3R5cGUudW5zaGlmdCA9IGZ1bmN0aW9uKC8qLi4udmFsdWVzKi8pIHtcbiAgICAgIHJldHVybiB0aGlzLnB1c2guYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuXG4gICAgU3RhY2sucHJvdG90eXBlLnVuc2hpZnRBbGwgPSBmdW5jdGlvbihpdGVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5wdXNoQWxsKGl0ZXIpO1xuICAgIH07XG5cbiAgICBTdGFjay5wcm90b3R5cGUuc2hpZnQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnBvcC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG5cbiAgICBTdGFjay5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLnNpemUgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5fX293bmVySUQpIHtcbiAgICAgICAgdGhpcy5zaXplID0gMDtcbiAgICAgICAgdGhpcy5faGVhZCA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5fX2hhc2ggPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuX19hbHRlcmVkID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICByZXR1cm4gZW1wdHlTdGFjaygpO1xuICAgIH07XG5cbiAgICBTdGFjay5wcm90b3R5cGUuc2xpY2UgPSBmdW5jdGlvbihiZWdpbiwgZW5kKSB7XG4gICAgICBpZiAod2hvbGVTbGljZShiZWdpbiwgZW5kLCB0aGlzLnNpemUpKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgdmFyIHJlc29sdmVkQmVnaW4gPSByZXNvbHZlQmVnaW4oYmVnaW4sIHRoaXMuc2l6ZSk7XG4gICAgICB2YXIgcmVzb2x2ZWRFbmQgPSByZXNvbHZlRW5kKGVuZCwgdGhpcy5zaXplKTtcbiAgICAgIGlmIChyZXNvbHZlZEVuZCAhPT0gdGhpcy5zaXplKSB7XG4gICAgICAgIC8vIHN1cGVyLnNsaWNlKGJlZ2luLCBlbmQpO1xuICAgICAgICByZXR1cm4gSW5kZXhlZENvbGxlY3Rpb24ucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcywgYmVnaW4sIGVuZCk7XG4gICAgICB9XG4gICAgICB2YXIgbmV3U2l6ZSA9IHRoaXMuc2l6ZSAtIHJlc29sdmVkQmVnaW47XG4gICAgICB2YXIgaGVhZCA9IHRoaXMuX2hlYWQ7XG4gICAgICB3aGlsZSAocmVzb2x2ZWRCZWdpbi0tKSB7XG4gICAgICAgIGhlYWQgPSBoZWFkLm5leHQ7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5fX293bmVySUQpIHtcbiAgICAgICAgdGhpcy5zaXplID0gbmV3U2l6ZTtcbiAgICAgICAgdGhpcy5faGVhZCA9IGhlYWQ7XG4gICAgICAgIHRoaXMuX19oYXNoID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLl9fYWx0ZXJlZCA9IHRydWU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1ha2VTdGFjayhuZXdTaXplLCBoZWFkKTtcbiAgICB9O1xuXG4gICAgLy8gQHByYWdtYSBNdXRhYmlsaXR5XG5cbiAgICBTdGFjay5wcm90b3R5cGUuX19lbnN1cmVPd25lciA9IGZ1bmN0aW9uKG93bmVySUQpIHtcbiAgICAgIGlmIChvd25lcklEID09PSB0aGlzLl9fb3duZXJJRCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cbiAgICAgIGlmICghb3duZXJJRCkge1xuICAgICAgICB0aGlzLl9fb3duZXJJRCA9IG93bmVySUQ7XG4gICAgICAgIHRoaXMuX19hbHRlcmVkID0gZmFsc2U7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1ha2VTdGFjayh0aGlzLnNpemUsIHRoaXMuX2hlYWQsIG93bmVySUQsIHRoaXMuX19oYXNoKTtcbiAgICB9O1xuXG4gICAgLy8gQHByYWdtYSBJdGVyYXRpb25cblxuICAgIFN0YWNrLnByb3RvdHlwZS5fX2l0ZXJhdGUgPSBmdW5jdGlvbihmbiwgcmV2ZXJzZSkge1xuICAgICAgaWYgKHJldmVyc2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmV2ZXJzZSgpLl9faXRlcmF0ZShmbik7XG4gICAgICB9XG4gICAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgICB2YXIgbm9kZSA9IHRoaXMuX2hlYWQ7XG4gICAgICB3aGlsZSAobm9kZSkge1xuICAgICAgICBpZiAoZm4obm9kZS52YWx1ZSwgaXRlcmF0aW9ucysrLCB0aGlzKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBub2RlID0gbm9kZS5uZXh0O1xuICAgICAgfVxuICAgICAgcmV0dXJuIGl0ZXJhdGlvbnM7XG4gICAgfTtcblxuICAgIFN0YWNrLnByb3RvdHlwZS5fX2l0ZXJhdG9yID0gZnVuY3Rpb24odHlwZSwgcmV2ZXJzZSkge1xuICAgICAgaWYgKHJldmVyc2UpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmV2ZXJzZSgpLl9faXRlcmF0b3IodHlwZSk7XG4gICAgICB9XG4gICAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgICB2YXIgbm9kZSA9IHRoaXMuX2hlYWQ7XG4gICAgICByZXR1cm4gbmV3IEl0ZXJhdG9yKGZ1bmN0aW9uKCkgIHtcbiAgICAgICAgaWYgKG5vZGUpIHtcbiAgICAgICAgICB2YXIgdmFsdWUgPSBub2RlLnZhbHVlO1xuICAgICAgICAgIG5vZGUgPSBub2RlLm5leHQ7XG4gICAgICAgICAgcmV0dXJuIGl0ZXJhdG9yVmFsdWUodHlwZSwgaXRlcmF0aW9ucysrLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yRG9uZSgpO1xuICAgICAgfSk7XG4gICAgfTtcblxuXG4gIGZ1bmN0aW9uIGlzU3RhY2sobWF5YmVTdGFjaykge1xuICAgIHJldHVybiAhIShtYXliZVN0YWNrICYmIG1heWJlU3RhY2tbSVNfU1RBQ0tfU0VOVElORUxdKTtcbiAgfVxuXG4gIFN0YWNrLmlzU3RhY2sgPSBpc1N0YWNrO1xuXG4gIHZhciBJU19TVEFDS19TRU5USU5FTCA9ICdAQF9fSU1NVVRBQkxFX1NUQUNLX19AQCc7XG5cbiAgdmFyIFN0YWNrUHJvdG90eXBlID0gU3RhY2sucHJvdG90eXBlO1xuICBTdGFja1Byb3RvdHlwZVtJU19TVEFDS19TRU5USU5FTF0gPSB0cnVlO1xuICBTdGFja1Byb3RvdHlwZS53aXRoTXV0YXRpb25zID0gTWFwUHJvdG90eXBlLndpdGhNdXRhdGlvbnM7XG4gIFN0YWNrUHJvdG90eXBlLmFzTXV0YWJsZSA9IE1hcFByb3RvdHlwZS5hc011dGFibGU7XG4gIFN0YWNrUHJvdG90eXBlLmFzSW1tdXRhYmxlID0gTWFwUHJvdG90eXBlLmFzSW1tdXRhYmxlO1xuICBTdGFja1Byb3RvdHlwZS53YXNBbHRlcmVkID0gTWFwUHJvdG90eXBlLndhc0FsdGVyZWQ7XG5cblxuICBmdW5jdGlvbiBtYWtlU3RhY2soc2l6ZSwgaGVhZCwgb3duZXJJRCwgaGFzaCkge1xuICAgIHZhciBtYXAgPSBPYmplY3QuY3JlYXRlKFN0YWNrUHJvdG90eXBlKTtcbiAgICBtYXAuc2l6ZSA9IHNpemU7XG4gICAgbWFwLl9oZWFkID0gaGVhZDtcbiAgICBtYXAuX19vd25lcklEID0gb3duZXJJRDtcbiAgICBtYXAuX19oYXNoID0gaGFzaDtcbiAgICBtYXAuX19hbHRlcmVkID0gZmFsc2U7XG4gICAgcmV0dXJuIG1hcDtcbiAgfVxuXG4gIHZhciBFTVBUWV9TVEFDSztcbiAgZnVuY3Rpb24gZW1wdHlTdGFjaygpIHtcbiAgICByZXR1cm4gRU1QVFlfU1RBQ0sgfHwgKEVNUFRZX1NUQUNLID0gbWFrZVN0YWNrKDApKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb250cmlidXRlcyBhZGRpdGlvbmFsIG1ldGhvZHMgdG8gYSBjb25zdHJ1Y3RvclxuICAgKi9cbiAgZnVuY3Rpb24gbWl4aW4oY3RvciwgbWV0aG9kcykge1xuICAgIHZhciBrZXlDb3BpZXIgPSBmdW5jdGlvbihrZXkgKSB7IGN0b3IucHJvdG90eXBlW2tleV0gPSBtZXRob2RzW2tleV07IH07XG4gICAgT2JqZWN0LmtleXMobWV0aG9kcykuZm9yRWFjaChrZXlDb3BpZXIpO1xuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgJiZcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMobWV0aG9kcykuZm9yRWFjaChrZXlDb3BpZXIpO1xuICAgIHJldHVybiBjdG9yO1xuICB9XG5cbiAgSXRlcmFibGUuSXRlcmF0b3IgPSBJdGVyYXRvcjtcblxuICBtaXhpbihJdGVyYWJsZSwge1xuXG4gICAgLy8gIyMjIENvbnZlcnNpb24gdG8gb3RoZXIgdHlwZXNcblxuICAgIHRvQXJyYXk6IGZ1bmN0aW9uKCkge1xuICAgICAgYXNzZXJ0Tm90SW5maW5pdGUodGhpcy5zaXplKTtcbiAgICAgIHZhciBhcnJheSA9IG5ldyBBcnJheSh0aGlzLnNpemUgfHwgMCk7XG4gICAgICB0aGlzLnZhbHVlU2VxKCkuX19pdGVyYXRlKGZ1bmN0aW9uKHYsIGkpICB7IGFycmF5W2ldID0gdjsgfSk7XG4gICAgICByZXR1cm4gYXJyYXk7XG4gICAgfSxcblxuICAgIHRvSW5kZXhlZFNlcTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IFRvSW5kZXhlZFNlcXVlbmNlKHRoaXMpO1xuICAgIH0sXG5cbiAgICB0b0pTOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnRvU2VxKCkubWFwKFxuICAgICAgICBmdW5jdGlvbih2YWx1ZSApIHtyZXR1cm4gdmFsdWUgJiYgdHlwZW9mIHZhbHVlLnRvSlMgPT09ICdmdW5jdGlvbicgPyB2YWx1ZS50b0pTKCkgOiB2YWx1ZX1cbiAgICAgICkuX190b0pTKCk7XG4gICAgfSxcblxuICAgIHRvSlNPTjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy50b1NlcSgpLm1hcChcbiAgICAgICAgZnVuY3Rpb24odmFsdWUgKSB7cmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZS50b0pTT04gPT09ICdmdW5jdGlvbicgPyB2YWx1ZS50b0pTT04oKSA6IHZhbHVlfVxuICAgICAgKS5fX3RvSlMoKTtcbiAgICB9LFxuXG4gICAgdG9LZXllZFNlcTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IFRvS2V5ZWRTZXF1ZW5jZSh0aGlzLCB0cnVlKTtcbiAgICB9LFxuXG4gICAgdG9NYXA6IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gVXNlIExhdGUgQmluZGluZyBoZXJlIHRvIHNvbHZlIHRoZSBjaXJjdWxhciBkZXBlbmRlbmN5LlxuICAgICAgcmV0dXJuIE1hcCh0aGlzLnRvS2V5ZWRTZXEoKSk7XG4gICAgfSxcblxuICAgIHRvT2JqZWN0OiBmdW5jdGlvbigpIHtcbiAgICAgIGFzc2VydE5vdEluZmluaXRlKHRoaXMuc2l6ZSk7XG4gICAgICB2YXIgb2JqZWN0ID0ge307XG4gICAgICB0aGlzLl9faXRlcmF0ZShmdW5jdGlvbih2LCBrKSAgeyBvYmplY3Rba10gPSB2OyB9KTtcbiAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgfSxcblxuICAgIHRvT3JkZXJlZE1hcDogZnVuY3Rpb24oKSB7XG4gICAgICAvLyBVc2UgTGF0ZSBCaW5kaW5nIGhlcmUgdG8gc29sdmUgdGhlIGNpcmN1bGFyIGRlcGVuZGVuY3kuXG4gICAgICByZXR1cm4gT3JkZXJlZE1hcCh0aGlzLnRvS2V5ZWRTZXEoKSk7XG4gICAgfSxcblxuICAgIHRvT3JkZXJlZFNldDogZnVuY3Rpb24oKSB7XG4gICAgICAvLyBVc2UgTGF0ZSBCaW5kaW5nIGhlcmUgdG8gc29sdmUgdGhlIGNpcmN1bGFyIGRlcGVuZGVuY3kuXG4gICAgICByZXR1cm4gT3JkZXJlZFNldChpc0tleWVkKHRoaXMpID8gdGhpcy52YWx1ZVNlcSgpIDogdGhpcyk7XG4gICAgfSxcblxuICAgIHRvU2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIC8vIFVzZSBMYXRlIEJpbmRpbmcgaGVyZSB0byBzb2x2ZSB0aGUgY2lyY3VsYXIgZGVwZW5kZW5jeS5cbiAgICAgIHJldHVybiBTZXQoaXNLZXllZCh0aGlzKSA/IHRoaXMudmFsdWVTZXEoKSA6IHRoaXMpO1xuICAgIH0sXG5cbiAgICB0b1NldFNlcTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IFRvU2V0U2VxdWVuY2UodGhpcyk7XG4gICAgfSxcblxuICAgIHRvU2VxOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBpc0luZGV4ZWQodGhpcykgPyB0aGlzLnRvSW5kZXhlZFNlcSgpIDpcbiAgICAgICAgaXNLZXllZCh0aGlzKSA/IHRoaXMudG9LZXllZFNlcSgpIDpcbiAgICAgICAgdGhpcy50b1NldFNlcSgpO1xuICAgIH0sXG5cbiAgICB0b1N0YWNrOiBmdW5jdGlvbigpIHtcbiAgICAgIC8vIFVzZSBMYXRlIEJpbmRpbmcgaGVyZSB0byBzb2x2ZSB0aGUgY2lyY3VsYXIgZGVwZW5kZW5jeS5cbiAgICAgIHJldHVybiBTdGFjayhpc0tleWVkKHRoaXMpID8gdGhpcy52YWx1ZVNlcSgpIDogdGhpcyk7XG4gICAgfSxcblxuICAgIHRvTGlzdDogZnVuY3Rpb24oKSB7XG4gICAgICAvLyBVc2UgTGF0ZSBCaW5kaW5nIGhlcmUgdG8gc29sdmUgdGhlIGNpcmN1bGFyIGRlcGVuZGVuY3kuXG4gICAgICByZXR1cm4gTGlzdChpc0tleWVkKHRoaXMpID8gdGhpcy52YWx1ZVNlcSgpIDogdGhpcyk7XG4gICAgfSxcblxuXG4gICAgLy8gIyMjIENvbW1vbiBKYXZhU2NyaXB0IG1ldGhvZHMgYW5kIHByb3BlcnRpZXNcblxuICAgIHRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAnW0l0ZXJhYmxlXSc7XG4gICAgfSxcblxuICAgIF9fdG9TdHJpbmc6IGZ1bmN0aW9uKGhlYWQsIHRhaWwpIHtcbiAgICAgIGlmICh0aGlzLnNpemUgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIGhlYWQgKyB0YWlsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGhlYWQgKyAnICcgKyB0aGlzLnRvU2VxKCkubWFwKHRoaXMuX190b1N0cmluZ01hcHBlcikuam9pbignLCAnKSArICcgJyArIHRhaWw7XG4gICAgfSxcblxuXG4gICAgLy8gIyMjIEVTNiBDb2xsZWN0aW9uIG1ldGhvZHMgKEVTNiBBcnJheSBhbmQgTWFwKVxuXG4gICAgY29uY2F0OiBmdW5jdGlvbigpIHt2YXIgdmFsdWVzID0gU0xJQ0UkMC5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgICByZXR1cm4gcmVpZnkodGhpcywgY29uY2F0RmFjdG9yeSh0aGlzLCB2YWx1ZXMpKTtcbiAgICB9LFxuXG4gICAgaW5jbHVkZXM6IGZ1bmN0aW9uKHNlYXJjaFZhbHVlKSB7XG4gICAgICByZXR1cm4gdGhpcy5zb21lKGZ1bmN0aW9uKHZhbHVlICkge3JldHVybiBpcyh2YWx1ZSwgc2VhcmNoVmFsdWUpfSk7XG4gICAgfSxcblxuICAgIGVudHJpZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX19pdGVyYXRvcihJVEVSQVRFX0VOVFJJRVMpO1xuICAgIH0sXG5cbiAgICBldmVyeTogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgICBhc3NlcnROb3RJbmZpbml0ZSh0aGlzLnNpemUpO1xuICAgICAgdmFyIHJldHVyblZhbHVlID0gdHJ1ZTtcbiAgICAgIHRoaXMuX19pdGVyYXRlKGZ1bmN0aW9uKHYsIGssIGMpICB7XG4gICAgICAgIGlmICghcHJlZGljYXRlLmNhbGwoY29udGV4dCwgdiwgaywgYykpIHtcbiAgICAgICAgICByZXR1cm5WYWx1ZSA9IGZhbHNlO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmV0dXJuVmFsdWU7XG4gICAgfSxcblxuICAgIGZpbHRlcjogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgICByZXR1cm4gcmVpZnkodGhpcywgZmlsdGVyRmFjdG9yeSh0aGlzLCBwcmVkaWNhdGUsIGNvbnRleHQsIHRydWUpKTtcbiAgICB9LFxuXG4gICAgZmluZDogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0LCBub3RTZXRWYWx1ZSkge1xuICAgICAgdmFyIGVudHJ5ID0gdGhpcy5maW5kRW50cnkocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICAgIHJldHVybiBlbnRyeSA/IGVudHJ5WzFdIDogbm90U2V0VmFsdWU7XG4gICAgfSxcblxuICAgIGZvckVhY2g6IGZ1bmN0aW9uKHNpZGVFZmZlY3QsIGNvbnRleHQpIHtcbiAgICAgIGFzc2VydE5vdEluZmluaXRlKHRoaXMuc2l6ZSk7XG4gICAgICByZXR1cm4gdGhpcy5fX2l0ZXJhdGUoY29udGV4dCA/IHNpZGVFZmZlY3QuYmluZChjb250ZXh0KSA6IHNpZGVFZmZlY3QpO1xuICAgIH0sXG5cbiAgICBqb2luOiBmdW5jdGlvbihzZXBhcmF0b3IpIHtcbiAgICAgIGFzc2VydE5vdEluZmluaXRlKHRoaXMuc2l6ZSk7XG4gICAgICBzZXBhcmF0b3IgPSBzZXBhcmF0b3IgIT09IHVuZGVmaW5lZCA/ICcnICsgc2VwYXJhdG9yIDogJywnO1xuICAgICAgdmFyIGpvaW5lZCA9ICcnO1xuICAgICAgdmFyIGlzRmlyc3QgPSB0cnVlO1xuICAgICAgdGhpcy5fX2l0ZXJhdGUoZnVuY3Rpb24odiApIHtcbiAgICAgICAgaXNGaXJzdCA/IChpc0ZpcnN0ID0gZmFsc2UpIDogKGpvaW5lZCArPSBzZXBhcmF0b3IpO1xuICAgICAgICBqb2luZWQgKz0gdiAhPT0gbnVsbCAmJiB2ICE9PSB1bmRlZmluZWQgPyB2LnRvU3RyaW5nKCkgOiAnJztcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGpvaW5lZDtcbiAgICB9LFxuXG4gICAga2V5czogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fX2l0ZXJhdG9yKElURVJBVEVfS0VZUyk7XG4gICAgfSxcblxuICAgIG1hcDogZnVuY3Rpb24obWFwcGVyLCBjb250ZXh0KSB7XG4gICAgICByZXR1cm4gcmVpZnkodGhpcywgbWFwRmFjdG9yeSh0aGlzLCBtYXBwZXIsIGNvbnRleHQpKTtcbiAgICB9LFxuXG4gICAgcmVkdWNlOiBmdW5jdGlvbihyZWR1Y2VyLCBpbml0aWFsUmVkdWN0aW9uLCBjb250ZXh0KSB7XG4gICAgICBhc3NlcnROb3RJbmZpbml0ZSh0aGlzLnNpemUpO1xuICAgICAgdmFyIHJlZHVjdGlvbjtcbiAgICAgIHZhciB1c2VGaXJzdDtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMikge1xuICAgICAgICB1c2VGaXJzdCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZWR1Y3Rpb24gPSBpbml0aWFsUmVkdWN0aW9uO1xuICAgICAgfVxuICAgICAgdGhpcy5fX2l0ZXJhdGUoZnVuY3Rpb24odiwgaywgYykgIHtcbiAgICAgICAgaWYgKHVzZUZpcnN0KSB7XG4gICAgICAgICAgdXNlRmlyc3QgPSBmYWxzZTtcbiAgICAgICAgICByZWR1Y3Rpb24gPSB2O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlZHVjdGlvbiA9IHJlZHVjZXIuY2FsbChjb250ZXh0LCByZWR1Y3Rpb24sIHYsIGssIGMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZWR1Y3Rpb247XG4gICAgfSxcblxuICAgIHJlZHVjZVJpZ2h0OiBmdW5jdGlvbihyZWR1Y2VyLCBpbml0aWFsUmVkdWN0aW9uLCBjb250ZXh0KSB7XG4gICAgICB2YXIgcmV2ZXJzZWQgPSB0aGlzLnRvS2V5ZWRTZXEoKS5yZXZlcnNlKCk7XG4gICAgICByZXR1cm4gcmV2ZXJzZWQucmVkdWNlLmFwcGx5KHJldmVyc2VkLCBhcmd1bWVudHMpO1xuICAgIH0sXG5cbiAgICByZXZlcnNlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiByZWlmeSh0aGlzLCByZXZlcnNlRmFjdG9yeSh0aGlzLCB0cnVlKSk7XG4gICAgfSxcblxuICAgIHNsaWNlOiBmdW5jdGlvbihiZWdpbiwgZW5kKSB7XG4gICAgICByZXR1cm4gcmVpZnkodGhpcywgc2xpY2VGYWN0b3J5KHRoaXMsIGJlZ2luLCBlbmQsIHRydWUpKTtcbiAgICB9LFxuXG4gICAgc29tZTogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgICByZXR1cm4gIXRoaXMuZXZlcnkobm90KHByZWRpY2F0ZSksIGNvbnRleHQpO1xuICAgIH0sXG5cbiAgICBzb3J0OiBmdW5jdGlvbihjb21wYXJhdG9yKSB7XG4gICAgICByZXR1cm4gcmVpZnkodGhpcywgc29ydEZhY3RvcnkodGhpcywgY29tcGFyYXRvcikpO1xuICAgIH0sXG5cbiAgICB2YWx1ZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX19pdGVyYXRvcihJVEVSQVRFX1ZBTFVFUyk7XG4gICAgfSxcblxuXG4gICAgLy8gIyMjIE1vcmUgc2VxdWVudGlhbCBtZXRob2RzXG5cbiAgICBidXRMYXN0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnNsaWNlKDAsIC0xKTtcbiAgICB9LFxuXG4gICAgaXNFbXB0eTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5zaXplICE9PSB1bmRlZmluZWQgPyB0aGlzLnNpemUgPT09IDAgOiAhdGhpcy5zb21lKGZ1bmN0aW9uKCkgIHtyZXR1cm4gdHJ1ZX0pO1xuICAgIH0sXG5cbiAgICBjb3VudDogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgICByZXR1cm4gZW5zdXJlU2l6ZShcbiAgICAgICAgcHJlZGljYXRlID8gdGhpcy50b1NlcSgpLmZpbHRlcihwcmVkaWNhdGUsIGNvbnRleHQpIDogdGhpc1xuICAgICAgKTtcbiAgICB9LFxuXG4gICAgY291bnRCeTogZnVuY3Rpb24oZ3JvdXBlciwgY29udGV4dCkge1xuICAgICAgcmV0dXJuIGNvdW50QnlGYWN0b3J5KHRoaXMsIGdyb3VwZXIsIGNvbnRleHQpO1xuICAgIH0sXG5cbiAgICBlcXVhbHM6IGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgICByZXR1cm4gZGVlcEVxdWFsKHRoaXMsIG90aGVyKTtcbiAgICB9LFxuXG4gICAgZW50cnlTZXE6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGl0ZXJhYmxlID0gdGhpcztcbiAgICAgIGlmIChpdGVyYWJsZS5fY2FjaGUpIHtcbiAgICAgICAgLy8gV2UgY2FjaGUgYXMgYW4gZW50cmllcyBhcnJheSwgc28gd2UgY2FuIGp1c3QgcmV0dXJuIHRoZSBjYWNoZSFcbiAgICAgICAgcmV0dXJuIG5ldyBBcnJheVNlcShpdGVyYWJsZS5fY2FjaGUpO1xuICAgICAgfVxuICAgICAgdmFyIGVudHJpZXNTZXF1ZW5jZSA9IGl0ZXJhYmxlLnRvU2VxKCkubWFwKGVudHJ5TWFwcGVyKS50b0luZGV4ZWRTZXEoKTtcbiAgICAgIGVudHJpZXNTZXF1ZW5jZS5mcm9tRW50cnlTZXEgPSBmdW5jdGlvbigpICB7cmV0dXJuIGl0ZXJhYmxlLnRvU2VxKCl9O1xuICAgICAgcmV0dXJuIGVudHJpZXNTZXF1ZW5jZTtcbiAgICB9LFxuXG4gICAgZmlsdGVyTm90OiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICAgIHJldHVybiB0aGlzLmZpbHRlcihub3QocHJlZGljYXRlKSwgY29udGV4dCk7XG4gICAgfSxcblxuICAgIGZpbmRFbnRyeTogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0LCBub3RTZXRWYWx1ZSkge1xuICAgICAgdmFyIGZvdW5kID0gbm90U2V0VmFsdWU7XG4gICAgICB0aGlzLl9faXRlcmF0ZShmdW5jdGlvbih2LCBrLCBjKSAge1xuICAgICAgICBpZiAocHJlZGljYXRlLmNhbGwoY29udGV4dCwgdiwgaywgYykpIHtcbiAgICAgICAgICBmb3VuZCA9IFtrLCB2XTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGZvdW5kO1xuICAgIH0sXG5cbiAgICBmaW5kS2V5OiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICAgIHZhciBlbnRyeSA9IHRoaXMuZmluZEVudHJ5KHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgICByZXR1cm4gZW50cnkgJiYgZW50cnlbMF07XG4gICAgfSxcblxuICAgIGZpbmRMYXN0OiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQsIG5vdFNldFZhbHVlKSB7XG4gICAgICByZXR1cm4gdGhpcy50b0tleWVkU2VxKCkucmV2ZXJzZSgpLmZpbmQocHJlZGljYXRlLCBjb250ZXh0LCBub3RTZXRWYWx1ZSk7XG4gICAgfSxcblxuICAgIGZpbmRMYXN0RW50cnk6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCwgbm90U2V0VmFsdWUpIHtcbiAgICAgIHJldHVybiB0aGlzLnRvS2V5ZWRTZXEoKS5yZXZlcnNlKCkuZmluZEVudHJ5KHByZWRpY2F0ZSwgY29udGV4dCwgbm90U2V0VmFsdWUpO1xuICAgIH0sXG5cbiAgICBmaW5kTGFzdEtleTogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgICByZXR1cm4gdGhpcy50b0tleWVkU2VxKCkucmV2ZXJzZSgpLmZpbmRLZXkocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICB9LFxuXG4gICAgZmlyc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuZmluZChyZXR1cm5UcnVlKTtcbiAgICB9LFxuXG4gICAgZmxhdE1hcDogZnVuY3Rpb24obWFwcGVyLCBjb250ZXh0KSB7XG4gICAgICByZXR1cm4gcmVpZnkodGhpcywgZmxhdE1hcEZhY3RvcnkodGhpcywgbWFwcGVyLCBjb250ZXh0KSk7XG4gICAgfSxcblxuICAgIGZsYXR0ZW46IGZ1bmN0aW9uKGRlcHRoKSB7XG4gICAgICByZXR1cm4gcmVpZnkodGhpcywgZmxhdHRlbkZhY3RvcnkodGhpcywgZGVwdGgsIHRydWUpKTtcbiAgICB9LFxuXG4gICAgZnJvbUVudHJ5U2VxOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBuZXcgRnJvbUVudHJpZXNTZXF1ZW5jZSh0aGlzKTtcbiAgICB9LFxuXG4gICAgZ2V0OiBmdW5jdGlvbihzZWFyY2hLZXksIG5vdFNldFZhbHVlKSB7XG4gICAgICByZXR1cm4gdGhpcy5maW5kKGZ1bmN0aW9uKF8sIGtleSkgIHtyZXR1cm4gaXMoa2V5LCBzZWFyY2hLZXkpfSwgdW5kZWZpbmVkLCBub3RTZXRWYWx1ZSk7XG4gICAgfSxcblxuICAgIGdldEluOiBmdW5jdGlvbihzZWFyY2hLZXlQYXRoLCBub3RTZXRWYWx1ZSkge1xuICAgICAgdmFyIG5lc3RlZCA9IHRoaXM7XG4gICAgICAvLyBOb3RlOiBpbiBhbiBFUzYgZW52aXJvbm1lbnQsIHdlIHdvdWxkIHByZWZlcjpcbiAgICAgIC8vIGZvciAodmFyIGtleSBvZiBzZWFyY2hLZXlQYXRoKSB7XG4gICAgICB2YXIgaXRlciA9IGZvcmNlSXRlcmF0b3Ioc2VhcmNoS2V5UGF0aCk7XG4gICAgICB2YXIgc3RlcDtcbiAgICAgIHdoaWxlICghKHN0ZXAgPSBpdGVyLm5leHQoKSkuZG9uZSkge1xuICAgICAgICB2YXIga2V5ID0gc3RlcC52YWx1ZTtcbiAgICAgICAgbmVzdGVkID0gbmVzdGVkICYmIG5lc3RlZC5nZXQgPyBuZXN0ZWQuZ2V0KGtleSwgTk9UX1NFVCkgOiBOT1RfU0VUO1xuICAgICAgICBpZiAobmVzdGVkID09PSBOT1RfU0VUKSB7XG4gICAgICAgICAgcmV0dXJuIG5vdFNldFZhbHVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbmVzdGVkO1xuICAgIH0sXG5cbiAgICBncm91cEJ5OiBmdW5jdGlvbihncm91cGVyLCBjb250ZXh0KSB7XG4gICAgICByZXR1cm4gZ3JvdXBCeUZhY3RvcnkodGhpcywgZ3JvdXBlciwgY29udGV4dCk7XG4gICAgfSxcblxuICAgIGhhczogZnVuY3Rpb24oc2VhcmNoS2V5KSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXQoc2VhcmNoS2V5LCBOT1RfU0VUKSAhPT0gTk9UX1NFVDtcbiAgICB9LFxuXG4gICAgaGFzSW46IGZ1bmN0aW9uKHNlYXJjaEtleVBhdGgpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldEluKHNlYXJjaEtleVBhdGgsIE5PVF9TRVQpICE9PSBOT1RfU0VUO1xuICAgIH0sXG5cbiAgICBpc1N1YnNldDogZnVuY3Rpb24oaXRlcikge1xuICAgICAgaXRlciA9IHR5cGVvZiBpdGVyLmluY2x1ZGVzID09PSAnZnVuY3Rpb24nID8gaXRlciA6IEl0ZXJhYmxlKGl0ZXIpO1xuICAgICAgcmV0dXJuIHRoaXMuZXZlcnkoZnVuY3Rpb24odmFsdWUgKSB7cmV0dXJuIGl0ZXIuaW5jbHVkZXModmFsdWUpfSk7XG4gICAgfSxcblxuICAgIGlzU3VwZXJzZXQ6IGZ1bmN0aW9uKGl0ZXIpIHtcbiAgICAgIGl0ZXIgPSB0eXBlb2YgaXRlci5pc1N1YnNldCA9PT0gJ2Z1bmN0aW9uJyA/IGl0ZXIgOiBJdGVyYWJsZShpdGVyKTtcbiAgICAgIHJldHVybiBpdGVyLmlzU3Vic2V0KHRoaXMpO1xuICAgIH0sXG5cbiAgICBrZXlPZjogZnVuY3Rpb24oc2VhcmNoVmFsdWUpIHtcbiAgICAgIHJldHVybiB0aGlzLmZpbmRLZXkoZnVuY3Rpb24odmFsdWUgKSB7cmV0dXJuIGlzKHZhbHVlLCBzZWFyY2hWYWx1ZSl9KTtcbiAgICB9LFxuXG4gICAga2V5U2VxOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnRvU2VxKCkubWFwKGtleU1hcHBlcikudG9JbmRleGVkU2VxKCk7XG4gICAgfSxcblxuICAgIGxhc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMudG9TZXEoKS5yZXZlcnNlKCkuZmlyc3QoKTtcbiAgICB9LFxuXG4gICAgbGFzdEtleU9mOiBmdW5jdGlvbihzZWFyY2hWYWx1ZSkge1xuICAgICAgcmV0dXJuIHRoaXMudG9LZXllZFNlcSgpLnJldmVyc2UoKS5rZXlPZihzZWFyY2hWYWx1ZSk7XG4gICAgfSxcblxuICAgIG1heDogZnVuY3Rpb24oY29tcGFyYXRvcikge1xuICAgICAgcmV0dXJuIG1heEZhY3RvcnkodGhpcywgY29tcGFyYXRvcik7XG4gICAgfSxcblxuICAgIG1heEJ5OiBmdW5jdGlvbihtYXBwZXIsIGNvbXBhcmF0b3IpIHtcbiAgICAgIHJldHVybiBtYXhGYWN0b3J5KHRoaXMsIGNvbXBhcmF0b3IsIG1hcHBlcik7XG4gICAgfSxcblxuICAgIG1pbjogZnVuY3Rpb24oY29tcGFyYXRvcikge1xuICAgICAgcmV0dXJuIG1heEZhY3RvcnkodGhpcywgY29tcGFyYXRvciA/IG5lZyhjb21wYXJhdG9yKSA6IGRlZmF1bHROZWdDb21wYXJhdG9yKTtcbiAgICB9LFxuXG4gICAgbWluQnk6IGZ1bmN0aW9uKG1hcHBlciwgY29tcGFyYXRvcikge1xuICAgICAgcmV0dXJuIG1heEZhY3RvcnkodGhpcywgY29tcGFyYXRvciA/IG5lZyhjb21wYXJhdG9yKSA6IGRlZmF1bHROZWdDb21wYXJhdG9yLCBtYXBwZXIpO1xuICAgIH0sXG5cbiAgICByZXN0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnNsaWNlKDEpO1xuICAgIH0sXG5cbiAgICBza2lwOiBmdW5jdGlvbihhbW91bnQpIHtcbiAgICAgIHJldHVybiB0aGlzLnNsaWNlKE1hdGgubWF4KDAsIGFtb3VudCkpO1xuICAgIH0sXG5cbiAgICBza2lwTGFzdDogZnVuY3Rpb24oYW1vdW50KSB7XG4gICAgICByZXR1cm4gcmVpZnkodGhpcywgdGhpcy50b1NlcSgpLnJldmVyc2UoKS5za2lwKGFtb3VudCkucmV2ZXJzZSgpKTtcbiAgICB9LFxuXG4gICAgc2tpcFdoaWxlOiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICAgIHJldHVybiByZWlmeSh0aGlzLCBza2lwV2hpbGVGYWN0b3J5KHRoaXMsIHByZWRpY2F0ZSwgY29udGV4dCwgdHJ1ZSkpO1xuICAgIH0sXG5cbiAgICBza2lwVW50aWw6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgICAgcmV0dXJuIHRoaXMuc2tpcFdoaWxlKG5vdChwcmVkaWNhdGUpLCBjb250ZXh0KTtcbiAgICB9LFxuXG4gICAgc29ydEJ5OiBmdW5jdGlvbihtYXBwZXIsIGNvbXBhcmF0b3IpIHtcbiAgICAgIHJldHVybiByZWlmeSh0aGlzLCBzb3J0RmFjdG9yeSh0aGlzLCBjb21wYXJhdG9yLCBtYXBwZXIpKTtcbiAgICB9LFxuXG4gICAgdGFrZTogZnVuY3Rpb24oYW1vdW50KSB7XG4gICAgICByZXR1cm4gdGhpcy5zbGljZSgwLCBNYXRoLm1heCgwLCBhbW91bnQpKTtcbiAgICB9LFxuXG4gICAgdGFrZUxhc3Q6IGZ1bmN0aW9uKGFtb3VudCkge1xuICAgICAgcmV0dXJuIHJlaWZ5KHRoaXMsIHRoaXMudG9TZXEoKS5yZXZlcnNlKCkudGFrZShhbW91bnQpLnJldmVyc2UoKSk7XG4gICAgfSxcblxuICAgIHRha2VXaGlsZTogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgICByZXR1cm4gcmVpZnkodGhpcywgdGFrZVdoaWxlRmFjdG9yeSh0aGlzLCBwcmVkaWNhdGUsIGNvbnRleHQpKTtcbiAgICB9LFxuXG4gICAgdGFrZVVudGlsOiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICAgIHJldHVybiB0aGlzLnRha2VXaGlsZShub3QocHJlZGljYXRlKSwgY29udGV4dCk7XG4gICAgfSxcblxuICAgIHZhbHVlU2VxOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLnRvSW5kZXhlZFNlcSgpO1xuICAgIH0sXG5cblxuICAgIC8vICMjIyBIYXNoYWJsZSBPYmplY3RcblxuICAgIGhhc2hDb2RlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9faGFzaCB8fCAodGhpcy5fX2hhc2ggPSBoYXNoSXRlcmFibGUodGhpcykpO1xuICAgIH1cblxuXG4gICAgLy8gIyMjIEludGVybmFsXG5cbiAgICAvLyBhYnN0cmFjdCBfX2l0ZXJhdGUoZm4sIHJldmVyc2UpXG5cbiAgICAvLyBhYnN0cmFjdCBfX2l0ZXJhdG9yKHR5cGUsIHJldmVyc2UpXG4gIH0pO1xuXG4gIC8vIHZhciBJU19JVEVSQUJMRV9TRU5USU5FTCA9ICdAQF9fSU1NVVRBQkxFX0lURVJBQkxFX19AQCc7XG4gIC8vIHZhciBJU19LRVlFRF9TRU5USU5FTCA9ICdAQF9fSU1NVVRBQkxFX0tFWUVEX19AQCc7XG4gIC8vIHZhciBJU19JTkRFWEVEX1NFTlRJTkVMID0gJ0BAX19JTU1VVEFCTEVfSU5ERVhFRF9fQEAnO1xuICAvLyB2YXIgSVNfT1JERVJFRF9TRU5USU5FTCA9ICdAQF9fSU1NVVRBQkxFX09SREVSRURfX0BAJztcblxuICB2YXIgSXRlcmFibGVQcm90b3R5cGUgPSBJdGVyYWJsZS5wcm90b3R5cGU7XG4gIEl0ZXJhYmxlUHJvdG90eXBlW0lTX0lURVJBQkxFX1NFTlRJTkVMXSA9IHRydWU7XG4gIEl0ZXJhYmxlUHJvdG90eXBlW0lURVJBVE9SX1NZTUJPTF0gPSBJdGVyYWJsZVByb3RvdHlwZS52YWx1ZXM7XG4gIEl0ZXJhYmxlUHJvdG90eXBlLl9fdG9KUyA9IEl0ZXJhYmxlUHJvdG90eXBlLnRvQXJyYXk7XG4gIEl0ZXJhYmxlUHJvdG90eXBlLl9fdG9TdHJpbmdNYXBwZXIgPSBxdW90ZVN0cmluZztcbiAgSXRlcmFibGVQcm90b3R5cGUuaW5zcGVjdCA9XG4gIEl0ZXJhYmxlUHJvdG90eXBlLnRvU291cmNlID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLnRvU3RyaW5nKCk7IH07XG4gIEl0ZXJhYmxlUHJvdG90eXBlLmNoYWluID0gSXRlcmFibGVQcm90b3R5cGUuZmxhdE1hcDtcbiAgSXRlcmFibGVQcm90b3R5cGUuY29udGFpbnMgPSBJdGVyYWJsZVByb3RvdHlwZS5pbmNsdWRlcztcblxuICBtaXhpbihLZXllZEl0ZXJhYmxlLCB7XG5cbiAgICAvLyAjIyMgTW9yZSBzZXF1ZW50aWFsIG1ldGhvZHNcblxuICAgIGZsaXA6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHJlaWZ5KHRoaXMsIGZsaXBGYWN0b3J5KHRoaXMpKTtcbiAgICB9LFxuXG4gICAgbWFwRW50cmllczogZnVuY3Rpb24obWFwcGVyLCBjb250ZXh0KSB7dmFyIHRoaXMkMCA9IHRoaXM7XG4gICAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgICByZXR1cm4gcmVpZnkodGhpcyxcbiAgICAgICAgdGhpcy50b1NlcSgpLm1hcChcbiAgICAgICAgICBmdW5jdGlvbih2LCBrKSAge3JldHVybiBtYXBwZXIuY2FsbChjb250ZXh0LCBbaywgdl0sIGl0ZXJhdGlvbnMrKywgdGhpcyQwKX1cbiAgICAgICAgKS5mcm9tRW50cnlTZXEoKVxuICAgICAgKTtcbiAgICB9LFxuXG4gICAgbWFwS2V5czogZnVuY3Rpb24obWFwcGVyLCBjb250ZXh0KSB7dmFyIHRoaXMkMCA9IHRoaXM7XG4gICAgICByZXR1cm4gcmVpZnkodGhpcyxcbiAgICAgICAgdGhpcy50b1NlcSgpLmZsaXAoKS5tYXAoXG4gICAgICAgICAgZnVuY3Rpb24oaywgdikgIHtyZXR1cm4gbWFwcGVyLmNhbGwoY29udGV4dCwgaywgdiwgdGhpcyQwKX1cbiAgICAgICAgKS5mbGlwKClcbiAgICAgICk7XG4gICAgfVxuXG4gIH0pO1xuXG4gIHZhciBLZXllZEl0ZXJhYmxlUHJvdG90eXBlID0gS2V5ZWRJdGVyYWJsZS5wcm90b3R5cGU7XG4gIEtleWVkSXRlcmFibGVQcm90b3R5cGVbSVNfS0VZRURfU0VOVElORUxdID0gdHJ1ZTtcbiAgS2V5ZWRJdGVyYWJsZVByb3RvdHlwZVtJVEVSQVRPUl9TWU1CT0xdID0gSXRlcmFibGVQcm90b3R5cGUuZW50cmllcztcbiAgS2V5ZWRJdGVyYWJsZVByb3RvdHlwZS5fX3RvSlMgPSBJdGVyYWJsZVByb3RvdHlwZS50b09iamVjdDtcbiAgS2V5ZWRJdGVyYWJsZVByb3RvdHlwZS5fX3RvU3RyaW5nTWFwcGVyID0gZnVuY3Rpb24odiwgaykgIHtyZXR1cm4gSlNPTi5zdHJpbmdpZnkoaykgKyAnOiAnICsgcXVvdGVTdHJpbmcodil9O1xuXG5cblxuICBtaXhpbihJbmRleGVkSXRlcmFibGUsIHtcblxuICAgIC8vICMjIyBDb252ZXJzaW9uIHRvIG90aGVyIHR5cGVzXG5cbiAgICB0b0tleWVkU2VxOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBuZXcgVG9LZXllZFNlcXVlbmNlKHRoaXMsIGZhbHNlKTtcbiAgICB9LFxuXG5cbiAgICAvLyAjIyMgRVM2IENvbGxlY3Rpb24gbWV0aG9kcyAoRVM2IEFycmF5IGFuZCBNYXApXG5cbiAgICBmaWx0ZXI6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgICAgcmV0dXJuIHJlaWZ5KHRoaXMsIGZpbHRlckZhY3RvcnkodGhpcywgcHJlZGljYXRlLCBjb250ZXh0LCBmYWxzZSkpO1xuICAgIH0sXG5cbiAgICBmaW5kSW5kZXg6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgICAgdmFyIGVudHJ5ID0gdGhpcy5maW5kRW50cnkocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICAgIHJldHVybiBlbnRyeSA/IGVudHJ5WzBdIDogLTE7XG4gICAgfSxcblxuICAgIGluZGV4T2Y6IGZ1bmN0aW9uKHNlYXJjaFZhbHVlKSB7XG4gICAgICB2YXIga2V5ID0gdGhpcy5rZXlPZihzZWFyY2hWYWx1ZSk7XG4gICAgICByZXR1cm4ga2V5ID09PSB1bmRlZmluZWQgPyAtMSA6IGtleTtcbiAgICB9LFxuXG4gICAgbGFzdEluZGV4T2Y6IGZ1bmN0aW9uKHNlYXJjaFZhbHVlKSB7XG4gICAgICB2YXIga2V5ID0gdGhpcy5sYXN0S2V5T2Yoc2VhcmNoVmFsdWUpO1xuICAgICAgcmV0dXJuIGtleSA9PT0gdW5kZWZpbmVkID8gLTEgOiBrZXk7XG4gICAgfSxcblxuICAgIHJldmVyc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHJlaWZ5KHRoaXMsIHJldmVyc2VGYWN0b3J5KHRoaXMsIGZhbHNlKSk7XG4gICAgfSxcblxuICAgIHNsaWNlOiBmdW5jdGlvbihiZWdpbiwgZW5kKSB7XG4gICAgICByZXR1cm4gcmVpZnkodGhpcywgc2xpY2VGYWN0b3J5KHRoaXMsIGJlZ2luLCBlbmQsIGZhbHNlKSk7XG4gICAgfSxcblxuICAgIHNwbGljZTogZnVuY3Rpb24oaW5kZXgsIHJlbW92ZU51bSAvKiwgLi4udmFsdWVzKi8pIHtcbiAgICAgIHZhciBudW1BcmdzID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgIHJlbW92ZU51bSA9IE1hdGgubWF4KHJlbW92ZU51bSB8IDAsIDApO1xuICAgICAgaWYgKG51bUFyZ3MgPT09IDAgfHwgKG51bUFyZ3MgPT09IDIgJiYgIXJlbW92ZU51bSkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gICAgICAvLyBJZiBpbmRleCBpcyBuZWdhdGl2ZSwgaXQgc2hvdWxkIHJlc29sdmUgcmVsYXRpdmUgdG8gdGhlIHNpemUgb2YgdGhlXG4gICAgICAvLyBjb2xsZWN0aW9uLiBIb3dldmVyIHNpemUgbWF5IGJlIGV4cGVuc2l2ZSB0byBjb21wdXRlIGlmIG5vdCBjYWNoZWQsIHNvXG4gICAgICAvLyBvbmx5IGNhbGwgY291bnQoKSBpZiB0aGUgbnVtYmVyIGlzIGluIGZhY3QgbmVnYXRpdmUuXG4gICAgICBpbmRleCA9IHJlc29sdmVCZWdpbihpbmRleCwgaW5kZXggPCAwID8gdGhpcy5jb3VudCgpIDogdGhpcy5zaXplKTtcbiAgICAgIHZhciBzcGxpY2VkID0gdGhpcy5zbGljZSgwLCBpbmRleCk7XG4gICAgICByZXR1cm4gcmVpZnkoXG4gICAgICAgIHRoaXMsXG4gICAgICAgIG51bUFyZ3MgPT09IDEgP1xuICAgICAgICAgIHNwbGljZWQgOlxuICAgICAgICAgIHNwbGljZWQuY29uY2F0KGFyckNvcHkoYXJndW1lbnRzLCAyKSwgdGhpcy5zbGljZShpbmRleCArIHJlbW92ZU51bSkpXG4gICAgICApO1xuICAgIH0sXG5cblxuICAgIC8vICMjIyBNb3JlIGNvbGxlY3Rpb24gbWV0aG9kc1xuXG4gICAgZmluZExhc3RJbmRleDogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgICB2YXIgZW50cnkgPSB0aGlzLmZpbmRMYXN0RW50cnkocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICAgIHJldHVybiBlbnRyeSA/IGVudHJ5WzBdIDogLTE7XG4gICAgfSxcblxuICAgIGZpcnN0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldCgwKTtcbiAgICB9LFxuXG4gICAgZmxhdHRlbjogZnVuY3Rpb24oZGVwdGgpIHtcbiAgICAgIHJldHVybiByZWlmeSh0aGlzLCBmbGF0dGVuRmFjdG9yeSh0aGlzLCBkZXB0aCwgZmFsc2UpKTtcbiAgICB9LFxuXG4gICAgZ2V0OiBmdW5jdGlvbihpbmRleCwgbm90U2V0VmFsdWUpIHtcbiAgICAgIGluZGV4ID0gd3JhcEluZGV4KHRoaXMsIGluZGV4KTtcbiAgICAgIHJldHVybiAoaW5kZXggPCAwIHx8ICh0aGlzLnNpemUgPT09IEluZmluaXR5IHx8XG4gICAgICAgICAgKHRoaXMuc2l6ZSAhPT0gdW5kZWZpbmVkICYmIGluZGV4ID4gdGhpcy5zaXplKSkpID9cbiAgICAgICAgbm90U2V0VmFsdWUgOlxuICAgICAgICB0aGlzLmZpbmQoZnVuY3Rpb24oXywga2V5KSAge3JldHVybiBrZXkgPT09IGluZGV4fSwgdW5kZWZpbmVkLCBub3RTZXRWYWx1ZSk7XG4gICAgfSxcblxuICAgIGhhczogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICAgIGluZGV4ID0gd3JhcEluZGV4KHRoaXMsIGluZGV4KTtcbiAgICAgIHJldHVybiBpbmRleCA+PSAwICYmICh0aGlzLnNpemUgIT09IHVuZGVmaW5lZCA/XG4gICAgICAgIHRoaXMuc2l6ZSA9PT0gSW5maW5pdHkgfHwgaW5kZXggPCB0aGlzLnNpemUgOlxuICAgICAgICB0aGlzLmluZGV4T2YoaW5kZXgpICE9PSAtMVxuICAgICAgKTtcbiAgICB9LFxuXG4gICAgaW50ZXJwb3NlOiBmdW5jdGlvbihzZXBhcmF0b3IpIHtcbiAgICAgIHJldHVybiByZWlmeSh0aGlzLCBpbnRlcnBvc2VGYWN0b3J5KHRoaXMsIHNlcGFyYXRvcikpO1xuICAgIH0sXG5cbiAgICBpbnRlcmxlYXZlOiBmdW5jdGlvbigvKi4uLml0ZXJhYmxlcyovKSB7XG4gICAgICB2YXIgaXRlcmFibGVzID0gW3RoaXNdLmNvbmNhdChhcnJDb3B5KGFyZ3VtZW50cykpO1xuICAgICAgdmFyIHppcHBlZCA9IHppcFdpdGhGYWN0b3J5KHRoaXMudG9TZXEoKSwgSW5kZXhlZFNlcS5vZiwgaXRlcmFibGVzKTtcbiAgICAgIHZhciBpbnRlcmxlYXZlZCA9IHppcHBlZC5mbGF0dGVuKHRydWUpO1xuICAgICAgaWYgKHppcHBlZC5zaXplKSB7XG4gICAgICAgIGludGVybGVhdmVkLnNpemUgPSB6aXBwZWQuc2l6ZSAqIGl0ZXJhYmxlcy5sZW5ndGg7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVpZnkodGhpcywgaW50ZXJsZWF2ZWQpO1xuICAgIH0sXG5cbiAgICBrZXlTZXE6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIFJhbmdlKDAsIHRoaXMuc2l6ZSk7XG4gICAgfSxcblxuICAgIGxhc3Q6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0KC0xKTtcbiAgICB9LFxuXG4gICAgc2tpcFdoaWxlOiBmdW5jdGlvbihwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICAgIHJldHVybiByZWlmeSh0aGlzLCBza2lwV2hpbGVGYWN0b3J5KHRoaXMsIHByZWRpY2F0ZSwgY29udGV4dCwgZmFsc2UpKTtcbiAgICB9LFxuXG4gICAgemlwOiBmdW5jdGlvbigvKiwgLi4uaXRlcmFibGVzICovKSB7XG4gICAgICB2YXIgaXRlcmFibGVzID0gW3RoaXNdLmNvbmNhdChhcnJDb3B5KGFyZ3VtZW50cykpO1xuICAgICAgcmV0dXJuIHJlaWZ5KHRoaXMsIHppcFdpdGhGYWN0b3J5KHRoaXMsIGRlZmF1bHRaaXBwZXIsIGl0ZXJhYmxlcykpO1xuICAgIH0sXG5cbiAgICB6aXBXaXRoOiBmdW5jdGlvbih6aXBwZXIvKiwgLi4uaXRlcmFibGVzICovKSB7XG4gICAgICB2YXIgaXRlcmFibGVzID0gYXJyQ29weShhcmd1bWVudHMpO1xuICAgICAgaXRlcmFibGVzWzBdID0gdGhpcztcbiAgICAgIHJldHVybiByZWlmeSh0aGlzLCB6aXBXaXRoRmFjdG9yeSh0aGlzLCB6aXBwZXIsIGl0ZXJhYmxlcykpO1xuICAgIH1cblxuICB9KTtcblxuICBJbmRleGVkSXRlcmFibGUucHJvdG90eXBlW0lTX0lOREVYRURfU0VOVElORUxdID0gdHJ1ZTtcbiAgSW5kZXhlZEl0ZXJhYmxlLnByb3RvdHlwZVtJU19PUkRFUkVEX1NFTlRJTkVMXSA9IHRydWU7XG5cblxuXG4gIG1peGluKFNldEl0ZXJhYmxlLCB7XG5cbiAgICAvLyAjIyMgRVM2IENvbGxlY3Rpb24gbWV0aG9kcyAoRVM2IEFycmF5IGFuZCBNYXApXG5cbiAgICBnZXQ6IGZ1bmN0aW9uKHZhbHVlLCBub3RTZXRWYWx1ZSkge1xuICAgICAgcmV0dXJuIHRoaXMuaGFzKHZhbHVlKSA/IHZhbHVlIDogbm90U2V0VmFsdWU7XG4gICAgfSxcblxuICAgIGluY2x1ZGVzOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIHRoaXMuaGFzKHZhbHVlKTtcbiAgICB9LFxuXG5cbiAgICAvLyAjIyMgTW9yZSBzZXF1ZW50aWFsIG1ldGhvZHNcblxuICAgIGtleVNlcTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy52YWx1ZVNlcSgpO1xuICAgIH1cblxuICB9KTtcblxuICBTZXRJdGVyYWJsZS5wcm90b3R5cGUuaGFzID0gSXRlcmFibGVQcm90b3R5cGUuaW5jbHVkZXM7XG4gIFNldEl0ZXJhYmxlLnByb3RvdHlwZS5jb250YWlucyA9IFNldEl0ZXJhYmxlLnByb3RvdHlwZS5pbmNsdWRlcztcblxuXG4gIC8vIE1peGluIHN1YmNsYXNzZXNcblxuICBtaXhpbihLZXllZFNlcSwgS2V5ZWRJdGVyYWJsZS5wcm90b3R5cGUpO1xuICBtaXhpbihJbmRleGVkU2VxLCBJbmRleGVkSXRlcmFibGUucHJvdG90eXBlKTtcbiAgbWl4aW4oU2V0U2VxLCBTZXRJdGVyYWJsZS5wcm90b3R5cGUpO1xuXG4gIG1peGluKEtleWVkQ29sbGVjdGlvbiwgS2V5ZWRJdGVyYWJsZS5wcm90b3R5cGUpO1xuICBtaXhpbihJbmRleGVkQ29sbGVjdGlvbiwgSW5kZXhlZEl0ZXJhYmxlLnByb3RvdHlwZSk7XG4gIG1peGluKFNldENvbGxlY3Rpb24sIFNldEl0ZXJhYmxlLnByb3RvdHlwZSk7XG5cblxuICAvLyAjcHJhZ21hIEhlbHBlciBmdW5jdGlvbnNcblxuICBmdW5jdGlvbiBrZXlNYXBwZXIodiwgaykge1xuICAgIHJldHVybiBrO1xuICB9XG5cbiAgZnVuY3Rpb24gZW50cnlNYXBwZXIodiwgaykge1xuICAgIHJldHVybiBbaywgdl07XG4gIH1cblxuICBmdW5jdGlvbiBub3QocHJlZGljYXRlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICFwcmVkaWNhdGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBuZWcocHJlZGljYXRlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIC1wcmVkaWNhdGUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBxdW90ZVN0cmluZyh2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gSlNPTi5zdHJpbmdpZnkodmFsdWUpIDogU3RyaW5nKHZhbHVlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlZmF1bHRaaXBwZXIoKSB7XG4gICAgcmV0dXJuIGFyckNvcHkoYXJndW1lbnRzKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlZmF1bHROZWdDb21wYXJhdG9yKGEsIGIpIHtcbiAgICByZXR1cm4gYSA8IGIgPyAxIDogYSA+IGIgPyAtMSA6IDA7XG4gIH1cblxuICBmdW5jdGlvbiBoYXNoSXRlcmFibGUoaXRlcmFibGUpIHtcbiAgICBpZiAoaXRlcmFibGUuc2l6ZSA9PT0gSW5maW5pdHkpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICB2YXIgb3JkZXJlZCA9IGlzT3JkZXJlZChpdGVyYWJsZSk7XG4gICAgdmFyIGtleWVkID0gaXNLZXllZChpdGVyYWJsZSk7XG4gICAgdmFyIGggPSBvcmRlcmVkID8gMSA6IDA7XG4gICAgdmFyIHNpemUgPSBpdGVyYWJsZS5fX2l0ZXJhdGUoXG4gICAgICBrZXllZCA/XG4gICAgICAgIG9yZGVyZWQgP1xuICAgICAgICAgIGZ1bmN0aW9uKHYsIGspICB7IGggPSAzMSAqIGggKyBoYXNoTWVyZ2UoaGFzaCh2KSwgaGFzaChrKSkgfCAwOyB9IDpcbiAgICAgICAgICBmdW5jdGlvbih2LCBrKSAgeyBoID0gaCArIGhhc2hNZXJnZShoYXNoKHYpLCBoYXNoKGspKSB8IDA7IH0gOlxuICAgICAgICBvcmRlcmVkID9cbiAgICAgICAgICBmdW5jdGlvbih2ICkgeyBoID0gMzEgKiBoICsgaGFzaCh2KSB8IDA7IH0gOlxuICAgICAgICAgIGZ1bmN0aW9uKHYgKSB7IGggPSBoICsgaGFzaCh2KSB8IDA7IH1cbiAgICApO1xuICAgIHJldHVybiBtdXJtdXJIYXNoT2ZTaXplKHNpemUsIGgpO1xuICB9XG5cbiAgZnVuY3Rpb24gbXVybXVySGFzaE9mU2l6ZShzaXplLCBoKSB7XG4gICAgaCA9IGltdWwoaCwgMHhDQzlFMkQ1MSk7XG4gICAgaCA9IGltdWwoaCA8PCAxNSB8IGggPj4+IC0xNSwgMHgxQjg3MzU5Myk7XG4gICAgaCA9IGltdWwoaCA8PCAxMyB8IGggPj4+IC0xMywgNSk7XG4gICAgaCA9IChoICsgMHhFNjU0NkI2NCB8IDApIF4gc2l6ZTtcbiAgICBoID0gaW11bChoIF4gaCA+Pj4gMTYsIDB4ODVFQkNBNkIpO1xuICAgIGggPSBpbXVsKGggXiBoID4+PiAxMywgMHhDMkIyQUUzNSk7XG4gICAgaCA9IHNtaShoIF4gaCA+Pj4gMTYpO1xuICAgIHJldHVybiBoO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFzaE1lcmdlKGEsIGIpIHtcbiAgICByZXR1cm4gYSBeIGIgKyAweDlFMzc3OUI5ICsgKGEgPDwgNikgKyAoYSA+PiAyKSB8IDA7IC8vIGludFxuICB9XG5cbiAgdmFyIEltbXV0YWJsZSA9IHtcblxuICAgIEl0ZXJhYmxlOiBJdGVyYWJsZSxcblxuICAgIFNlcTogU2VxLFxuICAgIENvbGxlY3Rpb246IENvbGxlY3Rpb24sXG4gICAgTWFwOiBNYXAsXG4gICAgT3JkZXJlZE1hcDogT3JkZXJlZE1hcCxcbiAgICBMaXN0OiBMaXN0LFxuICAgIFN0YWNrOiBTdGFjayxcbiAgICBTZXQ6IFNldCxcbiAgICBPcmRlcmVkU2V0OiBPcmRlcmVkU2V0LFxuXG4gICAgUmVjb3JkOiBSZWNvcmQsXG4gICAgUmFuZ2U6IFJhbmdlLFxuICAgIFJlcGVhdDogUmVwZWF0LFxuXG4gICAgaXM6IGlzLFxuICAgIGZyb21KUzogZnJvbUpTXG5cbiAgfTtcblxuICByZXR1cm4gSW1tdXRhYmxlO1xuXG59KSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIF90b0NvbnN1bWFibGVBcnJheShhcnIpIHsgaWYgKEFycmF5LmlzQXJyYXkoYXJyKSkgeyBmb3IgKHZhciBpID0gMCwgYXJyMiA9IEFycmF5KGFyci5sZW5ndGgpOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7IGFycjJbaV0gPSBhcnJbaV07IH0gcmV0dXJuIGFycjI7IH0gZWxzZSB7IHJldHVybiBBcnJheS5mcm9tKGFycik7IH0gfVxuXG5mdW5jdGlvbiBfdHlwZW9mKG9iaikgeyByZXR1cm4gb2JqICYmIHR5cGVvZiBTeW1ib2wgIT09IFwidW5kZWZpbmVkXCIgJiYgb2JqLmNvbnN0cnVjdG9yID09PSBTeW1ib2wgPyBcInN5bWJvbFwiIDogdHlwZW9mIG9iajsgfVxuXG52YXIgcmVwZWF0ID0gZnVuY3Rpb24gcmVwZWF0KHN0ciwgdGltZXMpIHtcbiAgcmV0dXJuIG5ldyBBcnJheSh0aW1lcyArIDEpLmpvaW4oc3RyKTtcbn07XG52YXIgcGFkID0gZnVuY3Rpb24gcGFkKG51bSwgbWF4TGVuZ3RoKSB7XG4gIHJldHVybiByZXBlYXQoXCIwXCIsIG1heExlbmd0aCAtIG51bS50b1N0cmluZygpLmxlbmd0aCkgKyBudW07XG59O1xudmFyIGZvcm1hdFRpbWUgPSBmdW5jdGlvbiBmb3JtYXRUaW1lKHRpbWUpIHtcbiAgcmV0dXJuIFwiQCBcIiArIHBhZCh0aW1lLmdldEhvdXJzKCksIDIpICsgXCI6XCIgKyBwYWQodGltZS5nZXRNaW51dGVzKCksIDIpICsgXCI6XCIgKyBwYWQodGltZS5nZXRTZWNvbmRzKCksIDIpICsgXCIuXCIgKyBwYWQodGltZS5nZXRNaWxsaXNlY29uZHMoKSwgMyk7XG59O1xuXG4vLyBVc2UgdGhlIG5ldyBwZXJmb3JtYW5jZSBhcGkgdG8gZ2V0IGJldHRlciBwcmVjaXNpb24gaWYgYXZhaWxhYmxlXG52YXIgdGltZXIgPSB0eXBlb2YgcGVyZm9ybWFuY2UgIT09IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mIHBlcmZvcm1hbmNlLm5vdyA9PT0gXCJmdW5jdGlvblwiID8gcGVyZm9ybWFuY2UgOiBEYXRlO1xuXG4vKipcbiAqIHBhcnNlIHRoZSBsZXZlbCBvcHRpb24gb2YgY3JlYXRlTG9nZ2VyXG4gKlxuICogQHByb3BlcnR5IHtzdHJpbmcgfCBmdW5jdGlvbiB8IG9iamVjdH0gbGV2ZWwgLSBjb25zb2xlW2xldmVsXVxuICogQHByb3BlcnR5IHtvYmplY3R9IGFjdGlvblxuICogQHByb3BlcnR5IHthcnJheX0gcGF5bG9hZFxuICogQHByb3BlcnR5IHtzdHJpbmd9IHR5cGVcbiAqL1xuXG5mdW5jdGlvbiBnZXRMb2dMZXZlbChsZXZlbCwgYWN0aW9uLCBwYXlsb2FkLCB0eXBlKSB7XG4gIHN3aXRjaCAodHlwZW9mIGxldmVsID09PSBcInVuZGVmaW5lZFwiID8gXCJ1bmRlZmluZWRcIiA6IF90eXBlb2YobGV2ZWwpKSB7XG4gICAgY2FzZSBcIm9iamVjdFwiOlxuICAgICAgcmV0dXJuIHR5cGVvZiBsZXZlbFt0eXBlXSA9PT0gXCJmdW5jdGlvblwiID8gbGV2ZWxbdHlwZV0uYXBwbHkobGV2ZWwsIF90b0NvbnN1bWFibGVBcnJheShwYXlsb2FkKSkgOiBsZXZlbFt0eXBlXTtcbiAgICBjYXNlIFwiZnVuY3Rpb25cIjpcbiAgICAgIHJldHVybiBsZXZlbChhY3Rpb24pO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gbGV2ZWw7XG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGVzIGxvZ2dlciB3aXRoIGZvbGxvd2VkIG9wdGlvbnNcbiAqXG4gKiBAbmFtZXNwYWNlXG4gKiBAcHJvcGVydHkge29iamVjdH0gb3B0aW9ucyAtIG9wdGlvbnMgZm9yIGxvZ2dlclxuICogQHByb3BlcnR5IHtzdHJpbmcgfCBmdW5jdGlvbiB8IG9iamVjdH0gb3B0aW9ucy5sZXZlbCAtIGNvbnNvbGVbbGV2ZWxdXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IG9wdGlvbnMuZHVyYXRpb24gLSBwcmludCBkdXJhdGlvbiBvZiBlYWNoIGFjdGlvbj9cbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gb3B0aW9ucy50aW1lc3RhbXAgLSBwcmludCB0aW1lc3RhbXAgd2l0aCBlYWNoIGFjdGlvbj9cbiAqIEBwcm9wZXJ0eSB7b2JqZWN0fSBvcHRpb25zLmNvbG9ycyAtIGN1c3RvbSBjb2xvcnNcbiAqIEBwcm9wZXJ0eSB7b2JqZWN0fSBvcHRpb25zLmxvZ2dlciAtIGltcGxlbWVudGF0aW9uIG9mIHRoZSBgY29uc29sZWAgQVBJXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IG9wdGlvbnMubG9nRXJyb3JzIC0gc2hvdWxkIGVycm9ycyBpbiBhY3Rpb24gZXhlY3V0aW9uIGJlIGNhdWdodCwgbG9nZ2VkLCBhbmQgcmUtdGhyb3duP1xuICogQHByb3BlcnR5IHtib29sZWFufSBvcHRpb25zLmNvbGxhcHNlZCAtIGlzIGdyb3VwIGNvbGxhcHNlZD9cbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gb3B0aW9ucy5wcmVkaWNhdGUgLSBjb25kaXRpb24gd2hpY2ggcmVzb2x2ZXMgbG9nZ2VyIGJlaGF2aW9yXG4gKiBAcHJvcGVydHkge2Z1bmN0aW9ufSBvcHRpb25zLnN0YXRlVHJhbnNmb3JtZXIgLSB0cmFuc2Zvcm0gc3RhdGUgYmVmb3JlIHByaW50XG4gKiBAcHJvcGVydHkge2Z1bmN0aW9ufSBvcHRpb25zLmFjdGlvblRyYW5zZm9ybWVyIC0gdHJhbnNmb3JtIGFjdGlvbiBiZWZvcmUgcHJpbnRcbiAqIEBwcm9wZXJ0eSB7ZnVuY3Rpb259IG9wdGlvbnMuZXJyb3JUcmFuc2Zvcm1lciAtIHRyYW5zZm9ybSBlcnJvciBiZWZvcmUgcHJpbnRcbiAqL1xuXG5mdW5jdGlvbiBjcmVhdGVMb2dnZXIoKSB7XG4gIHZhciBvcHRpb25zID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8ge30gOiBhcmd1bWVudHNbMF07XG4gIHZhciBfb3B0aW9ucyRsZXZlbCA9IG9wdGlvbnMubGV2ZWw7XG4gIHZhciBsZXZlbCA9IF9vcHRpb25zJGxldmVsID09PSB1bmRlZmluZWQgPyBcImxvZ1wiIDogX29wdGlvbnMkbGV2ZWw7XG4gIHZhciBfb3B0aW9ucyRsb2dnZXIgPSBvcHRpb25zLmxvZ2dlcjtcbiAgdmFyIGxvZ2dlciA9IF9vcHRpb25zJGxvZ2dlciA9PT0gdW5kZWZpbmVkID8gY29uc29sZSA6IF9vcHRpb25zJGxvZ2dlcjtcbiAgdmFyIF9vcHRpb25zJGxvZ0Vycm9ycyA9IG9wdGlvbnMubG9nRXJyb3JzO1xuICB2YXIgbG9nRXJyb3JzID0gX29wdGlvbnMkbG9nRXJyb3JzID09PSB1bmRlZmluZWQgPyB0cnVlIDogX29wdGlvbnMkbG9nRXJyb3JzO1xuICB2YXIgY29sbGFwc2VkID0gb3B0aW9ucy5jb2xsYXBzZWQ7XG4gIHZhciBwcmVkaWNhdGUgPSBvcHRpb25zLnByZWRpY2F0ZTtcbiAgdmFyIF9vcHRpb25zJGR1cmF0aW9uID0gb3B0aW9ucy5kdXJhdGlvbjtcbiAgdmFyIGR1cmF0aW9uID0gX29wdGlvbnMkZHVyYXRpb24gPT09IHVuZGVmaW5lZCA/IGZhbHNlIDogX29wdGlvbnMkZHVyYXRpb247XG4gIHZhciBfb3B0aW9ucyR0aW1lc3RhbXAgPSBvcHRpb25zLnRpbWVzdGFtcDtcbiAgdmFyIHRpbWVzdGFtcCA9IF9vcHRpb25zJHRpbWVzdGFtcCA9PT0gdW5kZWZpbmVkID8gdHJ1ZSA6IF9vcHRpb25zJHRpbWVzdGFtcDtcbiAgdmFyIHRyYW5zZm9ybWVyID0gb3B0aW9ucy50cmFuc2Zvcm1lcjtcbiAgdmFyIF9vcHRpb25zJHN0YXRlVHJhbnNmbyA9IG9wdGlvbnMuc3RhdGVUcmFuc2Zvcm1lcjtcbiAgdmFyIC8vIGRlcHJlY2F0ZWRcbiAgc3RhdGVUcmFuc2Zvcm1lciA9IF9vcHRpb25zJHN0YXRlVHJhbnNmbyA9PT0gdW5kZWZpbmVkID8gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgcmV0dXJuIHN0YXRlO1xuICB9IDogX29wdGlvbnMkc3RhdGVUcmFuc2ZvO1xuICB2YXIgX29wdGlvbnMkYWN0aW9uVHJhbnNmID0gb3B0aW9ucy5hY3Rpb25UcmFuc2Zvcm1lcjtcbiAgdmFyIGFjdGlvblRyYW5zZm9ybWVyID0gX29wdGlvbnMkYWN0aW9uVHJhbnNmID09PSB1bmRlZmluZWQgPyBmdW5jdGlvbiAoYWN0bikge1xuICAgIHJldHVybiBhY3RuO1xuICB9IDogX29wdGlvbnMkYWN0aW9uVHJhbnNmO1xuICB2YXIgX29wdGlvbnMkZXJyb3JUcmFuc2ZvID0gb3B0aW9ucy5lcnJvclRyYW5zZm9ybWVyO1xuICB2YXIgZXJyb3JUcmFuc2Zvcm1lciA9IF9vcHRpb25zJGVycm9yVHJhbnNmbyA9PT0gdW5kZWZpbmVkID8gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgcmV0dXJuIGVycm9yO1xuICB9IDogX29wdGlvbnMkZXJyb3JUcmFuc2ZvO1xuICB2YXIgX29wdGlvbnMkY29sb3JzID0gb3B0aW9ucy5jb2xvcnM7XG4gIHZhciBjb2xvcnMgPSBfb3B0aW9ucyRjb2xvcnMgPT09IHVuZGVmaW5lZCA/IHtcbiAgICB0aXRsZTogZnVuY3Rpb24gdGl0bGUoKSB7XG4gICAgICByZXR1cm4gXCIjMDAwMDAwXCI7XG4gICAgfSxcbiAgICBwcmV2U3RhdGU6IGZ1bmN0aW9uIHByZXZTdGF0ZSgpIHtcbiAgICAgIHJldHVybiBcIiM5RTlFOUVcIjtcbiAgICB9LFxuICAgIGFjdGlvbjogZnVuY3Rpb24gYWN0aW9uKCkge1xuICAgICAgcmV0dXJuIFwiIzAzQTlGNFwiO1xuICAgIH0sXG4gICAgbmV4dFN0YXRlOiBmdW5jdGlvbiBuZXh0U3RhdGUoKSB7XG4gICAgICByZXR1cm4gXCIjNENBRjUwXCI7XG4gICAgfSxcbiAgICBlcnJvcjogZnVuY3Rpb24gZXJyb3IoKSB7XG4gICAgICByZXR1cm4gXCIjRjIwNDA0XCI7XG4gICAgfVxuICB9IDogX29wdGlvbnMkY29sb3JzO1xuXG4gIC8vIGV4aXQgaWYgY29uc29sZSB1bmRlZmluZWRcblxuICBpZiAodHlwZW9mIGxvZ2dlciA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKG5leHQpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhY3Rpb24pIHtcbiAgICAgICAgICByZXR1cm4gbmV4dChhY3Rpb24pO1xuICAgICAgICB9O1xuICAgICAgfTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHRyYW5zZm9ybWVyKSB7XG4gICAgY29uc29sZS5lcnJvcihcIk9wdGlvbiAndHJhbnNmb3JtZXInIGlzIGRlcHJlY2F0ZWQsIHVzZSBzdGF0ZVRyYW5zZm9ybWVyIGluc3RlYWRcIik7XG4gIH1cblxuICB2YXIgbG9nQnVmZmVyID0gW107XG4gIGZ1bmN0aW9uIHByaW50QnVmZmVyKCkge1xuICAgIGxvZ0J1ZmZlci5mb3JFYWNoKGZ1bmN0aW9uIChsb2dFbnRyeSwga2V5KSB7XG4gICAgICB2YXIgc3RhcnRlZCA9IGxvZ0VudHJ5LnN0YXJ0ZWQ7XG4gICAgICB2YXIgc3RhcnRlZFRpbWUgPSBsb2dFbnRyeS5zdGFydGVkVGltZTtcbiAgICAgIHZhciBhY3Rpb24gPSBsb2dFbnRyeS5hY3Rpb247XG4gICAgICB2YXIgcHJldlN0YXRlID0gbG9nRW50cnkucHJldlN0YXRlO1xuICAgICAgdmFyIGVycm9yID0gbG9nRW50cnkuZXJyb3I7XG4gICAgICB2YXIgdG9vayA9IGxvZ0VudHJ5LnRvb2s7XG4gICAgICB2YXIgbmV4dFN0YXRlID0gbG9nRW50cnkubmV4dFN0YXRlO1xuXG4gICAgICB2YXIgbmV4dEVudHJ5ID0gbG9nQnVmZmVyW2tleSArIDFdO1xuICAgICAgaWYgKG5leHRFbnRyeSkge1xuICAgICAgICBuZXh0U3RhdGUgPSBuZXh0RW50cnkucHJldlN0YXRlO1xuICAgICAgICB0b29rID0gbmV4dEVudHJ5LnN0YXJ0ZWQgLSBzdGFydGVkO1xuICAgICAgfVxuICAgICAgLy8gbWVzc2FnZVxuICAgICAgdmFyIGZvcm1hdHRlZEFjdGlvbiA9IGFjdGlvblRyYW5zZm9ybWVyKGFjdGlvbik7XG4gICAgICB2YXIgaXNDb2xsYXBzZWQgPSB0eXBlb2YgY29sbGFwc2VkID09PSBcImZ1bmN0aW9uXCIgPyBjb2xsYXBzZWQoZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV4dFN0YXRlO1xuICAgICAgfSwgYWN0aW9uKSA6IGNvbGxhcHNlZDtcblxuICAgICAgdmFyIGZvcm1hdHRlZFRpbWUgPSBmb3JtYXRUaW1lKHN0YXJ0ZWRUaW1lKTtcbiAgICAgIHZhciB0aXRsZUNTUyA9IGNvbG9ycy50aXRsZSA/IFwiY29sb3I6IFwiICsgY29sb3JzLnRpdGxlKGZvcm1hdHRlZEFjdGlvbikgKyBcIjtcIiA6IG51bGw7XG4gICAgICB2YXIgdGl0bGUgPSBcImFjdGlvbiBcIiArICh0aW1lc3RhbXAgPyBmb3JtYXR0ZWRUaW1lIDogXCJcIikgKyBcIiBcIiArIGZvcm1hdHRlZEFjdGlvbi50eXBlICsgXCIgXCIgKyAoZHVyYXRpb24gPyBcIihpbiBcIiArIHRvb2sudG9GaXhlZCgyKSArIFwiIG1zKVwiIDogXCJcIik7XG5cbiAgICAgIC8vIHJlbmRlclxuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKGlzQ29sbGFwc2VkKSB7XG4gICAgICAgICAgaWYgKGNvbG9ycy50aXRsZSkgbG9nZ2VyLmdyb3VwQ29sbGFwc2VkKFwiJWMgXCIgKyB0aXRsZSwgdGl0bGVDU1MpO2Vsc2UgbG9nZ2VyLmdyb3VwQ29sbGFwc2VkKHRpdGxlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoY29sb3JzLnRpdGxlKSBsb2dnZXIuZ3JvdXAoXCIlYyBcIiArIHRpdGxlLCB0aXRsZUNTUyk7ZWxzZSBsb2dnZXIuZ3JvdXAodGl0bGUpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGxvZ2dlci5sb2codGl0bGUpO1xuICAgICAgfVxuXG4gICAgICB2YXIgcHJldlN0YXRlTGV2ZWwgPSBnZXRMb2dMZXZlbChsZXZlbCwgZm9ybWF0dGVkQWN0aW9uLCBbcHJldlN0YXRlXSwgXCJwcmV2U3RhdGVcIik7XG4gICAgICB2YXIgYWN0aW9uTGV2ZWwgPSBnZXRMb2dMZXZlbChsZXZlbCwgZm9ybWF0dGVkQWN0aW9uLCBbZm9ybWF0dGVkQWN0aW9uXSwgXCJhY3Rpb25cIik7XG4gICAgICB2YXIgZXJyb3JMZXZlbCA9IGdldExvZ0xldmVsKGxldmVsLCBmb3JtYXR0ZWRBY3Rpb24sIFtlcnJvciwgcHJldlN0YXRlXSwgXCJlcnJvclwiKTtcbiAgICAgIHZhciBuZXh0U3RhdGVMZXZlbCA9IGdldExvZ0xldmVsKGxldmVsLCBmb3JtYXR0ZWRBY3Rpb24sIFtuZXh0U3RhdGVdLCBcIm5leHRTdGF0ZVwiKTtcblxuICAgICAgaWYgKHByZXZTdGF0ZUxldmVsKSB7XG4gICAgICAgIGlmIChjb2xvcnMucHJldlN0YXRlKSBsb2dnZXJbcHJldlN0YXRlTGV2ZWxdKFwiJWMgcHJldiBzdGF0ZVwiLCBcImNvbG9yOiBcIiArIGNvbG9ycy5wcmV2U3RhdGUocHJldlN0YXRlKSArIFwiOyBmb250LXdlaWdodDogYm9sZFwiLCBwcmV2U3RhdGUpO2Vsc2UgbG9nZ2VyW3ByZXZTdGF0ZUxldmVsXShcInByZXYgc3RhdGVcIiwgcHJldlN0YXRlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGFjdGlvbkxldmVsKSB7XG4gICAgICAgIGlmIChjb2xvcnMuYWN0aW9uKSBsb2dnZXJbYWN0aW9uTGV2ZWxdKFwiJWMgYWN0aW9uXCIsIFwiY29sb3I6IFwiICsgY29sb3JzLmFjdGlvbihmb3JtYXR0ZWRBY3Rpb24pICsgXCI7IGZvbnQtd2VpZ2h0OiBib2xkXCIsIGZvcm1hdHRlZEFjdGlvbik7ZWxzZSBsb2dnZXJbYWN0aW9uTGV2ZWxdKFwiYWN0aW9uXCIsIGZvcm1hdHRlZEFjdGlvbik7XG4gICAgICB9XG5cbiAgICAgIGlmIChlcnJvciAmJiBlcnJvckxldmVsKSB7XG4gICAgICAgIGlmIChjb2xvcnMuZXJyb3IpIGxvZ2dlcltlcnJvckxldmVsXShcIiVjIGVycm9yXCIsIFwiY29sb3I6IFwiICsgY29sb3JzLmVycm9yKGVycm9yLCBwcmV2U3RhdGUpICsgXCI7IGZvbnQtd2VpZ2h0OiBib2xkXCIsIGVycm9yKTtlbHNlIGxvZ2dlcltlcnJvckxldmVsXShcImVycm9yXCIsIGVycm9yKTtcbiAgICAgIH1cblxuICAgICAgaWYgKG5leHRTdGF0ZUxldmVsKSB7XG4gICAgICAgIGlmIChjb2xvcnMubmV4dFN0YXRlKSBsb2dnZXJbbmV4dFN0YXRlTGV2ZWxdKFwiJWMgbmV4dCBzdGF0ZVwiLCBcImNvbG9yOiBcIiArIGNvbG9ycy5uZXh0U3RhdGUobmV4dFN0YXRlKSArIFwiOyBmb250LXdlaWdodDogYm9sZFwiLCBuZXh0U3RhdGUpO2Vsc2UgbG9nZ2VyW25leHRTdGF0ZUxldmVsXShcIm5leHQgc3RhdGVcIiwgbmV4dFN0YXRlKTtcbiAgICAgIH1cblxuICAgICAgdHJ5IHtcbiAgICAgICAgbG9nZ2VyLmdyb3VwRW5kKCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGxvZ2dlci5sb2coXCLigJTigJQgbG9nIGVuZCDigJTigJRcIik7XG4gICAgICB9XG4gICAgfSk7XG4gICAgbG9nQnVmZmVyLmxlbmd0aCA9IDA7XG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24gKF9yZWYpIHtcbiAgICB2YXIgZ2V0U3RhdGUgPSBfcmVmLmdldFN0YXRlO1xuICAgIHJldHVybiBmdW5jdGlvbiAobmV4dCkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uIChhY3Rpb24pIHtcbiAgICAgICAgLy8gZXhpdCBlYXJseSBpZiBwcmVkaWNhdGUgZnVuY3Rpb24gcmV0dXJucyBmYWxzZVxuICAgICAgICBpZiAodHlwZW9mIHByZWRpY2F0ZSA9PT0gXCJmdW5jdGlvblwiICYmICFwcmVkaWNhdGUoZ2V0U3RhdGUsIGFjdGlvbikpIHtcbiAgICAgICAgICByZXR1cm4gbmV4dChhY3Rpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGxvZ0VudHJ5ID0ge307XG4gICAgICAgIGxvZ0J1ZmZlci5wdXNoKGxvZ0VudHJ5KTtcblxuICAgICAgICBsb2dFbnRyeS5zdGFydGVkID0gdGltZXIubm93KCk7XG4gICAgICAgIGxvZ0VudHJ5LnN0YXJ0ZWRUaW1lID0gbmV3IERhdGUoKTtcbiAgICAgICAgbG9nRW50cnkucHJldlN0YXRlID0gc3RhdGVUcmFuc2Zvcm1lcihnZXRTdGF0ZSgpKTtcbiAgICAgICAgbG9nRW50cnkuYWN0aW9uID0gYWN0aW9uO1xuXG4gICAgICAgIHZhciByZXR1cm5lZFZhbHVlID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAobG9nRXJyb3JzKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybmVkVmFsdWUgPSBuZXh0KGFjdGlvbik7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgbG9nRW50cnkuZXJyb3IgPSBlcnJvclRyYW5zZm9ybWVyKGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm5lZFZhbHVlID0gbmV4dChhY3Rpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgbG9nRW50cnkudG9vayA9IHRpbWVyLm5vdygpIC0gbG9nRW50cnkuc3RhcnRlZDtcbiAgICAgICAgbG9nRW50cnkubmV4dFN0YXRlID0gc3RhdGVUcmFuc2Zvcm1lcihnZXRTdGF0ZSgpKTtcblxuICAgICAgICBwcmludEJ1ZmZlcigpO1xuXG4gICAgICAgIGlmIChsb2dFbnRyeS5lcnJvcikgdGhyb3cgbG9nRW50cnkuZXJyb3I7XG4gICAgICAgIHJldHVybiByZXR1cm5lZFZhbHVlO1xuICAgICAgfTtcbiAgICB9O1xuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZUxvZ2dlcjsiLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5mdW5jdGlvbiBjcmVhdGVUaHVua01pZGRsZXdhcmUoZXh0cmFBcmd1bWVudCkge1xuICByZXR1cm4gZnVuY3Rpb24gKF9yZWYpIHtcbiAgICB2YXIgZGlzcGF0Y2ggPSBfcmVmLmRpc3BhdGNoO1xuICAgIHZhciBnZXRTdGF0ZSA9IF9yZWYuZ2V0U3RhdGU7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChuZXh0KSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKGFjdGlvbikge1xuICAgICAgICBpZiAodHlwZW9mIGFjdGlvbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHJldHVybiBhY3Rpb24oZGlzcGF0Y2gsIGdldFN0YXRlLCBleHRyYUFyZ3VtZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXh0KGFjdGlvbik7XG4gICAgICB9O1xuICAgIH07XG4gIH07XG59XG5cbnZhciB0aHVuayA9IGNyZWF0ZVRodW5rTWlkZGxld2FyZSgpO1xudGh1bmsud2l0aEV4dHJhQXJndW1lbnQgPSBjcmVhdGVUaHVua01pZGRsZXdhcmU7XG5cbmV4cG9ydHNbJ2RlZmF1bHQnXSA9IHRodW5rOyIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxudmFyIF9leHRlbmRzID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbiAodGFyZ2V0KSB7IGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7IHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07IGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHsgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHsgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTsgfSB9IH0gcmV0dXJuIHRhcmdldDsgfTtcblxuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBhcHBseU1pZGRsZXdhcmU7XG5cbnZhciBfY29tcG9zZSA9IHJlcXVpcmUoJy4vY29tcG9zZScpO1xuXG52YXIgX2NvbXBvc2UyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfY29tcG9zZSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IFwiZGVmYXVsdFwiOiBvYmogfTsgfVxuXG4vKipcbiAqIENyZWF0ZXMgYSBzdG9yZSBlbmhhbmNlciB0aGF0IGFwcGxpZXMgbWlkZGxld2FyZSB0byB0aGUgZGlzcGF0Y2ggbWV0aG9kXG4gKiBvZiB0aGUgUmVkdXggc3RvcmUuIFRoaXMgaXMgaGFuZHkgZm9yIGEgdmFyaWV0eSBvZiB0YXNrcywgc3VjaCBhcyBleHByZXNzaW5nXG4gKiBhc3luY2hyb25vdXMgYWN0aW9ucyBpbiBhIGNvbmNpc2UgbWFubmVyLCBvciBsb2dnaW5nIGV2ZXJ5IGFjdGlvbiBwYXlsb2FkLlxuICpcbiAqIFNlZSBgcmVkdXgtdGh1bmtgIHBhY2thZ2UgYXMgYW4gZXhhbXBsZSBvZiB0aGUgUmVkdXggbWlkZGxld2FyZS5cbiAqXG4gKiBCZWNhdXNlIG1pZGRsZXdhcmUgaXMgcG90ZW50aWFsbHkgYXN5bmNocm9ub3VzLCB0aGlzIHNob3VsZCBiZSB0aGUgZmlyc3RcbiAqIHN0b3JlIGVuaGFuY2VyIGluIHRoZSBjb21wb3NpdGlvbiBjaGFpbi5cbiAqXG4gKiBOb3RlIHRoYXQgZWFjaCBtaWRkbGV3YXJlIHdpbGwgYmUgZ2l2ZW4gdGhlIGBkaXNwYXRjaGAgYW5kIGBnZXRTdGF0ZWAgZnVuY3Rpb25zXG4gKiBhcyBuYW1lZCBhcmd1bWVudHMuXG4gKlxuICogQHBhcmFtIHsuLi5GdW5jdGlvbn0gbWlkZGxld2FyZXMgVGhlIG1pZGRsZXdhcmUgY2hhaW4gdG8gYmUgYXBwbGllZC5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gQSBzdG9yZSBlbmhhbmNlciBhcHBseWluZyB0aGUgbWlkZGxld2FyZS5cbiAqL1xuZnVuY3Rpb24gYXBwbHlNaWRkbGV3YXJlKCkge1xuICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgbWlkZGxld2FyZXMgPSBBcnJheShfbGVuKSwgX2tleSA9IDA7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICBtaWRkbGV3YXJlc1tfa2V5XSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbiAoY3JlYXRlU3RvcmUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKHJlZHVjZXIsIGluaXRpYWxTdGF0ZSwgZW5oYW5jZXIpIHtcbiAgICAgIHZhciBzdG9yZSA9IGNyZWF0ZVN0b3JlKHJlZHVjZXIsIGluaXRpYWxTdGF0ZSwgZW5oYW5jZXIpO1xuICAgICAgdmFyIF9kaXNwYXRjaCA9IHN0b3JlLmRpc3BhdGNoO1xuICAgICAgdmFyIGNoYWluID0gW107XG5cbiAgICAgIHZhciBtaWRkbGV3YXJlQVBJID0ge1xuICAgICAgICBnZXRTdGF0ZTogc3RvcmUuZ2V0U3RhdGUsXG4gICAgICAgIGRpc3BhdGNoOiBmdW5jdGlvbiBkaXNwYXRjaChhY3Rpb24pIHtcbiAgICAgICAgICByZXR1cm4gX2Rpc3BhdGNoKGFjdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBjaGFpbiA9IG1pZGRsZXdhcmVzLm1hcChmdW5jdGlvbiAobWlkZGxld2FyZSkge1xuICAgICAgICByZXR1cm4gbWlkZGxld2FyZShtaWRkbGV3YXJlQVBJKTtcbiAgICAgIH0pO1xuICAgICAgX2Rpc3BhdGNoID0gX2NvbXBvc2UyW1wiZGVmYXVsdFwiXS5hcHBseSh1bmRlZmluZWQsIGNoYWluKShzdG9yZS5kaXNwYXRjaCk7XG5cbiAgICAgIHJldHVybiBfZXh0ZW5kcyh7fSwgc3RvcmUsIHtcbiAgICAgICAgZGlzcGF0Y2g6IF9kaXNwYXRjaFxuICAgICAgfSk7XG4gICAgfTtcbiAgfTtcbn0iLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5leHBvcnRzW1wiZGVmYXVsdFwiXSA9IGJpbmRBY3Rpb25DcmVhdG9ycztcbmZ1bmN0aW9uIGJpbmRBY3Rpb25DcmVhdG9yKGFjdGlvbkNyZWF0b3IsIGRpc3BhdGNoKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGRpc3BhdGNoKGFjdGlvbkNyZWF0b3IuYXBwbHkodW5kZWZpbmVkLCBhcmd1bWVudHMpKTtcbiAgfTtcbn1cblxuLyoqXG4gKiBUdXJucyBhbiBvYmplY3Qgd2hvc2UgdmFsdWVzIGFyZSBhY3Rpb24gY3JlYXRvcnMsIGludG8gYW4gb2JqZWN0IHdpdGggdGhlXG4gKiBzYW1lIGtleXMsIGJ1dCB3aXRoIGV2ZXJ5IGZ1bmN0aW9uIHdyYXBwZWQgaW50byBhIGBkaXNwYXRjaGAgY2FsbCBzbyB0aGV5XG4gKiBtYXkgYmUgaW52b2tlZCBkaXJlY3RseS4gVGhpcyBpcyBqdXN0IGEgY29udmVuaWVuY2UgbWV0aG9kLCBhcyB5b3UgY2FuIGNhbGxcbiAqIGBzdG9yZS5kaXNwYXRjaChNeUFjdGlvbkNyZWF0b3JzLmRvU29tZXRoaW5nKCkpYCB5b3Vyc2VsZiBqdXN0IGZpbmUuXG4gKlxuICogRm9yIGNvbnZlbmllbmNlLCB5b3UgY2FuIGFsc28gcGFzcyBhIHNpbmdsZSBmdW5jdGlvbiBhcyB0aGUgZmlyc3QgYXJndW1lbnQsXG4gKiBhbmQgZ2V0IGEgZnVuY3Rpb24gaW4gcmV0dXJuLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb258T2JqZWN0fSBhY3Rpb25DcmVhdG9ycyBBbiBvYmplY3Qgd2hvc2UgdmFsdWVzIGFyZSBhY3Rpb25cbiAqIGNyZWF0b3IgZnVuY3Rpb25zLiBPbmUgaGFuZHkgd2F5IHRvIG9idGFpbiBpdCBpcyB0byB1c2UgRVM2IGBpbXBvcnQgKiBhc2BcbiAqIHN5bnRheC4gWW91IG1heSBhbHNvIHBhc3MgYSBzaW5nbGUgZnVuY3Rpb24uXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZGlzcGF0Y2ggVGhlIGBkaXNwYXRjaGAgZnVuY3Rpb24gYXZhaWxhYmxlIG9uIHlvdXIgUmVkdXhcbiAqIHN0b3JlLlxuICpcbiAqIEByZXR1cm5zIHtGdW5jdGlvbnxPYmplY3R9IFRoZSBvYmplY3QgbWltaWNraW5nIHRoZSBvcmlnaW5hbCBvYmplY3QsIGJ1dCB3aXRoXG4gKiBldmVyeSBhY3Rpb24gY3JlYXRvciB3cmFwcGVkIGludG8gdGhlIGBkaXNwYXRjaGAgY2FsbC4gSWYgeW91IHBhc3NlZCBhXG4gKiBmdW5jdGlvbiBhcyBgYWN0aW9uQ3JlYXRvcnNgLCB0aGUgcmV0dXJuIHZhbHVlIHdpbGwgYWxzbyBiZSBhIHNpbmdsZVxuICogZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIGJpbmRBY3Rpb25DcmVhdG9ycyhhY3Rpb25DcmVhdG9ycywgZGlzcGF0Y2gpIHtcbiAgaWYgKHR5cGVvZiBhY3Rpb25DcmVhdG9ycyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBiaW5kQWN0aW9uQ3JlYXRvcihhY3Rpb25DcmVhdG9ycywgZGlzcGF0Y2gpO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBhY3Rpb25DcmVhdG9ycyAhPT0gJ29iamVjdCcgfHwgYWN0aW9uQ3JlYXRvcnMgPT09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2JpbmRBY3Rpb25DcmVhdG9ycyBleHBlY3RlZCBhbiBvYmplY3Qgb3IgYSBmdW5jdGlvbiwgaW5zdGVhZCByZWNlaXZlZCAnICsgKGFjdGlvbkNyZWF0b3JzID09PSBudWxsID8gJ251bGwnIDogdHlwZW9mIGFjdGlvbkNyZWF0b3JzKSArICcuICcgKyAnRGlkIHlvdSB3cml0ZSBcImltcG9ydCBBY3Rpb25DcmVhdG9ycyBmcm9tXCIgaW5zdGVhZCBvZiBcImltcG9ydCAqIGFzIEFjdGlvbkNyZWF0b3JzIGZyb21cIj8nKTtcbiAgfVxuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWN0aW9uQ3JlYXRvcnMpO1xuICB2YXIgYm91bmRBY3Rpb25DcmVhdG9ycyA9IHt9O1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICB2YXIgYWN0aW9uQ3JlYXRvciA9IGFjdGlvbkNyZWF0b3JzW2tleV07XG4gICAgaWYgKHR5cGVvZiBhY3Rpb25DcmVhdG9yID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBib3VuZEFjdGlvbkNyZWF0b3JzW2tleV0gPSBiaW5kQWN0aW9uQ3JlYXRvcihhY3Rpb25DcmVhdG9yLCBkaXNwYXRjaCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBib3VuZEFjdGlvbkNyZWF0b3JzO1xufSIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gY29tYmluZVJlZHVjZXJzO1xuXG52YXIgX2NyZWF0ZVN0b3JlID0gcmVxdWlyZSgnLi9jcmVhdGVTdG9yZScpO1xuXG52YXIgX2lzUGxhaW5PYmplY3QgPSByZXF1aXJlKCdsb2Rhc2gvaXNQbGFpbk9iamVjdCcpO1xuXG52YXIgX2lzUGxhaW5PYmplY3QyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfaXNQbGFpbk9iamVjdCk7XG5cbnZhciBfd2FybmluZyA9IHJlcXVpcmUoJy4vdXRpbHMvd2FybmluZycpO1xuXG52YXIgX3dhcm5pbmcyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfd2FybmluZyk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wUmVxdWlyZURlZmF1bHQob2JqKSB7IHJldHVybiBvYmogJiYgb2JqLl9fZXNNb2R1bGUgPyBvYmogOiB7IFwiZGVmYXVsdFwiOiBvYmogfTsgfVxuXG5mdW5jdGlvbiBnZXRVbmRlZmluZWRTdGF0ZUVycm9yTWVzc2FnZShrZXksIGFjdGlvbikge1xuICB2YXIgYWN0aW9uVHlwZSA9IGFjdGlvbiAmJiBhY3Rpb24udHlwZTtcbiAgdmFyIGFjdGlvbk5hbWUgPSBhY3Rpb25UeXBlICYmICdcIicgKyBhY3Rpb25UeXBlLnRvU3RyaW5nKCkgKyAnXCInIHx8ICdhbiBhY3Rpb24nO1xuXG4gIHJldHVybiAnR2l2ZW4gYWN0aW9uICcgKyBhY3Rpb25OYW1lICsgJywgcmVkdWNlciBcIicgKyBrZXkgKyAnXCIgcmV0dXJuZWQgdW5kZWZpbmVkLiAnICsgJ1RvIGlnbm9yZSBhbiBhY3Rpb24sIHlvdSBtdXN0IGV4cGxpY2l0bHkgcmV0dXJuIHRoZSBwcmV2aW91cyBzdGF0ZS4nO1xufVxuXG5mdW5jdGlvbiBnZXRVbmV4cGVjdGVkU3RhdGVTaGFwZVdhcm5pbmdNZXNzYWdlKGlucHV0U3RhdGUsIHJlZHVjZXJzLCBhY3Rpb24pIHtcbiAgdmFyIHJlZHVjZXJLZXlzID0gT2JqZWN0LmtleXMocmVkdWNlcnMpO1xuICB2YXIgYXJndW1lbnROYW1lID0gYWN0aW9uICYmIGFjdGlvbi50eXBlID09PSBfY3JlYXRlU3RvcmUuQWN0aW9uVHlwZXMuSU5JVCA/ICdpbml0aWFsU3RhdGUgYXJndW1lbnQgcGFzc2VkIHRvIGNyZWF0ZVN0b3JlJyA6ICdwcmV2aW91cyBzdGF0ZSByZWNlaXZlZCBieSB0aGUgcmVkdWNlcic7XG5cbiAgaWYgKHJlZHVjZXJLZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiAnU3RvcmUgZG9lcyBub3QgaGF2ZSBhIHZhbGlkIHJlZHVjZXIuIE1ha2Ugc3VyZSB0aGUgYXJndW1lbnQgcGFzc2VkICcgKyAndG8gY29tYmluZVJlZHVjZXJzIGlzIGFuIG9iamVjdCB3aG9zZSB2YWx1ZXMgYXJlIHJlZHVjZXJzLic7XG4gIH1cblxuICBpZiAoISgwLCBfaXNQbGFpbk9iamVjdDJbXCJkZWZhdWx0XCJdKShpbnB1dFN0YXRlKSkge1xuICAgIHJldHVybiAnVGhlICcgKyBhcmd1bWVudE5hbWUgKyAnIGhhcyB1bmV4cGVjdGVkIHR5cGUgb2YgXCInICsge30udG9TdHJpbmcuY2FsbChpbnB1dFN0YXRlKS5tYXRjaCgvXFxzKFthLXp8QS1aXSspLylbMV0gKyAnXCIuIEV4cGVjdGVkIGFyZ3VtZW50IHRvIGJlIGFuIG9iamVjdCB3aXRoIHRoZSBmb2xsb3dpbmcgJyArICgna2V5czogXCInICsgcmVkdWNlcktleXMuam9pbignXCIsIFwiJykgKyAnXCInKTtcbiAgfVxuXG4gIHZhciB1bmV4cGVjdGVkS2V5cyA9IE9iamVjdC5rZXlzKGlucHV0U3RhdGUpLmZpbHRlcihmdW5jdGlvbiAoa2V5KSB7XG4gICAgcmV0dXJuICFyZWR1Y2Vycy5oYXNPd25Qcm9wZXJ0eShrZXkpO1xuICB9KTtcblxuICBpZiAodW5leHBlY3RlZEtleXMubGVuZ3RoID4gMCkge1xuICAgIHJldHVybiAnVW5leHBlY3RlZCAnICsgKHVuZXhwZWN0ZWRLZXlzLmxlbmd0aCA+IDEgPyAna2V5cycgOiAna2V5JykgKyAnICcgKyAoJ1wiJyArIHVuZXhwZWN0ZWRLZXlzLmpvaW4oJ1wiLCBcIicpICsgJ1wiIGZvdW5kIGluICcgKyBhcmd1bWVudE5hbWUgKyAnLiAnKSArICdFeHBlY3RlZCB0byBmaW5kIG9uZSBvZiB0aGUga25vd24gcmVkdWNlciBrZXlzIGluc3RlYWQ6ICcgKyAoJ1wiJyArIHJlZHVjZXJLZXlzLmpvaW4oJ1wiLCBcIicpICsgJ1wiLiBVbmV4cGVjdGVkIGtleXMgd2lsbCBiZSBpZ25vcmVkLicpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFzc2VydFJlZHVjZXJTYW5pdHkocmVkdWNlcnMpIHtcbiAgT2JqZWN0LmtleXMocmVkdWNlcnMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgIHZhciByZWR1Y2VyID0gcmVkdWNlcnNba2V5XTtcbiAgICB2YXIgaW5pdGlhbFN0YXRlID0gcmVkdWNlcih1bmRlZmluZWQsIHsgdHlwZTogX2NyZWF0ZVN0b3JlLkFjdGlvblR5cGVzLklOSVQgfSk7XG5cbiAgICBpZiAodHlwZW9mIGluaXRpYWxTdGF0ZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignUmVkdWNlciBcIicgKyBrZXkgKyAnXCIgcmV0dXJuZWQgdW5kZWZpbmVkIGR1cmluZyBpbml0aWFsaXphdGlvbi4gJyArICdJZiB0aGUgc3RhdGUgcGFzc2VkIHRvIHRoZSByZWR1Y2VyIGlzIHVuZGVmaW5lZCwgeW91IG11c3QgJyArICdleHBsaWNpdGx5IHJldHVybiB0aGUgaW5pdGlhbCBzdGF0ZS4gVGhlIGluaXRpYWwgc3RhdGUgbWF5ICcgKyAnbm90IGJlIHVuZGVmaW5lZC4nKTtcbiAgICB9XG5cbiAgICB2YXIgdHlwZSA9ICdAQHJlZHV4L1BST0JFX1VOS05PV05fQUNUSU9OXycgKyBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNykuc3BsaXQoJycpLmpvaW4oJy4nKTtcbiAgICBpZiAodHlwZW9mIHJlZHVjZXIodW5kZWZpbmVkLCB7IHR5cGU6IHR5cGUgfSkgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JlZHVjZXIgXCInICsga2V5ICsgJ1wiIHJldHVybmVkIHVuZGVmaW5lZCB3aGVuIHByb2JlZCB3aXRoIGEgcmFuZG9tIHR5cGUuICcgKyAoJ0RvblxcJ3QgdHJ5IHRvIGhhbmRsZSAnICsgX2NyZWF0ZVN0b3JlLkFjdGlvblR5cGVzLklOSVQgKyAnIG9yIG90aGVyIGFjdGlvbnMgaW4gXCJyZWR1eC8qXCIgJykgKyAnbmFtZXNwYWNlLiBUaGV5IGFyZSBjb25zaWRlcmVkIHByaXZhdGUuIEluc3RlYWQsIHlvdSBtdXN0IHJldHVybiB0aGUgJyArICdjdXJyZW50IHN0YXRlIGZvciBhbnkgdW5rbm93biBhY3Rpb25zLCB1bmxlc3MgaXQgaXMgdW5kZWZpbmVkLCAnICsgJ2luIHdoaWNoIGNhc2UgeW91IG11c3QgcmV0dXJuIHRoZSBpbml0aWFsIHN0YXRlLCByZWdhcmRsZXNzIG9mIHRoZSAnICsgJ2FjdGlvbiB0eXBlLiBUaGUgaW5pdGlhbCBzdGF0ZSBtYXkgbm90IGJlIHVuZGVmaW5lZC4nKTtcbiAgICB9XG4gIH0pO1xufVxuXG4vKipcbiAqIFR1cm5zIGFuIG9iamVjdCB3aG9zZSB2YWx1ZXMgYXJlIGRpZmZlcmVudCByZWR1Y2VyIGZ1bmN0aW9ucywgaW50byBhIHNpbmdsZVxuICogcmVkdWNlciBmdW5jdGlvbi4gSXQgd2lsbCBjYWxsIGV2ZXJ5IGNoaWxkIHJlZHVjZXIsIGFuZCBnYXRoZXIgdGhlaXIgcmVzdWx0c1xuICogaW50byBhIHNpbmdsZSBzdGF0ZSBvYmplY3QsIHdob3NlIGtleXMgY29ycmVzcG9uZCB0byB0aGUga2V5cyBvZiB0aGUgcGFzc2VkXG4gKiByZWR1Y2VyIGZ1bmN0aW9ucy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gcmVkdWNlcnMgQW4gb2JqZWN0IHdob3NlIHZhbHVlcyBjb3JyZXNwb25kIHRvIGRpZmZlcmVudFxuICogcmVkdWNlciBmdW5jdGlvbnMgdGhhdCBuZWVkIHRvIGJlIGNvbWJpbmVkIGludG8gb25lLiBPbmUgaGFuZHkgd2F5IHRvIG9idGFpblxuICogaXQgaXMgdG8gdXNlIEVTNiBgaW1wb3J0ICogYXMgcmVkdWNlcnNgIHN5bnRheC4gVGhlIHJlZHVjZXJzIG1heSBuZXZlciByZXR1cm5cbiAqIHVuZGVmaW5lZCBmb3IgYW55IGFjdGlvbi4gSW5zdGVhZCwgdGhleSBzaG91bGQgcmV0dXJuIHRoZWlyIGluaXRpYWwgc3RhdGVcbiAqIGlmIHRoZSBzdGF0ZSBwYXNzZWQgdG8gdGhlbSB3YXMgdW5kZWZpbmVkLCBhbmQgdGhlIGN1cnJlbnQgc3RhdGUgZm9yIGFueVxuICogdW5yZWNvZ25pemVkIGFjdGlvbi5cbiAqXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IEEgcmVkdWNlciBmdW5jdGlvbiB0aGF0IGludm9rZXMgZXZlcnkgcmVkdWNlciBpbnNpZGUgdGhlXG4gKiBwYXNzZWQgb2JqZWN0LCBhbmQgYnVpbGRzIGEgc3RhdGUgb2JqZWN0IHdpdGggdGhlIHNhbWUgc2hhcGUuXG4gKi9cbmZ1bmN0aW9uIGNvbWJpbmVSZWR1Y2VycyhyZWR1Y2Vycykge1xuICB2YXIgcmVkdWNlcktleXMgPSBPYmplY3Qua2V5cyhyZWR1Y2Vycyk7XG4gIHZhciBmaW5hbFJlZHVjZXJzID0ge307XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcmVkdWNlcktleXMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIga2V5ID0gcmVkdWNlcktleXNbaV07XG4gICAgaWYgKHR5cGVvZiByZWR1Y2Vyc1trZXldID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBmaW5hbFJlZHVjZXJzW2tleV0gPSByZWR1Y2Vyc1trZXldO1xuICAgIH1cbiAgfVxuICB2YXIgZmluYWxSZWR1Y2VyS2V5cyA9IE9iamVjdC5rZXlzKGZpbmFsUmVkdWNlcnMpO1xuXG4gIHZhciBzYW5pdHlFcnJvcjtcbiAgdHJ5IHtcbiAgICBhc3NlcnRSZWR1Y2VyU2FuaXR5KGZpbmFsUmVkdWNlcnMpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgc2FuaXR5RXJyb3IgPSBlO1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIGNvbWJpbmF0aW9uKCkge1xuICAgIHZhciBzdGF0ZSA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHt9IDogYXJndW1lbnRzWzBdO1xuICAgIHZhciBhY3Rpb24gPSBhcmd1bWVudHNbMV07XG5cbiAgICBpZiAoc2FuaXR5RXJyb3IpIHtcbiAgICAgIHRocm93IHNhbml0eUVycm9yO1xuICAgIH1cblxuICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgICB2YXIgd2FybmluZ01lc3NhZ2UgPSBnZXRVbmV4cGVjdGVkU3RhdGVTaGFwZVdhcm5pbmdNZXNzYWdlKHN0YXRlLCBmaW5hbFJlZHVjZXJzLCBhY3Rpb24pO1xuICAgICAgaWYgKHdhcm5pbmdNZXNzYWdlKSB7XG4gICAgICAgICgwLCBfd2FybmluZzJbXCJkZWZhdWx0XCJdKSh3YXJuaW5nTWVzc2FnZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGhhc0NoYW5nZWQgPSBmYWxzZTtcbiAgICB2YXIgbmV4dFN0YXRlID0ge307XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaW5hbFJlZHVjZXJLZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIga2V5ID0gZmluYWxSZWR1Y2VyS2V5c1tpXTtcbiAgICAgIHZhciByZWR1Y2VyID0gZmluYWxSZWR1Y2Vyc1trZXldO1xuICAgICAgdmFyIHByZXZpb3VzU3RhdGVGb3JLZXkgPSBzdGF0ZVtrZXldO1xuICAgICAgdmFyIG5leHRTdGF0ZUZvcktleSA9IHJlZHVjZXIocHJldmlvdXNTdGF0ZUZvcktleSwgYWN0aW9uKTtcbiAgICAgIGlmICh0eXBlb2YgbmV4dFN0YXRlRm9yS2V5ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICB2YXIgZXJyb3JNZXNzYWdlID0gZ2V0VW5kZWZpbmVkU3RhdGVFcnJvck1lc3NhZ2Uoa2V5LCBhY3Rpb24pO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgICAgIH1cbiAgICAgIG5leHRTdGF0ZVtrZXldID0gbmV4dFN0YXRlRm9yS2V5O1xuICAgICAgaGFzQ2hhbmdlZCA9IGhhc0NoYW5nZWQgfHwgbmV4dFN0YXRlRm9yS2V5ICE9PSBwcmV2aW91c1N0YXRlRm9yS2V5O1xuICAgIH1cbiAgICByZXR1cm4gaGFzQ2hhbmdlZCA/IG5leHRTdGF0ZSA6IHN0YXRlO1xuICB9O1xufSIsIlwidXNlIHN0cmljdFwiO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSBjb21wb3NlO1xuLyoqXG4gKiBDb21wb3NlcyBzaW5nbGUtYXJndW1lbnQgZnVuY3Rpb25zIGZyb20gcmlnaHQgdG8gbGVmdC4gVGhlIHJpZ2h0bW9zdFxuICogZnVuY3Rpb24gY2FuIHRha2UgbXVsdGlwbGUgYXJndW1lbnRzIGFzIGl0IHByb3ZpZGVzIHRoZSBzaWduYXR1cmUgZm9yXG4gKiB0aGUgcmVzdWx0aW5nIGNvbXBvc2l0ZSBmdW5jdGlvbi5cbiAqXG4gKiBAcGFyYW0gey4uLkZ1bmN0aW9ufSBmdW5jcyBUaGUgZnVuY3Rpb25zIHRvIGNvbXBvc2UuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IEEgZnVuY3Rpb24gb2J0YWluZWQgYnkgY29tcG9zaW5nIHRoZSBhcmd1bWVudCBmdW5jdGlvbnNcbiAqIGZyb20gcmlnaHQgdG8gbGVmdC4gRm9yIGV4YW1wbGUsIGNvbXBvc2UoZiwgZywgaCkgaXMgaWRlbnRpY2FsIHRvIGRvaW5nXG4gKiAoLi4uYXJncykgPT4gZihnKGgoLi4uYXJncykpKS5cbiAqL1xuXG5mdW5jdGlvbiBjb21wb3NlKCkge1xuICBmb3IgKHZhciBfbGVuID0gYXJndW1lbnRzLmxlbmd0aCwgZnVuY3MgPSBBcnJheShfbGVuKSwgX2tleSA9IDA7IF9rZXkgPCBfbGVuOyBfa2V5KyspIHtcbiAgICBmdW5jc1tfa2V5XSA9IGFyZ3VtZW50c1tfa2V5XTtcbiAgfVxuXG4gIGlmIChmdW5jcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGFyZykge1xuICAgICAgcmV0dXJuIGFyZztcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIHZhciBfcmV0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGxhc3QgPSBmdW5jc1tmdW5jcy5sZW5ndGggLSAxXTtcbiAgICAgIHZhciByZXN0ID0gZnVuY3Muc2xpY2UoMCwgLTEpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdjogZnVuY3Rpb24gdigpIHtcbiAgICAgICAgICByZXR1cm4gcmVzdC5yZWR1Y2VSaWdodChmdW5jdGlvbiAoY29tcG9zZWQsIGYpIHtcbiAgICAgICAgICAgIHJldHVybiBmKGNvbXBvc2VkKTtcbiAgICAgICAgICB9LCBsYXN0LmFwcGx5KHVuZGVmaW5lZCwgYXJndW1lbnRzKSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSgpO1xuXG4gICAgaWYgKHR5cGVvZiBfcmV0ID09PSBcIm9iamVjdFwiKSByZXR1cm4gX3JldC52O1xuICB9XG59IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuZXhwb3J0cy5BY3Rpb25UeXBlcyA9IHVuZGVmaW5lZDtcbmV4cG9ydHNbXCJkZWZhdWx0XCJdID0gY3JlYXRlU3RvcmU7XG5cbnZhciBfaXNQbGFpbk9iamVjdCA9IHJlcXVpcmUoJ2xvZGFzaC9pc1BsYWluT2JqZWN0Jyk7XG5cbnZhciBfaXNQbGFpbk9iamVjdDIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9pc1BsYWluT2JqZWN0KTtcblxudmFyIF9zeW1ib2xPYnNlcnZhYmxlID0gcmVxdWlyZSgnc3ltYm9sLW9ic2VydmFibGUnKTtcblxudmFyIF9zeW1ib2xPYnNlcnZhYmxlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX3N5bWJvbE9ic2VydmFibGUpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBcImRlZmF1bHRcIjogb2JqIH07IH1cblxuLyoqXG4gKiBUaGVzZSBhcmUgcHJpdmF0ZSBhY3Rpb24gdHlwZXMgcmVzZXJ2ZWQgYnkgUmVkdXguXG4gKiBGb3IgYW55IHVua25vd24gYWN0aW9ucywgeW91IG11c3QgcmV0dXJuIHRoZSBjdXJyZW50IHN0YXRlLlxuICogSWYgdGhlIGN1cnJlbnQgc3RhdGUgaXMgdW5kZWZpbmVkLCB5b3UgbXVzdCByZXR1cm4gdGhlIGluaXRpYWwgc3RhdGUuXG4gKiBEbyBub3QgcmVmZXJlbmNlIHRoZXNlIGFjdGlvbiB0eXBlcyBkaXJlY3RseSBpbiB5b3VyIGNvZGUuXG4gKi9cbnZhciBBY3Rpb25UeXBlcyA9IGV4cG9ydHMuQWN0aW9uVHlwZXMgPSB7XG4gIElOSVQ6ICdAQHJlZHV4L0lOSVQnXG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBSZWR1eCBzdG9yZSB0aGF0IGhvbGRzIHRoZSBzdGF0ZSB0cmVlLlxuICogVGhlIG9ubHkgd2F5IHRvIGNoYW5nZSB0aGUgZGF0YSBpbiB0aGUgc3RvcmUgaXMgdG8gY2FsbCBgZGlzcGF0Y2goKWAgb24gaXQuXG4gKlxuICogVGhlcmUgc2hvdWxkIG9ubHkgYmUgYSBzaW5nbGUgc3RvcmUgaW4geW91ciBhcHAuIFRvIHNwZWNpZnkgaG93IGRpZmZlcmVudFxuICogcGFydHMgb2YgdGhlIHN0YXRlIHRyZWUgcmVzcG9uZCB0byBhY3Rpb25zLCB5b3UgbWF5IGNvbWJpbmUgc2V2ZXJhbCByZWR1Y2Vyc1xuICogaW50byBhIHNpbmdsZSByZWR1Y2VyIGZ1bmN0aW9uIGJ5IHVzaW5nIGBjb21iaW5lUmVkdWNlcnNgLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlZHVjZXIgQSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIG5leHQgc3RhdGUgdHJlZSwgZ2l2ZW5cbiAqIHRoZSBjdXJyZW50IHN0YXRlIHRyZWUgYW5kIHRoZSBhY3Rpb24gdG8gaGFuZGxlLlxuICpcbiAqIEBwYXJhbSB7YW55fSBbaW5pdGlhbFN0YXRlXSBUaGUgaW5pdGlhbCBzdGF0ZS4gWW91IG1heSBvcHRpb25hbGx5IHNwZWNpZnkgaXRcbiAqIHRvIGh5ZHJhdGUgdGhlIHN0YXRlIGZyb20gdGhlIHNlcnZlciBpbiB1bml2ZXJzYWwgYXBwcywgb3IgdG8gcmVzdG9yZSBhXG4gKiBwcmV2aW91c2x5IHNlcmlhbGl6ZWQgdXNlciBzZXNzaW9uLlxuICogSWYgeW91IHVzZSBgY29tYmluZVJlZHVjZXJzYCB0byBwcm9kdWNlIHRoZSByb290IHJlZHVjZXIgZnVuY3Rpb24sIHRoaXMgbXVzdCBiZVxuICogYW4gb2JqZWN0IHdpdGggdGhlIHNhbWUgc2hhcGUgYXMgYGNvbWJpbmVSZWR1Y2Vyc2Aga2V5cy5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBlbmhhbmNlciBUaGUgc3RvcmUgZW5oYW5jZXIuIFlvdSBtYXkgb3B0aW9uYWxseSBzcGVjaWZ5IGl0XG4gKiB0byBlbmhhbmNlIHRoZSBzdG9yZSB3aXRoIHRoaXJkLXBhcnR5IGNhcGFiaWxpdGllcyBzdWNoIGFzIG1pZGRsZXdhcmUsXG4gKiB0aW1lIHRyYXZlbCwgcGVyc2lzdGVuY2UsIGV0Yy4gVGhlIG9ubHkgc3RvcmUgZW5oYW5jZXIgdGhhdCBzaGlwcyB3aXRoIFJlZHV4XG4gKiBpcyBgYXBwbHlNaWRkbGV3YXJlKClgLlxuICpcbiAqIEByZXR1cm5zIHtTdG9yZX0gQSBSZWR1eCBzdG9yZSB0aGF0IGxldHMgeW91IHJlYWQgdGhlIHN0YXRlLCBkaXNwYXRjaCBhY3Rpb25zXG4gKiBhbmQgc3Vic2NyaWJlIHRvIGNoYW5nZXMuXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVN0b3JlKHJlZHVjZXIsIGluaXRpYWxTdGF0ZSwgZW5oYW5jZXIpIHtcbiAgdmFyIF9yZWYyO1xuXG4gIGlmICh0eXBlb2YgaW5pdGlhbFN0YXRlID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBlbmhhbmNlciA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBlbmhhbmNlciA9IGluaXRpYWxTdGF0ZTtcbiAgICBpbml0aWFsU3RhdGUgPSB1bmRlZmluZWQ7XG4gIH1cblxuICBpZiAodHlwZW9mIGVuaGFuY2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmICh0eXBlb2YgZW5oYW5jZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRXhwZWN0ZWQgdGhlIGVuaGFuY2VyIHRvIGJlIGEgZnVuY3Rpb24uJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVuaGFuY2VyKGNyZWF0ZVN0b3JlKShyZWR1Y2VyLCBpbml0aWFsU3RhdGUpO1xuICB9XG5cbiAgaWYgKHR5cGVvZiByZWR1Y2VyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCB0aGUgcmVkdWNlciB0byBiZSBhIGZ1bmN0aW9uLicpO1xuICB9XG5cbiAgdmFyIGN1cnJlbnRSZWR1Y2VyID0gcmVkdWNlcjtcbiAgdmFyIGN1cnJlbnRTdGF0ZSA9IGluaXRpYWxTdGF0ZTtcbiAgdmFyIGN1cnJlbnRMaXN0ZW5lcnMgPSBbXTtcbiAgdmFyIG5leHRMaXN0ZW5lcnMgPSBjdXJyZW50TGlzdGVuZXJzO1xuICB2YXIgaXNEaXNwYXRjaGluZyA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGVuc3VyZUNhbk11dGF0ZU5leHRMaXN0ZW5lcnMoKSB7XG4gICAgaWYgKG5leHRMaXN0ZW5lcnMgPT09IGN1cnJlbnRMaXN0ZW5lcnMpIHtcbiAgICAgIG5leHRMaXN0ZW5lcnMgPSBjdXJyZW50TGlzdGVuZXJzLnNsaWNlKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlYWRzIHRoZSBzdGF0ZSB0cmVlIG1hbmFnZWQgYnkgdGhlIHN0b3JlLlxuICAgKlxuICAgKiBAcmV0dXJucyB7YW55fSBUaGUgY3VycmVudCBzdGF0ZSB0cmVlIG9mIHlvdXIgYXBwbGljYXRpb24uXG4gICAqL1xuICBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgICByZXR1cm4gY3VycmVudFN0YXRlO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZHMgYSBjaGFuZ2UgbGlzdGVuZXIuIEl0IHdpbGwgYmUgY2FsbGVkIGFueSB0aW1lIGFuIGFjdGlvbiBpcyBkaXNwYXRjaGVkLFxuICAgKiBhbmQgc29tZSBwYXJ0IG9mIHRoZSBzdGF0ZSB0cmVlIG1heSBwb3RlbnRpYWxseSBoYXZlIGNoYW5nZWQuIFlvdSBtYXkgdGhlblxuICAgKiBjYWxsIGBnZXRTdGF0ZSgpYCB0byByZWFkIHRoZSBjdXJyZW50IHN0YXRlIHRyZWUgaW5zaWRlIHRoZSBjYWxsYmFjay5cbiAgICpcbiAgICogWW91IG1heSBjYWxsIGBkaXNwYXRjaCgpYCBmcm9tIGEgY2hhbmdlIGxpc3RlbmVyLCB3aXRoIHRoZSBmb2xsb3dpbmdcbiAgICogY2F2ZWF0czpcbiAgICpcbiAgICogMS4gVGhlIHN1YnNjcmlwdGlvbnMgYXJlIHNuYXBzaG90dGVkIGp1c3QgYmVmb3JlIGV2ZXJ5IGBkaXNwYXRjaCgpYCBjYWxsLlxuICAgKiBJZiB5b3Ugc3Vic2NyaWJlIG9yIHVuc3Vic2NyaWJlIHdoaWxlIHRoZSBsaXN0ZW5lcnMgYXJlIGJlaW5nIGludm9rZWQsIHRoaXNcbiAgICogd2lsbCBub3QgaGF2ZSBhbnkgZWZmZWN0IG9uIHRoZSBgZGlzcGF0Y2goKWAgdGhhdCBpcyBjdXJyZW50bHkgaW4gcHJvZ3Jlc3MuXG4gICAqIEhvd2V2ZXIsIHRoZSBuZXh0IGBkaXNwYXRjaCgpYCBjYWxsLCB3aGV0aGVyIG5lc3RlZCBvciBub3QsIHdpbGwgdXNlIGEgbW9yZVxuICAgKiByZWNlbnQgc25hcHNob3Qgb2YgdGhlIHN1YnNjcmlwdGlvbiBsaXN0LlxuICAgKlxuICAgKiAyLiBUaGUgbGlzdGVuZXIgc2hvdWxkIG5vdCBleHBlY3QgdG8gc2VlIGFsbCBzdGF0ZSBjaGFuZ2VzLCBhcyB0aGUgc3RhdGVcbiAgICogbWlnaHQgaGF2ZSBiZWVuIHVwZGF0ZWQgbXVsdGlwbGUgdGltZXMgZHVyaW5nIGEgbmVzdGVkIGBkaXNwYXRjaCgpYCBiZWZvcmVcbiAgICogdGhlIGxpc3RlbmVyIGlzIGNhbGxlZC4gSXQgaXMsIGhvd2V2ZXIsIGd1YXJhbnRlZWQgdGhhdCBhbGwgc3Vic2NyaWJlcnNcbiAgICogcmVnaXN0ZXJlZCBiZWZvcmUgdGhlIGBkaXNwYXRjaCgpYCBzdGFydGVkIHdpbGwgYmUgY2FsbGVkIHdpdGggdGhlIGxhdGVzdFxuICAgKiBzdGF0ZSBieSB0aGUgdGltZSBpdCBleGl0cy5cbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgQSBjYWxsYmFjayB0byBiZSBpbnZva2VkIG9uIGV2ZXJ5IGRpc3BhdGNoLlxuICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IEEgZnVuY3Rpb24gdG8gcmVtb3ZlIHRoaXMgY2hhbmdlIGxpc3RlbmVyLlxuICAgKi9cbiAgZnVuY3Rpb24gc3Vic2NyaWJlKGxpc3RlbmVyKSB7XG4gICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCBsaXN0ZW5lciB0byBiZSBhIGZ1bmN0aW9uLicpO1xuICAgIH1cblxuICAgIHZhciBpc1N1YnNjcmliZWQgPSB0cnVlO1xuXG4gICAgZW5zdXJlQ2FuTXV0YXRlTmV4dExpc3RlbmVycygpO1xuICAgIG5leHRMaXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gdW5zdWJzY3JpYmUoKSB7XG4gICAgICBpZiAoIWlzU3Vic2NyaWJlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlzU3Vic2NyaWJlZCA9IGZhbHNlO1xuXG4gICAgICBlbnN1cmVDYW5NdXRhdGVOZXh0TGlzdGVuZXJzKCk7XG4gICAgICB2YXIgaW5kZXggPSBuZXh0TGlzdGVuZXJzLmluZGV4T2YobGlzdGVuZXIpO1xuICAgICAgbmV4dExpc3RlbmVycy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogRGlzcGF0Y2hlcyBhbiBhY3Rpb24uIEl0IGlzIHRoZSBvbmx5IHdheSB0byB0cmlnZ2VyIGEgc3RhdGUgY2hhbmdlLlxuICAgKlxuICAgKiBUaGUgYHJlZHVjZXJgIGZ1bmN0aW9uLCB1c2VkIHRvIGNyZWF0ZSB0aGUgc3RvcmUsIHdpbGwgYmUgY2FsbGVkIHdpdGggdGhlXG4gICAqIGN1cnJlbnQgc3RhdGUgdHJlZSBhbmQgdGhlIGdpdmVuIGBhY3Rpb25gLiBJdHMgcmV0dXJuIHZhbHVlIHdpbGxcbiAgICogYmUgY29uc2lkZXJlZCB0aGUgKipuZXh0Kiogc3RhdGUgb2YgdGhlIHRyZWUsIGFuZCB0aGUgY2hhbmdlIGxpc3RlbmVyc1xuICAgKiB3aWxsIGJlIG5vdGlmaWVkLlxuICAgKlxuICAgKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvbmx5IHN1cHBvcnRzIHBsYWluIG9iamVjdCBhY3Rpb25zLiBJZiB5b3Ugd2FudCB0b1xuICAgKiBkaXNwYXRjaCBhIFByb21pc2UsIGFuIE9ic2VydmFibGUsIGEgdGh1bmssIG9yIHNvbWV0aGluZyBlbHNlLCB5b3UgbmVlZCB0b1xuICAgKiB3cmFwIHlvdXIgc3RvcmUgY3JlYXRpbmcgZnVuY3Rpb24gaW50byB0aGUgY29ycmVzcG9uZGluZyBtaWRkbGV3YXJlLiBGb3JcbiAgICogZXhhbXBsZSwgc2VlIHRoZSBkb2N1bWVudGF0aW9uIGZvciB0aGUgYHJlZHV4LXRodW5rYCBwYWNrYWdlLiBFdmVuIHRoZVxuICAgKiBtaWRkbGV3YXJlIHdpbGwgZXZlbnR1YWxseSBkaXNwYXRjaCBwbGFpbiBvYmplY3QgYWN0aW9ucyB1c2luZyB0aGlzIG1ldGhvZC5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IGFjdGlvbiBBIHBsYWluIG9iamVjdCByZXByZXNlbnRpbmcg4oCcd2hhdCBjaGFuZ2Vk4oCdLiBJdCBpc1xuICAgKiBhIGdvb2QgaWRlYSB0byBrZWVwIGFjdGlvbnMgc2VyaWFsaXphYmxlIHNvIHlvdSBjYW4gcmVjb3JkIGFuZCByZXBsYXkgdXNlclxuICAgKiBzZXNzaW9ucywgb3IgdXNlIHRoZSB0aW1lIHRyYXZlbGxpbmcgYHJlZHV4LWRldnRvb2xzYC4gQW4gYWN0aW9uIG11c3QgaGF2ZVxuICAgKiBhIGB0eXBlYCBwcm9wZXJ0eSB3aGljaCBtYXkgbm90IGJlIGB1bmRlZmluZWRgLiBJdCBpcyBhIGdvb2QgaWRlYSB0byB1c2VcbiAgICogc3RyaW5nIGNvbnN0YW50cyBmb3IgYWN0aW9uIHR5cGVzLlxuICAgKlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBGb3IgY29udmVuaWVuY2UsIHRoZSBzYW1lIGFjdGlvbiBvYmplY3QgeW91IGRpc3BhdGNoZWQuXG4gICAqXG4gICAqIE5vdGUgdGhhdCwgaWYgeW91IHVzZSBhIGN1c3RvbSBtaWRkbGV3YXJlLCBpdCBtYXkgd3JhcCBgZGlzcGF0Y2goKWAgdG9cbiAgICogcmV0dXJuIHNvbWV0aGluZyBlbHNlIChmb3IgZXhhbXBsZSwgYSBQcm9taXNlIHlvdSBjYW4gYXdhaXQpLlxuICAgKi9cbiAgZnVuY3Rpb24gZGlzcGF0Y2goYWN0aW9uKSB7XG4gICAgaWYgKCEoMCwgX2lzUGxhaW5PYmplY3QyW1wiZGVmYXVsdFwiXSkoYWN0aW9uKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdBY3Rpb25zIG11c3QgYmUgcGxhaW4gb2JqZWN0cy4gJyArICdVc2UgY3VzdG9tIG1pZGRsZXdhcmUgZm9yIGFzeW5jIGFjdGlvbnMuJyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBhY3Rpb24udHlwZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignQWN0aW9ucyBtYXkgbm90IGhhdmUgYW4gdW5kZWZpbmVkIFwidHlwZVwiIHByb3BlcnR5LiAnICsgJ0hhdmUgeW91IG1pc3NwZWxsZWQgYSBjb25zdGFudD8nKTtcbiAgICB9XG5cbiAgICBpZiAoaXNEaXNwYXRjaGluZykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZWR1Y2VycyBtYXkgbm90IGRpc3BhdGNoIGFjdGlvbnMuJyk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGlzRGlzcGF0Y2hpbmcgPSB0cnVlO1xuICAgICAgY3VycmVudFN0YXRlID0gY3VycmVudFJlZHVjZXIoY3VycmVudFN0YXRlLCBhY3Rpb24pO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBpc0Rpc3BhdGNoaW5nID0gZmFsc2U7XG4gICAgfVxuXG4gICAgdmFyIGxpc3RlbmVycyA9IGN1cnJlbnRMaXN0ZW5lcnMgPSBuZXh0TGlzdGVuZXJzO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBsaXN0ZW5lcnNbaV0oKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYWN0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlcGxhY2VzIHRoZSByZWR1Y2VyIGN1cnJlbnRseSB1c2VkIGJ5IHRoZSBzdG9yZSB0byBjYWxjdWxhdGUgdGhlIHN0YXRlLlxuICAgKlxuICAgKiBZb3UgbWlnaHQgbmVlZCB0aGlzIGlmIHlvdXIgYXBwIGltcGxlbWVudHMgY29kZSBzcGxpdHRpbmcgYW5kIHlvdSB3YW50IHRvXG4gICAqIGxvYWQgc29tZSBvZiB0aGUgcmVkdWNlcnMgZHluYW1pY2FsbHkuIFlvdSBtaWdodCBhbHNvIG5lZWQgdGhpcyBpZiB5b3VcbiAgICogaW1wbGVtZW50IGEgaG90IHJlbG9hZGluZyBtZWNoYW5pc20gZm9yIFJlZHV4LlxuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBuZXh0UmVkdWNlciBUaGUgcmVkdWNlciBmb3IgdGhlIHN0b3JlIHRvIHVzZSBpbnN0ZWFkLlxuICAgKiBAcmV0dXJucyB7dm9pZH1cbiAgICovXG4gIGZ1bmN0aW9uIHJlcGxhY2VSZWR1Y2VyKG5leHRSZWR1Y2VyKSB7XG4gICAgaWYgKHR5cGVvZiBuZXh0UmVkdWNlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdFeHBlY3RlZCB0aGUgbmV4dFJlZHVjZXIgdG8gYmUgYSBmdW5jdGlvbi4nKTtcbiAgICB9XG5cbiAgICBjdXJyZW50UmVkdWNlciA9IG5leHRSZWR1Y2VyO1xuICAgIGRpc3BhdGNoKHsgdHlwZTogQWN0aW9uVHlwZXMuSU5JVCB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbnRlcm9wZXJhYmlsaXR5IHBvaW50IGZvciBvYnNlcnZhYmxlL3JlYWN0aXZlIGxpYnJhcmllcy5cbiAgICogQHJldHVybnMge29ic2VydmFibGV9IEEgbWluaW1hbCBvYnNlcnZhYmxlIG9mIHN0YXRlIGNoYW5nZXMuXG4gICAqIEZvciBtb3JlIGluZm9ybWF0aW9uLCBzZWUgdGhlIG9ic2VydmFibGUgcHJvcG9zYWw6XG4gICAqIGh0dHBzOi8vZ2l0aHViLmNvbS96ZW5wYXJzaW5nL2VzLW9ic2VydmFibGVcbiAgICovXG4gIGZ1bmN0aW9uIG9ic2VydmFibGUoKSB7XG4gICAgdmFyIF9yZWY7XG5cbiAgICB2YXIgb3V0ZXJTdWJzY3JpYmUgPSBzdWJzY3JpYmU7XG4gICAgcmV0dXJuIF9yZWYgPSB7XG4gICAgICAvKipcbiAgICAgICAqIFRoZSBtaW5pbWFsIG9ic2VydmFibGUgc3Vic2NyaXB0aW9uIG1ldGhvZC5cbiAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYnNlcnZlciBBbnkgb2JqZWN0IHRoYXQgY2FuIGJlIHVzZWQgYXMgYW4gb2JzZXJ2ZXIuXG4gICAgICAgKiBUaGUgb2JzZXJ2ZXIgb2JqZWN0IHNob3VsZCBoYXZlIGEgYG5leHRgIG1ldGhvZC5cbiAgICAgICAqIEByZXR1cm5zIHtzdWJzY3JpcHRpb259IEFuIG9iamVjdCB3aXRoIGFuIGB1bnN1YnNjcmliZWAgbWV0aG9kIHRoYXQgY2FuXG4gICAgICAgKiBiZSB1c2VkIHRvIHVuc3Vic2NyaWJlIHRoZSBvYnNlcnZhYmxlIGZyb20gdGhlIHN0b3JlLCBhbmQgcHJldmVudCBmdXJ0aGVyXG4gICAgICAgKiBlbWlzc2lvbiBvZiB2YWx1ZXMgZnJvbSB0aGUgb2JzZXJ2YWJsZS5cbiAgICAgICAqL1xuXG4gICAgICBzdWJzY3JpYmU6IGZ1bmN0aW9uIHN1YnNjcmliZShvYnNlcnZlcikge1xuICAgICAgICBpZiAodHlwZW9mIG9ic2VydmVyICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0V4cGVjdGVkIHRoZSBvYnNlcnZlciB0byBiZSBhbiBvYmplY3QuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBvYnNlcnZlU3RhdGUoKSB7XG4gICAgICAgICAgaWYgKG9ic2VydmVyLm5leHQpIHtcbiAgICAgICAgICAgIG9ic2VydmVyLm5leHQoZ2V0U3RhdGUoKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgb2JzZXJ2ZVN0YXRlKCk7XG4gICAgICAgIHZhciB1bnN1YnNjcmliZSA9IG91dGVyU3Vic2NyaWJlKG9ic2VydmVTdGF0ZSk7XG4gICAgICAgIHJldHVybiB7IHVuc3Vic2NyaWJlOiB1bnN1YnNjcmliZSB9O1xuICAgICAgfVxuICAgIH0sIF9yZWZbX3N5bWJvbE9ic2VydmFibGUyW1wiZGVmYXVsdFwiXV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LCBfcmVmO1xuICB9XG5cbiAgLy8gV2hlbiBhIHN0b3JlIGlzIGNyZWF0ZWQsIGFuIFwiSU5JVFwiIGFjdGlvbiBpcyBkaXNwYXRjaGVkIHNvIHRoYXQgZXZlcnlcbiAgLy8gcmVkdWNlciByZXR1cm5zIHRoZWlyIGluaXRpYWwgc3RhdGUuIFRoaXMgZWZmZWN0aXZlbHkgcG9wdWxhdGVzXG4gIC8vIHRoZSBpbml0aWFsIHN0YXRlIHRyZWUuXG4gIGRpc3BhdGNoKHsgdHlwZTogQWN0aW9uVHlwZXMuSU5JVCB9KTtcblxuICByZXR1cm4gX3JlZjIgPSB7XG4gICAgZGlzcGF0Y2g6IGRpc3BhdGNoLFxuICAgIHN1YnNjcmliZTogc3Vic2NyaWJlLFxuICAgIGdldFN0YXRlOiBnZXRTdGF0ZSxcbiAgICByZXBsYWNlUmVkdWNlcjogcmVwbGFjZVJlZHVjZXJcbiAgfSwgX3JlZjJbX3N5bWJvbE9ic2VydmFibGUyW1wiZGVmYXVsdFwiXV0gPSBvYnNlcnZhYmxlLCBfcmVmMjtcbn0iLCIndXNlIHN0cmljdCc7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5leHBvcnRzLmNvbXBvc2UgPSBleHBvcnRzLmFwcGx5TWlkZGxld2FyZSA9IGV4cG9ydHMuYmluZEFjdGlvbkNyZWF0b3JzID0gZXhwb3J0cy5jb21iaW5lUmVkdWNlcnMgPSBleHBvcnRzLmNyZWF0ZVN0b3JlID0gdW5kZWZpbmVkO1xuXG52YXIgX2NyZWF0ZVN0b3JlID0gcmVxdWlyZSgnLi9jcmVhdGVTdG9yZScpO1xuXG52YXIgX2NyZWF0ZVN0b3JlMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2NyZWF0ZVN0b3JlKTtcblxudmFyIF9jb21iaW5lUmVkdWNlcnMgPSByZXF1aXJlKCcuL2NvbWJpbmVSZWR1Y2VycycpO1xuXG52YXIgX2NvbWJpbmVSZWR1Y2VyczIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9jb21iaW5lUmVkdWNlcnMpO1xuXG52YXIgX2JpbmRBY3Rpb25DcmVhdG9ycyA9IHJlcXVpcmUoJy4vYmluZEFjdGlvbkNyZWF0b3JzJyk7XG5cbnZhciBfYmluZEFjdGlvbkNyZWF0b3JzMiA9IF9pbnRlcm9wUmVxdWlyZURlZmF1bHQoX2JpbmRBY3Rpb25DcmVhdG9ycyk7XG5cbnZhciBfYXBwbHlNaWRkbGV3YXJlID0gcmVxdWlyZSgnLi9hcHBseU1pZGRsZXdhcmUnKTtcblxudmFyIF9hcHBseU1pZGRsZXdhcmUyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfYXBwbHlNaWRkbGV3YXJlKTtcblxudmFyIF9jb21wb3NlID0gcmVxdWlyZSgnLi9jb21wb3NlJyk7XG5cbnZhciBfY29tcG9zZTIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF9jb21wb3NlKTtcblxudmFyIF93YXJuaW5nID0gcmVxdWlyZSgnLi91dGlscy93YXJuaW5nJyk7XG5cbnZhciBfd2FybmluZzIgPSBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KF93YXJuaW5nKTtcblxuZnVuY3Rpb24gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChvYmopIHsgcmV0dXJuIG9iaiAmJiBvYmouX19lc01vZHVsZSA/IG9iaiA6IHsgXCJkZWZhdWx0XCI6IG9iaiB9OyB9XG5cbi8qXG4qIFRoaXMgaXMgYSBkdW1teSBmdW5jdGlvbiB0byBjaGVjayBpZiB0aGUgZnVuY3Rpb24gbmFtZSBoYXMgYmVlbiBhbHRlcmVkIGJ5IG1pbmlmaWNhdGlvbi5cbiogSWYgdGhlIGZ1bmN0aW9uIGhhcyBiZWVuIG1pbmlmaWVkIGFuZCBOT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nLCB3YXJuIHRoZSB1c2VyLlxuKi9cbmZ1bmN0aW9uIGlzQ3J1c2hlZCgpIHt9XG5cbmlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nICYmIHR5cGVvZiBpc0NydXNoZWQubmFtZSA9PT0gJ3N0cmluZycgJiYgaXNDcnVzaGVkLm5hbWUgIT09ICdpc0NydXNoZWQnKSB7XG4gICgwLCBfd2FybmluZzJbXCJkZWZhdWx0XCJdKSgnWW91IGFyZSBjdXJyZW50bHkgdXNpbmcgbWluaWZpZWQgY29kZSBvdXRzaWRlIG9mIE5PREVfRU5WID09PSBcXCdwcm9kdWN0aW9uXFwnLiAnICsgJ1RoaXMgbWVhbnMgdGhhdCB5b3UgYXJlIHJ1bm5pbmcgYSBzbG93ZXIgZGV2ZWxvcG1lbnQgYnVpbGQgb2YgUmVkdXguICcgKyAnWW91IGNhbiB1c2UgbG9vc2UtZW52aWZ5IChodHRwczovL2dpdGh1Yi5jb20vemVydG9zaC9sb29zZS1lbnZpZnkpIGZvciBicm93c2VyaWZ5ICcgKyAnb3IgRGVmaW5lUGx1Z2luIGZvciB3ZWJwYWNrIChodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzMwMDMwMDMxKSAnICsgJ3RvIGVuc3VyZSB5b3UgaGF2ZSB0aGUgY29ycmVjdCBjb2RlIGZvciB5b3VyIHByb2R1Y3Rpb24gYnVpbGQuJyk7XG59XG5cbmV4cG9ydHMuY3JlYXRlU3RvcmUgPSBfY3JlYXRlU3RvcmUyW1wiZGVmYXVsdFwiXTtcbmV4cG9ydHMuY29tYmluZVJlZHVjZXJzID0gX2NvbWJpbmVSZWR1Y2VyczJbXCJkZWZhdWx0XCJdO1xuZXhwb3J0cy5iaW5kQWN0aW9uQ3JlYXRvcnMgPSBfYmluZEFjdGlvbkNyZWF0b3JzMltcImRlZmF1bHRcIl07XG5leHBvcnRzLmFwcGx5TWlkZGxld2FyZSA9IF9hcHBseU1pZGRsZXdhcmUyW1wiZGVmYXVsdFwiXTtcbmV4cG9ydHMuY29tcG9zZSA9IF9jb21wb3NlMltcImRlZmF1bHRcIl07IiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuZXhwb3J0c1tcImRlZmF1bHRcIl0gPSB3YXJuaW5nO1xuLyoqXG4gKiBQcmludHMgYSB3YXJuaW5nIGluIHRoZSBjb25zb2xlIGlmIGl0IGV4aXN0cy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbWVzc2FnZSBUaGUgd2FybmluZyBtZXNzYWdlLlxuICogQHJldHVybnMge3ZvaWR9XG4gKi9cbmZ1bmN0aW9uIHdhcm5pbmcobWVzc2FnZSkge1xuICAvKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG4gIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGNvbnNvbGUuZXJyb3IgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjb25zb2xlLmVycm9yKG1lc3NhZ2UpO1xuICB9XG4gIC8qIGVzbGludC1lbmFibGUgbm8tY29uc29sZSAqL1xuICB0cnkge1xuICAgIC8vIFRoaXMgZXJyb3Igd2FzIHRocm93biBhcyBhIGNvbnZlbmllbmNlIHNvIHRoYXQgaWYgeW91IGVuYWJsZVxuICAgIC8vIFwiYnJlYWsgb24gYWxsIGV4Y2VwdGlvbnNcIiBpbiB5b3VyIGNvbnNvbGUsXG4gICAgLy8gaXQgd291bGQgcGF1c2UgdGhlIGV4ZWN1dGlvbiBhdCB0aGlzIGxpbmUuXG4gICAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLWVtcHR5ICovXG4gIH0gY2F0Y2ggKGUpIHt9XG4gIC8qIGVzbGludC1lbmFibGUgbm8tZW1wdHkgKi9cbn0iLCIvKiBCdWlsdC1pbiBtZXRob2QgcmVmZXJlbmNlcyBmb3IgdGhvc2Ugd2l0aCB0aGUgc2FtZSBuYW1lIGFzIG90aGVyIGBsb2Rhc2hgIG1ldGhvZHMuICovXG52YXIgbmF0aXZlR2V0UHJvdG90eXBlID0gT2JqZWN0LmdldFByb3RvdHlwZU9mO1xuXG4vKipcbiAqIEdldHMgdGhlIGBbW1Byb3RvdHlwZV1dYCBvZiBgdmFsdWVgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBxdWVyeS5cbiAqIEByZXR1cm5zIHtudWxsfE9iamVjdH0gUmV0dXJucyB0aGUgYFtbUHJvdG90eXBlXV1gLlxuICovXG5mdW5jdGlvbiBnZXRQcm90b3R5cGUodmFsdWUpIHtcbiAgcmV0dXJuIG5hdGl2ZUdldFByb3RvdHlwZShPYmplY3QodmFsdWUpKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnZXRQcm90b3R5cGU7XG4iLCIvKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgaG9zdCBvYmplY3QgaW4gSUUgPCA5LlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgaG9zdCBvYmplY3QsIGVsc2UgYGZhbHNlYC5cbiAqL1xuZnVuY3Rpb24gaXNIb3N0T2JqZWN0KHZhbHVlKSB7XG4gIC8vIE1hbnkgaG9zdCBvYmplY3RzIGFyZSBgT2JqZWN0YCBvYmplY3RzIHRoYXQgY2FuIGNvZXJjZSB0byBzdHJpbmdzXG4gIC8vIGRlc3BpdGUgaGF2aW5nIGltcHJvcGVybHkgZGVmaW5lZCBgdG9TdHJpbmdgIG1ldGhvZHMuXG4gIHZhciByZXN1bHQgPSBmYWxzZTtcbiAgaWYgKHZhbHVlICE9IG51bGwgJiYgdHlwZW9mIHZhbHVlLnRvU3RyaW5nICE9ICdmdW5jdGlvbicpIHtcbiAgICB0cnkge1xuICAgICAgcmVzdWx0ID0gISEodmFsdWUgKyAnJyk7XG4gICAgfSBjYXRjaCAoZSkge31cbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzSG9zdE9iamVjdDtcbiIsIi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgb2JqZWN0LWxpa2UuIEEgdmFsdWUgaXMgb2JqZWN0LWxpa2UgaWYgaXQncyBub3QgYG51bGxgXG4gKiBhbmQgaGFzIGEgYHR5cGVvZmAgcmVzdWx0IG9mIFwib2JqZWN0XCIuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBzaW5jZSA0LjAuMFxuICogQGNhdGVnb3J5IExhbmdcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIGB2YWx1ZWAgaXMgb2JqZWN0LWxpa2UsIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc09iamVjdExpa2Uoe30pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNPYmplY3RMaWtlKFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdExpa2UoXy5ub29wKTtcbiAqIC8vID0+IGZhbHNlXG4gKlxuICogXy5pc09iamVjdExpa2UobnVsbCk7XG4gKiAvLyA9PiBmYWxzZVxuICovXG5mdW5jdGlvbiBpc09iamVjdExpa2UodmFsdWUpIHtcbiAgcmV0dXJuICEhdmFsdWUgJiYgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzT2JqZWN0TGlrZTtcbiIsInZhciBnZXRQcm90b3R5cGUgPSByZXF1aXJlKCcuL19nZXRQcm90b3R5cGUnKSxcbiAgICBpc0hvc3RPYmplY3QgPSByZXF1aXJlKCcuL19pc0hvc3RPYmplY3QnKSxcbiAgICBpc09iamVjdExpa2UgPSByZXF1aXJlKCcuL2lzT2JqZWN0TGlrZScpO1xuXG4vKiogYE9iamVjdCN0b1N0cmluZ2AgcmVzdWx0IHJlZmVyZW5jZXMuICovXG52YXIgb2JqZWN0VGFnID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbi8qKiBVc2VkIGZvciBidWlsdC1pbiBtZXRob2QgcmVmZXJlbmNlcy4gKi9cbnZhciBvYmplY3RQcm90byA9IE9iamVjdC5wcm90b3R5cGU7XG5cbi8qKiBVc2VkIHRvIHJlc29sdmUgdGhlIGRlY29tcGlsZWQgc291cmNlIG9mIGZ1bmN0aW9ucy4gKi9cbnZhciBmdW5jVG9TdHJpbmcgPSBGdW5jdGlvbi5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8qKiBVc2VkIHRvIGNoZWNrIG9iamVjdHMgZm9yIG93biBwcm9wZXJ0aWVzLiAqL1xudmFyIGhhc093blByb3BlcnR5ID0gb2JqZWN0UHJvdG8uaGFzT3duUHJvcGVydHk7XG5cbi8qKiBVc2VkIHRvIGluZmVyIHRoZSBgT2JqZWN0YCBjb25zdHJ1Y3Rvci4gKi9cbnZhciBvYmplY3RDdG9yU3RyaW5nID0gZnVuY1RvU3RyaW5nLmNhbGwoT2JqZWN0KTtcblxuLyoqXG4gKiBVc2VkIHRvIHJlc29sdmUgdGhlXG4gKiBbYHRvU3RyaW5nVGFnYF0oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wLyNzZWMtb2JqZWN0LnByb3RvdHlwZS50b3N0cmluZylcbiAqIG9mIHZhbHVlcy5cbiAqL1xudmFyIG9iamVjdFRvU3RyaW5nID0gb2JqZWN0UHJvdG8udG9TdHJpbmc7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSBwbGFpbiBvYmplY3QsIHRoYXQgaXMsIGFuIG9iamVjdCBjcmVhdGVkIGJ5IHRoZVxuICogYE9iamVjdGAgY29uc3RydWN0b3Igb3Igb25lIHdpdGggYSBgW1tQcm90b3R5cGVdXWAgb2YgYG51bGxgLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAc2luY2UgMC44LjBcbiAqIEBjYXRlZ29yeSBMYW5nXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGEgcGxhaW4gb2JqZWN0LFxuICogIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogZnVuY3Rpb24gRm9vKCkge1xuICogICB0aGlzLmEgPSAxO1xuICogfVxuICpcbiAqIF8uaXNQbGFpbk9iamVjdChuZXcgRm9vKTtcbiAqIC8vID0+IGZhbHNlXG4gKlxuICogXy5pc1BsYWluT2JqZWN0KFsxLCAyLCAzXSk7XG4gKiAvLyA9PiBmYWxzZVxuICpcbiAqIF8uaXNQbGFpbk9iamVjdCh7ICd4JzogMCwgJ3knOiAwIH0pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNQbGFpbk9iamVjdChPYmplY3QuY3JlYXRlKG51bGwpKTtcbiAqIC8vID0+IHRydWVcbiAqL1xuZnVuY3Rpb24gaXNQbGFpbk9iamVjdCh2YWx1ZSkge1xuICBpZiAoIWlzT2JqZWN0TGlrZSh2YWx1ZSkgfHxcbiAgICAgIG9iamVjdFRvU3RyaW5nLmNhbGwodmFsdWUpICE9IG9iamVjdFRhZyB8fCBpc0hvc3RPYmplY3QodmFsdWUpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZhciBwcm90byA9IGdldFByb3RvdHlwZSh2YWx1ZSk7XG4gIGlmIChwcm90byA9PT0gbnVsbCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHZhciBDdG9yID0gaGFzT3duUHJvcGVydHkuY2FsbChwcm90bywgJ2NvbnN0cnVjdG9yJykgJiYgcHJvdG8uY29uc3RydWN0b3I7XG4gIHJldHVybiAodHlwZW9mIEN0b3IgPT0gJ2Z1bmN0aW9uJyAmJlxuICAgIEN0b3IgaW5zdGFuY2VvZiBDdG9yICYmIGZ1bmNUb1N0cmluZy5jYWxsKEN0b3IpID09IG9iamVjdEN0b3JTdHJpbmcpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzUGxhaW5PYmplY3Q7XG4iLCIvKiBnbG9iYWwgd2luZG93ICovXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9wb255ZmlsbCcpKGdsb2JhbCB8fCB3aW5kb3cgfHwgdGhpcyk7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc3ltYm9sT2JzZXJ2YWJsZVBvbnlmaWxsKHJvb3QpIHtcblx0dmFyIHJlc3VsdDtcblx0dmFyIFN5bWJvbCA9IHJvb3QuU3ltYm9sO1xuXG5cdGlmICh0eXBlb2YgU3ltYm9sID09PSAnZnVuY3Rpb24nKSB7XG5cdFx0aWYgKFN5bWJvbC5vYnNlcnZhYmxlKSB7XG5cdFx0XHRyZXN1bHQgPSBTeW1ib2wub2JzZXJ2YWJsZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVzdWx0ID0gU3ltYm9sKCdvYnNlcnZhYmxlJyk7XG5cdFx0XHRTeW1ib2wub2JzZXJ2YWJsZSA9IHJlc3VsdDtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0cmVzdWx0ID0gJ0BAb2JzZXJ2YWJsZSc7XG5cdH1cblxuXHRyZXR1cm4gcmVzdWx0O1xufTtcbiIsIi8qanNsaW50IGVzdmVyc2lvbjogNiAqL1xuXG4vLyBJbml0aWF0ZSBhIHJlZHV4IHN0b3JlL2Rpc3BhdGNoZXIgZXRjXG5pbXBvcnQgeyBjcmVhdGVTdG9yZSB9IGZyb20gJ3JlZHV4JztcbmltcG9ydCB7Y29uZmlndXJlU3RvcmUsIGluamVjdEFzeW5jUmVkdWNlciB9IGZyb20gJy4vc3RvcmUnO1xuXG4vLyBDcmVhdGUgYSBSZWR1eCBzdG9yZSBob2xkaW5nIHRoZSBzdGF0ZSBvZiB5b3VyIGFwcC5cbmxldCBzdG9yZSA9IGNvbmZpZ3VyZVN0b3JlKHt9KTtcblxuXG4vKipcbiAqIEFkZCBhIHJlZHVjZXIgZnVuY3Rpb24gdG8gdGhlIHdoaXNwZXIgZnJhbWV3b3JrXG4gKiBSZWR1Y2VycyByZXNwb25kIHRvIGFjdGlvbnMgYW5kIHVwZGF0ZSB0aGUgYXBwbGljYXRpb24ncyBzdGF0ZS5cbiAqIEBwYXJhbSB7ZXZlbnR9IGV2ZW50XG4gKi9cbmNvbnN0IGFkZFJlZHVjZXIgPSAoZXZlbnQpID0+IHtcblx0dmFyIGQgPSBldmVudC5kZXRhaWw7XG5cdGluamVjdEFzeW5jUmVkdWNlcihzdG9yZSwgZC5uYW1lLCBkLnJlZHVjZXIpO1xuXHRpZiAoZC5vbkFkZCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0ZC5vbkFkZCgpO1xuXHR9XG59O1xuXG4vKipcbiAqIERpc3BhdGNoIGFuIGFjdGlvbiB0byB0aGUgc3RvcmVcbiAqIEFjdGlvbnMgYXJlIHBheWxvYWRzIG9mIGluZm9ybWF0aW9uIHRoYXQgc2VuZCBkYXRhIGZyb20geW91ciBhcHBsaWNhdGlvbiB0byB5b3VyIHN0b3JlLlxuICogVGhleSBhcmUgdGhlIG9ubHkgc291cmNlIG9mIGluZm9ybWF0aW9uIGZvciB0aGUgc3RvcmVcbiAqIEBwYXJhbSB7ZXZlbnR9IGV2ZW50XG4gKi9cbmNvbnN0IGRpc3BhdGNoID0gKGV2ZW50KSA9PiB7XG5cdGNvbnNvbGUubG9nKCd3aGlzcGVyLmRpc3BhdGNoJywgZXZlbnQpO1xuXHR2YXIgZCA9IGV2ZW50LmRldGFpbDtcblx0c3RvcmUuZGlzcGF0Y2goZC5hY3Rpb24pO1xufVxuXG4vKipcbiAqIEdldCB0aGUgY3VycmVudCBzdGF0ZVxuICogQHBhcmFtIHtldmVudH0gZXZlbnRcbiAqIEByZXR1cm5zIHtTfVxuICovXG5jb25zdCBnZXRTdGF0ZSA9IChldmVudCkgPT4ge1xuXHR2YXIgZCA9IGV2ZW50LmRldGFpbDtcblx0cmV0dXJuIGQoc3RvcmUuZ2V0U3RhdGUoKSk7XG59XG5cbi8qKlxuICogU3Vic2NyaWJlIGEgZnVuY3Rpb24gd2hpY2ggaXMgcnVuIHdoZW4gdGhlIHN0b3JlJ3Mgc3RhdGVcbiAqIGNoYW5nZXMuIFRoaXMgZnVuY3Rpb24gaGFuZGxlcyB1cGRhdGluZyB0aGUgdmlld1xuICogQHBhcmFtIHtldmVudH0gZXZlbnRcbiAqL1xuY29uc3Qgc3Vic2NyaWJlID0gKGV2ZW50KSA9PiB7XG5cdHZhciBkID0gZXZlbnQuZGV0YWlsO1xuXHRzdG9yZS5zdWJzY3JpYmUoZCk7XG59XG5cbi8vIFdhdGNoIGZvciBhbnkgY3VzdG9tIGV2ZW50cyAoZmlyZWQgYnkgY29tcG9uZW50cy9tb2R1bGVzIGV0YylcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3doaXNwZXIuYWRkUmVkdWNlcicsIGFkZFJlZHVjZXIpO1xuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignd2hpc3Blci5kaXNwYXRjaCcsIGRpc3BhdGNoKTtcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3doaXNwZXIuZ2V0U3RhdGUnLCBnZXRTdGF0ZSk7XG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCd3aGlzcGVyLnN1YnNjcmliZScsIHN1YnNjcmliZSk7XG4iLCIvKipcbiAqIENyZWF0ZWQgYnkgcm9iIG9uIDE3LzA1LzIwMTYuXG4gKi9cblxuaW1wb3J0IEltbXV0YWJsZSBmcm9tICdpbW11dGFibGUnO1xuXG5cbmNvbnN0IGluaXRpYWxTdGF0ZSA9IEltbXV0YWJsZS5MaXN0KCk7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbVVzZXJzKHN0YXRlID0gaW5pdGlhbFN0YXRlLCBhY3Rpb24pIHtcbiAgICBpZiAoIWFjdGlvbiB8fCAhYWN0aW9uLnR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgIH1cbiAgICBzd2l0Y2ggKGFjdGlvbi50eXBlKSB7XG4gICAgICAgIGNhc2UgJ0NPTV9VU0VSUy5JTkNSRU1FTlQnOlxuICAgICAgICAgICAgcmV0dXJuIHN0YXRlLmluc2VydCgxKTtcbiAgICAgICAgY2FzZSAnQ09NX1VTRVJTLkRFQ1JFTUVOVCc6XG4gICAgICAgICAgICByZXR1cm4gc3RhdGUgLSAxXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gc3RhdGVcbiAgICB9XG59XG5cbiIsIi8qKlxuICogQ3JlYXRlZCBieSByb2Igb24gMTcvMDUvMjAxNi5cbiAqL1xuXG5pbXBvcnQgeyBjb21iaW5lUmVkdWNlcnMgfSBmcm9tICdyZWR1eCc7XG5pbXBvcnQgdXNlcnMgZnJvbSAnLi9jb20tdXNlcnMnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjcmVhdGVSZWR1Y2VyKGFzeW5jUmVkdWNlcnMpIHtcbiAgICByZXR1cm4gY29tYmluZVJlZHVjZXJzKHtcbiAgICAgICAgdXNlcnMsXG4gICAgICAgIC4uLmFzeW5jUmVkdWNlcnNcbiAgICB9KTtcbn1cbiIsImltcG9ydCB7IGNyZWF0ZVN0b3JlLCBhcHBseU1pZGRsZXdhcmUgfSBmcm9tICdyZWR1eCc7XG5pbXBvcnQgY3JlYXRlUmVkdWNlciBmcm9tICcuL3JlZHVjZXJzL2luZGV4JztcbmltcG9ydCBsb2dnZXIgZnJvbSAncmVkdXgtbG9nZ2VyJztcbmltcG9ydCB0aHVuayBmcm9tICdyZWR1eC10aHVuayc7XG5cbi8qKlxuICogQ29uZmlndXJlIHRoZSBzdG9yZVxuICogQHBhcmFtIHsqfSBpbml0aWFsU3RhdGVcbiAqIEByZXR1cm5zIHtTdG9yZX1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbmZpZ3VyZVN0b3JlKGluaXRpYWxTdGF0ZSkge1xuICAgIGNvbnNvbGUubG9nKCdjcmVhdGUgc3RvcmUgaW5pdGlhbCBzdGF0ZSA9ICcsIGluaXRpYWxTdGF0ZSk7XG4gICAgbGV0IHN0b3JlID0gY3JlYXRlU3RvcmUoY3JlYXRlUmVkdWNlcigpLCBpbml0aWFsU3RhdGUsIGFwcGx5TWlkZGxld2FyZSh0aHVuaywgbG9nZ2VyKCkpLFxuICAgICAgICB3aW5kb3cuZGV2VG9vbHNFeHRlbnNpb24gPyB3aW5kb3cuZGV2VG9vbHNFeHRlbnNpb24oKSA6IGYgPT4gZik7XG4gICAgc3RvcmUuYXN5bmNSZWR1Y2VycyA9IHt9O1xuICAgIHJldHVybiBzdG9yZTtcbn1cbi8qKlxuICogSW5qZWN0IGEgbmV3IHJlZHVjZXIgaW50byB0aGUgc3RvcmUuXG4gKiBAcGFyYW0ge29iamVjdH0gc3RvcmVcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBhc3luY1JlZHVjZXJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluamVjdEFzeW5jUmVkdWNlcihzdG9yZSwgbmFtZSwgYXN5bmNSZWR1Y2VyKSB7XG4gICAgc3RvcmUuYXN5bmNSZWR1Y2Vyc1tuYW1lXSA9IGFzeW5jUmVkdWNlcjtcbiAgICBzdG9yZS5yZXBsYWNlUmVkdWNlcihjcmVhdGVSZWR1Y2VyKHN0b3JlLmFzeW5jUmVkdWNlcnMpKTtcbn0iXX0=
