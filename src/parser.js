/**
 * Split up the dump file into a bunch of seperate queries
 * @param {type} queriesString
 * @returns {Array|parseQueries.queries|nm$_index.parseQueries.queries}
 */
function parseQueries(queriesString) {
	queriesString=queriesString.trim();
	var quoteType = false;
	var queries = [];
	var buffer = [];
	var escaped = false;
	var lastQuoteIndex;
	var bufferIndex = 0;
	for (let i = 0; i < queriesString.length; i++) {
		var char = queriesString[i];
		var last_char = buffer.length ? buffer[buffer.length - 1] : "";
		buffer.push(char);
		if (last_char == "\\") escaped = !escaped;
		else escaped = false;
		var isQuote = (char == '"' || char == "'") && !escaped;
		if (isQuote && quoteType == char) quoteType = false;
		else if (isQuote && !quoteType) quoteType = char;
		if (isQuote) lastQuoteIndex = lastQuoteIndex || bufferIndex;
		bufferIndex++;
		var isNewLine = char == "\n" || char == "\r";
		if (last_char == ";" && isNewLine && false == quoteType) {
			queries.push(buffer.join(''));
			buffer = [];
			bufferIndex = 0;
			lastQuoteIndex = 0;
		}
	}
	/* istanbul ignore next */
	if (!!quoteType) {
		buffer_str = buffer.join('');
		var re_parse = buffer_str.substr(lastQuoteIndex + 1);
		buffer = buffer_str.substr(0, lastQuoteIndex + 1).split('');
		var newParts = parseQueries(re_parse);
		if (newParts.length) {
			var contd = newParts.pop().split('');
			buffer = [...buffer, ...contd];
			queries.push(buffer.join(''));
			buffer = [];
			queries = [...queries, ...newParts];
		}
	}
	if (buffer.length) queries.push(buffer.join(''));
	return queries;
}
