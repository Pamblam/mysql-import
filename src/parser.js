
class queryParser extends stream.Writable{
	
	constructor(options){
		/* istanbul ignore next */
		options = options || {};
		super(options);
		
		// The number of bytes processed so far
		this.processed_size = 0;
		
		// The progress callback
		this.onProgress = options.onProgress || (() => {});
		
		// the encoding of the file being read
		this.encoding = options.encoding || 'utf8';
		
		// the encoding of the database connection
		this.db_connection = options.db_connection;
		
		// The quote type (' or ") if the parser 
		// is currently inside of a quote, else false
		this.quoteType = false;
		
		// An array of chars representing the substring
		// the is currently being parsed
		this.buffer = [];
		
		// Is the current char escaped
		this.escaped = false;
		
		// The string that denotes the end of a query
		this.delimiter = ';';

		// Literal string to look for while checking for a mysql delimiter set statement
		this.delimiterLiteral = 'delimiter ';

		// Temporary buffer used while checking for a mysql delimiter set statement
		this.delimiterParseBuffer = '';

		// Are we currently seeking new delimiter
		this.seekingDelimiter = false;
		
	}
	
	////////////////////////////////////////////////////////////////////////////
	// "Private" methods" //////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////
	
	// handle piped data
	async _write(chunk, enc, next) {
		var query;
		chunk = chunk.toString(this.encoding);
		var error = null;
		for (let i = 0; i < chunk.length; i++) {
			let char = chunk[i];
			query = this.parseChar(char);
			try{
				if(query) await this.executeQuery(query);
			}catch(e){
				error = e;
				break;
			}
		}
		this.processed_size += chunk.length;
		this.onProgress(this.processed_size);
		next(error);
	}
	
	// Execute a query, return a Promise
	executeQuery(query){
		return new Promise((resolve, reject)=>{
			this.db_connection.query(query, err=>{
				if (err){
					reject(err);
				}else{
					resolve();
				}
			});
		});
	}
	
	// Parse the next char in the string
	// return a full query if one is detected after parsing this char
	// else return false.
	parseChar(char){
		this.checkEscapeChar();
		this.buffer.push(char);
		this.checkNewDelimiter(char);
		this.checkQuote(char);
		return this.checkEndOfQuery();
	}
	
	// Check if the current char has been escaped
	// and update this.escaped
	checkEscapeChar(){
		if(!this.buffer.length) return;
		if(this.buffer[this.buffer.length - 1] === "\\"){
			this.escaped = !this.escaped;
		}else{
			this.escaped = false;
		}
	}
	
	// Check to see if a new delimiter is being assigned
	checkNewDelimiter(char){
		var lowerChar = char.toLowerCase();
		var isNewLine = lowerChar === "\n" || lowerChar === "\r";
		if(isNewLine && this.seekingDelimiter){
			// We found the new delimiter, reset locals
			this.seekingDelimiter = false;
			this.delimiterParseBuffer = '';
			// Clear buffer so we can continue looking for new queries
			this.buffer = [];
		}else if(this.seekingDelimiter){
			// Append the char to the delimiter string, we haven't encountered a newline yet
			this.delimiter += lowerChar;
		}

		// If the current character is the one we expect given the delimiter literal
		if(!this.quoteType && lowerChar == this.delimiterLiteral[this.delimiterParseBuffer.length]){
			this.delimiterParseBuffer += lowerChar;
		}else{
			// Reset temp buffer because current character didn't match, we have to start over again
			this.delimiterParseBuffer = '';
		}

		// We matched the whole literal so we can start looking for the delimiter value itself
		if(this.delimiterLiteral === this.delimiterParseBuffer.toString()){
			this.seekingDelimiter = true;
			// Reset the current delimiter because we now can start parsing a new one
			this.delimiter = '';
		}
	}
	
	// Check if the current char is a quote
	checkQuote(char){
		var isQuote = (char === '"' || char === "'") && !this.escaped;
		if (isQuote && this.quoteType === char){
			this.quoteType = false;
		}else if(isQuote && !this.quoteType){
			this.quoteType = char;
		}
	}
	
	// Check if we're at the end of the query
	// return the query if so, else return false;
	checkEndOfQuery(){
		if(this.seekingDelimiter){
			return false;
		}

		var query = false;
		var demiliterFound = false;
		if(!this.quoteType && this.buffer.length >= this.delimiter.length){
			demiliterFound = this.buffer.slice(-this.delimiter.length).join('') === this.delimiter;
		}

		if (demiliterFound) {
			// trim the delimiter off the end
			this.buffer.splice(-this.delimiter.length, this.delimiter.length);
			query = this.buffer.join('').trim();
			this.buffer = [];
		}
		
		return query;
	}
}
