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
			removeTokens(tokens);
			console.log('Im at:' + where + '	');
			console.log(tokens);
		}
	});

}

listTokens('end');