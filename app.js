//module.exports the object that's actually returned when you require a module
//note that creating an http server with express is a little different from the simple node.js
// (no callback function - at least explicitly)

var express = require('express'),
	connect = require('connect'), // http://www.senchalabs.org/connect/
	mongoose = require('mongoose'), //Load library
	mongoStore = require('connect-mongodb'),
	jade = require('jade'),
	stylus = require('stylus'),
	app = module.exports = express.createServer(),
    models = require('./models'),
    db,
	Document, User, Offer, LoginToken;

// Configuration
// Middleware ordering is important
app.configure(function(){
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({ store: mongoStore(app.get('db-uri')), secret: 'precious' }));
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){ // Configuring different environments
	app.use(express.logger());
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
	app.set('db-uri', 'mongodb://localhost/webrunners-development'); //Instantiate database connection
});

app.configure('production', function(){ // Configuring different environments
	app.use(express.logger());
	app.use(express.errorHandler()); 
	app.set('db-uri', 'mongodb://localhost/webrunner-production'); //Instantiate database connection
});

app.configure('test', function() {
	app.use(express.logger());
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
	app.set('db-uri', 'mongodb://localhost/webrunner-test');
});

// Define models
models.defineModels(mongoose, function() {
	app.Document = Document = mongoose.model('DocumentModel');
	app.User = User = mongoose.model('UserModel');
	app.Offer = Offer = mongoose.model('OfferModel');
	app.LoginToken = LoginToken = mongoose.model('LoginTokenModel');
	db = mongoose.connect(app.set('db-uri')); //Instantiate database connection
})

function authenticateFromLoginToken(req, res, next) {
	
   var cookie = JSON.parse(req.cookies.logintoken);

   LoginToken.findOne({
		email: cookie.email,
		series: cookie.series,
		token: cookie.token
   }, (function(err, token) {
        if (!token) {
            res.redirect('/sessions/new');
            return;
        }

        User.findOne({ email: token.email }, function(err, user) {
			// Get user to sign in
            if (user) {
                req.session.user_id = user.id;
                req.currentUser = user;

				// Renew Token
                token.token = token.randomToken();
                token.save(function() {
                    res.cookie('logintoken', token.cookieValue, {
                        expires: new Date(Date.now() + 2 * 604800000),
                        path: '/'
                    });
                    next();
                });
            } else {
                res.redirect('/sessions/new');
            }
       	});
   	}));
}

function loadUser(req, res, next) {
	// Se já existe uma sessão iniciada com um id
	if (req.session.user_id) {
		User.findById(req.session.user_id, function(err, user) {
			console.log('IF | !ERR');
			if(!err) {
				console.log('IF | !ERR OK');
				// Verifica se o usuário que quer acessar é o dono da sessão
				if (user) {
					 console.log('IF USER');
					 req.currentUser = user;
					 next();
				} else {
					 console.log('IF | ELSE');
					 res.redirect('/sessions/new');
				}
			}
		});
	// Se não existe uma sessão iniciada, verifica os cookies => autentica e faz login
	} else if (req.cookies.logintoken) {
			console.log('ELSE IF');
	    	authenticateFromLoginToken(req, res, next);
	// Se nem cookie existe, então o jeito é fazer login
	} else {
		console.log('ELSE');
		if (typeof currentUser == 'undefined')
			console.log('SOU UM CARA NAO DEFINIDO');
		res.redirect('/sessions/new');
	}
}

/*
 * Route: General use
 */
app.get('/', loadUser, function(req, res) {
	Offer.find({}, [], { sort: ['start', 'descending'] }, function(err, offers) {
		if(!err) {
			res.render('index', {
				title:'WebRunners',
				offers: offers,
				currentUser: req.currentUser
			});
		}
	});
});

app.get('/admin', loadUser, function(req, res) {
	res.render('./admin', { title:'WebRunners', currentUser: req.currentUser });
});

/*
 * Route: Users
 */
// List
app.get('/users', loadUser, function(req, res) {
	User.find({}, [], { sort: ['email', 'descending'] }, function(err, users) {
		if(!err) {
			res.render('users', {
				locals: { users: users }
			});
		}
	});
});

// Edit
app.get('/users/:id.:format?/edit', loadUser, function(req, res) {
	User.findById(req.params.id, function(err, user) {
		if(!err) {
			res.render('users/edit.jade', {
				locals: { user: user }
			});
		}
	});
});

// New
app.get('/users/new', function(req, res) {
	res.render('users/new.jade', { user: new User(), layout: 'layout_login' });
});

/* ***CRUD User*** */
// Create user
app.post('/users.:format?', function(req, res) {

    var user = new User(req.body.user);

	function userSaveFailed() {
		req.flash('error', 'Account creation failed');
		res.render('users/new.jade', {
			locals: { user: user }
		});
	}

	user.save( function(err) {
        if(err) return userSaveFailed();
		else {
			switch (req.params.format) {
	        	case 'json':
		            res.send(user.toObject());
	            break;

		        default:
					req.session.user_id = user.id;
		            res.redirect('/');
	        }
		}
    });

});

// Read user
app.get('/users/:id.:format?', function(req, res) {
    User.findById(req.params.id, function(err, user) {
		if(!err) {
	        switch (req.params.format) {
		        case 'json':
		            res.send(user.__user);
		            break;

		        default:
		            res.render('users/show.jade', {
		                locals: { user: user }
		            });
	        }
		}
    });
});

// Update user
app.put('/users/:id.:format?', loadUser, function(req, res) {

	function userSaveFailed(user) {
		req.flash('error', 'Account update failed');
		res.render('users/edit.jade', {
			locals: { user: user }
		});
	}
	
	// Load the user
	User.findById(req.body.user.id, function(err, user) {
		if(!err) {
			// Do something with it
			user.name = req.body.user.name;
			user.email = req.body.user.email;
			if(req.body.user.password != ''){
				user.password = req.body.user.password;
			}

			// Persist the changes
			user.save( function(err) {
		        if(err){
					return userSaveFailed(user);
				}
				else {
					switch (req.params.format) {
			        	case 'json':
				            res.send(user.toObject());
			            break;

				        default:
							req.session.user_id = user.id;
				            res.redirect('/users');
			        }
				}
		    });
		}
	});
});

// Delete user
app.del('/users/:id.:format?', loadUser, function(req, res) {
	// Load the user
	User.findById(req.params.id, function(err, user) {
		if(!err) {
			user.remove( function() {
				// Respond according to the request format
				switch (req.params.format) {
				case 'json':
				res.send(user.__user);
				break;

				default:
				res.redirect('/users');
				}
			});
		}
	});
});

/*
 * Route: Offer
 */
// List
app.get('/offers', loadUser, function(req, res) {
	Offer.find({}, [], { sort: ['date', 'descending'] }, function(err, offers) {
		if(!err) {
			res.render('offers', {
				locals: { offers: offers }
			});
		}
	});
});

// Edit
app.get('/offers/:id.:format?/edit', loadUser, function(req, res) {
	Offer.findById(req.params.id, function(err, offer) {
		if(!err) {
			res.render('offers/edit.jade', {
				locals: { offer: offer }
			});
		}
	});
});

// New
app.get('/offers/new', loadUser, function(req, res) {
	res.render('offers/new.jade', {
		locals: { offer: new Offer() }
	});
});

/* ***CRUD Offer*** */
// Create offer
app.post('/offers.:format?', loadUser, function(req, res) {
    var offer = new Offer(req.body.offer);
    offer.save( function(err) {
        if(!err) {
			switch (req.params.format) {
	        	case 'json':
		            res.send(offer.__offer);
	            break;

		        default:
		            res.redirect('/offers');
	        }
		}
    });
});

// Read offer
app.get('/offers/:id.:format?', loadUser, function(req, res) {
    Offer.findById(req.params.id, function(err, offer) {
		if(!err) {
	        switch (req.params.format) {
		        case 'json':
		            res.send(offer.__offer);
		            break;

		        default:
		            res.render('offers/show.jade', {
		                locals: { offer: offer }
		            });
	        }
		}
    });
});

// Update offer
app.put('/offers/:id.:format?', loadUser, function(req, res) {
	// Load the offer
	Offer.findById(req.body.offer.id, function(err, offer) {
		if(!err) {
			// Do something with it
			offer.name = req.body.offer.name;
			offer.start = req.body.offer.start;
			offer.description = req.body.offer.description;
			offer.image = req.body.offer.image;

			// Persist the changes
			offer.save( function() {
				// Respond according to the request format
				switch (req.params.format) {
					case 'json':
						res.send(offer.__offer);
					break;
					
					default:
						res.redirect('/offers');
				}
			});
		}
	});
});

// Delete offer
app.del('/offers/:id.:format?', loadUser, function(req, res) {
	// Load the offer
	Offer.findById(req.params.id, function(err, offer) {
		if(!err) {
			// Do something with it
			offer.title = req.params.title;
			offer.data = req.params.data;

			// Persist the changes
			offer.remove( function() {
				// Respond according to the request format
				switch (req.params.format) {
				case 'json':
				res.send(offer.__offer);
				break;

				default:
				res.redirect('/offers');
				}
			});
		}
	});
});

/*
 * Route: Sessions
 */
// New
app.get('/sessions/new', function(req, res) {
	res.render('sessions/new.jade', { user: new User(), layout: 'layout_login' });
});

// Create
app.post('/sessions', function(req, res) {
	User.findOne({ email: req.body.user.email }, function(err, user) {
		if(!err) {
			if (user && user.authenticate(req.body.user.password)) {
				req.session.user_id = user.id;

		        // Remember me
   		        if (req.body.remember_me) {
   		            var loginToken = new LoginToken({
   		                email: user.email
   		            });
   		            loginToken.save(function() {
   		                res.cookie('logintoken', loginToken.cookieValue, {
   		                    expires: new Date(Date.now() + 2 * 604800000),
   		                    path: '/'
   		                });
   		                res.redirect('/');
   		            });
   		        } else res.redirect('/');

			} else {
				req.flash('error', 'Incorrect credentials');
				res.redirect('/sessions/new');
			}
		}
	});
});

// Delete
app.del('/sessions', loadUser, function(req, res) {
	if (req.session) { LoginToken.remove({ email: req.currentUser.email }, function() {});
	    res.clearCookie('logintoken');
	    req.session.destroy(function() {});
	}
	res.redirect('/sessions/new');
});

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

/*
 * Debugging
 */
function removeTokens (tokens) {
	for (t in tokens){
		tokens[t].remove( function() {
			// Respond according to the request format
			switch (tokens[t].format) {
				case 'json':
					res.send(d.__t);
				break;
	
				default:
			}
		});
	}
}

function listTokens (where) {
	LoginToken.find({}, function(err, tokens) {
		if(!err) {
			// removeTokens(tokens);
			console.log('Im at:' + where + '	');
			console.log(tokens);
		}
	});

}

listTokens('end');