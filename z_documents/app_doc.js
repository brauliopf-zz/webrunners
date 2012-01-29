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