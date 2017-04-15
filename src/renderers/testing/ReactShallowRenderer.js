/**
 * Copyright 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ReactShallowRenderer
 * @preventMunge
 */

'use strict';

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

const emptyFunction = require('fbjs/lib/emptyFunction');
const invariant = require('fbjs/lib/invariant');

const ShallowNodeMockComponent = ({children}) =>
  React.Children.toArray(children);

function createShallowNodeMock() {
  let isFirst = true;
  return function createNodeMock(element) {
    if (isFirst) {
      isFirst = false;
      return element.type;
    }
    return ShallowNodeMockComponent;
  };
}

// TODO Remove this wrapper if/when context parameter is removed
function wrapElementWithContextProvider(element, context) {
  const childContextTypes = Object.keys(context).reduce(
    (reduced, key) => {
      reduced[key] = emptyFunction;
      return reduced;
    },
    {},
  );

  class ShallowRendererWrapper extends React.Component {
    static __shallowRendererWrapperFlag = true;
    static childContextTypes = childContextTypes;
    getChildContext() {
      return context;
    }
    render() {
      return this.props.children;
    }
  }

  return React.createElement(ShallowRendererWrapper, null, element);
}

class ReactShallowRenderer {
  getMountedInstance() {
    return this._renderer ? this._renderer.getInstance() : null;
  }

  getRenderOutput() {
    if (this._renderer) {
      const tree = this._renderer.toTree();
      if (tree && tree.rendered) {
        // If we created a context-wrapper then skip over it.
        const element = tree.type.__shallowRendererWrapperFlag
          ? tree.rendered.rendered
          : tree.rendered;

        // Convert the rendered output to a ReactElement.
        // This supports .toEqual() comparison for test elements.
        return React.createElement(
          element.type,
          element.props,
          element.props.children,
        );
      }
    }
    return null;
  }

  // TODO We should probably remove support for the non-standard context parameter
  render(element, context) {
    invariant(
      React.isValidElement(element),
      'ReactShallowRenderer render(): Invalid component element.%s',
      typeof element === 'function'
        ? ' Instead of passing a component class, make sure to instantiate ' +
            'it by passing it to React.createElement.'
        : '',
    );
    invariant(
      typeof element.type !== 'string',
      'ReactShallowRenderer render(): Shallow rendering works only with custom ' +
        'components, not primitives (%s). Instead of calling `.render(el)` and ' +
        'inspecting the rendered output, look at `el.props` directly instead.',
      element.type,
    );

    // TODO Remove this wrapper if/when context parameter is removed
    if (context && Object.keys(context).length) {
      element = wrapElementWithContextProvider(element, context);
    }

    this._renderer = ReactTestRenderer.create(element, {
      createNodeMock: createShallowNodeMock(),
    });

    return this.getRenderOutput();
  }

  unmount() {
    this._renderer.unmount();
  }
}

// Backwards compatible API
ReactShallowRenderer.createRenderer = function() {
  return new ReactShallowRenderer();
};

module.exports = ReactShallowRenderer;
