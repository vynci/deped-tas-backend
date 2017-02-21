// version 1.0

var childProcess = require('child_process'),
ls;
var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var path = require('path');
var fs = require('fs');
var schedule = require('node-schedule');
var exec = require('child_process').exec;
var app = express();

var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;

if (!databaseUri) {
	console.log('DATABASE_URI not specified, falling back to localhost.');
}

var api = new ParseServer({
	databaseURI: databaseUri || 'mongodb://localhost:27017/dev',
	cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
	appId: 'myAppId',
	masterKey: 'myMasterKey', //Add your master key here. Keep it secret!
	javascriptKey: 'laserblackdog',
	restAPIKey: 'myRestAPIKey',
	maxUploadSize : '2mb',
	serverURL: process.env.SERVER_URL || 'http://localhost:1337/parse',  // Don't forget to change to https if needed
	liveQuery: {
		classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
	}
});

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');

	next();
});

app.use('/', express.static(path.join(__dirname, '/dist')));

app.get('/wifi-settings/:oldssid/:newssid/:oldpass/:newpass', function(req, res) {
	console.log(req.params);

	var oldSSID = req.params.oldssid;
	var newSSID = req.params.newssid;

	var oldPassword = req.params.oldpass;
	var newPassword = req.params.newpass;

	fs.readFile('/etc/hostapd/hostapd.conf', 'utf8', function (err,data) {
		if (err) {
			res.json({ message: 'wifi credentials failed!' });
			return console.log(err);
		}

		var re = new RegExp("ssid=" + oldSSID, "g");
		var result = data.replace(re, "ssid=" + newSSID);

		fs.writeFile('/etc/hostapd/hostapd.conf', result, 'utf8', function (err) {
			if (err) {
				res.json({ message: 'wifi credentials failed!' });
				return console.log(err);
			}

			else{
				fs.readFile('/etc/hostapd/hostapd.conf', 'utf8', function (err,data) {
					if (err) {
						res.json({ message: 'wifi credentials failed!' });
						return console.log(err);
					}
					var re2 = new RegExp("wpa_passphrase=" + oldPassword, "g");
					var result2 = data.replace(re2, 'wpa_passphrase=' + newPassword);

					fs.writeFile('/etc/hostapd/hostapd.conf', result2, 'utf8', function (err) {
						if (err) {
							res.json({ message: 'wifi credentials failed!' });
							return console.log(err);
						}
						else {
							res.json({ message: 'wifi credentials set!' });
						}
					});
				});
			}

		});
	});
});

app.get('/system-time/:time', function(req, res) {

	var time = req.params.time
	var command = 'sudo date -s "' + time + '"';

	var exec = require('child_process').exec;
	exec(command, function(error, stdout, stderr) {
		if (error !== null) {
			console.log('exec error: ' + error);
		}
		else{
			var exec2 = require('child_process').exec;
			exec2('sudo hwclock -w', function(error, stdout, stderr) {
				if (error !== null) {
					console.log('exec error: ' + error);
				}
				else{
					res.json({ message: 'System Time Set' });
				}
			});
		}
	});

});

app.get('/backup/:process', function(req, res) {

	var process = req.params.process;
	var exec = require('child_process').exec;

	if(process === 'import'){
		exec('mongoimport --db dev --collection PeriodLog --file /media/usb/PeriodLog.json', function(error, stdout, stderr) {
			if (error !== null) {
				console.log('exec error: ' + error);
			}
			else{
				console.log(stdout);
				var exec2 = require('child_process').exec;
				exec2('mongoimport --db dev --collection Employee --file /media/usb/Employee.json', function(error, stdout, stderr) {
					if (error !== null) {
						console.log('exec error: ' + error);
					}
					else{
						console.log(stdout);
						var exec3 = require('child_process').exec;
						exec3('mongoimport --db dev --collection Holiday --file /media/usb/Holiday.json', function(error, stdout, stderr) {
							if (error !== null) {
								console.log('exec error: ' + error);
							}
							else{
								console.log(stdout);
								var exec4 = require('child_process').exec;
								exec4('mongoimport --db dev --collection Settings --file /media/usb/Settings.json', function(error, stdout, stderr) {
									if (error !== null) {
										console.log('exec error: ' + error);
									}
									else{
										console.log(stdout);
										res.json({ message: 'Import Success' });
									}
								});
							}
						});
					}
				});
			}
		});
	}
	else if(process === 'export'){
		exec('mongoexport --db dev --collection PeriodLog --out /media/usb/PeriodLog.json', function(error, stdout, stderr) {
			if (error !== null) {
				console.log('exec error: ' + error);
			}
			else{
				console.log(stdout);
				var exec2 = require('child_process').exec;
				exec('mongoexport --db dev --collection Employee --out /media/usb/Employee.json', function(error, stdout, stderr) {
					if (error !== null) {
						console.log('exec error: ' + error);
					}
					else{
						console.log(stdout);
						var exec3 = require('child_process').exec;
						exec('mongoexport --db dev --collection Holiday --out /media/usb/Holiday.json', function(error, stdout, stderr) {
							if (error !== null) {
								console.log('exec error: ' + error);
							}
							else{
								console.log(stdout);
								var exec4 = require('child_process').exec;
								exec4('mongoexport --db dev --collection Settings --out /media/usb/Settings.json', function(error, stdout, stderr) {
									if (error !== null) {
										console.log('exec error: ' + error);
									}
									else{
										console.log(stdout);
										res.json({ message: 'Export Success' });
									}
								});
							}
						});
					}
				});
			}
		});
	}
	else {
		res.json({ message: 'Invalid Backup Process' });
	}
});

app.get('/device/reboot', function(req, res) {

	var exec = require('child_process').exec;
	exec('sudo reboot', function(error, stdout, stderr) {
		if (error !== null) {
			console.log('exec error: ' + error);
		}
		else{
			res.json({ message: 'Device Rebooting' });
		}
	});

});

app.get('/device/power-off', function(req, res) {
	var exec = require('child_process').exec;
	exec('sudo poweroff', function(error, stdout, stderr) {
		if (error !== null) {
			console.log('exec error: ' + error);
		}
		else{
			res.json({ message: 'Device Shutting Down' });
		}
	});
});

app.get('/admin/reset-password', function(req, res) {
	var User = Parse.Object.extend("User");
	var user = new Parse.Query(User);

	user.equalTo("username", "admin");

	user.find({
		success: function(results) {
			console.log(results[0].attributes);
			results[0].set('password', 'admin');
			results[0].save(null, {
				success: function(result) {
					// Execute any logic that should take place after the object is saved.
					console.log('success');
					res.json({ message: 'success' });
				},
				error: function(gameScore, error) {
					console.log('error');
					res.json({ message: 'error' });
				}
			});

		},
		error: function(error) {
			console.log(error);
		}
	});

});




// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
	console.log('parse-server-example running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);

var io = require('socket.io').listen(4444);


var serialport = require("serialport");
var SerialPort = require("serialport").SerialPort
var serialPort = new SerialPort("/dev/ttyAMA0", {
	baudrate: 9600,
	parser: serialport.parsers.readline("\n")
}, false); // this is the openImmediately flag [default is true]

Parse.initialize("myAppId", "myAppId", "myMasterKey");
Parse.serverURL = 'http://localhost:1337/parse';
Parse.Cloud.useMasterKey();

serialPort.open(function (error) {
	if ( error ) {
		console.log('failed to open: '+error);
	} else {
		console.log('open');
		serialPort.on('data', function(data) {
			console.log(data.toString());
			createDailyLog(data.toString());
			io.emit('fromPublicServer',data.toString());
		});
	}
});


io.on('connection', function(socket){

	socket.on('connect', function(data){
		console.log('connect');
	});

	socket.on('toPublicServer', function(data){
		console.log(data);
		serialPort.write(data + "\n", function(err, results) {
			console.log('err: ' + err);
			console.log('results: ' + results);
		});
	});

	socket.on('disconnect', function(){

	});

});

/// Schedules ///

var Settings = Parse.Object.extend("Settings");
var query = new Parse.Query(Settings);
var settingsCutoffTime = '';
var enableOvertimeOption = '';

query.equalTo("objectId", 'EpS16KPDOv');

query.find({
	success: function(results) {
		var rule = new schedule.RecurrenceRule();

		rule.hour = results[0].get('backupTime').hour;
		rule.minute = results[0].get('backupTime').minute;

		settingsCutoffTime = results[0].get('cutoffTime');
		isCutOffTime = results[0].get('isCutOffTime');
		isTwoLogsEnable = results[0].get('isTwoLogsEnable');
		enableOvertimeOption = results[0].get('enableOvertimeOption');

		var j = schedule.scheduleJob(rule, function(){
			console.log('system is backing up!');
			backupSystemCommand();
			deleteDailyLogs();
		});
	},
	error: function(error) {
		alert("Error: " + error.code + " " + error.message);
	}
});

////

function createDailyLog(data){
	if(stringContains(data, 'found:')){
		var tmp = data.split(':');
		tmp = tmp[1];

		var EmployeeObject = Parse.Object.extend("Employee");
		var query = new Parse.Query(EmployeeObject);
		query.equalTo("fingerPrintId", tmp);
		query.find({
			success: function(result) {
				var dateNow = new Date();
				dateNow = dateNow.getDate().toString() + dateNow.getMonth().toString() + dateNow.getFullYear().toString();

				var currentEmployee = result[0];
				var today = new Date();

				var h = today.getHours();
				var hTimeInDecimals = today.getHours();

				var period = 'PM';

				if(h < 12){
					period = 'AM';
				}

				var m = today.getMinutes();
				var s = today.getSeconds();
				h = checkAMPM(h);
				m = checkTime(m);
				s = checkTime(s);

				var timeInDecimals = hTimeInDecimals + m/100;

				var time = h + ":" + m + ":" + s + ' ' + period;
				var forPeriodTime = h + ":" + m  + ' ' + period;

				var DailyLog = Parse.Object.extend("DailyLog");
				var dailyLog = new DailyLog();

				dailyLog.set("firstName", result[0].attributes.firstName);
				dailyLog.set("lastName", result[0].attributes.lastName);
				dailyLog.set("position", result[0].attributes.position);
				dailyLog.set("idNumber", result[0].attributes.employeeId);
				dailyLog.set("employeeId", result[0].id);

				if(result[0].attributes.isCheckedIn){
					currentEmployee.set("isCheckedIn", false);
				} else {
					currentEmployee.set("isCheckedIn", true);
				}


				// if(result[0].attributes.currentPeriodLog.sequence === 0 && currentEmployee.attributes.endDateLog !== dateNow){
				// 		dailyLog.set("time", time + '- Log-In');
				// }else{
				// 	if(result[0].attributes.currentPeriodLog.sequence === 1){
				// 		dailyLog.set("time", time + '- Break-Out');
				// 	}else if(result[0].attributes.currentPeriodLog.sequence === 2){
				// 		dailyLog.set("time", time + '- Break-In');
				// 	}else{
				// 		if(result[0].attributes.currentPeriodLog.id === null && currentEmployee.attributes.endDateLog !== null){
				// 			dailyLog.set("time", time + '-Extra Log');
				// 		}else{
				// 			dailyLog.set("time", time + '- Log-Out');
				// 		}
				// 	}
				// }

				if(result[0].attributes.currentPeriodLog.sequence === 0 && currentEmployee.attributes.endDateLog !== dateNow){
					dailyLog.set("time", time + '- Log-In');
				}else{
					if(result[0].attributes.currentPeriodLog.sequence === 1){
						if(currentEmployee.attributes.currentPeriodLog.createdDate !== dateNow){
							dailyLog.set("time", time + '- Log-In');
						}else{
							dailyLog.set("time", time + '- Break-Out');
						}
						if(isTwoLogsEnable){
							dailyLog.set("time", time + '- Log-Out');
						}

					}else if(result[0].attributes.currentPeriodLog.sequence === 2){
						if(currentEmployee.attributes.currentPeriodLog.createdDate !== dateNow){
							dailyLog.set("time", time + '- Log-In');
						}else{
							dailyLog.set("time", time + '- Break-In');
						}
					}else{
						if(result[0].attributes.currentPeriodLog.id === null && currentEmployee.attributes.endDateLog !== null){
							dailyLog.set("time", time + '-Extra Log');
						}else{
							if(currentEmployee.attributes.currentPeriodLog.createdDate !== dateNow){
								dailyLog.set("time", time + '- Log-In');
							}else{
								dailyLog.set("time", time + '- Log-Out');
							}
						}
					}
				}

				if(currentEmployee.attributes.currentPeriodLog.id === null && currentEmployee.attributes.endDateLog === dateNow){
					currentEmployee.set("isCheckedIn", false);
				}

				currentEmployee.save(null, {
					success: function(result) {
						dailyLog.save(null, {
							success: function(result) {
								// Execute any logic that should take place after the object is saved.

								var PeriodLog = Parse.Object.extend("PeriodLog");
								var periodLog = new PeriodLog();
								var periodSeq = currentEmployee.attributes.currentPeriodLog.sequence;
								var isPeriodDone = false;
								var isPeriodLogFull = false;

								if(currentEmployee.attributes.currentPeriodLog.createdDate !== dateNow){
									console.log('force reset');
									currentEmployee.set("currentPeriodLog", {
										id: null,
										date: null,
										sequence: 0,
										totalTime : 0
									});
								}

								if(currentEmployee.attributes.currentPeriodLog.id === null && currentEmployee.attributes.endDateLog !== dateNow){
									console.log('State 1');
									if(currentEmployee.attributes.currentPeriodLog.sequence === 0){
										console.log(period);
										var createdAt = new Date();
										periodLog.set("employeeId", currentEmployee.id);
										periodLog.set("name", currentEmployee.attributes.firstName + ' ' + currentEmployee.attributes.lastName);
										periodLog.set("periodDate", createdAt);

										if(isCutOffTime){
											if(timeInDecimals >= settingsCutoffTime){
												periodLog.set("arrivalPM", forPeriodTime);
												periodSeq = 3;
											}

											else {
												periodLog.set("arrivalAM", forPeriodTime);
												periodSeq = 1;
											}
										} else {
											periodLog.set("arrivalAM", forPeriodTime);
											periodSeq = 1;
										}

									}
								}
								else if(currentEmployee.attributes.currentPeriodLog.id === null && currentEmployee.attributes.endDateLog === dateNow){
									console.log('State 2');
									isPeriodLogFull = true;
									periodLog.id = currentEmployee.attributes.lastDepartArrive.id;
								}
								else {
									console.log('State 3');
									periodLog.id = currentEmployee.attributes.currentPeriodLog.id;
									if(!isTwoLogsEnable){
										if(currentEmployee.attributes.currentPeriodLog.sequence === 1){
											periodLog.set("departureAM", forPeriodTime);
											periodSeq = 2;
										}
										else if(currentEmployee.attributes.currentPeriodLog.sequence === 2){
											periodLog.set("arrivalPM", forPeriodTime);
											periodSeq = 3;
										}
										else if(currentEmployee.attributes.currentPeriodLog.sequence === 3){
											periodLog.set("departurePM", forPeriodTime);
											periodSeq = 0;
											isPeriodDone = true;
										}
									}else{
										periodLog.set("departurePM", forPeriodTime);
										periodSeq = 0;
										isPeriodDone = true;
									}

								}

								if(!isPeriodLogFull){
									periodLog.save(null, {
										success: function(result) {
											// Execute any logic that should take place after the object is saved.

											var GameScore = Parse.Object.extend("PeriodLog");
											var query = new Parse.Query(GameScore);
											query.get(result.id, {
												success: function(gameScore) {
													// The object was retrieved successfully.

													var total = 0;
													var departArrive = {
														arrivalAM : gameScore.get('arrivalAM'),
														departureAM :gameScore.get('departureAM'),
														arrivalPM : gameScore.get('arrivalPM'),
														departurePM : gameScore.get('departurePM')
													}

													if(periodSeq === 2){
														console.log('arrivalAM');
														console.log(gameScore.get('arrivalAM'));

														console.log('departureAM');
														console.log(gameScore.get('departureAM'));
														total = timeDifference(gameScore.get('arrivalAM'), gameScore.get('departureAM'));
													}

													if(periodSeq === 0 && isPeriodDone){
														if(!isTwoLogsEnable){
															total = timeDifference(gameScore.get('arrivalPM'), gameScore.get('departurePM'));
															total = total + currentEmployee.attributes.currentPeriodLog.totalTime;
														}else{
															total = timeDifference(gameScore.get('arrivalAM'), gameScore.get('departurePM'));
															total = total + currentEmployee.attributes.currentPeriodLog.totalTime;
														}


														if(!enableOvertimeOption){
															if(total > 480){
																total = 480;
															}
														}

														gameScore.set("totalTime", total.toString());

														gameScore.save(null, {
															success: function(gameScore) {
																// Execute any logic that should take place after the object is saved.
																console.log('period log done!');
															},
															error: function(gameScore, error) {
																// Execute any logic that should take place if the save fails.
																// error is a Parse.Error with an error code and message.
																console.log('Failed to create new object, with error code: ' + error.message);
															}
														});
													}

													if(periodSeq !== 0){
														var createdDateNow = new Date();
														createdDateNow = createdDateNow.getDate().toString() + createdDateNow.getMonth().toString() + createdDateNow.getFullYear().toString();

														currentEmployee.set("currentPeriodLog", {
															id: result.id,
															date: null,
															sequence: periodSeq,
															totalTime : total + currentEmployee.attributes.currentPeriodLog.totalTime,
															createdDate : createdDateNow
														});
													}

													else {
														isPeriodDone = false;
														currentEmployee.set("currentPeriodLog", {
															id: null,
															date: null,
															sequence: 0,
															totalTime : 0
														});
														var dateNow = new Date();
														dateNow = dateNow.getDate().toString() + dateNow.getMonth().toString() + dateNow.getFullYear().toString();

														departArrive.id = result.id;
														currentEmployee.set("endDateLog", dateNow);
														currentEmployee.set("lastDepartArrive", departArrive);
													}


													currentEmployee.save(null, {
														success: function(gameScore) {
															// Execute any logic that should take place after the object is saved.
															currentEmployee.set('departArrive', departArrive);
															io.emit('fromPublicServer', currentEmployee);
															console.log('success log!');

														},
														error: function(gameScore, error) {
															// Execute any logic that should take place if the save fails.
															// error is a Parse.Error with an error code and message.
															console.log('Failed to create new object, with error code: ' + error.message);
														}
													});
												},
												error: function(object, error) {
													// The object was not retrieved successfully.
													// error is a Parse.Error with an error code and message.
												}
											});



										},
										error: function(gameScore, error) {
											// Execute any logic that should take place if the save fails.
											// error is a Parse.Error with an error code and message.
											console.log(error);
										}
									});
								}
								else{
									periodLog.add('extraLogPool', forPeriodTime);
									periodLog.save(null, {
										success: function(result) {
											// Execute any logic that should take place after the object is saved.
											currentEmployee.set('departArrive', currentEmployee.attributes.lastDepartArrive);
											io.emit('fromPublicServer', currentEmployee);

										},
										error: function(gameScore, error) {
											// Execute any logic that should take place if the save fails.
											// error is a Parse.Error with an error code and message.
											console.log(error);
										}
									});

								}



							},
							error: function(gameScore, error) {
								// Execute any logic that should take place if the save fails.
								// error is a Parse.Error with an error code and message.
								console.log(error);
							}
						});
					},
					error: function(gameScore, error) {
						console.log(error);
					}
				});


			},
			error: function(error) {
				console.log("Error: " + error.code + " " + error.message);
			}
		});

	}
}



function stringContains(data, compare){
	return data.indexOf(compare) > -1;
}

function checkTime(i) {
	if (i < 10) {i = "0" + i};  // add zero in front of numbers < 10
		return i;
	}

function timeDifference(time1, time2){
	var hms1 = time1;
	var hms2 = time2;
	var adder = 0;

	var a = hms1.split(' ');
	var periodA = a[1];

	a = a[0].split(':');

	if(periodA === 'PM'){
		if(a[0] !== '12'){
			adder = 12;
		}
	}
	else{
		if(a[0] === '12'){
			a[0] = 0;
		}
	}

	a[0] = parseInt(a[0]) + adder;

	var b = hms2.split(' ');

	var periodB = b[1];

	b = b[0].split(':');

	if(periodB === 'PM'){
		if(b[0] !== '12'){
			adder = 12;
		}
	}
	else{
		if(b[0] === '12'){
			b[0] = 0;
		}
	}

	b[0] = parseInt(b[0]) + adder;

	var arrivalMinutes = (+a[0]) * 60 + (+a[1]);
	var departureMinutes = (+b[0]) * 60 + (+b[1]);

	var totalSetTime = departureMinutes - arrivalMinutes;

	return totalSetTime;
}


function checkAMPM(h) {
	console.log(h);
	var tmp;
	if(h > 12){
		h = h - 12;
	}

	if(h === 0){
		h = 12;
	}
	return h;
}

function deleteDailyLogs(){
	var DailyLogObject = Parse.Object.extend("DailyLog");
	var query = new Parse.Query(DailyLogObject);

	query.limit(1000);

	query.find({
		success: function(results) {
			console.log('performing daily log clean up: ' + results.length);
			if(results.length > 0){
				results.forEach(function(log) {
					log.destroy({
						success: function() {
							// SUCCESS CODE HERE, IF YOU WANT
							console.log('log: cleaned out success');
						},
						error: function() {
							// ERROR CODE HERE, IF YOU WANT
							console.log('log: cleaned out error');
						}
					});
				});
			}

		},
		error: function(error) {

		}
	});
}

function backupSystemCommand(){
	var exec = require('child_process').exec;

	exec('mongoexport --db dev --collection PeriodLog --out /media/usb/PeriodLog.json', function(error, stdout, stderr) {
		if (error !== null) {
			console.log('exec error: ' + error);
		}
		else{
			console.log(stdout);
			var exec2 = require('child_process').exec;
			exec('mongoexport --db dev --collection Employee --out /media/usb/Employee.json', function(error, stdout, stderr) {
				if (error !== null) {
					console.log('exec error: ' + error);
				}
				else{
					console.log(stdout);
					var exec3 = require('child_process').exec;
					exec('mongoexport --db dev --collection Holiday --out /media/usb/Holiday.json', function(error, stdout, stderr) {
						if (error !== null) {
							console.log('exec error: ' + error);
						}
						else{
							console.log(stdout);
							var exec4 = require('child_process').exec;
							exec4('mongoexport --db dev --collection Settings --out /media/usb/Settings.json', function(error, stdout, stderr) {
								if (error !== null) {
									console.log('exec error: ' + error);
								}
								else{
									console.log(stdout);
									console.log('backup process complete');
								}
							});
						}
					});
				}
			});
		}
	});
}
