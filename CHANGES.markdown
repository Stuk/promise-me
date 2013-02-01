v0.1.1
======

* Update escope to v0.0.13 which brings back support for script loading and
  require.js/AMD.

v0.1.0
======

* Known issue: this version will not work with script loading and
  require.js/AMD as the escope package doesn't have a suitable module
  definition. Once https://github.com/Constellation/escope/pull/10 is merged,
  it will resume working. To use promise-me in the browser until then please
  use [Mr](https://github.com/montagejs/mr).
* Update options object API of convert. See the readme for details.
* Allow custom matcher, replacer and flattener functions in the options
  object. See the readme for more details.
* Don't flatten `then()`s if either the resolutoin or rejection handler
  captures one or more variables from its parents.

v0.0.3
======

* Add support for AMD (Require.js) and script tag loading

v0.0.2
======

* Retain comments in generated code

v0.0.1
======

* Initial release
