
const crypto = require("crypto");
const fs = require('fs');


class SQLDumpGenerator{
	constructor(target_bytes, filepath){
		this.total_bytes = 0;
		this.target_bytes = target_bytes;
		this.pct = 0;
		this.target_file = filepath;
		this.start_time = new Date().getTime();
		this.stream = fs.createWriteStream(this.target_file, {flags: 'w'});
		this.stream.on('error', console.error);
	}
	
	async init(){
		const interval = setInterval(()=>this.updateProgress(), 1000);
		await this.write("CREATE TABLE `sample_table` (`id` int(11) NOT NULL AUTO_INCREMENT, `name` varchar(250) NOT NULL, `age` int(11) NOT NULL, `date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`id`));\n");
		while(this.total_bytes < this.target_bytes){
			await this.write("INSERT INTO `sample_table` (`name`, `age`) VALUES ('"+this.randName()+"', '"+this.randAge()+"');\n");
		}
		this.stream.end();
		clearInterval(interval);
		this.updateProgress();
	}
	
	write(str){
		return new Promise(resolve => {
			this.total_bytes += Buffer.byteLength(str, 'utf8');
			this.stream.write(str, resolve);
		});
	}
	
	output(str, overwrite_line=false){
		if(overwrite_line){
			process.stdout.clearLine();
			process.stdout.cursorTo(0);
		}
		process.stdout.write(str);
	}
	
	updateProgress(){
		const pct = Math.min(100, Math.floor(this.total_bytes / this.target_bytes * 10000)/100);
		const elapsed_time = new Date().getTime() - this.start_time;
		const ms_per_byte = elapsed_time / this.total_bytes;
		const message = pct === 100 ?
			pct+"% complete in "+this.formatElapsed(elapsed_time)+".":
			pct+"% complete, "+this.formatElapsed(ms_per_byte * (this.target_bytes - this.total_bytes))+" remaining.";
		this.output(message, true);
	}
	
	randName(){
		return crypto.randomBytes(16).toString("hex");
	}
	
	randAge(){
		return Math.floor(Math.random() * (95 - 18 + 1)) + 18;
	}
	
	formatElapsed (millis){
		var minutes = Math.floor(millis / 60000);
		var seconds = ((millis % 60000) / 1000).toFixed(0);
		return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
	}

}

module.exports = SQLDumpGenerator;

//(async function main(){
//	const generator = new SQLDumpGenerator(2.5 * 1e+9, 'large_dump.sql');
//	await generator.init();
//	console.log("\nDump created: ", generator.target_file);
//})();