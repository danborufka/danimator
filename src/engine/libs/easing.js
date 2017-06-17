// easing functions for animations

var pi2 = Math.PI*2;

Ease = {
	linear: 	function(t) { return t; 					},
	cubicIn: 	function(t) { return Math.pow(t,3);			},
	cubicOut: 	function(t) { return 1-Math.pow(1-t,3); 	},
	cubicInOut: function(t) {
		if ((t*=2)<1) return 0.5 * Math.pow(t,3);
		return 1-0.5 * Math.abs(Math.pow(2-t,3));
	},
	bounceOut: 	function(t) {
		if (t < 1/2.75) {
			return (7.5625*t*t);
		} else if (t < 2/2.75) {
			return (7.5625*(t-=1.5/2.75)*t+0.75);
		} else if (t < 2.5/2.75) {
			return (7.5625*(t-=2.25/2.75)*t+0.9375);
		} else {
			return (7.5625*(t-=2.625/2.75)*t +0.984375);
		}
	},
	elasticIn: 	function(t) {
		if (t==0 || t==1) return t;
		var s = 0.3/pi2*Math.asin(1/1);
		return -(1*Math.pow(2,10*(t-=1))*Math.sin((t-s)*pi2/0.3));
	},
	elasticOut: function(t) {
		if (t==0 || t==1) return t;
		var s = 0.3/pi2 * Math.asin(1/1);
		return (1*Math.pow(2,-10*t)*Math.sin((t-s)*pi2/0.3 )+1);
	},
	elasticInOut: function(t) {
		var s = 0.3*1.5/pi2 * Math.asin(1/1);
		if ((t*=2)<1) return -0.5*(1*Math.pow(2,10*(t-=1))*Math.sin( (t-s)*pi2/0.3*1.5 ));
		return 1*Math.pow(2,-10*(t-=1))*Math.sin((t-s)*pi2/0.3*1.5)*0.5+1;
	}
};