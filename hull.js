/**
 * Title: Hull
 * Version: v0.2.0
 * Description: Hull is a powerful and flexible component framework. Hull, "Structural integrity for JavaScript applications".
 * Author: Robert Hurst.
 *
 * Copyright 2012, Robert William Hurst
 * Licenced under the BSD License.
 * See https://raw.github.com/RobertWHurst/Hull/master/license.txt
 */
(function(context, factory) {
  var namespaces;

  //POLLYFILLS
  [].indexOf||(Array.prototype.indexOf=function(a,b,c){for(c=this.length,b=(c+~~b)%c;b<c&&(!(b in this)||this[b]!==a);b++);return b^c?b:-1;});

  //GLOBAL NAMESPACES
  namespaces = ['Hull'];

	//AMD
	if(typeof define === 'function' && define.amd) { define(constructAMD); }

	//GLOBAL
	else { constructGlobal(); }

	/**
	 * Construct AMD version of the library
	 */
	function constructAMD() {

		//create a library instance
		return init();

		//spawns a library instance
		function init() {
			var library;
			library = factory('amd');
			library.fork = init;
			return library;
		}
	}

	/**
	 * Construct a Global version of the library
	 */
	function constructGlobal() {
		var library;

		//create a library instance
		library = init();
		library.noConflict.apply(null, namespaces);

		//spawns a library instance
		function init() {
			var library, namespaces = [], previousValues = {};

			library = factory('global');
			library.fork = init;
			library.noConflict = noConflict;
			return library;

			//sets library namespaces
			function noConflict(    ) {
				var args, nI, newNamespaces;

				newNamespaces = Array.prototype.slice.apply(arguments);

				for(nI = 0; nI < namespaces.length; nI += 1) {
					if(typeof previousValues[namespaces[nI]] === 'undefined') {
						delete context[namespaces[nI]];
					} else {
						context[namespaces[nI]] = previousValues[namespaces[nI]];
					}
				}

				previousValues = {};

				for(nI = 0; nI < newNamespaces.length; nI += 1) {
					if(typeof newNamespaces[nI] !== 'string') {
						throw new Error('Cannot replace namespaces. All new namespaces must be strings.');
					}
					previousValues[newNamespaces[nI]] = context[newNamespaces[nI]];
					context[newNamespaces[nI]] = library;
				}

				namespaces = newNamespaces;

				return namespaces;
			}
		}
	}
})(this, function(env) {
	var version, Hull = {}, componentConstructors = {}, components = {}, componentNamespace;

	////////////
	// CONFIG //
	////////////

	version = '0.0.1';


	//////////
	// INIT //
	//////////

	componentNamespace = UIDNamespace();

	Hull.Hull = version;
	Hull.register = regsiterComponent;
	Hull.create = createComponent;
	Hull.get = getComponent;
	Hull.connect = connect;

	return Hull;


	///////////////////////
	// COMPONENT METHODS //
	///////////////////////

	/**
	 * Resgisters a component
	 * @param  {String}   type
	 * @param  {Function} componentConstructor
	 */
	function regsiterComponent(type, componentConstructor) {
		if(typeof type !== 'string') { throw new Error('Cannot register new component type. type must be a string.'); }
		if(typeof componentConstructor !== 'function') { throw new Error('Cannot register new component type. componentConstructor must be a function.'); }
		componentConstructors[type] = componentConstructor;
	}

	/**
	 * Creates a component from a given base id and registered component type.
	 * @return {Object}
	 *
	 * @signature createComponent(id, type, parentId, containerId)
	 * @signature createComponent(id, type, parentId)
	 * @signature createComponent(id, type)
	 * @signature createComponent(type)
	 */
	function createComponent(    ) {
		var id, component = {}, componentApi, type, parentId, containerId, 
		sockets = {}, plugs = {}, containers = {}, constructorApi,
		componentWrapper = {}, accepts = [];

		args = toArray(arguments);

		if(args.length === 4) {
			id = args[0];
			type = args[1];
			parentId = args[2];
			containerId = args[3];
		} else if(args.length === 3) {
			id = args[0];
			type = args[1];
			parentId = args[2];
		} else if(args.length === 2) {
			id = args[0];
			type = args[1];
		} else if(args.length === 1) {
			type = args[0];
		}

		if(typeof id !== 'undefined' && typeof id !== 'string') { throw new Error('Cannot create component. id must be a string.'); }
		if(typeof type !== 'string') { throw new Error('Cannot create component. type must be a string.'); }
		if(containerId && typeof containerId !== 'string') { throw new Error('Cannot create component. If given, containerId must be a string.'); }
		if(parentId && typeof parentId !== 'undefined' && typeof parentId !== 'string') { throw new Error('Cannot create component. If given, parentId must be a string.'); }

		return captureArguements;

		function captureArguements(    ) {
			var args;
			args = toArray(arguments);

			componentApi = EventEmitter();
			componentApi.id = uid = componentNamespace(id);
			componentApi.type = type;
			componentApi.state = 'init';

			constructorApi = EventEmitter(initCompletionHandler);
			constructorApi.id = uid;
			constructorApi.type = type;
			constructorApi.Hull = version;
			constructorApi.accepts = accepts;
			constructorApi.open = {};
			constructorApi.socket = createSocket;
			constructorApi.plug = createPlug;
			constructorApi.container = createContainer;

			//append the constructor to the constructor arguments
			args.unshift(constructorApi);

			//make sure the component type is registered
			if(!componentConstructors[type]) { throw new Error('Cannot create component. No component is registered with the type of ' + type + '.'); }

			//create the component
			componentConstructors[type].apply(null, args);

			//expose the api
			return componentApi;
		}

		/**
		 * Accepts a component and attaches its sockets and plugs
		 * @param  {Object} exports
		 */
		function initCompletionHandler(exported) {
			var property;

			if(typeof exported !== 'object') { componentNamespace.clear(uid); throw new Error('Cannot create component. The constructor for components of the type ' + type + ' did not return a valid component object.'); }
			if(typeof exported.element !== 'object') { componentNamespace.clear(uid); throw new Error('Cannot create component. The component must have an element property pointing to a DOM node or a array of DOM nodes.'); }
			if(typeof exported.clear !== 'function') { componentNamespace.clear(uid); throw new Error('Cannot create component. The component does not implement a clear method.'); }

			//create the component API
			componentApi.container = getSetContainer;
			for(property in exported) {
				if(!exported.hasOwnProperty(property)) { continue; }
				if(property === 'element') { continue; }
				if(property === 'clear') { continue; }
				componentApi[property] = exported[property];
			}

			component.id = uid;
			component.parent = false;
			component.inDOM = false;
			component.element = exported.element;
			component.sockets = sockets;
			component.plugs = plugs;
			component.containers = containers;
			component.componentApi = componentApi;
			component.constructorApi = constructorApi;

			componentApi.parent = getSetContainer;
			componentApi.clear = clear;
			componentApi.detach = detach;

			constructorApi.detach = detach;

			constructorApi.set('setup');
			componentApi.state = 'setup';
			componentApi.set('setup');

			//insert the component into its container
			if(parentId) { getSetContainer(parentId, containerId); }

			//stash the component
			components[uid] = component;

			//emit the complete event
			constructorApi.set('complete');
			componentApi.state = 'complete';
			componentApi.set('complete');

			/**
			 * Clear wrapper for component
			 * @return {*}
			 */
			function clear() {
				componentNamespace.clear(id);
				constructorApi.set('clear');
				componentApi.state = 'cleared';
				componentApi.set('clear');

				component.parent = false;
				component.inDOM = false;
				setDOMTreeRelation();

				return exported.clear();
			}

			/**
			 * Clear wrapper for component
			 * @return {*}
			 */
			function detach() {
				var eI;

				if(typeof component.element.push === 'function') {
					for(eI = 0; eI < component.element.length; eI += 1) {
						component.element[eI].parent.removeChild(component.element[eI]);
					}
				} else {
					component.element.parent.appendChild(component.element);
				}

				component.parent = false;
				component.inDOM = false;
				setDOMTreeRelation();

				if(typeof exported.detach === 'function') {
					return exported.detach();
				}
			}

			/**
			 * Embeds the component into the container of another component
			 * @param  {String} parentId    [description]
			 * @param  {String} containerId [description]
			 * @return {}             [description]
			 */
			function getSetContainer(parentId, containerId) {
				var container;

				containerId = containerId || 'default';

				if(typeof parentId !== 'string') { throw new Error('Cannot set the component container. parentId must be a string.'); }
				if(typeof containerId !== 'string') { throw new Error('Cannot set the component container. containerId must be a string.'); }

				if(parentId === 'body' && containerId === 'default') { insertIntoBody(); return; }

				if(typeof components[parentId] !== 'object') { throw new Error('Cannot set the component container. No component with id ' + parentId + '.'); }
				if(typeof components[parentId].containers[containerId] !== 'object') { throw new Error('Cannot set the component container. Component with id ' + parentId + '. does not have container with id of ' + containerId + '.'); }

				container = components[parentId].containers[containerId];

				if(container.accepts.length > 0 && container.accepts.indexOf(component.type) === -1) { throw new Error('Cannot set the component container. Container does not accept components of type' + component.type + '.'); }

				component.parent = parentId;
				component.inDOM = components[parentId].inDOM;

				container.trigger('component', component);
				constructorApi.set('parent', components[parentId]);

				setDOMTreeRelation();
			}

			/**
			 * Inserts the component into the body
			 * @return {Boolean}
			 */
			function insertIntoBody() {
				var eI;
				if(typeof component.element !== 'object') { return false; }
				if(typeof component.element.push === 'function') {
					for(eI = 0; eI < component.element.length; eI += 1) {
						document.body.appendChild(component.element[eI]);
					}
				} else {
					document.body.appendChild(component.element);
				}

				component.inDOM = true;
				setDOMTreeRelation();

				return true;
			}
		}

		function createContainer(id, accepts) {
			var container, containerApi = {};
			id = id || 'default';
			accepts = accepts || [];

			if(typeof id !== 'string') { throw new Error('Cannot create container. id must be a string.'); }
			if(typeof accepts !== 'object' || typeof accepts.push !== 'function') { throw new Error('Cannot create container. accepts must be an array.'); }

			container = EventEmitter();
			container.accepts = accepts;

			containerApi = registerContainerHandler;
			containerApi.clear = clear;

			containers[id] = container;

			return containerApi;

			function registerContainerHandler(callback) {
				return container.on('component', function(component) {
					callback(component);
				});
			}

			/**
			 * Clears the socket
			 * @return {Boolean}
			 */
			function clear() {
				if(!containers[id]) { return false; }
				delete containers[id];
				return true;
			}
		}

		/**
		 * Creates a socket on the component
		 * @param  {String} id
		 * @return {Object}
		 */
		function createSocket(id) {
			var socket, socketApi = {};
			id = id || 'default';

			if(typeof id !== 'string') { throw new Error('Cannot create socket. id must be a string.'); }
			if(sockets[id]) { throw new Error('Cannot create socket. Socket with an id of ' + id + ' already exists for this component.'); }

			socket = EventEmitter();

			socketApi.on = socket.on;
			socketApi.clear = clear;

			sockets[id] = socket;

			return socketApi;

			/**
			 * Clears the socket
			 * @return {Boolean}
			 */
			function clear() {
				if(!sockets[id]) { return false; }
				delete sockets[id];
				return true;
			}
		}

		/**
		 * Creates a plug on the component
		 * @param  {String} id
		 * @return {Object}
		 */
		function createPlug(id) {
			var plug, plugApi = {}, writeableSockets = [];

			if(typeof id === 'string' && typeof type === 'undefined') { type = id; id = ''; }
			id = id || 'default';

			if(typeof id !== 'string') { throw new Error('Cannot create plug. id must be a string.'); }
			if(plugs[id]) { throw new Error('Cannot create plug. Plug with an id of ' + id + ' already exists for this component.'); }

			//create the plug emitter
			plug = EventEmitter();
			plugs[id] = plug;

			//create the plug API
			plugApi.write = write;
			plugApi.clear = clear;
			return plugApi;

			/**
			 * Writes data to the plug emitter
			 * @param  {*} data
			 */
			function write(data) { plug.set('connect', data); plug.trigger('data', data); }

			/**
			 * Clears the plug
			 * @return {Boolean}
			 */
			function clear() {
				plug.trigger('disconnect');
				if(!plugs[id]) { return false; }
				delete plugs[id];
				return true;
			}
		}

		function setDOMTreeRelation() {
			setRelation(component);
			
			(function exec(parent) {
				var id;

				for(id in components) {
					if(!components.hasOwnProperty(id)) { continue; }
					if(components[id].parent === parent.id && components[id].inDOM !== parent.inDOM) {
						components[id].inDOM = parent.inDOM;
						setRelation(components[id]);
						exec(components[id]);
					}
				}
			})(component);

			function setRelation(component) {
				if(component.inDOM) {
					component.constructorApi.trigger('draw');
					component.componentApi.trigger('draw');
				} else {
					component.constructorApi.trigger('detach');
					component.componentApi.trigger('detach');
				}
			}
		}
	}

	/**
	 * Gets existing component by ID.
	 * @param  {String} id
	 * @return {Object}
	 */
	function getComponent(id) {
		return components[id].api || false;
	}

	function connect(id, plugName) {
		var api = {}, component, plug, callbackStack = [], socket;

		if(typeof id === 'object' && typeof id.id === 'string') { id = id.id; }

		plugName = plugName || 'default';
		component = components[id];
		plug = component.plugs[plugName];

		api.to = to;

		return api;

		function to(    ) {
			var args, id, component, socketName, callback;

			args = toArray(arguments);

			if(typeof args[0] === 'object') {

				id = args[0];
				if(typeof id === 'object' && typeof id.id === 'string') { id = id.id; }
				component = components[id];

				socketName = args[1] || 'default';
				socket = component.sockets[socketName];

				plug.on(['connect', 'data'], function(    ) {
					var args;
					args = toArray(arguments);
					for(cI = 0; cI < callbackStack.length; cI += 1) {
						args = callbackStack[cI].apply(null, args);
						if(typeof args !== 'object' || typeof args.push !== 'function') { throw new Error('Plug/Socket filter function did not return array. All filter callbacks must return an array of processed arguments.'); }
					}
					args.unshift('data');
					socket.trigger.apply(this, args);
				});

			} else if(typeof args[0] === 'function') {
				callbackStack.push(args[0]);
			}

			return api;
		}
	}

	/**
	 * Creates a UID namespace for creating unique ids within.
	 */
	function UIDNamespace() {
		var UIDs = [], api;

		api = UID;
		api.clear = clearUID;

		return api;

		/**
		 * Generates a new unique id If a base id is given, it will attept to
		 *  reserve it. If the id is already taken it will append a serial
		 *  number. Returns the final uid.
		 *  uid.
		 * @param  {String} namespace
		 * @param  {String} id
		 * @param  {String} separator
		 * @return {String}
		 */
		function UID(id, separator) {
			var i = 0, uid;
			separator = separator || '.';
			uid = id || i + '';

			//continue to generate uids until a unique one is found. If an id is
			// given then base the uid on
			while(UIDs.indexOf(uid) !== -1) {
				i += 1;
				if(id) {  uid = id + separator + i; }
				else { uid = i + ''; }
			}
			UIDs.push(uid);
			return uid;
		}

		/**
		 * Clears a unique id
		 * @param  {String}  uid
		 * @return {Boolean}
		 */
		function clearUID(uid) {
			if(typeof uid !== 'undefined' && typeof uid !== 'string') { throw new Error('Cannot clear UID. if given uid must be a string.'); }

			//if the uid does not exist then return false
			if(UIDs.indexOf(uid) < 0) { return false; }

			//strip the uid from the namespace and return true
			UIDs.splice(UIDs.indexOf(uid), 1);
			return true;
		}
	}


	/**
	 * Fixes array like objects copying them into a proper array
	 * @param  {Object} sourceObject
	 * @param  {Number} start
	 * @param  {Number} end
	 * @return {Array}
	 */
	function toArray(sourceObject, start, end) {
		sliceArgs = [];
		if(typeof start === 'number') { sliceArgs[0] = start; }
		if(typeof start === 'number' && typeof end === 'number') { sliceArgs[1] = end; }
		return Array.prototype.slice.apply(sourceObject, sliceArgs);
	}


	/**
	 * Creates an event emitter
	 * @param {Object|Function} Object [Optional]
	 */
	function EventEmitter(object) {
		var emitter = object || {}, listeners = {}, setEvents = {}, pipes = {};

		//augment an object if it isn't already an emitter
		if(
			!emitter.on &&
			!emitter.once &&
			!emitter.trigger &&
			!emitter.set &&
			!emitter.pipe &&
			!emitter.listeners
		) {
			emitter.on = on;
			emitter.once = once;
			emitter.trigger = trigger;
			emitter.set = set;
			emitter.set.clear = clearSet;
			emitter.pipe = pipe;
			emitter.pipe.clear = clearPipes;
			emitter.listeners = getListeners;
			emitter.listeners.clear = clearListeners;
		} else {
			return emitter;
		}

		if(emitter.addEventListener || emitter.attachEvent) {
			handleNode(emitter);
		}

		return emitter;

		/**
		 * Binds listeners to events.
		 * @param event
		 * @return {Object}
		 */
		function on(event     ) {
			var args = Array.prototype.slice.apply(arguments, [1]), binding = {}, aI, sI;

			//recurse over a batch of events
			if(typeof event === 'object' && typeof event.push === 'function') { return batchOn(event, args); }

			//trigger the listener event
			if(event.slice(0, 7) !== 'emitter') {
				trigger('emitter.listener', event, args);
			}

			//check for a set event
			if(setEvents[event]) {
				for(aI = 0; aI < args.length; aI += 1) {
					if(typeof args[aI] !== 'function') { throw new Error('Cannot bind event. All callbacks must be functions.'); }
					for(sI = 0; sI < setEvents[event].length; sI += 1) {
						args[aI].apply(this, setEvents[event][sI]);
					}
				}

				binding.clear = function() {};

				return binding;
			}

			//create the event
			if(!listeners[event]) { listeners[event] = []; }

			//add each callback
			for(aI = 0; aI < args.length; aI += 1) {
				if(typeof args[aI] !== 'function') { throw new Error('Cannot bind event. All callbacks must be functions.'); }
				listeners[event].push(args[aI]);
			}

			binding.clear = clear;

			return binding;

			function clear() {
				if(!listeners[event]) { return; }
				for(aI = 0; aI < args.length; aI += 1) {
					listeners[event].splice(listeners[event].indexOf(args[aI]), 1);
				}
				if(listeners[event].length < 1) { delete listeners[event]; }
			}

			function batchOn(events, args) {
				var eI, binding = {}, bindings = [];
				for(eI = 0; eI < events.length; eI += 1) {
					args.unshift(events[eI]);
					bindings.push(on.apply(this, args));
					args.shift();
				}

				binding.clear = clear;

				return binding;

				function clear() {
					var bI;
					for(bI = 0; bI < bindings.length; bI += 1) {
						bindings[bI].clear();
					}
				}
			}
		}

		/**
		 * Binds listeners to events. Once an event is fired the binding is cleared automatically.
		 * @param event
		 * @return {Object}
		 */
		function once(event     ) {
			var binding, args = Array.prototype.slice.apply(arguments, [1]), result = true;

			binding = on(event, function(    ) {
				var aI, eventArgs = Array.prototype.slice.apply(arguments);
				binding.clear();

				for(aI = 0; aI < args.length; aI += 1) {
					if(args[aI].apply(this, eventArgs) === false) {
						result = false;
					}
				}

				return result;
			});

			return binding;
		}

		/**
		 * Triggers events. Passes listeners any additional arguments.
		 * @param event
		 * @return {Boolean}
		 */
		function trigger(event     ) {
			var args = Array.prototype.slice.apply(arguments, [1]), lI, eventListeners, result = true;

			if(typeof event === 'object' && typeof event.push === 'function') { return batchTrigger(event, args); }

			event = event.split('.');

			while(event.length) {
				eventListeners = listeners[event.join('.')];

				if(event.join('.').slice(0, 7) !== 'emitter') {
					trigger.apply(this, [].concat('emitter.event', event.join('.'), args));
				}

				if(eventListeners) {
					eventListeners = [].concat(eventListeners);
					for(lI = 0; lI < eventListeners.length; lI += 1) {
						if(eventListeners[lI].apply(this, args) === false) {
							result = false;
						}
					}
				}
				event.pop();
			}

			return result;

			function batchTrigger(events, args) {
				var eI, result = true;
				for(eI = 0; eI < events.length; eI += 1) {
					args.unshift(events[eI]);
					if(trigger.apply(this, args) === false) { result = false; }
					args.shift();
				}
				return result;
			}
		}

		/**
		 * Sets events. Passes listeners any additional arguments.
		 * @param event
		 * @return {*}
		 */
		function set(event     ) {
			var args = Array.prototype.slice.apply(arguments), setEvent = {};

			if(typeof event === 'object' && typeof event.push === 'function') { return batchSet(event, args); }

			//execute all of the existing binds for the event
			trigger.apply(this, args);
			clearListeners(event);

			if(!setEvents[event]) { setEvents[event] = []; }
			setEvents[event].push(args.slice(1));

			setEvent.clear = clear;

			return setEvent;

			function batchSet(events, args) {
				var eI, result = true;
				for(eI = 0; eI < events.length; eI += 1) {
					args.unshift(events[eI]);
					if(trigger.apply(this, args) === false) { result = false; }
					args.shift();
				}
				return result;
			}

			function clear() {
				if(setEvents[event]) {
					setEvents[event].splice(setEvents[event].indexOf(args), 1);
					if(setEvents[event].length < 1) {
						delete setEvents[event];
					}
				}
			}
		}

		/**
		 * Clears a set event, or all set events.
		 * @param event
		 */
		function clearSet(event) {
			if(event) {
				delete setEvents[event];
			} else {
				setEvents = {};
			}
		}

		/**
		 * Pipes events from another emitter.
		 * @param event
		 * @return {Object}
		 */
		function pipe(event     ) {
			var args = Array.prototype.slice.apply(arguments);

			if(typeof event === 'object' && typeof event.on === 'function') { return pipeAll(args); }
			if(typeof event !== 'string' && (typeof event !== 'object' || typeof event.push !== 'function')) { throw new Error('Cannot create pipe. The first argument must be an event string.'); }

			return pipeEvent(event, args.slice(1));

			function pipeEvent(event, args) {
				var aI, pipeBindings = [], pipe = {};

				if(typeof event === 'object' && typeof event.push === 'function') {
					return (function(events) {
						var pipe = {}, eI, eventPipes = [];
						for(eI = 0; eI < events.length; eI += 1) {
							eventPipes.push(pipeEvent(events[eI], args));
						}

						pipe.clear = clear;

						return pipe;

						function clear() {
							while(eventPipes.length) {
								eventPipes[0].clear();
								eventPipes.splice(0, 1);
							}
						}
					})(event);
				}

				if(event.slice(0, 7) === 'emitter') { throw new Error('Cannot pipe event "' + event + '". Events beginning with "emitter" cannot be piped.'); }

				for(aI = 0; aI < args.length; aI += 1) {
					pipeBindings.push(args[aI].on(event, function(    ) {
						var args = Array.prototype.slice.apply(arguments);
						args.unshift(event);
						return trigger.apply(this, args);
					}));
				}

				if(!pipes[event]) { pipes[event] = []; }
				pipes[event].push(pipeBindings);

				pipe.clear = clear;

				return pipe;

				function clear() {
					if(pipes[event]) {
						pipes[event].splice(pipes[event].indexOf(pipeBindings), 1);
					}
				}
			}

			function pipeAll(args) {
				var pipe = {}, binding, eventPipes = [];

				binding = on('emitter.listener', function(event) {
					eventPipes.push(pipeEvent(event, args));
				});

				pipe.clear = clear;
				return pipe;

				function clear() {
					binding.clear();
					while(eventPipes.length) {
						eventPipes[0].clear();
						eventPipes.splice(0, 1);
					}
				}
			}

		}

		/**
		 * Clears pipes based on the events they transport.
		 * @param event
		 */
		function clearPipes(event) {
			if(event) {
				delete pipes[event];
			} else {
				pipes = {};
			}
		}

		/**
		 * Gets listeners for events.
		 * @param event
		 * @return {*}
		 */
		function getListeners(event) {
			if(event) {
				return listeners[event];
			} else {
				return listeners;
			}
		}

		/**
		 * Clears listeners by events.
		 * @param event
		 */
		function clearListeners(event) {
			if(event) {
				delete listeners[event];
			} else {
				listeners = {};
			}
		}

		/**
		 * Clears the emitter
		 */
		function clear() {

			trigger('emitter.clear');

			listeners = {};
			setEvents = {};
			pipes = {};

			delete emitter.on;
			delete emitter.once;
			delete emitter.trigger;
			delete emitter.set;
			delete emitter.pipe;
			delete emitter.listeners;
			delete emitter.clear;
		}

		/**
		 * Binds the emitter's event system to the DOM event system
		 * @param node
		 */
		function handleNode(node) {
			var handledEvents = [], listenerBinding, DOMEventListeners = [];

			listenerBinding = on('emitter.listener', function(event) {
				if(handledEvents.indexOf(event) > -1) { return; }
				handledEvents.push(event);

				try {

					//W3C
					if(node.addEventListener) {
						node.addEventListener(event, nodeListener, false);
						DOMEventListeners.push({
							"event": event,
							"listener": nodeListener
						});
					}

					//MICROSOFT
					else if(node.attachEvent) {
						node.attachEvent('on' + event, nodeListener);
						DOMEventListeners.push({
							"event": event,
							"listener": nodeListener
						});
					}

				} catch(e) {
					console.error(e);
				}

				function nodeListener(eventObj    ) {
					var args = Array.prototype.slice.apply(arguments);
					args.unshift([event, 'dom.' + event]);
					if(trigger.apply(this, args) === false) {
						eventObj.preventDefault();
						eventObj.stopPropagation();
					}
				}
			});

			emitter.clearNodeEmitter = clearNodeEmitter;

			function clearNodeEmitter() {
				var DI;
				for(DI = 0; DI < DOMEventListeners.length; DI += 1) {
					try {

						//W3C
						if(node.removeEventListener) {
							node.removeEventListener(DOMEventListeners[DI].event, DOMEventListeners[DI].listener, false);
						}

						//MICROSOFT
						else if(node.detachEvent) {
							node.detachEvent('on' + DOMEventListeners[DI].event, DOMEventListeners[DI].listener);
						}

					} catch(e) {
						console.error(e);
					}
				}

				handledEvents = [];
				listenerBinding.clear();
			}
		}
	}

	/**
	 * Strips a DOM node from the DOM tree. Compatible with both raw DOM nodes,
	 *  jQuery selections, and SpringJS selections.
	 * @param {Object} node
	 */
	function DestroyNode(node) {
		var nI;

		//validate args
		if(typeof node !== 'object') { throw new Error('Cannot destroy node. node must be a DOM node, jQuery selection, or SpringJS selection.'); }

		//SpingJS or jQuery
		if(typeof node === 'object' && typeof node.push === 'function') {
			for(nI = 0; nI < node.length; nI += 1) { DestroyNode(node[nI]); }
			return;
		}

		//DOM node
		if(typeof node.parent === 'object' && typeof node.parent.removeChild === 'function')  {
			node.parent.removeChild(node);
		}
	}
});
