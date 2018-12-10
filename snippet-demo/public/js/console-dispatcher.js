(() => {

    document.head.removeChild(document.scripts[0]); // get rid of this script element so other scripts don't see it

    const _rxNumeric = /^[0-9]+$/;

    const _cache = {};

    const _console = window.console;

    const _parent = window.parent;

    const _log = console.log.bind(_console);

    const _dir = console.dir.bind(_console);

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
        else if (type === "object" || type === "function") {
            if (value === null) {
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
        } else if (type === "undefined") {
            return {
                type: type,
                value: "undefined"
            };
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

    function _broadcast(obj) {
        _postMessage(JSON.stringify(obj), "*");
    }

    console.log = function SnippetProxyLog(...args) {
        _broadcast({
            command: "console-log",
            args: args.map(mapValue)
        });
        _log(...args);
    };

    console.dir = function SnippetProxyLog(arg) {
        _broadcast({
            command: "console-log",
            args: [mapValue(arg)]
        });
        _dir(arg);
    };

    function messageEventHandler(e) {

        let data = JSON.parse(e.data);

        switch (data.command) {
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

})();