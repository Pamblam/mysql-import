
class queryParser{
	
	constructor(queriesString){
		
		// query handler function
		this.queryHandler = ()=>{};
		
		// completion handler
		this.completeHandler = ()=>{};
		
		// chunks of data that need to be processed
		this.pending_chunks = [];
		
		// is currently parsing?
		this.parsing = false;
		
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
		
		// Are we currently seeking new delimiter
		this.seekingDelimiter = false;
	}
	
	// set a callback function to be called when the current queue is finished
	// or immediately if there is no current queue
	onQueueFinished(fn){
		if(typeof fn !== 'function') return false;
		this.completeHandler = fn;
		if(!this.parsing) this.completeHandler();
	}
	
	// handle a portion of the data file from a read stream
	onStream(chunk){
		this.pending_chunks.push(chunk);
		this.handlePendingChunks();
	}
	
	// Add a function to do something with each query.
	// by running the callback and garbage collecting we can handle large files
	onQuery(fn){
		if(typeof fn !== 'function') return false;
		this.queryHandler = fn;
	}
	
	////////////////////////////////////////////////////////////////////////////
	// "Private" methods" //////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////////////
	
	// recursively parse pending chunks of data
	handlePendingChunks(){
		if(this.parsing) return;
		this.parsing = true;
		var chunk = this.pending_chunks.shift();
		for (let i = 0; i < chunk.length; i++) {
			let char = chunk[i];
			this.parseChar(char);
		}
		this.parsing = false;
		if(this.pending_chunks.length) this.handlePendingChunks();
		else this.completeHandler();
	}
	
	// Parse the next char in the string
	parseChar(char){
		this.checkEscapeChar();
		this.buffer.push(char);

		this.checkNewDelimiter(char);

		this.checkQuote(char);
		this.checkEndOfQuery();
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
		var buffer_str = this.buffer.join('').toLowerCase().trim();
		if(buffer_str === 'delimiter' && !this.quoteType){
			this.seekingDelimiter = true;
			this.buffer = [];
		}else{
			var isNewLine = char === "\n" || char === "\r";
			if(isNewLine && this.seekingDelimiter){
				this.seekingDelimiter = false;
				this.delimiter = this.buffer.join('').trim();
				this.buffer = [];
			}
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
	checkEndOfQuery(){
		var demiliterFound = false;
		if(!this.quoteType && this.buffer.length >= this.delimiter.length){
			demiliterFound = this.buffer.slice(-this.delimiter.length).join('') === this.delimiter;
		}

		if (demiliterFound) {
			// trim the delimiter off the end
			this.buffer.splice(-this.delimiter.length, this.delimiter.length);
			this.queryHandler(this.buffer.join('').trim());
			this.buffer = [];
		}
	}
}
