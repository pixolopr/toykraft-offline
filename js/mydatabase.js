//VARIABLES NEEDED
//var adminurl = "http://localhost/NetworkBackend/rest/index.php/";
var adminurl="http://toy-kraft.com/NetworkBackend/rest/index.php/";
//var adminurl = "http://169.254.216.140/NetworkBackend/rest/index.php/";
var zone;

//CREATE THE DATABASE
var db = openDatabase('toykraftapp2', '1.0', 'toykraftapp DB', 50 * 1024 * 1024);

//CREATE ALL TABLES
db.transaction(function (tx) {
    tx.executeSql('CREATE TABLE IF NOT EXISTS ZONE (id Integer PRIMARY KEY, name, email)');
    //tx.executeSql("DROP TABLE ZONE");
    tx.executeSql('CREATE TABLE IF NOT EXISTS USERS (id Integer PRIMARY KEY, name varchar, password varchar, username varchar, email varchar, mobile varchar, accesslevel Integer, zone Integer, lastlogin TIMESTAMP)');
    //tx.executeSql('DROP TABLE USERS');
});
db.transaction(function (tx) {
    tx.executeSql('INSERT INTO `USERS` VALUES(1,"abc","toykraft","toykraft","","","","3","")');
    //tx.executeSql('DELETE FROM `USERS`');
})
var mydatabase = angular.module('mydatabase', [])
    .factory('MyDatabase', function ($http, $location, MyServices, $cordovaNetwork, $cordovaToast) {


        var orderproductcount = 0;
        var ordersynccount = 0;

        return {
            //ORDER SYNC
            getordersynccount: function () {
                return ordersynccount;
            },
            setordersynccount: function () {
                var user = MyServices.getuser();
                //console.log('SELECT COUNT(*) as `number` FROM ORDERS WHERE `issync` = 0 AND `salesid`='+user.id);
                db.transaction(function (tx) {
                    tx.executeSql('SELECT COUNT(*) as `number` FROM ORDERS WHERE `issync` = 0 AND `salesid`=' + user.id, [], function (tx, results) {
                        console.log(results.rows.item(0).number)
                        ordersynccount = results.rows.item(0).number;
                    }, function (tx, results) {
                        console.log(results);
                    })
                });
            },
            syncorders: function (scope, oid2) {
                user = MyServices.getuser();

                console.log("sync orders");

                var apply = function (sc) {
                    sc.$apply();
                };

                //SYNC SUCCESS
                var syncordersuccess = function (id, ordersid) {
                    console.log(ordersid);
                    console.log(id);
                    db.transaction(function (tx) {
                        console.log("sync value change");
                        tx.executeSql('UPDATE `ORDERPRODUCT` SET `orders`=' + id + ' WHERE `orders`=' + ordersid, [], function (tx, results) {
                            console.log(results.rows);
                            //angular.element(document.getElementById('syncCtrl')).scope().$apply();
                            scope.$apply();
                            apply(scope);
                            // scope.callbacksuccess();
                        }, function (tx, results) {
                            console.log("error");
                        });
                        tx.executeSql('UPDATE `ORDERS` SET `id`=' + id + ',`issync`= 1 WHERE `id`=' + ordersid + ' AND `salesid`=' + user.id, [], function (tx, results) {
                            console.log(results.rows);
                            //angular.element(document.getElementById('syncCtrl')).scope().$apply();
                            scope.$apply();
                            apply(scope);
                            scope.callbacksuccess();
                        }, function (tx, results) {
                            console.log("error");
                        });

                    });
                };

                //SYNC TO ONLINE
                var syncordernow = function (cart, retaildata) {
                    return $http.post(adminurl + "orders/makeorder", {
                        cart: cart,
                        user: user,
                        retailer: retaildata,
                    });
                };

                //RETAINING CART//THIS PART IS CREATING CART
                var getcart = function (oid, rd) {
                    console.log("retaining cart");
                    db.transaction(function (tx) {
                        tx.executeSql('SELECT * FROM `ORDERPRODUCT` WHERE `orders` = ' + oid, [], function (tx, results) {
                            var synccart = [];
                            for (var gc = 0; gc < results.rows.length; gc++) {
                                synccart[gc] = {};
                                synccart[gc].category = results.rows.item(gc).category;
                                synccart[gc].id = results.rows.item(gc).product;
                                synccart[gc].mrp = results.rows.item(gc).amount;
                                synccart[gc].name = results.rows.item(gc).name;
                                synccart[gc].productcode = results.rows.item(gc).productcode;
                                synccart[gc].quantity = results.rows.item(gc).quantity;
                                synccart[gc].totalprice = results.rows.item(gc).quantity * results.rows.item(gc).amount;
                            };
                            console.log(synccart);

                            syncordernow(synccart, rd).success(function (data, status) {
                                syncordersuccess(data.id, oid)
                            });
                        }, function (tx, results) {});
                    });
                };

                //RETAINING RETAILER
                var getretailer = function (orderid, retailerid, remark) {
                    console.log("retaining retailer");
                    db.transaction(function (tx) {
                        tx.executeSql('SELECT * FROM `RETAILER` WHERE `id` = ' + retailerid, [], function (tx, results) {
                            console.log(results.rows);
                            var retailerdata = {};
                            retailerdata = results.rows.item(0);
                            retailerdata.remark = remark;
                            getcart(orderid, retailerdata);
                        }, function (tx, results) {
                            console.log(results);
                        });
                    });
                };

                //RETAINING ORDER
                db.transaction(function (tx) {
                    console.log("retaining order");
                    tx.executeSql('SELECT * FROM `orders` WHERE `issync` = 0 AND `salesid`=' + user.id, [], function (tx, results) {
                        console.log(results.rows);
                        for (var os = 0; os < results.rows.length; os++) {
                            console.log(results.rows.item(os).id + " " + results.rows.item(os).retail + " " + results.rows.item(os).remark)
                            getretailer(results.rows.item(os).id, results.rows.item(os).retail, results.rows.item(os).remark);
                        };
                    }, function (tx, results) {
                        console.log("error");
                    });
                });
            },

            //SYNC ZONE DATA
            findzonebyuser: function () {
                return $http.get(adminurl + "zone/find", {
                    params: {
                        user: user
                    }
                });
            },
            addzonedata: function (data) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO ZONE (id , name, email) VALUES (' + data[i].id + ',"' + data[i].name + '","' + data[i].email + '")';
                        tx.executeSql(sqls, [], function (tx, results) {}, null);
                    };
                });
            },

            //FINDING ZONE OF USER
            findzonebyuseroffline: function () {
                zone = user.zone;
            },

            //CREATING ALL TABLES ON SYNC PAGE LOAD
            createretailertables: function () {
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS STATE (id Integer PRIMARY KEY, zone Varchar, name Varchar)');
                    //  tx.executeSql('DROP TABLE STATE');

                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS CITY (id Integer PRIMARY KEY, state Integer, name Varchar)');
                    //  tx.executeSql('DROP TABLE CITY');

                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS AREA (id Integer PRIMARY KEY, city Integer, name Varchar, distributor Integer)');
                    //   tx.executeSql('DROP TABLE AREA');

                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS RETAILER (id INTEGER PRIMARY KEY AUTOINCREMENT,lat integer,long integer,area integer,dob date ,type_of_area varchar,sq_feet float,store_image Varchar,name Varchar,number Varchar,email Varchar,address Varchar,ownername Varchar,ownernumber Varchar,contactname Varchar,contactnumber Varchar,timestamp TIMESTAMP, issync Integer)');
                    //tx.executeSql('DROP TABLE RETAILER');
                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS PRODUCT (id INTEGER PRIMARY KEY AUTOINCREMENT, name Varchar, product Varchar, encode Varchar, name2 Varchar, productcode Varchar, category Integer,video Varchar,mrp,description VARCHAR2(5000),age Integer,scheme Varchar,isnew Integer,timestamp Timestamp)');

                    // tx.executeSql('DROP TABLE PRODUCT');
                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS ORDERS (id INTEGER PRIMARY KEY, retail Integer,sales Varchar,timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,amount double,signature integer,salesid Integer,quantity Integer,remark text,issync integer)');
                    //tx.executeSql('DROP TABLE ORDERS');
                    // tx.executeSql('DELETE FROM ORDERS');
                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS TOPTEN (product INTEGER, productcode, name, totalquantity)');
                    // tx.executeSql('DROP TABLE TOPTEN');
                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS ORDERPRODUCT (id Integer PRIMARY KEY, orders Integer, product Integer, quantity Integer,name varchar, amount double, scheme_id Integer, status Integer, category varchar, productcode varchar)');
                    // tx.executeSql('DROP TABLE ORDERPRODUCT ');
                });
                db.transaction(function (tx) {
                    tx.executeSql('CREATE TABLE IF NOT EXISTS PRODUCTIMAGE (id Integer PRIMARY KEY, product Integer, image varchar)');
                    // tx.executeSql('DROP TABLE PRODUCTIMAGE');
                });

            },

            //STATE SYNC
            syncinretailerstatedata: function () {
                return $http.get(adminurl + "state/find", {
                    params: {}
                })
            },
            insertretailerstatedata: function (data, scope) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO STATE (id , zone, name) VALUES (' + data[i].id + ',"' + data[i].zone + '","' + data[i].name + '")';
                        tx.executeSql(sqls, [], function (tx, results) {}, null);
                    };
                    $cordovaToast.show('States Data Imported', 'long', 'bottom');

                    scope.importtable();
                    scope.$apply();
                });
            },

            //CITY SYNC
            syncinretailercitydata: function () {
                return $http.get(adminurl + "city/find", {
                    params: {}
                })
            },
            insertretailercitydata: function (data, scope) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO CITY (id , state, name) VALUES (' + data[i].id + ',"' + data[i].state + '","' + data[i].name + '")';
                        console.log(sqls);
                        tx.executeSql(sqls, [], function (tx, results) {
                            console.log("RAOW INSERTED");
                        }, null);
                    };
                    $cordovaToast.show('City Data Imported', 'long', 'bottom');

                    scope.importtable();
                    scope.$apply();
                });
            },

            //AREA SYNC
            syncinretailerareadata: function () {
                return $http.get(adminurl + "area/find", {
                    params: {}
                })

            },
            insertretailerareadata: function (data, scope) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO AREA (id , city, name,distributor) VALUES (' + data[i].id + ',' + data[i].city + ',"' + data[i].name + '",' + data[i].distributor + ')';
                        console.log(sqls);
                        tx.executeSql(sqls, [], function (tx, results) {
                            console.log("RAOW INSERTED");
                        }, null);
                    };
                    $cordovaToast.show('Area Data Imported', 'long', 'bottom');


                    scope.importtable();
                    scope.$apply();
                });
            },

            //PRODUCTIMAGE SYNC
            syncinproductimagedata: function () {
                return $http.get(adminurl + "productimage/find", {
                    params: {}
                })

            },
            insertproductimagedata: function (data, scope) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO PRODUCTIMAGE (id , product, image) VALUES (' + data[i].id + ',"' + data[i].product + '","' + data[i].image + '")';

                        tx.executeSql(sqls, [], function (tx, results) {
                            console.log("RAOW INSERTED");
                        }, null);
                    };

                    scope.importtable();
                    scope.$apply();
                });
            },



            updatecitydata: function (data) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'UPDATE CITY SET id = ' + data[i].id + ', state = "' + data[i].state + '", name = "' + data[i].name + '" WHERE id = ' + data[i].id;

                        tx.executeSql(sqls, [], function (tx, results) {
                            console.log("RAOW UPDATED");
                        }, null);
                    };
                });
            },
            //RETAILER SYNC
            syncinretailerdata: function () {
                return $http.get("http://admin.toy-kraft.com/rest/index.php/retailer/find", {
                    params: {}
                })
            },
            insertoneretailer: function (data) {
                db.transaction(function (tx) {
                    var sqls = 'INSERT INTO RETAILER (id,lat,long,area,dob,type_of_area,sq_feet,store_image,name,number,email,address,ownername,ownernumber,contactname,contactnumber,timestamp, issync) VALUES (' + data.id + ',"' + data.lat + '","' + data.long + '","' + data.area + '","' + data.dob + '","' + data.type_of_area + '","' + data.sq_feet + '","' + data.store_image + '","' + data.name + '","' + data.number + '","' + data.email + '","' + data.address + '","' + data.ownername + '","' + data.ownernumber + '","' + data.contactname + '","' + data.contactnumber + '","' + data.timestamp + '",0)';
                    tx.executeSql(sqls, [], function (tx, results) {
                        console.log("RAOW INSERTED");
                    }, function (tx, results) {
                        console.log("Not inserted");
                    });
                    $cordovaToast.show('Retailer Data Imported', 'long', 'bottom');
                });
            },

            insertretailerdata: function (data, scope) {
                console.log("of db");
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO RETAILER (id,lat,long,area,dob,type_of_area,sq_feet,store_image,name,number,email,address,ownername,ownernumber,contactname,contactnumber,timestamp, issync) VALUES (' + data[i].id + ',"' + data[i].lat + '","' + data[i].long + '","' + data[i].area + '","' + data[i].dob + '","' + data[i].type_of_area + '","' + data[i].sq_feet + '","' + data[i].store_image + '","' + data[i].name + '","' + data[i].number + '","' + data[i].email + '","' + data[i].address + '","' + data[i].ownername + '","' + data[i].ownernumber + '","' + data[i].contactname + '","' + data[i].contactnumber + '","' + data[i].timestamp + '",1)';
                        tx.executeSql(sqls, [], function (tx, results) {
                            /* scope.it = false;
                             scope.uploadretailer();
                             scope.$apply();*/
                            console.log("RAOW INSERTED");
                        }, function (tx, results) {
                            console.log("Not inserted");
                        });
                    };
                    $cordovaToast.show('Retailer Data Imported', 'long', 'bottom');

                    scope.importtable();
                    scope.$apply();
                });
            },

            //PRODUCT SYNC
            syncinproductdata: function () {
                return $http.get("http://admin.toy-kraft.com/rest/index.php/product/find", {
                    params: {}
                })
            },
            insertproductdata: function (data, scope) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO PRODUCT (id, name, product, encode, name2, productcode, category,video,mrp,description,age,scheme,isnew,timestamp) VALUES (' + data[i].id + ',"' + data[i].name + '","' + data[i].product + '","' + data[i].encode + '","' + data[i].name2 + '","' + data[i].productcode + '","' + data[i].category + '","' + data[i].video + '","' + data[i].mrp + '","' + data[i].description + '","' + data[i].age + '","' + data[i].scheme + '","' + data[i].isnew + '","' + data[i].timestamp + '")';

                        tx.executeSql(sqls, [], function (tx, results) {
                            console.log("PRODUCT RAOW INSERTED");
                        }, function (tx, results) {
                            console.log("PRODUCT RAOW NOT INSERTED");
                        });
                    };
                    $cordovaToast.show('Product Data Imported', 'long', 'bottom');

                    scope.importtable();
                    scope.$apply();
                });
            },

            //TOP TEN
            inserttopten: function (scope, data) {
                db.transaction(function (tx) {
                    for (var i = 0; i < data.length; i++) {
                        var sqls = 'INSERT INTO TOPTEN (product, productcode, name, totalquantity) VALUES (' + data[i].product + ',"' + data[i].productcode + '","' + data[i].name + '","' + data[i].totalquantity + '")';
                        console.log(sqls);
                        tx.executeSql(sqls, [], function (tx, results) {
                            console.log("TOP TEN RAOW INSERTED");
                        }, function (tx, results) {
                            console.log("TOP TEN NOT INSERTED");
                        });
                    };
                    scope.tt = false;
                    scope.$apply();
                    $cordovaToast.show('Top Ten Data Imported', 'long', 'bottom');
                });
            },

            //SYNC CATEGORIES
            getcategoriesname: function () {
                return $http.get(adminurl + "catelog/getcatelog");
            },
            synccategorydata: function (data) {

            },


            findproductbycategory: function (id) {
                $http.get(adminurl + "", {
                    params: {
                        id: id
                    }
                })
            },


            sendcartoffline: function (retailerdata, user, ocart) {
                console.log(retailerdata);
                console.log(user);
                console.log(ocart);
                var finishofflineorder = function () {
                    orderproductcount = 0;
                    var aid = MyServices.getareaid();
                    MyServices.clearcart();
                    MyServices.setretailer(0);
                    if (aid > 0) {
                        window.location.replace(window.location.origin + window.location.pathname + "#/app/retailer/" + aid);
                    } else {
                        window.location.replace(window.location.origin + window.location.pathname + "#/app/home");
                    };
                };

                var addorderproducts = function (cartproduct, orderid, checkval) {
                    console.log(orderid);
                    db.transaction(function (tx) {

                        var sqls = 'INSERT INTO ORDERPRODUCT (orders, product, quantity, name, amount, scheme_id, status, category, productcode) VALUES (' + orderid + ', ' + cartproduct.id + ', ' + cartproduct.quantity + ', "' + cartproduct.name + '",' + cartproduct.mrp + ', 0, 1, "' + cartproduct.category + '", "' + cartproduct.productcode + '")';
                        console.log(sqls);

                        tx.executeSql(sqls, [], function (tx, results) {

                            orderproductcount++;
                            if (orderproductcount == checkval) {
                                finishofflineorder();
                            };
                        }, function (tx, results) {
                            console.log(results);
                            console.log('did not add no product with no name');
                        });
                        //$cordovaToast.show('Order Placed Offline', 'long', 'bottom');
                    });
                };

                var totalamount = 0;
                var totalquantity = 0;
                for (var c = 0; c < ocart.length; c++) {
                    totalquantity += ocart[c].quantity;
                    totalamount += ocart[c].totalprice;
                };

                db.transaction(function (tx) {
                    //var timeStamp=;
                    if (retailerdata.remark == undefined) {
                        retailerdata.remark = "No Remark";
                    };
                    var sqls = 'INSERT INTO ORDERS (retail ,sales, amount, signature, salesid, quantity, remark, issync) VALUES (' + retailerdata.id + ', "' + user.name + '",' + totalamount + ' , 1 , ' + user.id + ', ' + totalquantity + ' , "' + retailerdata.remark + '", 0 )';
                    console.log(sqls);
                    tx.executeSql(sqls, [], function (tx, results) {
                        var insertid = results.insertId;
                        console.log(insertid);
                        if (totalquantity > 0) {
                            //INSERT INTO ORDERPRODUCTS
                            for (c = 0; c < ocart.length; c++) {
                                addorderproducts(ocart[c], insertid, ocart.length);
                            };
                        } else {
                            finishofflineorder();
                        };
                    }, function (tx, results) {
                        console.log('did not add no product with no name');
                    });
                    $cordovaToast.show('Order Placed Offline', 'long', 'bottom');
                });
            },
            syncsendorders: function (sqls, dsqls) {
                //function after email success
                var emailsend = function (data, status) {
                    console.log(data);
                };
                //funtion after sms success
                var smssuccess = function (data, status) {
                    console.log(data);
                };
                //function after the success of the syncing of the order
                var syncordersuccess = function (data, status) {
                    MyServices.sendorderemail(data.id, data.retail, data.amount, data.sales, data.timestamp, data.quantity, data.remark).success(emailsend);
                    db.transaction(function (tx3) {
                        tx3.executeSql(dsqls, [], function (tx3, results3) {
                            console.log(results3);
                            console.log(data);
                            $.jStorage.set("offlineorderid", $.jStorage.get("offlineorderid") - 1);
                        }, function (tx3, results3) {});
                    });
                };
                //user and retailer and cart variables
                var retaileridtosend = 0;
                var useridtosend, retailertosend, usertosend, remarktosend, totalq, totalp, number1, number2;
                var carttosend = [];
                var userme = MyServices.getuser();
                console.log(sqls);
                db.transaction(function (tx2) {
                    //selecting idividual orders
                    tx2.executeSql(sqls, [], function (tx2, results2) {
                        for (var i = 0; i < results2.rows.length; i++) {
                            //getting retailer id and the user id of the order
                            retaileridtosend = results2.rows.item(i).retailerid;
                            useridtosend = results2.rows.item(i).userid;
                            //remark of that order
                            remarktosend = results2.rows.item(i).remark;
                            //total quantity
                            totalq += results2.rows.item(i).quantity;
                            totalp += results2.rows.item(i).totalprice;
                            //creating the cart
                            if (results2.rows.item(i).id != null) {
                                carttosend.push({
                                    id: results2.rows.item(i).id,
                                    productcode: results2.rows.item(i).productcode,
                                    name: results2.rows.item(i).name,
                                    quantity: results2.rows.item(i).quantity,
                                    mrp: results2.rows.item(i).mrp,
                                    totalprice: results2.rows.item(i).totalprice,
                                    category: results2.rows.item(i).category
                                });
                            };
                        };
                        if (retaileridtosend == 0) {
                            $.jStorage.set("offlineorderid", $.jStorage.get("offlineorderid") - 1);
                        };
                        //checking if user is the current user
                        if (useridtosend == userme.id) {
                            //retrieving the retailer object
                            var rsqls = 'SELECT * FROM RETAILER WHERE id=' + retaileridtosend;
                            tx2.executeSql(rsqls, [], function (tx2, results2) {
                                retailertosend = results2.rows.item(0);
                                retailertosend.remark = remarktosend;
                                //get number to send sms
                                number1 = retailertosend.contactnumber;
                                number2 = retailertosend.ownernumber;
                                //sending order
                                MyServices.sendSyncOrderNow(carttosend, retailertosend).success(syncordersuccess);
                                //send sms
                                if (carttosend.length > 0) {
                                    MyServices.sms(number1, number2, totalq, totalp).success(smssuccess);
                                };
                            }, function (tx2, results2) {});
                        };
                    }, function (tx2, results2) {});
                });
            },
            addnewretailer: function (data) {
                db.transaction(function (tx) {
                    db.transaction(function (tx) {
                        var sqls = 'INSERT INTO RETAILER (lat,long,area,dob,type_of_area,sq_feet,store_image,name,number,email,address,ownername,ownernumber,contactname,contactnumber,timestamp,issync) VALUES ("' + data.lat + '","' + data.long + '","' + data.area + '","' + data.dob + '","' + data.type_of_area + '","' + data.sq_feet + '","' + data.store_image + '","' + data.name + '","' + data.number + '","' + data.email + '","' + data.address + '","' + data.ownername + '","' + data.ownernumber + '","' + data.contactname + '","' + data.contactnumber + '",null, 0)';
                        console.log(sqls);
                        tx.executeSql(sqls, [], function (tx, results) {
                            console.log("RAOW INSERTED");
                            window.location.replace(window.location.origin + window.location.pathname + "#/app/retailer/" + data.area);
                        }, function (tx, results) {
                            console.log("RAOW NOT INSERTED");
                        });
                    });
                });
            },

            editaretailer: function (data, name) {
                db.transaction(function (tx) {
                    var sqls = 'UPDATE RETAILER SET email = "' + data.email + '", ownername = "' + data.ownername + '", ownernumber = "' + data.ownernumber + '", contactname = "' + data.contactname + '", contactnumber = "' + data.contactnumber + '", sync = "false" WHERE id = ' + data.id + ' AND name ="' + name + '"';
                    console.log(sqls);
                    tx.executeSql(sqls, [], function (tx, results) {
                        console.log("RAOW UPDATED");
                    }, function (tx, results) {
                        console.log("RAOW NOT INSERTED");
                    });
                });
            },
            getalldata: function (s, c, a, r) {
                console.log(r);
                db.transaction(function (tx) {
                    var sqls = 'SELECT * FROM STATE';
                    console.log(sqls);
                    tx.executeSql(sqls, [], function (tx, results) {
                        for (var i = 0; i < results.rows.length; i++) {
                            checkstatedata.push(results.rows.item(i));
                        };
                        var sqls = 'SELECT * FROM CITY';
                        console.log(sqls);
                        tx.executeSql(sqls, [], function (tx, results) {
                            for (var i = 0; i < results.rows.length; i++) {
                                checkcitydata.push(results.rows.item(i));
                            };
                            //console.log(checkcitydata);
                            var sqls = 'SELECT * FROM AREA';
                            console.log(sqls);
                            tx.executeSql(sqls, [], function (tx, results) {
                                for (var i = 0; i < results.rows.length; i++) {
                                    checkareadata.push(results.rows.item(i));
                                };
                                console.log(checkareadata);
                                console.log(a);
                                var sqls = 'SELECT * FROM RETAILER';
                                console.log(sqls);
                                tx.executeSql(sqls, [], function (tx, results) {
                                    for (var i = 0; i < results.rows.length; i++) {
                                        checkretailerdata.push(results.rows.item(i));
                                    };
                                    //console.log(checkretailerdata);

                                    // FINAL SUCCESS //

                                    if (s.length == checkstatedata.length) {
                                        console.log("state is same");
                                    } else {
                                        console.log("Its not same");
                                        //SYNC STATE
                                        this.insertretailerstatedata(s);
                                    };
                                    if (c.length == checkcitydata.length) {
                                        console.log("city is same");
                                    } else {
                                        console.log("city not same");
                                        //SYNC CITY
                                        this.updatecitydata(c);
                                    };
                                    if (a.length == checkareadata.length) {
                                        console.log("area is same");
                                    } else {
                                        console.log("area not same");
                                        //SYNC AREA
                                        this.insertretailerareadata(a);
                                    };
                                    if (r.length == checkretailerdata.length) {
                                        console.log("retaler is same");
                                    } else {
                                        console.log("retailer not same");
                                        //SYNC RETIALER
                                        this.insertretailerdata(r);
                                    };

                                }, function (tx, results) {
                                    console.log("RAOW NOT INSERTED");
                                });
                            }, function (tx, results) {
                                console.log("RAOW NOT INSERTED");
                            });
                        }, function (tx, results) {
                            console.log("RAOW NOT INSERTED");
                        });
                    }, function (tx, results) {
                        console.log("RAOW NOT INSERTED");
                    });
                });
            },
            test1: function () {
                console.log("test is working");
            },
            test2: function () {
                this.test1();
            },
            sendretailerupdate: function (sqls) {
                var editretailersuccess = function (data, status) {

                    console.log(data);
                    /*db.transaction(function (tx) {
                    var sqls2 = 'UPDATE RETAILER SET sync = true WHERE id = '+data.id;
                    tx.executeSql(sqls, [], function (tx, results) {
                        console.log("UPDATED");
                    }, function (tx, results) {

                    });
                    //$cordovaToast.show('Top Ten Data Imported', 'long', 'bottom');
                });*/
                };
                db.transaction(function (tx) {
                    console.log(sqls);
                    MyServices.print();
                    tx.executeSql(sqls, [], function (tx, results) {
                        for (var i = 0; i < results.rows.length; i++) {
                            console.log(results.rows.item(i));
                            MyServices.editretailerdetails(results.rows.item(i)).success(editretailersuccess);
                        };
                    }, function (tx, results) {

                    });
                    //$cordovaToast.show('Top Ten Data Imported', 'long', 'bottom');
                });
            },
            sendnewretailer: function (sqls, scope) {

                var addRetailerSuccess = function (data) {
                    console.log(data);
                    db.transaction(function (tx) {
                        console.log("db trans");
                        tx.executeSql('UPDATE `RETAILER` SET `issync`=1,`id`=' + data[1] + '  WHERE `id` =' + data[0], [], function (tx, results) {
                            scope.uploadretailersynccount--;

                            if (scope.uploadretailersynccount == 0) {
                                scope.rt = false;
                                scope.os = true;
                                scope.$apply();
                            };

                            scope.$apply();
                        }, function (tx, results) {
                            console.log(results.message);
                        });
                        tx.executeSql('UPDATE `ORDERS` SET `retail`=' + data[1] + '  WHERE `retail` =' + data[0], [], function (tx, results) {
                            console.log("hye");

                        }, null);

                    });
                };

                db.transaction(function (tx) {
                    console.log(sqls);
                    tx.executeSql(sqls, [], function (tx, results) {
                        console.log(results.rows.length);
                        if (results.rows.length <= 0) {
                            scope.rt = false;
                            scope.os = true;
                            scope.$apply();
                        } else {
                            for (var i = 0; i < results.rows.length; i++) {
                                console.log(results.rows.item(i));
                                newretailerdata = results.rows.item(i);
                                MyServices.addNewRetailer(results.rows.item(i)).success(function (data, status) {

                                    console.log(data);
                                    addRetailerSuccess(data);

                                });

                            };
                        };
                    }, function (tx, results) {

                    });
                    //$cordovaToast.show('Top Ten Data Imported', 'long', 'bottom');
                });
            },
            getcountofretailers: function () {
                return $http.get(adminurl + "retailer/count", {
                    params: {}
                });
            },
            examine: function (scope) {
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * FROM ZONE', [], function (tx, results) {
                        console.log(scope.button);
                        scope.button = true;
                        console.log(scope.button);
                        scope.$apply();
                    }, null);
                });
            },
            getdatedata: function (date, user, scope) {
                scope.ordersdata = [];
                console.log(date);
                console.log(user);
                var sqls = 'SELECT * FROM `ORDERS` WHERE `salesid`=' + user.id + ' AND date(`timestamp`)= "' + date + '"';
                console.log(sqls);
                db.transaction(function (tx) {
                    tx.executeSql(sqls, [], function (tx, results) {
                        console.log("success");
                        for (var i = 0; i < results.rows.length; i++) {
                            scope.ordersdata[i] = results.rows.item(i);
                        };
                        console.log(results.rows.length);
                    }, null);
                });
            },

            getdatabyretailer: function (retailer, scope) {
                var ordersdatabyretailerid = [];
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * FROM `ORDERS` WHERE `retail`=' + retailer, [], function (tx, results) {
                        console.log("success");
                        for (var i = 0; i < results.rows.length; i++) {
                            ordersdatabyretailerid[i] = results.rows.item(i);
                        };
                        scope.retailerdatasuccess(ordersdatabyretailerid);
                        scope.$apply();
                        console.log(results.rows.length);
                    }, null);

                });
            },
            getorderproductdetails: function (retailerdetails, orderdetailsdata, scope) {
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * FROM `ORDERPRODUCT` WHERE `orders`=' + orderdetailsdata.id, [], function (tx, results) {
                        var details = [{}];
                        var orderproduct = []
                        console.log(results.rows.length);
                        for (var i = 0; i < results.rows.length; i++) {
                            orderproduct[i] = results.rows.item(i);
                        };
                        console.log(results.rows.length);
                        var details = [{}];
                        details[0].retailerdata = retailerdetails;
                        details[0].orderdata = orderdetailsdata;
                        details[0].orderproductdata = orderproduct;
                        console.log(details);
                        scope.orderdetails(details);
                        scope.$apply();
                    }, null);
                });
            },
            getretailerdetail: function (orderdetails, MyDatabase, scope) {
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * FROM `RETAILER` WHERE id=' + orderdetails.retail, [], function (tx, results) {
                        console.log(results.rows.length);
                        MyDatabase.getorderproductdetails(results.rows.item(0), orderdetails, scope);
                    }, null);
                });
            },
            getorderdetail: function (id, MyDatabase, scope) {
                db.transaction(function (tx) {
                    var orderdetails = [];
                    tx.executeSql('SELECT * FROM `ORDERS` WHERE id=' + id, [], function (tx, results) {
                        console.log(results.rows);
                        MyDatabase.getretailerdetail(results.rows.item(0), MyDatabase, scope);
                    }, function (tx, results) {
                        console.log("error");
                    });
                });
            },
            //States Data
            findstates: function (zid, scope) {
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * FROM `STATE` WHERE `zone`=' + zid, [], function (tx, results) {
                        console.log("hey");
                        for (var i = 0; i < results.rows.length; i++) {
                            scope.statedata[i] = results.rows.item(i);
                        };
                        scope.$apply();
                    }, function (tx, results) {
                        console.log("hey");
                    });
                });

            },
            //City Data
            findcity: function (sid, scope) {
                console.log(sid);
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * FROM CITY WHERE state=' + sid, [], function (tx, results) {
                        console.log("City");
                        for (var i = 0; i < results.rows.length; i++) {
                            console.log(results.rows.item(i));
                            scope.citydata[i] = results.rows.item(i);
                        };
                        scope.$apply();
                    }, null);
                });
            },
            findarea: function (cid, scope) {
                console.log(cid);
                db.transaction(function (tx) {
                    tx.executeSql('select * from AREA where city=' + cid, [], function (tx, results) {
                        for (var i = 0; i < results.rows.length; i++) {
                            scope.areadata[i] = results.rows.item(i);
                        };
                        scope.$apply();
                    }, null);
                });
            },
            findretailer: function (aid, scope) {
                console.log(aid);
                db.transaction(function (tx) {
                    tx.executeSql('select * from RETAILER where area=' + aid, [], function (tx, results) {
                        for (var i = 0; i < results.rows.length; i++) {
                            scope.retailerdata[i] = results.rows.item(i);
                        };
                        scope.$apply();
                    }, null);
                });
            },
            retaileridforreorder: function (oid, syncart, scope, MyDatabase) {
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * from ORDERS where id=' + oid, [], function (tx, results) {
                        var retailerdata = {};
                        retailerdata.id = results.rows.item(0).retail;
                        retailerdata.remark = results.rows.item(0).remark;
                        console.log(user);
                        MyDatabase.sendcartoffline(retailerdata, user, syncart)
                            /*scope.reorder(results.rows.item(0).retail,syncart,user);
                                scope.$apply();*/
                    }, null);
                });
            },
        }
    });




/*var getcart = function (oid, rd) {
                    console.log("retaining cart");
                    db.transaction(function (tx) {
                        tx.executeSql('SELECT * FROM `ORDERPRODUCT` WHERE `orders` = ' + oid, [], function (tx, results) {
                            var synccart = [];
                            for (var gc = 0; gc < results.rows.length; gc++) {
                                synccart[gc] = {};
                                synccart[gc].category = results.rows.item(gc).category;
                                synccart[gc].id = results.rows.item(gc).product;
                                synccart[gc].mrp = results.rows.item(gc).amount;
                                synccart[gc].name = results.rows.item(gc).name;
                                synccart[gc].productcode = results.rows.item(gc).productcode;
                                synccart[gc].quantity = results.rows.item(gc).quantity;
                                synccart[gc].totalprice = results.rows.item(gc).quantity * results.rows.item(gc).amount;
                            };
                            console.log(synccart);
                            
                            //GET REtAILER DATA SOTRE IN VAR
                            //GET USER
                            
                            MyDatabase.sendcartoffline()
                            
                        }, function (tx, results) {});
                    });
                };
                
                
                */