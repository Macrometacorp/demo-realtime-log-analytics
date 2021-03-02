(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
(function (process){(function (){
// 'path' module extracted from Node.js v8.11.1 (only the posix part)
// transplited with Babel

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' + JSON.stringify(path));
  }
}

// Resolves . and .. elements in a path with directory names
function normalizeStringPosix(path, allowAboveRoot) {
  var res = '';
  var lastSegmentLength = 0;
  var lastSlash = -1;
  var dots = 0;
  var code;
  for (var i = 0; i <= path.length; ++i) {
    if (i < path.length)
      code = path.charCodeAt(i);
    else if (code === 47 /*/*/)
      break;
    else
      code = 47 /*/*/;
    if (code === 47 /*/*/) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== 46 /*.*/ || res.charCodeAt(res.length - 2) !== 46 /*.*/) {
          if (res.length > 2) {
            var lastSlashIndex = res.lastIndexOf('/');
            if (lastSlashIndex !== res.length - 1) {
              if (lastSlashIndex === -1) {
                res = '';
                lastSegmentLength = 0;
              } else {
                res = res.slice(0, lastSlashIndex);
                lastSegmentLength = res.length - 1 - res.lastIndexOf('/');
              }
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += '/..';
          else
            res = '..';
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0)
          res += '/' + path.slice(lastSlash + 1, i);
        else
          res = path.slice(lastSlash + 1, i);
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === 46 /*.*/ && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

function _format(sep, pathObject) {
  var dir = pathObject.dir || pathObject.root;
  var base = pathObject.base || (pathObject.name || '') + (pathObject.ext || '');
  if (!dir) {
    return base;
  }
  if (dir === pathObject.root) {
    return dir + base;
  }
  return dir + sep + base;
}

var posix = {
  // path.resolve([from ...], to)
  resolve: function resolve() {
    var resolvedPath = '';
    var resolvedAbsolute = false;
    var cwd;

    for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      var path;
      if (i >= 0)
        path = arguments[i];
      else {
        if (cwd === undefined)
          cwd = process.cwd();
        path = cwd;
      }

      assertPath(path);

      // Skip empty entries
      if (path.length === 0) {
        continue;
      }

      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charCodeAt(0) === 47 /*/*/;
    }

    // At this point the path should be resolved to a full absolute path, but
    // handle relative paths to be safe (might happen when process.cwd() fails)

    // Normalize the path
    resolvedPath = normalizeStringPosix(resolvedPath, !resolvedAbsolute);

    if (resolvedAbsolute) {
      if (resolvedPath.length > 0)
        return '/' + resolvedPath;
      else
        return '/';
    } else if (resolvedPath.length > 0) {
      return resolvedPath;
    } else {
      return '.';
    }
  },

  normalize: function normalize(path) {
    assertPath(path);

    if (path.length === 0) return '.';

    var isAbsolute = path.charCodeAt(0) === 47 /*/*/;
    var trailingSeparator = path.charCodeAt(path.length - 1) === 47 /*/*/;

    // Normalize the path
    path = normalizeStringPosix(path, !isAbsolute);

    if (path.length === 0 && !isAbsolute) path = '.';
    if (path.length > 0 && trailingSeparator) path += '/';

    if (isAbsolute) return '/' + path;
    return path;
  },

  isAbsolute: function isAbsolute(path) {
    assertPath(path);
    return path.length > 0 && path.charCodeAt(0) === 47 /*/*/;
  },

  join: function join() {
    if (arguments.length === 0)
      return '.';
    var joined;
    for (var i = 0; i < arguments.length; ++i) {
      var arg = arguments[i];
      assertPath(arg);
      if (arg.length > 0) {
        if (joined === undefined)
          joined = arg;
        else
          joined += '/' + arg;
      }
    }
    if (joined === undefined)
      return '.';
    return posix.normalize(joined);
  },

  relative: function relative(from, to) {
    assertPath(from);
    assertPath(to);

    if (from === to) return '';

    from = posix.resolve(from);
    to = posix.resolve(to);

    if (from === to) return '';

    // Trim any leading backslashes
    var fromStart = 1;
    for (; fromStart < from.length; ++fromStart) {
      if (from.charCodeAt(fromStart) !== 47 /*/*/)
        break;
    }
    var fromEnd = from.length;
    var fromLen = fromEnd - fromStart;

    // Trim any leading backslashes
    var toStart = 1;
    for (; toStart < to.length; ++toStart) {
      if (to.charCodeAt(toStart) !== 47 /*/*/)
        break;
    }
    var toEnd = to.length;
    var toLen = toEnd - toStart;

    // Compare paths to find the longest common path from root
    var length = fromLen < toLen ? fromLen : toLen;
    var lastCommonSep = -1;
    var i = 0;
    for (; i <= length; ++i) {
      if (i === length) {
        if (toLen > length) {
          if (to.charCodeAt(toStart + i) === 47 /*/*/) {
            // We get here if `from` is the exact base path for `to`.
            // For example: from='/foo/bar'; to='/foo/bar/baz'
            return to.slice(toStart + i + 1);
          } else if (i === 0) {
            // We get here if `from` is the root
            // For example: from='/'; to='/foo'
            return to.slice(toStart + i);
          }
        } else if (fromLen > length) {
          if (from.charCodeAt(fromStart + i) === 47 /*/*/) {
            // We get here if `to` is the exact base path for `from`.
            // For example: from='/foo/bar/baz'; to='/foo/bar'
            lastCommonSep = i;
          } else if (i === 0) {
            // We get here if `to` is the root.
            // For example: from='/foo'; to='/'
            lastCommonSep = 0;
          }
        }
        break;
      }
      var fromCode = from.charCodeAt(fromStart + i);
      var toCode = to.charCodeAt(toStart + i);
      if (fromCode !== toCode)
        break;
      else if (fromCode === 47 /*/*/)
        lastCommonSep = i;
    }

    var out = '';
    // Generate the relative path based on the path difference between `to`
    // and `from`
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === 47 /*/*/) {
        if (out.length === 0)
          out += '..';
        else
          out += '/..';
      }
    }

    // Lastly, append the rest of the destination (`to`) path that comes after
    // the common path parts
    if (out.length > 0)
      return out + to.slice(toStart + lastCommonSep);
    else {
      toStart += lastCommonSep;
      if (to.charCodeAt(toStart) === 47 /*/*/)
        ++toStart;
      return to.slice(toStart);
    }
  },

  _makeLong: function _makeLong(path) {
    return path;
  },

  dirname: function dirname(path) {
    assertPath(path);
    if (path.length === 0) return '.';
    var code = path.charCodeAt(0);
    var hasRoot = code === 47 /*/*/;
    var end = -1;
    var matchedSlash = true;
    for (var i = path.length - 1; i >= 1; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          if (!matchedSlash) {
            end = i;
            break;
          }
        } else {
        // We saw the first non-path separator
        matchedSlash = false;
      }
    }

    if (end === -1) return hasRoot ? '/' : '.';
    if (hasRoot && end === 1) return '//';
    return path.slice(0, end);
  },

  basename: function basename(path, ext) {
    if (ext !== undefined && typeof ext !== 'string') throw new TypeError('"ext" argument must be a string');
    assertPath(path);

    var start = 0;
    var end = -1;
    var matchedSlash = true;
    var i;

    if (ext !== undefined && ext.length > 0 && ext.length <= path.length) {
      if (ext.length === path.length && ext === path) return '';
      var extIdx = ext.length - 1;
      var firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        var code = path.charCodeAt(i);
        if (code === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else {
          if (firstNonSlashEnd === -1) {
            // We saw the first non-path separator, remember this index in case
            // we need it if the extension ends up not matching
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            // Try to match the explicit extension
            if (code === ext.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                // We matched the extension, so mark this as the end of our path
                // component
                end = i;
              }
            } else {
              // Extension does not match, so our result is the entire path
              // component
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }

      if (start === end) end = firstNonSlashEnd;else if (end === -1) end = path.length;
      return path.slice(start, end);
    } else {
      for (i = path.length - 1; i >= 0; --i) {
        if (path.charCodeAt(i) === 47 /*/*/) {
            // If we reached a path separator that was not part of a set of path
            // separators at the end of the string, stop now
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
          // We saw the first non-path separator, mark this as the end of our
          // path component
          matchedSlash = false;
          end = i + 1;
        }
      }

      if (end === -1) return '';
      return path.slice(start, end);
    }
  },

  extname: function extname(path) {
    assertPath(path);
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;
    for (var i = path.length - 1; i >= 0; --i) {
      var code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1)
            startDot = i;
          else if (preDotState !== 1)
            preDotState = 1;
      } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
        // We saw a non-dot character immediately before the dot
        preDotState === 0 ||
        // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return '';
    }
    return path.slice(startDot, end);
  },

  format: function format(pathObject) {
    if (pathObject === null || typeof pathObject !== 'object') {
      throw new TypeError('The "pathObject" argument must be of type Object. Received type ' + typeof pathObject);
    }
    return _format('/', pathObject);
  },

  parse: function parse(path) {
    assertPath(path);

    var ret = { root: '', dir: '', base: '', ext: '', name: '' };
    if (path.length === 0) return ret;
    var code = path.charCodeAt(0);
    var isAbsolute = code === 47 /*/*/;
    var start;
    if (isAbsolute) {
      ret.root = '/';
      start = 1;
    } else {
      start = 0;
    }
    var startDot = -1;
    var startPart = 0;
    var end = -1;
    var matchedSlash = true;
    var i = path.length - 1;

    // Track the state of characters (if any) we see before our first dot and
    // after any path separator we find
    var preDotState = 0;

    // Get non-dir info
    for (; i >= start; --i) {
      code = path.charCodeAt(i);
      if (code === 47 /*/*/) {
          // If we reached a path separator that was not part of a set of path
          // separators at the end of the string, stop now
          if (!matchedSlash) {
            startPart = i + 1;
            break;
          }
          continue;
        }
      if (end === -1) {
        // We saw the first non-path separator, mark this as the end of our
        // extension
        matchedSlash = false;
        end = i + 1;
      }
      if (code === 46 /*.*/) {
          // If this is our first dot, mark it as the start of our extension
          if (startDot === -1) startDot = i;else if (preDotState !== 1) preDotState = 1;
        } else if (startDot !== -1) {
        // We saw a non-dot and non-path separator before our dot, so we should
        // have a good chance at having a non-empty extension
        preDotState = -1;
      }
    }

    if (startDot === -1 || end === -1 ||
    // We saw a non-dot character immediately before the dot
    preDotState === 0 ||
    // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      if (end !== -1) {
        if (startPart === 0 && isAbsolute) ret.base = ret.name = path.slice(1, end);else ret.base = ret.name = path.slice(startPart, end);
      }
    } else {
      if (startPart === 0 && isAbsolute) {
        ret.name = path.slice(1, startDot);
        ret.base = path.slice(1, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
      }
      ret.ext = path.slice(startDot, end);
    }

    if (startPart > 0) ret.dir = path.slice(0, startPart - 1);else if (isAbsolute) ret.dir = '/';

    return ret;
  },

  sep: '/',
  delimiter: ':',
  win32: null,
  posix: null
};

posix.posix = posix;

module.exports = posix;

}).call(this)}).call(this,require('_process'))
},{"_process":5}],5:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
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
    var timeout = runTimeout(cleanUpNextTick);
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
    runClearTimeout(timeout);
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
        runTimeout(drainQueue);
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
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],6:[function(require,module,exports){
(function (global){(function (){
/*! https://mths.be/punycode v1.4.1 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw new RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.4.1',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) {
			// in Node.js, io.js, or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else {
			// in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else {
		// in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],7:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],8:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],9:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":7,"./encode":8}],10:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var punycode = require('punycode');
var util = require('./util');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // Special case for a simple path URL
    simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && util.isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!util.isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  // Copy chrome, IE, opera backslash-handling behavior.
  // Back slashes before the query string get converted to forward slashes
  // See: https://code.google.com/p/chromium/issues/detail?id=25916
  var queryIndex = url.indexOf('?'),
      splitter =
          (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
      uSplit = url.split(splitter),
      slashRegex = /\\/g;
  uSplit[0] = uSplit[0].replace(slashRegex, '/');
  url = uSplit.join(splitter);

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  if (!slashesDenoteHost && url.split('#').length === 1) {
    // Try fast path regexp
    var simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.path = rest;
      this.href = rest;
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
        if (parseQueryString) {
          this.query = querystring.parse(this.search.substr(1));
        } else {
          this.query = this.search.substr(1);
        }
      } else if (parseQueryString) {
        this.search = '';
        this.query = {};
      }
      return this;
    }
  }

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a punycoded representation of "domain".
      // It only converts parts of the domain name that
      // have non-ASCII characters, i.e. it doesn't matter if
      // you call it with a domain that already is ASCII-only.
      this.hostname = punycode.toASCII(this.hostname);
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      if (rest.indexOf(ae) === -1)
        continue;
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (util.isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      util.isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (util.isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  var tkeys = Object.keys(this);
  for (var tk = 0; tk < tkeys.length; tk++) {
    var tkey = tkeys[tk];
    result[tkey] = this[tkey];
  }

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    var rkeys = Object.keys(relative);
    for (var rk = 0; rk < rkeys.length; rk++) {
      var rkey = rkeys[rk];
      if (rkey !== 'protocol')
        result[rkey] = relative[rkey];
    }

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      var keys = Object.keys(relative);
      for (var v = 0; v < keys.length; v++) {
        var k = keys[v];
        result[k] = relative[k];
      }
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!util.isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especially happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host || srcPath.length > 1) &&
      (last === '.' || last === '..') || last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last === '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especially happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

},{"./util":11,"punycode":6,"querystring":9}],11:[function(require,module,exports){
'use strict';

module.exports = {
  isString: function(arg) {
    return typeof(arg) === 'string';
  },
  isObject: function(arg) {
    return typeof(arg) === 'object' && arg !== null;
  },
  isNull: function(arg) {
    return arg === null;
  },
  isNullOrUndefined: function(arg) {
    return arg == null;
  }
};

},{}],12:[function(require,module,exports){
module.exports=function(t){var e={};function r(n){if(e[n])return e[n].exports;var i=e[n]={i:n,l:!1,exports:{}};return t[n].call(i.exports,i,i.exports,r),i.l=!0,i.exports}return r.m=t,r.c=e,r.d=function(t,e,n){r.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:n})},r.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},r.t=function(t,e){if(1&e&&(t=r(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var n=Object.create(null);if(r.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var i in t)r.d(n,i,function(e){return t[e]}.bind(null,i));return n},r.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return r.d(e,"a",e),e},r.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},r.p="",r(r.s=32)}([function(t,e){var r;r=function(){return this}();try{r=r||Function("return this")()||(0,eval)("this")}catch(t){"object"==typeof window&&(r=window)}t.exports=r},function(t,e,r){"use strict";var n=r(6),i=Object.keys||function(t){var e=[];for(var r in t)e.push(r);return e};t.exports=f;var o=r(5);o.inherits=r(2);var s=r(23),a=r(14);o.inherits(f,s);for(var u=i(a.prototype),c=0;c<u.length;c++){var l=u[c];f.prototype[l]||(f.prototype[l]=a.prototype[l])}function f(t){if(!(this instanceof f))return new f(t);s.call(this,t),a.call(this,t),t&&!1===t.readable&&(this.readable=!1),t&&!1===t.writable&&(this.writable=!1),this.allowHalfOpen=!0,t&&!1===t.allowHalfOpen&&(this.allowHalfOpen=!1),this.once("end",h)}function h(){this.allowHalfOpen||this._writableState.ended||n.nextTick(p,this)}function p(t){t.end()}Object.defineProperty(f.prototype,"writableHighWaterMark",{enumerable:!1,get:function(){return this._writableState.highWaterMark}}),Object.defineProperty(f.prototype,"destroyed",{get:function(){return void 0!==this._readableState&&void 0!==this._writableState&&this._readableState.destroyed&&this._writableState.destroyed},set:function(t){void 0!==this._readableState&&void 0!==this._writableState&&(this._readableState.destroyed=t,this._writableState.destroyed=t)}}),f.prototype._destroy=function(t,e){this.push(null),this.end(),n.nextTick(e,t)}},function(t,e){"function"==typeof Object.create?t.exports=function(t,e){t.super_=e,t.prototype=Object.create(e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}})}:t.exports=function(t,e){t.super_=e;var r=function(){};r.prototype=e.prototype,t.prototype=new r,t.prototype.constructor=t}},function(t,e,r){"use strict";(function(t){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
var n=r(38),i=r(39),o=r(40);function s(){return u.TYPED_ARRAY_SUPPORT?2147483647:1073741823}function a(t,e){if(s()<e)throw new RangeError("Invalid typed array length");return u.TYPED_ARRAY_SUPPORT?(t=new Uint8Array(e)).__proto__=u.prototype:(null===t&&(t=new u(e)),t.length=e),t}function u(t,e,r){if(!(u.TYPED_ARRAY_SUPPORT||this instanceof u))return new u(t,e,r);if("number"==typeof t){if("string"==typeof e)throw new Error("If encoding is specified then the first argument must be a string");return f(this,t)}return c(this,t,e,r)}function c(t,e,r,n){if("number"==typeof e)throw new TypeError('"value" argument must not be a number');return"undefined"!=typeof ArrayBuffer&&e instanceof ArrayBuffer?function(t,e,r,n){if(e.byteLength,r<0||e.byteLength<r)throw new RangeError("'offset' is out of bounds");if(e.byteLength<r+(n||0))throw new RangeError("'length' is out of bounds");return e=void 0===r&&void 0===n?new Uint8Array(e):void 0===n?new Uint8Array(e,r):new Uint8Array(e,r,n),u.TYPED_ARRAY_SUPPORT?(t=e).__proto__=u.prototype:t=h(t,e),t}(t,e,r,n):"string"==typeof e?function(t,e,r){if("string"==typeof r&&""!==r||(r="utf8"),!u.isEncoding(r))throw new TypeError('"encoding" must be a valid string encoding');var n=0|d(e,r),i=(t=a(t,n)).write(e,r);return i!==n&&(t=t.slice(0,i)),t}(t,e,r):function(t,e){if(u.isBuffer(e)){var r=0|p(e.length);return 0===(t=a(t,r)).length?t:(e.copy(t,0,0,r),t)}if(e){if("undefined"!=typeof ArrayBuffer&&e.buffer instanceof ArrayBuffer||"length"in e)return"number"!=typeof e.length||function(t){return t!=t}(e.length)?a(t,0):h(t,e);if("Buffer"===e.type&&o(e.data))return h(t,e.data)}throw new TypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.")}(t,e)}function l(t){if("number"!=typeof t)throw new TypeError('"size" argument must be a number');if(t<0)throw new RangeError('"size" argument must not be negative')}function f(t,e){if(l(e),t=a(t,e<0?0:0|p(e)),!u.TYPED_ARRAY_SUPPORT)for(var r=0;r<e;++r)t[r]=0;return t}function h(t,e){var r=e.length<0?0:0|p(e.length);t=a(t,r);for(var n=0;n<r;n+=1)t[n]=255&e[n];return t}function p(t){if(t>=s())throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x"+s().toString(16)+" bytes");return 0|t}function d(t,e){if(u.isBuffer(t))return t.length;if("undefined"!=typeof ArrayBuffer&&"function"==typeof ArrayBuffer.isView&&(ArrayBuffer.isView(t)||t instanceof ArrayBuffer))return t.byteLength;"string"!=typeof t&&(t=""+t);var r=t.length;if(0===r)return 0;for(var n=!1;;)switch(e){case"ascii":case"latin1":case"binary":return r;case"utf8":case"utf-8":case void 0:return N(t).length;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return 2*r;case"hex":return r>>>1;case"base64":return H(t).length;default:if(n)return N(t).length;e=(""+e).toLowerCase(),n=!0}}function _(t,e,r){var n=t[e];t[e]=t[r],t[r]=n}function v(t,e,r,n,i){if(0===t.length)return-1;if("string"==typeof r?(n=r,r=0):r>2147483647?r=2147483647:r<-2147483648&&(r=-2147483648),r=+r,isNaN(r)&&(r=i?0:t.length-1),r<0&&(r=t.length+r),r>=t.length){if(i)return-1;r=t.length-1}else if(r<0){if(!i)return-1;r=0}if("string"==typeof e&&(e=u.from(e,n)),u.isBuffer(e))return 0===e.length?-1:y(t,e,r,n,i);if("number"==typeof e)return e&=255,u.TYPED_ARRAY_SUPPORT&&"function"==typeof Uint8Array.prototype.indexOf?i?Uint8Array.prototype.indexOf.call(t,e,r):Uint8Array.prototype.lastIndexOf.call(t,e,r):y(t,[e],r,n,i);throw new TypeError("val must be string, number or Buffer")}function y(t,e,r,n,i){var o,s=1,a=t.length,u=e.length;if(void 0!==n&&("ucs2"===(n=String(n).toLowerCase())||"ucs-2"===n||"utf16le"===n||"utf-16le"===n)){if(t.length<2||e.length<2)return-1;s=2,a/=2,u/=2,r/=2}function c(t,e){return 1===s?t[e]:t.readUInt16BE(e*s)}if(i){var l=-1;for(o=r;o<a;o++)if(c(t,o)===c(e,-1===l?0:o-l)){if(-1===l&&(l=o),o-l+1===u)return l*s}else-1!==l&&(o-=o-l),l=-1}else for(r+u>a&&(r=a-u),o=r;o>=0;o--){for(var f=!0,h=0;h<u;h++)if(c(t,o+h)!==c(e,h)){f=!1;break}if(f)return o}return-1}function m(t,e,r,n){r=Number(r)||0;var i=t.length-r;n?(n=Number(n))>i&&(n=i):n=i;var o=e.length;if(o%2!=0)throw new TypeError("Invalid hex string");n>o/2&&(n=o/2);for(var s=0;s<n;++s){var a=parseInt(e.substr(2*s,2),16);if(isNaN(a))return s;t[r+s]=a}return s}function g(t,e,r,n){return V(N(e,t.length-r),t,r,n)}function b(t,e,r,n){return V(function(t){for(var e=[],r=0;r<t.length;++r)e.push(255&t.charCodeAt(r));return e}(e),t,r,n)}function w(t,e,r,n){return b(t,e,r,n)}function E(t,e,r,n){return V(H(e),t,r,n)}function C(t,e,r,n){return V(function(t,e){for(var r,n,i,o=[],s=0;s<t.length&&!((e-=2)<0);++s)n=(r=t.charCodeAt(s))>>8,i=r%256,o.push(i),o.push(n);return o}(e,t.length-r),t,r,n)}function x(t,e,r){return 0===e&&r===t.length?n.fromByteArray(t):n.fromByteArray(t.slice(e,r))}function j(t,e,r){r=Math.min(t.length,r);for(var n=[],i=e;i<r;){var o,s,a,u,c=t[i],l=null,f=c>239?4:c>223?3:c>191?2:1;if(i+f<=r)switch(f){case 1:c<128&&(l=c);break;case 2:128==(192&(o=t[i+1]))&&(u=(31&c)<<6|63&o)>127&&(l=u);break;case 3:o=t[i+1],s=t[i+2],128==(192&o)&&128==(192&s)&&(u=(15&c)<<12|(63&o)<<6|63&s)>2047&&(u<55296||u>57343)&&(l=u);break;case 4:o=t[i+1],s=t[i+2],a=t[i+3],128==(192&o)&&128==(192&s)&&128==(192&a)&&(u=(15&c)<<18|(63&o)<<12|(63&s)<<6|63&a)>65535&&u<1114112&&(l=u)}null===l?(l=65533,f=1):l>65535&&(l-=65536,n.push(l>>>10&1023|55296),l=56320|1023&l),n.push(l),i+=f}return function(t){var e=t.length;if(e<=S)return String.fromCharCode.apply(String,t);for(var r="",n=0;n<e;)r+=String.fromCharCode.apply(String,t.slice(n,n+=S));return r}(n)}e.Buffer=u,e.SlowBuffer=function(t){return+t!=t&&(t=0),u.alloc(+t)},e.INSPECT_MAX_BYTES=50,u.TYPED_ARRAY_SUPPORT=void 0!==t.TYPED_ARRAY_SUPPORT?t.TYPED_ARRAY_SUPPORT:function(){try{var t=new Uint8Array(1);return t.__proto__={__proto__:Uint8Array.prototype,foo:function(){return 42}},42===t.foo()&&"function"==typeof t.subarray&&0===t.subarray(1,1).byteLength}catch(t){return!1}}(),e.kMaxLength=s(),u.poolSize=8192,u._augment=function(t){return t.__proto__=u.prototype,t},u.from=function(t,e,r){return c(null,t,e,r)},u.TYPED_ARRAY_SUPPORT&&(u.prototype.__proto__=Uint8Array.prototype,u.__proto__=Uint8Array,"undefined"!=typeof Symbol&&Symbol.species&&u[Symbol.species]===u&&Object.defineProperty(u,Symbol.species,{value:null,configurable:!0})),u.alloc=function(t,e,r){return function(t,e,r,n){return l(e),e<=0?a(t,e):void 0!==r?"string"==typeof n?a(t,e).fill(r,n):a(t,e).fill(r):a(t,e)}(null,t,e,r)},u.allocUnsafe=function(t){return f(null,t)},u.allocUnsafeSlow=function(t){return f(null,t)},u.isBuffer=function(t){return!(null==t||!t._isBuffer)},u.compare=function(t,e){if(!u.isBuffer(t)||!u.isBuffer(e))throw new TypeError("Arguments must be Buffers");if(t===e)return 0;for(var r=t.length,n=e.length,i=0,o=Math.min(r,n);i<o;++i)if(t[i]!==e[i]){r=t[i],n=e[i];break}return r<n?-1:n<r?1:0},u.isEncoding=function(t){switch(String(t).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"latin1":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return!0;default:return!1}},u.concat=function(t,e){if(!o(t))throw new TypeError('"list" argument must be an Array of Buffers');if(0===t.length)return u.alloc(0);var r;if(void 0===e)for(e=0,r=0;r<t.length;++r)e+=t[r].length;var n=u.allocUnsafe(e),i=0;for(r=0;r<t.length;++r){var s=t[r];if(!u.isBuffer(s))throw new TypeError('"list" argument must be an Array of Buffers');s.copy(n,i),i+=s.length}return n},u.byteLength=d,u.prototype._isBuffer=!0,u.prototype.swap16=function(){var t=this.length;if(t%2!=0)throw new RangeError("Buffer size must be a multiple of 16-bits");for(var e=0;e<t;e+=2)_(this,e,e+1);return this},u.prototype.swap32=function(){var t=this.length;if(t%4!=0)throw new RangeError("Buffer size must be a multiple of 32-bits");for(var e=0;e<t;e+=4)_(this,e,e+3),_(this,e+1,e+2);return this},u.prototype.swap64=function(){var t=this.length;if(t%8!=0)throw new RangeError("Buffer size must be a multiple of 64-bits");for(var e=0;e<t;e+=8)_(this,e,e+7),_(this,e+1,e+6),_(this,e+2,e+5),_(this,e+3,e+4);return this},u.prototype.toString=function(){var t=0|this.length;return 0===t?"":0===arguments.length?j(this,0,t):function(t,e,r){var n=!1;if((void 0===e||e<0)&&(e=0),e>this.length)return"";if((void 0===r||r>this.length)&&(r=this.length),r<=0)return"";if((r>>>=0)<=(e>>>=0))return"";for(t||(t="utf8");;)switch(t){case"hex":return T(this,e,r);case"utf8":case"utf-8":return j(this,e,r);case"ascii":return R(this,e,r);case"latin1":case"binary":return k(this,e,r);case"base64":return x(this,e,r);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return P(this,e,r);default:if(n)throw new TypeError("Unknown encoding: "+t);t=(t+"").toLowerCase(),n=!0}}.apply(this,arguments)},u.prototype.equals=function(t){if(!u.isBuffer(t))throw new TypeError("Argument must be a Buffer");return this===t||0===u.compare(this,t)},u.prototype.inspect=function(){var t="",r=e.INSPECT_MAX_BYTES;return this.length>0&&(t=this.toString("hex",0,r).match(/.{2}/g).join(" "),this.length>r&&(t+=" ... ")),"<Buffer "+t+">"},u.prototype.compare=function(t,e,r,n,i){if(!u.isBuffer(t))throw new TypeError("Argument must be a Buffer");if(void 0===e&&(e=0),void 0===r&&(r=t?t.length:0),void 0===n&&(n=0),void 0===i&&(i=this.length),e<0||r>t.length||n<0||i>this.length)throw new RangeError("out of range index");if(n>=i&&e>=r)return 0;if(n>=i)return-1;if(e>=r)return 1;if(e>>>=0,r>>>=0,n>>>=0,i>>>=0,this===t)return 0;for(var o=i-n,s=r-e,a=Math.min(o,s),c=this.slice(n,i),l=t.slice(e,r),f=0;f<a;++f)if(c[f]!==l[f]){o=c[f],s=l[f];break}return o<s?-1:s<o?1:0},u.prototype.includes=function(t,e,r){return-1!==this.indexOf(t,e,r)},u.prototype.indexOf=function(t,e,r){return v(this,t,e,r,!0)},u.prototype.lastIndexOf=function(t,e,r){return v(this,t,e,r,!1)},u.prototype.write=function(t,e,r,n){if(void 0===e)n="utf8",r=this.length,e=0;else if(void 0===r&&"string"==typeof e)n=e,r=this.length,e=0;else{if(!isFinite(e))throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");e|=0,isFinite(r)?(r|=0,void 0===n&&(n="utf8")):(n=r,r=void 0)}var i=this.length-e;if((void 0===r||r>i)&&(r=i),t.length>0&&(r<0||e<0)||e>this.length)throw new RangeError("Attempt to write outside buffer bounds");n||(n="utf8");for(var o=!1;;)switch(n){case"hex":return m(this,t,e,r);case"utf8":case"utf-8":return g(this,t,e,r);case"ascii":return b(this,t,e,r);case"latin1":case"binary":return w(this,t,e,r);case"base64":return E(this,t,e,r);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return C(this,t,e,r);default:if(o)throw new TypeError("Unknown encoding: "+n);n=(""+n).toLowerCase(),o=!0}},u.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}};var S=4096;function R(t,e,r){var n="";r=Math.min(t.length,r);for(var i=e;i<r;++i)n+=String.fromCharCode(127&t[i]);return n}function k(t,e,r){var n="";r=Math.min(t.length,r);for(var i=e;i<r;++i)n+=String.fromCharCode(t[i]);return n}function T(t,e,r){var n=t.length;(!e||e<0)&&(e=0),(!r||r<0||r>n)&&(r=n);for(var i="",o=e;o<r;++o)i+=U(t[o]);return i}function P(t,e,r){for(var n=t.slice(e,r),i="",o=0;o<n.length;o+=2)i+=String.fromCharCode(n[o]+256*n[o+1]);return i}function O(t,e,r){if(t%1!=0||t<0)throw new RangeError("offset is not uint");if(t+e>r)throw new RangeError("Trying to access beyond buffer length")}function A(t,e,r,n,i,o){if(!u.isBuffer(t))throw new TypeError('"buffer" argument must be a Buffer instance');if(e>i||e<o)throw new RangeError('"value" argument is out of bounds');if(r+n>t.length)throw new RangeError("Index out of range")}function F(t,e,r,n){e<0&&(e=65535+e+1);for(var i=0,o=Math.min(t.length-r,2);i<o;++i)t[r+i]=(e&255<<8*(n?i:1-i))>>>8*(n?i:1-i)}function L(t,e,r,n){e<0&&(e=4294967295+e+1);for(var i=0,o=Math.min(t.length-r,4);i<o;++i)t[r+i]=e>>>8*(n?i:3-i)&255}function M(t,e,r,n,i,o){if(r+n>t.length)throw new RangeError("Index out of range");if(r<0)throw new RangeError("Index out of range")}function B(t,e,r,n,o){return o||M(t,0,r,4),i.write(t,e,r,n,23,4),r+4}function D(t,e,r,n,o){return o||M(t,0,r,8),i.write(t,e,r,n,52,8),r+8}u.prototype.slice=function(t,e){var r,n=this.length;if(t=~~t,e=void 0===e?n:~~e,t<0?(t+=n)<0&&(t=0):t>n&&(t=n),e<0?(e+=n)<0&&(e=0):e>n&&(e=n),e<t&&(e=t),u.TYPED_ARRAY_SUPPORT)(r=this.subarray(t,e)).__proto__=u.prototype;else{var i=e-t;r=new u(i,void 0);for(var o=0;o<i;++o)r[o]=this[o+t]}return r},u.prototype.readUIntLE=function(t,e,r){t|=0,e|=0,r||O(t,e,this.length);for(var n=this[t],i=1,o=0;++o<e&&(i*=256);)n+=this[t+o]*i;return n},u.prototype.readUIntBE=function(t,e,r){t|=0,e|=0,r||O(t,e,this.length);for(var n=this[t+--e],i=1;e>0&&(i*=256);)n+=this[t+--e]*i;return n},u.prototype.readUInt8=function(t,e){return e||O(t,1,this.length),this[t]},u.prototype.readUInt16LE=function(t,e){return e||O(t,2,this.length),this[t]|this[t+1]<<8},u.prototype.readUInt16BE=function(t,e){return e||O(t,2,this.length),this[t]<<8|this[t+1]},u.prototype.readUInt32LE=function(t,e){return e||O(t,4,this.length),(this[t]|this[t+1]<<8|this[t+2]<<16)+16777216*this[t+3]},u.prototype.readUInt32BE=function(t,e){return e||O(t,4,this.length),16777216*this[t]+(this[t+1]<<16|this[t+2]<<8|this[t+3])},u.prototype.readIntLE=function(t,e,r){t|=0,e|=0,r||O(t,e,this.length);for(var n=this[t],i=1,o=0;++o<e&&(i*=256);)n+=this[t+o]*i;return n>=(i*=128)&&(n-=Math.pow(2,8*e)),n},u.prototype.readIntBE=function(t,e,r){t|=0,e|=0,r||O(t,e,this.length);for(var n=e,i=1,o=this[t+--n];n>0&&(i*=256);)o+=this[t+--n]*i;return o>=(i*=128)&&(o-=Math.pow(2,8*e)),o},u.prototype.readInt8=function(t,e){return e||O(t,1,this.length),128&this[t]?-1*(255-this[t]+1):this[t]},u.prototype.readInt16LE=function(t,e){e||O(t,2,this.length);var r=this[t]|this[t+1]<<8;return 32768&r?4294901760|r:r},u.prototype.readInt16BE=function(t,e){e||O(t,2,this.length);var r=this[t+1]|this[t]<<8;return 32768&r?4294901760|r:r},u.prototype.readInt32LE=function(t,e){return e||O(t,4,this.length),this[t]|this[t+1]<<8|this[t+2]<<16|this[t+3]<<24},u.prototype.readInt32BE=function(t,e){return e||O(t,4,this.length),this[t]<<24|this[t+1]<<16|this[t+2]<<8|this[t+3]},u.prototype.readFloatLE=function(t,e){return e||O(t,4,this.length),i.read(this,t,!0,23,4)},u.prototype.readFloatBE=function(t,e){return e||O(t,4,this.length),i.read(this,t,!1,23,4)},u.prototype.readDoubleLE=function(t,e){return e||O(t,8,this.length),i.read(this,t,!0,52,8)},u.prototype.readDoubleBE=function(t,e){return e||O(t,8,this.length),i.read(this,t,!1,52,8)},u.prototype.writeUIntLE=function(t,e,r,n){t=+t,e|=0,r|=0,n||A(this,t,e,r,Math.pow(2,8*r)-1,0);var i=1,o=0;for(this[e]=255&t;++o<r&&(i*=256);)this[e+o]=t/i&255;return e+r},u.prototype.writeUIntBE=function(t,e,r,n){t=+t,e|=0,r|=0,n||A(this,t,e,r,Math.pow(2,8*r)-1,0);var i=r-1,o=1;for(this[e+i]=255&t;--i>=0&&(o*=256);)this[e+i]=t/o&255;return e+r},u.prototype.writeUInt8=function(t,e,r){return t=+t,e|=0,r||A(this,t,e,1,255,0),u.TYPED_ARRAY_SUPPORT||(t=Math.floor(t)),this[e]=255&t,e+1},u.prototype.writeUInt16LE=function(t,e,r){return t=+t,e|=0,r||A(this,t,e,2,65535,0),u.TYPED_ARRAY_SUPPORT?(this[e]=255&t,this[e+1]=t>>>8):F(this,t,e,!0),e+2},u.prototype.writeUInt16BE=function(t,e,r){return t=+t,e|=0,r||A(this,t,e,2,65535,0),u.TYPED_ARRAY_SUPPORT?(this[e]=t>>>8,this[e+1]=255&t):F(this,t,e,!1),e+2},u.prototype.writeUInt32LE=function(t,e,r){return t=+t,e|=0,r||A(this,t,e,4,4294967295,0),u.TYPED_ARRAY_SUPPORT?(this[e+3]=t>>>24,this[e+2]=t>>>16,this[e+1]=t>>>8,this[e]=255&t):L(this,t,e,!0),e+4},u.prototype.writeUInt32BE=function(t,e,r){return t=+t,e|=0,r||A(this,t,e,4,4294967295,0),u.TYPED_ARRAY_SUPPORT?(this[e]=t>>>24,this[e+1]=t>>>16,this[e+2]=t>>>8,this[e+3]=255&t):L(this,t,e,!1),e+4},u.prototype.writeIntLE=function(t,e,r,n){if(t=+t,e|=0,!n){var i=Math.pow(2,8*r-1);A(this,t,e,r,i-1,-i)}var o=0,s=1,a=0;for(this[e]=255&t;++o<r&&(s*=256);)t<0&&0===a&&0!==this[e+o-1]&&(a=1),this[e+o]=(t/s>>0)-a&255;return e+r},u.prototype.writeIntBE=function(t,e,r,n){if(t=+t,e|=0,!n){var i=Math.pow(2,8*r-1);A(this,t,e,r,i-1,-i)}var o=r-1,s=1,a=0;for(this[e+o]=255&t;--o>=0&&(s*=256);)t<0&&0===a&&0!==this[e+o+1]&&(a=1),this[e+o]=(t/s>>0)-a&255;return e+r},u.prototype.writeInt8=function(t,e,r){return t=+t,e|=0,r||A(this,t,e,1,127,-128),u.TYPED_ARRAY_SUPPORT||(t=Math.floor(t)),t<0&&(t=255+t+1),this[e]=255&t,e+1},u.prototype.writeInt16LE=function(t,e,r){return t=+t,e|=0,r||A(this,t,e,2,32767,-32768),u.TYPED_ARRAY_SUPPORT?(this[e]=255&t,this[e+1]=t>>>8):F(this,t,e,!0),e+2},u.prototype.writeInt16BE=function(t,e,r){return t=+t,e|=0,r||A(this,t,e,2,32767,-32768),u.TYPED_ARRAY_SUPPORT?(this[e]=t>>>8,this[e+1]=255&t):F(this,t,e,!1),e+2},u.prototype.writeInt32LE=function(t,e,r){return t=+t,e|=0,r||A(this,t,e,4,2147483647,-2147483648),u.TYPED_ARRAY_SUPPORT?(this[e]=255&t,this[e+1]=t>>>8,this[e+2]=t>>>16,this[e+3]=t>>>24):L(this,t,e,!0),e+4},u.prototype.writeInt32BE=function(t,e,r){return t=+t,e|=0,r||A(this,t,e,4,2147483647,-2147483648),t<0&&(t=4294967295+t+1),u.TYPED_ARRAY_SUPPORT?(this[e]=t>>>24,this[e+1]=t>>>16,this[e+2]=t>>>8,this[e+3]=255&t):L(this,t,e,!1),e+4},u.prototype.writeFloatLE=function(t,e,r){return B(this,t,e,!0,r)},u.prototype.writeFloatBE=function(t,e,r){return B(this,t,e,!1,r)},u.prototype.writeDoubleLE=function(t,e,r){return D(this,t,e,!0,r)},u.prototype.writeDoubleBE=function(t,e,r){return D(this,t,e,!1,r)},u.prototype.copy=function(t,e,r,n){if(r||(r=0),n||0===n||(n=this.length),e>=t.length&&(e=t.length),e||(e=0),n>0&&n<r&&(n=r),n===r)return 0;if(0===t.length||0===this.length)return 0;if(e<0)throw new RangeError("targetStart out of bounds");if(r<0||r>=this.length)throw new RangeError("sourceStart out of bounds");if(n<0)throw new RangeError("sourceEnd out of bounds");n>this.length&&(n=this.length),t.length-e<n-r&&(n=t.length-e+r);var i,o=n-r;if(this===t&&r<e&&e<n)for(i=o-1;i>=0;--i)t[i+e]=this[i+r];else if(o<1e3||!u.TYPED_ARRAY_SUPPORT)for(i=0;i<o;++i)t[i+e]=this[i+r];else Uint8Array.prototype.set.call(t,this.subarray(r,r+o),e);return o},u.prototype.fill=function(t,e,r,n){if("string"==typeof t){if("string"==typeof e?(n=e,e=0,r=this.length):"string"==typeof r&&(n=r,r=this.length),1===t.length){var i=t.charCodeAt(0);i<256&&(t=i)}if(void 0!==n&&"string"!=typeof n)throw new TypeError("encoding must be a string");if("string"==typeof n&&!u.isEncoding(n))throw new TypeError("Unknown encoding: "+n)}else"number"==typeof t&&(t&=255);if(e<0||this.length<e||this.length<r)throw new RangeError("Out of range index");if(r<=e)return this;var o;if(e>>>=0,r=void 0===r?this.length:r>>>0,t||(t=0),"number"==typeof t)for(o=e;o<r;++o)this[o]=t;else{var s=u.isBuffer(t)?t:N(new u(t,n).toString()),a=s.length;for(o=0;o<r-e;++o)this[o+e]=s[o%a]}return this};var I=/[^+\/0-9A-Za-z-_]/g;function U(t){return t<16?"0"+t.toString(16):t.toString(16)}function N(t,e){var r;e=e||1/0;for(var n=t.length,i=null,o=[],s=0;s<n;++s){if((r=t.charCodeAt(s))>55295&&r<57344){if(!i){if(r>56319){(e-=3)>-1&&o.push(239,191,189);continue}if(s+1===n){(e-=3)>-1&&o.push(239,191,189);continue}i=r;continue}if(r<56320){(e-=3)>-1&&o.push(239,191,189),i=r;continue}r=65536+(i-55296<<10|r-56320)}else i&&(e-=3)>-1&&o.push(239,191,189);if(i=null,r<128){if((e-=1)<0)break;o.push(r)}else if(r<2048){if((e-=2)<0)break;o.push(r>>6|192,63&r|128)}else if(r<65536){if((e-=3)<0)break;o.push(r>>12|224,r>>6&63|128,63&r|128)}else{if(!(r<1114112))throw new Error("Invalid code point");if((e-=4)<0)break;o.push(r>>18|240,r>>12&63|128,r>>6&63|128,63&r|128)}}return o}function H(t){return n.toByteArray(function(t){if((t=function(t){return t.trim?t.trim():t.replace(/^\s+|\s+$/g,"")}(t).replace(I,"")).length<2)return"";for(;t.length%4!=0;)t+="=";return t}(t))}function V(t,e,r,n){for(var i=0;i<n&&!(i+r>=e.length||i>=t.length);++i)e[i+r]=t[i];return i}}).call(this,r(0))},function(t,e){var r,n,i=t.exports={};function o(){throw new Error("setTimeout has not been defined")}function s(){throw new Error("clearTimeout has not been defined")}function a(t){if(r===setTimeout)return setTimeout(t,0);if((r===o||!r)&&setTimeout)return r=setTimeout,setTimeout(t,0);try{return r(t,0)}catch(e){try{return r.call(null,t,0)}catch(e){return r.call(this,t,0)}}}!function(){try{r="function"==typeof setTimeout?setTimeout:o}catch(t){r=o}try{n="function"==typeof clearTimeout?clearTimeout:s}catch(t){n=s}}();var u,c=[],l=!1,f=-1;function h(){l&&u&&(l=!1,u.length?c=u.concat(c):f=-1,c.length&&p())}function p(){if(!l){var t=a(h);l=!0;for(var e=c.length;e;){for(u=c,c=[];++f<e;)u&&u[f].run();f=-1,e=c.length}u=null,l=!1,function(t){if(n===clearTimeout)return clearTimeout(t);if((n===s||!n)&&clearTimeout)return n=clearTimeout,clearTimeout(t);try{n(t)}catch(e){try{return n.call(null,t)}catch(e){return n.call(this,t)}}}(t)}}function d(t,e){this.fun=t,this.array=e}function _(){}i.nextTick=function(t){var e=new Array(arguments.length-1);if(arguments.length>1)for(var r=1;r<arguments.length;r++)e[r-1]=arguments[r];c.push(new d(t,e)),1!==c.length||l||a(p)},d.prototype.run=function(){this.fun.apply(null,this.array)},i.title="browser",i.browser=!0,i.env={},i.argv=[],i.version="",i.versions={},i.on=_,i.addListener=_,i.once=_,i.off=_,i.removeListener=_,i.removeAllListeners=_,i.emit=_,i.prependListener=_,i.prependOnceListener=_,i.listeners=function(t){return[]},i.binding=function(t){throw new Error("process.binding is not supported")},i.cwd=function(){return"/"},i.chdir=function(t){throw new Error("process.chdir is not supported")},i.umask=function(){return 0}},function(t,e,r){(function(t){function r(t){return Object.prototype.toString.call(t)}e.isArray=function(t){return Array.isArray?Array.isArray(t):"[object Array]"===r(t)},e.isBoolean=function(t){return"boolean"==typeof t},e.isNull=function(t){return null===t},e.isNullOrUndefined=function(t){return null==t},e.isNumber=function(t){return"number"==typeof t},e.isString=function(t){return"string"==typeof t},e.isSymbol=function(t){return"symbol"==typeof t},e.isUndefined=function(t){return void 0===t},e.isRegExp=function(t){return"[object RegExp]"===r(t)},e.isObject=function(t){return"object"==typeof t&&null!==t},e.isDate=function(t){return"[object Date]"===r(t)},e.isError=function(t){return"[object Error]"===r(t)||t instanceof Error},e.isFunction=function(t){return"function"==typeof t},e.isPrimitive=function(t){return null===t||"boolean"==typeof t||"number"==typeof t||"string"==typeof t||"symbol"==typeof t||void 0===t},e.isBuffer=t.isBuffer}).call(this,r(3).Buffer)},function(t,e,r){"use strict";(function(e){!e.version||0===e.version.indexOf("v0.")||0===e.version.indexOf("v1.")&&0!==e.version.indexOf("v1.8.")?t.exports={nextTick:function(t,r,n,i){if("function"!=typeof t)throw new TypeError('"callback" argument must be a function');var o,s,a=arguments.length;switch(a){case 0:case 1:return e.nextTick(t);case 2:return e.nextTick(function(){t.call(null,r)});case 3:return e.nextTick(function(){t.call(null,r,n)});case 4:return e.nextTick(function(){t.call(null,r,n,i)});default:for(o=new Array(a-1),s=0;s<o.length;)o[s++]=arguments[s];return e.nextTick(function(){t.apply(null,o)})}}}:t.exports=e}).call(this,r(4))},function(t,e,r){var n=r(3),i=n.Buffer;function o(t,e){for(var r in t)e[r]=t[r]}function s(t,e,r){return i(t,e,r)}i.from&&i.alloc&&i.allocUnsafe&&i.allocUnsafeSlow?t.exports=n:(o(n,e),e.Buffer=s),o(i,s),s.from=function(t,e,r){if("number"==typeof t)throw new TypeError("Argument must not be a number");return i(t,e,r)},s.alloc=function(t,e,r){if("number"!=typeof t)throw new TypeError("Argument must be a number");var n=i(t);return void 0!==e?"string"==typeof r?n.fill(e,r):n.fill(e):n.fill(0),n},s.allocUnsafe=function(t){if("number"!=typeof t)throw new TypeError("Argument must be a number");return i(t)},s.allocUnsafeSlow=function(t){if("number"!=typeof t)throw new TypeError("Argument must be a number");return n.SlowBuffer(t)}},function(t,e,r){var n=r(17)(Object,"create");t.exports=n},function(t,e,r){var n=r(31);t.exports=function(t,e){for(var r=t.length;r--;)if(n(t[r][0],e))return r;return-1}},function(t,e,r){var n=r(96);t.exports=function(t,e){var r=t.__data__;return n(e)?r["string"==typeof e?"string":"hash"]:r.map}},function(t,e,r){(function(t){var n=void 0!==t&&t||"undefined"!=typeof self&&self||window,i=Function.prototype.apply;function o(t,e){this._id=t,this._clearFn=e}e.setTimeout=function(){return new o(i.call(setTimeout,n,arguments),clearTimeout)},e.setInterval=function(){return new o(i.call(setInterval,n,arguments),clearInterval)},e.clearTimeout=e.clearInterval=function(t){t&&t.close()},o.prototype.unref=o.prototype.ref=function(){},o.prototype.close=function(){this._clearFn.call(n,this._id)},e.enroll=function(t,e){clearTimeout(t._idleTimeoutId),t._idleTimeout=e},e.unenroll=function(t){clearTimeout(t._idleTimeoutId),t._idleTimeout=-1},e._unrefActive=e.active=function(t){clearTimeout(t._idleTimeoutId);var e=t._idleTimeout;e>=0&&(t._idleTimeoutId=setTimeout(function(){t._onTimeout&&t._onTimeout()},e))},r(35),e.setImmediate="undefined"!=typeof self&&self.setImmediate||void 0!==t&&t.setImmediate||this&&this.setImmediate,e.clearImmediate="undefined"!=typeof self&&self.clearImmediate||void 0!==t&&t.clearImmediate||this&&this.clearImmediate}).call(this,r(0))},function(t,e){function r(){this._events=this._events||{},this._maxListeners=this._maxListeners||void 0}function n(t){return"function"==typeof t}function i(t){return"object"==typeof t&&null!==t}function o(t){return void 0===t}t.exports=r,r.EventEmitter=r,r.prototype._events=void 0,r.prototype._maxListeners=void 0,r.defaultMaxListeners=10,r.prototype.setMaxListeners=function(t){if(!function(t){return"number"==typeof t}(t)||t<0||isNaN(t))throw TypeError("n must be a positive number");return this._maxListeners=t,this},r.prototype.emit=function(t){var e,r,s,a,u,c;if(this._events||(this._events={}),"error"===t&&(!this._events.error||i(this._events.error)&&!this._events.error.length)){if((e=arguments[1])instanceof Error)throw e;var l=new Error('Uncaught, unspecified "error" event. ('+e+")");throw l.context=e,l}if(o(r=this._events[t]))return!1;if(n(r))switch(arguments.length){case 1:r.call(this);break;case 2:r.call(this,arguments[1]);break;case 3:r.call(this,arguments[1],arguments[2]);break;default:a=Array.prototype.slice.call(arguments,1),r.apply(this,a)}else if(i(r))for(a=Array.prototype.slice.call(arguments,1),s=(c=r.slice()).length,u=0;u<s;u++)c[u].apply(this,a);return!0},r.prototype.addListener=function(t,e){var s;if(!n(e))throw TypeError("listener must be a function");return this._events||(this._events={}),this._events.newListener&&this.emit("newListener",t,n(e.listener)?e.listener:e),this._events[t]?i(this._events[t])?this._events[t].push(e):this._events[t]=[this._events[t],e]:this._events[t]=e,i(this._events[t])&&!this._events[t].warned&&(s=o(this._maxListeners)?r.defaultMaxListeners:this._maxListeners)&&s>0&&this._events[t].length>s&&(this._events[t].warned=!0,console.error("(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.",this._events[t].length),"function"==typeof console.trace&&console.trace()),this},r.prototype.on=r.prototype.addListener,r.prototype.once=function(t,e){if(!n(e))throw TypeError("listener must be a function");var r=!1;function i(){this.removeListener(t,i),r||(r=!0,e.apply(this,arguments))}return i.listener=e,this.on(t,i),this},r.prototype.removeListener=function(t,e){var r,o,s,a;if(!n(e))throw TypeError("listener must be a function");if(!this._events||!this._events[t])return this;if(s=(r=this._events[t]).length,o=-1,r===e||n(r.listener)&&r.listener===e)delete this._events[t],this._events.removeListener&&this.emit("removeListener",t,e);else if(i(r)){for(a=s;a-- >0;)if(r[a]===e||r[a].listener&&r[a].listener===e){o=a;break}if(o<0)return this;1===r.length?(r.length=0,delete this._events[t]):r.splice(o,1),this._events.removeListener&&this.emit("removeListener",t,e)}return this},r.prototype.removeAllListeners=function(t){var e,r;if(!this._events)return this;if(!this._events.removeListener)return 0===arguments.length?this._events={}:this._events[t]&&delete this._events[t],this;if(0===arguments.length){for(e in this._events)"removeListener"!==e&&this.removeAllListeners(e);return this.removeAllListeners("removeListener"),this._events={},this}if(n(r=this._events[t]))this.removeListener(t,r);else if(r)for(;r.length;)this.removeListener(t,r[r.length-1]);return delete this._events[t],this},r.prototype.listeners=function(t){return this._events&&this._events[t]?n(this._events[t])?[this._events[t]]:this._events[t].slice():[]},r.prototype.listenerCount=function(t){if(this._events){var e=this._events[t];if(n(e))return 1;if(e)return e.length}return 0},r.listenerCount=function(t,e){return t.listenerCount(e)}},function(t,e,r){(e=t.exports=r(23)).Stream=e,e.Readable=e,e.Writable=r(14),e.Duplex=r(1),e.Transform=r(27),e.PassThrough=r(45)},function(t,e,r){"use strict";(function(e,n,i){var o=r(6);function s(t){var e=this;this.next=null,this.entry=null,this.finish=function(){!function(t,e,r){var n=t.entry;for(t.entry=null;n;){var i=n.callback;e.pendingcb--,i(void 0),n=n.next}e.corkedRequestsFree?e.corkedRequestsFree.next=t:e.corkedRequestsFree=t}(e,t)}}t.exports=m;var a,u=!e.browser&&["v0.10","v0.9."].indexOf(e.version.slice(0,5))>-1?n:o.nextTick;m.WritableState=y;var c=r(5);c.inherits=r(2);var l,f={deprecate:r(44)},h=r(24),p=r(7).Buffer,d=i.Uint8Array||function(){},_=r(25);function v(){}function y(t,e){a=a||r(1),t=t||{};var n=e instanceof a;this.objectMode=!!t.objectMode,n&&(this.objectMode=this.objectMode||!!t.writableObjectMode);var i=t.highWaterMark,c=t.writableHighWaterMark,l=this.objectMode?16:16384;this.highWaterMark=i||0===i?i:n&&(c||0===c)?c:l,this.highWaterMark=Math.floor(this.highWaterMark),this.finalCalled=!1,this.needDrain=!1,this.ending=!1,this.ended=!1,this.finished=!1,this.destroyed=!1;var f=!1===t.decodeStrings;this.decodeStrings=!f,this.defaultEncoding=t.defaultEncoding||"utf8",this.length=0,this.writing=!1,this.corked=0,this.sync=!0,this.bufferProcessing=!1,this.onwrite=function(t){!function(t,e){var r=t._writableState,n=r.sync,i=r.writecb;if(function(t){t.writing=!1,t.writecb=null,t.length-=t.writelen,t.writelen=0}(r),e)!function(t,e,r,n,i){--e.pendingcb,r?(o.nextTick(i,n),o.nextTick(x,t,e),t._writableState.errorEmitted=!0,t.emit("error",n)):(i(n),t._writableState.errorEmitted=!0,t.emit("error",n),x(t,e))}(t,r,n,e,i);else{var s=E(r);s||r.corked||r.bufferProcessing||!r.bufferedRequest||w(t,r),n?u(b,t,r,s,i):b(t,r,s,i)}}(e,t)},this.writecb=null,this.writelen=0,this.bufferedRequest=null,this.lastBufferedRequest=null,this.pendingcb=0,this.prefinished=!1,this.errorEmitted=!1,this.bufferedRequestCount=0,this.corkedRequestsFree=new s(this)}function m(t){if(a=a||r(1),!(l.call(m,this)||this instanceof a))return new m(t);this._writableState=new y(t,this),this.writable=!0,t&&("function"==typeof t.write&&(this._write=t.write),"function"==typeof t.writev&&(this._writev=t.writev),"function"==typeof t.destroy&&(this._destroy=t.destroy),"function"==typeof t.final&&(this._final=t.final)),h.call(this)}function g(t,e,r,n,i,o,s){e.writelen=n,e.writecb=s,e.writing=!0,e.sync=!0,r?t._writev(i,e.onwrite):t._write(i,o,e.onwrite),e.sync=!1}function b(t,e,r,n){r||function(t,e){0===e.length&&e.needDrain&&(e.needDrain=!1,t.emit("drain"))}(t,e),e.pendingcb--,n(),x(t,e)}function w(t,e){e.bufferProcessing=!0;var r=e.bufferedRequest;if(t._writev&&r&&r.next){var n=e.bufferedRequestCount,i=new Array(n),o=e.corkedRequestsFree;o.entry=r;for(var a=0,u=!0;r;)i[a]=r,r.isBuf||(u=!1),r=r.next,a+=1;i.allBuffers=u,g(t,e,!0,e.length,i,"",o.finish),e.pendingcb++,e.lastBufferedRequest=null,o.next?(e.corkedRequestsFree=o.next,o.next=null):e.corkedRequestsFree=new s(e),e.bufferedRequestCount=0}else{for(;r;){var c=r.chunk,l=r.encoding,f=r.callback;if(g(t,e,!1,e.objectMode?1:c.length,c,l,f),r=r.next,e.bufferedRequestCount--,e.writing)break}null===r&&(e.lastBufferedRequest=null)}e.bufferedRequest=r,e.bufferProcessing=!1}function E(t){return t.ending&&0===t.length&&null===t.bufferedRequest&&!t.finished&&!t.writing}function C(t,e){t._final(function(r){e.pendingcb--,r&&t.emit("error",r),e.prefinished=!0,t.emit("prefinish"),x(t,e)})}function x(t,e){var r=E(e);return r&&(function(t,e){e.prefinished||e.finalCalled||("function"==typeof t._final?(e.pendingcb++,e.finalCalled=!0,o.nextTick(C,t,e)):(e.prefinished=!0,t.emit("prefinish")))}(t,e),0===e.pendingcb&&(e.finished=!0,t.emit("finish"))),r}c.inherits(m,h),y.prototype.getBuffer=function(){for(var t=this.bufferedRequest,e=[];t;)e.push(t),t=t.next;return e},function(){try{Object.defineProperty(y.prototype,"buffer",{get:f.deprecate(function(){return this.getBuffer()},"_writableState.buffer is deprecated. Use _writableState.getBuffer instead.","DEP0003")})}catch(t){}}(),"function"==typeof Symbol&&Symbol.hasInstance&&"function"==typeof Function.prototype[Symbol.hasInstance]?(l=Function.prototype[Symbol.hasInstance],Object.defineProperty(m,Symbol.hasInstance,{value:function(t){return!!l.call(this,t)||this===m&&t&&t._writableState instanceof y}})):l=function(t){return t instanceof this},m.prototype.pipe=function(){this.emit("error",new Error("Cannot pipe, not readable"))},m.prototype.write=function(t,e,r){var n=this._writableState,i=!1,s=!n.objectMode&&function(t){return p.isBuffer(t)||t instanceof d}(t);return s&&!p.isBuffer(t)&&(t=function(t){return p.from(t)}(t)),"function"==typeof e&&(r=e,e=null),s?e="buffer":e||(e=n.defaultEncoding),"function"!=typeof r&&(r=v),n.ended?function(t,e){var r=new Error("write after end");t.emit("error",r),o.nextTick(e,r)}(this,r):(s||function(t,e,r,n){var i=!0,s=!1;return null===r?s=new TypeError("May not write null values to stream"):"string"==typeof r||void 0===r||e.objectMode||(s=new TypeError("Invalid non-string/buffer chunk")),s&&(t.emit("error",s),o.nextTick(n,s),i=!1),i}(this,n,t,r))&&(n.pendingcb++,i=function(t,e,r,n,i,o){if(!r){var s=function(t,e,r){return t.objectMode||!1===t.decodeStrings||"string"!=typeof e||(e=p.from(e,r)),e}(e,n,i);n!==s&&(r=!0,i="buffer",n=s)}var a=e.objectMode?1:n.length;e.length+=a;var u=e.length<e.highWaterMark;if(u||(e.needDrain=!0),e.writing||e.corked){var c=e.lastBufferedRequest;e.lastBufferedRequest={chunk:n,encoding:i,isBuf:r,callback:o,next:null},c?c.next=e.lastBufferedRequest:e.bufferedRequest=e.lastBufferedRequest,e.bufferedRequestCount+=1}else g(t,e,!1,a,n,i,o);return u}(this,n,s,t,e,r)),i},m.prototype.cork=function(){this._writableState.corked++},m.prototype.uncork=function(){var t=this._writableState;t.corked&&(t.corked--,t.writing||t.corked||t.finished||t.bufferProcessing||!t.bufferedRequest||w(this,t))},m.prototype.setDefaultEncoding=function(t){if("string"==typeof t&&(t=t.toLowerCase()),!(["hex","utf8","utf-8","ascii","binary","base64","ucs2","ucs-2","utf16le","utf-16le","raw"].indexOf((t+"").toLowerCase())>-1))throw new TypeError("Unknown encoding: "+t);return this._writableState.defaultEncoding=t,this},Object.defineProperty(m.prototype,"writableHighWaterMark",{enumerable:!1,get:function(){return this._writableState.highWaterMark}}),m.prototype._write=function(t,e,r){r(new Error("_write() is not implemented"))},m.prototype._writev=null,m.prototype.end=function(t,e,r){var n=this._writableState;"function"==typeof t?(r=t,t=null,e=null):"function"==typeof e&&(r=e,e=null),null!==t&&void 0!==t&&this.write(t,e),n.corked&&(n.corked=1,this.uncork()),n.ending||n.finished||function(t,e,r){e.ending=!0,x(t,e),r&&(e.finished?o.nextTick(r):t.once("finish",r)),e.ended=!0,t.writable=!1}(this,n,r)},Object.defineProperty(m.prototype,"destroyed",{get:function(){return void 0!==this._writableState&&this._writableState.destroyed},set:function(t){this._writableState&&(this._writableState.destroyed=t)}}),m.prototype.destroy=_.destroy,m.prototype._undestroy=_.undestroy,m.prototype._destroy=function(t,e){this.end(),e(t)}}).call(this,r(4),r(11).setImmediate,r(0))},function(t,e,r){(function(e,r,n){t.exports=function t(e,r,n){function i(s,a){if(!r[s]){if(!e[s]){var u="function"==typeof _dereq_&&_dereq_;if(!a&&u)return u(s,!0);if(o)return o(s,!0);var c=new Error("Cannot find module '"+s+"'");throw c.code="MODULE_NOT_FOUND",c}var l=r[s]={exports:{}};e[s][0].call(l.exports,function(t){return i(e[s][1][t]||t)},l,l.exports,t,e,r,n)}return r[s].exports}for(var o="function"==typeof _dereq_&&_dereq_,s=0;s<n.length;s++)i(n[s]);return i}({1:[function(t,e,r){"use strict";e.exports=function(t){var e=t._SomePromiseArray;function r(t){var r=new e(t),n=r.promise();return r.setHowMany(1),r.setUnwrap(),r.init(),n}t.any=function(t){return r(t)},t.prototype.any=function(){return r(this)}}},{}],2:[function(t,r,n){"use strict";var i;try{throw new Error}catch(t){i=t}var o=t("./schedule"),s=t("./queue"),a=t("./util");function u(){this._customScheduler=!1,this._isTickUsed=!1,this._lateQueue=new s(16),this._normalQueue=new s(16),this._haveDrainedQueues=!1,this._trampolineEnabled=!0;var t=this;this.drainQueues=function(){t._drainQueues()},this._schedule=o}function c(t,e,r){this._lateQueue.push(t,e,r),this._queueTick()}function l(t,e,r){this._normalQueue.push(t,e,r),this._queueTick()}function f(t){this._normalQueue._pushOne(t),this._queueTick()}u.prototype.setScheduler=function(t){var e=this._schedule;return this._schedule=t,this._customScheduler=!0,e},u.prototype.hasCustomScheduler=function(){return this._customScheduler},u.prototype.enableTrampoline=function(){this._trampolineEnabled=!0},u.prototype.disableTrampolineIfNecessary=function(){a.hasDevTools&&(this._trampolineEnabled=!1)},u.prototype.haveItemsQueued=function(){return this._isTickUsed||this._haveDrainedQueues},u.prototype.fatalError=function(t,r){r?(e.stderr.write("Fatal "+(t instanceof Error?t.stack:t)+"\n"),e.exit(2)):this.throwLater(t)},u.prototype.throwLater=function(t,e){if(1===arguments.length&&(e=t,t=function(){throw e}),"undefined"!=typeof setTimeout)setTimeout(function(){t(e)},0);else try{this._schedule(function(){t(e)})}catch(t){throw new Error("No async scheduler available\n\n    See http://goo.gl/MqrFmX\n")}},a.hasDevTools?(u.prototype.invokeLater=function(t,e,r){this._trampolineEnabled?c.call(this,t,e,r):this._schedule(function(){setTimeout(function(){t.call(e,r)},100)})},u.prototype.invoke=function(t,e,r){this._trampolineEnabled?l.call(this,t,e,r):this._schedule(function(){t.call(e,r)})},u.prototype.settlePromises=function(t){this._trampolineEnabled?f.call(this,t):this._schedule(function(){t._settlePromises()})}):(u.prototype.invokeLater=c,u.prototype.invoke=l,u.prototype.settlePromises=f),u.prototype._drainQueue=function(t){for(;t.length()>0;){var e=t.shift();if("function"==typeof e){var r=t.shift(),n=t.shift();e.call(r,n)}else e._settlePromises()}},u.prototype._drainQueues=function(){this._drainQueue(this._normalQueue),this._reset(),this._haveDrainedQueues=!0,this._drainQueue(this._lateQueue)},u.prototype._queueTick=function(){this._isTickUsed||(this._isTickUsed=!0,this._schedule(this.drainQueues))},u.prototype._reset=function(){this._isTickUsed=!1},r.exports=u,r.exports.firstLineError=i},{"./queue":26,"./schedule":29,"./util":36}],3:[function(t,e,r){"use strict";e.exports=function(t,e,r,n){var i=!1,o=function(t,e){this._reject(e)},s=function(t,e){e.promiseRejectionQueued=!0,e.bindingPromise._then(o,o,null,this,t)},a=function(t,e){0==(50397184&this._bitField)&&this._resolveCallback(e.target)},u=function(t,e){e.promiseRejectionQueued||this._reject(t)};t.prototype.bind=function(o){i||(i=!0,t.prototype._propagateFrom=n.propagateFromFunction(),t.prototype._boundValue=n.boundValueFunction());var c=r(o),l=new t(e);l._propagateFrom(this,1);var f=this._target();if(l._setBoundTo(c),c instanceof t){var h={promiseRejectionQueued:!1,promise:l,target:f,bindingPromise:c};f._then(e,s,void 0,l,h),c._then(a,u,void 0,l,h),l._setOnCancel(c)}else l._resolveCallback(f);return l},t.prototype._setBoundTo=function(t){void 0!==t?(this._bitField=2097152|this._bitField,this._boundTo=t):this._bitField=-2097153&this._bitField},t.prototype._isBound=function(){return 2097152==(2097152&this._bitField)},t.bind=function(e,r){return t.resolve(r).bind(e)}}},{}],4:[function(t,e,r){"use strict";var n;"undefined"!=typeof Promise&&(n=Promise);var i=t("./promise")();i.noConflict=function(){try{Promise===i&&(Promise=n)}catch(t){}return i},e.exports=i},{"./promise":22}],5:[function(t,e,r){"use strict";var n=Object.create;if(n){var i=n(null),o=n(null);i[" size"]=o[" size"]=0}e.exports=function(e){var r=t("./util"),n=r.canEvaluate;function i(t){return function(t,n){var i;if(null!=t&&(i=t[n]),"function"!=typeof i){var o="Object "+r.classString(t)+" has no method '"+r.toString(n)+"'";throw new e.TypeError(o)}return i}(t,this.pop()).apply(t,this)}function o(t){return t[this]}function s(t){var e=+this;return e<0&&(e=Math.max(0,e+t.length)),t[e]}r.isIdentifier,e.prototype.call=function(t){var e=[].slice.call(arguments,1);return e.push(t),this._then(i,void 0,void 0,e,void 0)},e.prototype.get=function(t){var e;if("number"==typeof t)e=s;else if(n){var r=(void 0)(t);e=null!==r?r:o}else e=o;return this._then(e,void 0,void 0,t,void 0)}}},{"./util":36}],6:[function(t,e,r){"use strict";e.exports=function(e,r,n,i){var o=t("./util"),s=o.tryCatch,a=o.errorObj,u=e._async;e.prototype.break=e.prototype.cancel=function(){if(!i.cancellation())return this._warn("cancellation is disabled");for(var t=this,e=t;t._isCancellable();){if(!t._cancelBy(e)){e._isFollowing()?e._followee().cancel():e._cancelBranched();break}var r=t._cancellationParent;if(null==r||!r._isCancellable()){t._isFollowing()?t._followee().cancel():t._cancelBranched();break}t._isFollowing()&&t._followee().cancel(),t._setWillBeCancelled(),e=t,t=r}},e.prototype._branchHasCancelled=function(){this._branchesRemainingToCancel--},e.prototype._enoughBranchesHaveCancelled=function(){return void 0===this._branchesRemainingToCancel||this._branchesRemainingToCancel<=0},e.prototype._cancelBy=function(t){return t===this?(this._branchesRemainingToCancel=0,this._invokeOnCancel(),!0):(this._branchHasCancelled(),!!this._enoughBranchesHaveCancelled()&&(this._invokeOnCancel(),!0))},e.prototype._cancelBranched=function(){this._enoughBranchesHaveCancelled()&&this._cancel()},e.prototype._cancel=function(){this._isCancellable()&&(this._setCancelled(),u.invoke(this._cancelPromises,this,void 0))},e.prototype._cancelPromises=function(){this._length()>0&&this._settlePromises()},e.prototype._unsetOnCancel=function(){this._onCancelField=void 0},e.prototype._isCancellable=function(){return this.isPending()&&!this._isCancelled()},e.prototype.isCancellable=function(){return this.isPending()&&!this.isCancelled()},e.prototype._doInvokeOnCancel=function(t,e){if(o.isArray(t))for(var r=0;r<t.length;++r)this._doInvokeOnCancel(t[r],e);else if(void 0!==t)if("function"==typeof t){if(!e){var n=s(t).call(this._boundValue());n===a&&(this._attachExtraTrace(n.e),u.throwLater(n.e))}}else t._resultCancelled(this)},e.prototype._invokeOnCancel=function(){var t=this._onCancel();this._unsetOnCancel(),u.invoke(this._doInvokeOnCancel,this,t)},e.prototype._invokeInternalOnCancel=function(){this._isCancellable()&&(this._doInvokeOnCancel(this._onCancel(),!0),this._unsetOnCancel())},e.prototype._resultCancelled=function(){this.cancel()}}},{"./util":36}],7:[function(t,e,r){"use strict";e.exports=function(e){var r=t("./util"),n=t("./es5").keys,i=r.tryCatch,o=r.errorObj;return function(t,s,a){return function(u){var c=a._boundValue();t:for(var l=0;l<t.length;++l){var f=t[l];if(f===Error||null!=f&&f.prototype instanceof Error){if(u instanceof f)return i(s).call(c,u)}else if("function"==typeof f){var h=i(f).call(c,u);if(h===o)return h;if(h)return i(s).call(c,u)}else if(r.isObject(u)){for(var p=n(f),d=0;d<p.length;++d){var _=p[d];if(f[_]!=u[_])continue t}return i(s).call(c,u)}}return e}}}},{"./es5":13,"./util":36}],8:[function(t,e,r){"use strict";e.exports=function(t){var e=!1,r=[];function n(){this._trace=new n.CapturedTrace(i())}function i(){var t=r.length-1;if(t>=0)return r[t]}return t.prototype._promiseCreated=function(){},t.prototype._pushContext=function(){},t.prototype._popContext=function(){return null},t._peekContext=t.prototype._peekContext=function(){},n.prototype._pushContext=function(){void 0!==this._trace&&(this._trace._promiseCreated=null,r.push(this._trace))},n.prototype._popContext=function(){if(void 0!==this._trace){var t=r.pop(),e=t._promiseCreated;return t._promiseCreated=null,e}return null},n.CapturedTrace=null,n.create=function(){if(e)return new n},n.deactivateLongStackTraces=function(){},n.activateLongStackTraces=function(){var r=t.prototype._pushContext,o=t.prototype._popContext,s=t._peekContext,a=t.prototype._peekContext,u=t.prototype._promiseCreated;n.deactivateLongStackTraces=function(){t.prototype._pushContext=r,t.prototype._popContext=o,t._peekContext=s,t.prototype._peekContext=a,t.prototype._promiseCreated=u,e=!1},e=!0,t.prototype._pushContext=n.prototype._pushContext,t.prototype._popContext=n.prototype._popContext,t._peekContext=t.prototype._peekContext=i,t.prototype._promiseCreated=function(){var t=this._peekContext();t&&null==t._promiseCreated&&(t._promiseCreated=this)}},n}},{}],9:[function(t,r,n){"use strict";r.exports=function(r,n){var i,o,s,a=r._getDomain,u=r._async,c=t("./errors").Warning,l=t("./util"),f=l.canAttachTrace,h=/[\\\/]bluebird[\\\/]js[\\\/](release|debug|instrumented)/,p=/\((?:timers\.js):\d+:\d+\)/,d=/[\/<\(](.+?):(\d+):(\d+)\)?\s*$/,_=null,v=null,y=!1,m=!(0==l.env("BLUEBIRD_DEBUG")),g=!(0==l.env("BLUEBIRD_WARNINGS")||!m&&!l.env("BLUEBIRD_WARNINGS")),b=!(0==l.env("BLUEBIRD_LONG_STACK_TRACES")||!m&&!l.env("BLUEBIRD_LONG_STACK_TRACES")),w=0!=l.env("BLUEBIRD_W_FORGOTTEN_RETURN")&&(g||!!l.env("BLUEBIRD_W_FORGOTTEN_RETURN"));r.prototype.suppressUnhandledRejections=function(){var t=this._target();t._bitField=-1048577&t._bitField|524288},r.prototype._ensurePossibleRejectionHandled=function(){if(0==(524288&this._bitField)){this._setRejectionIsUnhandled();var t=this;setTimeout(function(){t._notifyUnhandledRejection()},1)}},r.prototype._notifyUnhandledRejectionIsHandled=function(){q("rejectionHandled",i,void 0,this)},r.prototype._setReturnedNonUndefined=function(){this._bitField=268435456|this._bitField},r.prototype._returnedNonUndefined=function(){return 0!=(268435456&this._bitField)},r.prototype._notifyUnhandledRejection=function(){if(this._isRejectionUnhandled()){var t=this._settledValue();this._setUnhandledRejectionIsNotified(),q("unhandledRejection",o,t,this)}},r.prototype._setUnhandledRejectionIsNotified=function(){this._bitField=262144|this._bitField},r.prototype._unsetUnhandledRejectionIsNotified=function(){this._bitField=-262145&this._bitField},r.prototype._isUnhandledRejectionNotified=function(){return(262144&this._bitField)>0},r.prototype._setRejectionIsUnhandled=function(){this._bitField=1048576|this._bitField},r.prototype._unsetRejectionIsUnhandled=function(){this._bitField=-1048577&this._bitField,this._isUnhandledRejectionNotified()&&(this._unsetUnhandledRejectionIsNotified(),this._notifyUnhandledRejectionIsHandled())},r.prototype._isRejectionUnhandled=function(){return(1048576&this._bitField)>0},r.prototype._warn=function(t,e,r){return U(t,e,r||this)},r.onPossiblyUnhandledRejection=function(t){var e=a();o="function"==typeof t?null===e?t:l.domainBind(e,t):void 0},r.onUnhandledRejectionHandled=function(t){var e=a();i="function"==typeof t?null===e?t:l.domainBind(e,t):void 0};var E=function(){};r.longStackTraces=function(){if(u.haveItemsQueued()&&!J.longStackTraces)throw new Error("cannot enable long stack traces after promises have been created\n\n    See http://goo.gl/MqrFmX\n");if(!J.longStackTraces&&Y()){var t=r.prototype._captureStackTrace,e=r.prototype._attachExtraTrace;J.longStackTraces=!0,E=function(){if(u.haveItemsQueued()&&!J.longStackTraces)throw new Error("cannot enable long stack traces after promises have been created\n\n    See http://goo.gl/MqrFmX\n");r.prototype._captureStackTrace=t,r.prototype._attachExtraTrace=e,n.deactivateLongStackTraces(),u.enableTrampoline(),J.longStackTraces=!1},r.prototype._captureStackTrace=D,r.prototype._attachExtraTrace=I,n.activateLongStackTraces(),u.disableTrampolineIfNecessary()}},r.hasLongStackTraces=function(){return J.longStackTraces&&Y()};var C=function(){try{if("function"==typeof CustomEvent){var t=new CustomEvent("CustomEvent");return l.global.dispatchEvent(t),function(t,e){var r=new CustomEvent(t.toLowerCase(),{detail:e,cancelable:!0});return!l.global.dispatchEvent(r)}}return"function"==typeof Event?(t=new Event("CustomEvent"),l.global.dispatchEvent(t),function(t,e){var r=new Event(t.toLowerCase(),{cancelable:!0});return r.detail=e,!l.global.dispatchEvent(r)}):((t=document.createEvent("CustomEvent")).initCustomEvent("testingtheevent",!1,!0,{}),l.global.dispatchEvent(t),function(t,e){var r=document.createEvent("CustomEvent");return r.initCustomEvent(t.toLowerCase(),!1,!0,e),!l.global.dispatchEvent(r)})}catch(t){}return function(){return!1}}(),x=l.isNode?function(){return e.emit.apply(e,arguments)}:l.global?function(t){var e="on"+t.toLowerCase(),r=l.global[e];return!!r&&(r.apply(l.global,[].slice.call(arguments,1)),!0)}:function(){return!1};function j(t,e){return{promise:e}}var S={promiseCreated:j,promiseFulfilled:j,promiseRejected:j,promiseResolved:j,promiseCancelled:j,promiseChained:function(t,e,r){return{promise:e,child:r}},warning:function(t,e){return{warning:e}},unhandledRejection:function(t,e,r){return{reason:e,promise:r}},rejectionHandled:j},R=function(t){var e=!1;try{e=x.apply(null,arguments)}catch(t){u.throwLater(t),e=!0}var r=!1;try{r=C(t,S[t].apply(null,arguments))}catch(t){u.throwLater(t),r=!0}return r||e};function k(){return!1}function T(t,e,r){var n=this;try{t(e,r,function(t){if("function"!=typeof t)throw new TypeError("onCancel must be a function, got: "+l.toString(t));n._attachCancellationCallback(t)})}catch(t){return t}}function P(t){if(!this._isCancellable())return this;var e=this._onCancel();void 0!==e?l.isArray(e)?e.push(t):this._setOnCancel([e,t]):this._setOnCancel(t)}function O(){return this._onCancelField}function A(t){this._onCancelField=t}function F(){this._cancellationParent=void 0,this._onCancelField=void 0}function L(t,e){if(0!=(1&e)){this._cancellationParent=t;var r=t._branchesRemainingToCancel;void 0===r&&(r=0),t._branchesRemainingToCancel=r+1}0!=(2&e)&&t._isBound()&&this._setBoundTo(t._boundTo)}r.config=function(t){if("longStackTraces"in(t=Object(t))&&(t.longStackTraces?r.longStackTraces():!t.longStackTraces&&r.hasLongStackTraces()&&E()),"warnings"in t){var e=t.warnings;J.warnings=!!e,w=J.warnings,l.isObject(e)&&"wForgottenReturn"in e&&(w=!!e.wForgottenReturn)}if("cancellation"in t&&t.cancellation&&!J.cancellation){if(u.haveItemsQueued())throw new Error("cannot enable cancellation after promises are in use");r.prototype._clearCancellationData=F,r.prototype._propagateFrom=L,r.prototype._onCancel=O,r.prototype._setOnCancel=A,r.prototype._attachCancellationCallback=P,r.prototype._execute=T,M=L,J.cancellation=!0}return"monitoring"in t&&(t.monitoring&&!J.monitoring?(J.monitoring=!0,r.prototype._fireEvent=R):!t.monitoring&&J.monitoring&&(J.monitoring=!1,r.prototype._fireEvent=k)),r},r.prototype._fireEvent=k,r.prototype._execute=function(t,e,r){try{t(e,r)}catch(t){return t}},r.prototype._onCancel=function(){},r.prototype._setOnCancel=function(t){},r.prototype._attachCancellationCallback=function(t){},r.prototype._captureStackTrace=function(){},r.prototype._attachExtraTrace=function(){},r.prototype._clearCancellationData=function(){},r.prototype._propagateFrom=function(t,e){};var M=function(t,e){0!=(2&e)&&t._isBound()&&this._setBoundTo(t._boundTo)};function B(){var t=this._boundTo;return void 0!==t&&t instanceof r?t.isFulfilled()?t.value():void 0:t}function D(){this._trace=new X(this._peekContext())}function I(t,e){if(f(t)){var r=this._trace;if(void 0!==r&&e&&(r=r._parent),void 0!==r)r.attachExtraTrace(t);else if(!t.__stackCleaned__){var n=H(t);l.notEnumerableProp(t,"stack",n.message+"\n"+n.stack.join("\n")),l.notEnumerableProp(t,"__stackCleaned__",!0)}}}function U(t,e,n){if(J.warnings){var i,o=new c(t);if(e)n._attachExtraTrace(o);else if(J.longStackTraces&&(i=r._peekContext()))i.attachExtraTrace(o);else{var s=H(o);o.stack=s.message+"\n"+s.stack.join("\n")}R("warning",o)||V(o,"",!0)}}function N(t){for(var e=[],r=0;r<t.length;++r){var n=t[r],i="    (No stack trace)"===n||_.test(n),o=i&&$(n);i&&!o&&(y&&" "!==n.charAt(0)&&(n="    "+n),e.push(n))}return e}function H(t){var e=t.stack,r=t.toString();return e="string"==typeof e&&e.length>0?function(t){for(var e=t.stack.replace(/\s+$/g,"").split("\n"),r=0;r<e.length;++r){var n=e[r];if("    (No stack trace)"===n||_.test(n))break}return r>0&&"SyntaxError"!=t.name&&(e=e.slice(r)),e}(t):["    (No stack trace)"],{message:r,stack:"SyntaxError"==t.name?e:N(e)}}function V(t,e,r){if("undefined"!=typeof console){var n;if(l.isObject(t)){var i=t.stack;n=e+v(i,t)}else n=e+String(t);"function"==typeof s?s(n,r):"function"!=typeof console.log&&"object"!=typeof console.log||console.log(n)}}function q(t,e,r,n){var i=!1;try{"function"==typeof e&&(i=!0,"rejectionHandled"===t?e(n):e(r,n))}catch(t){u.throwLater(t)}"unhandledRejection"===t?R(t,r,n)||i||V(r,"Unhandled rejection "):R(t,n)}function W(t){var e;if("function"==typeof t)e="[function "+(t.name||"anonymous")+"]";else{if(e=t&&"function"==typeof t.toString?t.toString():l.toString(t),/\[object [a-zA-Z0-9$_]+\]/.test(e))try{e=JSON.stringify(t)}catch(t){}0===e.length&&(e="(empty array)")}return"(<"+function(t){return t.length<41?t:t.substr(0,38)+"..."}(e)+">, no stack trace)"}function Y(){return"function"==typeof G}var $=function(){return!1},z=/[\/<\(]([^:\/]+):(\d+):(?:\d+)\)?\s*$/;function Q(t){var e=t.match(z);if(e)return{fileName:e[1],line:parseInt(e[2],10)}}function X(t){this._parent=t,this._promisesCreated=0;var e=this._length=1+(void 0===t?0:t._length);G(this,X),e>32&&this.uncycle()}l.inherits(X,Error),n.CapturedTrace=X,X.prototype.uncycle=function(){var t=this._length;if(!(t<2)){for(var e=[],r={},n=0,i=this;void 0!==i;++n)e.push(i),i=i._parent;for(n=(t=this._length=n)-1;n>=0;--n){var o=e[n].stack;void 0===r[o]&&(r[o]=n)}for(n=0;n<t;++n){var s=r[e[n].stack];if(void 0!==s&&s!==n){s>0&&(e[s-1]._parent=void 0,e[s-1]._length=1),e[n]._parent=void 0,e[n]._length=1;var a=n>0?e[n-1]:this;s<t-1?(a._parent=e[s+1],a._parent.uncycle(),a._length=a._parent._length+1):(a._parent=void 0,a._length=1);for(var u=a._length+1,c=n-2;c>=0;--c)e[c]._length=u,u++;return}}}},X.prototype.attachExtraTrace=function(t){if(!t.__stackCleaned__){this.uncycle();for(var e=H(t),r=e.message,n=[e.stack],i=this;void 0!==i;)n.push(N(i.stack.split("\n"))),i=i._parent;!function(t){for(var e=t[0],r=1;r<t.length;++r){for(var n=t[r],i=e.length-1,o=e[i],s=-1,a=n.length-1;a>=0;--a)if(n[a]===o){s=a;break}for(a=s;a>=0;--a){var u=n[a];if(e[i]!==u)break;e.pop(),i--}e=n}}(n),function(t){for(var e=0;e<t.length;++e)(0===t[e].length||e+1<t.length&&t[e][0]===t[e+1][0])&&(t.splice(e,1),e--)}(n),l.notEnumerableProp(t,"stack",function(t,e){for(var r=0;r<e.length-1;++r)e[r].push("From previous event:"),e[r]=e[r].join("\n");return r<e.length&&(e[r]=e[r].join("\n")),t+"\n"+e.join("\n")}(r,n)),l.notEnumerableProp(t,"__stackCleaned__",!0)}};var G=function(){var t=/^\s*at\s*/,e=function(t,e){return"string"==typeof t?t:void 0!==e.name&&void 0!==e.message?e.toString():W(e)};if("number"==typeof Error.stackTraceLimit&&"function"==typeof Error.captureStackTrace){Error.stackTraceLimit+=6,_=t,v=e;var r=Error.captureStackTrace;return $=function(t){return h.test(t)},function(t,e){Error.stackTraceLimit+=6,r(t,e),Error.stackTraceLimit-=6}}var n,i=new Error;if("string"==typeof i.stack&&i.stack.split("\n")[0].indexOf("stackDetection@")>=0)return _=/@/,v=e,y=!0,function(t){t.stack=(new Error).stack};try{throw new Error}catch(t){n="stack"in t}return"stack"in i||!n||"number"!=typeof Error.stackTraceLimit?(v=function(t,e){return"string"==typeof t?t:"object"!=typeof e&&"function"!=typeof e||void 0===e.name||void 0===e.message?W(e):e.toString()},null):(_=t,v=e,function(t){Error.stackTraceLimit+=6;try{throw new Error}catch(e){t.stack=e.stack}Error.stackTraceLimit-=6})}();"undefined"!=typeof console&&void 0!==console.warn&&(s=function(t){console.warn(t)},l.isNode&&e.stderr.isTTY?s=function(t,e){var r=e?"[33m":"[31m";console.warn(r+t+"[0m\n")}:l.isNode||"string"!=typeof(new Error).stack||(s=function(t,e){console.warn("%c"+t,e?"color: darkorange":"color: red")}));var J={warnings:g,longStackTraces:!1,cancellation:!1,monitoring:!1};return b&&r.longStackTraces(),{longStackTraces:function(){return J.longStackTraces},warnings:function(){return J.warnings},cancellation:function(){return J.cancellation},monitoring:function(){return J.monitoring},propagateFromFunction:function(){return M},boundValueFunction:function(){return B},checkForgottenReturns:function(t,e,r,n,i){if(void 0===t&&null!==e&&w){if(void 0!==i&&i._returnedNonUndefined())return;if(0==(65535&n._bitField))return;r&&(r+=" ");var o="",s="";if(e._trace){for(var a=e._trace.stack.split("\n"),u=N(a),c=u.length-1;c>=0;--c){var l=u[c];if(!p.test(l)){var f=l.match(d);f&&(o="at "+f[1]+":"+f[2]+":"+f[3]+" ");break}}if(u.length>0){var h=u[0];for(c=0;c<a.length;++c)if(a[c]===h){c>0&&(s="\n"+a[c-1]);break}}}var _="a promise was created in a "+r+"handler "+o+"but was not returned from it, see http://goo.gl/rRqMUw"+s;n._warn(_,!0,e)}},setBounds:function(t,e){if(Y()){for(var r,n,i=t.stack.split("\n"),o=e.stack.split("\n"),s=-1,a=-1,u=0;u<i.length;++u)if(c=Q(i[u])){r=c.fileName,s=c.line;break}for(u=0;u<o.length;++u){var c;if(c=Q(o[u])){n=c.fileName,a=c.line;break}}s<0||a<0||!r||!n||r!==n||s>=a||($=function(t){if(h.test(t))return!0;var e=Q(t);return!!(e&&e.fileName===r&&s<=e.line&&e.line<=a)})}},warn:U,deprecated:function(t,e){var r=t+" is deprecated and will be removed in a future version.";return e&&(r+=" Use "+e+" instead."),U(r)},CapturedTrace:X,fireDomEvent:C,fireGlobalEvent:x}}},{"./errors":12,"./util":36}],10:[function(t,e,r){"use strict";e.exports=function(t){function e(){return this.value}function r(){throw this.reason}t.prototype.return=t.prototype.thenReturn=function(r){return r instanceof t&&r.suppressUnhandledRejections(),this._then(e,void 0,void 0,{value:r},void 0)},t.prototype.throw=t.prototype.thenThrow=function(t){return this._then(r,void 0,void 0,{reason:t},void 0)},t.prototype.catchThrow=function(t){if(arguments.length<=1)return this._then(void 0,r,void 0,{reason:t},void 0);var e=arguments[1];return this.caught(t,function(){throw e})},t.prototype.catchReturn=function(r){if(arguments.length<=1)return r instanceof t&&r.suppressUnhandledRejections(),this._then(void 0,e,void 0,{value:r},void 0);var n=arguments[1];return n instanceof t&&n.suppressUnhandledRejections(),this.caught(r,function(){return n})}}},{}],11:[function(t,e,r){"use strict";e.exports=function(t,e){var r=t.reduce,n=t.all;function i(){return n(this)}t.prototype.each=function(t){return r(this,t,e,0)._then(i,void 0,void 0,this,void 0)},t.prototype.mapSeries=function(t){return r(this,t,e,e)},t.each=function(t,n){return r(t,n,e,0)._then(i,void 0,void 0,t,void 0)},t.mapSeries=function(t,n){return r(t,n,e,e)}}},{}],12:[function(t,e,r){"use strict";var n,i,o=t("./es5"),s=o.freeze,a=t("./util"),u=a.inherits,c=a.notEnumerableProp;function l(t,e){function r(n){if(!(this instanceof r))return new r(n);c(this,"message","string"==typeof n?n:e),c(this,"name",t),Error.captureStackTrace?Error.captureStackTrace(this,this.constructor):Error.call(this)}return u(r,Error),r}var f=l("Warning","warning"),h=l("CancellationError","cancellation error"),p=l("TimeoutError","timeout error"),d=l("AggregateError","aggregate error");try{n=TypeError,i=RangeError}catch(t){n=l("TypeError","type error"),i=l("RangeError","range error")}for(var _="join pop push shift unshift slice filter forEach some every map indexOf lastIndexOf reduce reduceRight sort reverse".split(" "),v=0;v<_.length;++v)"function"==typeof Array.prototype[_[v]]&&(d.prototype[_[v]]=Array.prototype[_[v]]);o.defineProperty(d.prototype,"length",{value:0,configurable:!1,writable:!0,enumerable:!0}),d.prototype.isOperational=!0;var y=0;function m(t){if(!(this instanceof m))return new m(t);c(this,"name","OperationalError"),c(this,"message",t),this.cause=t,this.isOperational=!0,t instanceof Error?(c(this,"message",t.message),c(this,"stack",t.stack)):Error.captureStackTrace&&Error.captureStackTrace(this,this.constructor)}d.prototype.toString=function(){var t=Array(4*y+1).join(" "),e="\n"+t+"AggregateError of:\n";y++,t=Array(4*y+1).join(" ");for(var r=0;r<this.length;++r){for(var n=this[r]===this?"[Circular AggregateError]":this[r]+"",i=n.split("\n"),o=0;o<i.length;++o)i[o]=t+i[o];e+=(n=i.join("\n"))+"\n"}return y--,e},u(m,Error);var g=Error.__BluebirdErrorTypes__;g||(g=s({CancellationError:h,TimeoutError:p,OperationalError:m,RejectionError:m,AggregateError:d}),o.defineProperty(Error,"__BluebirdErrorTypes__",{value:g,writable:!1,enumerable:!1,configurable:!1})),e.exports={Error:Error,TypeError:n,RangeError:i,CancellationError:g.CancellationError,OperationalError:g.OperationalError,TimeoutError:g.TimeoutError,AggregateError:g.AggregateError,Warning:f}},{"./es5":13,"./util":36}],13:[function(t,e,r){var n=function(){"use strict";return void 0===this}();if(n)e.exports={freeze:Object.freeze,defineProperty:Object.defineProperty,getDescriptor:Object.getOwnPropertyDescriptor,keys:Object.keys,names:Object.getOwnPropertyNames,getPrototypeOf:Object.getPrototypeOf,isArray:Array.isArray,isES5:n,propertyIsWritable:function(t,e){var r=Object.getOwnPropertyDescriptor(t,e);return!(r&&!r.writable&&!r.set)}};else{var i={}.hasOwnProperty,o={}.toString,s={}.constructor.prototype,a=function(t){var e=[];for(var r in t)i.call(t,r)&&e.push(r);return e};e.exports={isArray:function(t){try{return"[object Array]"===o.call(t)}catch(t){return!1}},keys:a,names:a,defineProperty:function(t,e,r){return t[e]=r.value,t},getDescriptor:function(t,e){return{value:t[e]}},freeze:function(t){return t},getPrototypeOf:function(t){try{return Object(t).constructor.prototype}catch(t){return s}},isES5:n,propertyIsWritable:function(){return!0}}}},{}],14:[function(t,e,r){"use strict";e.exports=function(t,e){var r=t.map;t.prototype.filter=function(t,n){return r(this,t,n,e)},t.filter=function(t,n,i){return r(t,n,i,e)}}},{}],15:[function(t,e,r){"use strict";e.exports=function(e,r,n){var i=t("./util"),o=e.CancellationError,s=i.errorObj,a=t("./catch_filter")(n);function u(t,e,r){this.promise=t,this.type=e,this.handler=r,this.called=!1,this.cancelPromise=null}function c(t){this.finallyHandler=t}function l(t,e){return null!=t.cancelPromise&&(arguments.length>1?t.cancelPromise._reject(e):t.cancelPromise._cancel(),t.cancelPromise=null,!0)}function f(){return p.call(this,this.promise._target()._settledValue())}function h(t){if(!l(this,t))return s.e=t,s}function p(t){var i=this.promise,a=this.handler;if(!this.called){this.called=!0;var u=this.isFinallyHandler()?a.call(i._boundValue()):a.call(i._boundValue(),t);if(u===n)return u;if(void 0!==u){i._setReturnedNonUndefined();var p=r(u,i);if(p instanceof e){if(null!=this.cancelPromise){if(p._isCancelled()){var d=new o("late cancellation observer");return i._attachExtraTrace(d),s.e=d,s}p.isPending()&&p._attachCancellationCallback(new c(this))}return p._then(f,h,void 0,this,void 0)}}}return i.isRejected()?(l(this),s.e=t,s):(l(this),t)}return u.prototype.isFinallyHandler=function(){return 0===this.type},c.prototype._resultCancelled=function(){l(this.finallyHandler)},e.prototype._passThrough=function(t,e,r,n){return"function"!=typeof t?this.then():this._then(r,n,void 0,new u(this,e,t),void 0)},e.prototype.lastly=e.prototype.finally=function(t){return this._passThrough(t,0,p,p)},e.prototype.tap=function(t){return this._passThrough(t,1,p)},e.prototype.tapCatch=function(t){var r=arguments.length;if(1===r)return this._passThrough(t,1,void 0,p);var n,o=new Array(r-1),s=0;for(n=0;n<r-1;++n){var u=arguments[n];if(!i.isObject(u))return e.reject(new TypeError("tapCatch statement predicate: expecting an object but got "+i.classString(u)));o[s++]=u}o.length=s;var c=arguments[n];return this._passThrough(a(o,c,this),1,void 0,p)},u}},{"./catch_filter":7,"./util":36}],16:[function(t,e,r){"use strict";e.exports=function(e,r,n,i,o,s){var a=t("./errors").TypeError,u=t("./util"),c=u.errorObj,l=u.tryCatch,f=[];function h(t,r,i,o){if(s.cancellation()){var a=new e(n),u=this._finallyPromise=new e(n);this._promise=a.lastly(function(){return u}),a._captureStackTrace(),a._setOnCancel(this)}else(this._promise=new e(n))._captureStackTrace();this._stack=o,this._generatorFunction=t,this._receiver=r,this._generator=void 0,this._yieldHandlers="function"==typeof i?[i].concat(f):f,this._yieldedPromise=null,this._cancellationPhase=!1}u.inherits(h,o),h.prototype._isResolved=function(){return null===this._promise},h.prototype._cleanup=function(){this._promise=this._generator=null,s.cancellation()&&null!==this._finallyPromise&&(this._finallyPromise._fulfill(),this._finallyPromise=null)},h.prototype._promiseCancelled=function(){if(!this._isResolved()){var t;if(void 0!==this._generator.return)this._promise._pushContext(),t=l(this._generator.return).call(this._generator,void 0),this._promise._popContext();else{var r=new e.CancellationError("generator .return() sentinel");e.coroutine.returnSentinel=r,this._promise._attachExtraTrace(r),this._promise._pushContext(),t=l(this._generator.throw).call(this._generator,r),this._promise._popContext()}this._cancellationPhase=!0,this._yieldedPromise=null,this._continue(t)}},h.prototype._promiseFulfilled=function(t){this._yieldedPromise=null,this._promise._pushContext();var e=l(this._generator.next).call(this._generator,t);this._promise._popContext(),this._continue(e)},h.prototype._promiseRejected=function(t){this._yieldedPromise=null,this._promise._attachExtraTrace(t),this._promise._pushContext();var e=l(this._generator.throw).call(this._generator,t);this._promise._popContext(),this._continue(e)},h.prototype._resultCancelled=function(){if(this._yieldedPromise instanceof e){var t=this._yieldedPromise;this._yieldedPromise=null,t.cancel()}},h.prototype.promise=function(){return this._promise},h.prototype._run=function(){this._generator=this._generatorFunction.call(this._receiver),this._receiver=this._generatorFunction=void 0,this._promiseFulfilled(void 0)},h.prototype._continue=function(t){var r=this._promise;if(t===c)return this._cleanup(),this._cancellationPhase?r.cancel():r._rejectCallback(t.e,!1);var n=t.value;if(!0===t.done)return this._cleanup(),this._cancellationPhase?r.cancel():r._resolveCallback(n);var o=i(n,this._promise);if(o instanceof e||null!==(o=function(t,r,n){for(var o=0;o<r.length;++o){n._pushContext();var s=l(r[o])(t);if(n._popContext(),s===c){n._pushContext();var a=e.reject(c.e);return n._popContext(),a}var u=i(s,n);if(u instanceof e)return u}return null}(o,this._yieldHandlers,this._promise))){var s=(o=o._target())._bitField;0==(50397184&s)?(this._yieldedPromise=o,o._proxy(this,null)):0!=(33554432&s)?e._async.invoke(this._promiseFulfilled,this,o._value()):0!=(16777216&s)?e._async.invoke(this._promiseRejected,this,o._reason()):this._promiseCancelled()}else this._promiseRejected(new a("A value %s was yielded that could not be treated as a promise\n\n    See http://goo.gl/MqrFmX\n\n".replace("%s",String(n))+"From coroutine:\n"+this._stack.split("\n").slice(1,-7).join("\n")))},e.coroutine=function(t,e){if("function"!=typeof t)throw new a("generatorFunction must be a function\n\n    See http://goo.gl/MqrFmX\n");var r=Object(e).yieldHandler,n=h,i=(new Error).stack;return function(){var e=t.apply(this,arguments),o=new n(void 0,void 0,r,i),s=o.promise();return o._generator=e,o._promiseFulfilled(void 0),s}},e.coroutine.addYieldHandler=function(t){if("function"!=typeof t)throw new a("expecting a function but got "+u.classString(t));f.push(t)},e.spawn=function(t){if(s.deprecated("Promise.spawn()","Promise.coroutine()"),"function"!=typeof t)return r("generatorFunction must be a function\n\n    See http://goo.gl/MqrFmX\n");var n=new h(t,this),i=n.promise();return n._run(e.spawn),i}}},{"./errors":12,"./util":36}],17:[function(t,e,r){"use strict";e.exports=function(e,r,n,i,o,s){var a=t("./util");a.canEvaluate,a.tryCatch,a.errorObj,e.join=function(){var t,e=arguments.length-1;e>0&&"function"==typeof arguments[e]&&(t=arguments[e]);var n=[].slice.call(arguments);t&&n.pop();var i=new r(n).promise();return void 0!==t?i.spread(t):i}}},{"./util":36}],18:[function(t,e,r){"use strict";e.exports=function(e,r,n,i,o,s){var a=e._getDomain,u=t("./util"),c=u.tryCatch,l=u.errorObj,f=e._async;function h(t,e,r,n){this.constructor$(t),this._promise._captureStackTrace();var i=a();this._callback=null===i?e:u.domainBind(i,e),this._preservedValues=n===o?new Array(this.length()):null,this._limit=r,this._inFlight=0,this._queue=[],f.invoke(this._asyncInit,this,void 0)}function p(t,r,i,o){if("function"!=typeof r)return n("expecting a function but got "+u.classString(r));var s=0;if(void 0!==i){if("object"!=typeof i||null===i)return e.reject(new TypeError("options argument must be an object but it is "+u.classString(i)));if("number"!=typeof i.concurrency)return e.reject(new TypeError("'concurrency' must be a number but it is "+u.classString(i.concurrency)));s=i.concurrency}return new h(t,r,s="number"==typeof s&&isFinite(s)&&s>=1?s:0,o).promise()}u.inherits(h,r),h.prototype._asyncInit=function(){this._init$(void 0,-2)},h.prototype._init=function(){},h.prototype._promiseFulfilled=function(t,r){var n=this._values,o=this.length(),a=this._preservedValues,u=this._limit;if(r<0){if(n[r=-1*r-1]=t,u>=1&&(this._inFlight--,this._drainQueue(),this._isResolved()))return!0}else{if(u>=1&&this._inFlight>=u)return n[r]=t,this._queue.push(r),!1;null!==a&&(a[r]=t);var f=this._promise,h=this._callback,p=f._boundValue();f._pushContext();var d=c(h).call(p,t,r,o),_=f._popContext();if(s.checkForgottenReturns(d,_,null!==a?"Promise.filter":"Promise.map",f),d===l)return this._reject(d.e),!0;var v=i(d,this._promise);if(v instanceof e){var y=(v=v._target())._bitField;if(0==(50397184&y))return u>=1&&this._inFlight++,n[r]=v,v._proxy(this,-1*(r+1)),!1;if(0==(33554432&y))return 0!=(16777216&y)?(this._reject(v._reason()),!0):(this._cancel(),!0);d=v._value()}n[r]=d}return++this._totalResolved>=o&&(null!==a?this._filter(n,a):this._resolve(n),!0)},h.prototype._drainQueue=function(){for(var t=this._queue,e=this._limit,r=this._values;t.length>0&&this._inFlight<e;){if(this._isResolved())return;var n=t.pop();this._promiseFulfilled(r[n],n)}},h.prototype._filter=function(t,e){for(var r=e.length,n=new Array(r),i=0,o=0;o<r;++o)t[o]&&(n[i++]=e[o]);n.length=i,this._resolve(n)},h.prototype.preservedValues=function(){return this._preservedValues},e.prototype.map=function(t,e){return p(this,t,e,null)},e.map=function(t,e,r,n){return p(t,e,r,n)}}},{"./util":36}],19:[function(t,e,r){"use strict";e.exports=function(e,r,n,i,o){var s=t("./util"),a=s.tryCatch;e.method=function(t){if("function"!=typeof t)throw new e.TypeError("expecting a function but got "+s.classString(t));return function(){var n=new e(r);n._captureStackTrace(),n._pushContext();var i=a(t).apply(this,arguments),s=n._popContext();return o.checkForgottenReturns(i,s,"Promise.method",n),n._resolveFromSyncValue(i),n}},e.attempt=e.try=function(t){if("function"!=typeof t)return i("expecting a function but got "+s.classString(t));var n,u=new e(r);if(u._captureStackTrace(),u._pushContext(),arguments.length>1){o.deprecated("calling Promise.try with more than 1 argument");var c=arguments[1],l=arguments[2];n=s.isArray(c)?a(t).apply(l,c):a(t).call(l,c)}else n=a(t)();var f=u._popContext();return o.checkForgottenReturns(n,f,"Promise.try",u),u._resolveFromSyncValue(n),u},e.prototype._resolveFromSyncValue=function(t){t===s.errorObj?this._rejectCallback(t.e,!1):this._resolveCallback(t,!0)}}},{"./util":36}],20:[function(t,e,r){"use strict";var n=t("./util"),i=n.maybeWrapAsError,o=t("./errors").OperationalError,s=t("./es5"),a=/^(?:name|message|stack|cause)$/;function u(t){var e;if(function(t){return t instanceof Error&&s.getPrototypeOf(t)===Error.prototype}(t)){(e=new o(t)).name=t.name,e.message=t.message,e.stack=t.stack;for(var r=s.keys(t),i=0;i<r.length;++i){var u=r[i];a.test(u)||(e[u]=t[u])}return e}return n.markAsOriginatingFromRejection(t),t}e.exports=function(t,e){return function(r,n){if(null!==t){if(r){var o=u(i(r));t._attachExtraTrace(o),t._reject(o)}else if(e){var s=[].slice.call(arguments,1);t._fulfill(s)}else t._fulfill(n);t=null}}}},{"./errors":12,"./es5":13,"./util":36}],21:[function(t,e,r){"use strict";e.exports=function(e){var r=t("./util"),n=e._async,i=r.tryCatch,o=r.errorObj;function s(t,e){if(!r.isArray(t))return a.call(this,t,e);var s=i(e).apply(this._boundValue(),[null].concat(t));s===o&&n.throwLater(s.e)}function a(t,e){var r=this._boundValue(),s=void 0===t?i(e).call(r,null):i(e).call(r,null,t);s===o&&n.throwLater(s.e)}function u(t,e){if(!t){var r=new Error(t+"");r.cause=t,t=r}var s=i(e).call(this._boundValue(),t);s===o&&n.throwLater(s.e)}e.prototype.asCallback=e.prototype.nodeify=function(t,e){if("function"==typeof t){var r=a;void 0!==e&&Object(e).spread&&(r=s),this._then(r,u,void 0,this,t)}return this}}},{"./util":36}],22:[function(t,r,n){"use strict";r.exports=function(){var n=function(){return new d("circular promise resolution chain\n\n    See http://goo.gl/MqrFmX\n")},i=function(){return new T.PromiseInspection(this._target())},o=function(t){return T.reject(new d(t))};function s(){}var a,u={},c=t("./util");a=c.isNode?function(){var t=e.domain;return void 0===t&&(t=null),t}:function(){return null},c.notEnumerableProp(T,"_getDomain",a);var l=t("./es5"),f=t("./async"),h=new f;l.defineProperty(T,"_async",{value:h});var p=t("./errors"),d=T.TypeError=p.TypeError;T.RangeError=p.RangeError;var _=T.CancellationError=p.CancellationError;T.TimeoutError=p.TimeoutError,T.OperationalError=p.OperationalError,T.RejectionError=p.OperationalError,T.AggregateError=p.AggregateError;var v=function(){},y={},m={},g=t("./thenables")(T,v),b=t("./promise_array")(T,v,g,o,s),w=t("./context")(T),E=w.create,C=t("./debuggability")(T,w),x=(C.CapturedTrace,t("./finally")(T,g,m)),j=t("./catch_filter")(m),S=t("./nodeback"),R=c.errorObj,k=c.tryCatch;function T(t){t!==v&&function(t,e){if(null==t||t.constructor!==T)throw new d("the promise constructor cannot be invoked directly\n\n    See http://goo.gl/MqrFmX\n");if("function"!=typeof e)throw new d("expecting a function but got "+c.classString(e))}(this,t),this._bitField=0,this._fulfillmentHandler0=void 0,this._rejectionHandler0=void 0,this._promise0=void 0,this._receiver0=void 0,this._resolveFromExecutor(t),this._promiseCreated(),this._fireEvent("promiseCreated",this)}function P(t){this.promise._resolveCallback(t)}function O(t){this.promise._rejectCallback(t,!1)}function A(t){var e=new T(v);e._fulfillmentHandler0=t,e._rejectionHandler0=t,e._promise0=t,e._receiver0=t}return T.prototype.toString=function(){return"[object Promise]"},T.prototype.caught=T.prototype.catch=function(t){var e=arguments.length;if(e>1){var r,n=new Array(e-1),i=0;for(r=0;r<e-1;++r){var s=arguments[r];if(!c.isObject(s))return o("Catch statement predicate: expecting an object but got "+c.classString(s));n[i++]=s}return n.length=i,t=arguments[r],this.then(void 0,j(n,t,this))}return this.then(void 0,t)},T.prototype.reflect=function(){return this._then(i,i,void 0,this,void 0)},T.prototype.then=function(t,e){if(C.warnings()&&arguments.length>0&&"function"!=typeof t&&"function"!=typeof e){var r=".then() only accepts functions but was passed: "+c.classString(t);arguments.length>1&&(r+=", "+c.classString(e)),this._warn(r)}return this._then(t,e,void 0,void 0,void 0)},T.prototype.done=function(t,e){this._then(t,e,void 0,void 0,void 0)._setIsFinal()},T.prototype.spread=function(t){return"function"!=typeof t?o("expecting a function but got "+c.classString(t)):this.all()._then(t,void 0,void 0,y,void 0)},T.prototype.toJSON=function(){var t={isFulfilled:!1,isRejected:!1,fulfillmentValue:void 0,rejectionReason:void 0};return this.isFulfilled()?(t.fulfillmentValue=this.value(),t.isFulfilled=!0):this.isRejected()&&(t.rejectionReason=this.reason(),t.isRejected=!0),t},T.prototype.all=function(){return arguments.length>0&&this._warn(".all() was passed arguments but it does not take any"),new b(this).promise()},T.prototype.error=function(t){return this.caught(c.originatesFromRejection,t)},T.getNewLibraryCopy=r.exports,T.is=function(t){return t instanceof T},T.fromNode=T.fromCallback=function(t){var e=new T(v);e._captureStackTrace();var r=arguments.length>1&&!!Object(arguments[1]).multiArgs,n=k(t)(S(e,r));return n===R&&e._rejectCallback(n.e,!0),e._isFateSealed()||e._setAsyncGuaranteed(),e},T.all=function(t){return new b(t).promise()},T.cast=function(t){var e=g(t);return e instanceof T||((e=new T(v))._captureStackTrace(),e._setFulfilled(),e._rejectionHandler0=t),e},T.resolve=T.fulfilled=T.cast,T.reject=T.rejected=function(t){var e=new T(v);return e._captureStackTrace(),e._rejectCallback(t,!0),e},T.setScheduler=function(t){if("function"!=typeof t)throw new d("expecting a function but got "+c.classString(t));return h.setScheduler(t)},T.prototype._then=function(t,e,r,n,i){var o=void 0!==i,s=o?i:new T(v),u=this._target(),l=u._bitField;o||(s._propagateFrom(this,3),s._captureStackTrace(),void 0===n&&0!=(2097152&this._bitField)&&(n=0!=(50397184&l)?this._boundValue():u===this?void 0:this._boundTo),this._fireEvent("promiseChained",this,s));var f=a();if(0!=(50397184&l)){var p,d,y=u._settlePromiseCtx;0!=(33554432&l)?(d=u._rejectionHandler0,p=t):0!=(16777216&l)?(d=u._fulfillmentHandler0,p=e,u._unsetRejectionIsUnhandled()):(y=u._settlePromiseLateCancellationObserver,d=new _("late cancellation observer"),u._attachExtraTrace(d),p=e),h.invoke(y,u,{handler:null===f?p:"function"==typeof p&&c.domainBind(f,p),promise:s,receiver:n,value:d})}else u._addCallbacks(t,e,s,n,f);return s},T.prototype._length=function(){return 65535&this._bitField},T.prototype._isFateSealed=function(){return 0!=(117506048&this._bitField)},T.prototype._isFollowing=function(){return 67108864==(67108864&this._bitField)},T.prototype._setLength=function(t){this._bitField=-65536&this._bitField|65535&t},T.prototype._setFulfilled=function(){this._bitField=33554432|this._bitField,this._fireEvent("promiseFulfilled",this)},T.prototype._setRejected=function(){this._bitField=16777216|this._bitField,this._fireEvent("promiseRejected",this)},T.prototype._setFollowing=function(){this._bitField=67108864|this._bitField,this._fireEvent("promiseResolved",this)},T.prototype._setIsFinal=function(){this._bitField=4194304|this._bitField},T.prototype._isFinal=function(){return(4194304&this._bitField)>0},T.prototype._unsetCancelled=function(){this._bitField=-65537&this._bitField},T.prototype._setCancelled=function(){this._bitField=65536|this._bitField,this._fireEvent("promiseCancelled",this)},T.prototype._setWillBeCancelled=function(){this._bitField=8388608|this._bitField},T.prototype._setAsyncGuaranteed=function(){h.hasCustomScheduler()||(this._bitField=134217728|this._bitField)},T.prototype._receiverAt=function(t){var e=0===t?this._receiver0:this[4*t-4+3];if(e!==u)return void 0===e&&this._isBound()?this._boundValue():e},T.prototype._promiseAt=function(t){return this[4*t-4+2]},T.prototype._fulfillmentHandlerAt=function(t){return this[4*t-4+0]},T.prototype._rejectionHandlerAt=function(t){return this[4*t-4+1]},T.prototype._boundValue=function(){},T.prototype._migrateCallback0=function(t){t._bitField;var e=t._fulfillmentHandler0,r=t._rejectionHandler0,n=t._promise0,i=t._receiverAt(0);void 0===i&&(i=u),this._addCallbacks(e,r,n,i,null)},T.prototype._migrateCallbackAt=function(t,e){var r=t._fulfillmentHandlerAt(e),n=t._rejectionHandlerAt(e),i=t._promiseAt(e),o=t._receiverAt(e);void 0===o&&(o=u),this._addCallbacks(r,n,i,o,null)},T.prototype._addCallbacks=function(t,e,r,n,i){var o=this._length();if(o>=65531&&(o=0,this._setLength(0)),0===o)this._promise0=r,this._receiver0=n,"function"==typeof t&&(this._fulfillmentHandler0=null===i?t:c.domainBind(i,t)),"function"==typeof e&&(this._rejectionHandler0=null===i?e:c.domainBind(i,e));else{var s=4*o-4;this[s+2]=r,this[s+3]=n,"function"==typeof t&&(this[s+0]=null===i?t:c.domainBind(i,t)),"function"==typeof e&&(this[s+1]=null===i?e:c.domainBind(i,e))}return this._setLength(o+1),o},T.prototype._proxy=function(t,e){this._addCallbacks(void 0,void 0,e,t,null)},T.prototype._resolveCallback=function(t,e){if(0==(117506048&this._bitField)){if(t===this)return this._rejectCallback(n(),!1);var r=g(t,this);if(!(r instanceof T))return this._fulfill(t);e&&this._propagateFrom(r,2);var i=r._target();if(i!==this){var o=i._bitField;if(0==(50397184&o)){var s=this._length();s>0&&i._migrateCallback0(this);for(var a=1;a<s;++a)i._migrateCallbackAt(this,a);this._setFollowing(),this._setLength(0),this._setFollowee(i)}else if(0!=(33554432&o))this._fulfill(i._value());else if(0!=(16777216&o))this._reject(i._reason());else{var u=new _("late cancellation observer");i._attachExtraTrace(u),this._reject(u)}}else this._reject(n())}},T.prototype._rejectCallback=function(t,e,r){var n=c.ensureErrorObject(t),i=n===t;if(!i&&!r&&C.warnings()){var o="a promise was rejected with a non-error: "+c.classString(t);this._warn(o,!0)}this._attachExtraTrace(n,!!e&&i),this._reject(t)},T.prototype._resolveFromExecutor=function(t){if(t!==v){var e=this;this._captureStackTrace(),this._pushContext();var r=!0,n=this._execute(t,function(t){e._resolveCallback(t)},function(t){e._rejectCallback(t,r)});r=!1,this._popContext(),void 0!==n&&e._rejectCallback(n,!0)}},T.prototype._settlePromiseFromHandler=function(t,e,r,n){var i=n._bitField;if(0==(65536&i)){var o;n._pushContext(),e===y?r&&"number"==typeof r.length?o=k(t).apply(this._boundValue(),r):(o=R).e=new d("cannot .spread() a non-array: "+c.classString(r)):o=k(t).call(e,r);var s=n._popContext();0==(65536&(i=n._bitField))&&(o===m?n._reject(r):o===R?n._rejectCallback(o.e,!1):(C.checkForgottenReturns(o,s,"",n,this),n._resolveCallback(o)))}},T.prototype._target=function(){for(var t=this;t._isFollowing();)t=t._followee();return t},T.prototype._followee=function(){return this._rejectionHandler0},T.prototype._setFollowee=function(t){this._rejectionHandler0=t},T.prototype._settlePromise=function(t,e,r,n){var o=t instanceof T,a=this._bitField,u=0!=(134217728&a);0!=(65536&a)?(o&&t._invokeInternalOnCancel(),r instanceof x&&r.isFinallyHandler()?(r.cancelPromise=t,k(e).call(r,n)===R&&t._reject(R.e)):e===i?t._fulfill(i.call(r)):r instanceof s?r._promiseCancelled(t):o||t instanceof b?t._cancel():r.cancel()):"function"==typeof e?o?(u&&t._setAsyncGuaranteed(),this._settlePromiseFromHandler(e,r,n,t)):e.call(r,n,t):r instanceof s?r._isResolved()||(0!=(33554432&a)?r._promiseFulfilled(n,t):r._promiseRejected(n,t)):o&&(u&&t._setAsyncGuaranteed(),0!=(33554432&a)?t._fulfill(n):t._reject(n))},T.prototype._settlePromiseLateCancellationObserver=function(t){var e=t.handler,r=t.promise,n=t.receiver,i=t.value;"function"==typeof e?r instanceof T?this._settlePromiseFromHandler(e,n,i,r):e.call(n,i,r):r instanceof T&&r._reject(i)},T.prototype._settlePromiseCtx=function(t){this._settlePromise(t.promise,t.handler,t.receiver,t.value)},T.prototype._settlePromise0=function(t,e,r){var n=this._promise0,i=this._receiverAt(0);this._promise0=void 0,this._receiver0=void 0,this._settlePromise(n,t,i,e)},T.prototype._clearCallbackDataAtIndex=function(t){var e=4*t-4;this[e+2]=this[e+3]=this[e+0]=this[e+1]=void 0},T.prototype._fulfill=function(t){var e=this._bitField;if(!((117506048&e)>>>16)){if(t===this){var r=n();return this._attachExtraTrace(r),this._reject(r)}this._setFulfilled(),this._rejectionHandler0=t,(65535&e)>0&&(0!=(134217728&e)?this._settlePromises():h.settlePromises(this))}},T.prototype._reject=function(t){var e=this._bitField;if(!((117506048&e)>>>16)){if(this._setRejected(),this._fulfillmentHandler0=t,this._isFinal())return h.fatalError(t,c.isNode);(65535&e)>0?h.settlePromises(this):this._ensurePossibleRejectionHandled()}},T.prototype._fulfillPromises=function(t,e){for(var r=1;r<t;r++){var n=this._fulfillmentHandlerAt(r),i=this._promiseAt(r),o=this._receiverAt(r);this._clearCallbackDataAtIndex(r),this._settlePromise(i,n,o,e)}},T.prototype._rejectPromises=function(t,e){for(var r=1;r<t;r++){var n=this._rejectionHandlerAt(r),i=this._promiseAt(r),o=this._receiverAt(r);this._clearCallbackDataAtIndex(r),this._settlePromise(i,n,o,e)}},T.prototype._settlePromises=function(){var t=this._bitField,e=65535&t;if(e>0){if(0!=(16842752&t)){var r=this._fulfillmentHandler0;this._settlePromise0(this._rejectionHandler0,r,t),this._rejectPromises(e,r)}else{var n=this._rejectionHandler0;this._settlePromise0(this._fulfillmentHandler0,n,t),this._fulfillPromises(e,n)}this._setLength(0)}this._clearCancellationData()},T.prototype._settledValue=function(){var t=this._bitField;return 0!=(33554432&t)?this._rejectionHandler0:0!=(16777216&t)?this._fulfillmentHandler0:void 0},T.defer=T.pending=function(){return C.deprecated("Promise.defer","new Promise"),{promise:new T(v),resolve:P,reject:O}},c.notEnumerableProp(T,"_makeSelfResolutionError",n),t("./method")(T,v,g,o,C),t("./bind")(T,v,g,C),t("./cancel")(T,b,o,C),t("./direct_resolve")(T),t("./synchronous_inspection")(T),t("./join")(T,b,g,v,h,a),T.Promise=T,T.version="3.5.1",t("./map.js")(T,b,o,g,v,C),t("./call_get.js")(T),t("./using.js")(T,o,g,E,v,C),t("./timers.js")(T,v,C),t("./generators.js")(T,o,v,g,s,C),t("./nodeify.js")(T),t("./promisify.js")(T,v),t("./props.js")(T,b,g,o),t("./race.js")(T,v,g,o),t("./reduce.js")(T,b,o,g,v,C),t("./settle.js")(T,b,C),t("./some.js")(T,b,o),t("./filter.js")(T,v),t("./each.js")(T,v),t("./any.js")(T),c.toFastProperties(T),c.toFastProperties(T.prototype),A({a:1}),A({b:2}),A({c:3}),A(1),A(function(){}),A(void 0),A(!1),A(new T(v)),C.setBounds(f.firstLineError,c.lastLineError),T}},{"./any.js":1,"./async":2,"./bind":3,"./call_get.js":5,"./cancel":6,"./catch_filter":7,"./context":8,"./debuggability":9,"./direct_resolve":10,"./each.js":11,"./errors":12,"./es5":13,"./filter.js":14,"./finally":15,"./generators.js":16,"./join":17,"./map.js":18,"./method":19,"./nodeback":20,"./nodeify.js":21,"./promise_array":23,"./promisify.js":24,"./props.js":25,"./race.js":27,"./reduce.js":28,"./settle.js":30,"./some.js":31,"./synchronous_inspection":32,"./thenables":33,"./timers.js":34,"./using.js":35,"./util":36}],23:[function(t,e,r){"use strict";e.exports=function(e,r,n,i,o){var s=t("./util");function a(t){var n=this._promise=new e(r);t instanceof e&&n._propagateFrom(t,3),n._setOnCancel(this),this._values=t,this._length=0,this._totalResolved=0,this._init(void 0,-2)}return s.isArray,s.inherits(a,o),a.prototype.length=function(){return this._length},a.prototype.promise=function(){return this._promise},a.prototype._init=function t(r,o){var a=n(this._values,this._promise);if(a instanceof e){var u=(a=a._target())._bitField;if(this._values=a,0==(50397184&u))return this._promise._setAsyncGuaranteed(),a._then(t,this._reject,void 0,this,o);if(0==(33554432&u))return 0!=(16777216&u)?this._reject(a._reason()):this._cancel();a=a._value()}if(null!==(a=s.asArray(a)))0!==a.length?this._iterate(a):-5===o?this._resolveEmptyArray():this._resolve(function(t){switch(o){case-2:return[];case-3:return{};case-6:return new Map}}());else{var c=i("expecting an array or an iterable object but got "+s.classString(a)).reason();this._promise._rejectCallback(c,!1)}},a.prototype._iterate=function(t){var r=this.getActualLength(t.length);this._length=r,this._values=this.shouldCopyValues()?new Array(r):this._values;for(var i=this._promise,o=!1,s=null,a=0;a<r;++a){var u=n(t[a],i);s=u instanceof e?(u=u._target())._bitField:null,o?null!==s&&u.suppressUnhandledRejections():null!==s?0==(50397184&s)?(u._proxy(this,a),this._values[a]=u):o=0!=(33554432&s)?this._promiseFulfilled(u._value(),a):0!=(16777216&s)?this._promiseRejected(u._reason(),a):this._promiseCancelled(a):o=this._promiseFulfilled(u,a)}o||i._setAsyncGuaranteed()},a.prototype._isResolved=function(){return null===this._values},a.prototype._resolve=function(t){this._values=null,this._promise._fulfill(t)},a.prototype._cancel=function(){!this._isResolved()&&this._promise._isCancellable()&&(this._values=null,this._promise._cancel())},a.prototype._reject=function(t){this._values=null,this._promise._rejectCallback(t,!1)},a.prototype._promiseFulfilled=function(t,e){return this._values[e]=t,++this._totalResolved>=this._length&&(this._resolve(this._values),!0)},a.prototype._promiseCancelled=function(){return this._cancel(),!0},a.prototype._promiseRejected=function(t){return this._totalResolved++,this._reject(t),!0},a.prototype._resultCancelled=function(){if(!this._isResolved()){var t=this._values;if(this._cancel(),t instanceof e)t.cancel();else for(var r=0;r<t.length;++r)t[r]instanceof e&&t[r].cancel()}},a.prototype.shouldCopyValues=function(){return!0},a.prototype.getActualLength=function(t){return t},a}},{"./util":36}],24:[function(t,e,r){"use strict";e.exports=function(e,r){var n={},i=t("./util"),o=t("./nodeback"),s=i.withAppended,a=i.maybeWrapAsError,u=i.canEvaluate,c=t("./errors").TypeError,l={__isPromisified__:!0},f=new RegExp("^(?:"+["arity","length","name","arguments","caller","callee","prototype","__isPromisified__"].join("|")+")$"),h=function(t){return i.isIdentifier(t)&&"_"!==t.charAt(0)&&"constructor"!==t};function p(t){return!f.test(t)}function d(t){try{return!0===t.__isPromisified__}catch(t){return!1}}function _(t,e,r){var n=i.getDataPropertyOrDefault(t,e+r,l);return!!n&&d(n)}function v(t,e,r,n){for(var o=i.inheritedDataKeys(t),s=[],a=0;a<o.length;++a){var u=o[a],l=t[u],f=n===h||h(u,l,t);"function"!=typeof l||d(l)||_(t,u,e)||!n(u,l,t,f)||s.push(u,l)}return function(t,e,r){for(var n=0;n<t.length;n+=2){var i=t[n];if(r.test(i))for(var o=i.replace(r,""),s=0;s<t.length;s+=2)if(t[s]===o)throw new c("Cannot promisify an API that has normal methods with '%s'-suffix\n\n    See http://goo.gl/MqrFmX\n".replace("%s",e))}}(s,e,r),s}var y=function(t){return t.replace(/([$])/,"\\$")},m=u?void 0:function(t,u,c,l,f,h){var p=function(){return this}(),d=t;function _(){var i=u;u===n&&(i=this);var c=new e(r);c._captureStackTrace();var l="string"==typeof d&&this!==p?this[d]:t,f=o(c,h);try{l.apply(i,s(arguments,f))}catch(t){c._rejectCallback(a(t),!0,!0)}return c._isFateSealed()||c._setAsyncGuaranteed(),c}return"string"==typeof d&&(t=l),i.notEnumerableProp(_,"__isPromisified__",!0),_};function g(t,e,r,o,s){for(var a=new RegExp(y(e)+"$"),u=v(t,e,a,r),c=0,l=u.length;c<l;c+=2){var f=u[c],h=u[c+1],p=f+e;if(o===m)t[p]=m(f,n,f,h,e,s);else{var d=o(h,function(){return m(f,n,f,h,e,s)});i.notEnumerableProp(d,"__isPromisified__",!0),t[p]=d}}return i.toFastProperties(t),t}e.promisify=function(t,e){if("function"!=typeof t)throw new c("expecting a function but got "+i.classString(t));if(d(t))return t;var r=void 0===(e=Object(e)).context?n:e.context,o=!!e.multiArgs,s=function(t,e,r){return m(t,e,void 0,t,null,o)}(t,r);return i.copyDescriptors(t,s,p),s},e.promisifyAll=function(t,e){if("function"!=typeof t&&"object"!=typeof t)throw new c("the target of promisifyAll must be an object or a function\n\n    See http://goo.gl/MqrFmX\n");var r=!!(e=Object(e)).multiArgs,n=e.suffix;"string"!=typeof n&&(n="Async");var o=e.filter;"function"!=typeof o&&(o=h);var s=e.promisifier;if("function"!=typeof s&&(s=m),!i.isIdentifier(n))throw new RangeError("suffix must be a valid identifier\n\n    See http://goo.gl/MqrFmX\n");for(var a=i.inheritedDataKeys(t),u=0;u<a.length;++u){var l=t[a[u]];"constructor"!==a[u]&&i.isClass(l)&&(g(l.prototype,n,o,s,r),g(l,n,o,s,r))}return g(t,n,o,s,r)}}},{"./errors":12,"./nodeback":20,"./util":36}],25:[function(t,e,r){"use strict";e.exports=function(e,r,n,i){var o,s=t("./util"),a=s.isObject,u=t("./es5");"function"==typeof Map&&(o=Map);var c=function(){var t=0,e=0;function r(r,n){this[t]=r,this[t+e]=n,t++}return function(n){e=n.size,t=0;var i=new Array(2*n.size);return n.forEach(r,i),i}}();function l(t){var e,r=!1;if(void 0!==o&&t instanceof o)e=c(t),r=!0;else{var n=u.keys(t),i=n.length;e=new Array(2*i);for(var s=0;s<i;++s){var a=n[s];e[s]=t[a],e[s+i]=a}}this.constructor$(e),this._isMap=r,this._init$(void 0,r?-6:-3)}function f(t){var r,o=n(t);return a(o)?(r=o instanceof e?o._then(e.props,void 0,void 0,void 0,void 0):new l(o).promise(),o instanceof e&&r._propagateFrom(o,2),r):i("cannot await properties of a non-object\n\n    See http://goo.gl/MqrFmX\n")}s.inherits(l,r),l.prototype._init=function(){},l.prototype._promiseFulfilled=function(t,e){if(this._values[e]=t,++this._totalResolved>=this._length){var r;if(this._isMap)r=function(t){for(var e=new o,r=t.length/2|0,n=0;n<r;++n){var i=t[r+n],s=t[n];e.set(i,s)}return e}(this._values);else{r={};for(var n=this.length(),i=0,s=this.length();i<s;++i)r[this._values[i+n]]=this._values[i]}return this._resolve(r),!0}return!1},l.prototype.shouldCopyValues=function(){return!1},l.prototype.getActualLength=function(t){return t>>1},e.prototype.props=function(){return f(this)},e.props=function(t){return f(t)}}},{"./es5":13,"./util":36}],26:[function(t,e,r){"use strict";function n(t){this._capacity=t,this._length=0,this._front=0}n.prototype._willBeOverCapacity=function(t){return this._capacity<t},n.prototype._pushOne=function(t){var e=this.length();this._checkCapacity(e+1),this[this._front+e&this._capacity-1]=t,this._length=e+1},n.prototype.push=function(t,e,r){var n=this.length()+3;if(this._willBeOverCapacity(n))return this._pushOne(t),this._pushOne(e),void this._pushOne(r);var i=this._front+n-3;this._checkCapacity(n);var o=this._capacity-1;this[i+0&o]=t,this[i+1&o]=e,this[i+2&o]=r,this._length=n},n.prototype.shift=function(){var t=this._front,e=this[t];return this[t]=void 0,this._front=t+1&this._capacity-1,this._length--,e},n.prototype.length=function(){return this._length},n.prototype._checkCapacity=function(t){this._capacity<t&&this._resizeTo(this._capacity<<1)},n.prototype._resizeTo=function(t){var e=this._capacity;this._capacity=t,function(t,e,r,n,i){for(var o=0;o<i;++o)r[o+n]=t[o+0],t[o+0]=void 0}(this,0,this,e,this._front+this._length&e-1)},e.exports=n},{}],27:[function(t,e,r){"use strict";e.exports=function(e,r,n,i){var o=t("./util"),s=function(t){return t.then(function(e){return a(e,t)})};function a(t,a){var u=n(t);if(u instanceof e)return s(u);if(null===(t=o.asArray(t)))return i("expecting an array or an iterable object but got "+o.classString(t));var c=new e(r);void 0!==a&&c._propagateFrom(a,3);for(var l=c._fulfill,f=c._reject,h=0,p=t.length;h<p;++h){var d=t[h];(void 0!==d||h in t)&&e.cast(d)._then(l,f,void 0,c,null)}return c}e.race=function(t){return a(t,void 0)},e.prototype.race=function(){return a(this,void 0)}}},{"./util":36}],28:[function(t,e,r){"use strict";e.exports=function(e,r,n,i,o,s){var a=e._getDomain,u=t("./util"),c=u.tryCatch;function l(t,r,n,i){this.constructor$(t);var s=a();this._fn=null===s?r:u.domainBind(s,r),void 0!==n&&(n=e.resolve(n))._attachCancellationCallback(this),this._initialValue=n,this._currentCancellable=null,this._eachValues=i===o?Array(this._length):0===i?null:void 0,this._promise._captureStackTrace(),this._init$(void 0,-5)}function f(t,e){this.isFulfilled()?e._resolve(t):e._reject(t)}function h(t,e,r,i){return"function"!=typeof e?n("expecting a function but got "+u.classString(e)):new l(t,e,r,i).promise()}function p(t){this.accum=t,this.array._gotAccum(t);var r=i(this.value,this.array._promise);return r instanceof e?(this.array._currentCancellable=r,r._then(d,void 0,void 0,this,void 0)):d.call(this,r)}function d(t){var r,n=this.array,i=n._promise,o=c(n._fn);i._pushContext(),(r=void 0!==n._eachValues?o.call(i._boundValue(),t,this.index,this.length):o.call(i._boundValue(),this.accum,t,this.index,this.length))instanceof e&&(n._currentCancellable=r);var a=i._popContext();return s.checkForgottenReturns(r,a,void 0!==n._eachValues?"Promise.each":"Promise.reduce",i),r}u.inherits(l,r),l.prototype._gotAccum=function(t){void 0!==this._eachValues&&null!==this._eachValues&&t!==o&&this._eachValues.push(t)},l.prototype._eachComplete=function(t){return null!==this._eachValues&&this._eachValues.push(t),this._eachValues},l.prototype._init=function(){},l.prototype._resolveEmptyArray=function(){this._resolve(void 0!==this._eachValues?this._eachValues:this._initialValue)},l.prototype.shouldCopyValues=function(){return!1},l.prototype._resolve=function(t){this._promise._resolveCallback(t),this._values=null},l.prototype._resultCancelled=function(t){if(t===this._initialValue)return this._cancel();this._isResolved()||(this._resultCancelled$(),this._currentCancellable instanceof e&&this._currentCancellable.cancel(),this._initialValue instanceof e&&this._initialValue.cancel())},l.prototype._iterate=function(t){var r,n;this._values=t;var i=t.length;if(void 0!==this._initialValue?(r=this._initialValue,n=0):(r=e.resolve(t[0]),n=1),this._currentCancellable=r,!r.isRejected())for(;n<i;++n){var o={accum:null,value:t[n],index:n,length:i,array:this};r=r._then(p,void 0,void 0,o,void 0)}void 0!==this._eachValues&&(r=r._then(this._eachComplete,void 0,void 0,this,void 0)),r._then(f,f,void 0,r,this)},e.prototype.reduce=function(t,e){return h(this,t,e,null)},e.reduce=function(t,e,r,n){return h(t,e,r,n)}}},{"./util":36}],29:[function(t,i,o){"use strict";var s,a=t("./util"),u=a.getNativePromise();if(a.isNode&&"undefined"==typeof MutationObserver){var c=r.setImmediate,l=e.nextTick;s=a.isRecentNode?function(t){c.call(r,t)}:function(t){l.call(e,t)}}else if("function"==typeof u&&"function"==typeof u.resolve){var f=u.resolve();s=function(t){f.then(t)}}else s="undefined"==typeof MutationObserver||"undefined"!=typeof window&&window.navigator&&(window.navigator.standalone||window.cordova)?void 0!==n?function(t){n(t)}:"undefined"!=typeof setTimeout?function(t){setTimeout(t,0)}:function(){throw new Error("No async scheduler available\n\n    See http://goo.gl/MqrFmX\n")}:function(){var t=document.createElement("div"),e={attributes:!0},r=!1,n=document.createElement("div");return new MutationObserver(function(){t.classList.toggle("foo"),r=!1}).observe(n,e),function(i){var o=new MutationObserver(function(){o.disconnect(),i()});o.observe(t,e),r||(r=!0,n.classList.toggle("foo"))}}();i.exports=s},{"./util":36}],30:[function(t,e,r){"use strict";e.exports=function(e,r,n){var i=e.PromiseInspection;function o(t){this.constructor$(t)}t("./util").inherits(o,r),o.prototype._promiseResolved=function(t,e){return this._values[t]=e,++this._totalResolved>=this._length&&(this._resolve(this._values),!0)},o.prototype._promiseFulfilled=function(t,e){var r=new i;return r._bitField=33554432,r._settledValueField=t,this._promiseResolved(e,r)},o.prototype._promiseRejected=function(t,e){var r=new i;return r._bitField=16777216,r._settledValueField=t,this._promiseResolved(e,r)},e.settle=function(t){return n.deprecated(".settle()",".reflect()"),new o(t).promise()},e.prototype.settle=function(){return e.settle(this)}}},{"./util":36}],31:[function(t,e,r){"use strict";e.exports=function(e,r,n){var i=t("./util"),o=t("./errors").RangeError,s=t("./errors").AggregateError,a=i.isArray,u={};function c(t){this.constructor$(t),this._howMany=0,this._unwrap=!1,this._initialized=!1}function l(t,e){if((0|e)!==e||e<0)return n("expecting a positive integer\n\n    See http://goo.gl/MqrFmX\n");var r=new c(t),i=r.promise();return r.setHowMany(e),r.init(),i}i.inherits(c,r),c.prototype._init=function(){if(this._initialized)if(0!==this._howMany){this._init$(void 0,-5);var t=a(this._values);!this._isResolved()&&t&&this._howMany>this._canPossiblyFulfill()&&this._reject(this._getRangeError(this.length()))}else this._resolve([])},c.prototype.init=function(){this._initialized=!0,this._init()},c.prototype.setUnwrap=function(){this._unwrap=!0},c.prototype.howMany=function(){return this._howMany},c.prototype.setHowMany=function(t){this._howMany=t},c.prototype._promiseFulfilled=function(t){return this._addFulfilled(t),this._fulfilled()===this.howMany()&&(this._values.length=this.howMany(),1===this.howMany()&&this._unwrap?this._resolve(this._values[0]):this._resolve(this._values),!0)},c.prototype._promiseRejected=function(t){return this._addRejected(t),this._checkOutcome()},c.prototype._promiseCancelled=function(){return this._values instanceof e||null==this._values?this._cancel():(this._addRejected(u),this._checkOutcome())},c.prototype._checkOutcome=function(){if(this.howMany()>this._canPossiblyFulfill()){for(var t=new s,e=this.length();e<this._values.length;++e)this._values[e]!==u&&t.push(this._values[e]);return t.length>0?this._reject(t):this._cancel(),!0}return!1},c.prototype._fulfilled=function(){return this._totalResolved},c.prototype._rejected=function(){return this._values.length-this.length()},c.prototype._addRejected=function(t){this._values.push(t)},c.prototype._addFulfilled=function(t){this._values[this._totalResolved++]=t},c.prototype._canPossiblyFulfill=function(){return this.length()-this._rejected()},c.prototype._getRangeError=function(t){var e="Input array must contain at least "+this._howMany+" items but contains only "+t+" items";return new o(e)},c.prototype._resolveEmptyArray=function(){this._reject(this._getRangeError(0))},e.some=function(t,e){return l(t,e)},e.prototype.some=function(t){return l(this,t)},e._SomePromiseArray=c}},{"./errors":12,"./util":36}],32:[function(t,e,r){"use strict";e.exports=function(t){function e(t){void 0!==t?(t=t._target(),this._bitField=t._bitField,this._settledValueField=t._isFateSealed()?t._settledValue():void 0):(this._bitField=0,this._settledValueField=void 0)}e.prototype._settledValue=function(){return this._settledValueField};var r=e.prototype.value=function(){if(!this.isFulfilled())throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\n\n    See http://goo.gl/MqrFmX\n");return this._settledValue()},n=e.prototype.error=e.prototype.reason=function(){if(!this.isRejected())throw new TypeError("cannot get rejection reason of a non-rejected promise\n\n    See http://goo.gl/MqrFmX\n");return this._settledValue()},i=e.prototype.isFulfilled=function(){return 0!=(33554432&this._bitField)},o=e.prototype.isRejected=function(){return 0!=(16777216&this._bitField)},s=e.prototype.isPending=function(){return 0==(50397184&this._bitField)},a=e.prototype.isResolved=function(){return 0!=(50331648&this._bitField)};e.prototype.isCancelled=function(){return 0!=(8454144&this._bitField)},t.prototype.__isCancelled=function(){return 65536==(65536&this._bitField)},t.prototype._isCancelled=function(){return this._target().__isCancelled()},t.prototype.isCancelled=function(){return 0!=(8454144&this._target()._bitField)},t.prototype.isPending=function(){return s.call(this._target())},t.prototype.isRejected=function(){return o.call(this._target())},t.prototype.isFulfilled=function(){return i.call(this._target())},t.prototype.isResolved=function(){return a.call(this._target())},t.prototype.value=function(){return r.call(this._target())},t.prototype.reason=function(){var t=this._target();return t._unsetRejectionIsUnhandled(),n.call(t)},t.prototype._value=function(){return this._settledValue()},t.prototype._reason=function(){return this._unsetRejectionIsUnhandled(),this._settledValue()},t.PromiseInspection=e}},{}],33:[function(t,e,r){"use strict";e.exports=function(e,r){var n=t("./util"),i=n.errorObj,o=n.isObject,s={}.hasOwnProperty;return function(t,a){if(o(t)){if(t instanceof e)return t;var u=function(t){try{return function(t){return t.then}(t)}catch(t){return i.e=t,i}}(t);if(u===i){a&&a._pushContext();var c=e.reject(u.e);return a&&a._popContext(),c}if("function"==typeof u)return function(t){try{return s.call(t,"_promise0")}catch(t){return!1}}(t)?(c=new e(r),t._then(c._fulfill,c._reject,void 0,c,null),c):function(t,o,s){var a=new e(r),u=a;s&&s._pushContext(),a._captureStackTrace(),s&&s._popContext();var c=!0,l=n.tryCatch(o).call(t,function(t){a&&(a._resolveCallback(t),a=null)},function(t){a&&(a._rejectCallback(t,c,!0),a=null)});return c=!1,a&&l===i&&(a._rejectCallback(l.e,!0,!0),a=null),u}(t,u,a)}return t}}},{"./util":36}],34:[function(t,e,r){"use strict";e.exports=function(e,r,n){var i=t("./util"),o=e.TimeoutError;function s(t){this.handle=t}s.prototype._resultCancelled=function(){clearTimeout(this.handle)};var a=function(t){return u(+this).thenReturn(t)},u=e.delay=function(t,i){var o,u;return void 0!==i?(o=e.resolve(i)._then(a,null,null,t,void 0),n.cancellation()&&i instanceof e&&o._setOnCancel(i)):(o=new e(r),u=setTimeout(function(){o._fulfill()},+t),n.cancellation()&&o._setOnCancel(new s(u)),o._captureStackTrace()),o._setAsyncGuaranteed(),o};function c(t){return clearTimeout(this.handle),t}function l(t){throw clearTimeout(this.handle),t}e.prototype.delay=function(t){return u(t,this)},e.prototype.timeout=function(t,e){var r,a;t=+t;var u=new s(setTimeout(function(){r.isPending()&&function(t,e,r){var n;n="string"!=typeof e?e instanceof Error?e:new o("operation timed out"):new o(e),i.markAsOriginatingFromRejection(n),t._attachExtraTrace(n),t._reject(n),null!=r&&r.cancel()}(r,e,a)},t));return n.cancellation()?(a=this.then(),(r=a._then(c,l,void 0,u,void 0))._setOnCancel(u)):r=this._then(c,l,void 0,u,void 0),r}}},{"./util":36}],35:[function(t,e,r){"use strict";e.exports=function(e,r,n,i,o,s){var a=t("./util"),u=t("./errors").TypeError,c=t("./util").inherits,l=a.errorObj,f=a.tryCatch,h={};function p(t){setTimeout(function(){throw t},0)}function d(t,r){var i=0,s=t.length,a=new e(o);return function o(){if(i>=s)return a._fulfill();var u=function(t){var e=n(t);return e!==t&&"function"==typeof t._isDisposable&&"function"==typeof t._getDisposer&&t._isDisposable()&&e._setDisposable(t._getDisposer()),e}(t[i++]);if(u instanceof e&&u._isDisposable()){try{u=n(u._getDisposer().tryDispose(r),t.promise)}catch(t){return p(t)}if(u instanceof e)return u._then(o,p,null,null,null)}o()}(),a}function _(t,e,r){this._data=t,this._promise=e,this._context=r}function v(t,e,r){this.constructor$(t,e,r)}function y(t){return _.isDisposer(t)?(this.resources[this.index]._setDisposable(t),t.promise()):t}function m(t){this.length=t,this.promise=null,this[t-1]=null}_.prototype.data=function(){return this._data},_.prototype.promise=function(){return this._promise},_.prototype.resource=function(){return this.promise().isFulfilled()?this.promise().value():h},_.prototype.tryDispose=function(t){var e=this.resource(),r=this._context;void 0!==r&&r._pushContext();var n=e!==h?this.doDispose(e,t):null;return void 0!==r&&r._popContext(),this._promise._unsetDisposable(),this._data=null,n},_.isDisposer=function(t){return null!=t&&"function"==typeof t.resource&&"function"==typeof t.tryDispose},c(v,_),v.prototype.doDispose=function(t,e){return this.data().call(t,t,e)},m.prototype._resultCancelled=function(){for(var t=this.length,r=0;r<t;++r){var n=this[r];n instanceof e&&n.cancel()}},e.using=function(){var t=arguments.length;if(t<2)return r("you must pass at least 2 arguments to Promise.using");var i,o=arguments[t-1];if("function"!=typeof o)return r("expecting a function but got "+a.classString(o));var u=!0;2===t&&Array.isArray(arguments[0])?(t=(i=arguments[0]).length,u=!1):(i=arguments,t--);for(var c=new m(t),h=0;h<t;++h){var p=i[h];if(_.isDisposer(p)){var v=p;(p=p.promise())._setDisposable(v)}else{var g=n(p);g instanceof e&&(p=g._then(y,null,null,{resources:c,index:h},void 0))}c[h]=p}var b=new Array(c.length);for(h=0;h<b.length;++h)b[h]=e.resolve(c[h]).reflect();var w=e.all(b).then(function(t){for(var e=0;e<t.length;++e){var r=t[e];if(r.isRejected())return l.e=r.error(),l;if(!r.isFulfilled())return void w.cancel();t[e]=r.value()}E._pushContext(),o=f(o);var n=u?o.apply(void 0,t):o(t),i=E._popContext();return s.checkForgottenReturns(n,i,"Promise.using",E),n}),E=w.lastly(function(){var t=new e.PromiseInspection(w);return d(c,t)});return c.promise=E,E._setOnCancel(c),E},e.prototype._setDisposable=function(t){this._bitField=131072|this._bitField,this._disposer=t},e.prototype._isDisposable=function(){return(131072&this._bitField)>0},e.prototype._getDisposer=function(){return this._disposer},e.prototype._unsetDisposable=function(){this._bitField=-131073&this._bitField,this._disposer=void 0},e.prototype.disposer=function(t){if("function"==typeof t)return new v(t,this,i());throw new u}}},{"./errors":12,"./util":36}],36:[function(t,n,i){"use strict";var o,s=t("./es5"),a="undefined"==typeof navigator,u={e:{}},c="undefined"!=typeof self?self:"undefined"!=typeof window?window:void 0!==r?r:void 0!==this?this:null;function l(){try{var t=o;return o=null,t.apply(this,arguments)}catch(t){return u.e=t,u}}function f(t){return null==t||!0===t||!1===t||"string"==typeof t||"number"==typeof t}function h(t,e,r){if(f(t))return t;var n={value:r,configurable:!0,enumerable:!1,writable:!0};return s.defineProperty(t,e,n),t}var p=function(){var t=[Array.prototype,Object.prototype,Function.prototype],e=function(e){for(var r=0;r<t.length;++r)if(t[r]===e)return!0;return!1};if(s.isES5){var r=Object.getOwnPropertyNames;return function(t){for(var n=[],i=Object.create(null);null!=t&&!e(t);){var o;try{o=r(t)}catch(t){return n}for(var a=0;a<o.length;++a){var u=o[a];if(!i[u]){i[u]=!0;var c=Object.getOwnPropertyDescriptor(t,u);null!=c&&null==c.get&&null==c.set&&n.push(u)}}t=s.getPrototypeOf(t)}return n}}var n={}.hasOwnProperty;return function(r){if(e(r))return[];var i=[];t:for(var o in r)if(n.call(r,o))i.push(o);else{for(var s=0;s<t.length;++s)if(n.call(t[s],o))continue t;i.push(o)}return i}}(),d=/this\s*\.\s*\S+\s*=/,_=/^[a-z$_][a-z$_0-9]*$/i;function v(t){try{return t+""}catch(t){return"[no string representation]"}}function y(t){return t instanceof Error||null!==t&&"object"==typeof t&&"string"==typeof t.message&&"string"==typeof t.name}function m(t){return y(t)&&s.propertyIsWritable(t,"stack")}var g="stack"in new Error?function(t){return m(t)?t:new Error(v(t))}:function(t){if(m(t))return t;try{throw new Error(v(t))}catch(t){return t}};function b(t){return{}.toString.call(t)}var w=function(t){return s.isArray(t)?t:null};if("undefined"!=typeof Symbol&&Symbol.iterator){var E="function"==typeof Array.from?function(t){return Array.from(t)}:function(t){for(var e,r=[],n=t[Symbol.iterator]();!(e=n.next()).done;)r.push(e.value);return r};w=function(t){return s.isArray(t)?t:null!=t&&"function"==typeof t[Symbol.iterator]?E(t):null}}var C=void 0!==e&&"[object process]"===b(e).toLowerCase(),x=void 0!==e&&void 0!==e.env,j={isClass:function(t){try{if("function"==typeof t){var e=s.names(t.prototype),r=s.isES5&&e.length>1,n=e.length>0&&!(1===e.length&&"constructor"===e[0]),i=d.test(t+"")&&s.names(t).length>0;if(r||n||i)return!0}return!1}catch(t){return!1}},isIdentifier:function(t){return _.test(t)},inheritedDataKeys:p,getDataPropertyOrDefault:function(t,e,r){if(!s.isES5)return{}.hasOwnProperty.call(t,e)?t[e]:void 0;var n=Object.getOwnPropertyDescriptor(t,e);return null!=n?null==n.get&&null==n.set?n.value:r:void 0},thrower:function(t){throw t},isArray:s.isArray,asArray:w,notEnumerableProp:h,isPrimitive:f,isObject:function(t){return"function"==typeof t||"object"==typeof t&&null!==t},isError:y,canEvaluate:a,errorObj:u,tryCatch:function(t){return o=t,l},inherits:function(t,e){var r={}.hasOwnProperty;function n(){for(var n in this.constructor=t,this.constructor$=e,e.prototype)r.call(e.prototype,n)&&"$"!==n.charAt(n.length-1)&&(this[n+"$"]=e.prototype[n])}return n.prototype=e.prototype,t.prototype=new n,t.prototype},withAppended:function(t,e){var r,n=t.length,i=new Array(n+1);for(r=0;r<n;++r)i[r]=t[r];return i[r]=e,i},maybeWrapAsError:function(t){return f(t)?new Error(v(t)):t},toFastProperties:function(t){function e(){}e.prototype=t;for(var r=8;r--;)new e;return t},filledRange:function(t,e,r){for(var n=new Array(t),i=0;i<t;++i)n[i]=e+i+r;return n},toString:v,canAttachTrace:m,ensureErrorObject:g,originatesFromRejection:function(t){return null!=t&&(t instanceof Error.__BluebirdErrorTypes__.OperationalError||!0===t.isOperational)},markAsOriginatingFromRejection:function(t){try{h(t,"isOperational",!0)}catch(t){}},classString:b,copyDescriptors:function(t,e,r){for(var n=s.names(t),i=0;i<n.length;++i){var o=n[i];if(r(o))try{s.defineProperty(e,o,s.getDescriptor(t,o))}catch(t){}}},hasDevTools:"undefined"!=typeof chrome&&chrome&&"function"==typeof chrome.loadTimes,isNode:C,hasEnvVariables:x,env:function(t){return x?e.env[t]:void 0},global:c,getNativePromise:function(){if("function"==typeof Promise)try{var t=new Promise(function(){});if("[object Promise]"==={}.toString.call(t))return Promise}catch(t){}},domainBind:function(t,e){return t.bind(e)}};j.isRecentNode=j.isNode&&function(){var t=e.versions.node.split(".").map(Number);return 0===t[0]&&t[1]>10||t[0]>0}(),j.isNode&&j.toFastProperties(e);try{throw new Error}catch(t){j.lastLineError=t}n.exports=j},{"./es5":13}]},{},[4])(4),"undefined"!=typeof window&&null!==window?window.P=window.Promise:"undefined"!=typeof self&&null!==self&&(self.P=self.Promise)}).call(this,r(4),r(0),r(11).setImmediate)},function(t,e,r){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.default=function(t,e){if(!e.eol&&t)for(var r=0,n=t.length;r<n;r++)if("\r"===t[r]){if("\n"===t[r+1]){e.eol="\r\n";break}if(t[r+1]){e.eol="\r";break}}else if("\n"===t[r]){e.eol="\n";break}return e.eol||"\n"}},function(t,e,r){var n=r(65),i=r(73);t.exports=function(t,e){var r=i(t,e);return n(r)?r:void 0}},function(t,e,r){var n=r(19).Symbol;t.exports=n},function(t,e,r){var n=r(67),i="object"==typeof self&&self&&self.Object===Object&&self,o=n||i||Function("return this")();t.exports=o},function(t,e){t.exports=function(t){var e=typeof t;return null!=t&&("object"==e||"function"==e)}},function(t,e){var r=Array.isArray;t.exports=r},function(t,e,r){var n=r(30),i=r(76);t.exports=function(t){return"symbol"==typeof t||i(t)&&"[object Symbol]"==n(t)}},function(t,e,r){"use strict";(function(e,n){var i=r(6);t.exports=g;var o,s=r(37);g.ReadableState=m,r(12).EventEmitter;var a=function(t,e){return t.listeners(e).length},u=r(24),c=r(7).Buffer,l=e.Uint8Array||function(){},f=r(5);f.inherits=r(2);var h=r(41),p=void 0;p=h&&h.debuglog?h.debuglog("stream"):function(){};var d,_=r(42),v=r(25);f.inherits(g,u);var y=["error","close","destroy","pause","resume"];function m(t,e){o=o||r(1),t=t||{};var n=e instanceof o;this.objectMode=!!t.objectMode,n&&(this.objectMode=this.objectMode||!!t.readableObjectMode);var i=t.highWaterMark,s=t.readableHighWaterMark,a=this.objectMode?16:16384;this.highWaterMark=i||0===i?i:n&&(s||0===s)?s:a,this.highWaterMark=Math.floor(this.highWaterMark),this.buffer=new _,this.length=0,this.pipes=null,this.pipesCount=0,this.flowing=null,this.ended=!1,this.endEmitted=!1,this.reading=!1,this.sync=!0,this.needReadable=!1,this.emittedReadable=!1,this.readableListening=!1,this.resumeScheduled=!1,this.destroyed=!1,this.defaultEncoding=t.defaultEncoding||"utf8",this.awaitDrain=0,this.readingMore=!1,this.decoder=null,this.encoding=null,t.encoding&&(d||(d=r(26).StringDecoder),this.decoder=new d(t.encoding),this.encoding=t.encoding)}function g(t){if(o=o||r(1),!(this instanceof g))return new g(t);this._readableState=new m(t,this),this.readable=!0,t&&("function"==typeof t.read&&(this._read=t.read),"function"==typeof t.destroy&&(this._destroy=t.destroy)),u.call(this)}function b(t,e,r,n,i){var o,s=t._readableState;return null===e?(s.reading=!1,function(t,e){if(!e.ended){if(e.decoder){var r=e.decoder.end();r&&r.length&&(e.buffer.push(r),e.length+=e.objectMode?1:r.length)}e.ended=!0,x(t)}}(t,s)):(i||(o=function(t,e){var r;return function(t){return c.isBuffer(t)||t instanceof l}(e)||"string"==typeof e||void 0===e||t.objectMode||(r=new TypeError("Invalid non-string/buffer chunk")),r}(s,e)),o?t.emit("error",o):s.objectMode||e&&e.length>0?("string"==typeof e||s.objectMode||Object.getPrototypeOf(e)===c.prototype||(e=function(t){return c.from(t)}(e)),n?s.endEmitted?t.emit("error",new Error("stream.unshift() after end event")):w(t,s,e,!0):s.ended?t.emit("error",new Error("stream.push() after EOF")):(s.reading=!1,s.decoder&&!r?(e=s.decoder.write(e),s.objectMode||0!==e.length?w(t,s,e,!1):S(t,s)):w(t,s,e,!1))):n||(s.reading=!1)),function(t){return!t.ended&&(t.needReadable||t.length<t.highWaterMark||0===t.length)}(s)}function w(t,e,r,n){e.flowing&&0===e.length&&!e.sync?(t.emit("data",r),t.read(0)):(e.length+=e.objectMode?1:r.length,n?e.buffer.unshift(r):e.buffer.push(r),e.needReadable&&x(t)),S(t,e)}Object.defineProperty(g.prototype,"destroyed",{get:function(){return void 0!==this._readableState&&this._readableState.destroyed},set:function(t){this._readableState&&(this._readableState.destroyed=t)}}),g.prototype.destroy=v.destroy,g.prototype._undestroy=v.undestroy,g.prototype._destroy=function(t,e){this.push(null),e(t)},g.prototype.push=function(t,e){var r,n=this._readableState;return n.objectMode?r=!0:"string"==typeof t&&((e=e||n.defaultEncoding)!==n.encoding&&(t=c.from(t,e),e=""),r=!0),b(this,t,e,!1,r)},g.prototype.unshift=function(t){return b(this,t,null,!0,!1)},g.prototype.isPaused=function(){return!1===this._readableState.flowing},g.prototype.setEncoding=function(t){return d||(d=r(26).StringDecoder),this._readableState.decoder=new d(t),this._readableState.encoding=t,this};var E=8388608;function C(t,e){return t<=0||0===e.length&&e.ended?0:e.objectMode?1:t!=t?e.flowing&&e.length?e.buffer.head.data.length:e.length:(t>e.highWaterMark&&(e.highWaterMark=function(t){return t>=E?t=E:(t--,t|=t>>>1,t|=t>>>2,t|=t>>>4,t|=t>>>8,t|=t>>>16,t++),t}(t)),t<=e.length?t:e.ended?e.length:(e.needReadable=!0,0))}function x(t){var e=t._readableState;e.needReadable=!1,e.emittedReadable||(p("emitReadable",e.flowing),e.emittedReadable=!0,e.sync?i.nextTick(j,t):j(t))}function j(t){p("emit readable"),t.emit("readable"),P(t)}function S(t,e){e.readingMore||(e.readingMore=!0,i.nextTick(R,t,e))}function R(t,e){for(var r=e.length;!e.reading&&!e.flowing&&!e.ended&&e.length<e.highWaterMark&&(p("maybeReadMore read 0"),t.read(0),r!==e.length);)r=e.length;e.readingMore=!1}function k(t){p("readable nexttick read 0"),t.read(0)}function T(t,e){e.reading||(p("resume read 0"),t.read(0)),e.resumeScheduled=!1,e.awaitDrain=0,t.emit("resume"),P(t),e.flowing&&!e.reading&&t.read(0)}function P(t){var e=t._readableState;for(p("flow",e.flowing);e.flowing&&null!==t.read(););}function O(t,e){return 0===e.length?null:(e.objectMode?r=e.buffer.shift():!t||t>=e.length?(r=e.decoder?e.buffer.join(""):1===e.buffer.length?e.buffer.head.data:e.buffer.concat(e.length),e.buffer.clear()):r=function(t,e,r){var n;return t<e.head.data.length?(n=e.head.data.slice(0,t),e.head.data=e.head.data.slice(t)):n=t===e.head.data.length?e.shift():r?function(t,e){var r=e.head,n=1,i=r.data;for(t-=i.length;r=r.next;){var o=r.data,s=t>o.length?o.length:t;if(s===o.length?i+=o:i+=o.slice(0,t),0==(t-=s)){s===o.length?(++n,r.next?e.head=r.next:e.head=e.tail=null):(e.head=r,r.data=o.slice(s));break}++n}return e.length-=n,i}(t,e):function(t,e){var r=c.allocUnsafe(t),n=e.head,i=1;for(n.data.copy(r),t-=n.data.length;n=n.next;){var o=n.data,s=t>o.length?o.length:t;if(o.copy(r,r.length-t,0,s),0==(t-=s)){s===o.length?(++i,n.next?e.head=n.next:e.head=e.tail=null):(e.head=n,n.data=o.slice(s));break}++i}return e.length-=i,r}(t,e),n}(t,e.buffer,e.decoder),r);var r}function A(t){var e=t._readableState;if(e.length>0)throw new Error('"endReadable()" called on non-empty stream');e.endEmitted||(e.ended=!0,i.nextTick(F,e,t))}function F(t,e){t.endEmitted||0!==t.length||(t.endEmitted=!0,e.readable=!1,e.emit("end"))}function L(t,e){for(var r=0,n=t.length;r<n;r++)if(t[r]===e)return r;return-1}g.prototype.read=function(t){p("read",t),t=parseInt(t,10);var e=this._readableState,r=t;if(0!==t&&(e.emittedReadable=!1),0===t&&e.needReadable&&(e.length>=e.highWaterMark||e.ended))return p("read: emitReadable",e.length,e.ended),0===e.length&&e.ended?A(this):x(this),null;if(0===(t=C(t,e))&&e.ended)return 0===e.length&&A(this),null;var n,i=e.needReadable;return p("need readable",i),(0===e.length||e.length-t<e.highWaterMark)&&p("length less than watermark",i=!0),e.ended||e.reading?p("reading or ended",i=!1):i&&(p("do read"),e.reading=!0,e.sync=!0,0===e.length&&(e.needReadable=!0),this._read(e.highWaterMark),e.sync=!1,e.reading||(t=C(r,e))),null===(n=t>0?O(t,e):null)?(e.needReadable=!0,t=0):e.length-=t,0===e.length&&(e.ended||(e.needReadable=!0),r!==t&&e.ended&&A(this)),null!==n&&this.emit("data",n),n},g.prototype._read=function(t){this.emit("error",new Error("_read() is not implemented"))},g.prototype.pipe=function(t,e){var r=this,o=this._readableState;switch(o.pipesCount){case 0:o.pipes=t;break;case 1:o.pipes=[o.pipes,t];break;default:o.pipes.push(t)}o.pipesCount+=1,p("pipe count=%d opts=%j",o.pipesCount,e);var u=e&&!1===e.end||t===n.stdout||t===n.stderr?m:c;function c(){p("onend"),t.end()}o.endEmitted?i.nextTick(u):r.once("end",u),t.on("unpipe",function e(n,i){p("onunpipe"),n===r&&i&&!1===i.hasUnpiped&&(i.hasUnpiped=!0,p("cleanup"),t.removeListener("close",v),t.removeListener("finish",y),t.removeListener("drain",l),t.removeListener("error",_),t.removeListener("unpipe",e),r.removeListener("end",c),r.removeListener("end",m),r.removeListener("data",d),f=!0,!o.awaitDrain||t._writableState&&!t._writableState.needDrain||l())});var l=function(t){return function(){var e=t._readableState;p("pipeOnDrain",e.awaitDrain),e.awaitDrain&&e.awaitDrain--,0===e.awaitDrain&&a(t,"data")&&(e.flowing=!0,P(t))}}(r);t.on("drain",l);var f=!1,h=!1;function d(e){p("ondata"),h=!1,!1!==t.write(e)||h||((1===o.pipesCount&&o.pipes===t||o.pipesCount>1&&-1!==L(o.pipes,t))&&!f&&(p("false write response, pause",r._readableState.awaitDrain),r._readableState.awaitDrain++,h=!0),r.pause())}function _(e){p("onerror",e),m(),t.removeListener("error",_),0===a(t,"error")&&t.emit("error",e)}function v(){t.removeListener("finish",y),m()}function y(){p("onfinish"),t.removeListener("close",v),m()}function m(){p("unpipe"),r.unpipe(t)}return r.on("data",d),function(t,e,r){if("function"==typeof t.prependListener)return t.prependListener(e,r);t._events&&t._events[e]?s(t._events[e])?t._events[e].unshift(r):t._events[e]=[r,t._events[e]]:t.on(e,r)}(t,"error",_),t.once("close",v),t.once("finish",y),t.emit("pipe",r),o.flowing||(p("pipe resume"),r.resume()),t},g.prototype.unpipe=function(t){var e=this._readableState,r={hasUnpiped:!1};if(0===e.pipesCount)return this;if(1===e.pipesCount)return t&&t!==e.pipes?this:(t||(t=e.pipes),e.pipes=null,e.pipesCount=0,e.flowing=!1,t&&t.emit("unpipe",this,r),this);if(!t){var n=e.pipes,i=e.pipesCount;e.pipes=null,e.pipesCount=0,e.flowing=!1;for(var o=0;o<i;o++)n[o].emit("unpipe",this,r);return this}var s=L(e.pipes,t);return-1===s?this:(e.pipes.splice(s,1),e.pipesCount-=1,1===e.pipesCount&&(e.pipes=e.pipes[0]),t.emit("unpipe",this,r),this)},g.prototype.on=function(t,e){var r=u.prototype.on.call(this,t,e);if("data"===t)!1!==this._readableState.flowing&&this.resume();else if("readable"===t){var n=this._readableState;n.endEmitted||n.readableListening||(n.readableListening=n.needReadable=!0,n.emittedReadable=!1,n.reading?n.length&&x(this):i.nextTick(k,this))}return r},g.prototype.addListener=g.prototype.on,g.prototype.resume=function(){var t=this._readableState;return t.flowing||(p("resume"),t.flowing=!0,function(t,e){e.resumeScheduled||(e.resumeScheduled=!0,i.nextTick(T,t,e))}(this,t)),this},g.prototype.pause=function(){return p("call pause flowing=%j",this._readableState.flowing),!1!==this._readableState.flowing&&(p("pause"),this._readableState.flowing=!1,this.emit("pause")),this},g.prototype.wrap=function(t){var e=this,r=this._readableState,n=!1;for(var i in t.on("end",function(){if(p("wrapped end"),r.decoder&&!r.ended){var t=r.decoder.end();t&&t.length&&e.push(t)}e.push(null)}),t.on("data",function(i){p("wrapped data"),r.decoder&&(i=r.decoder.write(i)),(!r.objectMode||null!==i&&void 0!==i)&&(r.objectMode||i&&i.length)&&(e.push(i)||(n=!0,t.pause()))}),t)void 0===this[i]&&"function"==typeof t[i]&&(this[i]=function(e){return function(){return t[e].apply(t,arguments)}}(i));for(var o=0;o<y.length;o++)t.on(y[o],this.emit.bind(this,y[o]));return this._read=function(e){p("wrapped _read",e),n&&(n=!1,t.resume())},this},Object.defineProperty(g.prototype,"readableHighWaterMark",{enumerable:!1,get:function(){return this._readableState.highWaterMark}}),g._fromList=O}).call(this,r(0),r(4))},function(t,e,r){t.exports=r(12).EventEmitter},function(t,e,r){"use strict";var n=r(6);function i(t,e){t.emit("error",e)}t.exports={destroy:function(t,e){var r=this,o=this._readableState&&this._readableState.destroyed,s=this._writableState&&this._writableState.destroyed;return o||s?(e?e(t):!t||this._writableState&&this._writableState.errorEmitted||n.nextTick(i,this,t),this):(this._readableState&&(this._readableState.destroyed=!0),this._writableState&&(this._writableState.destroyed=!0),this._destroy(t||null,function(t){!e&&t?(n.nextTick(i,r,t),r._writableState&&(r._writableState.errorEmitted=!0)):e&&e(t)}),this)},undestroy:function(){this._readableState&&(this._readableState.destroyed=!1,this._readableState.reading=!1,this._readableState.ended=!1,this._readableState.endEmitted=!1),this._writableState&&(this._writableState.destroyed=!1,this._writableState.ended=!1,this._writableState.ending=!1,this._writableState.finished=!1,this._writableState.errorEmitted=!1)}}},function(t,e,r){"use strict";var n=r(7).Buffer,i=n.isEncoding||function(t){switch((t=""+t)&&t.toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":case"raw":return!0;default:return!1}};function o(t){var e;switch(this.encoding=function(t){var e=function(t){if(!t)return"utf8";for(var e;;)switch(t){case"utf8":case"utf-8":return"utf8";case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return"utf16le";case"latin1":case"binary":return"latin1";case"base64":case"ascii":case"hex":return t;default:if(e)return;t=(""+t).toLowerCase(),e=!0}}(t);if("string"!=typeof e&&(n.isEncoding===i||!i(t)))throw new Error("Unknown encoding: "+t);return e||t}(t),this.encoding){case"utf16le":this.text=u,this.end=c,e=4;break;case"utf8":this.fillLast=a,e=4;break;case"base64":this.text=l,this.end=f,e=3;break;default:return this.write=h,void(this.end=p)}this.lastNeed=0,this.lastTotal=0,this.lastChar=n.allocUnsafe(e)}function s(t){return t<=127?0:t>>5==6?2:t>>4==14?3:t>>3==30?4:t>>6==2?-1:-2}function a(t){var e=this.lastTotal-this.lastNeed,r=function(t,e,r){if(128!=(192&e[0]))return t.lastNeed=0,"�";if(t.lastNeed>1&&e.length>1){if(128!=(192&e[1]))return t.lastNeed=1,"�";if(t.lastNeed>2&&e.length>2&&128!=(192&e[2]))return t.lastNeed=2,"�"}}(this,t);return void 0!==r?r:this.lastNeed<=t.length?(t.copy(this.lastChar,e,0,this.lastNeed),this.lastChar.toString(this.encoding,0,this.lastTotal)):(t.copy(this.lastChar,e,0,t.length),void(this.lastNeed-=t.length))}function u(t,e){if((t.length-e)%2==0){var r=t.toString("utf16le",e);if(r){var n=r.charCodeAt(r.length-1);if(n>=55296&&n<=56319)return this.lastNeed=2,this.lastTotal=4,this.lastChar[0]=t[t.length-2],this.lastChar[1]=t[t.length-1],r.slice(0,-1)}return r}return this.lastNeed=1,this.lastTotal=2,this.lastChar[0]=t[t.length-1],t.toString("utf16le",e,t.length-1)}function c(t){var e=t&&t.length?this.write(t):"";if(this.lastNeed){var r=this.lastTotal-this.lastNeed;return e+this.lastChar.toString("utf16le",0,r)}return e}function l(t,e){var r=(t.length-e)%3;return 0===r?t.toString("base64",e):(this.lastNeed=3-r,this.lastTotal=3,1===r?this.lastChar[0]=t[t.length-1]:(this.lastChar[0]=t[t.length-2],this.lastChar[1]=t[t.length-1]),t.toString("base64",e,t.length-r))}function f(t){var e=t&&t.length?this.write(t):"";return this.lastNeed?e+this.lastChar.toString("base64",0,3-this.lastNeed):e}function h(t){return t.toString(this.encoding)}function p(t){return t&&t.length?this.write(t):""}e.StringDecoder=o,o.prototype.write=function(t){if(0===t.length)return"";var e,r;if(this.lastNeed){if(void 0===(e=this.fillLast(t)))return"";r=this.lastNeed,this.lastNeed=0}else r=0;return r<t.length?e?e+this.text(t,r):this.text(t,r):e||""},o.prototype.end=function(t){var e=t&&t.length?this.write(t):"";return this.lastNeed?e+"�":e},o.prototype.text=function(t,e){var r=function(t,e,r){var n=e.length-1;if(n<r)return 0;var i=s(e[n]);return i>=0?(i>0&&(t.lastNeed=i-1),i):--n<r||-2===i?0:(i=s(e[n]))>=0?(i>0&&(t.lastNeed=i-2),i):--n<r||-2===i?0:(i=s(e[n]))>=0?(i>0&&(2===i?i=0:t.lastNeed=i-3),i):0}(this,t,e);if(!this.lastNeed)return t.toString("utf8",e);this.lastTotal=r;var n=t.length-(r-this.lastNeed);return t.copy(this.lastChar,0,n),t.toString("utf8",e,n)},o.prototype.fillLast=function(t){if(this.lastNeed<=t.length)return t.copy(this.lastChar,this.lastTotal-this.lastNeed,0,this.lastNeed),this.lastChar.toString(this.encoding,0,this.lastTotal);t.copy(this.lastChar,this.lastTotal-this.lastNeed,0,t.length),this.lastNeed-=t.length}},function(t,e,r){"use strict";t.exports=o;var n=r(1),i=r(5);function o(t){if(!(this instanceof o))return new o(t);n.call(this,t),this._transformState={afterTransform:function(t,e){var r=this._transformState;r.transforming=!1;var n=r.writecb;if(!n)return this.emit("error",new Error("write callback called multiple times"));r.writechunk=null,r.writecb=null,null!=e&&this.push(e),n(t);var i=this._readableState;i.reading=!1,(i.needReadable||i.length<i.highWaterMark)&&this._read(i.highWaterMark)}.bind(this),needTransform:!1,transforming:!1,writecb:null,writechunk:null,writeencoding:null},this._readableState.needReadable=!0,this._readableState.sync=!1,t&&("function"==typeof t.transform&&(this._transform=t.transform),"function"==typeof t.flush&&(this._flush=t.flush)),this.on("prefinish",s)}function s(){var t=this;"function"==typeof this._flush?this._flush(function(e,r){a(t,e,r)}):a(this,null,null)}function a(t,e,r){if(e)return t.emit("error",e);if(null!=r&&t.push(r),t._writableState.length)throw new Error("Calling transform done when ws.length != 0");if(t._transformState.transforming)throw new Error("Calling transform done when still transforming");return t.push(null)}i.inherits=r(2),i.inherits(o,n),o.prototype.push=function(t,e){return this._transformState.needTransform=!1,n.prototype.push.call(this,t,e)},o.prototype._transform=function(t,e,r){throw new Error("_transform() is not implemented")},o.prototype._write=function(t,e,r){var n=this._transformState;if(n.writecb=r,n.writechunk=t,n.writeencoding=e,!n.transforming){var i=this._readableState;(n.needTransform||i.needReadable||i.length<i.highWaterMark)&&this._read(i.highWaterMark)}},o.prototype._read=function(t){var e=this._transformState;null!==e.writechunk&&e.writecb&&!e.transforming?(e.transforming=!0,this._transform(e.writechunk,e.writeencoding,e.afterTransform)):e.needTransform=!0},o.prototype._destroy=function(t,e){var r=this;n.prototype._destroy.call(this,t,function(t){e(t),r.emit("close")})}},function(t,e,r){"use strict";(function(t){Object.defineProperty(e,"__esModule",{value:!0}),e.bufFromString=function(e){var r=t.byteLength(e),n=t.allocUnsafe?t.allocUnsafe(r):new t(r);return n.write(e),n},e.emptyBuffer=function(){return t.allocUnsafe?t.allocUnsafe(0):new t(0)},e.filterArray=function(t,e){for(var r=[],n=0;n<t.length;n++)e.indexOf(n)>-1&&r.push(t[n]);return r},e.trimLeft=String.prototype.trimLeft?function(t){return t.trimLeft()}:function(t){return t.replace(/^\s+/,"")},e.trimRight=String.prototype.trimRight?function(t){return t.trimRight()}:function(t){return t.replace(/\s+$/,"")}}).call(this,r(3).Buffer)},function(t,e,r){"use strict";var n=this&&this.__extends||function(){var t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var r in e)e.hasOwnProperty(r)&&(t[r]=e[r])};return function(e,r){function n(){this.constructor=e}t(e,r),e.prototype=null===r?Object.create(r):(n.prototype=r.prototype,new n)}}();Object.defineProperty(e,"__esModule",{value:!0});var i=function(t){function e(e,r,n){var i=t.call(this,"Error: "+e+". JSON Line number: "+r+(n?" near: "+n:""))||this;return i.err=e,i.line=r,i.extra=n,i.name="CSV Parse Error",i}return n(e,t),e.column_mismatched=function(t,r){return new e("column_mismatched",t,r)},e.unclosed_quote=function(t,r){return new e("unclosed_quote",t,r)},e.fromJSON=function(t){return new e(t.err,t.line,t.extra)},e.prototype.toJSON=function(){return{err:this.err,line:this.line,extra:this.extra}},e}(Error);e.default=i},function(t,e,r){var n=r(18),i=r(68),o=r(69),s=n?n.toStringTag:void 0;t.exports=function(t){return null==t?void 0===t?"[object Undefined]":"[object Null]":s&&s in Object(t)?i(t):o(t)}},function(t,e){t.exports=function(t,e){return t===e||t!=t&&e!=e}},function(t,e,r){t.exports=r(33)},function(t,e,r){"use strict";var n=r(34),i=function(t,e){return new n.Converter(t,e)};i.csv=i,i.Converter=n.Converter,t.exports=i},function(t,e,r){"use strict";(function(t){var n=this&&this.__extends||function(){var t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var r in e)e.hasOwnProperty(r)&&(t[r]=e[r])};return function(e,r){function n(){this.constructor=e}t(e,r),e.prototype=null===r?Object.create(r):(n.prototype=r.prototype,new n)}}(),i=this&&this.__importDefault||function(t){return t&&t.__esModule?t:{default:t}};Object.defineProperty(e,"__esModule",{value:!0});var o=r(36),s=r(50),a=r(51),u=i(r(15)),c=r(52),l=r(105),f=function(e){function i(r,n){void 0===n&&(n={});var i=e.call(this,n)||this;return i.options=n,i.params=s.mergeParams(r),i.runtime=a.initParseRuntime(i),i.result=new l.Result(i),i.processor=new c.ProcessorLocal(i),i.once("error",function(e){t(function(){i.result.processError(e),i.emit("done",e)})}),i.once("done",function(){i.processor.destroy()}),i}return n(i,e),i.prototype.preRawData=function(t){return this.runtime.preRawDataHook=t,this},i.prototype.preFileLine=function(t){return this.runtime.preFileLineHook=t,this},i.prototype.subscribe=function(t,e,r){return this.parseRuntime.subscribe={onNext:t,onError:e,onCompleted:r},this},i.prototype.fromFile=function(t,e){var n=this,i=r(!function(){var t=new Error("Cannot find module 'fs'");throw t.code="MODULE_NOT_FOUND",t}());return i.exists(t,function(r){r?i.createReadStream(t,e).pipe(n):n.emit("error",new Error("File does not exist. Check to make sure the file path to your csv is correct."))}),this},i.prototype.fromStream=function(t){return t.pipe(this),this},i.prototype.fromString=function(t){t.toString();var e=new o.Readable,r=0;return e._read=function(e){if(r>=t.length)this.push(null);else{var n=t.substr(r,e);this.push(n),r+=e}},this.fromStream(e)},i.prototype.then=function(t,e){var r=this;return new u.default(function(n,i){r.parseRuntime.then={onfulfilled:function(e){n(t?t(e):e)},onrejected:function(t){e?n(e(t)):i(t)}}})},Object.defineProperty(i.prototype,"parseParam",{get:function(){return this.params},enumerable:!0,configurable:!0}),Object.defineProperty(i.prototype,"parseRuntime",{get:function(){return this.runtime},enumerable:!0,configurable:!0}),i.prototype._transform=function(t,e,r){var n=this;this.processor.process(t).then(function(t){if(t.length>0)return n.runtime.started=!0,n.result.processResult(t)}).then(function(){n.emit("drained"),r()},function(t){n.runtime.hasError=!0,n.runtime.error=t,n.emit("error",t),r()})},i.prototype._flush=function(t){var e=this;this.processor.flush().then(function(t){if(t.length>0)return e.result.processResult(t)}).then(function(){e.processEnd(t)},function(r){e.emit("error",r),t()})},i.prototype.processEnd=function(t){this.result.endProcess(),this.emit("done"),t()},Object.defineProperty(i.prototype,"parsedLineNumber",{get:function(){return this.runtime.parsedLineNumber},enumerable:!0,configurable:!0}),i}(o.Transform);e.Converter=f}).call(this,r(11).setImmediate)},function(t,e,r){(function(t,e){!function(t,r){"use strict";if(!t.setImmediate){var n,i=1,o={},s=!1,a=t.document,u=Object.getPrototypeOf&&Object.getPrototypeOf(t);u=u&&u.setTimeout?u:t,"[object process]"==={}.toString.call(t.process)?n=function(t){e.nextTick(function(){l(t)})}:function(){if(t.postMessage&&!t.importScripts){var e=!0,r=t.onmessage;return t.onmessage=function(){e=!1},t.postMessage("","*"),t.onmessage=r,e}}()?function(){var e="setImmediate$"+Math.random()+"$",r=function(r){r.source===t&&"string"==typeof r.data&&0===r.data.indexOf(e)&&l(+r.data.slice(e.length))};t.addEventListener?t.addEventListener("message",r,!1):t.attachEvent("onmessage",r),n=function(r){t.postMessage(e+r,"*")}}():t.MessageChannel?function(){var t=new MessageChannel;t.port1.onmessage=function(t){l(t.data)},n=function(e){t.port2.postMessage(e)}}():a&&"onreadystatechange"in a.createElement("script")?function(){var t=a.documentElement;n=function(e){var r=a.createElement("script");r.onreadystatechange=function(){l(e),r.onreadystatechange=null,t.removeChild(r),r=null},t.appendChild(r)}}():n=function(t){setTimeout(l,0,t)},u.setImmediate=function(t){"function"!=typeof t&&(t=new Function(""+t));for(var e=new Array(arguments.length-1),r=0;r<e.length;r++)e[r]=arguments[r+1];var s={callback:t,args:e};return o[i]=s,n(i),i++},u.clearImmediate=c}function c(t){delete o[t]}function l(t){if(s)setTimeout(l,0,t);else{var e=o[t];if(e){s=!0;try{!function(t){var e=t.callback,n=t.args;switch(n.length){case 0:e();break;case 1:e(n[0]);break;case 2:e(n[0],n[1]);break;case 3:e(n[0],n[1],n[2]);break;default:e.apply(r,n)}}(e)}finally{c(t),s=!1}}}}}("undefined"==typeof self?void 0===t?this:t:self)}).call(this,r(0),r(4))},function(t,e,r){t.exports=i;var n=r(12).EventEmitter;function i(){n.call(this)}r(2)(i,n),i.Readable=r(13),i.Writable=r(46),i.Duplex=r(47),i.Transform=r(48),i.PassThrough=r(49),i.Stream=i,i.prototype.pipe=function(t,e){var r=this;function i(e){t.writable&&!1===t.write(e)&&r.pause&&r.pause()}function o(){r.readable&&r.resume&&r.resume()}r.on("data",i),t.on("drain",o),t._isStdio||e&&!1===e.end||(r.on("end",a),r.on("close",u));var s=!1;function a(){s||(s=!0,t.end())}function u(){s||(s=!0,"function"==typeof t.destroy&&t.destroy())}function c(t){if(l(),0===n.listenerCount(this,"error"))throw t}function l(){r.removeListener("data",i),t.removeListener("drain",o),r.removeListener("end",a),r.removeListener("close",u),r.removeListener("error",c),t.removeListener("error",c),r.removeListener("end",l),r.removeListener("close",l),t.removeListener("close",l)}return r.on("error",c),t.on("error",c),r.on("end",l),r.on("close",l),t.on("close",l),t.emit("pipe",r),t}},function(t,e){var r={}.toString;t.exports=Array.isArray||function(t){return"[object Array]"==r.call(t)}},function(t,e,r){"use strict";e.byteLength=function(t){var e=c(t),r=e[0],n=e[1];return 3*(r+n)/4-n},e.toByteArray=function(t){for(var e,r=c(t),n=r[0],s=r[1],a=new o(3*(n+s)/4-s),u=0,l=s>0?n-4:n,f=0;f<l;f+=4)e=i[t.charCodeAt(f)]<<18|i[t.charCodeAt(f+1)]<<12|i[t.charCodeAt(f+2)]<<6|i[t.charCodeAt(f+3)],a[u++]=e>>16&255,a[u++]=e>>8&255,a[u++]=255&e;return 2===s&&(e=i[t.charCodeAt(f)]<<2|i[t.charCodeAt(f+1)]>>4,a[u++]=255&e),1===s&&(e=i[t.charCodeAt(f)]<<10|i[t.charCodeAt(f+1)]<<4|i[t.charCodeAt(f+2)]>>2,a[u++]=e>>8&255,a[u++]=255&e),a},e.fromByteArray=function(t){for(var e,r=t.length,i=r%3,o=[],s=0,a=r-i;s<a;s+=16383)o.push(f(t,s,s+16383>a?a:s+16383));return 1===i?(e=t[r-1],o.push(n[e>>2]+n[e<<4&63]+"==")):2===i&&(e=(t[r-2]<<8)+t[r-1],o.push(n[e>>10]+n[e>>4&63]+n[e<<2&63]+"=")),o.join("")};for(var n=[],i=[],o="undefined"!=typeof Uint8Array?Uint8Array:Array,s="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",a=0,u=s.length;a<u;++a)n[a]=s[a],i[s.charCodeAt(a)]=a;function c(t){var e=t.length;if(e%4>0)throw new Error("Invalid string. Length must be a multiple of 4");var r=t.indexOf("=");return-1===r&&(r=e),[r,r===e?0:4-r%4]}function l(t){return n[t>>18&63]+n[t>>12&63]+n[t>>6&63]+n[63&t]}function f(t,e,r){for(var n,i=[],o=e;o<r;o+=3)n=(t[o]<<16&16711680)+(t[o+1]<<8&65280)+(255&t[o+2]),i.push(l(n));return i.join("")}i["-".charCodeAt(0)]=62,i["_".charCodeAt(0)]=63},function(t,e){e.read=function(t,e,r,n,i){var o,s,a=8*i-n-1,u=(1<<a)-1,c=u>>1,l=-7,f=r?i-1:0,h=r?-1:1,p=t[e+f];for(f+=h,o=p&(1<<-l)-1,p>>=-l,l+=a;l>0;o=256*o+t[e+f],f+=h,l-=8);for(s=o&(1<<-l)-1,o>>=-l,l+=n;l>0;s=256*s+t[e+f],f+=h,l-=8);if(0===o)o=1-c;else{if(o===u)return s?NaN:1/0*(p?-1:1);s+=Math.pow(2,n),o-=c}return(p?-1:1)*s*Math.pow(2,o-n)},e.write=function(t,e,r,n,i,o){var s,a,u,c=8*o-i-1,l=(1<<c)-1,f=l>>1,h=23===i?Math.pow(2,-24)-Math.pow(2,-77):0,p=n?0:o-1,d=n?1:-1,_=e<0||0===e&&1/e<0?1:0;for(e=Math.abs(e),isNaN(e)||e===1/0?(a=isNaN(e)?1:0,s=l):(s=Math.floor(Math.log(e)/Math.LN2),e*(u=Math.pow(2,-s))<1&&(s--,u*=2),(e+=s+f>=1?h/u:h*Math.pow(2,1-f))*u>=2&&(s++,u/=2),s+f>=l?(a=0,s=l):s+f>=1?(a=(e*u-1)*Math.pow(2,i),s+=f):(a=e*Math.pow(2,f-1)*Math.pow(2,i),s=0));i>=8;t[r+p]=255&a,p+=d,a/=256,i-=8);for(s=s<<i|a,c+=i;c>0;t[r+p]=255&s,p+=d,s/=256,c-=8);t[r+p-d]|=128*_}},function(t,e){var r={}.toString;t.exports=Array.isArray||function(t){return"[object Array]"==r.call(t)}},function(t,e){},function(t,e,r){"use strict";var n=r(7).Buffer,i=r(43);function o(t,e,r){t.copy(e,r)}t.exports=function(){function t(){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t),this.head=null,this.tail=null,this.length=0}return t.prototype.push=function(t){var e={data:t,next:null};this.length>0?this.tail.next=e:this.head=e,this.tail=e,++this.length},t.prototype.unshift=function(t){var e={data:t,next:this.head};0===this.length&&(this.tail=e),this.head=e,++this.length},t.prototype.shift=function(){if(0!==this.length){var t=this.head.data;return 1===this.length?this.head=this.tail=null:this.head=this.head.next,--this.length,t}},t.prototype.clear=function(){this.head=this.tail=null,this.length=0},t.prototype.join=function(t){if(0===this.length)return"";for(var e=this.head,r=""+e.data;e=e.next;)r+=t+e.data;return r},t.prototype.concat=function(t){if(0===this.length)return n.alloc(0);if(1===this.length)return this.head.data;for(var e=n.allocUnsafe(t>>>0),r=this.head,i=0;r;)o(r.data,e,i),i+=r.data.length,r=r.next;return e},t}(),i&&i.inspect&&i.inspect.custom&&(t.exports.prototype[i.inspect.custom]=function(){var t=i.inspect({length:this.length});return this.constructor.name+" "+t})},function(t,e){},function(t,e,r){(function(e){function r(t){try{if(!e.localStorage)return!1}catch(t){return!1}var r=e.localStorage[t];return null!=r&&"true"===String(r).toLowerCase()}t.exports=function(t,e){if(r("noDeprecation"))return t;var n=!1;return function(){if(!n){if(r("throwDeprecation"))throw new Error(e);r("traceDeprecation")?console.trace(e):console.warn(e),n=!0}return t.apply(this,arguments)}}}).call(this,r(0))},function(t,e,r){"use strict";t.exports=o;var n=r(27),i=r(5);function o(t){if(!(this instanceof o))return new o(t);n.call(this,t)}i.inherits=r(2),i.inherits(o,n),o.prototype._transform=function(t,e,r){r(null,t)}},function(t,e,r){t.exports=r(14)},function(t,e,r){t.exports=r(1)},function(t,e,r){t.exports=r(13).Transform},function(t,e,r){t.exports=r(13).PassThrough},function(t,e,r){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.mergeParams=function(t){var e={delimiter:",",ignoreColumns:void 0,includeColumns:void 0,quote:'"',trim:!0,checkType:!1,ignoreEmpty:!1,noheader:!1,headers:void 0,flatKeys:!1,maxRowLength:0,checkColumn:!1,escape:'"',colParser:{},eol:void 0,alwaysSplitAtEOL:!1,output:"json",nullObject:!1,downstreamFormat:"line",needEmitAll:!0};for(var r in t||(t={}),t)t.hasOwnProperty(r)&&(Array.isArray(t[r])?e[r]=[].concat(t[r]):e[r]=t[r]);return e}},function(t,e,r){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.initParseRuntime=function(t){var e=t.parseParam,r={needProcessIgnoreColumn:!1,needProcessIncludeColumn:!1,selectedColumns:void 0,ended:!1,hasError:!1,error:void 0,delimiter:t.parseParam.delimiter,eol:t.parseParam.eol,columnConv:[],headerType:[],headerTitle:[],headerFlag:[],headers:void 0,started:!1,parsedLineNumber:0,columnValueSetter:[]};return e.ignoreColumns&&(r.needProcessIgnoreColumn=!0),e.includeColumns&&(r.needProcessIncludeColumn=!0),r}},function(t,e,r){"use strict";(function(t){var n=this&&this.__extends||function(){var t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var r in e)e.hasOwnProperty(r)&&(t[r]=e[r])};return function(e,r){function n(){this.constructor=e}t(e,r),e.prototype=null===r?Object.create(r):(n.prototype=r.prototype,new n)}}(),i=this&&this.__importDefault||function(t){return t&&t.__esModule?t:{default:t}};Object.defineProperty(e,"__esModule",{value:!0});var o=r(53),s=i(r(15)),a=r(54),u=i(r(16)),c=r(57),l=r(28),f=r(58),h=i(r(59)),p=i(r(29)),d=function(e){function r(){var t=null!==e&&e.apply(this,arguments)||this;return t.rowSplit=new f.RowSplit(t.converter),t.eolEmitted=!1,t._needEmitEol=void 0,t.headEmitted=!1,t._needEmitHead=void 0,t}return n(r,e),r.prototype.flush=function(){var t=this;if(this.runtime.csvLineBuffer&&this.runtime.csvLineBuffer.length>0){var e=this.runtime.csvLineBuffer;return this.runtime.csvLineBuffer=void 0,this.process(e,!0).then(function(e){return t.runtime.csvLineBuffer&&t.runtime.csvLineBuffer.length>0?s.default.reject(p.default.unclosed_quote(t.runtime.parsedLineNumber,t.runtime.csvLineBuffer.toString())):s.default.resolve(e)})}return s.default.resolve([])},r.prototype.destroy=function(){return s.default.resolve()},Object.defineProperty(r.prototype,"needEmitEol",{get:function(){return void 0===this._needEmitEol&&(this._needEmitEol=this.converter.listeners("eol").length>0),this._needEmitEol},enumerable:!0,configurable:!0}),Object.defineProperty(r.prototype,"needEmitHead",{get:function(){return void 0===this._needEmitHead&&(this._needEmitHead=this.converter.listeners("header").length>0),this._needEmitHead},enumerable:!0,configurable:!0}),r.prototype.process=function(t,e){var r,n=this;return void 0===e&&(e=!1),r=e?t.toString():a.prepareData(t,this.converter.parseRuntime),s.default.resolve().then(function(){return n.runtime.preRawDataHook?n.runtime.preRawDataHook(r):r}).then(function(t){return t&&t.length>0?n.processCSV(t,e):s.default.resolve([])})},r.prototype.processCSV=function(t,e){var r=this,n=this.params,i=this.runtime;i.eol||u.default(t,i),this.needEmitEol&&!this.eolEmitted&&i.eol&&(this.converter.emit("eol",i.eol),this.eolEmitted=!0),n.ignoreEmpty&&!i.started&&(t=l.trimLeft(t));var o=c.stringToLines(t,i);return e?(o.lines.push(o.partial),o.partial=""):this.prependLeftBuf(l.bufFromString(o.partial)),o.lines.length>0?(i.preFileLineHook?this.runPreLineHook(o.lines):s.default.resolve(o.lines)).then(function(t){return i.started||r.runtime.headers?r.processCSVBody(t):r.processDataWithHead(t)}):s.default.resolve([])},r.prototype.processDataWithHead=function(t){if(this.params.noheader)this.params.headers?this.runtime.headers=this.params.headers:this.runtime.headers=[];else{for(var e="",r=[];t.length;){var n=e+t.shift(),i=this.rowSplit.parse(n);if(i.closed){r=i.cells,e="";break}e=n+u.default(n,this.runtime)}if(this.prependLeftBuf(l.bufFromString(e)),0===r.length)return[];this.params.headers?this.runtime.headers=this.params.headers:this.runtime.headers=r}return(this.runtime.needProcessIgnoreColumn||this.runtime.needProcessIncludeColumn)&&this.filterHeader(),this.needEmitHead&&!this.headEmitted&&(this.converter.emit("header",this.runtime.headers),this.headEmitted=!0),this.processCSVBody(t)},r.prototype.filterHeader=function(){if(this.runtime.selectedColumns=[],this.runtime.headers){for(var t=this.runtime.headers,e=0;e<t.length;e++)if(this.params.ignoreColumns)if(this.params.ignoreColumns.test(t[e])){if(!this.params.includeColumns||!this.params.includeColumns.test(t[e]))continue;this.runtime.selectedColumns.push(e)}else this.runtime.selectedColumns.push(e);else this.params.includeColumns?this.params.includeColumns.test(t[e])&&this.runtime.selectedColumns.push(e):this.runtime.selectedColumns.push(e);this.runtime.headers=l.filterArray(this.runtime.headers,this.runtime.selectedColumns)}},r.prototype.processCSVBody=function(t){if("line"===this.params.output)return t;var e=this.rowSplit.parseMultiLines(t);return this.prependLeftBuf(l.bufFromString(e.partial)),"csv"===this.params.output?e.rowsCells:h.default(e.rowsCells,this.converter)},r.prototype.prependLeftBuf=function(e){e&&(this.runtime.csvLineBuffer?this.runtime.csvLineBuffer=t.concat([e,this.runtime.csvLineBuffer]):this.runtime.csvLineBuffer=e)},r.prototype.runPreLineHook=function(t){var e=this;return new s.default(function(r,n){!function t(e,r,n,i){if(n>=e.length)i();else if(r.preFileLineHook){var o=e[n],s=r.preFileLineHook(o,r.parsedLineNumber+n);if(n++,s&&s.then)s.then(function(o){e[n-1]=o,t(e,r,n,i)});else{for(e[n-1]=s;n<e.length;)e[n]=r.preFileLineHook(e[n],r.parsedLineNumber+n),n++;i()}}else i()}(t,e.runtime,0,function(e){e?n(e):r(t)})})},r}(o.Processor);e.ProcessorLocal=d}).call(this,r(3).Buffer)},function(t,e,r){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=function(t){this.converter=t,this.params=t.parseParam,this.runtime=t.parseRuntime};e.Processor=n},function(t,e,r){"use strict";(function(t){var n=this&&this.__importDefault||function(t){return t&&t.__esModule?t:{default:t}};Object.defineProperty(e,"__esModule",{value:!0});var i=n(r(55));e.prepareData=function(e,r){var n=function(e,r){return r.csvLineBuffer&&r.csvLineBuffer.length>0?t.concat([r.csvLineBuffer,e]):e}(e,r);r.csvLineBuffer=void 0;var o=function(t,e){var r=t.length-1;if(0!=(128&t[r])){for(;128==(192&t[r]);)r--;r--}return r!=t.length-1?(e.csvLineBuffer=t.slice(r+1),t.slice(0,r+1)):t}(n,r).toString("utf8");return!1===r.started?i.default(o):o}}).call(this,r(3).Buffer)},function(t,e,r){"use strict";(function(e){var n=r(56);t.exports=function(t){return"string"==typeof t&&65279===t.charCodeAt(0)?t.slice(1):e.isBuffer(t)&&n(t)&&239===t[0]&&187===t[1]&&191===t[2]?t.slice(3):t}}).call(this,r(3).Buffer)},function(t,e){t.exports=function(t){for(var e=0;e<t.length;)if(9==t[e]||10==t[e]||13==t[e]||32<=t[e]&&t[e]<=126)e+=1;else if(194<=t[e]&&t[e]<=223&&128<=t[e+1]&&t[e+1]<=191)e+=2;else if(224==t[e]&&160<=t[e+1]&&t[e+1]<=191&&128<=t[e+2]&&t[e+2]<=191||(225<=t[e]&&t[e]<=236||238==t[e]||239==t[e])&&128<=t[e+1]&&t[e+1]<=191&&128<=t[e+2]&&t[e+2]<=191||237==t[e]&&128<=t[e+1]&&t[e+1]<=159&&128<=t[e+2]&&t[e+2]<=191)e+=3;else{if(!(240==t[e]&&144<=t[e+1]&&t[e+1]<=191&&128<=t[e+2]&&t[e+2]<=191&&128<=t[e+3]&&t[e+3]<=191||241<=t[e]&&t[e]<=243&&128<=t[e+1]&&t[e+1]<=191&&128<=t[e+2]&&t[e+2]<=191&&128<=t[e+3]&&t[e+3]<=191||244==t[e]&&128<=t[e+1]&&t[e+1]<=143&&128<=t[e+2]&&t[e+2]<=191&&128<=t[e+3]&&t[e+3]<=191))return!1;e+=4}return!0}},function(t,e,r){"use strict";var n=this&&this.__importDefault||function(t){return t&&t.__esModule?t:{default:t}};Object.defineProperty(e,"__esModule",{value:!0});var i=n(r(16));e.stringToLines=function(t,e){var r=i.default(t,e),n=t.split(r);return{lines:n,partial:n.pop()||""}}},function(t,e,r){"use strict";var n=this&&this.__importDefault||function(t){return t&&t.__esModule?t:{default:t}};Object.defineProperty(e,"__esModule",{value:!0});var i=n(r(16)),o=r(28),s=[",","|","\t",";",":"],a=function(){function t(t){this.conv=t,this.cachedRegExp={},this.delimiterEmitted=!1,this._needEmitDelimiter=void 0,this.quote=t.parseParam.quote,this.trim=t.parseParam.trim,this.escape=t.parseParam.escape}return Object.defineProperty(t.prototype,"needEmitDelimiter",{get:function(){return void 0===this._needEmitDelimiter&&(this._needEmitDelimiter=this.conv.listeners("delimiter").length>0),this._needEmitDelimiter},enumerable:!0,configurable:!0}),t.prototype.parse=function(t){if(0===t.length||this.conv.parseParam.ignoreEmpty&&0===t.trim().length)return{cells:[],closed:!0};var e=this.quote,r=this.trim;this.escape,(this.conv.parseRuntime.delimiter instanceof Array||"auto"===this.conv.parseRuntime.delimiter.toLowerCase())&&(this.conv.parseRuntime.delimiter=this.getDelimiter(t)),this.needEmitDelimiter&&!this.delimiterEmitted&&(this.conv.emit("delimiter",this.conv.parseRuntime.delimiter),this.delimiterEmitted=!0);var n=this.conv.parseRuntime.delimiter,i=t.split(n);if("off"===e){if(r)for(var o=0;o<i.length;o++)i[o]=i[o].trim();return{cells:i,closed:!0}}return this.toCSVRow(i,r,e,n)},t.prototype.toCSVRow=function(t,e,r,n){for(var i=[],s=!1,a="",u=0,c=t.length;u<c;u++){var l=t[u];!s&&e&&(l=o.trimLeft(l));var f=l.length;if(s)this.isQuoteClose(l)?(s=!1,a+=n+(l=l.substr(0,f-1)),a=this.escapeQuote(a),e&&(a=o.trimRight(a)),i.push(a),a=""):a+=n+l;else{if(2===f&&l===this.quote+this.quote){i.push("");continue}if(this.isQuoteOpen(l)){if(l=l.substr(1),this.isQuoteClose(l)){l=l.substring(0,l.lastIndexOf(r)),l=this.escapeQuote(l),i.push(l);continue}if(-1!==l.indexOf(r)){for(var h=0,p="",d=0,_=l;d<_.length;d++){var v=_[d];v===r&&p!==this.escape?(h++,p=""):p=v}if(h%2==1){e&&(l=o.trimRight(l)),i.push(r+l);continue}s=!0,a+=l;continue}s=!0,a+=l;continue}e&&(l=o.trimRight(l)),i.push(l)}}return{cells:i,closed:!s}},t.prototype.getDelimiter=function(t){var e;if("auto"===this.conv.parseParam.delimiter)e=s;else{if(!(this.conv.parseParam.delimiter instanceof Array))return this.conv.parseParam.delimiter;e=this.conv.parseParam.delimiter}var r=0,n=",";return e.forEach(function(e){var i=t.split(e).length;i>r&&(n=e,r=i)}),n},t.prototype.isQuoteOpen=function(t){var e=this.quote,r=this.escape;return t[0]===e&&(t[1]!==e||t[1]===r&&(t[2]===e||2===t.length))},t.prototype.isQuoteClose=function(t){var e=this.quote,r=this.escape;this.conv.parseParam.trim&&(t=o.trimRight(t));for(var n=0,i=t.length-1;t[i]===e||t[i]===r;)i--,n++;return n%2!=0},t.prototype.escapeQuote=function(t){var e="es|"+this.quote+"|"+this.escape;void 0===this.cachedRegExp[e]&&(this.cachedRegExp[e]=new RegExp("\\"+this.escape+"\\"+this.quote,"g"));var r=this.cachedRegExp[e];return t.replace(r,this.quote)},t.prototype.parseMultiLines=function(t){for(var e=[],r="";t.length;){var n=r+t.shift(),s=this.parse(n);0===s.cells.length&&this.conv.parseParam.ignoreEmpty||(s.closed||this.conv.parseParam.alwaysSplitAtEOL?(this.conv.parseRuntime.selectedColumns?e.push(o.filterArray(s.cells,this.conv.parseRuntime.selectedColumns)):e.push(s.cells),r=""):r=n+(i.default(n,this.conv.parseRuntime)||"\n"))}return{rowsCells:e,partial:r}},t}();e.RowSplit=a},function(t,e,r){"use strict";var n=this&&this.__importDefault||function(t){return t&&t.__esModule?t:{default:t}};Object.defineProperty(e,"__esModule",{value:!0});var i=n(r(29)),o=n(r(60)),s=/^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$/;function a(t,e,r){if(e.parseParam.checkColumn&&e.parseRuntime.headers&&t.length!==e.parseRuntime.headers.length)throw i.default.column_mismatched(e.parseRuntime.parsedLineNumber+r);return function(t,e,r){for(var n=!1,i={},o=0,s=t.length;o<s;o++){var a=t[o];if(!r.parseParam.ignoreEmpty||""!==a){n=!0;var u=e[o];u&&""!==u||(u=e[o]="field"+(o+1));var f=c(u,o,r);if(f){var h=f(a,u,i,t,o);void 0!==h&&l(i,u,h,r,o)}else{if(r.parseParam.checkType)a=p(a,u,o,r)(a);void 0!==a&&l(i,u,a,r,o)}}}return n?i:null}(t,e.parseRuntime.headers||[],e)||null}e.default=function(t,e){for(var r=[],n=0,i=t.length;n<i;n++){var o=a(t[n],e,n);o&&r.push(o)}return r};var u={string:_,number:d,omit:function(){}};function c(t,e,r){if(void 0!==r.parseRuntime.columnConv[e])return r.parseRuntime.columnConv[e];var n=r.parseParam.colParser[t];if(void 0===n)return r.parseRuntime.columnConv[e]=null;if("object"==typeof n&&(n=n.cellParser||"string"),"string"==typeof n){n=n.trim().toLowerCase();var i=u[n];return r.parseRuntime.columnConv[e]=i||null}return r.parseRuntime.columnConv[e]="function"==typeof n?n:null}function l(t,e,r,n,i){if(!n.parseRuntime.columnValueSetter[i])if(n.parseParam.flatKeys)n.parseRuntime.columnValueSetter[i]=f;else if(e.indexOf(".")>-1){for(var o=e.split("."),s=!0;o.length>0;)if(0===o.shift().length){s=!1;break}!s||n.parseParam.colParser[e]&&n.parseParam.colParser[e].flat?n.parseRuntime.columnValueSetter[i]=f:n.parseRuntime.columnValueSetter[i]=h}else n.parseRuntime.columnValueSetter[i]=f;!0===n.parseParam.nullObject&&"null"===r&&(r=null),n.parseRuntime.columnValueSetter[i](t,e,r)}function f(t,e,r){t[e]=r}function h(t,e,r){o.default(t,e,r)}function p(t,e,r,n){return n.parseRuntime.headerType[r]?n.parseRuntime.headerType[r]:e.indexOf("number#!")>-1?n.parseRuntime.headerType[r]=d:e.indexOf("string#!")>-1?n.parseRuntime.headerType[r]=_:n.parseParam.checkType?n.parseRuntime.headerType[r]=v:n.parseRuntime.headerType[r]=_}function d(t){var e=parseFloat(t);return isNaN(e)?t:e}function _(t){return t.toString()}function v(t){var e=t.trim();return""===e?_(t):s.test(e)?d(t):5===e.length&&"false"===e.toLowerCase()||4===e.length&&"true"===e.toLowerCase()?function(t){var e=t.trim();return 5!==e.length||"false"!==e.toLowerCase()}(t):"{"===e[0]&&"}"===e[e.length-1]||"["===e[0]&&"]"===e[e.length-1]?function(t){try{return JSON.parse(t)}catch(e){return t}}(t):_(t)}},function(t,e,r){var n=r(61);t.exports=function(t,e,r){return null==t?t:n(t,e,r)}},function(t,e,r){var n=r(62),i=r(74),o=r(103),s=r(20),a=r(104);t.exports=function(t,e,r,u){if(!s(t))return t;for(var c=-1,l=(e=i(e,t)).length,f=l-1,h=t;null!=h&&++c<l;){var p=a(e[c]),d=r;if(c!=f){var _=h[p];void 0===(d=u?u(_,p,h):void 0)&&(d=s(_)?_:o(e[c+1])?[]:{})}n(h,p,d),h=h[p]}return t}},function(t,e,r){var n=r(63),i=r(31),o=Object.prototype.hasOwnProperty;t.exports=function(t,e,r){var s=t[e];o.call(t,e)&&i(s,r)&&(void 0!==r||e in t)||n(t,e,r)}},function(t,e,r){var n=r(64);t.exports=function(t,e,r){"__proto__"==e&&n?n(t,e,{configurable:!0,enumerable:!0,value:r,writable:!0}):t[e]=r}},function(t,e,r){var n=r(17),i=function(){try{var t=n(Object,"defineProperty");return t({},"",{}),t}catch(t){}}();t.exports=i},function(t,e,r){var n=r(66),i=r(70),o=r(20),s=r(72),a=/^\[object .+?Constructor\]$/,u=Function.prototype,c=Object.prototype,l=u.toString,f=c.hasOwnProperty,h=RegExp("^"+l.call(f).replace(/[\\^$.*+?()[\]{}|]/g,"\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,"$1.*?")+"$");t.exports=function(t){return!(!o(t)||i(t))&&(n(t)?h:a).test(s(t))}},function(t,e,r){var n=r(30),i=r(20);t.exports=function(t){if(!i(t))return!1;var e=n(t);return"[object Function]"==e||"[object GeneratorFunction]"==e||"[object AsyncFunction]"==e||"[object Proxy]"==e}},function(t,e,r){(function(e){var r="object"==typeof e&&e&&e.Object===Object&&e;t.exports=r}).call(this,r(0))},function(t,e,r){var n=r(18),i=Object.prototype,o=i.hasOwnProperty,s=i.toString,a=n?n.toStringTag:void 0;t.exports=function(t){var e=o.call(t,a),r=t[a];try{t[a]=void 0;var n=!0}catch(t){}var i=s.call(t);return n&&(e?t[a]=r:delete t[a]),i}},function(t,e){var r=Object.prototype.toString;t.exports=function(t){return r.call(t)}},function(t,e,r){var n=r(71),i=function(){var t=/[^.]+$/.exec(n&&n.keys&&n.keys.IE_PROTO||"");return t?"Symbol(src)_1."+t:""}();t.exports=function(t){return!!i&&i in t}},function(t,e,r){var n=r(19)["__core-js_shared__"];t.exports=n},function(t,e){var r=Function.prototype.toString;t.exports=function(t){if(null!=t){try{return r.call(t)}catch(t){}try{return t+""}catch(t){}}return""}},function(t,e){t.exports=function(t,e){return null==t?void 0:t[e]}},function(t,e,r){var n=r(21),i=r(75),o=r(77),s=r(100);t.exports=function(t,e){return n(t)?t:i(t,e)?[t]:o(s(t))}},function(t,e,r){var n=r(21),i=r(22),o=/\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,s=/^\w*$/;t.exports=function(t,e){if(n(t))return!1;var r=typeof t;return!("number"!=r&&"symbol"!=r&&"boolean"!=r&&null!=t&&!i(t))||s.test(t)||!o.test(t)||null!=e&&t in Object(e)}},function(t,e){t.exports=function(t){return null!=t&&"object"==typeof t}},function(t,e,r){var n=/[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g,i=/\\(\\)?/g,o=r(78)(function(t){var e=[];return 46===t.charCodeAt(0)&&e.push(""),t.replace(n,function(t,r,n,o){e.push(n?o.replace(i,"$1"):r||t)}),e});t.exports=o},function(t,e,r){var n=r(79);t.exports=function(t){var e=n(t,function(t){return 500===r.size&&r.clear(),t}),r=e.cache;return e}},function(t,e,r){var n=r(80),i="Expected a function";function o(t,e){if("function"!=typeof t||null!=e&&"function"!=typeof e)throw new TypeError(i);var r=function(){var n=arguments,i=e?e.apply(this,n):n[0],o=r.cache;if(o.has(i))return o.get(i);var s=t.apply(this,n);return r.cache=o.set(i,s)||o,s};return r.cache=new(o.Cache||n),r}o.Cache=n,t.exports=o},function(t,e,r){var n=r(81),i=r(95),o=r(97),s=r(98),a=r(99);function u(t){var e=-1,r=null==t?0:t.length;for(this.clear();++e<r;){var n=t[e];this.set(n[0],n[1])}}u.prototype.clear=n,u.prototype.delete=i,u.prototype.get=o,u.prototype.has=s,u.prototype.set=a,t.exports=u},function(t,e,r){var n=r(82),i=r(88),o=r(94);t.exports=function(){this.size=0,this.__data__={hash:new n,map:new(o||i),string:new n}}},function(t,e,r){var n=r(83),i=r(84),o=r(85),s=r(86),a=r(87);function u(t){var e=-1,r=null==t?0:t.length;for(this.clear();++e<r;){var n=t[e];this.set(n[0],n[1])}}u.prototype.clear=n,u.prototype.delete=i,u.prototype.get=o,u.prototype.has=s,u.prototype.set=a,t.exports=u},function(t,e,r){var n=r(8);t.exports=function(){this.__data__=n?n(null):{},this.size=0}},function(t,e){t.exports=function(t){var e=this.has(t)&&delete this.__data__[t];return this.size-=e?1:0,e}},function(t,e,r){var n=r(8),i=Object.prototype.hasOwnProperty;t.exports=function(t){var e=this.__data__;if(n){var r=e[t];return"__lodash_hash_undefined__"===r?void 0:r}return i.call(e,t)?e[t]:void 0}},function(t,e,r){var n=r(8),i=Object.prototype.hasOwnProperty;t.exports=function(t){var e=this.__data__;return n?void 0!==e[t]:i.call(e,t)}},function(t,e,r){var n=r(8);t.exports=function(t,e){var r=this.__data__;return this.size+=this.has(t)?0:1,r[t]=n&&void 0===e?"__lodash_hash_undefined__":e,this}},function(t,e,r){var n=r(89),i=r(90),o=r(91),s=r(92),a=r(93);function u(t){var e=-1,r=null==t?0:t.length;for(this.clear();++e<r;){var n=t[e];this.set(n[0],n[1])}}u.prototype.clear=n,u.prototype.delete=i,u.prototype.get=o,u.prototype.has=s,u.prototype.set=a,t.exports=u},function(t,e){t.exports=function(){this.__data__=[],this.size=0}},function(t,e,r){var n=r(9),i=Array.prototype.splice;t.exports=function(t){var e=this.__data__,r=n(e,t);return!(r<0||(r==e.length-1?e.pop():i.call(e,r,1),--this.size,0))}},function(t,e,r){var n=r(9);t.exports=function(t){var e=this.__data__,r=n(e,t);return r<0?void 0:e[r][1]}},function(t,e,r){var n=r(9);t.exports=function(t){return n(this.__data__,t)>-1}},function(t,e,r){var n=r(9);t.exports=function(t,e){var r=this.__data__,i=n(r,t);return i<0?(++this.size,r.push([t,e])):r[i][1]=e,this}},function(t,e,r){var n=r(17)(r(19),"Map");t.exports=n},function(t,e,r){var n=r(10);t.exports=function(t){var e=n(this,t).delete(t);return this.size-=e?1:0,e}},function(t,e){t.exports=function(t){var e=typeof t;return"string"==e||"number"==e||"symbol"==e||"boolean"==e?"__proto__"!==t:null===t}},function(t,e,r){var n=r(10);t.exports=function(t){return n(this,t).get(t)}},function(t,e,r){var n=r(10);t.exports=function(t){return n(this,t).has(t)}},function(t,e,r){var n=r(10);t.exports=function(t,e){var r=n(this,t),i=r.size;return r.set(t,e),this.size+=r.size==i?0:1,this}},function(t,e,r){var n=r(101);t.exports=function(t){return null==t?"":n(t)}},function(t,e,r){var n=r(18),i=r(102),o=r(21),s=r(22),a=n?n.prototype:void 0,u=a?a.toString:void 0;t.exports=function t(e){if("string"==typeof e)return e;if(o(e))return i(e,t)+"";if(s(e))return u?u.call(e):"";var r=e+"";return"0"==r&&1/e==-1/0?"-0":r}},function(t,e){t.exports=function(t,e){for(var r=-1,n=null==t?0:t.length,i=Array(n);++r<n;)i[r]=e(t[r],r,t);return i}},function(t,e){var r=/^(?:0|[1-9]\d*)$/;t.exports=function(t,e){var n=typeof t;return!!(e=null==e?9007199254740991:e)&&("number"==n||"symbol"!=n&&r.test(t))&&t>-1&&t%1==0&&t<e}},function(t,e,r){var n=r(22);t.exports=function(t){if("string"==typeof t||n(t))return t;var e=t+"";return"0"==e&&1/t==-1/0?"-0":e}},function(t,e,r){"use strict";var n=this&&this.__importDefault||function(t){return t&&t.__esModule?t:{default:t}};Object.defineProperty(e,"__esModule",{value:!0});var i=n(r(15)),o=r(106),s=function(){function t(t){this.converter=t,this.finalResult=[]}return Object.defineProperty(t.prototype,"needEmitLine",{get:function(){return!!this.converter.parseRuntime.subscribe&&!!this.converter.parseRuntime.subscribe.onNext||this.needPushDownstream},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"needPushDownstream",{get:function(){return void 0===this._needPushDownstream&&(this._needPushDownstream=this.converter.listeners("data").length>0||this.converter.listeners("readable").length>0),this._needPushDownstream},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"needEmitAll",{get:function(){return!!this.converter.parseRuntime.then&&this.converter.parseParam.needEmitAll},enumerable:!0,configurable:!0}),t.prototype.processResult=function(t){var e=this,r=this.converter.parseRuntime.parsedLineNumber;return this.needPushDownstream&&"array"===this.converter.parseParam.downstreamFormat&&0===r&&a(this.converter,"["+o.EOL),new i.default(function(r,n){e.needEmitLine?function t(e,r,n,i,o){if(n>=e.length)o();else if(r.parseRuntime.subscribe&&r.parseRuntime.subscribe.onNext){var s=r.parseRuntime.subscribe.onNext,u=e[n],c=s(u,r.parseRuntime.parsedLineNumber+n);if(n++,c&&c.then)c.then(function(){!function(e,r,n,i,o,s,u){o&&a(n,u),t(e,n,i,o,s)}(e,0,r,n,i,o,u)},o);else{for(i&&a(r,u);n<e.length;){var l=e[n];s(l,r.parseRuntime.parsedLineNumber+n),n++,i&&a(r,l)}o()}}else{if(i)for(;n<e.length;)l=e[n++],a(r,l);o()}}(t,e.converter,0,e.needPushDownstream,function(i){i?n(i):(e.appendFinalResult(t),r())}):(e.appendFinalResult(t),r())})},t.prototype.appendFinalResult=function(t){this.needEmitAll&&(this.finalResult=this.finalResult.concat(t)),this.converter.parseRuntime.parsedLineNumber+=t.length},t.prototype.processError=function(t){this.converter.parseRuntime.subscribe&&this.converter.parseRuntime.subscribe.onError&&this.converter.parseRuntime.subscribe.onError(t),this.converter.parseRuntime.then&&this.converter.parseRuntime.then.onrejected&&this.converter.parseRuntime.then.onrejected(t)},t.prototype.endProcess=function(){this.converter.parseRuntime.then&&this.converter.parseRuntime.then.onfulfilled&&(this.needEmitAll?this.converter.parseRuntime.then.onfulfilled(this.finalResult):this.converter.parseRuntime.then.onfulfilled([])),this.converter.parseRuntime.subscribe&&this.converter.parseRuntime.subscribe.onCompleted&&this.converter.parseRuntime.subscribe.onCompleted(),this.needPushDownstream&&"array"===this.converter.parseParam.downstreamFormat&&a(this.converter,"]"+o.EOL)},t}();function a(t,e){if("object"!=typeof e||t.options.objectMode)t.push(e);else{var r=JSON.stringify(e);t.push(r+("array"===t.parseParam.downstreamFormat?","+o.EOL:o.EOL),"utf8")}}e.Result=s},function(t,e){e.endianness=function(){return"LE"},e.hostname=function(){return"undefined"!=typeof location?location.hostname:""},e.loadavg=function(){return[]},e.uptime=function(){return 0},e.freemem=function(){return Number.MAX_VALUE},e.totalmem=function(){return Number.MAX_VALUE},e.cpus=function(){return[]},e.type=function(){return"Browser"},e.release=function(){return"undefined"!=typeof navigator?navigator.appVersion:""},e.networkInterfaces=e.getNetworkInterfaces=function(){return{}},e.arch=function(){return"javascript"},e.platform=function(){return"browser"},e.tmpdir=e.tmpDir=function(){return"/tmp"},e.EOL="\n",e.homedir=function(){return"/"}}]);
},{}],13:[function(require,module,exports){
'use strict';
var token = '%[a-f0-9]{2}';
var singleMatcher = new RegExp(token, 'gi');
var multiMatcher = new RegExp('(' + token + ')+', 'gi');

function decodeComponents(components, split) {
	try {
		// Try to decode the entire string first
		return decodeURIComponent(components.join(''));
	} catch (err) {
		// Do nothing
	}

	if (components.length === 1) {
		return components;
	}

	split = split || 1;

	// Split the array in 2 parts
	var left = components.slice(0, split);
	var right = components.slice(split);

	return Array.prototype.concat.call([], decodeComponents(left), decodeComponents(right));
}

function decode(input) {
	try {
		return decodeURIComponent(input);
	} catch (err) {
		var tokens = input.match(singleMatcher);

		for (var i = 1; i < tokens.length; i++) {
			input = decodeComponents(tokens, i).join('');

			tokens = input.match(singleMatcher);
		}

		return input;
	}
}

function customDecodeURIComponent(input) {
	// Keep track of all the replacements and prefill the map with the `BOM`
	var replaceMap = {
		'%FE%FF': '\uFFFD\uFFFD',
		'%FF%FE': '\uFFFD\uFFFD'
	};

	var match = multiMatcher.exec(input);
	while (match) {
		try {
			// Decode as big chunks as possible
			replaceMap[match[0]] = decodeURIComponent(match[0]);
		} catch (err) {
			var result = decode(match[0]);

			if (result !== match[0]) {
				replaceMap[match[0]] = result;
			}
		}

		match = multiMatcher.exec(input);
	}

	// Add `%C2` at the end of the map to make sure it does not replace the combinator before everything else
	replaceMap['%C2'] = '\uFFFD';

	var entries = Object.keys(replaceMap);

	for (var i = 0; i < entries.length; i++) {
		// Replace all decoded components
		var key = entries[i];
		input = input.replace(new RegExp(key, 'g'), replaceMap[key]);
	}

	return input;
}

module.exports = function (encodedURI) {
	if (typeof encodedURI !== 'string') {
		throw new TypeError('Expected `encodedURI` to be of type `string`, got `' + typeof encodedURI + '`');
	}

	try {
		encodedURI = encodedURI.replace(/\+/g, ' ');

		// Try the built in decoder first
		return decodeURIComponent(encodedURI);
	} catch (err) {
		// Fallback to a more advanced decoder
		return customDecodeURIComponent(encodedURI);
	}
};

},{}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _extendableBuiltin(cls) {
  function ExtendableBuiltin() {
    cls.apply(this, arguments);
  }

  ExtendableBuiltin.prototype = Object.create(cls.prototype, {
    constructor: {
      value: cls,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });

  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(ExtendableBuiltin, cls);
  } else {
    ExtendableBuiltin.__proto__ = cls;
  }

  return ExtendableBuiltin;
}

var ExtendableError = function (_extendableBuiltin2) {
  _inherits(ExtendableError, _extendableBuiltin2);

  function ExtendableError() {
    var message = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

    _classCallCheck(this, ExtendableError);

    // extending Error is weird and does not propagate `message`
    var _this = _possibleConstructorReturn(this, (ExtendableError.__proto__ || Object.getPrototypeOf(ExtendableError)).call(this, message));

    Object.defineProperty(_this, 'message', {
      configurable: true,
      enumerable: false,
      value: message,
      writable: true
    });

    Object.defineProperty(_this, 'name', {
      configurable: true,
      enumerable: false,
      value: _this.constructor.name,
      writable: true
    });

    if (Error.hasOwnProperty('captureStackTrace')) {
      Error.captureStackTrace(_this, _this.constructor);
      return _possibleConstructorReturn(_this);
    }

    Object.defineProperty(_this, 'stack', {
      configurable: true,
      enumerable: false,
      value: new Error(message).stack,
      writable: true
    });
    return _this;
  }

  return ExtendableError;
}(_extendableBuiltin(Error));

exports.default = ExtendableError;
module.exports = exports['default'];

},{}],15:[function(require,module,exports){
'use strict';
module.exports = function (obj, predicate) {
	var ret = {};
	var keys = Object.keys(obj);
	var isArr = Array.isArray(predicate);

	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		var val = obj[key];

		if (isArr ? predicate.indexOf(key) !== -1 : predicate(key, val, obj)) {
			ret[key] = val;
		}
	}

	return ret;
};

},{}],16:[function(require,module,exports){
(function (global){(function (){
var win;

if (typeof window !== "undefined") {
    win = window;
} else if (typeof global !== "undefined") {
    win = global;
} else if (typeof self !== "undefined"){
    win = self;
} else {
    win = {};
}

module.exports = win;

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],17:[function(require,module,exports){
module.exports = isFunction

var toString = Object.prototype.toString

function isFunction (fn) {
  if (!fn) {
    return false
  }
  var string = toString.call(fn)
  return string === '[object Function]' ||
    (typeof fn === 'function' && string !== '[object RegExp]') ||
    (typeof window !== 'undefined' &&
     // IE8 and below
     (fn === window.setTimeout ||
      fn === window.alert ||
      fn === window.confirm ||
      fn === window.prompt))
};

},{}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ApiKeys {
    constructor(connection, keyid = "", dbName = "") {
        this._connection = connection;
        this.keyid = keyid;
        this.dbName = dbName;
    }
    validateApiKey(data) {
        return this._connection.request({
            method: "POST",
            path: "/_api/key/validate",
            body: data
        }, (res) => res.body);
    }
    createApiKey() {
        return this._connection.request({
            method: "POST",
            path: "/_api/key",
            body: {
                keyid: this.keyid
            }
        }, (res) => res.body);
    }
    getAvailableApiKeys() {
        return this._connection.request({
            method: "GET",
            path: "/_api/key",
        }, (res) => res.body);
    }
    getAvailableApiKey() {
        return this._connection.request({
            method: "GET",
            path: `/_api/key/${this.keyid}`,
        }, (res) => res.body);
    }
    removeApiKey() {
        return this._connection.request({
            method: "DELETE",
            path: `/_api/key/${this.keyid}`,
        }, (res) => res.body);
    }
    //---------------- database access level ----------------
    listAccessibleDatabases(full = false) {
        return this._connection.request({
            method: "GET",
            path: `/_api/key/${this.keyid}/database`,
            qs: {
                full
            }
        }, (res) => res.body);
    }
    getDatabaseAccessLevel() {
        return this._connection.request({
            method: "GET",
            path: `/_api/key/${this.keyid}/database/${this.dbName}`,
        }, (res) => res.body);
    }
    clearDatabaseAccessLevel() {
        return this._connection.request({
            method: "DELETE",
            path: `/_api/key/${this.keyid}/database/${this.dbName}`,
        }, (res) => res.body);
    }
    setDatabaseAccessLevel(permission) {
        return this._connection.request({
            method: "PUT",
            path: `/_api/key/${this.keyid}/database/${this.dbName}`,
            body: {
                grant: permission
            }
        }, (res) => res.body);
    }
    //---------------- Collection access level ----------------
    listAccessibleCollections(full = false) {
        return this._connection.request({
            method: "GET",
            path: `/_api/key/${this.keyid}/database/${this.dbName}/collection`,
            qs: {
                full
            }
        }, (res) => res.body);
    }
    getCollectionAccessLevel(collectionName) {
        return this._connection.request({
            method: "GET",
            path: `/_api/key/${this.keyid}/database/${this.dbName}/collection/${collectionName}`,
        }, (res) => res.body);
    }
    clearCollectionAccessLevel(collectionName) {
        return this._connection.request({
            method: "DELETE",
            path: `/_api/key/${this.keyid}/database/${this.dbName}/collection/${collectionName}`,
        }, (res) => res.body);
    }
    setCollectionAccessLevel(collectionName, permission) {
        return this._connection.request({
            method: "PUT",
            path: `/_api/key/${this.keyid}/database/${this.dbName}/collection/${collectionName}`,
            body: {
                grant: permission
            }
        }, (res) => res.body);
    }
    //---------------- Stream access level ----------------
    listAccessibleStreams(full = false) {
        return this._connection.request({
            method: "GET",
            path: `/_api/key/${this.keyid}/database/${this.dbName}/stream`,
            qs: {
                full
            }
        }, (res) => res.body);
    }
    getStreamAccessLevel(streamName) {
        return this._connection.request({
            method: "GET",
            path: `/_api/key/${this.keyid}/database/${this.dbName}/stream/${streamName}`,
        }, (res) => res.body);
    }
    clearStreamAccessLevel(streamName) {
        return this._connection.request({
            method: "DELETE",
            path: `/_api/key/${this.keyid}/database/${this.dbName}/stream/${streamName}`,
        }, (res) => res.body);
    }
    setStreamAccessLevel(streamName, permission) {
        return this._connection.request({
            method: "PUT",
            path: `/_api/key/${this.keyid}/database/${this.dbName}/stream/${streamName}`,
            body: {
                grant: permission
            }
        }, (res) => res.body);
    }
    //---------------- Billing access level ----------------
    getBillingAccessLevel() {
        return this._connection.request({
            method: "GET",
            path: `/_api/key/${this.keyid}/billing`,
        }, (res) => res.body);
    }
    clearBillingAccessLevel() {
        return this._connection.request({
            method: "DELETE",
            path: `/_api/key/${this.keyid}/billing`,
        }, (res) => res.body);
    }
    setBillingAccessLevel(permission) {
        return this._connection.request({
            method: "PUT",
            path: `/_api/key/${this.keyid}/billing`,
            body: {
                grant: permission
            }
        }, (res) => res.body);
    }
}
exports.ApiKeys = ApiKeys;

},{}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const collection_1 = require("./collection");
function isC8QLQuery(query) {
    return Boolean(query && query.query && query.bindVars);
}
exports.isC8QLQuery = isC8QLQuery;
function isC8QLLiteral(literal) {
    return Boolean(literal && typeof literal.toC8QL === "function");
}
exports.isC8QLLiteral = isC8QLLiteral;
function c8ql(strings, ...args) {
    const bindVars = {};
    const bindVals = [];
    let query = strings[0];
    for (let i = 0; i < args.length; i++) {
        const rawValue = args[i];
        let value = rawValue;
        if (isC8QLLiteral(rawValue)) {
            query += `${rawValue.toC8QL()}${strings[i + 1]}`;
            continue;
        }
        const index = bindVals.indexOf(rawValue);
        const isKnown = index !== -1;
        let name = `value${isKnown ? index : bindVals.length}`;
        if (collection_1.isC8Collection(rawValue)) {
            name = `@${name}`;
            value = rawValue.name;
        }
        if (!isKnown) {
            bindVals.push(rawValue);
            bindVars[name] = value;
        }
        query += `@${name}${strings[i + 1]}`;
    }
    return { query, bindVars };
}
exports.c8ql = c8ql;
(function (c8ql) {
    c8ql.literal = (value) => ({
        toC8QL() {
            return String(value);
        }
    });
})(c8ql = exports.c8ql || (exports.c8ql = {}));

},{"./collection":21}],20:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fabric_1 = require("./fabric");
const keyValue_1 = require("./keyValue");
const apiKeys_1 = require("./apiKeys");
const search_1 = require("./search");
const csv = require("csvtojson");
class C8Client extends fabric_1.Fabric {
    constructor(config) {
        super(config);
    }
    useApiKeyAuth(apikey) {
        this._connection.setHeader("authorization", `apikey ${apikey}`);
        return this;
    }
    loginWithToken(jwt) {
        return __awaiter(this, void 0, void 0, function* () {
            this.useBearerAuth(jwt);
            const { error, errorMessage, result } = yield this.validateApiKey({ jwt });
            if (error) {
                throw new Error(errorMessage);
            }
            else {
                const { tenant } = result;
                this.useTenant(tenant);
            }
        });
    }
    loginWithApiKey(apikey) {
        return __awaiter(this, void 0, void 0, function* () {
            this.useApiKeyAuth(apikey);
            const { error, errorMessage, result } = yield this.validateApiKey({ apikey });
            if (error) {
                throw new Error(errorMessage);
            }
            else {
                const { tenant } = result;
                this.useTenant(tenant);
            }
        });
    }
    createCollection(collectionName, properties, isEdge = false) {
        let collection;
        if (isEdge) {
            collection = this.edgeCollection(collectionName);
        }
        else {
            collection = this.collection(collectionName);
        }
        return collection.create(properties);
    }
    deleteCollection(collectionName, opts) {
        const collection = this.collection(collectionName);
        return collection.drop(opts);
    }
    hasCollection(collectionName) {
        const collection = this.collection(collectionName);
        return collection.exists();
    }
    getCollection(collectionName) {
        const collection = this.collection(collectionName);
        return collection.get();
    }
    getCollections(excludeSystem = true) {
        return this.listCollections(excludeSystem);
    }
    onCollectionChange(collectionName, dcName, subscriptionName) {
        return __awaiter(this, void 0, void 0, function* () {
            const localDcDetails = yield this.getLocalDc();
            let dcUrl = localDcDetails.tags.url;
            if (dcName) {
                dcUrl = dcName;
            }
            const collection = this.collection(collectionName);
            return collection.onChange(dcUrl, subscriptionName);
        });
    }
    getDocument(collectionName, documentHandle, graceful = false) {
        const collection = this.collection(collectionName);
        return collection.document(documentHandle, graceful);
    }
    getDocumentMany(collectionName, limit, skip) {
        const getDocumentsQuery = `FOR doc IN ${collectionName} ${limit ? `limit ${skip ? `${skip},` : ""}${limit}` : ""} return doc`;
        return this.executeQuery(getDocumentsQuery);
    }
    insertDocument(collectionName, data, opts) {
        const collection = this.collection(collectionName);
        return collection.save(data, opts);
    }
    insertDocumentMany(collectionName, data, opts) {
        const collection = this.collection(collectionName);
        return collection.save(data, opts);
    }
    insertDocumentFromFile(collectionName, csvPath, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield csv().fromFile(csvPath);
            const collection = this.collection(collectionName);
            return collection.save(data, opts);
        });
    }
    updateDocument(collectionName, documentHandle, newValue, opts = {}) {
        const collection = this.collection(collectionName);
        return collection.update(documentHandle, newValue, opts);
    }
    updateDocumentMany(collectionName, documentsHandle, opts = {}) {
        const collection = this.collection(collectionName);
        return collection.updateDocuments(documentsHandle, opts);
    }
    replaceDocument(collectionName, documentHandle, newValue, opts = {}) {
        const collection = this.collection(collectionName);
        return collection.replace(documentHandle, newValue, opts);
    }
    replaceDocumentMany(collectionName, documentsHandle, opts = {}) {
        const collection = this.collection(collectionName);
        return collection.replaceDocuments(documentsHandle, opts);
    }
    deleteDocument(collectionName, documentHandle, opts = {}) {
        const collection = this.collection(collectionName);
        return collection.remove(documentHandle, opts);
    }
    deleteDocumentMany(collectionName, documentsHandle, opts = {}) {
        const collection = this.collection(collectionName);
        return collection.removeDocuments(documentsHandle, opts);
    }
    listCollectionIndexes(collectionName) {
        const collection = this.collection(collectionName);
        return collection.indexes();
    }
    addHashIndex(collectionName, fields, opts) {
        const collection = this.collection(collectionName);
        return collection.createHashIndex(fields, opts);
    }
    addGeoIndex(collectionName, fields, opts) {
        const collection = this.collection(collectionName);
        return collection.createGeoIndex(fields, opts);
    }
    addSkiplistIndex(collectionName, fields, opts) {
        const collection = this.collection(collectionName);
        return collection.createSkipList(fields, opts);
    }
    addPersistentIndex(collectionName, fields, opts) {
        const collection = this.collection(collectionName);
        return collection.createPersistentIndex(fields, opts);
    }
    addFullTextIndex(collectionName, fields, minLength) {
        const collection = this.collection(collectionName);
        return collection.createFulltextIndex(fields, minLength);
    }
    addTtlIndex(collectionName, fields, expireAfter) {
        const collection = this.collection(collectionName);
        return collection.createTtlIndex(fields, expireAfter);
    }
    deleteIndex(collectionName, indexName) {
        const collection = this.collection(collectionName);
        return collection.dropIndex(indexName);
    }
    getCollectionIds(collectionName) {
        const getIdsQuery = `FOR doc IN ${collectionName} RETURN doc._id`;
        return this.executeQuery(getIdsQuery);
    }
    getCollectionKeys(collectionName) {
        const getKeysQuery = `FOR doc IN ${collectionName} RETURN doc._key`;
        return this.executeQuery(getKeysQuery);
    }
    getCollectionIndexes(collectionName) {
        const collection = this.collection(collectionName);
        return collection.indexes();
    }
    // validateQuery() { } already available
    executeQuery(query, bindVars, opts) {
        return this.query(query, bindVars, opts).then((cursor) => cursor.all());
    }
    // explainQuery() { } already available
    getRunningQueries() {
        return this.getCurrentQueries();
    }
    killQuery(queryId) {
        return this.terminateRunningQuery(queryId);
    }
    createRestql(restqlName, value, parameter = {}) {
        return this.saveQuery(restqlName, parameter, value);
    }
    executeRestql(restqlName, bindVars = {}) {
        return this.executeSavedQuery(restqlName, bindVars);
    }
    updateRestql(restqlName, value, parameter = {}) {
        return this.updateSavedQuery(restqlName, parameter, value);
    }
    deleteRestql(restqlName) {
        return this.deleteSavedQuery(restqlName);
    }
    getRestqls() {
        return this.listSavedQueries();
    }
    getDcList() {
        return this.getTenantEdgeLocations();
    }
    getLocalDc() {
        return this.getLocalEdgeLocation();
    }
    createStream(streamName, local, isCollectionStream = false) {
        const stream = this.stream(streamName, local, isCollectionStream);
        return stream.createStream();
    }
    hasStream(streamName, local) {
        const topic = local ? `c8locals.${streamName}` : `c8globals.${streamName}`;
        // @VIKAS Cant we use any other api eg: /_api/streams/c8locals.test/stats
        // If 200 api exits else api does not exist
        return this.getStreams(!local).then((res) => !!res.result.find((stream) => stream.topic === topic), (err) => {
            throw err;
        });
    }
    getStream(streamName, local, isCollectionStream = false) {
        const stream = this.stream(streamName, local, isCollectionStream);
        return stream;
    }
    //getStreams() { } // already present
    getStreamStats(streamName, local, isCollectionStream = false) {
        const stream = this.stream(streamName, local, isCollectionStream);
        return stream.getStreamStatistics();
    }
    createStreamProducer(streamName, local, isCollectionStream = false, dcName, params = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const localDcDetails = yield this.getLocalDc();
            let dcUrl = localDcDetails.tags.url;
            if (dcName) {
                dcUrl = dcName;
            }
            const stream = this.stream(streamName, local, isCollectionStream);
            const otp = yield stream.getOtp();
            return stream.producer(dcUrl, Object.assign({}, params, { otp }));
        });
    }
    createStreamReader(streamName, subscriptionName, local, isCollectionStream = false, dcName, params = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const localDcDetails = yield this.getLocalDc();
            let dcUrl = localDcDetails.tags.url;
            if (dcName) {
                dcUrl = dcName;
            }
            const stream = this.stream(streamName, local, isCollectionStream);
            const otp = yield stream.getOtp();
            return stream.consumer(subscriptionName, dcUrl, Object.assign({}, params, { otp }));
        });
    }
    subscribe(streamName, local, isCollectionStream = false, subscriptionName, dcName, params = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const localDcDetails = yield this.getLocalDc();
            let dcUrl = localDcDetails.tags.url;
            if (dcName) {
                dcUrl = dcName;
            }
            const stream = this.stream(streamName, local, isCollectionStream);
            const otp = yield stream.getOtp();
            return stream.consumer(subscriptionName, dcUrl, Object.assign({}, params, { otp }));
        });
    } // how is it same as create  web socket handler
    // unsubscribe(){} already available
    getStreamBacklog(streamName, local, isCollectionStream = false) {
        const stream = this.stream(streamName, local, isCollectionStream);
        return stream.backlog();
    }
    clearStreamBacklog(subscription) {
        return this.clearSubscriptionBacklog(subscription);
    }
    clearStreamsBacklog() {
        return this.clearBacklog();
    }
    getStreamSubscriptions(streamName, local, isCollectionStream = false) {
        const stream = this.stream(streamName, local, isCollectionStream);
        return stream.getSubscriptionList();
    }
    deleteStreamSubscription(streamName, subscription, local, isCollectionStream = false) {
        const stream = this.stream(streamName, local, isCollectionStream);
        return stream.deleteSubscription(subscription);
    }
    // createStreamApp() { } already present
    validateStreamApp(appDefinition) {
        return this.validateStreamappDefinition(appDefinition);
    }
    retrieveStreamApp() {
        return this.getAllStreamApps();
    }
    deleteStreamApp(appName) {
        const streamApp = this.streamApp(appName);
        return streamApp.deleteApplication();
    }
    getStreamApp(appName) {
        const streamApp = this.streamApp(appName);
        return streamApp.retriveApplication();
    }
    getStreamAppSamples() {
        return this.getSampleStreamApps();
    }
    activateStreamApp(appName, active) {
        const streamApp = this.streamApp(appName);
        return streamApp.activateStreamApplication(active);
    }
    createGraph(graphName, properties = {}) {
        const graph = this.graph(graphName);
        return graph.create(properties);
    }
    deleteGraph(graphName, dropCollections) {
        const graph = this.graph(graphName);
        return graph.drop(dropCollections);
    }
    hasGraph(graphName) {
        const graph = this.graph(graphName);
        return graph.exists();
    }
    getGraph(graphName) {
        const graph = this.graph(graphName);
        return graph.get();
    }
    getGraphs() {
        return this.graphs();
    }
    insertEdge(graphName, definition) {
        const graph = this.graph(graphName);
        return graph.addEdgeDefinition(definition);
    }
    updateEdge(graphName, collectionName, documentHandle, newValue, opts = {}) {
        const graph = this.graph(graphName);
        const graphEdgeCollection = graph.edgeCollection(collectionName);
        return graphEdgeCollection.update(documentHandle, newValue, opts);
    }
    replaceEdge(graphName, collectionName, documentHandle, newValue, opts = {}) {
        const graph = this.graph(graphName);
        const graphEdgeCollection = graph.edgeCollection(collectionName);
        return graphEdgeCollection.replace(documentHandle, newValue, opts);
    }
    deleteEdge(graphName, collectionName, documentHandle, opts = {}) {
        const graph = this.graph(graphName);
        const graphEdgeCollection = graph.edgeCollection(collectionName);
        return graphEdgeCollection.remove(documentHandle, opts);
    }
    getEdges(graphName) {
        return __awaiter(this, void 0, void 0, function* () {
            const graph = this.graph(graphName);
            const graphDetails = yield graph.get();
            return graphDetails.edgeDefinitions;
        });
    }
    linkEdge(graphName, collectionName, fromId, toId) {
        const graph = this.graph(graphName);
        return graph.create({
            edgeDefinitions: [{
                    collection: collectionName,
                    from: fromId,
                    to: toId
                }]
        });
    }
    hasUser(userName) {
        const user = this.user(userName);
        return user.hasUser();
    }
    createUser(userName, email, passwd = "", active = true, extra = {}) {
        const user = this.user(userName, email);
        return user.createUser(passwd, active, extra);
    }
    deleteUser(userName) {
        const user = this.user(userName);
        return user.deleteUser();
    }
    getUsers() {
        return this.getAllUsers();
    }
    getUser(userName) {
        const user = this.user(userName);
        return user.getUserDeatils();
    }
    updateUser(userName, data) {
        const user = this.user(userName);
        return user.modifyUser(data);
    }
    replaceUser(userName, data) {
        const user = this.user(userName);
        return user.replaceUser(data);
    }
    getPermissions(userName, isFullRequested) {
        const user = this.user(userName);
        return user.getAllDatabases(isFullRequested);
    }
    getPermission(userName, databaseName, collectionName) {
        const user = this.user(userName);
        if (!!collectionName) {
            return user.getCollectionAccessLevel(databaseName, collectionName);
        }
        return user.getDatabaseAccessLevel(databaseName);
    }
    updatePermission(userName, fabricName, permission, collectionName) {
        const user = this.user(userName);
        if (!!collectionName) {
            return user.setCollectionAccessLevel(fabricName, collectionName, permission);
        }
        return user.setDatabaseAccessLevel(fabricName, permission);
    }
    resetPermission(userName, fabricName, collectionName) {
        const user = this.user(userName);
        if (!!collectionName) {
            return user.clearCollectionAccessLevel(fabricName, collectionName);
        }
        return user.clearDatabaseAccessLevel(fabricName);
    }
    //--------------- Key Value ---------------
    keyValue(collectionName) {
        return new keyValue_1.KeyValue(this._connection, collectionName);
    }
    getKVCollections() {
        const keyValueColl = this.keyValue('');
        return keyValueColl.getCollections();
    }
    getKVCount(collectionName) {
        const keyValueColl = this.keyValue(collectionName);
        return keyValueColl.getKVCount();
    }
    getKVKeys(collectionName, opts) {
        const keyValueColl = this.keyValue(collectionName);
        return keyValueColl.getKVKeys(opts);
    }
    getValueForKey(collectionName, key) {
        const keyValueColl = this.keyValue(collectionName);
        return keyValueColl.getValueForKey(key);
    }
    createKVCollection(collectionName, expiration) {
        const keyValueColl = this.keyValue(collectionName);
        return keyValueColl.createCollection(expiration);
    }
    insertKVPairs(collectionName, keyValuePairs) {
        const keyValueColl = this.keyValue(collectionName);
        return keyValueColl.insertKVPairs(keyValuePairs);
    }
    deleteEntryForKey(collectionName, key) {
        const keyValueColl = this.keyValue(collectionName);
        return keyValueColl.deleteEntryForKey(key);
    }
    deleteEntryForKeys(collectionName, keys) {
        const keyValueColl = this.keyValue(collectionName);
        return keyValueColl.deleteEntryForKeys(keys);
    }
    deleteKVCollection(collectionName) {
        const keyValueColl = this.keyValue(collectionName);
        return keyValueColl.deleteCollection();
    }
    //--------------- Api keys ---------------
    apiKeys(keyid = '', dbName = '') {
        return new apiKeys_1.ApiKeys(this._connection, keyid, dbName);
    }
    validateApiKey(data) {
        const apiKeys = this.apiKeys();
        return apiKeys.validateApiKey(data);
    }
    createApiKey(keyid) {
        const apiKeys = this.apiKeys(keyid);
        return apiKeys.createApiKey();
    }
    getAvailableApiKeys() {
        const apiKeys = this.apiKeys();
        return apiKeys.getAvailableApiKeys();
    }
    getAvailableApiKey(keyid) {
        const apiKeys = this.apiKeys(keyid);
        return apiKeys.getAvailableApiKey();
    }
    removeApiKey(keyid) {
        const apiKeys = this.apiKeys(keyid);
        return apiKeys.removeApiKey();
    }
    // ----------------------------------
    listAccessibleDatabases(keyid, full) {
        const apiKeys = this.apiKeys(keyid);
        return apiKeys.listAccessibleDatabases(full);
    }
    getDatabaseAccessLevel(keyid, dbName) {
        const apiKeys = this.apiKeys(keyid, dbName);
        return apiKeys.getDatabaseAccessLevel();
    }
    clearDatabaseAccessLevel(keyid, dbName) {
        const apiKeys = this.apiKeys(keyid, dbName);
        return apiKeys.clearDatabaseAccessLevel();
    }
    setDatabaseAccessLevel(keyid, dbName, permission) {
        const apiKeys = this.apiKeys(keyid, dbName);
        return apiKeys.setDatabaseAccessLevel(permission);
    }
    // ----------------------------------
    listAccessibleCollections(keyid, dbName, full) {
        const apiKeys = this.apiKeys(keyid, dbName);
        return apiKeys.listAccessibleCollections(full);
    }
    getCollectionAccessLevel(keyid, dbName, collectionName) {
        const apiKeys = this.apiKeys(keyid, dbName);
        return apiKeys.getCollectionAccessLevel(collectionName);
    }
    clearCollectionAccessLevel(keyid, dbName, collectionName) {
        const apiKeys = this.apiKeys(keyid, dbName);
        return apiKeys.clearCollectionAccessLevel(collectionName);
    }
    setCollectionAccessLevel(keyid, dbName, collectionName, permission) {
        const apiKeys = this.apiKeys(keyid, dbName);
        return apiKeys.setCollectionAccessLevel(collectionName, permission);
    }
    // ----------------------------------
    listAccessibleStreams(keyid, dbName, full) {
        const apiKeys = this.apiKeys(keyid, dbName);
        return apiKeys.listAccessibleStreams(full);
    }
    getStreamAccessLevel(keyid, dbName, streamName) {
        const apiKeys = this.apiKeys(keyid, dbName);
        return apiKeys.getStreamAccessLevel(streamName);
    }
    clearStreamAccessLevel(keyid, dbName, streamName) {
        const apiKeys = this.apiKeys(keyid, dbName);
        return apiKeys.clearStreamAccessLevel(streamName);
    }
    setStreamAccessLevel(keyid, dbName, streamName, permission) {
        const apiKeys = this.apiKeys(keyid, dbName);
        return apiKeys.setStreamAccessLevel(streamName, permission);
    }
    // ----------------------------------
    getBillingAccessLevel(keyid) {
        const apiKeys = this.apiKeys(keyid);
        return apiKeys.getBillingAccessLevel();
    }
    clearBillingAccessLevel(keyid) {
        const apiKeys = this.apiKeys(keyid);
        return apiKeys.clearBillingAccessLevel();
    }
    setBillingAccessLevel(keyid, permission) {
        const apiKeys = this.apiKeys(keyid);
        return apiKeys.setBillingAccessLevel(permission);
    }
    //--------------- Search ---------------
    search(searchOptions) {
        return new search_1.Search(this._connection, searchOptions);
    }
    setSearch(collectionName, enable, field) {
        const search = this.search();
        return search.setSearch(collectionName, enable, field);
    }
    searchInCollection(collectionName, searchString, bindVars, ttl) {
        const search = this.search();
        return search.searchInCollection(collectionName, searchString, bindVars, ttl);
    }
    getListOfViews() {
        const search = this.search();
        return search.getListOfViews();
    }
    createView(viewName, properties) {
        const search = this.search({ viewName });
        return search.createView(properties);
    }
    getViewInfo(viewName) {
        const search = this.search({ viewName });
        return search.getViewInfo();
    }
    renameView(viewName, newName) {
        const search = this.search({ viewName });
        return search.renameView(newName);
    }
    deleteView(viewName) {
        const search = this.search({ viewName });
        return search.deleteView();
    }
    getViewProperties(viewName) {
        const search = this.search({ viewName });
        return search.getViewProperties();
    }
    updateViewProperties(viewName, properties) {
        const search = this.search({ viewName });
        return search.updateViewProperties(properties);
    }
    getListOfAnalyzers() {
        const search = this.search();
        return search.getListOfAnalyzers();
    }
    createAnalyzer(analyzerName, type, properties, features) {
        const search = this.search({ analyzerName });
        return search.createAnalyzer(type, properties, features);
    }
    deleteAnalyzer(analyzerName, force) {
        const search = this.search({ analyzerName });
        return search.deleteAnalyzer(force);
    }
    getAnalyzerDefinition(analyzerName) {
        const search = this.search({ analyzerName });
        return search.getAnalyzerDefinition();
    }
}
exports.C8Client = C8Client;

},{"./apiKeys":18,"./fabric":26,"./keyValue":30,"./search":32,"csvtojson":12}],21:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = require("./error");
const stream_1 = require("./stream");
var CollectionType;
(function (CollectionType) {
    CollectionType[CollectionType["DOCUMENT_COLLECTION"] = 2] = "DOCUMENT_COLLECTION";
    CollectionType[CollectionType["EDGE_COLLECTION"] = 3] = "EDGE_COLLECTION";
})(CollectionType = exports.CollectionType || (exports.CollectionType = {}));
function isC8Collection(collection) {
    return Boolean(collection && collection.isC8Collection);
}
exports.isC8Collection = isC8Collection;
exports.DOCUMENT_NOT_FOUND = 1202;
exports.COLLECTION_NOT_FOUND = 1203;
class BaseCollection {
    constructor(connection, name) {
        this.isC8Collection = true;
        this.name = name;
        this._idPrefix = `${this.name}/`;
        this._connection = connection;
        this.stream = new stream_1.Stream(connection, name, true, true);
        if (this._connection.c8Major >= 3) {
            this.createCapConstraint = undefined;
        }
    }
    _documentPath(documentHandle) {
        return `/document/${this._documentHandle(documentHandle)}`;
    }
    _documentHandle(documentHandle) {
        if (typeof documentHandle !== "string") {
            if (documentHandle._id) {
                return documentHandle._id;
            }
            if (documentHandle._key) {
                return this._idPrefix + documentHandle._key;
            }
            throw new Error("Document handle must be a document or string");
        }
        if (documentHandle.indexOf("/") === -1) {
            return this._idPrefix + documentHandle;
        }
        return documentHandle;
    }
    _indexHandle(indexHandle) {
        if (typeof indexHandle !== "string") {
            if (indexHandle.id) {
                return indexHandle.id;
            }
            throw new Error("Index handle must be a index or string");
        }
        if (indexHandle.indexOf("/") === -1) {
            return this._idPrefix + indexHandle;
        }
        return indexHandle;
    }
    _get(path, qs) {
        return this._connection.request({ path: `/collection/${this.name}/${path}`, qs }, (res) => res.body);
    }
    _put(path, body) {
        return this._connection.request({
            method: "PUT",
            path: `/collection/${this.name}/${path}`,
            body,
        }, (res) => res.body);
    }
    get() {
        return this._connection.request({ path: `/collection/${this.name}` }, (res) => res.body);
    }
    exists() {
        return this.get().then(() => true, (err) => {
            if (error_1.isC8Error(err) && err.errorNum === exports.COLLECTION_NOT_FOUND) {
                return false;
            }
            throw err;
        });
    }
    create(properties) {
        return this._connection.request({
            method: "POST",
            path: "/collection",
            body: Object.assign({}, properties, { name: this.name, type: this.type }),
        }, (res) => res.body);
    }
    onChange(dcName, subscriptionName = "subs") {
        return __awaiter(this, void 0, void 0, function* () {
            const otp = yield this.stream.getOtp();
            return this.stream.consumer(subscriptionName, dcName, { otp });
        });
    }
    properties() {
        return this._get("properties");
    }
    count() {
        return this._get("count");
    }
    rename(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this._connection.request({
                method: "PUT",
                path: `/collection/${this.name}/rename`,
                body: { name },
            }, (res) => res.body);
            this.name = name;
            this._idPrefix = `${name}/`;
            return result;
        });
    }
    truncate() {
        return this._put("truncate", undefined);
    }
    drop(opts) {
        return this._connection.request({
            method: "DELETE",
            path: `/collection/${this.name}`,
            qs: opts,
        }, (res) => res.body);
    }
    documentExists(documentHandle) {
        return this._connection
            .request({
            method: "HEAD",
            path: `/${this._documentPath(documentHandle)}`,
        }, () => true)
            .catch((err) => {
            if (err.statusCode === 404) {
                return false;
            }
            throw err;
        });
    }
    document(documentHandle, graceful = false) {
        const result = this._connection.request({ path: `/${this._documentPath(documentHandle)}` }, (res) => res.body);
        if (!graceful)
            return result;
        return result.catch((err) => {
            if (error_1.isC8Error(err) && err.errorNum === exports.DOCUMENT_NOT_FOUND) {
                return null;
            }
            throw err;
        });
    }
    replace(documentHandle, newValue, opts = {}) {
        var _a;
        const headers = {};
        if (typeof opts === "string") {
            opts = { rev: opts };
        }
        if (opts.rev && this._connection.c8Major >= 3) {
            let rev;
            (_a = opts, { rev } = _a, opts = __rest(_a, ["rev"]));
            headers["if-match"] = rev;
        }
        return this._connection.request({
            method: "PUT",
            path: `/${this._documentPath(documentHandle)}`,
            body: newValue,
            qs: opts,
            headers,
        }, (res) => res.body);
    }
    replaceDocuments(documents, opts = {}) {
        var _a;
        const headers = {};
        if (typeof opts === "string") {
            opts = { rev: opts };
        }
        if (opts.rev && this._connection.c8Major >= 3) {
            let rev;
            (_a = opts, { rev } = _a, opts = __rest(_a, ["rev"]));
            headers["if-match"] = rev;
        }
        return this._connection.request({
            method: "PUT",
            path: `/${this._documentPath('')}`,
            body: documents,
            qs: opts,
            headers,
        }, (res) => res.body);
    }
    update(documentHandle, newValue, opts = {}) {
        var _a;
        const headers = {};
        if (typeof opts === "string") {
            opts = { rev: opts };
        }
        if (opts.rev && this._connection.c8Major >= 3) {
            let rev;
            (_a = opts, { rev } = _a, opts = __rest(_a, ["rev"]));
            headers["if-match"] = rev;
        }
        return this._connection.request({
            method: "PATCH",
            path: `/${this._documentPath(documentHandle)}`,
            body: newValue,
            qs: opts,
            headers,
        }, (res) => res.body);
    }
    updateDocuments(documents, opts = {}) {
        var _a;
        const headers = {};
        if (typeof opts === "string") {
            opts = { rev: opts };
        }
        if (opts.rev && this._connection.c8Major >= 3) {
            let rev;
            (_a = opts, { rev } = _a, opts = __rest(_a, ["rev"]));
            headers["if-match"] = rev;
        }
        return this._connection.request({
            method: "PATCH",
            path: `/${this._documentPath('')}`,
            body: documents,
            qs: opts,
            headers,
        }, (res) => res.body);
    }
    remove(documentHandle, opts = {}) {
        var _a;
        const headers = {};
        if (typeof opts === "string") {
            opts = { rev: opts };
        }
        if (opts.rev && this._connection.c8Major >= 3) {
            let rev;
            (_a = opts, { rev } = _a, opts = __rest(_a, ["rev"]));
            headers["if-match"] = rev;
        }
        return this._connection.request({
            method: "DELETE",
            path: `/${this._documentPath(documentHandle)}`,
            qs: opts,
            headers,
        }, (res) => res.body);
    }
    removeDocuments(documents, opts = {}) {
        var _a;
        const headers = {};
        if (typeof opts === "string") {
            opts = { rev: opts };
        }
        if (opts.rev && this._connection.c8Major >= 3) {
            let rev;
            (_a = opts, { rev } = _a, opts = __rest(_a, ["rev"]));
            headers["if-match"] = rev;
        }
        return this._connection.request({
            method: "DELETE",
            path: `/${this._documentPath('')}`,
            body: documents,
            qs: opts,
            headers,
        }, (res) => res.body);
    }
    import(data, _a = {}) {
        var { type = "auto" } = _a, opts = __rest(_a, ["type"]);
        if (Array.isArray(data)) {
            data = data.map((line) => JSON.stringify(line)).join("\r\n") + "\r\n";
        }
        return this._connection.request({
            method: "POST",
            path: "/import",
            body: data,
            isBinary: true,
            qs: Object.assign({ type: type === null ? undefined : type }, opts, { collection: this.name }),
        }, (res) => res.body);
    }
    indexes() {
        return this._connection.request({
            path: "/index",
            qs: { collection: this.name },
        }, (res) => res.body.indexes);
    }
    index(indexName) {
        return this._connection.request({ path: `/index/${this._idPrefix}${indexName}` }, (res) => res.body);
    }
    createIndex(details) {
        return this._connection.request({
            method: "POST",
            path: "/index",
            body: details,
            qs: { collection: this.name },
        }, (res) => res.body);
    }
    dropIndex(indexName) {
        return this._connection.request({
            method: "DELETE",
            path: `/index/${this._idPrefix}${indexName}`,
        }, (res) => res.body);
    }
    createCapConstraint(opts) {
        if (typeof opts === "number") {
            opts = { size: opts };
        }
        return this._connection.request({
            method: "POST",
            path: "/index",
            body: Object.assign({}, opts, { type: "cap" }),
            qs: { collection: this.name },
        }, (res) => res.body);
    }
    createHashIndex(fields, opts) {
        if (typeof fields === "string") {
            fields = [fields];
        }
        if (typeof opts === "boolean") {
            opts = { unique: opts };
        }
        return this._connection.request({
            method: "POST",
            path: "/index",
            body: Object.assign({ unique: false }, opts, { type: "hash", fields: fields }),
            qs: { collection: this.name },
        }, (res) => res.body);
    }
    createSkipList(fields, opts) {
        if (typeof fields === "string") {
            fields = [fields];
        }
        if (typeof opts === "boolean") {
            opts = { unique: opts };
        }
        return this._connection.request({
            method: "POST",
            path: "/index",
            body: Object.assign({ unique: false }, opts, { type: "skiplist", fields: fields }),
            qs: { collection: this.name },
        }, (res) => res.body);
    }
    createPersistentIndex(fields, opts) {
        if (typeof fields === "string") {
            fields = [fields];
        }
        if (typeof opts === "boolean") {
            opts = { unique: opts };
        }
        return this._connection.request({
            method: "POST",
            path: "/index",
            body: Object.assign({ unique: false }, opts, { type: "persistent", fields: fields }),
            qs: { collection: this.name },
        }, (res) => res.body);
    }
    createGeoIndex(fields, opts) {
        if (typeof fields === "string") {
            fields = [fields];
        }
        return this._connection.request({
            method: "POST",
            path: "/index",
            body: Object.assign({}, opts, { fields, type: "geo" }),
            qs: { collection: this.name },
        }, (res) => res.body);
    }
    createFulltextIndex(fields, minLength) {
        if (typeof fields === "string") {
            fields = [fields];
        }
        return this._connection.request({
            method: "POST",
            path: "/index",
            body: { fields, minLength, type: "fulltext" },
            qs: { collection: this.name },
        }, (res) => res.body);
    }
    createTtlIndex(fields, expireAfter) {
        if (typeof fields === "string") {
            fields = [fields];
        }
        return this._connection.request({
            method: "POST",
            path: "/index",
            body: { fields, expireAfter, type: "ttl" },
            qs: { collection: this.name },
        }, (res) => res.body);
    }
}
exports.BaseCollection = BaseCollection;
class DocumentCollection extends BaseCollection {
    constructor(connection, name) {
        super(connection, name);
        this.type = CollectionType.DOCUMENT_COLLECTION;
    }
    save(data, opts) {
        if (typeof opts === "boolean") {
            opts = { returnNew: opts };
        }
        if (this._connection.c8Major <= 2) {
            return this._connection.request({
                method: "POST",
                path: "/document",
                body: data,
                qs: Object.assign({}, opts, { collection: this.name }),
            }, (res) => res.body);
        }
        return this._connection.request({
            method: "POST",
            path: `/document/${this.name}`,
            body: data,
            qs: opts,
        }, (res) => res.body);
    }
}
exports.DocumentCollection = DocumentCollection;
class EdgeCollection extends BaseCollection {
    constructor(connection, name) {
        super(connection, name);
        this.type = CollectionType.EDGE_COLLECTION;
    }
    _documentPath(documentHandle) {
        if (this._connection.c8Major < 3) {
            return `edge/${this._documentHandle(documentHandle)}`;
        }
        return `document/${this._documentHandle(documentHandle)}`;
    }
    edge(documentHandle, graceful = false) {
        return this.document(documentHandle, graceful);
    }
    save(data, fromIdOrOpts, toId, opts) {
        if (toId !== undefined) {
            data._from = this._documentHandle(fromIdOrOpts);
            data._to = this._documentHandle(toId);
        }
        else if (fromIdOrOpts !== undefined) {
            opts = fromIdOrOpts;
        }
        if (typeof opts === "boolean") {
            opts = { returnNew: opts };
        }
        if (this._connection.c8Major <= 2) {
            return this._connection.request({
                method: "POST",
                path: "/edge",
                body: data,
                qs: Object.assign({}, opts, { collection: this.name, from: data._from, to: data._to }),
            }, (res) => res.body);
        }
        return this._connection.request({
            method: "POST",
            path: "/document",
            body: data,
            qs: Object.assign({}, opts, { collection: this.name }),
        }, (res) => res.body);
    }
    _edges(documentHandle, direction) {
        return this._connection.request({
            path: `/edges/${this.name}`,
            qs: {
                direction,
                vertex: this._documentHandle(documentHandle),
            },
        }, (res) => res.body.edges);
    }
    edges(vertex) {
        return this._edges(vertex, undefined);
    }
    inEdges(vertex) {
        return this._edges(vertex, "in");
    }
    outEdges(vertex) {
        return this._edges(vertex, "out");
    }
    traversal(startVertex, opts) {
        return this._connection.request({
            method: "POST",
            path: "/traversal",
            body: Object.assign({}, opts, { startVertex, edgeCollection: this.name }),
        }, (res) => res.body.result);
    }
}
exports.EdgeCollection = EdgeCollection;
function constructCollection(connection, data) {
    const Collection = data.type === CollectionType.EDGE_COLLECTION
        ? EdgeCollection
        : DocumentCollection;
    return new Collection(connection, data.name);
}
exports.constructCollection = constructCollection;

},{"./error":24,"./stream":33}],22:[function(require,module,exports){
"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const querystring_1 = require("querystring");
const error_1 = require("./error");
const request_1 = require("./util/request");
const jwtDecode = require("jwt-decode");
const LinkedList = require("linkedlist/lib/linkedlist");
exports.MIME_JSON = /\/(json|javascript)(\W|$)/;
const LEADER_ENDPOINT_HEADER = "x-c8-endpoint";
function isSystemError(err) {
    return (Object.getPrototypeOf(err) === Error.prototype &&
        err.hasOwnProperty("code") &&
        err.hasOwnProperty("errno") &&
        err.hasOwnProperty("syscall"));
}
class Connection {
    constructor(config = {}) {
        this._activeTasks = 0;
        this._c8Version = 30000;
        this._fabricName = "_system";
        this._tenantName = "_mm";
        this._queue = new LinkedList();
        this._hosts = [];
        this._urls = [];
        if (typeof config === "string")
            config = { url: config };
        else if (Array.isArray(config))
            config = { url: config };
        if (config.c8Version !== undefined) {
            this._c8Version = config.c8Version;
        }
        if (config.fabricName) {
            this._fabricName = config.fabricName;
        }
        if (config.isAbsolute) {
            this._fabricName = false;
            this._tenantName = false;
        }
        this._agent = config.agent;
        this._agentOptions = request_1.isBrowser
            ? Object.assign({}, config.agentOptions) : Object.assign({ maxSockets: 3, keepAlive: true, keepAliveMsecs: 1000 }, config.agentOptions);
        this._maxTasks = this._agentOptions.maxSockets || 3;
        if (this._agentOptions.keepAlive)
            this._maxTasks *= 2;
        this._headers = Object.assign({}, config.headers);
        if (config.token) {
            this._headers = Object.assign({}, this._headers, { authorization: `Bearer ${config.token}` });
            const { tenant } = jwtDecode(config.token);
            this._tenantName = tenant;
        }
        if (config.apiKey) {
            this._headers = Object.assign({}, this._headers, { authorization: `apikey ${config.apiKey}` });
            this._tenantName = this.extractTenantName(config.apiKey);
        }
        this._loadBalancingStrategy = config.loadBalancingStrategy || "NONE";
        this._useFailOver = this._loadBalancingStrategy !== "ROUND_ROBIN";
        if (config.maxRetries === false) {
            this._shouldRetry = false;
            this._maxRetries = 0;
        }
        else {
            this._shouldRetry = true;
            this._maxRetries = config.maxRetries || 0;
        }
        const urls = config.url
            ? Array.isArray(config.url)
                ? config.url
                : [config.url]
            : ["https://test.macrometa.io"];
        const apiUrls = urls.map((url) => {
            return `https://api-${url.split("https://")[1]}`;
        });
        this.addToHostList(apiUrls);
        if (this._loadBalancingStrategy === "ONE_RANDOM") {
            this._activeHost = Math.floor(Math.random() * this._hosts.length);
        }
        else {
            this._activeHost = 0;
        }
    }
    get _fabricPath() {
        return this._fabricName === false
            ? ""
            : `/_tenant/${this._tenantName}/_fabric/${this._fabricName}`;
    }
    _runQueue() {
        if (!this._queue.length || this._activeTasks >= this._maxTasks)
            return;
        const task = this._queue.shift();
        let host = this._activeHost;
        if (task.host !== undefined) {
            host = task.host;
        }
        else if (this._loadBalancingStrategy === "ROUND_ROBIN") {
            this._activeHost = (this._activeHost + 1) % this._hosts.length;
        }
        this._activeTasks += 1;
        this._hosts[host](task.options, (err, res) => {
            this._activeTasks -= 1;
            if (err) {
                if (this._hosts.length > 1 &&
                    this._activeHost === host &&
                    this._useFailOver) {
                    this._activeHost = (this._activeHost + 1) % this._hosts.length;
                }
                if (!task.host &&
                    this._shouldRetry &&
                    task.retries < (this._maxRetries || this._hosts.length - 1) &&
                    isSystemError(err) &&
                    err.syscall === "connect" &&
                    err.code === "ECONNREFUSED") {
                    task.retries += 1;
                    this._queue.push(task);
                }
                else {
                    task.reject(err);
                }
            }
            else {
                if (request_1.isBrowser && this._agent) {
                    const response = res;
                    if (response.status === 503 &&
                        response.headers.get(LEADER_ENDPOINT_HEADER)) {
                        const url = response.headers.get(LEADER_ENDPOINT_HEADER);
                        const [index] = this.addToHostList(url);
                        task.host = index;
                        if (this._activeHost === host) {
                            this._activeHost = index;
                        }
                        this._queue.push(task);
                    }
                    else {
                        response.host = host;
                        task.resolve(response);
                    }
                }
                else {
                    const response = res;
                    if (response.statusCode === 503 &&
                        response.headers[LEADER_ENDPOINT_HEADER]) {
                        const url = response.headers[LEADER_ENDPOINT_HEADER];
                        const [index] = this.addToHostList(url);
                        task.host = index;
                        if (this._activeHost === host) {
                            this._activeHost = index;
                        }
                        this._queue.push(task);
                    }
                    else {
                        response.host = host;
                        task.resolve(response);
                    }
                }
            }
            this._runQueue();
        });
    }
    _buildUrl({ absolutePath = false, basePath, path, qs }) {
        let pathname = "";
        let search;
        if (!absolutePath) {
            pathname = this._fabricPath;
            if (basePath)
                pathname += basePath;
        }
        if (path)
            pathname += path;
        if (qs) {
            if (typeof qs === "string")
                search = `?${qs}`;
            else
                search = `?${querystring_1.stringify(qs)}`;
        }
        return search ? { pathname, search } : { pathname };
    }
    _sanitizeEndpointUrl(url) {
        if (url.startsWith("tcp:"))
            return url.replace(/^tcp:/, "http:");
        if (url.startsWith("ssl:"))
            return url.replace(/^ssl:/, "https:");
        return url;
    }
    addToHostList(urls) {
        const cleanUrls = (Array.isArray(urls) ? urls : [urls]).map((url) => this._sanitizeEndpointUrl(url));
        const newUrls = cleanUrls.filter((url) => this._urls.indexOf(url) === -1);
        this._urls.push(...newUrls);
        this._hosts.push(...newUrls.map((url) => request_1.createRequest(url, this._agentOptions, this._agent)));
        return cleanUrls.map((url) => this._urls.indexOf(url));
    }
    get c8Major() {
        return Math.floor(this._c8Version / 10000);
    }
    getFabricName() {
        return this._fabricName;
    }
    getTenantName() {
        return this._tenantName;
    }
    getUrls() {
        return this._urls;
    }
    getActiveHost() {
        return this._activeHost;
    }
    setFabricName(fabricName) {
        if (this._fabricName === false) {
            throw new Error("Can not change fabric from absolute URL");
        }
        this._fabricName = fabricName;
    }
    setTenantName(tenantName) {
        if (this._tenantName === false) {
            throw new Error("Can not change tenant from absolute URL");
        }
        this._tenantName = tenantName;
    }
    setHeader(key, value) {
        this._headers[key] = value;
    }
    close() {
        for (const host of this._hosts) {
            if (host.close)
                host.close();
        }
    }
    extractTenantName(apiKey) {
        let apiKeyArr = apiKey.split(".");
        apiKeyArr.splice(-2, 2);
        return apiKeyArr.join(".");
    }
    request(_a, getter) {
        var { host, method = "GET", body, expectBinary = false, isBinary = false, headers } = _a, urlInfo = __rest(_a, ["host", "method", "body", "expectBinary", "isBinary", "headers"]);
        return new Promise((resolve, reject) => {
            let contentType = "text/plain";
            if (isBinary) {
                contentType = "application/octet-stream";
            }
            else if (body) {
                if (typeof body === "object") {
                    body = JSON.stringify(body);
                    contentType = "application/json";
                }
                else {
                    body = String(body);
                }
            }
            const extraHeaders = Object.assign({}, this._headers, { "content-type": contentType, "x-c8-version": String(this._c8Version) });
            this._queue.push({
                retries: 0,
                host,
                options: {
                    url: this._buildUrl(urlInfo),
                    headers: Object.assign({}, extraHeaders, headers),
                    method,
                    expectBinary,
                    body,
                },
                reject,
                resolve: (res) => {
                    if (request_1.isBrowser && this._agent) {
                        res
                            .json()
                            .then((data) => {
                            if (data.hasOwnProperty("error") &&
                                data.hasOwnProperty("code") &&
                                data.hasOwnProperty("errorMessage") &&
                                data.hasOwnProperty("errorNum")) {
                                reject(new error_1.C8Error({ body: data }));
                            }
                            else if (res.status && res.status >= 400) {
                                reject(new error_1.HttpError({ body: data }));
                            }
                            else {
                                resolve(getter
                                    ? getter({ body: data })
                                    : { body: data });
                            }
                        })
                            .catch((err) => {
                            reject(err);
                        });
                    }
                    else {
                        const contentType = res.headers["content-type"];
                        let parsedBody = undefined;
                        if (res.body.length &&
                            contentType &&
                            contentType.match(exports.MIME_JSON)) {
                            try {
                                parsedBody = res.body;
                                parsedBody = JSON.parse(parsedBody);
                            }
                            catch (e) {
                                if (!expectBinary) {
                                    if (typeof parsedBody !== "string") {
                                        parsedBody = res.body.toString("utf-8");
                                    }
                                    e.response = res;
                                    reject(e);
                                    return;
                                }
                            }
                        }
                        else if (res.body && !expectBinary) {
                            parsedBody = res.body.toString("utf-8");
                        }
                        else {
                            parsedBody = res.body;
                        }
                        if (parsedBody &&
                            parsedBody.hasOwnProperty("error") &&
                            parsedBody.hasOwnProperty("code") &&
                            parsedBody.hasOwnProperty("errorMessage") &&
                            parsedBody.hasOwnProperty("errorNum")) {
                            res.body = parsedBody;
                            reject(new error_1.C8Error(res));
                        }
                        else if (res.statusCode && res.statusCode >= 400) {
                            res.body = parsedBody;
                            reject(new error_1.HttpError(res));
                        }
                        else {
                            if (!expectBinary)
                                res.body = parsedBody;
                            resolve(getter ? getter(res) : res);
                        }
                    }
                },
            });
            this._runQueue();
        });
    }
}
exports.Connection = Connection;

},{"./error":24,"./util/request":41,"jwt-decode":46,"linkedlist/lib/linkedlist":47,"querystring":9}],23:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class ArrayCursor {
    constructor(connection, body, host) {
        this.extra = body.extra;
        this._connection = connection;
        this._result = body.result;
        this._hasMore = Boolean(body.hasMore);
        this._id = body.id;
        this._host = host;
        this.count = body.count;
    }
    _drain() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._more();
            if (!this._hasMore)
                return this;
            return this._drain();
        });
    }
    _more() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._hasMore)
                return;
            else {
                const res = yield this._connection.request({
                    method: "PUT",
                    path: `/cursor/${this._id}`,
                    host: this._host
                });
                this._result.push(...res.body.result);
                this._hasMore = res.body.hasMore;
            }
        });
    }
    delete() {
        return this._connection.request({
            method: "DELETE",
            path: `/cursor/${this._id}`
        }, res => res.body);
    }
    all() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._drain();
            let result = this._result;
            this._result = [];
            return result;
        });
    }
    next() {
        return __awaiter(this, void 0, void 0, function* () {
            while (!this._result.length && this._hasMore) {
                yield this._more();
            }
            if (!this._result.length) {
                return undefined;
            }
            return this._result.shift();
        });
    }
    hasNext() {
        return Boolean(this._hasMore || this._result.length);
    }
    each(fn) {
        return __awaiter(this, void 0, void 0, function* () {
            let index = 0;
            while (this._result.length || this._hasMore) {
                let result;
                while (this._result.length) {
                    result = fn(this._result.shift(), index, this);
                    index++;
                    if (result === false)
                        return result;
                }
                if (this._hasMore)
                    yield this._more();
            }
            return true;
        });
    }
    every(fn) {
        return __awaiter(this, void 0, void 0, function* () {
            let index = 0;
            while (this._result.length || this._hasMore) {
                let result;
                while (this._result.length) {
                    result = fn(this._result.shift(), index, this);
                    index++;
                    if (!result)
                        return false;
                }
                if (this._hasMore)
                    yield this._more();
            }
            return true;
        });
    }
    some(fn) {
        return __awaiter(this, void 0, void 0, function* () {
            let index = 0;
            while (this._result.length || this._hasMore) {
                let result;
                while (this._result.length) {
                    result = fn(this._result.shift(), index, this);
                    index++;
                    if (result)
                        return true;
                }
                if (this._hasMore)
                    yield this._more();
            }
            return false;
        });
    }
    map(fn) {
        return __awaiter(this, void 0, void 0, function* () {
            let index = 0;
            let result = [];
            while (this._result.length || this._hasMore) {
                while (this._result.length) {
                    result.push(fn(this._result.shift(), index, this));
                    index++;
                }
                if (this._hasMore)
                    yield this._more();
            }
            return result;
        });
    }
    reduce(fn, accu) {
        return __awaiter(this, void 0, void 0, function* () {
            let index = 0;
            if (accu === undefined) {
                if (!this._result.length && !this._hasMore) {
                    yield this._more();
                }
                accu = this._result.shift();
                index += 1;
            }
            while (this._result.length || this._hasMore) {
                while (this._result.length) {
                    accu = fn(accu, this._result.shift(), index, this);
                    index++;
                }
                if (this._hasMore)
                    yield this._more();
            }
            return accu;
        });
    }
}
exports.ArrayCursor = ArrayCursor;

},{}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = require("./util/error");
const messages = {
    0: "Network Error",
    400: "Bad Request",
    401: "Unauthorized",
    402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    407: "Proxy Authentication Required",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    411: "Length Required",
    412: "Precondition Failed",
    413: "Payload Too Large",
    414: "Request-URI Too Long",
    415: "Unsupported Media Type",
    416: "Requested Range Not Satisfiable",
    417: "Expectation Failed",
    418: "I'm a teapot",
    421: "Misdirected Request",
    422: "Unprocessable Entity",
    423: "Locked",
    424: "Failed Dependency",
    426: "Upgrade Required",
    428: "Precondition Required",
    429: "Too Many Requests",
    431: "Request Header Fields Too Large",
    444: "Connection Closed Without Response",
    451: "Unavailable For Legal Reasons",
    499: "Client Closed Request",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
    505: "HTTP Version Not Supported",
    506: "Variant Also Negotiates",
    507: "Insufficient Storage",
    508: "Loop Detected",
    510: "Not Extended",
    511: "Network Authentication Required",
    599: "Network Connect Timeout Error"
};
const nativeErrorKeys = [
    "fileName",
    "lineNumber",
    "columnNumber",
    "stack",
    "description",
    "number"
];
function isC8Error(err) {
    return Boolean(err && err.isC8Error);
}
exports.isC8Error = isC8Error;
class C8Error extends error_1.default {
    constructor(response) {
        super();
        this.name = "C8Error";
        this.isC8Error = true;
        this.response = response;
        this.statusCode = response.statusCode;
        this.message = response.body.errorMessage;
        this.errorNum = response.body.errorNum;
        this.code = response.body.code;
        const err = new Error(this.message);
        err.name = this.name;
        for (const key of nativeErrorKeys) {
            if (err[key])
                this[key] = err[key];
        }
    }
}
exports.C8Error = C8Error;
class HttpError extends error_1.default {
    constructor(response) {
        super();
        this.name = "HttpError";
        this.response = response;
        this.statusCode = response.statusCode || 500;
        this.message = messages[this.statusCode] || messages[500];
        this.code = this.statusCode;
        const err = new Error(this.message);
        err.name = this.name;
        for (const key of nativeErrorKeys) {
            if (err[key])
                this[key] = err[key];
        }
    }
}
exports.HttpError = HttpError;

},{"./util/error":38}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Status;
(function (Status) {
    Status["OK"] = "OK";
    Status["WARN"] = "WARN";
    Status["ERROR"] = "ERROR";
})(Status = exports.Status || (exports.Status = {}));
var EntityType;
(function (EntityType) {
    EntityType["COLLECTION"] = "COLLECTION";
    EntityType["GRAPH"] = "GRAPH";
    EntityType["AUTH"] = "AUTH";
    EntityType["STREAM"] = "STREAM";
    EntityType["GEOFABRIC"] = "GEOFABRIC";
})(EntityType = exports.EntityType || (exports.EntityType = {}));
var ActionType;
(function (ActionType) {
    ActionType["CREATE"] = "CREATE";
    ActionType["UPDATE"] = "UPDATE";
    ActionType["DELETE"] = "DELETE";
    ActionType["EXECUTE"] = "EXECUTE";
    ActionType["LOGIN"] = "LOGIN";
})(ActionType = exports.ActionType || (exports.ActionType = {}));
class Event {
    constructor(connection, entityName, eventId) {
        this._connection = connection;
        this.entityName = entityName;
        this.eventId = eventId;
    }
    create(requestObject) {
        const { status, description, entityType, details, action, attributes } = requestObject;
        return this._connection.request({
            method: "POST",
            path: "/events",
            body: {
                status,
                description,
                entityName: this.entityName,
                entityType,
                details,
                action,
                attributes,
            }
        }, res => {
            this.eventId = res.body._key;
            return res.body;
        });
    }
    details() {
        if (!this.eventId) {
            throw new Error("Event ID is not set. Either provide while creating the handler or create a new event.");
        }
        return this._connection.request({
            method: "GET",
            path: `/events/${this.eventId}`,
        }, res => res.body);
    }
}
exports.Event = Event;

},{}],26:[function(require,module,exports){
(function (global){(function (){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const c8ql_query_1 = require("./c8ql-query");
const collection_1 = require("./collection");
const connection_1 = require("./connection");
const cursor_1 = require("./cursor");
const error_1 = require("./error");
const graph_1 = require("./graph");
const tenant_1 = require("./tenant");
const stream_1 = require("./stream");
const route_1 = require("./route");
const btoa_1 = require("./util/btoa");
const event_1 = require("./event");
const user_1 = require("./user");
const streamapps_1 = require("./streamapps");
function colToString(collection) {
    if (collection_1.isC8Collection(collection)) {
        return String(collection.name);
    }
    else
        return String(collection);
}
const FABRIC_NOT_FOUND = 1228;
class Fabric {
    constructor(config) {
        this._connection = new connection_1.Connection(config);
    }
    get name() {
        return this._connection.getFabricName() || null;
    }
    route(path, headers) {
        return new route_1.Route(this._connection, path, headers);
    }
    close() {
        this._connection.close();
    }
    // Fabric manipulation
    useFabric(fabricName) {
        this._connection.setFabricName(fabricName);
        return this;
    }
    useBearerAuth(token) {
        this._connection.setHeader("authorization", `Bearer ${token}`);
        return this;
    }
    useBasicAuth(username, password) {
        this._connection.setHeader("authorization", `Basic ${btoa_1.btoa(`${username}:${password}`)}`);
        return this;
    }
    get() {
        return this._connection.request({ path: "/database/current" }, (res) => res.body.result);
    }
    exists() {
        return this.get().then(() => true, (err) => {
            if (error_1.isC8Error(err) && err.errorNum === FABRIC_NOT_FOUND) {
                return false;
            }
            throw err;
        });
    }
    createFabric(fabricName, users, options) {
        return this._connection.request({
            method: "POST",
            path: "/database",
            body: { users: users || [], name: fabricName, options },
        }, (res) => res.body);
    }
    listFabrics() {
        return this._connection.request({ path: "/database" }, (res) => res.body.result);
    }
    listUserFabrics() {
        return this._connection.request({ path: "/database/user" }, (res) => res.body.result);
    }
    dropFabric(fabricName) {
        return this._connection.request({
            method: "DELETE",
            path: `/database/${fabricName}`,
        }, (res) => res.body);
    }
    login(email, password) {
        return this._connection.request({
            method: "POST",
            path: "/_open/auth",
            body: { email, password },
            absolutePath: true,
        }, (res) => {
            this.useBearerAuth(res.body.jwt);
            this.useTenant(res.body.tenant);
            return res.body;
        });
    }
    updateFabricSpotRegion(tenantName, fabricName, datacenter = "") {
        return this._connection.request({
            method: "PUT",
            path: `_tenant/${tenantName}/_fabric/${fabricName}/database/${datacenter}`,
            absolutePath: true,
        }, (res) => res.body);
    }
    getEvents() {
        return this._connection.request({
            method: "GET",
            path: `/events`,
        }, (res) => res.body);
    }
    deleteEvents(eventIds) {
        return this._connection.request({
            method: "DELETE",
            path: `/events`,
            body: JSON.stringify(eventIds),
        }, (res) => res.body);
    }
    event(entityName, eventId) {
        return new event_1.Event(this._connection, entityName, eventId);
    }
    // Collection manipulation
    collection(collectionName) {
        return new collection_1.DocumentCollection(this._connection, collectionName);
    }
    edgeCollection(collectionName) {
        return new collection_1.EdgeCollection(this._connection, collectionName);
    }
    listCollections(excludeSystem = true) {
        return this._connection.request({
            path: "/collection",
            qs: { excludeSystem },
        }, (res) => this._connection.c8Major <= 2 ? res.body.collections : res.body.result);
    }
    collections(excludeSystem = true) {
        return __awaiter(this, void 0, void 0, function* () {
            const collections = yield this.listCollections(excludeSystem);
            return collections.map((data) => collection_1.constructCollection(this._connection, data));
        });
    }
    truncate(excludeSystem = true) {
        return __awaiter(this, void 0, void 0, function* () {
            const collections = yield this.listCollections(excludeSystem);
            return yield Promise.all(collections.map((data) => this._connection.request({
                method: "PUT",
                path: `/collection/${data.name}/truncate`,
            }, (res) => res.body)));
        });
    }
    // Graph manipulation
    graph(graphName) {
        return new graph_1.Graph(this._connection, graphName);
    }
    listGraphs() {
        return this._connection.request({ path: "/_api/graph" }, (res) => res.body.graphs);
    }
    graphs() {
        return __awaiter(this, void 0, void 0, function* () {
            const graphs = yield this.listGraphs();
            return graphs.map((data) => this.graph(data._key));
        });
    }
    transaction(collections, action, params, options) {
        if (typeof params === "number") {
            options = params;
            params = undefined;
        }
        if (typeof options === "number") {
            options = { lockTimeout: options };
        }
        if (typeof collections === "string") {
            collections = { write: [collections] };
        }
        else if (Array.isArray(collections)) {
            collections = { write: collections.map(colToString) };
        }
        else if (collection_1.isC8Collection(collections)) {
            collections = { write: colToString(collections) };
        }
        else if (collections && typeof collections === "object") {
            collections = Object.assign({}, collections);
            if (collections.read) {
                if (!Array.isArray(collections.read)) {
                    collections.read = colToString(collections.read);
                }
                else
                    collections.read = collections.read.map(colToString);
            }
            if (collections.write) {
                if (!Array.isArray(collections.write)) {
                    collections.write = colToString(collections.write);
                }
                else
                    collections.write = collections.write.map(colToString);
            }
        }
        return this._connection.request({
            method: "POST",
            path: "/transaction",
            body: Object.assign({ collections,
                action,
                params }, options),
        }, (res) => res.body.result);
    }
    query(query, bindVars, opts) {
        if (c8ql_query_1.isC8QLQuery(query)) {
            opts = bindVars;
            bindVars = query.bindVars;
            query = query.query;
        }
        else if (c8ql_query_1.isC8QLLiteral(query)) {
            query = query.toC8QL();
        }
        return this._connection.request({
            method: "POST",
            path: "/cursor",
            body: Object.assign({}, opts, { query, bindVars }),
        }, (res) => new cursor_1.ArrayCursor(this._connection, res.body, res.host));
    }
    validateQuery(query) {
        return this._connection.request({
            method: "POST",
            path: "/query",
            body: { query },
        }, (res) => res.body);
    }
    explainQuery(explainQueryObj) {
        return this._connection.request({
            method: "POST",
            path: "/_api/explain",
            body: Object.assign({}, explainQueryObj),
        }, (res) => res.body);
    }
    getCurrentQueries() {
        return this._connection.request({
            path: "/query/current",
        }, (res) => res.body);
    }
    clearSlowQueries() {
        return this._connection.request({
            method: "DELETE",
            path: "/query/slow",
        }, (res) => res.body);
    }
    getSlowQueries() {
        return this._connection.request({
            path: "/query/slow",
        }, (res) => res.body);
    }
    terminateRunningQuery(queryId) {
        return this._connection.request({
            method: "DELETE",
            path: `/query/${queryId}`,
        }, (res) => res.body);
    }
    // Function management
    listFunctions() {
        return this._connection.request({ path: "/c8qlfunction" }, (res) => res.body);
    }
    createFunction(name, code, isDeterministic) {
        return this._connection.request({
            method: "POST",
            path: "/c8qlfunction",
            body: { name, code, isDeterministic },
        }, (res) => res.body);
    }
    dropFunction(name, group) {
        const path = typeof group === "boolean"
            ? `/c8qlfunction/${name}?group=${group}`
            : `/c8qlfunction/${name}`;
        return this._connection.request({
            method: "DELETE",
            path,
        }, (res) => res.body);
    }
    version(details = false) {
        return this._connection.request({
            method: "GET",
            path: `/_fabric/${this._connection.getFabricName()}/_api/version`,
            absolutePath: true,
            qs: { details },
        }, (res) => res.body);
    }
    // Tenant
    useTenant(tenantName) {
        this._connection.setTenantName(tenantName);
        return this;
    }
    tenant(email, tenantName) {
        return new tenant_1.Tenant(this._connection, email, tenantName);
    }
    listTenants() {
        return this._connection.request({
            method: "GET",
            path: "/tenants",
            absolutePath: true,
        }, (res) => res.body);
    }
    //Stream
    stream(streamName, local, isCollectionStream = false) {
        return new stream_1.Stream(this._connection, streamName, local, isCollectionStream);
    }
    /* -------------------------------- DUPLICATE ------------------------------- */
    // TODO: @RACHIT choose which Fn to deprecate
    getStreams(global = undefined) {
        return this._connection.request({
            method: "GET",
            path: "/streams",
            qs: global === undefined ? "" : `global=${global}`,
        }, (res) => res.body);
    }
    getAllStreams() {
        return this._connection.request({
            method: "GET",
            path: "/streams",
        }, (res) => res.body);
    }
    /* ----------------------------------- --- ---------------------------------- */
    // TODO: RACHIT/VIKAS DO WE STILL HAVE THIS API?
    listPersistentStreams(local = false) {
        return this._connection.request({
            method: "GET",
            path: `/streams/persistent`,
            qs: `local=${local}`,
        }, (res) => res.body);
    }
    clearBacklog() {
        return this._connection.request({
            method: "POST",
            path: "/streams/clearbacklog",
        }, (res) => res.body);
    }
    clearSubscriptionBacklog(subscription) {
        return this._connection.request({
            method: "POST",
            path: `/streams/clearbacklog/${subscription}`,
        }, (res) => res.body);
    }
    unsubscribe(subscription) {
        return this._connection.request({
            method: "POST",
            path: `/streams/unsubscribe/${subscription}`,
        }, (res) => res.body);
    }
    //edge locations
    getAllEdgeLocations() {
        return this._connection.request({
            method: "GET",
            path: "/datacenter/all",
            absolutePath: true,
        }, (res) => res.body);
    }
    getTenantEdgeLocations() {
        return this._connection.request({
            method: "GET",
            path: `/datacenter/_tenant/${this._connection.getTenantName()}`,
            absolutePath: true,
        }, (res) => res.body);
    }
    getLocalEdgeLocation() {
        return this._connection.request({
            method: "GET",
            path: "/datacenter/local",
            absolutePath: true,
        }, (res) => res.body);
    }
    changeEdgeLocationSpotStatus(dcName, isSpot) {
        return this._connection.request({
            method: "PUT",
            path: `_api/datacenter/${dcName}/${isSpot}`,
            absolutePath: true,
        }, (res) => res.body);
    }
    //user
    user(user, email = '') {
        return new user_1.default(this._connection, user, email);
    }
    getAllUsers() {
        return this._connection.request({
            method: "GET",
            path: `/_admin/user`,
        }, (res) => res.body);
    }
    //User Queries / RESTQL
    listSavedQueries() {
        return this._connection.request({
            method: "GET",
            path: `/restql/user`,
        }, (res) => res.body);
    }
    saveQuery(name, parameter = {}, value) {
        try {
            if (name.includes(" "))
                throw "Spaces are not allowed in query name";
            return this._connection.request({
                method: "POST",
                path: "/restql",
                body: {
                    query: {
                        name: name,
                        parameter: parameter,
                        value: value,
                    },
                },
            }, (res) => res.body);
        }
        catch (err) {
            return err;
        }
    }
    executeSavedQuery(queryName, bindVars = {}) {
        return this._connection.request({
            method: "POST",
            path: `/restql/execute/${queryName}`,
            body: {
                bindVars: bindVars,
            },
        }, (res) => res.body);
    }
    updateSavedQuery(queryName, parameter = {}, value) {
        return this._connection.request({
            method: "PUT",
            path: `/restql/${queryName}`,
            body: {
                query: {
                    parameter: parameter,
                    value: value,
                },
            },
        }, (res) => res.body);
    }
    deleteSavedQuery(queryName) {
        return this._connection.request({
            method: "DELETE",
            path: `/restql/${queryName}`,
        }, (res) => res.body);
    }
    createRestqlCursor(query, bindVars = {}) {
        return this._connection.request({
            method: "POST",
            path: `/restql/dynamic`,
            body: {
                bindVars: [bindVars],
                cache: true,
                count: true,
                options: {
                    profile: true,
                },
                query: query,
            },
        }, (res) => res.body);
    }
    // Stream Applications
    streamApp(appName) {
        return new streamapps_1.Streamapps(this._connection, appName);
    }
    createStreamApp(regions, appDefinition) {
        return this._connection.request({
            method: "POST",
            path: "/_api/streamapps",
            body: JSON.stringify({
                definition: appDefinition,
                regions: regions,
            }),
        }, (res) => res.body);
    }
    getAllStreamApps() {
        return this._connection.request({
            method: "GET",
            path: "/_api/streamapps",
        }, (res) => res.body);
    }
    validateStreamappDefinition(appDefinition) {
        return this._connection.request({
            method: "POST",
            path: "/_api/streamapps/validate",
            body: {
                definition: appDefinition,
            },
        }, (res) => res.body);
    }
    getSampleStreamApps() {
        return this._connection.request({
            method: "GET",
            path: "/_api/streamapps/samples",
        }, (res) => res.body);
    }
}
exports.Fabric = Fabric;

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./c8ql-query":19,"./collection":21,"./connection":22,"./cursor":23,"./error":24,"./event":25,"./graph":27,"./route":31,"./stream":33,"./streamapps":34,"./tenant":35,"./user":36,"./util/btoa":37}],27:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const collection_1 = require("./collection");
const error_1 = require("./error");
class GraphVertexCollection extends collection_1.BaseCollection {
    constructor(connection, name, graph) {
        super(connection, name);
        this.type = collection_1.CollectionType.DOCUMENT_COLLECTION;
        this.graph = graph;
    }
    document(documentHandle, graceful = false) {
        const result = this._connection.request({
            path: `/_api/graph/${this.graph.name}/vertex/${this._documentHandle(documentHandle)}`
        }, res => res.body.vertex);
        if (!graceful)
            return result;
        return result.catch(err => {
            if (error_1.isC8Error(err) && err.errorNum === collection_1.DOCUMENT_NOT_FOUND) {
                return null;
            }
            throw err;
        });
    }
    vertex(documentHandle, graceful = false) {
        return this.document(documentHandle, graceful);
    }
    save(data, opts) {
        return this._connection.request({
            method: "POST",
            path: `/_api/graph/${this.graph.name}/vertex/${this.name}`,
            body: data,
            qs: opts
        }, res => res.body.vertex);
    }
    replace(documentHandle, newValue, opts = {}) {
        var _a;
        const headers = {};
        if (typeof opts === "string") {
            opts = { rev: opts };
        }
        if (opts.rev) {
            let rev;
            (_a = opts, { rev } = _a, opts = __rest(_a, ["rev"]));
            headers["if-match"] = rev;
        }
        return this._connection.request({
            method: "PUT",
            path: `/_api/graph/${this.graph.name}/vertex/${this._documentHandle(documentHandle)}`,
            body: newValue,
            qs: opts,
            headers
        }, res => res.body.vertex);
    }
    update(documentHandle, newValue, opts = {}) {
        var _a;
        const headers = {};
        if (typeof opts === "string") {
            opts = { rev: opts };
        }
        if (opts.rev) {
            let rev;
            (_a = opts, { rev } = _a, opts = __rest(_a, ["rev"]));
            headers["if-match"] = rev;
        }
        return this._connection.request({
            method: "PATCH",
            path: `/_api/graph/${this.graph.name}/vertex/${this._documentHandle(documentHandle)}`,
            body: newValue,
            qs: opts,
            headers
        }, res => res.body.vertex);
    }
    remove(documentHandle, opts = {}) {
        var _a;
        const headers = {};
        if (typeof opts === "string") {
            opts = { rev: opts };
        }
        if (opts.rev) {
            let rev;
            (_a = opts, { rev } = _a, opts = __rest(_a, ["rev"]));
            headers["if-match"] = rev;
        }
        return this._connection.request({
            method: "DELETE",
            path: `/_api/graph/${this.graph.name}/vertex/${this._documentHandle(documentHandle)}`,
            qs: opts,
            headers
        }, res => res.body.removed);
    }
}
exports.GraphVertexCollection = GraphVertexCollection;
class GraphEdgeCollection extends collection_1.EdgeCollection {
    constructor(connection, name, graph) {
        super(connection, name);
        this.type = collection_1.CollectionType.EDGE_COLLECTION;
        this.type = collection_1.CollectionType.EDGE_COLLECTION;
        this.graph = graph;
    }
    document(documentHandle, graceful = false) {
        const result = this._connection.request({
            path: `/_api/graph/${this.graph.name}/edge/${this._documentHandle(documentHandle)}`
        }, res => res.body.edge);
        if (!graceful)
            return result;
        return result.catch(err => {
            if (error_1.isC8Error(err) && err.errorNum === collection_1.DOCUMENT_NOT_FOUND) {
                return null;
            }
            throw err;
        });
    }
    save(data, fromId, toId, opts) {
        if (fromId !== undefined) {
            if (toId !== undefined) {
                data._from = this._documentHandle(fromId);
                data._to = this._documentHandle(toId);
            }
            else {
                opts = fromId;
            }
        }
        return this._connection.request({
            method: "POST",
            path: `/_api/graph/${this.graph.name}/edge/${this.name}`,
            body: data,
            qs: opts
        }, res => res.body.edge);
    }
    replace(documentHandle, newValue, opts = {}) {
        var _a;
        const headers = {};
        if (typeof opts === "string") {
            opts = { rev: opts };
        }
        if (opts.rev) {
            let rev;
            (_a = opts, { rev } = _a, opts = __rest(_a, ["rev"]));
            headers["if-match"] = rev;
        }
        return this._connection.request({
            method: "PUT",
            path: `/_api/graph/${this.graph.name}/edge/${this._documentHandle(documentHandle)}`,
            body: newValue,
            qs: opts,
            headers
        }, res => res.body.edge);
    }
    update(documentHandle, newValue, opts = {}) {
        var _a;
        const headers = {};
        if (typeof opts === "string") {
            opts = { rev: opts };
        }
        if (opts.rev) {
            let rev;
            (_a = opts, { rev } = _a, opts = __rest(_a, ["rev"]));
            headers["if-match"] = rev;
        }
        return this._connection.request({
            method: "PATCH",
            path: `/_api/graph/${this.graph.name}/edge/${this._documentHandle(documentHandle)}`,
            body: newValue,
            qs: opts,
            headers
        }, res => res.body.edge);
    }
    remove(documentHandle, opts = {}) {
        var _a;
        const headers = {};
        if (typeof opts === "string") {
            opts = { rev: opts };
        }
        if (opts.rev) {
            let rev;
            (_a = opts, { rev } = _a, opts = __rest(_a, ["rev"]));
            headers["if-match"] = rev;
        }
        return this._connection.request({
            method: "DELETE",
            path: `/_api/graph/${this.graph.name}/edge/${this._documentHandle(documentHandle)}`,
            qs: opts,
            headers
        }, res => res.body.removed);
    }
}
exports.GraphEdgeCollection = GraphEdgeCollection;
const GRAPH_NOT_FOUND = 1924;
class Graph {
    constructor(connection, name) {
        this.name = name;
        this._connection = connection;
    }
    get() {
        return this._connection.request({ path: `/_api/graph/${this.name}` }, res => res.body.graph);
    }
    exists() {
        return this.get().then(() => true, err => {
            if (error_1.isC8Error(err) && err.errorNum === GRAPH_NOT_FOUND) {
                return false;
            }
            throw err;
        });
    }
    create(properties = {}) {
        return this._connection.request({
            method: "POST",
            path: "/_api/graph",
            body: Object.assign({}, properties, { name: this.name })
        }, res => res.body.graph);
    }
    drop(dropCollections = false) {
        return this._connection.request({
            method: "DELETE",
            path: `/_api/graph/${this.name}`,
            qs: { dropCollections }
        }, res => res.body.removed);
    }
    vertexCollection(collectionName) {
        return new GraphVertexCollection(this._connection, collectionName, this);
    }
    listVertexCollections() {
        return this._connection.request({ path: `/_api/graph/${this.name}/vertex` }, res => res.body.collections);
    }
    vertexCollections() {
        return __awaiter(this, void 0, void 0, function* () {
            const names = yield this.listVertexCollections();
            return names.map((name) => new GraphVertexCollection(this._connection, name, this));
        });
    }
    addVertexCollection(collection) {
        if (collection_1.isC8Collection(collection)) {
            collection = collection.name;
        }
        return this._connection.request({
            method: "POST",
            path: `/_api/graph/${this.name}/vertex`,
            body: { collection }
        }, res => res.body.graph);
    }
    removeVertexCollection(collection, dropCollection = false) {
        if (collection_1.isC8Collection(collection)) {
            collection = collection.name;
        }
        return this._connection.request({
            method: "DELETE",
            path: `/_api/graph/${this.name}/vertex/${collection}`,
            qs: {
                dropCollection
            }
        }, res => res.body.graph);
    }
    edgeCollection(collectionName) {
        return new GraphEdgeCollection(this._connection, collectionName, this);
    }
    listEdgeCollections() {
        return this._connection.request({ path: `/_api/graph/${this.name}/edge` }, res => res.body.collections);
    }
    edgeCollections() {
        return __awaiter(this, void 0, void 0, function* () {
            const names = yield this.listEdgeCollections();
            return names.map((name) => new GraphEdgeCollection(this._connection, name, this));
        });
    }
    addEdgeDefinition(definition) {
        return this._connection.request({
            method: "POST",
            path: `/_api/graph/${this.name}/edge`,
            body: definition
        }, res => res.body.graph);
    }
    replaceEdgeDefinition(definitionName, definition) {
        return this._connection.request({
            method: "PUT",
            path: `/_api/graph/${this.name}/edge/${definitionName}`,
            body: definition
        }, res => res.body.graph);
    }
    removeEdgeDefinition(definitionName, dropCollection = false) {
        return this._connection.request({
            method: "DELETE",
            path: `/_api/graph/${this.name}/edge/${definitionName}`,
            qs: {
                dropCollection
            }
        }, res => res.body.graph);
    }
}
exports.Graph = Graph;

},{"./collection":21,"./error":24}],28:[function(require,module,exports){
"use strict";
module.exports = require("./jsC8").default;
module.exports.default = module.exports;
Object.defineProperty(module.exports, "__esModule", { value: true });

},{"./jsC8":29}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const c8ql_query_1 = require("./c8ql-query");
exports.c8ql = c8ql_query_1.c8ql;
const collection_1 = require("./collection");
exports.BaseCollection = collection_1.BaseCollection;
const fabric_1 = require("./fabric");
exports.Fabric = fabric_1.Fabric;
const error_1 = require("./error");
const cursor_1 = require("./cursor");
exports.ArrayCursor = cursor_1.ArrayCursor;
const client_1 = require("./client");
exports.C8Client = client_1.C8Client;
function jsC8(config) {
    return new client_1.C8Client(config);
}
exports.default = jsC8;
Object.assign(jsC8, { CollectionType: collection_1.CollectionType, C8Error: error_1.C8Error, Fabric: fabric_1.Fabric, c8ql: c8ql_query_1.c8ql, C8Client: client_1.C8Client });
var collection_2 = require("./collection");
exports.DocumentCollection = collection_2.DocumentCollection;
exports.EdgeCollection = collection_2.EdgeCollection;
var graph_1 = require("./graph");
exports.Graph = graph_1.Graph;
var tenant_1 = require("./tenant");
exports.Tenant = tenant_1.Tenant;
var stream_1 = require("./stream");
exports.Stream = stream_1.Stream;
var streamapps_1 = require("./streamapps");
exports.Streamapps = streamapps_1.Streamapps;

},{"./c8ql-query":19,"./client":20,"./collection":21,"./cursor":23,"./error":24,"./fabric":26,"./graph":27,"./stream":33,"./streamapps":34,"./tenant":35}],30:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class KeyValue {
    constructor(connection, name) {
        this._connection = connection;
        this.name = name;
    }
    getCollections() {
        return this._connection.request({
            method: "GET",
            path: "/_api/kv",
        }, (res) => res.body);
    }
    getKVCount() {
        return this._connection.request({
            method: "GET",
            path: `/_api/kv/${this.name}/count`,
        }, (res) => res.body);
    }
    getKVKeys(opts = {}) {
        return this._connection.request({
            method: "GET",
            path: `/_api/kv/${this.name}/keys`,
            qs: Object.assign({}, opts)
        }, (res) => res.body);
    }
    getValueForKey(key) {
        return this._connection.request({
            method: "GET",
            path: `/_api/kv/${this.name}/value/${key}`,
        }, (res) => res.body);
    }
    createCollection(expiration = false) {
        return this._connection.request({
            method: "POST",
            path: `/_api/kv/${this.name}`,
            qs: {
                expiration
            },
        }, (res) => res.body);
    }
    deleteCollection() {
        return this._connection.request({
            method: "DELETE",
            path: `/_api/kv/${this.name}`,
        }, (res) => res.body);
    }
    deleteEntryForKey(key) {
        return this._connection.request({
            method: "DELETE",
            path: `/_api/kv/${this.name}/value/${key}`,
        }, (res) => res.body);
    }
    deleteEntryForKeys(keys) {
        return this._connection.request({
            method: "DELETE",
            path: `/_api/kv/${this.name}/values`,
            body: keys
        }, (res) => res.body);
    }
    insertKVPairs(keyValuePairs) {
        return this._connection.request({
            method: "PUT",
            path: `/_api/kv/${this.name}/value`,
            body: keyValuePairs
        }, (res) => res.body);
    }
}
exports.KeyValue = KeyValue;

},{}],31:[function(require,module,exports){
"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
class Route {
    constructor(connection, path = "", headers = {}) {
        if (!path)
            path = "";
        else if (path.charAt(0) !== "/")
            path = `/${path}`;
        this._connection = connection;
        this._path = path;
        this._headers = headers;
    }
    route(path, headers) {
        if (!path)
            path = "";
        else if (path.charAt(0) !== "/")
            path = `/${path}`;
        return new Route(this._connection, this._path + path, Object.assign({}, this._headers, headers));
    }
    request(_a) {
        var { method, path, headers = {} } = _a, opts = __rest(_a, ["method", "path", "headers"]);
        if (!path)
            opts.path = "";
        else if (this._path && path.charAt(0) !== "/")
            opts.path = `/${path}`;
        else
            opts.path = path;
        opts.basePath = this._path;
        opts.headers = Object.assign({}, this._headers, headers);
        opts.method = method ? method.toUpperCase() : "GET";
        return this._connection.request(opts);
    }
    _request1(method, ...args) {
        let path = "";
        let qs;
        let headers;
        if (args[0] === undefined || typeof args[0] === "string") {
            path = args.shift();
        }
        if (args[0] === undefined || typeof args[0] === "object") {
            qs = args.shift();
        }
        if (args[0] === undefined || typeof args[0] === "object") {
            headers = args.shift();
        }
        return this.request({ method, path, qs, headers });
    }
    _request2(method, ...args) {
        let path = "";
        let body = undefined;
        let qs;
        let headers;
        if (args[0] === undefined || typeof args[0] === "string") {
            path = args.shift();
        }
        body = args.shift();
        if (args[0] === undefined || typeof args[0] === "object") {
            qs = args.shift();
        }
        if (args[0] === undefined || typeof args[0] === "object") {
            headers = args.shift();
        }
        return this.request({ method, path, body, qs, headers });
    }
    delete(...args) {
        return this._request1("DELETE", ...args);
    }
    get(...args) {
        return this._request1("GET", ...args);
    }
    head(...args) {
        return this._request1("HEAD", ...args);
    }
    patch(...args) {
        return this._request2("PATCH", ...args);
    }
    post(...args) {
        return this._request2("POST", ...args);
    }
    put(...args) {
        return this._request2("PUT", ...args);
    }
}
exports.Route = Route;

},{}],32:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Search {
    constructor(connection, searchOptions) {
        this.viewUrlPrefix = "/_api/search/view";
        this.analyzerUrlPrefix = "/_api/search/analyzer";
        this._connection = connection;
        this._viewName = (searchOptions && searchOptions.viewName) || "";
        this._analyzerName = (searchOptions && searchOptions.analyzerName) || "";
    }
    setSearch(collectionName, enable, field) {
        return this._connection.request({
            method: "POST",
            path: `/_api/search/collection/${collectionName}`,
            qs: {
                enable,
                field
            },
            absolutePath: true,
            body: {}
        }, res => res.body);
    }
    searchInCollection(collection, search, bindVars = {}, ttl = 60) {
        return this._connection.request({
            method: "POST",
            path: "/_api/search",
            body: {
                collection,
                search,
                bindVars,
                ttl
            },
            absolutePath: true
        }, res => res.body);
    }
    getListOfViews() {
        return this._connection.request({
            method: "GET",
            path: `${this.viewUrlPrefix}`,
            absolutePath: true
        }, res => res.body);
    }
    createView(properties = {}) {
        return this._connection.request({
            method: "POST",
            path: `${this.viewUrlPrefix}`,
            body: {
                type: "search",
                name: this._viewName,
                properties
            },
            absolutePath: true
        }, res => res.body);
    }
    getViewInfo() {
        return this._connection.request({
            method: "GET",
            path: `${this.viewUrlPrefix}/${this._viewName}`,
            absolutePath: true
        }, res => res.body);
    }
    renameView(name) {
        return this._connection.request({
            method: "PUT",
            path: `${this.viewUrlPrefix}/${this._viewName}/rename`,
            absolutePath: true,
            body: {
                name
            }
        }, res => res.body);
    }
    deleteView() {
        return this._connection.request({
            method: "DELETE",
            path: `${this.viewUrlPrefix}/${this._viewName}`,
            absolutePath: true
        }, res => res.body);
    }
    getViewProperties() {
        return this._connection.request({
            method: "GET",
            path: `${this.viewUrlPrefix}/${this._viewName}/properties`,
            absolutePath: true
        }, res => res.body);
    }
    updateViewProperties(properties) {
        return this._connection.request({
            method: "PUT",
            path: `${this.viewUrlPrefix}/${this._viewName}/properties`,
            absolutePath: true,
            body: properties
        }, res => res.body);
    }
    getListOfAnalyzers() {
        return this._connection.request({
            method: "GET",
            path: `${this.analyzerUrlPrefix}`,
            absolutePath: true
        }, res => res.body);
    }
    createAnalyzer(type, properties, features) {
        return this._connection.request({
            method: "POST",
            path: `${this.analyzerUrlPrefix}`,
            body: {
                name: this._analyzerName,
                type,
                features,
                properties
            },
            absolutePath: true
        }, res => res.body);
    }
    getAnalyzerDefinition() {
        return this._connection.request({
            method: "GET",
            path: `${this.analyzerUrlPrefix}/${this._analyzerName}`,
            absolutePath: true
        }, res => res.body);
    }
    deleteAnalyzer(force = false) {
        return this._connection.request({
            method: "DELETE",
            path: `${this.analyzerUrlPrefix}/${this._analyzerName}`,
            qs: {
                force
            },
            absolutePath: true
        }, res => res.body);
    }
}
exports.Search = Search;

},{}],33:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helper_1 = require("./util/helper");
const query_string_1 = require("query-string");
// 2 document
// 3 edge
// 4 persistent
const webSocket_1 = require("./util/webSocket");
var StreamConstants;
(function (StreamConstants) {
    StreamConstants["PERSISTENT"] = "persistent";
})(StreamConstants = exports.StreamConstants || (exports.StreamConstants = {}));
class Stream {
    constructor(connection, name, local = false, isCollectionStream = false) {
        this._connection = connection;
        this.isCollectionStream = isCollectionStream;
        /**
         * CHANGED this.local implementation to this.global
         * keeping the stream as local so !local
         */
        this.global = !local;
        this.name = name;
        let topic = this.name;
        if (!this.isCollectionStream) {
            if (this.global)
                topic = `c8globals.${this.name}`;
            else
                topic = `c8locals.${this.name}`;
        }
        this.topic = topic;
    }
    _getPath(useName, urlSuffix) {
        let topic = useName ? this.name : this.topic;
        return helper_1.getFullStreamPath(topic, urlSuffix);
    }
    getOtp() {
        return this._connection.request({
            method: "POST",
            path: "/apid/otp",
            absolutePath: true,
        }, (res) => res.body.otp);
    }
    createStream() {
        return this._connection.request({
            method: "POST",
            path: this._getPath(true),
            qs: `global=${this.global}`,
        }, (res) => res.body);
    }
    backlog() {
        const urlSuffix = "/backlog";
        return this._connection.request({
            method: "GET",
            path: this._getPath(false, urlSuffix),
            qs: `global=${this.global}`,
        }, (res) => res.body);
    }
    clearBacklog() {
        const urlSuffix = `/clearbacklog`;
        return this._connection.request({
            method: "POST",
            path: this._getPath(false, urlSuffix),
            qs: `global=${this.global}`,
        }, (res) => res.body);
    }
    getStreamStatistics() {
        const urlSuffix = "/stats";
        return this._connection.request({
            method: "GET",
            path: this._getPath(false, urlSuffix),
            qs: `global=${this.global}`,
        }, (res) => res.body);
    }
    deleteSubscription(subscription) {
        const urlSuffix = `/subscription/${subscription}`;
        return this._connection.request({
            method: "DELETE",
            path: this._getPath(false, urlSuffix),
            qs: `global=${this.global}`,
        }, (res) => res.body);
    }
    expireMessages(expireTimeInSeconds) {
        const urlSuffix = `/expiry/${expireTimeInSeconds}`;
        return this._connection.request({
            method: "POST",
            path: this._getPath(false, urlSuffix),
            qs: `global=${this.global}`,
        }, (res) => res.body);
    }
    clearSubscriptionBacklog(subscription) {
        const urlSuffix = `/clearbacklog/${subscription}`;
        return this._connection.request({
            method: "POST",
            path: this._getPath(false, urlSuffix),
            qs: `global=${this.global}`,
        }, (res) => res.body);
    }
    getSubscriptionList() {
        const urlSuffix = "/subscriptions";
        return this._connection.request({
            method: "GET",
            path: this._getPath(false, urlSuffix),
            qs: `global=${this.global}`,
        }, (res) => res.body);
    }
    deleteStream(force = false) {
        return this._connection.request({
            method: "DELETE",
            path: this._getPath(false),
            qs: `global=${this.global}&force=${force}`,
        }, (res) => res.body);
    }
    consumer(subscriptionName, dcName, params = {}) {
        const lowerCaseUrl = dcName.toLocaleLowerCase();
        if (lowerCaseUrl.includes("http") || lowerCaseUrl.includes("https"))
            throw "Invalid DC name";
        const persist = StreamConstants.PERSISTENT;
        const region = this.global ? "c8global" : "c8local";
        const tenant = this._connection.getTenantName();
        const queryParams = query_string_1.stringify(params);
        let dbName = this._connection.getFabricName();
        if (!dbName || !tenant)
            throw "Set correct DB and/or tenant name before using.";
        let consumerUrl = `wss://api-${dcName}/_ws/ws/v2/consumer/${persist}/${tenant}/${region}.${dbName}/${this.topic}/${subscriptionName}`;
        // Appending query params to the url
        consumerUrl = `${consumerUrl}?${queryParams}`;
        return webSocket_1.ws(consumerUrl);
    }
    producer(dcName, params = {}) {
        if (!dcName)
            throw "DC name not provided to establish producer connection";
        const lowerCaseUrl = dcName.toLocaleLowerCase();
        if (lowerCaseUrl.includes("http") || lowerCaseUrl.includes("https"))
            throw "Invalid DC name";
        const persist = StreamConstants.PERSISTENT;
        const region = this.global ? "c8global" : "c8local";
        const tenant = this._connection.getTenantName();
        const queryParams = query_string_1.stringify(params);
        let dbName = this._connection.getFabricName();
        if (!dbName || !tenant)
            throw "Set correct DB and/or tenant name before using.";
        let producerUrl = `wss://api-${dcName}/_ws/ws/v2/producer/${persist}/${tenant}/${region}.${dbName}/${this.topic}`;
        // Appending query params to the url
        producerUrl = `${producerUrl}?${queryParams}`;
        return webSocket_1.ws(producerUrl);
    }
    publishMessage(message) {
        const urlSuffix = "/publish";
        return this._connection.request({
            method: "POST",
            path: this._getPath(false, urlSuffix),
            qs: `global=${this.global}`,
            body: message,
        }, (res) => res.body);
    }
    getMessageTtl() {
        return this._connection.request({
            method: "GET",
            path: "/_api/streams/ttl",
        }, (res) => res.body);
    }
    setMessageTtl(ttl = 3600) {
        return this._connection.request({
            method: "POST",
            path: `/_api/streams/ttl/${ttl}`,
        }, (res) => res.body);
    }
    deleteSubscriptions(subscription) {
        const urlSuffix = `/subscriptions/${subscription}`;
        return this._connection.request({
            method: "DELETE",
            path: this._getPath(false, urlSuffix),
            qs: `global=${this.global}`,
        }, (res) => res.body);
    }
}
exports.Stream = Stream;

},{"./util/helper":39,"./util/webSocket":42,"query-string":49}],34:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Streamapps {
    constructor(connection, appName) {
        this._connection = connection;
        this.name = appName;
    }
    retriveApplication() {
        return this._connection.request({
            method: "GET",
            path: `/_api/streamapps/${this.name}`,
        }, res => res.body);
    }
    updateApplication(regions, appDefinition) {
        return this._connection.request({
            method: "PUT",
            path: `/_api/streamapps/${this.name}`,
            body: JSON.stringify({
                "definition": appDefinition,
                "regions": regions,
            })
        }, res => res.body);
    }
    deleteApplication() {
        return this._connection.request({
            method: "DELETE",
            path: `/_api/streamapps/${this.name}`,
        }, res => res.body);
    }
    activateStreamApplication(active) {
        return this._connection.request({
            method: "PATCH",
            path: `/_api/streamapps/${this.name}/active?active=${active}`,
        }, res => res.body);
    }
    query(query) {
        return this._connection.request({
            method: "POST",
            path: `/_api/streamapps/query/${this.name}`,
            body: {
                "query": query
            }
        }, res => res.body);
    }
}
exports.Streamapps = Streamapps;

},{}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Tenant {
    constructor(connection, email, tenantName) {
        this._connection = connection;
        this.name = tenantName;
        this.email = email;
    }
    createTenant(passwd, dcList, extra = {}) {
        return this._connection.request({
            method: "POST",
            path: "/tenant",
            absolutePath: true,
            body: {
                dcList: Array.isArray(dcList) ? dcList.join(',') : dcList,
                email: this.email,
                passwd,
                extra
            }
        }, res => {
            this.name = res.body.tenant;
            return res.body;
        });
    }
    dropTenant() {
        return this._connection.request({
            method: "DELETE",
            path: `/tenant/${this.name}`,
            absolutePath: true
        }, res => res.body);
    }
    getTenantEdgeLocations() {
        return this._connection.request({
            method: "GET",
            path: `/datacenter/_tenant/${this.name}`,
            absolutePath: true
        }, res => res.body);
    }
    tenantDetails() {
        return this._connection.request({
            method: "GET",
            path: `/tenant/${this.name}`,
            absolutePath: true
        }, res => res.body);
    }
    modifyTenant(passwd, extra) {
        return this._connection.request({
            method: "PATCH",
            path: `/tenant/${this.name}`,
            absolutePath: true,
            body: {
                extra,
                passwd
            }
        }, res => res.body);
    }
}
exports.Tenant = Tenant;

},{}],36:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = require("./error");
exports.USER_NOT_FOUND = 1703;
class User {
    constructor(connection, user, email = '') {
        this.user = "";
        this.urlPrefix = "/_admin/user";
        this.user = user;
        this._connection = connection;
        this.email = email;
    }
    createUser(passwd = "", active = true, extra = {}) {
        return this._connection.request({
            method: "POST",
            path: this.urlPrefix,
            body: {
                user: this.user,
                email: this.email,
                passwd: passwd,
                active,
                extra
            }
        }, res => res.body);
    }
    getUserDeatils() {
        return this._connection.request({
            method: "GET",
            path: `${this.urlPrefix}/${this.user}`
        }, res => res.body);
    }
    hasUser() {
        return this.getUserDeatils().then(() => true, (err) => {
            if (error_1.isC8Error(err) && err.errorNum === exports.USER_NOT_FOUND) {
                return false;
            }
            throw err;
        });
    }
    deleteUser() {
        return this._connection.request({
            method: "DELETE",
            path: `${this.urlPrefix}/${this.user}`
        }, res => res.body);
    }
    _makeModification(config, methodType) {
        return this._connection.request({
            method: methodType,
            path: `${this.urlPrefix}/${this.user}`,
            body: Object.assign({}, config)
        }, res => res.body);
    }
    modifyUser(config) {
        return this._makeModification(config, "PATCH");
    }
    replaceUser(config) {
        return this._makeModification(config, "PUT");
    }
    getAllDatabases(isFullRequested = false) {
        return this._connection.request({
            method: "GET",
            path: `${this.urlPrefix}/${this.user}/database`,
            qs: {
                full: isFullRequested
            }
        }, res => res.body);
    }
    getDatabaseAccessLevel(databaseName) {
        return this._connection.request({
            method: "GET",
            path: `${this.urlPrefix}/${this.user}/database/${databaseName}`
        }, res => res.body);
    }
    clearDatabaseAccessLevel(fabricName) {
        return this._connection.request({
            method: "DELETE",
            path: `${this.urlPrefix}/${this.user}/database/${fabricName}`
        }, res => res.body);
    }
    setDatabaseAccessLevel(fabricName, permission) {
        return this._connection.request({
            method: "PUT",
            path: `${this.urlPrefix}/${this.user}/database/${fabricName}`,
            body: {
                grant: permission
            }
        }, res => res.body);
    }
    getCollectionAccessLevel(databaseName, collectionName) {
        return this._connection.request({
            method: "GET",
            path: `${this.urlPrefix}/${this.user}/database/${databaseName}/collection/${collectionName}`
        }, res => res.body);
    }
    clearCollectionAccessLevel(fabricName, collectionName) {
        return this._connection.request({
            method: "DELETE",
            path: `${this.urlPrefix}/${this.user}/database/${fabricName}/collection/${collectionName}`
        }, res => res.body);
    }
    setCollectionAccessLevel(fabricName, collectionName, permission) {
        return this._connection.request({
            method: "PUT",
            path: `${this.urlPrefix}/${this.user}/database/${fabricName}/collection/${collectionName}`,
            body: {
                grant: permission
            }
        }, res => res.body);
    }
    listAvailableUsers() {
        return this._connection.request({
            method: "GET",
            path: `${this.urlPrefix}`
        }, res => res.body);
    }
    getStreamAccessLevel(databaseName, streamName) {
        return this._connection.request({
            method: "GET",
            path: `${this.urlPrefix}/${this.user}/database/${databaseName}/stream/${streamName}`
        }, res => res.body);
    }
    clearStreamAccessLevel(databaseName, streamName) {
        return this._connection.request({
            method: "DELETE",
            path: `${this.urlPrefix}/${this.user}/database/${databaseName}/stream/${streamName}`
        }, res => res.body);
    }
    setStreamAccessLevel(databaseName, streamName, permission) {
        return this._connection.request({
            method: "PUT",
            path: `${this.urlPrefix}/${this.user}/database/${databaseName}/stream/${streamName}`,
            body: {
                grant: permission
            }
        }, res => res.body);
    }
    listAccessibleCollections(databaseName, isFullRequested = false) {
        return this._connection.request({
            method: "GET",
            path: `${this.urlPrefix}/${this.user}/database/${databaseName}/collection`,
            qs: {
                full: isFullRequested
            }
        }, res => res.body);
    }
    listAccessibleStreams(databaseName, isFullRequested = false) {
        return this._connection.request({
            method: "GET",
            path: `${this.urlPrefix}/${this.user}/database/${databaseName}/stream`,
            qs: {
                full: isFullRequested
            }
        }, res => res.body);
    }
    getBillingAccessLevel() {
        return this._connection.request({
            method: "GET",
            path: `${this.urlPrefix}/${this.user}/billing`
        }, res => res.body);
    }
    clearBillingAccessLevel() {
        return this._connection.request({
            method: "DELETE",
            path: `${this.urlPrefix}/${this.user}/billing`
        }, res => res.body);
    }
    setBillingAccessLevel(permission) {
        return this._connection.request({
            method: "PUT",
            path: `${this.urlPrefix}/${this.user}/billing`,
            body: {
                grant: permission
            }
        }, res => res.body);
    }
}
exports.default = User;

},{"./error":24}],37:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function btoa(str) {
    return window.btoa(str);
}
exports.btoa = btoa;

},{}],38:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let ExtendableError = require("es6-error");
ExtendableError = ExtendableError.default || ExtendableError;
exports.default = ExtendableError;

},{"es6-error":14}],39:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getFullStreamPath(topic, extraUrl) {
    const baseUrl = `/streams/${topic}`;
    const path = extraUrl ? `${baseUrl}${extraUrl}` : baseUrl;
    return path;
}
exports.getFullStreamPath = getFullStreamPath;
function getDCListString(response) {
    const dcList = response.reduce((acc, elem, index) => {
        if (index > 0)
            return `${acc},${elem.name}`;
        return elem.name;
    }, "");
    return dcList;
}
exports.getDCListString = getDCListString;

},{}],40:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
exports.joinPath = path_1.join;

},{"path":4}],41:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const joinPath_1 = require("./joinPath");
const xhr_1 = require("./xhr");
const connection_1 = require("../connection");
exports.isBrowser = true;
function omit(obj, keys) {
    const result = {};
    for (const key of Object.keys(obj)) {
        if (keys.includes(key))
            continue;
        result[key] = obj[key];
    }
    return result;
}
function createRequest(baseUrl, agentOptions, fetch) {
    const baseUrlParts = url_1.parse(baseUrl);
    const options = omit(agentOptions, [
        "keepAlive",
        "keepAliveMsecs",
        "maxSockets",
    ]);
    return function request({ method, url, headers, body, expectBinary }, cb) {
        const urlParts = Object.assign({}, baseUrlParts, { pathname: url.pathname
                ? baseUrlParts.pathname
                    ? joinPath_1.joinPath(baseUrlParts.pathname, url.pathname)
                    : url.pathname
                : baseUrlParts.pathname, search: url.search
                ? baseUrlParts.search
                    ? `${baseUrlParts.search}&${url.search.slice(1)}`
                    : url.search
                : baseUrlParts.search });
        let callback = (err, res) => {
            callback = () => undefined;
            cb(err, res);
        };
        if (fetch) {
            const req = fetch(url_1.format(urlParts), Object.assign({}, options, { body,
                method,
                headers }))
                .then((res) => {
                const contentType = res.headers.get("content-type");
                // TODO: make it work for other content-types too
                // to make "fetch" a truly native agent in jsc8
                if (contentType.match(connection_1.MIME_JSON)) {
                    return res;
                }
                else {
                    throw res;
                }
            })
                .then((data) => {
                callback(null, data);
            })
                .catch((err) => {
                const error = {};
                error.request = req;
                if (err.status) {
                    error.status = err.status;
                }
                if (err.statusText) {
                    error.statusText = err.statusText;
                }
                callback(error);
            });
        }
        else {
            const req = xhr_1.default(Object.assign({ responseType: expectBinary ? "blob" : "text" }, options, { url: url_1.format(urlParts), useXDR: true, body,
                method,
                headers }), (err, res) => {
                if (!err) {
                    if (!res.body)
                        res.body = "";
                    callback(null, res);
                }
                else {
                    const error = err;
                    error.request = req;
                    callback(error);
                }
            });
        }
    };
}
exports.createRequest = createRequest;

},{"../connection":22,"./joinPath":40,"./xhr":43,"url":10}],42:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function ws(url) {
    const conn = new WebSocket(url);
    return {
        on: function (operation, callback) {
            const operationCallback = (event) => callback(event);
            switch (operation) {
                case 'open':
                    conn.onopen = operationCallback;
                    break;
                case 'close':
                    conn.onclose = operationCallback;
                    break;
                case 'error':
                    conn.onerror = operationCallback;
                    break;
                case 'message':
                    conn.onmessage = (event) => callback(event.data);
                    break;
            }
        },
        send: function (msg) {
            conn.send(msg);
        },
        terminate: function (code, reason) {
            conn.close(code, reason);
        },
        getConnection: function () { return conn; }
    };
}
exports.ws = ws;

},{}],43:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = require("xhr");

},{"xhr":52}],44:[function(require,module,exports){
/**
 * The code was extracted from:
 * https://github.com/davidchambers/Base64.js
 */

var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function InvalidCharacterError(message) {
  this.message = message;
}

InvalidCharacterError.prototype = new Error();
InvalidCharacterError.prototype.name = 'InvalidCharacterError';

function polyfill (input) {
  var str = String(input).replace(/=+$/, '');
  if (str.length % 4 == 1) {
    throw new InvalidCharacterError("'atob' failed: The string to be decoded is not correctly encoded.");
  }
  for (
    // initialize result and counters
    var bc = 0, bs, buffer, idx = 0, output = '';
    // get next character
    buffer = str.charAt(idx++);
    // character found in table? initialize bit storage and add its ascii value;
    ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
      // and if not first of each 4 characters,
      // convert the first 8 bits to one ascii character
      bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
  ) {
    // try to find character in table (0-63, not found => -1)
    buffer = chars.indexOf(buffer);
  }
  return output;
}


module.exports = typeof window !== 'undefined' && window.atob && window.atob.bind(window) || polyfill;

},{}],45:[function(require,module,exports){
var atob = require('./atob');

function b64DecodeUnicode(str) {
  return decodeURIComponent(atob(str).replace(/(.)/g, function (m, p) {
    var code = p.charCodeAt(0).toString(16).toUpperCase();
    if (code.length < 2) {
      code = '0' + code;
    }
    return '%' + code;
  }));
}

module.exports = function(str) {
  var output = str.replace(/-/g, "+").replace(/_/g, "/");
  switch (output.length % 4) {
    case 0:
      break;
    case 2:
      output += "==";
      break;
    case 3:
      output += "=";
      break;
    default:
      throw "Illegal base64url string!";
  }

  try{
    return b64DecodeUnicode(output);
  } catch (err) {
    return atob(output);
  }
};

},{"./atob":44}],46:[function(require,module,exports){
'use strict';

var base64_url_decode = require('./base64_url_decode');

function InvalidTokenError(message) {
  this.message = message;
}

InvalidTokenError.prototype = new Error();
InvalidTokenError.prototype.name = 'InvalidTokenError';

module.exports = function (token,options) {
  if (typeof token !== 'string') {
    throw new InvalidTokenError('Invalid token specified');
  }

  options = options || {};
  var pos = options.header === true ? 0 : 1;
  try {
    return JSON.parse(base64_url_decode(token.split('.')[pos]));
  } catch (e) {
    throw new InvalidTokenError('Invalid token specified: ' + e.message);
  }
};

module.exports.InvalidTokenError = InvalidTokenError;

},{"./base64_url_decode":45}],47:[function(require,module,exports){
module.exports = function () {
  Object.defineProperty(this, '_head', {
    value: undefined,
    writable: true,
    enumerable: false,
    configurable: false
  })
  Object.defineProperty(this, '_tail', {
    value: undefined,
    writable: true,
    enumerable: false,
    configurable: false
  })
  Object.defineProperty(this, '_next', {
    value: undefined,
    writable: true,
    enumerable: false,
    configurable: false
  })
  Object.defineProperty(this, '_length', {
    value: 0,
    writable: true,
    enumerable: false,
    configurable: false
  })
}

module.exports.prototype.__defineGetter__('head', function () {
  return this._head && this._head.data
})

module.exports.prototype.__defineGetter__('tail', function () {
  return this._tail && this._tail.data
})

module.exports.prototype.__defineGetter__('current', function () {
  return this._current && this._current.data
})

module.exports.prototype.__defineGetter__('length', function () {
  return this._length
})

module.exports.prototype.push = function (data) {
  this._tail = new Item(data, this._tail)
  if (this._length === 0) {
    this._head = this._tail
    this._current = this._head
    this._next = this._head
  }
  this._length++
}

module.exports.prototype.pop = function () {
  var tail = this._tail
  if (this._length === 0) {
    return
  }
  this._length--
  if (this._length === 0) {
    this._head = this._tail = this._current = this._next = undefined
    return tail.data
  }
  this._tail = tail.prev
  this._tail.next = undefined
  if (this._current === tail) {
    this._current = this._tail
    this._next = undefined
  }
  return tail.data
}

module.exports.prototype.shift = function () {
  var head = this._head
  if (this._length === 0)  {
    return
  }
  this._length--
  if (this._length === 0) {
    this._head = this._tail = this._current = this._next = undefined
    return head.data
  }
  this._head = this._head.next
  if (this._current === head) {
    this._current = this._head
    this._next = this._current.next
  }
  return head.data
}

module.exports.prototype.unshift = function (data) {
  this._head = new Item(data, undefined, this._head)
  if (this._length === 0)  {
    this._tail = this._head
    this._next = this._head
  }
  this._length++
}

module.exports.prototype.unshiftCurrent = function () {
  var current = this._current
  if (current === this._head || this._length < 2) {
    return current && current.data
  }
  // remove
  if (current === this._tail) {
    this._tail = current.prev
    this._tail.next = undefined
    this._current = this._tail
  } else {
    current.next.prev = current.prev
    current.prev.next = current.next
    this._current = current.prev
  }
  this._next = this._current.next
  // unshift
  current.next = this._head
  current.prev = undefined
  this._head.prev = current
  this._head = current
  return current.data
}

module.exports.prototype.removeCurrent = function (data) {
  var current = this._current
  if (this._length === 0) {
    return
  }
  this._length--
  if (this._length === 0) {
    this._head = this._tail = this._current = this._next = undefined
    return current.data
  }
  if (current === this._tail) {
    this._tail = current.prev
    this._tail.next = undefined
    this._current = this._tail
  } else if (current === this._head) {
    this._head = current.next
    this._head.prev = undefined
    this._current = this._head
  } else {
    current.next.prev = current.prev
    current.prev.next = current.next
    this._current = current.prev
  }
  this._next = this._current.next
  return current.data
}

module.exports.prototype.next = function () {
  var next = this._next
  if (next !== undefined) {
    this._next = next.next
    this._current = next
    return next.data
  }
}

module.exports.prototype.resetCursor = function () {
  this._current = this._next = this._head
  return this
}

function Item (data, prev, next) {
  this.next = next
  if (next) next.prev = this
  this.prev = prev
  if (prev) prev.next = this
  this.data = data
}
},{}],48:[function(require,module,exports){
var trim = function(string) {
  return string.replace(/^\s+|\s+$/g, '');
}
  , isArray = function(arg) {
      return Object.prototype.toString.call(arg) === '[object Array]';
    }

module.exports = function (headers) {
  if (!headers)
    return {}

  var result = {}

  var headersArr = trim(headers).split('\n')

  for (var i = 0; i < headersArr.length; i++) {
    var row = headersArr[i]
    var index = row.indexOf(':')
    , key = trim(row.slice(0, index)).toLowerCase()
    , value = trim(row.slice(index + 1))

    if (typeof(result[key]) === 'undefined') {
      result[key] = value
    } else if (isArray(result[key])) {
      result[key].push(value)
    } else {
      result[key] = [ result[key], value ]
    }
  }

  return result
}

},{}],49:[function(require,module,exports){
'use strict';
const strictUriEncode = require('strict-uri-encode');
const decodeComponent = require('decode-uri-component');
const splitOnFirst = require('split-on-first');
const filterObject = require('filter-obj');

const isNullOrUndefined = value => value === null || value === undefined;

function encoderForArrayFormat(options) {
	switch (options.arrayFormat) {
		case 'index':
			return key => (result, value) => {
				const index = result.length;

				if (
					value === undefined ||
					(options.skipNull && value === null) ||
					(options.skipEmptyString && value === '')
				) {
					return result;
				}

				if (value === null) {
					return [...result, [encode(key, options), '[', index, ']'].join('')];
				}

				return [
					...result,
					[encode(key, options), '[', encode(index, options), ']=', encode(value, options)].join('')
				];
			};

		case 'bracket':
			return key => (result, value) => {
				if (
					value === undefined ||
					(options.skipNull && value === null) ||
					(options.skipEmptyString && value === '')
				) {
					return result;
				}

				if (value === null) {
					return [...result, [encode(key, options), '[]'].join('')];
				}

				return [...result, [encode(key, options), '[]=', encode(value, options)].join('')];
			};

		case 'comma':
		case 'separator':
			return key => (result, value) => {
				if (value === null || value === undefined || value.length === 0) {
					return result;
				}

				if (result.length === 0) {
					return [[encode(key, options), '=', encode(value, options)].join('')];
				}

				return [[result, encode(value, options)].join(options.arrayFormatSeparator)];
			};

		default:
			return key => (result, value) => {
				if (
					value === undefined ||
					(options.skipNull && value === null) ||
					(options.skipEmptyString && value === '')
				) {
					return result;
				}

				if (value === null) {
					return [...result, encode(key, options)];
				}

				return [...result, [encode(key, options), '=', encode(value, options)].join('')];
			};
	}
}

function parserForArrayFormat(options) {
	let result;

	switch (options.arrayFormat) {
		case 'index':
			return (key, value, accumulator) => {
				result = /\[(\d*)\]$/.exec(key);

				key = key.replace(/\[\d*\]$/, '');

				if (!result) {
					accumulator[key] = value;
					return;
				}

				if (accumulator[key] === undefined) {
					accumulator[key] = {};
				}

				accumulator[key][result[1]] = value;
			};

		case 'bracket':
			return (key, value, accumulator) => {
				result = /(\[\])$/.exec(key);
				key = key.replace(/\[\]$/, '');

				if (!result) {
					accumulator[key] = value;
					return;
				}

				if (accumulator[key] === undefined) {
					accumulator[key] = [value];
					return;
				}

				accumulator[key] = [].concat(accumulator[key], value);
			};

		case 'comma':
		case 'separator':
			return (key, value, accumulator) => {
				const isArray = typeof value === 'string' && value.includes(options.arrayFormatSeparator);
				const isEncodedArray = (typeof value === 'string' && !isArray && decode(value, options).includes(options.arrayFormatSeparator));
				value = isEncodedArray ? decode(value, options) : value;
				const newValue = isArray || isEncodedArray ? value.split(options.arrayFormatSeparator).map(item => decode(item, options)) : value === null ? value : decode(value, options);
				accumulator[key] = newValue;
			};

		default:
			return (key, value, accumulator) => {
				if (accumulator[key] === undefined) {
					accumulator[key] = value;
					return;
				}

				accumulator[key] = [].concat(accumulator[key], value);
			};
	}
}

function validateArrayFormatSeparator(value) {
	if (typeof value !== 'string' || value.length !== 1) {
		throw new TypeError('arrayFormatSeparator must be single character string');
	}
}

function encode(value, options) {
	if (options.encode) {
		return options.strict ? strictUriEncode(value) : encodeURIComponent(value);
	}

	return value;
}

function decode(value, options) {
	if (options.decode) {
		return decodeComponent(value);
	}

	return value;
}

function keysSorter(input) {
	if (Array.isArray(input)) {
		return input.sort();
	}

	if (typeof input === 'object') {
		return keysSorter(Object.keys(input))
			.sort((a, b) => Number(a) - Number(b))
			.map(key => input[key]);
	}

	return input;
}

function removeHash(input) {
	const hashStart = input.indexOf('#');
	if (hashStart !== -1) {
		input = input.slice(0, hashStart);
	}

	return input;
}

function getHash(url) {
	let hash = '';
	const hashStart = url.indexOf('#');
	if (hashStart !== -1) {
		hash = url.slice(hashStart);
	}

	return hash;
}

function extract(input) {
	input = removeHash(input);
	const queryStart = input.indexOf('?');
	if (queryStart === -1) {
		return '';
	}

	return input.slice(queryStart + 1);
}

function parseValue(value, options) {
	if (options.parseNumbers && !Number.isNaN(Number(value)) && (typeof value === 'string' && value.trim() !== '')) {
		value = Number(value);
	} else if (options.parseBooleans && value !== null && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
		value = value.toLowerCase() === 'true';
	}

	return value;
}

function parse(query, options) {
	options = Object.assign({
		decode: true,
		sort: true,
		arrayFormat: 'none',
		arrayFormatSeparator: ',',
		parseNumbers: false,
		parseBooleans: false
	}, options);

	validateArrayFormatSeparator(options.arrayFormatSeparator);

	const formatter = parserForArrayFormat(options);

	// Create an object with no prototype
	const ret = Object.create(null);

	if (typeof query !== 'string') {
		return ret;
	}

	query = query.trim().replace(/^[?#&]/, '');

	if (!query) {
		return ret;
	}

	for (const param of query.split('&')) {
		if (param === '') {
			continue;
		}

		let [key, value] = splitOnFirst(options.decode ? param.replace(/\+/g, ' ') : param, '=');

		// Missing `=` should be `null`:
		// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
		value = value === undefined ? null : ['comma', 'separator'].includes(options.arrayFormat) ? value : decode(value, options);
		formatter(decode(key, options), value, ret);
	}

	for (const key of Object.keys(ret)) {
		const value = ret[key];
		if (typeof value === 'object' && value !== null) {
			for (const k of Object.keys(value)) {
				value[k] = parseValue(value[k], options);
			}
		} else {
			ret[key] = parseValue(value, options);
		}
	}

	if (options.sort === false) {
		return ret;
	}

	return (options.sort === true ? Object.keys(ret).sort() : Object.keys(ret).sort(options.sort)).reduce((result, key) => {
		const value = ret[key];
		if (Boolean(value) && typeof value === 'object' && !Array.isArray(value)) {
			// Sort object keys, not values
			result[key] = keysSorter(value);
		} else {
			result[key] = value;
		}

		return result;
	}, Object.create(null));
}

exports.extract = extract;
exports.parse = parse;

exports.stringify = (object, options) => {
	if (!object) {
		return '';
	}

	options = Object.assign({
		encode: true,
		strict: true,
		arrayFormat: 'none',
		arrayFormatSeparator: ','
	}, options);

	validateArrayFormatSeparator(options.arrayFormatSeparator);

	const shouldFilter = key => (
		(options.skipNull && isNullOrUndefined(object[key])) ||
		(options.skipEmptyString && object[key] === '')
	);

	const formatter = encoderForArrayFormat(options);

	const objectCopy = {};

	for (const key of Object.keys(object)) {
		if (!shouldFilter(key)) {
			objectCopy[key] = object[key];
		}
	}

	const keys = Object.keys(objectCopy);

	if (options.sort !== false) {
		keys.sort(options.sort);
	}

	return keys.map(key => {
		const value = object[key];

		if (value === undefined) {
			return '';
		}

		if (value === null) {
			return encode(key, options);
		}

		if (Array.isArray(value)) {
			return value
				.reduce(formatter(key), [])
				.join('&');
		}

		return encode(key, options) + '=' + encode(value, options);
	}).filter(x => x.length > 0).join('&');
};

exports.parseUrl = (url, options) => {
	options = Object.assign({
		decode: true
	}, options);

	const [url_, hash] = splitOnFirst(url, '#');

	return Object.assign(
		{
			url: url_.split('?')[0] || '',
			query: parse(extract(url), options)
		},
		options && options.parseFragmentIdentifier && hash ? {fragmentIdentifier: decode(hash, options)} : {}
	);
};

exports.stringifyUrl = (object, options) => {
	options = Object.assign({
		encode: true,
		strict: true
	}, options);

	const url = removeHash(object.url).split('?')[0] || '';
	const queryFromUrl = exports.extract(object.url);
	const parsedQueryFromUrl = exports.parse(queryFromUrl, {sort: false});

	const query = Object.assign(parsedQueryFromUrl, object.query);
	let queryString = exports.stringify(query, options);
	if (queryString) {
		queryString = `?${queryString}`;
	}

	let hash = getHash(object.url);
	if (object.fragmentIdentifier) {
		hash = `#${encode(object.fragmentIdentifier, options)}`;
	}

	return `${url}${queryString}${hash}`;
};

exports.pick = (input, filter, options) => {
	options = Object.assign({
		parseFragmentIdentifier: true
	}, options);

	const {url, query, fragmentIdentifier} = exports.parseUrl(input, options);
	return exports.stringifyUrl({
		url,
		query: filterObject(query, filter),
		fragmentIdentifier
	}, options);
};

exports.exclude = (input, filter, options) => {
	const exclusionFilter = Array.isArray(filter) ? key => !filter.includes(key) : (key, value) => !filter(key, value);

	return exports.pick(input, exclusionFilter, options);
};

},{"decode-uri-component":13,"filter-obj":15,"split-on-first":50,"strict-uri-encode":51}],50:[function(require,module,exports){
'use strict';

module.exports = (string, separator) => {
	if (!(typeof string === 'string' && typeof separator === 'string')) {
		throw new TypeError('Expected the arguments to be of type `string`');
	}

	if (separator === '') {
		return [string];
	}

	const separatorIndex = string.indexOf(separator);

	if (separatorIndex === -1) {
		return [string];
	}

	return [
		string.slice(0, separatorIndex),
		string.slice(separatorIndex + separator.length)
	];
};

},{}],51:[function(require,module,exports){
'use strict';
module.exports = str => encodeURIComponent(str).replace(/[!'()*]/g, x => `%${x.charCodeAt(0).toString(16).toUpperCase()}`);

},{}],52:[function(require,module,exports){
"use strict";
var window = require("global/window")
var isFunction = require("is-function")
var parseHeaders = require("parse-headers")
var xtend = require("xtend")

module.exports = createXHR
// Allow use of default import syntax in TypeScript
module.exports.default = createXHR;
createXHR.XMLHttpRequest = window.XMLHttpRequest || noop
createXHR.XDomainRequest = "withCredentials" in (new createXHR.XMLHttpRequest()) ? createXHR.XMLHttpRequest : window.XDomainRequest

forEachArray(["get", "put", "post", "patch", "head", "delete"], function(method) {
    createXHR[method === "delete" ? "del" : method] = function(uri, options, callback) {
        options = initParams(uri, options, callback)
        options.method = method.toUpperCase()
        return _createXHR(options)
    }
})

function forEachArray(array, iterator) {
    for (var i = 0; i < array.length; i++) {
        iterator(array[i])
    }
}

function isEmpty(obj){
    for(var i in obj){
        if(obj.hasOwnProperty(i)) return false
    }
    return true
}

function initParams(uri, options, callback) {
    var params = uri

    if (isFunction(options)) {
        callback = options
        if (typeof uri === "string") {
            params = {uri:uri}
        }
    } else {
        params = xtend(options, {uri: uri})
    }

    params.callback = callback
    return params
}

function createXHR(uri, options, callback) {
    options = initParams(uri, options, callback)
    return _createXHR(options)
}

function _createXHR(options) {
    if(typeof options.callback === "undefined"){
        throw new Error("callback argument missing")
    }

    var called = false
    var callback = function cbOnce(err, response, body){
        if(!called){
            called = true
            options.callback(err, response, body)
        }
    }

    function readystatechange() {
        if (xhr.readyState === 4) {
            setTimeout(loadFunc, 0)
        }
    }

    function getBody() {
        // Chrome with requestType=blob throws errors arround when even testing access to responseText
        var body = undefined

        if (xhr.response) {
            body = xhr.response
        } else {
            body = xhr.responseText || getXml(xhr)
        }

        if (isJson) {
            try {
                body = JSON.parse(body)
            } catch (e) {}
        }

        return body
    }

    function errorFunc(evt) {
        clearTimeout(timeoutTimer)
        if(!(evt instanceof Error)){
            evt = new Error("" + (evt || "Unknown XMLHttpRequest Error") )
        }
        evt.statusCode = 0
        return callback(evt, failureResponse)
    }

    // will load the data & process the response in a special response object
    function loadFunc() {
        if (aborted) return
        var status
        clearTimeout(timeoutTimer)
        if(options.useXDR && xhr.status===undefined) {
            //IE8 CORS GET successful response doesn't have a status field, but body is fine
            status = 200
        } else {
            status = (xhr.status === 1223 ? 204 : xhr.status)
        }
        var response = failureResponse
        var err = null

        if (status !== 0){
            response = {
                body: getBody(),
                statusCode: status,
                method: method,
                headers: {},
                url: uri,
                rawRequest: xhr
            }
            if(xhr.getAllResponseHeaders){ //remember xhr can in fact be XDR for CORS in IE
                response.headers = parseHeaders(xhr.getAllResponseHeaders())
            }
        } else {
            err = new Error("Internal XMLHttpRequest Error")
        }
        return callback(err, response, response.body)
    }

    var xhr = options.xhr || null

    if (!xhr) {
        if (options.cors || options.useXDR) {
            xhr = new createXHR.XDomainRequest()
        }else{
            xhr = new createXHR.XMLHttpRequest()
        }
    }

    var key
    var aborted
    var uri = xhr.url = options.uri || options.url
    var method = xhr.method = options.method || "GET"
    var body = options.body || options.data
    var headers = xhr.headers = options.headers || {}
    var sync = !!options.sync
    var isJson = false
    var timeoutTimer
    var failureResponse = {
        body: undefined,
        headers: {},
        statusCode: 0,
        method: method,
        url: uri,
        rawRequest: xhr
    }

    if ("json" in options && options.json !== false) {
        isJson = true
        headers["accept"] || headers["Accept"] || (headers["Accept"] = "application/json") //Don't override existing accept header declared by user
        if (method !== "GET" && method !== "HEAD") {
            headers["content-type"] || headers["Content-Type"] || (headers["Content-Type"] = "application/json") //Don't override existing accept header declared by user
            body = JSON.stringify(options.json === true ? body : options.json)
        }
    }

    xhr.onreadystatechange = readystatechange
    xhr.onload = loadFunc
    xhr.onerror = errorFunc
    // IE9 must have onprogress be set to a unique function.
    xhr.onprogress = function () {
        // IE must die
    }
    xhr.onabort = function(){
        aborted = true;
    }
    xhr.ontimeout = errorFunc
    xhr.open(method, uri, !sync, options.username, options.password)
    //has to be after open
    if(!sync) {
        xhr.withCredentials = !!options.withCredentials
    }
    // Cannot set timeout with sync request
    // not setting timeout on the xhr object, because of old webkits etc. not handling that correctly
    // both npm's request and jquery 1.x use this kind of timeout, so this is being consistent
    if (!sync && options.timeout > 0 ) {
        timeoutTimer = setTimeout(function(){
            if (aborted) return
            aborted = true//IE9 may still call readystatechange
            xhr.abort("timeout")
            var e = new Error("XMLHttpRequest timeout")
            e.code = "ETIMEDOUT"
            errorFunc(e)
        }, options.timeout )
    }

    if (xhr.setRequestHeader) {
        for(key in headers){
            if(headers.hasOwnProperty(key)){
                xhr.setRequestHeader(key, headers[key])
            }
        }
    } else if (options.headers && !isEmpty(options.headers)) {
        throw new Error("Headers cannot be set on an XDomainRequest object")
    }

    if ("responseType" in options) {
        xhr.responseType = options.responseType
    }

    if ("beforeSend" in options &&
        typeof options.beforeSend === "function"
    ) {
        options.beforeSend(xhr)
    }

    // Microsoft Edge browser sends "undefined" when send is called with undefined value.
    // XMLHttpRequest spec says to pass null as body to indicate no body
    // See https://github.com/naugtur/xhr/issues/100.
    xhr.send(body || null)

    return xhr


}

function getXml(xhr) {
    // xhr.responseXML will throw Exception "InvalidStateError" or "DOMException"
    // See https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseXML.
    try {
        if (xhr.responseType === "document") {
            return xhr.responseXML
        }
        var firefoxBugTakenEffect = xhr.responseXML && xhr.responseXML.documentElement.nodeName === "parsererror"
        if (xhr.responseType === "" && !firefoxBugTakenEffect) {
            return xhr.responseXML
        }
    } catch (e) {}

    return null
}

function noop() {}

},{"global/window":16,"is-function":17,"parse-headers":48,"xtend":53}],53:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],54:[function(require,module,exports){
(function (Buffer){(function (){
const jsc8 = require('jsc8');

// Configure log file and input stream name if required
const logFileURL = "https://raw.githubusercontent.com/pzombade/mm-log-publisher/gh-pages/testlogs.log"; // server / testlogs / noramlized ;
const consoleLogSize = 300; // number of logs to be shown in the console

let startTime, count = 0;
let producer, fabricName, hostName, email, password;


// Publish the log on the producer stream
async function pulbishLog(line) {
    const message = {
        "log":line,
    };

    const payloadObj = { payload: Buffer.from(JSON.stringify(message)).toString("base64") };
    await producer.send(JSON.stringify(payloadObj));
}
   

// Publish the EOF file message
function publishEOF(){
    const eofFlag = "EOF";
    console.log("Sending EOF flag...");
    const eofLog=`14.66.139.0 - - [12/Feb/2021:00:00:23 +0100] "${eofFlag} /index.php?option=com_phocagallery&view=category&id=1:almhuette-raith&Itemid=53 HTTP/1.1" 404 32653 "-" "Mozilla/5.0 (compatible; bingbot/2.0; +https://www.macrometa.com)" "-"`;
    pulbishLog(eofLog);
    const endTime = new Date().getTime();
    const time = ( endTime - startTime) / 1000 / 60;

    $('#publishbtn').prop('disabled', false);
    $('#publishbtn').css('background-color', '#58a6e6');
    $("#msg").text(`Log streaming completed. Published ${count} logs.`).css("color", "#58a6e6");
    count = 0;
    console.log(`Published ${count} logs in ${time} minutes. It will take some time to reflect aggregated records in the collection.`);
}


// Parse the file into single lines
async function parseLogLines(result){
    var lines = result.split("\n");
    const length = lines.length;
    
    for (var i = 0; i < length; i++) {

        // Append the last 300 logs - TODO - This should be dynamic
        // if(length-i <= consoleLogSize){
        //     $("textarea#logstextarea").val($("textarea#logstextarea").val()+"\n"+lines[i]);
        // }
        
        await pulbishLog(lines[i]);
        lines[i] = undefined;
        count++;

        // When last line is reached publish EOF
        if( i+1 >= lines.length ){
            publishEOF();
        }
    }
}


// Get the log file
async function getLogFile() {
    $.ajax({
        url: logFileURL,
        type: 'GET',
        datatype: 'application/json',
        async: false,
        success: function(logLines) {
            $("#msg").text("Log streaming in progress...").css("color", "#58a6e6");
            setTimeout(function () {
                parseLogLines(logLines);
            }, 1000); 
        },
        error: function(logFileError) {
            $('#publishbtn').prop('disabled', false);
            $('#publishbtn').css('background-color', '#58a6e6');
            $("#msg").text("Failed to get the log file.").css("color", "red");
            console.error('Error while getting the log file:', JSON.parse(logFileError));
        },
    }); 
}


// Validate the form fields and set the credentials
function setCredentials(){
    $("#msg").css("color", "#58a6e6").text("Verifying credentials...");
    $('#publishbtn').prop('disabled', true);
    $('#publishbtn').css('background-color', 'gainsboro');

    hostName = `https://${$("#gdnUrl").val()}`;
    email = $("#email").val();
    password = $("#password").val();
    fabricName = $("#fabric").val();
    streamName = $("#streamName").val();
    const isValidForm = !!(hostName && email && password && fabricName && streamName); // Make sure valid values are in

    return isValidForm;
}


// Verify the credentials and prepare the client and producer
async function start() {

    startTime = new Date().getTime()
    //$("textarea#logstextarea").val("");
    
    if (!setCredentials()){
        $('#publishbtn').prop('disabled', false);
        $('#publishbtn').css('background-color', '#58a6e6');  
        alert("Please provide valid details. All fields are mandatory.");
        return false;
    }  

    try{
        const client = new jsc8({url: hostName, fabricName: fabricName});
        await client.login(email, password);
        //client.useFabric(fabricName);
        const isLocalStream = streamName.startsWith("c8locals");
        streamName = streamName.substring(streamName.indexOf(".") + 1);
        producer = await client.createStreamProducer(streamName, isLocalStream);

        // Start the processing
        await producer.on("open", getLogFile);
    }catch(error){
        $('#publishbtn').prop('disabled', false);
        $('#publishbtn').css('background-color', '#58a6e6');
        $("#msg").text(`Failed to login: ${error.message}`).css("color", "red");
        console.error('Failed in login in go', JSON.parse(error));
    }
}


// Handle th Publish button from browser
window.publish = function(){
    start();
}
}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":2,"jsc8":28}]},{},[54]);
