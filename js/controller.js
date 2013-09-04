function guid () {
    var S4 = function() {
       return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return 'poop' + (S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4());
}

var aspect = 1062 / 522;

var fbRefs = {};

var fbBase = 'https://d3-svg-agents.firebaseio.com/';

var fbRef = function (path) {
	if (!this.fbRefs[path]) {
		this.fbRefs[path] = new Firebase(this.fbBase + path);
	}
	return this.fbRefs[path];
};

var id = guid();

var connect = function () {
	var connectedRef = fbRef('/.info/connected'),
		agentRef = fbRef('/agents/' + id);

	connectedRef.on('value', function (snap) {
		if (snap.val() === true) {
			agentRef.onDisconnect().remove();

			agentRef.child('name').set('_');
			agentRef.child('target').set([0, 0]);
		}
	});
};

var resizeTs = function () {
	var el = $('#targetselector');
	var h = el.width() / aspect;
	el.height(h);
};

$(document).ready(function () {
	connect();
	var agentRef = fbRef('/agents/' + id);

	resizeTs();

	$('#targetselector').on('click', function (ev) {

		var ts = $(this),
			w = ts.width(),
			h = ts.height(),
			x = 1 / w * ev.layerX,
			y = 1 / h * ev.layerY;

		$('#pointer').css({
			'top' : ev.layerY - 12,
			'left' : ev.layerX - 12
		});

		agentRef.child('target').set([ x, y ]);
	});

	$(window).on('resize', function (ev) {
		resizeTs();
	});

	$('#name').on('keyup', function (ev) {
		var el = $(this);
		agentRef.child('name').set(el.val());
	});

	$('button.agentstyle').on('click', function () {
		var el = $(this);
		var styleId = +el.data('styleid');
		agentRef.child('style').set(styleId);
	});

	$('#shit').on('click', function () {
		agentRef.child('shits').transaction(function (current_value) {
			return +current_value + 1;
		});
	});
});

