/*
 * Route: Offer
 */
// List
function oindex (Offer){
	function(req, res){
		console.log('Aqui!!!');
		Offer.find({}, [], { sort: ['date', 'descending'] }, function(err, offers) {
			if(!err) {
				res.render('offers', {
					locals: { offers: offers }
				});
			}
		});
	}
}

// Edit
function oedit (Offer){
	function(req, res){
		Offer.findById(req.params.id, function(err, offer) {
			if(!err) {
				res.render('offers/edit.jade', {
					locals: { offer: offer }
				});
			}
		});
	}
}

// New
function onew (Offer){
	function(req, res){
		res.render('offers/new.jade', {
			locals: { offer: new Offer() }
		});
	}
}

module.exports.oindex = oindex;
module.exports.oedit = oedit;
module.exports.onew = onew;