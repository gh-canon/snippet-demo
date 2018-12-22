(()=>{function getArgs(a)/* source: humbletim @ https://stackoverflow.com/a/31194949/621962 */{return Function.prototype.toString.call(a).replace(/[/][/].*$/mg,'')// strip single-line comments
.replace(/\s+/g,'')// strip white space
.replace(/[/][*][^/*]*[*][/]/g,'')// strip multi-line comments  
.split(/(\)?=>)|\){/,1)[0].replace(/^[^(]*[(]/,'')// extract the parameters  
.replace(/=[^,\)]+/g,'')// strip any ES6 defaults  
.split(',').filter(Boolean);// split & filter [""]
}function mapValue(a,b){let c=typeof a;if(b)return _cache[++_objectCounter]=a,{id:_objectCounter,type:'object',subType:'Array'};if('object'==c||'function'==c||'undefined'==c){if(void 0===a)// thanks to weird host objects, sometimes "undefined" isn't undefined...
return{type:'undefined',value:'undefined'};if(null===a)return{type:'null',value:'null'};else{_cache[++_objectCounter]=a;let b={id:_objectCounter,type:c};return'function'==c?b.functionName=`${a.name}(${getArgs(a)})`:(b.subType=Object.prototype.toString.call(a).slice(8,-1),(a instanceof Date||a instanceof RegExp)&&(b.value=a.toString())),b}}else return{type:c,value:a.toString()}}function*getPropertyDescriptors(a){let b,c,d=new Set,e=new WeakMap,f=0;do{for(let g in e.set(a,!0),b=Object.getOwnPropertyDescriptors(a),b)d.has(g)||'__proto__'===g||(d.add(g),c=b[g],(0==f||c.enumerable&&c.configurable)&&(yield{enumerable:c.enumerable,configurable:c.configurable,name:g}));a=Object.getPrototypeOf(a),f++}while(a&&!e.has(a))}function sortPropertyDescriptors(c,a){if(c.enumerable>a.enumerable)return-1;if(c.enumerable<a.enumerable)return 1;else{let b=_rxNumeric.test(c.name),d=_rxNumeric.test(a.name),e=b?parseInt(c.name,10):c.name,f=d?parseInt(a.name,10):a.name,g=isNaN(e)||!b,h=isNaN(f)||!d;return g<h?-1:g>h?1:e<f?-1:e>f?1:0}}function*getPropertyStubs(a){let b=[...getPropertyDescriptors(a)].sort(sortPropertyDescriptors);for(let c of b)try{yield Object.assign(c,mapValue(a[c.name]))}catch(a){// :(
}if('function'!=typeof a){let b=Object.getPrototypeOf(a);b&&(yield Object.assign(mapValue(b),{enumerable:!1,configurable:!1,name:'__proto__'}))}if(!(a instanceof Array)&&!('length'in a)&&a[Symbol.iterator])if(a instanceof Map)try{yield Object.assign(mapValue(()=>[...a].map(b=>({key:b[0],value:b[1]})),!0),{proxy:!0,name:'[[Entries]]'})}catch(a){// :(
}else try{yield Object.assign(mapValue(()=>[...a],!0),{proxy:!0,name:'[[Entries]]'})}catch(a){// :(
}}function _broadcast(a){_postMessage(`${_messagePrefix}${JSON.stringify(a)}`,'*')}function processEval(evalText){let evalResponse;try{evalResponse=eval(evalText),_broadcast({command:'eval-result',args:mapValue(evalResponse)})}catch(a){broadcastError(a),_error('Uncaught %o',a)}}function messageEventHandler(a){if(a.data&&a.data.startsWith(_messagePrefix)){a.preventDefault(),a.stopImmediatePropagation(),a.stopPropagation();let b=JSON.parse(a.data.slice(_messagePrefix.length));switch(b.command){case'eval':processEval(b.args);break;case'remove-cached-objects':for(let a of b.args)delete _cache[a];break;case'get-object-properties':let[a,c]=b.args,d=_cache[a];delete _cache[a],c&&(d=d()),_broadcast({command:'process-object-properties',args:[a,[...getPropertyStubs(d)]]});}}}function broadcastError(a){let b=`${a.name}: ${a.message}`,c=a.stack;c&&(0===c.indexOf(b)?b=c:b+='\n'+c),_broadcast({command:'console-error',args:[mapValue(`Uncaught ${b}`)]})}function errorEventHandler(a){a.error&&!1!==a.error.__broadcast__?broadcastError(a.error):_broadcast({command:'console-error',args:[mapValue('Uncaught %o'),mapValue(a)]})}document.head.removeChild(document.scripts[0]);// get rid of this script element so other scripts don't see it
const _messagePrefix='SNIPPETCONSOLE:',_rxNumeric=/^[0-9]+$/,_cache={},_console=window.console,_parent=window.parent,_log=_console.log.bind(_console),_dir=_console.dir.bind(_console),_info=_console.info.bind(_console),_warn=_console.warn.bind(_console),_error=_console.error.bind(_console),_clear=_console.clear.bind(_console),_time=_console.time.bind(_console),_timeEnd=_console.timeEnd.bind(_console),_assert=_console.assert.bind(_console),_group=_console.group.bind(_console),_groupCollapsed=_console.groupCollapsed.bind(_console),_groupEnd=_console.groupEnd.bind(_console),_timeKeeper={},_postMessage=_parent.postMessage.bind(_parent);let _objectCounter=0;console.log=function(...a){_broadcast({command:'console-log',args:a.map(a=>mapValue(a))}),_log(...a)},console.dir=function(a){_broadcast({command:'console-dir',args:[mapValue(a)]}),_dir(a)},console.info=function(...a){_broadcast({command:'console-info',args:[mapValue(arg)]}),_info(...a)},console.warn=function(a){_broadcast({command:'console-warn',args:[mapValue(a)]}),_warn(a)},console.error=function(a){_broadcast({command:'console-error',args:[mapValue(a)]}),_error(a)},console.clear=function(){_broadcast({command:'console-clear'}),_clear()},console.time=function(a){const b=performance.now();_time(a),a===void 0&&(a='default'),_timeKeeper[a]=b},console.timeEnd=function(a){const b=performance.now();if(_timeEnd(a),void 0===a&&(a='default'),a in _timeKeeper){let c=b-_timeKeeper[a];delete _timeKeeper[a],_broadcast({command:'console-log',args:[mapValue(`${a}: ${c}ms`)]})}else _broadcast({command:'console-warn',args:[mapValue(`Timer '${a}' does not exist`)]})},console.assert=function(a,...b){a||(b.length?_broadcast({command:'console-error',args:[mapValue('Assertion failed: '+b.map(a=>'string'==typeof a||a instanceof Date?'%s':'%o').join(' ')),...b.map(a=>mapValue(a))]}):_broadcast({command:'console-error',args:[mapValue('Assertion failed: %s'),mapValue('console.assert')]})),_assert(a,...b)},console.group=function(...a){_group(...a),_broadcast({command:'console-group',args:a.map(b=>mapValue(b))})},console.groupCollapsed=function(...a){_groupCollapsed(...a),_broadcast({command:'console-group-collapsed',args:a.map(b=>mapValue(b))})},console.groupEnd=function(){_groupEnd(),_broadcast({command:'console-group-end'})},window.addEventListener('message',messageEventHandler),window.addEventListener('error',errorEventHandler)})();