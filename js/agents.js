var fbRefs = {};

var fbBase = 'https://d3-svg-agents.firebaseio.com/';

var fbRef = function (path) {
	if (!this.fbRefs[path]) {
		this.fbRefs[path] = new Firebase(this.fbBase + path);
	}
	return this.fbRefs[path];
};

var w = 1062,
	h = 522,
	m = 8,
	degrees = 180 / Math.PI,
	agents = [],
	shits = [];

var svg = d3.select('#canvas')
	.append('svg:svg')
	.attr('width', w)
	.attr('height', h);

//var defs = svg.append('svg:defs');

var blurFilter2 = svg.append('filter')
	.attr('id', 'blur2');

blurFilter2.append('feGaussianBlur')
.attr('stdDeviation', '2');

var test = svg.selectAll('path.test');
var tail = svg.selectAll('path.tail');
var eye = svg.selectAll('circle.eye');
var signal = svg.selectAll('circle.signal');
var debug = svg.selectAll('text.debug');
var debugPath = svg.selectAll('path.debug');
var handle2 = svg.selectAll('circle.handle2');
var handle = svg.selectAll('circle.handle');
var shit = svg.selectAll('circle.shit');

var createAgent = function (id) {
	var x = Math.random() * w, y = Math.random() * h;

	var agent = {
		id : id,
		ref : fbRef('/agents/' + id),
		name : '',
		vx : Math.random() * 2 - 1,
		vy : Math.random() * 2 - 1,
		path : d3.range(m).map(function() { return [x, y]; }),
		count : 0,
		shits : 0,
		target : [Math.random() * w, Math.random() * h]
	};

	agent.ref.on('value', function (snap) {
		var val = snap.val();

		agent.name = val.name;
		agent.style = val.style || 0;

		if (val.target) {
			var tx = w * val.target[0],
				ty = h * val.target[1];

			agent.target = [tx, ty];
		}

		if (val.shits && val.shits !== agent.shits) {
			agent.shits = val.shits;
			shits.push(agent.path[agent.path.length - 1]);
			setTimeout(function () {
				shits.shift();
				restart();
			}, 100);
			restart();
		}
	});

	agents.push(agent);
};

var restart = function () {
	shit = shit.data(shits);

	shit.enter().insert('circle')
	.attr('r', '3')
	.attr('cx', function (d) { return d[0]; })
	.attr('cy', function (d) { return d[1]; })
	.attr('class', 'shit')
	.transition()
	.style('opacity', '0')
	.attr('r', '12')
	.duration(6000).remove();

	test = test.data(agents);

	test.enter().insert('path')
	.attr('d', 'm -18.072632,-3.3146814 c -1.46826,0.6322306 -2.192151,2.31996274 -1.617009,3.82767811 0.278325,0.72962729 0.795686,1.26585099 1.442773,1.59027169 4.92883,2.4501924 9.940829,5.0334654 14.202777,7.1581599 C -1.629279,10.46439 1.256372,10.717925 3.975817,9.6805947 9.136049,7.712239 11.72356,1.9333807 9.755177,-3.2267279 7.790514,-8.3771672 2.029653,-10.96455 -3.123138,-9.0171675 c -4.983165,1.9008622 -9.966329,3.8017244 -14.949494,5.7024861 z')
	.attr('class', function (d) {
		return 'test style' + d.style;
	});

	test.exit().remove();

	tail = tail.data(agents);

	tail.enter().insert('path')
	.attr('class', function (d) {
		return 'tail style' + d.style;
	});

	tail.exit().remove();

	eye = eye.data(agents);

	eye.enter().insert('circle')
	.attr('r', '6')
	.attr('cy', '0')
	.attr('cx', '1')
	.attr('class', function (d) {
		return 'eye style' + d.style;
	});

	eye.exit().remove();

	signal = signal.data(agents);

	signal.enter().insert('circle')
	.attr('r', '2')
	.attr('class', function (d) {
		return 'signal style' + d.style;
	});

	signal.exit().remove();

	debug = debug.data(agents);

	debug.enter().insert('text')
	.attr('class', function (d) {
		return 'debug style' + d.style;
	});

	debug.exit().remove();

	debugPath = debugPath.data(agents);

	debugPath.enter().insert('path')
	.attr('class', function (d) {
		return 'debugPath style' + d.style;
	});

	debugPath.exit().remove();

	handle2 = handle2.data(agents);

	handle2.enter().insert('circle')
	.on('mouseover', function (d, i) {
	})
	.attr('r', '30')
	.attr('marker-mid', 'url(#testmarker)')
	.attr('class', function (d) {
		return 'handle2 style' + d.style;
	});

	handle2.exit().remove();

	handle = handle.data(agents);

	handle.enter().insert('circle')
	.attr('r', '25')
	.attr('class', function (d) {
		return 'handle style' + d.style;
	});

	handle.exit().remove();
};

var agentsRef = fbRef('/agents');

agentsRef.on('child_added', function (snap) {
	console.log(snap.name(), snap.val());

	createAgent(snap.name());
	restart();
});

agentsRef.on('child_removed', function (snap) {
	var id = snap.name();

	agents = agents.filter(function (el) {
		return (el.id !== id);
	});
	restart();
});

var distanceX = function (vec1, vec2) {
	return vec1[0] - vec2[0];
};
var distanceY = function (vec1, vec2) {
	return vec1[1] - vec2[1];
};
var distance = function (vec1, vec2) {
	var dx, dy;
	dx = distanceX(vec1, vec2);
	dy = distanceY(vec1, vec2);
	return Math.sqrt(dx * dx + dy * dy);
};

d3.timer(function () {
	var i, len,
		agent,
		dx, dy, x, y, speed, count, k1,
		j, vx, vy, k2;

	var borderTreshold = 40, siblingTreshold = 50,
		minVelocity = 0.6, maxVelocity = 0.8,
		topDistance, leftDistance, rightDistance, bottomDistance,
		slowZoneX = false, slowZoneY = false,
		agentsLen = agents.length,
		siblingDistance, siblingDistanceX, siblingDistanceY;

	for (i = 0, len = agents.length; i < len; i++) {
		agent = agents[i];


		dx = agent.vx;
		dy = agent.vy;
		x = agent.path[0][0] += dx;
		y = agent.path[0][1] += dy;
		speed = Math.sqrt(dx * dx + dy * dy);
		count = speed * 10;
		k1 = -5 - speed / 3;

		/***************/

		topDistance = y;
		leftDistance = x;
		rightDistance = w - x;
		bottomDistance = h - y;

		// smoothly avoid edges
		if (leftDistance < borderTreshold) { slowZoneX = true; agent.vx += leftDistance / 1500; }
		if (topDistance < borderTreshold) { slowZoneY = true; agent.vy += topDistance / 1500; }
		if (rightDistance < borderTreshold) { slowZoneX = true; agent.vx -= rightDistance / 1500; }
		if (bottomDistance < borderTreshold) { slowZoneY = true; agent.vy -= bottomDistance / 1500; }
		if (leftDistance < 0 || rightDistance < 0) { agent.vx *= -1; }
		if (topDistance < 0 || bottomDistance < 0) { agent.vy *= -1; }

		agent.vx -= distanceX([x, y], agent.target) / 2000;
		agent.vy -= distanceY([x, y], agent.target) / 2000;

//		if (window.statusDebug) {
			agent.debug = agent.name;
//		} else {
//			agent.debug = '';
//		}
		agent.debugPath = [];

		agent.signal = null;

		for (j = 0; j < agentsLen; j++) {
			if (j === i) { continue; } // ignore self

			siblingDistance = distance([x, y], [agents[j].path[0][0], agents[j].path[0][1]]);
			siblingDistanceX = distanceX([x, y], [agents[j].path[0][0], agents[j].path[0][1]]);
			siblingDistanceY = distanceY([x, y], [agents[j].path[0][0], agents[j].path[0][1]]);


			if (siblingDistance < siblingTreshold) {

				agent.signal = 'active';

				agent.vx += siblingDistanceX / 1000;
				agent.vy += siblingDistanceY / 1000;


				agents[j].vx -= siblingDistanceX / 1000;
				agents[j].vy -= siblingDistanceY / 1000;
			}

		}

		// correct velocity
		if (!slowZoneX && Math.abs(agent.vx) > maxVelocity) { agent.vx *= 0.9 }
		if (!slowZoneX && Math.abs(agent.vx) < minVelocity) { agent.vx *= 1.1 }
		if (!slowZoneY && Math.abs(agent.vy) > maxVelocity) { agent.vy *= 0.9 }
		if (!slowZoneY && Math.abs(agent.vy) < minVelocity) { agent.vy *= 1.1 }



		/***************/

		for (j = 1; j < agent.path.length; j++) {
			vx = x - agent.path[j][0];
			vy = y - agent.path[j][1];
			k2 = Math.sin(((agent.count += count) + j * 3) / 300) / speed;
			agent.path[j][0] = (x += dx / speed * k1) - dy * k2;
			agent.path[j][1] = (y += dy / speed * k1) + dx * k2;
			speed = Math.sqrt((dx = vx) * dx + (dy = vy) * dy);
		}

	}

	test.attr('transform', function(d) {
		return 'translate(' + d.path[0] + ')rotate(' + Math.atan2(d.vy, d.vx) * degrees + ')';
	})
	.attr('class', function (d) {
		return 'test style' + d.style;
	});

	tail.attr('d', function(d) {
		return 'M' + d.path.join('L');
	})
	.attr('class', function (d) {
		return 'tail style' + d.style;
	});

	eye.attr('transform', function(d) {
		return 'translate(' + d.path[0] + ')rotate(' + Math.atan2(d.vy, d.vx) * degrees + ')';
	}).attr('class', function (d) {
		return 'eye style' + d.style + ' ' + d.status;
	});

	signal.attr('transform', function(d) {
		return 'translate(' + d.path[d.path.length - 1] + ')';
	})
	.attr('class', function (d) {
		return 'signal style' + d.style + ' ' + ( (d.signal) ? d.signal : '' );
	})
	.attr('r', function (d) {
		return (d.signal === 'active') ? '3' : '2';
	});

	debug.attr('transform', function(d) {
		var x = d.path[0][0];
		var y = d.path[0][1] + 20;
		return 'translate(' + [ x, y ] + ')';
	})
	.text(function (d) {
		return d.debug || '';
	});

	debugPath.attr('d', function(d) {
		if (d.debugPath && d.debugPath.length > 0) {
			return 'M' + d.debugPath.join('L');
		}
		return 'M' + [[0, 0], [0, 0]].join('L');
	})
	.attr('class', function (d) {
		return 'debug style' + d.style;
	});

	handle.attr('transform', function(d) {
		return 'translate(' + d.path[0] + ')';
	})
	.attr('class', function (d) {
		return 'handle style' + d.style + ' ' + ( (d.active) ? 'active' : '' );
	});

	handle2.attr('transform', function(d) {
		return 'translate(' + d.path[0] + ')';
	})
	.attr('class', function (d) {
		return 'handle2 style' + d.style + ' ' + ( (d.active) ? 'active' : '' );
	});
});
