(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/**
 * For whisper - a Joomla! redux implementation
 */

/**
 * Add in a reducer to the framework
 * This function alters whisper's state
 * @param {*} state
 * @param {function} action
 */
var reducer = function reducer() {
    var state = arguments.length <= 0 || arguments[0] === undefined ? { todos: [] } : arguments[0];
    var action = arguments[1];

    if (!action || !action.type) {
        return state;
    }
    switch (action.type) {

        case 'COM_TODO.ADD':
            return {
                todos: [].concat(_toConsumableArray(state.todos), [{
                    text: action.text,
                    completed: false
                }])
            };
        case 'COM_TODO.DONE':
            return state;
        default:
            return state;
    }
};

/**
 * Dispatch an event to the document.
 * If whisper is installed & published then it will pick up this event,
 * add the reducer to itself and then fire the onAdd event.
 */
document.dispatchEvent(getEvent('whisper.addReducer', { name: 'com_todo', reducer: reducer }));

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmNcXGluZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7QUNVQSxJQUFJLFVBQVUsU0FBVixPQUFVLEdBQXVDO0FBQUEsUUFBN0IsS0FBNkIseURBQXJCLEVBQUMsT0FBTyxFQUFSLEVBQXFCO0FBQUEsUUFBUixNQUFROztBQUNqRCxRQUFJLENBQUMsTUFBRCxJQUFXLENBQUMsT0FBTyxJQUF2QixFQUE2QjtBQUN6QixlQUFPLEtBQVA7QUFDSDtBQUNELFlBQVEsT0FBTyxJQUFmOztBQUVJLGFBQUssY0FBTDtBQUNBLG1CQUFPO0FBQ0gsb0RBQ08sTUFBTSxLQURiLElBRUk7QUFDSSwwQkFBTSxPQUFPLElBRGpCO0FBRUksK0JBQVc7QUFGZixpQkFGSjtBQURHLGFBQVA7QUFTQSxhQUFLLGVBQUw7QUFDSSxtQkFBTyxLQUFQO0FBQ0o7QUFDSSxtQkFBTyxLQUFQO0FBZlI7QUFpQkgsQ0FyQkQ7Ozs7Ozs7QUE0QkEsU0FBUyxhQUFULENBQ0ksU0FBUyxvQkFBVCxFQUErQixFQUFDLE1BQU0sVUFBUCxFQUFtQixTQUFTLE9BQTVCLEVBQS9CLENBREoiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBGb3Igd2hpc3BlciAtIGEgSm9vbWxhISByZWR1eCBpbXBsZW1lbnRhdGlvblxuICovXG5cbi8qKlxuICogQWRkIGluIGEgcmVkdWNlciB0byB0aGUgZnJhbWV3b3JrXG4gKiBUaGlzIGZ1bmN0aW9uIGFsdGVycyB3aGlzcGVyJ3Mgc3RhdGVcbiAqIEBwYXJhbSB7Kn0gc3RhdGVcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGFjdGlvblxuICovXG52YXIgcmVkdWNlciA9IGZ1bmN0aW9uIChzdGF0ZSA9IHt0b2RvczogW119LCBhY3Rpb24pIHtcbiAgICBpZiAoIWFjdGlvbiB8fCAhYWN0aW9uLnR5cGUpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlO1xuICAgIH1cbiAgICBzd2l0Y2ggKGFjdGlvbi50eXBlKSB7XG5cbiAgICAgICAgY2FzZSAnQ09NX1RPRE8uQUREJzpcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHRvZG9zOiBbXG4gICAgICAgICAgICAgICAgLi4uc3RhdGUudG9kb3MsXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBhY3Rpb24udGV4dCxcbiAgICAgICAgICAgICAgICAgICAgY29tcGxldGVkOiBmYWxzZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgICBjYXNlICdDT01fVE9ETy5ET05FJzpcbiAgICAgICAgICAgIHJldHVybiBzdGF0ZVxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIHN0YXRlXG4gICAgfVxufVxuXG4vKipcbiAqIERpc3BhdGNoIGFuIGV2ZW50IHRvIHRoZSBkb2N1bWVudC5cbiAqIElmIHdoaXNwZXIgaXMgaW5zdGFsbGVkICYgcHVibGlzaGVkIHRoZW4gaXQgd2lsbCBwaWNrIHVwIHRoaXMgZXZlbnQsXG4gKiBhZGQgdGhlIHJlZHVjZXIgdG8gaXRzZWxmIGFuZCB0aGVuIGZpcmUgdGhlIG9uQWRkIGV2ZW50LlxuICovXG5kb2N1bWVudC5kaXNwYXRjaEV2ZW50KFxuICAgIGdldEV2ZW50KCd3aGlzcGVyLmFkZFJlZHVjZXInLCB7bmFtZTogJ2NvbV90b2RvJywgcmVkdWNlcjogcmVkdWNlcn0pXG4pO1xuXG5cbiJdfQ==
