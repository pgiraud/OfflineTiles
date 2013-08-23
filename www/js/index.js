/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var NB_ITER = 200;
var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {
        app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');
        var db = window.sqlitePlugin.openDatabase("Database", "1.0", "Demo", -1),
            dataUri;

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        var url = 'http://tonio.biz/t2.png';
        var img = document.createElement('img');
        img.src= url;

        var dbTime, dbCreatedTime, fileTime, fileCreatedTime, fileTransferCreatedTime;

        img.addEventListener('load', function() {
            var done = 0;
            var canvas = document.createElement("canvas");
            canvas.width = 200;
            canvas.height = 200;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            dataUri = canvas.toDataURL('image/png');
            console.log('******************* start')
            var start = new Date().getTime();
            var ids = [];
            var inserted = 0;
            db.transaction(function(tx) {
                tx.executeSql('DROP TABLE IF EXISTS test_table');
                tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id integer primary key, data text)');

                for ( var i=1 ; i <= NB_ITER ; i++ ) {
                    tx.executeSql("INSERT INTO test_table (data) VALUES (?)", [dataUri], function(tx, res) {
                        // console.log("insertId: " + res.insertId + " -- probably 1");
                        ids.push(res.insertId);
                        inserted++;
                        if (inserted==NB_ITER) {
                            read_db();
                        }
                    });
                }

            });
            read_db = function() {
                var end = new Date().getTime();
                dbCreatedTime = end-start; 
                for ( var i=0, l=ids.length ; i<l ; i++ ) {
                    var index = ids[i];
                    db.transaction(function(trx) {
                        trx.executeSql("SELECT data from test_table where id=?;", [index], function(t, res) {
                            done++;
                            // var img = document.getElementById("dessin");
                            // img.setAttribute("src", res.rows.item(0).data);
                            if (done==NB_ITER) {
                                var end = new Date().getTime();
                                dbTime = end-start;
                                with_files();
                            }
                        });
                    });
                }
            };
            with_files = function() {
                done = 0;
                files = [];
                console.log('test_files');
                start = new Date().getTime();
                window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFS, fail);
                function gotFS(fileSystem) {
                    console.log("gotFS");
                    window.fileSystem = fileSystem;
                    for ( var i=1 ; i<=NB_ITER ; i++ ) {
                        fileSystem.root.getFile("tile"+i+".txt", {create: true, exclusive: false}, gotFileEntry, fail);
                    }
                }
                function gotFileEntry(fileEntry) {
                    fileEntry.createWriter(gotFileWriter, fail);
                }
                function gotFileWriter(writer) {
                    writer.write(dataUri);
                    writer.onwriteend = function(evt){
                        var paths = writer.fileName.split('/'),
                            name = paths[paths.length-1];
                        done++;
                        if (done==NB_ITER) {
                            var end = new Date().getTime();
                            fileCreatedTime = end-start;
                            done = 0;
                            readFiles();
                        }
                    };
                }
                function readFiles() {
                    for ( var i=1 ; i<=NB_ITER ; i++ ) {
                        window.fileSystem.root.getFile('tile' + i +'.txt', {exclusive: false}, gotFileEntryForReader, fail);
                    }
                }
                function gotFileEntryForReader(fileEntry) {
                    fileEntry.file(gotFile, fail);
                }
                function gotFile(file) {
                    var reader = new FileReader();
                    reader.onloadend = function(evt) {
                        done++;
                        if (done==NB_ITER) {
                            var end = new Date().getTime();
                            fileTime = end-start;
                            var img = document.getElementById('dessin');
                            img.setAttribute('src', evt.target.result);
                            with_filetransfer();
                        }
                    };
                    reader.readAsText(file);
                }

                function fail(error) {
                    console.log('************** ERROR ************* ' + error.code);
                }
            };
            with_filetransfer = function() {
                done = 0;
                var fileTransfer;
                window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFS, fail);
                function gotFS(fileSystem) {
                    fileSystem.root.getDirectory("", {create: true, exclusive: false}, gotDirectory, fail);
                }
                function gotDirectory(dirEntry) {
                    fileTransfer = new FileTransfer();
                    // first download, wait for image to be put in cache
                    fileTransfer.download(
                        url,
                        dirEntry.fullPath + '/tile.transfer.txt',
                        function (file) {
                            console.log("downloadImages *****");
                            downloadImages(dirEntry, fileTransfer);
                        },
                        fail
                    );
                }
                function downloadImages(dirEntry, fileTransfer) {
                    var start = new Date().getTime();
                    for ( var i=1 ; i<=NB_ITER ; i++ ) {
                        fileTransfer.download(
                            url + '?' + i,
                            dirEntry.fullPath + '/tile' + i + '.transfer.txt',
                            function (file) {
                                done++;
                                if (done==NB_ITER) {
                                    var end = new Date().getTime();
                                    fileTransferCreatedTime = end-start;
                                    showResults();
                                }
                            },
                            fail
                        );
                    }
                }
                function fail(error) {
                    console.log('************** ERROR ************* ' + error.code);
                }
            }

            showResults = function() {
                console.log('DB created time: ' + dbCreatedTime + 'ms');
                console.log('DB elapsed time: ' + dbTime + 'ms');
                console.log('Files created time: ' + fileCreatedTime + 'ms');
                console.log('File elapsed time: ' + fileTime + 'ms');
                console.log('FileTransfer created time: ' + fileTransferCreatedTime + 'ms');
            }
        });
    }
};
