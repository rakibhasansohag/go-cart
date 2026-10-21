## 2025-05-27 - Intl.NumberFormat Instantiation Overhead
**Learning:** Re-instantiating `Intl.NumberFormat` on every currency formatting call creates substantial CPU and GC overhead in Node.js/V8.
**Action:** Re-use `Intl.NumberFormat` instances via a Map cache keyed by currency and fraction digits.
