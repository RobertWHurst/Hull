$(function() {
	var yellowLight, orangeLight, button;

	//create the components
	yellowLight = Hull.create('yellowLight', 'light', 'body')('yellow');
	orangeLight = Hull.create('orangeLight', 'light', 'body')('orange');

	button = Hull.create('button', 'toggle-button', 'body')('Press to toggle lights');

	yellowLight.on('complete', connectSocket);
	orangeLight.on('complete', connectSocket);
	button.on('complete', connectSocket);

	function connectSocket(component) {
		if(yellowLight.state !== 'complete' || orangeLight.state !== 'complete' || button.state !== 'complete') { return; }

		//connect the components
		Hull.connect(button).to(yellowLight);
		Hull.connect(button).to(function(bool) {
			return [!bool];
		}).to(orangeLight);
	}
});
