(() => {

    document.head.removeChild(document.scripts[0]); // get rid of this script element so other scripts don't see it

    const _messagePrefix = "SNIPPETCONSOLE:";

    const _rxNumeric = /^[0-9]+$/;

    const _cache = {};

    const _console = window.console;

    const _parent = window.parent;

    const _log = _console.log.bind(_console);

    const _dir = _console.dir.bind(_console);

    const _info = _console.info.bind(_console);

    const _warn = _console.warn.bind(_console);

    const _error = _console.error.bind(_console);

    const _clear = _console.clear.bind(_console);

    const _time = _console.time.bind(_console);

    const _timeEnd = _console.timeEnd.bind(_console);

    const _assert = _console.assert.bind(_console);

    const _group = _console.group.bind(_console);

    const _groupCollapsed = _console.groupCollapsed.bind(_console);

    const _groupEnd = _console.groupEnd.bind(_console);

    const _timeKeeper = {};

    const _postMessage = _parent.postMessage.bind(_parent);

    let _objectCounter = 0;

    function getArgs(func) /* source: humbletim @ https://stackoverflow.com/a/31194949/621962 */ {
        return Function.prototype.toString.call(func)
            .replace(/[/][/].*$/mg, '') // strip single-line comments
            .replace(/\s+/g, '') // strip white space
            .replace(/[/][*][^/*]*[*][/]/g, '') // strip multi-line comments  
            .split(/(\)?=>)|\){/, 1)[0]
            .replace(/^[^(]*[(]/, '') // extract the parameters  
            .replace(/=[^,\)]+/g, '') // strip any ES6 defaults  
            .split(',').filter(Boolean); // split & filter [""]
    }

    function mapValue(value, proxy) {

        let type = typeof value;

        if (proxy) {
            _cache[++_objectCounter] = value;
            return {
                id: _objectCounter,
                type: "object",
                subType: "Array"
            };
        }
        else if (type === "object" || type === "function" || type === "undefined") {
            if (value === undefined) {
                // thanks to weird host objects, sometimes "undefined" isn't undefined...
                return { type: "undefined", value: "undefined" };
            } else if (value === null) {
                return { type: "null", value: "null" };
            } else {
                _cache[++_objectCounter] = value;
                let stub = {
                    id: _objectCounter,
                    type: type
                };
                if (type === "function") {
                    stub.functionName = `${value.name}(${getArgs(value)})`;
                } else {
                    stub.subType = Object.prototype.toString.call(value).slice(8, -1);
                    if (value instanceof Date || value instanceof RegExp) {
                        stub.value = value.toString();
                    }
                }
                return stub;
            }
        }
        else {
            return {
                type: type,
                value: value.toString()
            };
        }
    }

    function* getPropertyDescriptors(obj) {

        let propCache = new Set(),
            protoChain = new WeakMap(),
            depth = 0,
            properties,
            prop;                

        do {
            protoChain.set(obj, true);
            properties = Object.getOwnPropertyDescriptors(obj);
            for (let name in properties) {
                if (propCache.has(name) || name === "__proto__") continue;
                propCache.add(name);
                prop = properties[name];
                if (depth === 0 || (prop.enumerable && prop.configurable)) {
                    yield {
                        enumerable: prop.enumerable,
                        configurable: prop.configurable,
                        name: name
                    };
                }
            }
            obj = Object.getPrototypeOf(obj);
            depth++;
        } while (obj && !protoChain.has(obj));
    }

    function sortPropertyDescriptors(a, b) {
        if (a.enumerable > b.enumerable) {
            return -1;
        } else if (a.enumerable < b.enumerable) {
            return 1;
        } else {
            let aNumeric = _rxNumeric.test(a.name),
                bNumeric = _rxNumeric.test(b.name),
                aVal = aNumeric ? parseInt(a.name, 10) : a.name,
                bVal = bNumeric ? parseInt(b.name, 10) : b.name,
                aIsNaN = isNaN(aVal) || !aNumeric,
                bIsNaN = isNaN(bVal) || !bNumeric;

            if (aIsNaN < bIsNaN) {
                return -1;
            } else if (aIsNaN > bIsNaN) {
                return 1;
            } else {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            }
        }
    }

    function* getPropertyStubs(object) {

        let properties = [...getPropertyDescriptors(object)].sort(sortPropertyDescriptors);

        for (let prop of properties) {
            try {
                yield Object.assign(prop, mapValue(object[prop.name]));
            } catch (err) {
                // :(
            }
        }

        if (typeof object !== "function") {
            let proto = Object.getPrototypeOf(object);
            if (proto) {
                yield Object.assign(mapValue(proto), {
                    enumerable: false,
                    configurable: false,
                    name: "__proto__"
                });
            }
        }

        if (!(object instanceof Array) && !("length" in object) && object[Symbol.iterator]) {
            if (object instanceof Map) {
                try {
                    yield Object.assign(mapValue((() => [...object].map(a => ({ key: a[0], value: a[1] }))), true), {
                        proxy: true,
                        name: "[[Entries]]"
                    });
                } catch (err) {
                    // :(
                }
            } else {
                try {
                    yield Object.assign(mapValue((() => [...object]), true), {
                        proxy: true,
                        name: "[[Entries]]"
                    });
                } catch (err) {
                    // :(
                }
            }
        }
    }

    function _broadcast(obj) {
        _postMessage(`${_messagePrefix}${JSON.stringify(obj)}`, "*");
    }

    console.log = function SnippetProxyLog(...args) {
        _broadcast({
            command: "console-log",
            args: args.map(arg => mapValue(arg))
        });
        _log(...args);
    };

    console.dir = function SnippetProxyDir(arg) {
        _broadcast({
            command: "console-dir",
            args: [mapValue(arg)]
        });
        _dir(arg);
    };

    console.info = function SnippetProxyInfo(...args) {
        _broadcast({
            command: "console-info",
            args: [mapValue(arg)]
        });
        _info(...args);
    };

    console.warn = function SnippetProxyWarn(arg) {
        _broadcast({
            command: "console-warn",
            args: [mapValue(arg)]
        });
        _warn(arg);
    };

    console.error = function SnippetProxyError(arg) {
        _broadcast({
            command: "console-error",
            args: [mapValue(arg)]
        });
        _error(arg);
    };

    console.clear = function SnippetProxyClear() {
        _broadcast({
            command: "console-clear"
        });
        _clear();
    };

    console.time = function SnippetProxyTime(label) {
        const now = performance.now();
        _time(label);
        if (label === undefined) {
            label = "default";
        }
        _timeKeeper[label] = now;
    };

    console.timeEnd = function SnippetProxyTimeEnd(label) {
        const now = performance.now();
        _timeEnd(label);
        if (label === undefined) {
            label = "default";
        }
        if (label in _timeKeeper) {
            let diff = now - _timeKeeper[label];
            delete _timeKeeper[label];
            _broadcast({
                command: "console-log",
                args: [mapValue(`${label}: ${diff}ms`)]
            });
        } else {
            _broadcast({
                command: "console-warn",
                args: [mapValue(`Timer '${label}' does not exist`)]
            });
        }
    };

    console.assert = function SnippetProxyAssert(condition, ...data) {
        if (!condition) {
            if (data.length) {
                _broadcast({
                    command: "console-error",
                    args: [mapValue("Assertion failed: " + data.map(d => {
                        if (typeof d === "string" || d instanceof Date) {
                            return "%s";
                        } else {
                            return "%o";
                        }
                    }).join(" ")), ...data.map(d => mapValue(d))]
                });
            } else {
                _broadcast({
                    command: "console-error",
                    args: [mapValue("Assertion failed: %s"), mapValue("console.assert")]
                });
            }
        }
        _assert(condition, ...data);
    };

    console.group = function SnippetProxyGroup(...args) {
        _group(...args);
        _broadcast({
            command: "console-group",
            args: args.map(a => mapValue(a))
        });
    };

    console.groupCollapsed = function SnippetProxyGroupCollapsed(...args) {
        _groupCollapsed(...args);
        _broadcast({
            command: "console-group-collapsed",
            args: args.map(a => mapValue(a))
        });
    };

    console.groupEnd = function SnippetProxyGroupEnd() {
        _groupEnd();
        _broadcast({
            command: "console-group-end"
        });
    };

    function processEval(evalText) {
        let evalResponse;
        try {
            evalResponse = eval(evalText);
            _broadcast({
                command: "eval-result",
                args: mapValue(evalResponse)
            });
        } catch (err) {
            broadcastError(err);
        }
    }

    function messageEventHandler(e) {

        if (!e.data || !e.data.startsWith(_messagePrefix)) return;

        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();

        let data = JSON.parse(e.data.slice(_messagePrefix.length));

        switch (data.command) {
            case "eval":
                processEval(data.args);
                break;
            case "remove-cached-objects":
                for (let objectId of data.args) {
                    delete _cache[objectId];
                }
                break;
            case "get-object-properties":
                let [objectId, proxy] = data.args;                
                let reference = _cache[objectId];
                delete _cache[objectId];
                if (proxy) {
                    reference = reference();
                }
                _broadcast({
                    command: "process-object-properties",
                    args: [
                        objectId,
                        [...getPropertyStubs(reference)]
                    ]
                });
                break;
        }
    }

    window.addEventListener("message", messageEventHandler);

    function broadcastError(error) {
        let errorString = `${error.name}: ${error.message}`;
        let stack = error.stack;
        if (stack) {
            if (stack.indexOf(errorString) === 0) {
                errorString = stack;
            } else {
                errorString += "\n" + stack;
            }
        }
        _broadcast({
            command: "console-error",
            args: [mapValue(`Uncaught ${errorString}`)]
        });
    }

    function errorEventHandler(e) {
        if (e.error) {
            broadcastError(e.error);
        } else {
            _broadcast({
                command: "console-error",
                args: [mapValue("Uncaught %o"), mapValue(e)]
            });
        }
    }

    window.addEventListener("error", errorEventHandler);

})();