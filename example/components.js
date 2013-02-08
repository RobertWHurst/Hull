(function() {

	//Register component constructors
	Hull.register('toggle-button', ToggleButton);
	Hull.register('light', Light);

	//Light constructor
	function Light(component, color) {
		var light = {}, element, socket, plug, powered = false;

		//create an element
		element = $('<div class="light"></div>');
		element.css({
			"width": "48px",
			"height": "48px",
			"margin": "30px",
			"border": "1px solid #000",
			"border-radius": "24px",
			"background": "grey",
			"text-align": "center",
			"line-height": "48px"
		});

		//create socket
		socket = component.socket();
		socket.on('data', getSetPowered);

		//create plug
		plug = component.plug();

		//create the light object
		light.clear = clear;
		light.powered = getSetPowered;
		light.element = element;

		//export the light object
		component(light);

		//sets whether the light is on or off
		function getSetPowered(_powered) {
			if(typeof _powered === 'boolean') {
				powered = _powered;
				plug.write(powered);
				element.css("background", powered && color || 'grey');
				element.html(powered && 'ON' || 'OFF');
			}
			return powered;
		}

		//removes the light from the DOM and Hull
		function clear() {
			element.remove();
		}
	}

	//Toggle button constructor
	function ToggleButton(component, label) {
		var button = {}, element, plug, bool = false;

		//create the button element
		element = $('<button>' + label + '</button>');

		//create a plug
		plug = component.plug();
		plug.write(bool);

		//bind some events for clicking the button
		element.on('mousedown', function() {
			bool = bool === false;
			plug.write(bool);
		});

		//create the button object
		button.clear = clear;
		button.element = element;
		button.label = getSetLabel;

		//export the button object
		component(button);

		//Changes the button label
		function getSetLabel(label) {
			if(typeof label === 'string') { element.text(label); }
			return element.text();
		}

		//clears the button from the DOM and Hull
		function clear() {
			element.remove();
		}
	}
})();
