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
	Document, User, Offer;

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
	db = mongoose.connect(app.set('db-uri')); //Instantiate database connection
})

function loadUser(req, res, next) {
	if (req.session.user_id) {
		User.findById(req.session.user_id, function(err, user) {
			if(!err) {
				if (user) {
					 req.currentUser = user;
					 next();
				} else {
					 res.redirect('/sessions/new');
				}
			}
	});
	} else {
	res.redirect('/sessions/new');
	}
}

/*
 * Route: General use
 */
app.get('/', function(req, res) {
	Offer.find({}, [], { sort: ['start', 'descending'] }, function(err, offers) {
		if(!err) {
			res.render('index', {title:'WebRunners', offers: offers });
		}
	});
});

app.get('/admin', function(req, res) {
	res.render('./admin', {title:'WebRunners'});
});

/*
 * Route: Users
 */
// New
app.get('/users/new', function(req, res) {
	res.render('users/new.jade', {
		locals: { user: new User() }
	});
});

// Create
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

/*
 * Route: Sessions
 */
// New
app.get('/sessions/new', function(req, res) {
	res.render('sessions/new.jade', {
		locals: { user: new User() }
	});
});

// Create
app.post('/sessions', function(req, res) {
	User.findOne({ email: req.body.user.email }, function(err, user) {
		if(!err) {
			if (user && user.authenticate(req.body.user.password)) {
				req.session.user_id = user.id;
				res.redirect('/documents');

		        // // Remember me
		        // 		        if (req.body.remember_me) {
		        // 		            var loginToken = new LoginToken({
		        // 		                email: user.email
		        // 		            });
		        // 		            loginToken.save(function() {
		        // 		                res.cookie('logintoken', loginToken.cookieValue, {
		        // 		                    expires: new Date(Date.now() + 2 * 604800000),
		        // 		                    path: '/'
		        // 		                });
		        // 		                res.redirect('/documents');
		        // 		            });
		        // 		        } else {
		        // 		            res.redirect('/documents');
		        // 		        }

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

/*
 * Route: Documents
 */
// List
app.get('/documents', function(req, res) {
	Document.find({}, [], { sort: ['title', 'descending'] }, function(err, docs) {
		if(!err) {
			res.render('documents', {
				locals: { documents: docs }
			});
		}
	});
});

// Edit
app.get('/documents/:id.:format?/edit', function(req, res) {
	Document.findById(req.params.id, function(err, doc) {
		if(!err) {
			res.render('documents/edit.jade', {
				locals: { d: doc }
			});
		}
	});
});

// New
app.get('/documents/new', function(req, res) {
	res.render('documents/new.jade', {
		locals: { d: new Document() }
	});
});

/* ***CRUD Document*** */
// Create document
app.post('/documents.:format?', function(req, res) {
    var d = new Document(req.body.document);
    d.save( function(err) {
        if(!err) {
			switch (req.params.format) {
	        	case 'json':
		            res.send(d.__doc);
	            break;

		        default:
		            res.redirect('/');
	        }
		}
    });
});

// Read document
app.get('/documents/:id.:format?', function(req, res) {
    Document.findById(req.params.id, function(err, doc) {
		if(!err) {
			console.log(doc);
	        switch (req.params.format) {
		        case 'json':
		            res.send(doc.__doc);
		            break;

		        default:
		            res.render('documents/show.jade', {
		                locals: { d: doc }
		            });
	        }
		}
    });
});

// Update document
app.put('/documents/:id.:format?', function(req, res) {
	// Load the document
	Document.findById(req.body.document.id, function(err, doc) {
		if(!err) {
			// Do something with it
			doc.title = req.body.document.title;
			doc.data = req.body.document.data;

			// Persist the changes
			doc.save( function() {
				// Respond according to the request format
				switch (req.params.format) {
					case 'json':
						res.send(d.__doc);
					break;
					
					default:
						res.redirect('/');
				}
			});
		}
	});
});

// Delete document
app.del('/documents/:id.:format?', function(req, res) {
	// Load the document
	Offer.findById(req.params.id, function(err, doc) {
		if(!err) {
			// Do something with it
			doc.title = req.params.title;
			doc.data = req.params.data;

			// Persist the changes
			doc.remove( function() {
				// Respond according to the request format
				switch (req.params.format) {
				case 'json':
				res.send(d.__doc);
				break;

				default:
				res.redirect('/');
				}
			});
		}
	});
});

/*
 * Route: Offer
 */
// List
app.get('/offers', function(req, res) {
	Offer.find({}, [], { sort: ['date', 'descending'] }, function(err, offers) {
		if(!err) {
			res.render('offers', {
				locals: { offers: offers }
			});
		}
	});
});

// Edit
app.get('/offers/:id.:format?/edit', function(req, res) {
	Offer.findById(req.params.id, function(err, offer) {
		if(!err) {
			res.render('offers/edit.jade', {
				locals: { offer: offer }
			});
		}
	});
});

// New
app.get('/offers/new', function(req, res) {
	res.render('offers/new.jade', {
		locals: { offer: new Offer() }
	});
});

/* ***CRUD Offer*** */
// Create offer
app.post('/offers.:format?', function(req, res) {
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
app.get('/offers/:id.:format?', function(req, res) {
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
app.put('/offers/:id.:format?', function(req, res) {
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
app.del('/offers/:id.:format?', function(req, res) {
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

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
