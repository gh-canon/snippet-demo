(() => {

    const _messagePrefix = "SNIPPETCONSOLE:";

    const _maxEntries = 25;

    const _snippetConsole = document.querySelector(".snippet-console");    

    const _demoFrame = document.querySelector("iframe");

    const _consoleInput = document.getElementById("console-input");

    let _consoleContentTarget = _snippetConsole;

    function hydrate(...values) {

        let frag = document.createDocumentFragment();

        for (let value of values) {

            if (value instanceof Node) {
                frag.appendChild(value);
            } else if (value instanceof Array) {
                frag.appendChild(hydrate(...value));
            } else if (value instanceof Object) {

                let node;
                switch (value.nodeType) {
                    case Node.DOCUMENT_FRAGMENT_NODE:
                        node = value;
                        break;
                    case Node.COMMENT_NODE:
                        node = document.createComment(value.textContent);
                        break;
                    case Node.TEXT_NODE:
                        node = document.createTextNode(value.textContent);
                        break;
                    default:
                        node = document.createElement(value.tagName);

                        let filters = ["childNodes", "classList", "dataset", "nodeType", "style", "tagName", "className"];

                        let filteredProps = Object.keys(value).filter(k => !filters.includes(k));

                        if (value.className) {
                            node.className = value.className;
                        }

                        if (value.dataset) {
                            for (let prop in value.dataset) {
                                if (value.dataset[prop] !== null) {
                                    node.dataset[prop] = value.dataset[prop];
                                }
                            }
                        }

                        if (value.classList && value.classList.length) {
                            node.classList.add(...value.classList);
                        }

                        if (value.style) {
                            for (let prop in value.style) {
                                node.style.setProperty(prop, value.style[prop]);
                            }
                        }

                        if (value.childNodes) {
                            for (let child of value.childNodes) {
                                node.appendChild(hydrate(child));
                            }
                        }

                        for (let prop of filteredProps) {
                            if (prop in node) {
                                node[prop] = value[prop];
                            } else {
                                node.setAttribute(prop, value[prop]);
                            }
                        }

                        break;
                }

                frag.appendChild(node);
            }
            else {
                frag.appendChild(document.createTextNode(value));
            }
        }

        if (frag.childNodes.length === 1) {
            return frag.childNodes[0];
        } else {
            return frag;
        }
    }

    function domify(obj) {

        let stub = hydrate({
            tagName: "span",
            className: "console-value",
            dataset: {
                type: obj.type
            }
        });

        if (obj.id) {

            let label = hydrate({
                tagName: "span",
                className: "console-value-label"
            });

            stub.dataset.subType = obj.subType;

            stub.dataset.id = obj.id;

            if (obj.proxy) {
                stub.dataset.proxy = true;
            }

            stub.classList.add("console-value-unprocessed", "console-value-collapsed");

            stub.appendChild(label);

            if (obj.type === "function") {
                label.appendChild(hydrate([
                    {
                        tagName: "span",
                        className: "console-value-function-prefix",
                        textContent: "ƒ "
                    },
                    obj.functionName
                ]));
            } else if ("value" in obj) {
                label.textContent = obj.value;
            } else {
                label.textContent = obj.subType;
            }

            if (obj.subType === "Array") {

                label.appendChild(hydrate({
                    tagName: "span",
                    className: "console-value-details",
                    textContent: "[…]"
                }));

                stub.appendChild(hydrate({
                    tagName: "span",
                    className: "console-value-details",
                    childNodes: [
                        "[", {
                            tagName: "span",
                            className: "console-ellipsis",
                            textContent: "…"
                        },
                        "]"
                    ]
                }));
            } else {
                label.appendChild(hydrate({
                    tagName: "span",
                    className: "console-value-details",
                    textContent: "{…}"
                }));

                stub.appendChild(hydrate({
                    tagName: "span",
                    className: "console-value-details",
                    childNodes: [
                        "{", {
                            tagName: "span",
                            className: "console-ellipsis",
                            textContent: "…"
                        },
                        "}"
                    ]
                }));
            }
        } else if (obj.type === "string") {
            stub.appendChild(hydrate([
                {tagName:"span", textContent: '"' },
                obj.value,
                { tagName: "span", textContent: '"' }
            ]));
        } else {
            stub.textContent = obj.value;
        }

        return stub;
    }

    function flushMessageBuffer(buffer, messasge) {
        if (buffer.length) {
            messasge.push(buffer.join(""));
            buffer.splice(0);
        }
    }

    function format(formatString, ...args) {

        let message = [];

        let buffer = [];

        let escaped = false;

        let argumentIndex = 0;

        let arg;

        let val;

        Array.prototype.forEach.call(formatString, (char, index) => {
            if (char === "%" && !escaped) {
                escaped = true;
            } else {
                if (escaped) {
                    escaped = false;
                    switch (char) {
                        case "%":
                            buffer.push("%");
                            break;
                        case "f":
                            flushMessageBuffer(buffer, message);
                            arg = args[argumentIndex++];
                            val = parseFloat(arg.value);
                            message.push(val.toString());
                            break;
                        case "d":
                        case "i":
                            flushMessageBuffer(buffer, message);
                            arg = args[argumentIndex++];
                            val = Math.floor(arg.value);
                            message.push(val.toString());
                            break;
                        case "o":
                        case "O":
                            flushMessageBuffer(buffer, message);
                            message.push(domify(args[argumentIndex++]));
                            break;
                        case "s":
                            flushMessageBuffer(buffer, message);
                            arg = args[argumentIndex++];
                            if ("value" in arg) {
                                message.push(arg.value);
                            } else if (arg.subType) {
                                message.push(arg.subType);

                            } else if (arg.functionName) {
                                message.push(arg.functionName);

                            } else if (arg.type === "function") {
                                message.push("ƒ()");

                            } else {
                                message.push(arg.type);
                            }
                            break;
                    }
                } else {
                    buffer.push(char);
                }
            }
        });

        for (let n = args.length; argumentIndex < n; argumentIndex++) {
            message.push(" ");
            message.push(domify(args[argumentIndex]));
        }

        flushMessageBuffer(buffer, message);

        return message;
    }

    function createSoloLogEntry(...args) {

        let entry = createLogEntry(...args);

        appendEntry(entry);

        return entry;

    }

    function createLogEntry(...args) {

        let argStub = {
            tagName: "div",
            className: "console-line",
            childNodes: [
                { tagName: "div", className: "console-line-header" },
                { tagName: "div", className: "console-line-content", childNodes: [] }
            ]
        };

        let contentNode = argStub.childNodes[1];

        if (args[0].type === "string" && args.length === 1) {
            contentNode.textContent = args[0].value;
        } else if (args[0].type === "string" && args.length > 1 && /((^|[^%])%[sdifoO])/.test(args[0].value)) {
            contentNode.childNodes.push(format(args[0].value, ...args.slice(1)));
        } else {
            args.forEach((arg, i) => {
                if (i > 0) {
                    contentNode.childNodes.push(document.createTextNode(" "));
                }
                contentNode.childNodes.push(domify(arg));
            });
        }
        
        return hydrate(argStub);        
    }

    function processObjectProperties(objectId, properties) {
        
        let elements = document.querySelectorAll(`.console-value-expanding[data-id="${objectId}"] > .console-value-details`);

        for (let element of elements) {

            element.parentNode.classList.remove("console-value-expanding", "console-value-unprocessed", "console-value-collapsed");

            element.parentNode.classList.add("console-value-expanded");

            element.childNodes[1].replaceWith(hydrate({
                tagName: "dl",
                childNodes: properties.map(p => ([
                    {
                        tagName: "dt",
                        className: p.id ? "console-property-collapsed": null,
                        dataset: {
                            enumerable: p.enumerable ? null : false,
                            proxy: p.proxy ? true : null
                        },
                        textContent: p.name
                    }, ": ", {
                        tagName: "dd",
                        childNodes: [
                            domify(p)
                        ]
                    }, "\n"
                ]))
            }));
        }
    }

    function clearEntries(keepN) {
        let removedLine;
        let objectIds;
        while (_snippetConsole.childNodes.length > keepN) {
            removedLine = _snippetConsole.removeChild(_snippetConsole.firstChild);
            objectIds = [...removedLine.querySelectorAll(".console-value-unprocessed[data-id]")].map(o => o.dataset.id);
            removeCachedObjects(...objectIds);
        }
        if (!_consoleContentTarget.closest(".snippet-console")) {
            _consoleContentTarget = _snippetConsole;
        }
    }

    function appendEntry(entry) {
        if (_consoleContentTarget === _snippetConsole) {
            _snippetConsole.insertBefore(entry, _snippetConsole.lastElementChild);
        } else {
            _consoleContentTarget.appendChild(entry);
        }
        clearEntries(_maxEntries);
        _snippetConsole.lastElementChild.scrollIntoView(false);
    }

    function createConsoleGroup(...args) {

        let depth = 1;

        let group = _consoleContentTarget;

        while (group.classList.contains("console-group")) {
            depth++;
            group = group.parentNode;
        }
        
        let entry = hydrate({
            tagName: "div",
            className: "console-group",
            style: {
                "--depth": depth
            },
            childNodes: [
                createLogEntry(...args)
            ]
        });

        entry.children[0].classList.add("console-line-group");

        appendEntry(entry);

        _consoleContentTarget = entry;

        return _consoleContentTarget;
    }

    function groupEnd() {
        if (_consoleContentTarget !== _snippetConsole) {
            _consoleContentTarget = _consoleContentTarget.parentNode;
        }
    }

    function messageEventHandler(e) {

        if (!e.data || !e.data.startsWith(_messagePrefix)) return;

        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();

        let data = JSON.parse(e.data.slice(_messagePrefix.length));

        switch (data.command) {
            case "console-group":
                createConsoleGroup(...data.args);
                break;
            case "console-group-collapsed":
                createConsoleGroup(...data.args).classList.add("console-group-collapsed");
                break;
            case "console-group-end":
                groupEnd();
                break;
            case "console-clear":
                clearEntries(0);
                break;
            case "console-error":
                createSoloLogEntry(...data.args).classList.add("console-line-error");
                break;
            case "console-warn":
                createSoloLogEntry(...data.args).classList.add("console-line-warn");
                break;
            case "console-log":
            case "console-dir":
            case "console-info":
                createSoloLogEntry(...data.args);
                break;
            case "eval-result":
                createSoloLogEntry(data.args).classList.add("console-line-return");
                break;
            case "process-object-properties":
                processObjectProperties(...data.args);
                break;
        }
    }

    window.addEventListener("message", messageEventHandler);

    function _broadcast(obj) {
        _demoFrame.contentWindow.postMessage(`${_messagePrefix}${JSON.stringify(obj)}`, "*");
    }

    function getSnippetInfo(objectId, proxy) {
        _broadcast(({
            command: "get-object-properties",
            args: [objectId, proxy]
        }));
    }

    function removeCachedObjects(...objectIds) {        
        _broadcast(({
            command: "remove-cached-objects",
            args: objectIds
        }));
    }

    document.addEventListener("click", function (e) {

        if (!e.target.matches(".console-line-group, .console-line-group > .console-line-header, .console-line-group > .console-line-content")) return;

        let target = e.target.closest(".console-line-group");

        if (target.parentNode.classList.contains("console-group-collapsed")) {
            target.parentNode.classList.remove("console-group-collapsed");
        } else {
            target.parentNode.classList.add("console-group-collapsed");
        }
    });

    document.addEventListener("click", function (e) {

        let label = e.target.closest(".console-value-label");

        let target;

        if (label === null) {

            let dt = e.target.closest(".console-property-expanded,.console-property-collapsed");

            if (dt === null) return;

            target = dt.nextElementSibling.firstElementChild;

        } else {
            target = e.target.closest(".console-value");
        }

        if (!target || !target.dataset.id) return;

        if (target.classList.contains("console-value-unprocessed")) {
            getSnippetInfo(target.dataset.id, target.dataset.proxy === "true");
            target.classList.add("console-value-expanding");
        } else if (target.classList.contains("console-value-expanded")) {
            target.classList.remove("console-value-expanded");
            target.classList.add("console-value-collapsed");
        } else {
            target.classList.remove("console-value-collapsed");
            target.classList.add("console-value-expanded");
        }

        let dd = target.closest("dd");

        if (!dd) return;

        let dt = dd.previousElementSibling;

        if (!dt) return;

        if (dt.classList.contains("console-property-expanded")) {
            dt.classList.remove("console-property-expanded");
            dt.classList.add("console-property-collaped");
        } else {
            dt.classList.remove("console-property-collaped");
            dt.classList.add("console-property-expanded");            
        }

    });

    _consoleInput.addEventListener("input", function (e) {
        if (e.children) {
            e.target.textContent = e.target.textContent;
        }
    });    

    _consoleInput.addEventListener("keydown", function (e) {
        if (e.which !== 13 || e.shiftKey) return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        let text = e.target.textContent;
        let entry = createSoloLogEntry({ type: "string", value: text });
        entry.classList.add("console-line-echo");
        _broadcast(({
            command: "eval",
            args: text
        }));       
        e.target.textContent = "";
    });  

    let form = document.forms[0];
    form.submit();    
    form.parentNode.removeChild(form);

})();